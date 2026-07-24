/** Order read model. Write operations should use adjustStock for stock integrity. */
function getOrders() {
  var items = getData(SHEETS.ORDER_ITEMS);
  var products = getProducts();
  return getData(SHEETS.ORDERS).map(function(row) {
    return {
      OrderID: row[0], OrderDate: row[1], AgentID: row[2], TotalQty: row[3], TotalAmount: row[4],
      TotalCost: row[5], Profit: row[6], Status: row[7], CreatedBy: row[8], Created: row[9],
      Items: items.filter(function(item) { return item[1] === row[0]; }).map(function(item) {
        var product = products.find(function(entry) { return entry.ProductID === item[2]; });
        return { ProductID: item[2], ProductName: product ? product.ProductName : item[2], Qty: item[3], Price: item[4], Cost: item[5], Amount: item[6] };
      })
    };
  });
}

function createOrder(sessionToken, payload) {
  const user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  if (!payload || !getAgentById(payload.agentId) || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) throw new Error('Invalid order');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const quantities = payload.items.reduce(function(result, item) {
      const productId = String(item && item.productId || '');
      const quantity = Number(item && item.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) throw new Error('Invalid order line');
      result[productId] = (result[productId] || 0) + quantity;
      if (result[productId] > 1000000) throw new Error('Invalid order quantity');
      return result;
    }, {});
    const lines = Object.keys(quantities).map(function(productId) {
      const quantity = quantities[productId];
      const product = getProductById(productId);
      if (!product) throw new Error('Invalid order line');
      if (Number(product.Stock) < quantity) throw new Error('Insufficient stock for ' + product.ProductID);
      const quote = quoteTierPrice(sessionToken, payload.agentId, product.ProductID, quantity);
      return { product: product, quantity: quantity, price: quote.unitPrice, cost: Number(product.Cost), amount: quote.unitPrice * quantity };
    });
    const orderId = generateId('ORD', SHEETS.ORDERS);
    const totals = lines.reduce(function(result, line) {
      result.quantity += line.quantity; result.amount += line.amount; result.cost += line.cost * line.quantity; return result;
    }, { quantity: 0, amount: 0, cost: 0 });
    appendObject(SHEETS.ORDERS, [orderId, new Date(), payload.agentId, totals.quantity, totals.amount, totals.cost, totals.amount - totals.cost, 'COMPLETED', user.username, new Date()]);
    lines.forEach(function(line) {
      appendObject(SHEETS.ORDER_ITEMS, [generateId('ITEM', SHEETS.ORDER_ITEMS), orderId, line.product.ProductID, line.quantity, line.price, line.cost, line.amount]);
      applyStockMovement_(line.product.ProductID, line.quantity, 'OUT', orderId, 'Order created');
    });
    return { orderId: orderId, totalAmount: totals.amount, totalQty: totals.quantity };
  } finally {
    lock.releaseLock();
  }
}

function cancelOrder(sessionToken, orderId) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  const id = String(orderId || '').trim();
  if (!id) throw new Error('Order ID is required');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const order = getOrders().find(function(item) { return item.OrderID === id; });
    if (!order) throw new Error('Order not found');
    if (String(order.Status).toUpperCase() === 'CANCELLED') throw new Error('Order is already cancelled');
    order.Items.forEach(function(item) {
      applyStockMovement_(item.ProductID, Number(item.Qty), 'IN', id, 'Order cancelled');
    });
    const row = findRow(SHEETS.ORDERS, id);
    if (row < 0) throw new Error('Order not found');
    getSheet(SHEETS.ORDERS).getRange(row, 8).setValue('CANCELLED');
    return { orderId: id, status: 'CANCELLED' };
  } finally {
    lock.releaseLock();
  }
}
