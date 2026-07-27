/** Order read model. Write operations should use adjustStock for stock integrity. */
function getOrderSchemaStatusColumn_() {
  return 8;
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

function normalizeOrderUnitValue_(product, selectedUnit) {
  var unit = String(selectedUnit || '__base__').trim() || '__base__';
  var baseUnit = product ? String(product.BaseUnit || product.UnitName || '').trim() : '';
  if (unit === '__base__' && baseUnit) return baseUnit;
  return unit;
}

function buildOrderLines_(sessionToken, payload, stockBufferByProduct) {
  const requiredStock = {};
  const lines = payload.items.map(function (item) {
    const isNonStock = Boolean(item && item.isNonStock);
    const productId = String(item && item.productId || '').trim();
    const productName = String(item && item.productName || productId).trim() || productId;
    const qty = Number(item && item.qty || 0);
    const baseQtyNeeded = Number(item && item.baseQtyNeeded || qty);

    if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 1000000) {
      throw new Error('Invalid order line quantity');
    }

    if (isNonStock) {
      const selectedUnit = String(item && item.selectedUnit || '__base__').trim() || '__base__';
      const validatedPrice = Number(item && item.unitPrice || 0);
      const unitCost = Number(item && item.cost || 0);
      const rowTotal = validatedPrice * qty;

      return {
        isNonStock: true,
        productId: productId,
        productName: productName,
        quantity: qty,
        selectedUnit: selectedUnit,
        baseQtyNeeded: baseQtyNeeded,
        price: validatedPrice,
        cost: unitCost,
        amount: rowTotal,
        product: null
      };
    }

    const product = getProductById(productId);
    if (!product) {
      throw new Error('Invalid product: ' + productId);
    }

    const selectedUnit = normalizeOrderUnitValue_(product, item && item.selectedUnit);
    const availableStock = Number(product.Stock || 0) + Number(stockBufferByProduct && stockBufferByProduct[productId] || 0);
    requiredStock[productId] = (requiredStock[productId] || 0) + baseQtyNeeded;
    if (availableStock < requiredStock[productId]) {
      throw new Error('Insufficient stock for ' + product.ProductID);
    }

    const quote = quoteTierPrice(sessionToken, payload.agentId, product.ProductID, baseQtyNeeded, selectedUnit);
    const validatedPrice = Number(quote.unitPrice || 0);
    const unitCost = Number(product.Cost || 0);
    const rowTotal = validatedPrice * qty;

    return {
      isNonStock: false,
      productId: productId,
      productName: productName,
      quantity: qty,
      selectedUnit: selectedUnit,
      baseQtyNeeded: baseQtyNeeded,
      price: validatedPrice,
      cost: unitCost,
      amount: rowTotal,
      product: product
    };
  });

  const totals = lines.reduce(function (result, line) {
    result.quantity += line.quantity;
    result.amount += line.amount;
    result.cost += (line.cost * line.baseQtyNeeded);
    return result;
  }, { quantity: 0, amount: 0, cost: 0 });

  return { lines: lines, totals: totals };
}

function deleteOrderItemsByOrderId_(orderId) {
  const sheet = getSheet(SHEETS.ORDER_ITEMS);
  const rows = getData(SHEETS.ORDER_ITEMS);
  for (let index = rows.length - 1; index >= 0; index--) {
    if (rows[index][1] === orderId) {
      sheet.deleteRow(index + 2);
    }
  }
}

