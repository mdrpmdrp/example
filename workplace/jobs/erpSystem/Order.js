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

  return getData(SHEETS.ORDERS).map(function (row) {
    var hasExtendedFields = String(row[13] || '').trim() !== '' ||
      String(row[14] || '').trim() !== '' ||
      String(row[15] || '').trim() !== '' ||
      String(row[16] || '').trim() !== '' ||
      String(row[17] || '').trim() !== '';

    var subtotalAmount = hasExtendedFields ? Number(row[16]) || Number(row[4]) || 0 : Number(row[4]) || 0;
    var netAmount = hasExtendedFields ? Number(row[17]) || Number(row[4]) || 0 : Number(row[4]) || 0;

    return {
      OrderID: row[0],
      OrderDate: row[1],
      AgentID: row[2],
      TotalQty: Number(row[3]) || 0,
      TotalAmount: netAmount,
      TotalCost: Number(row[5]) || 0,
      Profit: Number(row[6]) || 0,
      Status: row[7],
      CreatedBy: row[8],
      Created: row[9],
      CustomerName: hasExtendedFields ? String(row[10] || '') : '',
      CustomerAddress: hasExtendedFields ? String(row[11] || '') : '',
      CustomerPhone: hasExtendedFields ? String(row[12] || '') : '',
      ShippingType: hasExtendedFields ? String(row[13] || 'NONE') : 'NONE',
      ShippingAmount: hasExtendedFields ? Number(row[14]) || 0 : 0,
      DiscountAmount: hasExtendedFields ? Number(row[15]) || 0 : 0,
      SubtotalAmount: subtotalAmount,
      NetAmount: netAmount,
      Items: items.filter(function (item) {
        return item[1] === row[0];
      }).map(function (item) {
        var product = products.find(function (entry) { return entry.ProductID === item[2]; });

        // รองรับทั้งแบบโครงสร้างใหม่ (9 คอลัมน์) และโครงสร้างเก่า (7 คอลัมน์) เพื่อความปลอดภัย
        var hasUnitColumn = item.length >= 9;

        return {
          ProductID: item[2],
          ProductName: product ? product.ProductName : item[2],
          SelectedUnit: hasUnitColumn ? String(item[3] || '__base__') : '__base__',
          Qty: hasUnitColumn ? (Number(item[4]) || 0) : (Number(item[3]) || 0),
          BaseQtyNeeded: hasUnitColumn ? (Number(item[5]) || 0) : (Number(item[3]) || 0),
          Price: hasUnitColumn ? (Number(item[6]) || 0) : (Number(item[4]) || 0),
          Cost: hasUnitColumn ? (Number(item[7]) || 0) : (Number(item[5]) || 0),
          Amount: hasUnitColumn ? (Number(item[8]) || 0) : (Number(item[6]) || 0)
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
    // 1. Validate และรวมจำนวนที่จะตัดสต๊อกจริง (baseQtyNeeded)
    const requiredStock = {};

    payload.items.forEach(function (item) {
      const isNonStock = Boolean(item && item.isNonStock);
      const productId = String(item && item.productId || '');
      const qty = Number(item && item.qty || 0); // จำนวนแพ็ก/หน่วยที่สั่ง
      const baseQtyNeeded = Number(item && item.baseQtyNeeded || qty); // จำนวนชิ้นฐานสำหรับตัดสต๊อก

      if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 1000000) {
        throw new Error('Invalid order line quantity');
      }

      if (!isNonStock) {
        requiredStock[productId] = (requiredStock[productId] || 0) + baseQtyNeeded;
        const product = getProductById(productId);

        if (!product) {
          throw new Error('Invalid product: ' + productId);
        }

        if (Number(product.Stock) < requiredStock[productId]) {
          throw new Error('Insufficient stock for ' + product.ProductID);
        }
      }
    });

    // 2. คำนวณ Order Line พร้อม Recalculate/Validate ราคาด้วย quoteTierPrice ฝั่ง Server
    const lines = payload.items.map(function (item) {
      const isNonStock = Boolean(item && item.isNonStock);
      const productId = String(item && item.productId || '');
      const productName = String(item && item.productName || productId);
      const qty = Number(item && item.qty || 0);
      const baseQtyNeeded = Number(item && item.baseQtyNeeded || qty);
      const selectedUnit = String(item && item.selectedUnit || '__base__');

      let validatedPrice = 0;
      let unitCost = 0;
      let product = null;

      if (isNonStock) {
        // สินค้านอกคลัง: ใช้ราคาและต้นทุนที่ส่งมาจาก Client
        validatedPrice = Number(item && item.unitPrice || 0);
        unitCost = Number(item && item.cost || 0);
      } else {
        product = getProductById(productId);
        unitCost = Number(product.Cost || 0);


        const quote = quoteTierPrice(sessionToken, payload.agentId, product.ProductID, baseQtyNeeded, selectedUnit);

        validatedPrice = Number(quote.unitPrice || 0);
      }

      const rowTotal = validatedPrice * baseQtyNeeded;

      return {
        isNonStock: isNonStock,
        productId: productId,
        productName: productName,
        quantity: qty,                // จำนวนที่สั่งซื้อ (เช่น 1 กล่อง)
        selectedUnit: selectedUnit,   // หน่วยที่เลือก
        baseQtyNeeded: baseQtyNeeded,  // จำนวนชิ้นฐานที่จะตัดสต๊อก (เช่น 6 ขวด)
        price: validatedPrice,        // ราคาที่คำนวณและยืนยันแล้วจาก Server
        cost: unitCost,
        amount: rowTotal,
        product: product
      };
    });

    // 3. คำนวณสรุปยอดรวมบิล
    const orderId = generateId('ORD', SHEETS.ORDERS);
    const shipping = resolveShippingAmount_(payload.shippingType, payload.shippingAmount);
    const customerName = String(payload.customerName || '').trim();
    const customerAddress = String(payload.customerAddress || '').trim();
    const customerPhone = String(payload.customerPhone || '').trim();
    const discountAmount = Number(payload.discountAmount) || 0;

    if (discountAmount < 0) throw new Error('Invalid discount amount');

    const totals = lines.reduce(function (result, line) {
      result.quantity += line.quantity;
      result.amount += line.amount;
      result.cost += (line.cost * line.baseQtyNeeded);
      return result;
    }, { quantity: 0, amount: 0, cost: 0 });

    const subtotalAmount = totals.amount;
    const netAmount = subtotalAmount + shipping.amount - discountAmount;
    if (netAmount < 0) throw new Error('Invalid order total');

    // 4. บันทึกข้อมูลลง Sheet ORDERS
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

    // 5. บันทึก ORDER_ITEMS และตัดสต๊อกด้วย baseQtyNeeded
    lines.forEach(function (line) {
      appendObject(SHEETS.ORDER_ITEMS, [
        generateId('ITEM', SHEETS.ORDER_ITEMS),
        orderId,
        line.productId,
        line.selectedUnit,
        line.quantity,
        line.baseQtyNeeded,
        line.price * line.baseQtyNeeded,
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
