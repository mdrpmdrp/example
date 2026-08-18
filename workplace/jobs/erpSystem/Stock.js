/** Stock mutations are recorded so the product balance is auditable. */
function adjustStock(sessionToken, productId, quantity, type, reference, remark) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  var results = applyStockMovementsBatch_([{
    productId: productId,
    quantity: quantity,
    type: type,
    reference: reference,
    remark: remark
  }]);
  return results.length ? results[0].balance : null;
}

function applyStockMovement_(productId, quantity, type, reference, remark) {
  var results = applyStockMovementsBatch_([{
    productId: productId,
    quantity: quantity,
    type: type,
    reference: reference,
    remark: remark
  }]);
  return results.length ? results[0].balance : null;
}

function generateSequentialStockMovementIds_(count) {
  var total = Number(count) || 0;
  if (total <= 0) return [];

  var sheet = getSheet(SHEETS.STOCK_MOVEMENT);
  var lastRow = sheet.getLastRow();
  var nextNumber = 0;

  if (lastRow >= 2) {
    var lastId = String(sheet.getRange(lastRow, 1).getValue() || '').trim();
    var parsed = parseInt(lastId.replace('STK', ''), 10);
    if (Number.isFinite(parsed)) nextNumber = parsed;
  }

  var ids = [];
  for (var index = 1; index <= total; index++) {
    ids.push('STK' + String(nextNumber + index).padStart(6, '0'));
  }
  return ids;
}

function applyStockMovementsBatch_(movements) {
  var entries = Array.isArray(movements) ? movements.filter(Boolean) : [];
  if (!entries.length) return [];

  return withConsoleTiming_('server:applyStockMovementsBatch', function () {
    var sheet = getSheet(SHEETS.PRODUCTS);
    var rows = getData(SHEETS.PRODUCTS);
    if (!rows.length) throw new Error('Products sheet is empty');

    var productIndexById = {};
    rows.forEach(function (row, index) {
      var productId = String(row[0] || '').trim();
      if (!productId) return;
      productIndexById[productId] = {
        row: row,
        rowIndex: index + 2
      };
    });

    var movementIds = generateSequentialStockMovementIds_(entries.length);
    var now = new Date();
    var movementRows = [];
    var results = [];

    entries.forEach(function (entry, index) {
      var productId = String(entry.productId || '').trim();
      if (!productId) throw new Error('Product ID is required');

      var record = productIndexById[productId];
      if (!record) throw new Error('Product not found: ' + productId);

      var delta = Number(entry.quantity);
      if (!isFinite(delta) || delta === 0) throw new Error('Quantity must not be zero');

      var type = String(entry.type || 'ADJUST').trim().toUpperCase();
      if (type === 'OUT') delta = -Math.abs(delta);
      if (type === 'IN') delta = Math.abs(delta);

      var balance = Number(record.row[5]) + delta;
      if (balance < 0) throw new Error('Insufficient stock for ' + productId);

      record.row[5] = balance;
      record.row[9] = now;

      movementRows.push([
        movementIds[index],
        now,
        productId,
        type || 'ADJUST',
        delta,
        balance,
        String(entry.reference || ''),
        String(entry.remark || '')
      ]);

      results.push({
        productId: productId,
        balance: balance,
        delta: delta
      });
    });

    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    appendRows_(SHEETS.STOCK_MOVEMENT, movementRows);
    resetProductCaches_();

    return results;
  });
}

function getStockSummary(sessionToken) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  return getProducts().map(function(product) {
    var isActive = String(product.Status || 'ACTIVE').toUpperCase() !== 'INACTIVE';
    return {
      productId: product.ProductID,
      productName: product.ProductName,
      stock: Number(product.Stock),
      minStock: Number(product.MinStock),
      status: String(product.Status || 'ACTIVE').trim() || 'ACTIVE',
      lowStock: isActive && Number(product.Stock) <= Number(product.MinStock)
    };
  });
}

function getLowStockProducts() {
  return getProducts().filter(function(product) {
    return String(product.Status || 'ACTIVE').toUpperCase() !== 'INACTIVE' && Number(product.Stock) <= Number(product.MinStock);
  });
}