function getOrders() {
  var items = getData(SHEETS.ORDER_ITEMS);
  var products = getProducts();

  return getData(SHEETS.ORDERS).map(function (row) {
    return {
      OrderID: row[0],
      OrderDate: row[1],
      AgentID: row[2],
      TotalQty: Number(row[3]) || 0,
      TotalAmount: Number(row[4]) || 0,
      TotalCost: Number(row[5]) || 0,
      Profit: Number(row[6]) || 0,
      Status: row[7],
      CreatedBy: row[8],
      Created: row[9],
      CustomerName: String(row[10] || ''),
      CustomerAddress: String(row[11] || ''),
      CustomerPhone: String(row[12] || ''),
      ShippingType: String(row[13] || 'NONE'),
      ShippingAmount: Number(row[14]) || 0,
      DiscountAmount: Number(row[15]) || 0,
      SubtotalAmount: Number(row[16]) || 0,
      NetAmount: Number(row[17]) || 0,
      Items: items.filter(function (item) {
        return item[1] === row[0];
      }).map(function (item) {
        var product = products.find(function (entry) { return entry.ProductID === item[2]; });
        return {
          ProductID: item[2],
          ProductName: product ? product.ProductName : item[2],
          SelectedUnit: String(item[3] || '__base__'),
          Qty: Number(item[4]) || 0,
          BaseQtyNeeded: Number(item[5]) || 0,
          UnitPrice: Number(item[6]) || 0,
          Price: Number(item[6]) || 0,
          Cost: Number(item[7]) || 0,
          TotalPrice: Number(item[8]) || 0,
          Amount: Number(item[8]) || 0
        };
      })
    };
  });
}

function createOrder(sessionToken, payload) {
  const user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  if (!payload || !getAgentById(payload.agentId) || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) {
    throw new Error('Invalid order');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const built = buildOrderLines_(sessionToken, payload, {});
    const lines = built.lines;
    const totals = built.totals;

    const orderId = generateId('ORD', SHEETS.ORDERS);
    const shipping = resolveShippingAmount_(payload.shippingType, payload.shippingAmount);
    const customerName = String(payload.customerName || '').trim();
    const customerAddress = String(payload.customerAddress || '').trim();
    const customerPhone = String(payload.customerPhone || '').trim();
    const discountAmount = Number(payload.discountAmount) || 0;

    if (discountAmount < 0) throw new Error('Invalid discount amount');

    const subtotalAmount = totals.amount;
    const netAmount = subtotalAmount + shipping.amount - discountAmount;
    if (netAmount < 0) throw new Error('Invalid order total');

    appendObject(SHEETS.ORDERS, [
      orderId,
      new Date(),
      payload.agentId,
      totals.quantity,
      netAmount,
      totals.cost,
      netAmount - totals.cost,
      'COMPLETED',
      user.username,
      new Date(),
      customerName,
      customerAddress,
      customerPhone,
      shipping.type,
      shipping.amount,
      discountAmount,
      subtotalAmount,
      netAmount
    ]);

    lines.forEach(function (line) {
      appendObject(SHEETS.ORDER_ITEMS, [
        generateId('ITEM', SHEETS.ORDER_ITEMS),
        orderId,
        line.productId,
        line.selectedUnit,
        line.quantity,
        line.baseQtyNeeded,
        line.price,
        line.cost * line.baseQtyNeeded,
        line.amount
      ]);

      // ตัดสต๊อกสินค้าหลักด้วย baseQtyNeeded (เช่น 6 ชิ้น)
      if (!line.isNonStock) {
        applyStockMovement_(line.productId, line.baseQtyNeeded, 'OUT', orderId, 'Order created');
      }
    });

    return { orderId: orderId, totalAmount: netAmount, totalQty: totals.quantity };

  } finally {
    lock.releaseLock();
  }
}

