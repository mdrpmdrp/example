/** Order read model. Write operations should use adjustStock for stock integrity. */
function getOrderSchemaStatusColumn_() {
  return 8;
}

function normalizeShippingType_(value) {
  const type = String(value || '').trim().toUpperCase();
  let map = {
    VAN: 'VAN',
    CHILLED150: 'CHILLED150',
    CHILLED100: 'CHILLED100',
    PARCEL: 'PARCEL',
    MESSENGER: 'MESSENGER',
    SPLIT: 'SPLIT',
    NONE: 'NONE'
  };
  return map[type] || 'NONE';
}

function resolveShippingAmount_(shippingType, shippingAmount) {
  const type = normalizeShippingType_(shippingType);
  const preset = { VAN: 350, CHILLED: 150, PARCEL: 60, CHILLED150: 150, CHILLED100: 100, INTER: 300 };
  if (preset[type] != null) return { type: type, amount: preset[type] };
  if (type === 'MESSENGER' || type === 'SPLIT') {
    const amount = Number(shippingAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid shipping amount');
    return { type: type, amount: amount };
  }
  return { type: 'NONE', amount: 0 };
}

function resolveOrderDateValue_(value, fallbackDate) {
  var base = fallbackDate instanceof Date && !isNaN(fallbackDate.getTime())
    ? new Date(fallbackDate.getTime())
    : new Date();

  if (!value) return base;
  if (value instanceof Date && !isNaN(value.getTime())) return new Date(value.getTime());

  var text = String(value || '').trim();
  if (!text) return base;

  var dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    var year = Number(dateOnlyMatch[1]);
    var monthIndex = Number(dateOnlyMatch[2]) - 1;
    var day = Number(dateOnlyMatch[3]);
    return new Date(
      year,
      monthIndex,
      day,
      base.getHours(),
      base.getMinutes(),
      base.getSeconds(),
      base.getMilliseconds()
    );
  }

  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? base : parsed;
}

