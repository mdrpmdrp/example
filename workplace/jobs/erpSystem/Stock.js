/** Stock mutations are recorded so the product balance is auditable. */
function adjustStock(sessionToken, productId, quantity, type, reference, remark) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  return applyStockMovement_(productId, quantity, type, reference, remark);
}

function applyStockMovement_(productId, quantity, type, reference, remark) {
  var product = getProductById(productId);
  if (!product) throw new Error('Product not found: ' + productId);
  var delta = Number(quantity);
  if (!isFinite(delta) || delta === 0) throw new Error('Quantity must not be zero');
  if (type === 'OUT') delta = -Math.abs(delta);
  if (type === 'IN') delta = Math.abs(delta);
  var balance = Number(product.Stock) + delta;
  if (balance < 0) throw new Error('Insufficient stock for ' + productId);

  var row = findRow(SHEETS.PRODUCTS, productId);
  // Column 6 = Stock, column 7 = MinStock.
  getSheet(SHEETS.PRODUCTS).getRange(row, 6).setValue(balance);
  getSheet(SHEETS.PRODUCTS).getRange(row, 10).setValue(new Date());
  appendObject(SHEETS.STOCK_MOVEMENT, [generateId('STK', SHEETS.STOCK_MOVEMENT), new Date(), productId, type || 'ADJUST', delta, balance, reference || '', remark || '']);
  return balance;
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
