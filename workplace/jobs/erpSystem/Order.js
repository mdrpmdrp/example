/** Order read model. Write operations should use adjustStock for stock integrity. */
function getOrderSchemaStatusColumn_() {
  const sheet = getSheet(SHEETS.ORDERS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const index = headers.indexOf('Status');
  return index >= 0 ? index + 1 : 8;
}

function normalizeShippingType_(value) {
  const type = String(value || '').trim().toUpperCase();
  if (type === 'VAN' || type === 'CHILLED' || type === 'PARCEL' || type === 'MESSENGER' || type === 'SPLIT' || type === 'NONE') {
    return type;
  }
  return 'NONE';
}

function resolveShippingAmount_(shippingType, shippingAmount) {
  const type = normalizeShippingType_(shippingType);
  const preset = { VAN: 350, CHILLED: 150, PARCEL: 60 };
  if (preset[type] != null) return { type: type, amount: preset[type] };
  if (type === 'MESSENGER' || type === 'SPLIT') {
    const amount = Number(shippingAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid shipping amount');
    return { type: type, amount: amount };
  }
  return { type: 'NONE', amount: 0 };
}

function getOrders() {
  var items = getData(SHEETS.ORDER_ITEMS);
  var products = getProducts();
  return getData(SHEETS.ORDERS).map(function(row) {
    var hasExtendedFields = String(row[13] || '').trim() !== '' || String(row[14] || '').trim() !== '' || String(row[15] || '').trim() !== '' || String(row[16] || '').trim() !== '' || String(row[17] || '').trim() !== '';
    var subtotalAmount = hasExtendedFields ? Number(row[16]) || Number(row[4]) || 0 : Number(row[4]) || 0;
    var netAmount = hasExtendedFields ? Number(row[17]) || Number(row[4]) || 0 : Number(row[4]) || 0;
    return {
      OrderID: row[0], OrderDate: row[1], AgentID: row[2], TotalQty: Number(row[3]) || 0, TotalAmount: netAmount,
      TotalCost: Number(row[5]) || 0, Profit: Number(row[6]) || 0, Status: row[7], CreatedBy: row[8], Created: row[9],
      CustomerName: hasExtendedFields ? String(row[10] || '') : '',
      CustomerAddress: hasExtendedFields ? String(row[11] || '') : '',
      CustomerPhone: hasExtendedFields ? String(row[12] || '') : '',
      ShippingType: hasExtendedFields ? String(row[13] || 'NONE') : 'NONE',
      ShippingAmount: hasExtendedFields ? Number(row[14]) || 0 : 0,
      DiscountAmount: hasExtendedFields ? Number(row[15]) || 0 : 0,
      SubtotalAmount: subtotalAmount,
      NetAmount: netAmount,
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
    const shipping = resolveShippingAmount_(payload.shippingType, payload.shippingAmount);
    const customerName = String(payload.customerName || '').trim().slice(0, 120);
    const customerAddress = String(payload.customerAddress || '').trim().slice(0, 300);
    const customerPhone = String(payload.customerPhone || '').trim().slice(0, 30);
    const discountAmount = Number(payload.discountAmount) || 0;
    if (discountAmount < 0) throw new Error('Invalid discount amount');
    const totals = lines.reduce(function(result, line) {
      result.quantity += line.quantity; result.amount += line.amount; result.cost += line.cost * line.quantity; return result;
    }, { quantity: 0, amount: 0, cost: 0 });
    const subtotalAmount = totals.amount;
    const netAmount = subtotalAmount + shipping.amount - discountAmount;
    if (netAmount < 0) throw new Error('Invalid order total');
    appendObject(SHEETS.ORDERS, [orderId, new Date(), payload.agentId, totals.quantity, netAmount, totals.cost, netAmount - totals.cost, 'COMPLETED', user.username, new Date(), customerName, customerAddress, customerPhone, shipping.type, shipping.amount, discountAmount, subtotalAmount, netAmount]);
    lines.forEach(function(line) {
      appendObject(SHEETS.ORDER_ITEMS, [generateId('ITEM', SHEETS.ORDER_ITEMS), orderId, line.product.ProductID, line.quantity, line.price, line.cost, line.amount]);
      applyStockMovement_(line.product.ProductID, line.quantity, 'OUT', orderId, 'Order created');
    });
    return { orderId: orderId, totalAmount: netAmount, totalQty: totals.quantity };
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
    getSheet(SHEETS.ORDERS).getRange(row, getOrderSchemaStatusColumn_()).setValue('CANCELLED');
    return { orderId: id, status: 'CANCELLED' };
  } finally {
    lock.releaseLock();
  }
}