function updateOrder(sessionToken, orderId, payload) {
  const user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  const id = String(orderId || '').trim();
  if (!id || !payload || !getAgentById(payload.agentId) || !Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) {
    throw new Error('Invalid order');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const existing = getOrders().find(function (item) { return item.OrderID === id; });
    if (!existing) throw new Error('Order not found');
    if (String(existing.Status).toUpperCase() === 'CANCELLED') throw new Error('Order is already cancelled');

    const stockBufferByProduct = {};
    existing.Items.forEach(function (item) {
      const product = getProductById(item.ProductID);
      if (!product) return;
      stockBufferByProduct[item.ProductID] = (stockBufferByProduct[item.ProductID] || 0) + Number(item.BaseQtyNeeded || item.Qty || 0);
    });

    const built = buildOrderLines_(sessionToken, payload, stockBufferByProduct);
    const lines = built.lines;
    const totals = built.totals;

    const shipping = resolveShippingAmount_(payload.shippingType, payload.shippingAmount);
    const customerName = String(payload.customerName || '').trim();
    const customerAddress = String(payload.customerAddress || '').trim();
    const customerPhone = String(payload.customerPhone || '').trim();
    const discountAmount = Number(payload.discountAmount) || 0;
    if (discountAmount < 0) throw new Error('Invalid discount amount');

    const subtotalAmount = totals.amount;
    const netAmount = subtotalAmount + shipping.amount - discountAmount;
    if (netAmount < 0) throw new Error('Invalid order total');

    existing.Items.forEach(function (item) {
      const qtyToRestore = Number(item.BaseQtyNeeded || item.Qty || 0);
      if (qtyToRestore > 0) {
        const product = getProductById(item.ProductID);
        if (product) {
          applyStockMovement_(item.ProductID, qtyToRestore, 'IN', id, 'Order updated - restore old line');
        }
      }
    });

    deleteOrderItemsByOrderId_(id);

    const row = findRow(SHEETS.ORDERS, id);
    if (row < 0) throw new Error('Order not found in sheet');

    getSheet(SHEETS.ORDERS).getRange(row, 1, 1, 18).setValues([[
      id,
      existing.OrderDate || new Date(),
      payload.agentId,
      totals.quantity,
      netAmount,
      totals.cost,
      netAmount - totals.cost,
      existing.Status || 'COMPLETED',
      existing.CreatedBy || user.username,
      existing.Created || new Date(),
      customerName,
      customerAddress,
      customerPhone,
      shipping.type,
      shipping.amount,
      discountAmount,
      subtotalAmount,
      netAmount
    ]]);

    lines.forEach(function (line) {
      appendObject(SHEETS.ORDER_ITEMS, [
        generateId('ITEM', SHEETS.ORDER_ITEMS),
        id,
        line.productId,
        line.selectedUnit,
        line.quantity,
        line.baseQtyNeeded,
        line.price,
        line.cost * line.baseQtyNeeded,
        line.amount
      ]);

      if (!line.isNonStock) {
        applyStockMovement_(line.productId, line.baseQtyNeeded, 'OUT', id, 'Order updated');
      }
    });

    return { orderId: id, totalAmount: netAmount, totalQty: totals.quantity };
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
    const order = getOrders().find(function (item) { return item.OrderID === id; });
    if (!order) throw new Error('Order not found');
    if (String(order.Status).toUpperCase() === 'CANCELLED') throw new Error('Order is already cancelled');

    // 1. คืนสต๊อกสินค้า
    order.Items.forEach(function (item) {
      // ดึงจำนวนชิ้นฐานจริงที่จะต้อง คืนเข้าคลัง (ถ้าไม่มี BaseQtyNeeded ให้ fallback ไปใช้ Qty)
      const qtyToRestore = Number(item.BaseQtyNeeded || item.Qty || 0);

      if (qtyToRestore > 0) {
        // เช็กว่าเป็นสินค้านอกคลังหรือไม่ (ถ้าไม่มีใน Master Product ถือว่าเป็น Non-Stock)
        const product = getProductById(item.ProductID);
        const isNonStock = !product || Boolean(product.isNonStock);

        // ตัดคืนสต๊อกเฉพาะสินค้าที่มีในระบบสต๊อกหลักเท่านั้น
        if (!isNonStock) {
          applyStockMovement_(item.ProductID, qtyToRestore, 'IN', id, 'Order cancelled');
        }
      }
    });

    // 2. อัปเดตสถานะออเดอร์ใน Sheet ORDERS เป็น CANCELLED
    const row = findRow(SHEETS.ORDERS, id);
    if (row < 0) throw new Error('Order not found in sheet');
    
    getSheet(SHEETS.ORDERS).getRange(row, getOrderSchemaStatusColumn_()).setValue('CANCELLED');

    return { orderId: id, status: 'CANCELLED' };

  } finally {
    lock.releaseLock();
  }
}