function formatOrderDateForClient_(value) {
  if (!value) return '';
  var date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return String(value || '').trim();
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function normalizeOrderUnitValue_(product, selectedUnit) {
  var unit = String(selectedUnit || '__base__').trim() || '__base__';
  var baseUnit = product ? String(product.BaseUnit || product.UnitName || '').trim() : '';
  if (unit === '__base__' && baseUnit) return baseUnit;
  return unit;
}

function getOrderRecordMonthKey_(value) {
  return getMonthKeyFromDate(value);
}

function getOrderSourceSheetsForMonth_(monthKey) {
  var normalizedMonthKey = normalizeMonthKey(monthKey);
  var currentMonthKey = getMonthKeyFromDate(new Date());
  return normalizedMonthKey === currentMonthKey
    ? {
      ordersSheet: SHEETS.ORDERS,
      itemsSheet: SHEETS.ORDER_ITEMS
    }
    : {
      ordersSheet: SHEETS.BACKUP_ORDERS,
      itemsSheet: SHEETS.BACKUP_ORDER_ITEMS
    };
}

function ensureOrderCancellationColumns_() {
  [SHEETS.ORDERS, SHEETS.BACKUP_ORDERS].forEach(function (sheetName) {
    var sheet = getSheet(sheetName);
    if (!sheet) return;
    var lastCol = sheet.getLastColumn();
    if (lastCol < 20) {
      sheet.insertColumnsAfter(lastCol, 20 - lastCol);
    }
    sheet.getRange(1, 19, 1, 2).setValues([['CancelledAt', 'CancelledBy']]);
  });
}

function toArray_(value) {
  return Array.isArray(value) ? value : [];
}

function getOrderRowsForMonth_(monthKey) {
  var normalizedMonthKey = normalizeMonthKey(monthKey);
  var sourceSheets = getOrderSourceSheetsForMonth_(normalizedMonthKey);
  var orderRows = getData(sourceSheets.ordersSheet);
  var itemRows = getData(sourceSheets.itemsSheet);
  var tz = Session.getScriptTimeZone();

  var filteredOrders = orderRows.filter(function (row) {
    return isDateInMonth_(row[1], normalizedMonthKey);
  });

  var orderIds = {};
  filteredOrders.forEach(function (row) {
    orderIds[row[0]] = true;
  });

  var filteredItems = itemRows.filter(function (row) {
    return orderIds[row[1]];
  });

  return {
    monthKey: normalizedMonthKey,
    orders: filteredOrders,
    items: filteredItems,
    tz: tz
  };
}

function buildOrderIndexes_(rows) {
  var orderRows = toArray_(rows && rows.orders);
  var itemRows = toArray_(rows && rows.items);
  var productsById = getProducts().reduce(function (map, product) {
    map[product.ProductID] = product;
    return map;
  }, {});
  var agentById = getAgents().reduce(function (map, agent) {
    map[agent.AgentID] = agent.AgentName;
    return map;
  }, {});
  var itemsByOrderId = itemRows.reduce(function (map, item) {
    var orderId = String(item && item[1] || '').trim();
    if (!orderId) return map;
    (map[orderId] || (map[orderId] = [])).push(item);
    return map;
  }, {});

  return {
    orderRows: orderRows,
    itemRows: itemRows,
    itemsByOrderId: itemsByOrderId,
    productsById: productsById,
    agentById: agentById,
    tz: rows && rows.tz ? rows.tz : Session.getScriptTimeZone()
  };
}

function buildOrderPayloadFromRows_(rows, canViewCost, indexes) {
  var orderRows = toArray_(rows && rows.orders);
  var resolvedIndexes = indexes || buildOrderIndexes_(rows);
  var tz = resolvedIndexes.tz || Session.getScriptTimeZone();
  var itemsByOrderId = resolvedIndexes.itemsByOrderId || {};
  var productsById = resolvedIndexes.productsById || {};
  var agentById = resolvedIndexes.agentById || {};
  var emptyItems = [];

  return orderRows.map(function (row) {
    var orderDate = row[1] || new Date();
    var orderItems = itemsByOrderId[row[0]] || emptyItems;
    return {
      orderId: row[0],
      createdAt: orderDate.getTime(),
      orderDateKey: Utilities.formatDate(orderDate, tz, 'yyyy-MM-dd'),
      orderDateLabel: Utilities.formatDate(orderDate, tz, 'dd/MM/yyyy'),
      orderTimeLabel: Utilities.formatDate(orderDate, tz, 'HH:mm'),
      status: String(row[7] || 'COMPLETED'),
      cancelledAt: formatOrderDateForClient_(row[18]),
      cancelledBy: row[19] || '',
      agent: agentById[row[2]] || row[2],
      totalQty: Number(row[3]) || 0,
      subtotalAmount: Number(row[16] || row[4]) || 0,
      shippingType: String(row[13] || 'NONE'),
      shippingAmount: Number(row[14]) || 0,
      discountAmount: Number(row[15]) || 0,
      totalAmount: Number(row[4]) || 0,
      customerName: String(row[10] || ''),
      customerAddress: String(row[11] || ''),
      customerPhone: String(row[12] || ''),
      totalCost: canViewCost ? Number(row[5]) || 0 : null,
      items: orderItems.map(function (item) {
        var product = productsById[item[2]];
        return {
          isNonStock: !product,
          productId: item[2],
          productName: product ? product.ProductName : item[2],
          selectedUnit: String(item[3] || '__base__'),
          qty: Number(item[4]) || 0,
          unitPrice: Number(item[6] || 0),
          cost: canViewCost ? Number(item[7]) || 0 : null,
          total: Number(item[8] || 0)
        };
      })
    };
  });
}

function archiveOrdersBeforeCurrentMonth() {
  ensureOrderCancellationColumns_();
  var currentMonthKey = getMonthKeyFromDate(new Date());
  var orderHeaders = [
    "OrderID",
    "OrderDate",
    "AgentID",
    "TotalQty",
    "TotalAmount",
    "TotalCost",
    "Profit",
    "Status",
    "CreatedBy",
    "Created",
    "CustomerName",
    "CustomerAddress",
    "CustomerPhone",
    "ShippingType",
    "ShippingAmount",
    "DiscountAmount",
    "SubtotalAmount",
    "NetAmount",
    "CancelledAt",
    "CancelledBy"
  ];
  var itemHeaders = [
    "ItemID",
    "OrderID",
    "ProductID",
    "Unit",
    "Qty",
    "BaseUnitQty",
    "UnitPrice",
    "Cost",
    "TotalPrice"
  ];

  ensureSheetWithHeaders(SHEETS.BACKUP_ORDERS, orderHeaders);
  ensureSheetWithHeaders(SHEETS.BACKUP_ORDER_ITEMS, itemHeaders);

  var orderSheet = getSheet(SHEETS.ORDERS);
  var itemSheet = getSheet(SHEETS.ORDER_ITEMS);
  var orderRows = getData(SHEETS.ORDERS);
  var itemRows = getData(SHEETS.ORDER_ITEMS);

  if (!orderRows.length) {
    return { ordersMoved: 0, orderItemsMoved: 0, monthKey: currentMonthKey };
  }

  var ordersToMove = [];
  var orderIds = {};
  orderRows.forEach(function (row, index) {
    if (getOrderRecordMonthKey_(row[1]) && getOrderRecordMonthKey_(row[1]) < currentMonthKey) {
      ordersToMove.push({ row: row, rowIndex: index + 2 });
      orderIds[row[0]] = true;
    }
  });

  if (!ordersToMove.length) {
    return { ordersMoved: 0, orderItemsMoved: 0, monthKey: currentMonthKey };
  }

  var orderItemsToMove = [];
  itemRows.forEach(function (row, index) {
    if (orderIds[row[1]]) {
      orderItemsToMove.push({ row: row, rowIndex: index + 2 });
    }
  });

  appendRows_(SHEETS.BACKUP_ORDERS, ordersToMove.map(function (entry) { return entry.row; }));
  appendRows_(SHEETS.BACKUP_ORDER_ITEMS, orderItemsToMove.map(function (entry) { return entry.row; }));

  deleteRowsByIndexes_(itemSheet, orderItemsToMove.map(function (entry) { return entry.rowIndex; }));
  deleteRowsByIndexes_(orderSheet, ordersToMove.map(function (entry) { return entry.rowIndex; }));

  return {
    ordersMoved: ordersToMove.length,
    orderItemsMoved: orderItemsToMove.length,
    monthKey: currentMonthKey
  };
}

function installMonthlyOrderBackupTrigger() {
  var handlers = ScriptApp.getProjectTriggers().filter(function (trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === 'archiveOrdersBeforeCurrentMonth';
  });
  handlers.forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('archiveOrdersBeforeCurrentMonth')
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();
  return { success: true };
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
  var rows = getData(SHEETS.ORDERS);
  var items = getData(SHEETS.ORDER_ITEMS);
  var indexes = buildOrderIndexes_({ orders: rows, items: items, tz: Session.getScriptTimeZone() });

  return indexes.orderRows.map(function (row) {
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
      CancelledAt: formatOrderDateForClient_(row[18]),
      CancelledBy: row[19],
      CustomerName: String(row[10] || ''),
      CustomerAddress: String(row[11] || ''),
      CustomerPhone: String(row[12] || ''),
      ShippingType: String(row[13] || 'NONE'),
      ShippingAmount: Number(row[14]) || 0,
      DiscountAmount: Number(row[15]) || 0,
      SubtotalAmount: Number(row[16]) || 0,
      NetAmount: Number(row[17]) || 0,
      Items: (indexes.itemsByOrderId[row[0]] || []).map(function (item) {
        var product = indexes.productsById[item[2]];
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

function getOrdersByMonth(monthKey) {
  var rows = getOrderRowsForMonth_(monthKey);
  var indexes = buildOrderIndexes_(rows);
  var orderRowMap = indexes.orderRows.reduce(function (map, row) {
    map[row[0]] = row;
    return map;
  }, {});
  return buildOrderPayloadFromRows_(rows, true, indexes).map(function (order) {
    var sourceRow = orderRowMap[order.orderId] || [];
    return {
      OrderID: order.orderId,
      OrderDate: sourceRow[1] || new Date(),
      AgentID: order.agent,
      TotalQty: order.totalQty,
      TotalAmount: order.totalAmount,
      TotalCost: Number(order.totalCost) || 0,
      Profit: Number(order.totalAmount || 0) - Number(order.totalCost || 0),
      Status: sourceRow[7] || 'COMPLETED',
      CreatedBy: '',
      Created: sourceRow[9] || new Date(),
      CancelledAt: formatOrderDateForClient_(sourceRow[18]),
      CancelledBy: sourceRow[19] || '',
      CustomerName: order.customerName,
      CustomerAddress: order.customerAddress,
      CustomerPhone: order.customerPhone,
      ShippingType: order.shippingType,
      ShippingAmount: order.shippingAmount,
      DiscountAmount: order.discountAmount,
      SubtotalAmount: order.subtotalAmount,
      NetAmount: order.totalAmount,
      Items: order.items.map(function (item) {
        return {
          ProductID: item.productId,
          ProductName: item.productName,
          SelectedUnit: item.selectedUnit,
          Qty: item.qty,
          BaseQtyNeeded: item.qty,
          UnitPrice: item.unitPrice,
          Price: item.unitPrice,
          Cost: item.cost,
          TotalPrice: item.total,
          Amount: item.total
        };
      })
    };
  });
}

function getOrderRecordForCancellation_(orderId) {
  var id = String(orderId || '').trim();
  if (!id) return null;

  var currentOrderRow = findRow(SHEETS.ORDERS, id);
  if (currentOrderRow > 0) {
    var currentOrder = getOrders().find(function (item) { return item.OrderID === id; });
    if (currentOrder) {
      return {
        sheetName: SHEETS.ORDERS,
        rowIndex: currentOrderRow,
        order: currentOrder
      };
    }
  }

  var backupOrderRow = findRow(SHEETS.BACKUP_ORDERS, id);
  if (backupOrderRow > 0) {
    var backupRows = getData(SHEETS.BACKUP_ORDERS);
    var backupRow = backupRows[backupOrderRow - 2];
    var monthKey = getMonthKeyFromDate(backupRow && backupRow[1]);
    var backupOrder = getOrdersByMonth(monthKey).find(function (item) { return item.OrderID === id; });
    if (backupOrder) {
      return {
        sheetName: SHEETS.BACKUP_ORDERS,
        rowIndex: backupOrderRow,
        order: backupOrder
      };
    }
  }

  return null;
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
    const orderDate = resolveOrderDateValue_(payload.orderDate, new Date());
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
      orderDate,
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
    const orderDate = resolveOrderDateValue_(payload.orderDate, existing.OrderDate || new Date());
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
      orderDate,
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
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN']);
  const id = String(orderId || '').trim();
  if (!id) throw new Error('Order ID is required');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    ensureOrderCancellationColumns_();
    const target = getOrderRecordForCancellation_(id);
    if (!target || !target.order) throw new Error('Order not found');
    if (String(target.order.Status).toUpperCase() === 'CANCELLED') throw new Error('Order is already cancelled');

    // 1. คืนสต๊อกสินค้า
    target.order.Items.forEach(function (item) {
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

    // 2. อัปเดตสถานะออเดอร์ในชีทต้นทางของบิลนั้น
    getSheet(target.sheetName).getRange(target.rowIndex, getOrderSchemaStatusColumn_()).setValue('CANCELLED');
    getSheet(target.sheetName).getRange(target.rowIndex, 19).setValue(new Date());
    getSheet(target.sheetName).getRange(target.rowIndex, 20).setValue(user && user.username ? user.username : '');

    return { orderId: id, status: 'CANCELLED' };

  } finally {
    lock.releaseLock();
  }
}
