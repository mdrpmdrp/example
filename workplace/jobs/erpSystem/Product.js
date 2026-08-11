const ALLOWED_PRODUCT_BASE_UNITS = ['ขวด', 'กล่อง', 'เส้น', 'แพค', 'คู่', 'ชุด', 'กระปุก', 'แบ่งเซท', 'อัน', 'ไซริงค์', 'แท่ง', 'หลอด'];
const ALLOWED_PRODUCT_CATEGORIES = ['botox', 'filler', 'fat', 'หน้าใส', 'วิตามินผิว', 'ร้อยไหม', 'อื่นๆ'];

function normalizeProductBaseUnit_(value) {
  const unit = String(value || '').trim();
  return ALLOWED_PRODUCT_BASE_UNITS.indexOf(unit) >= 0 ? unit : 'ขวด';
}

function normalizePackUnits_(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(function(item) {
    var unit = String(item && item.unit || '').trim();
    var packSize = Number(item && item.packSize);
    var price = Number(item && item.price);
    if (!unit || !Number.isInteger(packSize) || packSize < 1) return null;
    var normalized = { unit: unit, packSize: packSize };
    if (Number.isFinite(price) && price >= 0) normalized.price = price;
    return normalized;
  }).filter(Boolean);
}

function serializePackUnits_(value) {
  var packUnits = normalizePackUnits_(value);
  return JSON.stringify(packUnits);
}

function parsePackUnitsFromRow_(row) {
  var raw = row[11];
  if (Array.isArray(raw)) {
    return normalizePackUnits_(raw);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      var parsed = JSON.parse(raw);
      return normalizePackUnits_(parsed);
    } catch (error) {
      return [];
    }
  }
  return [];
}

function normalizeProductCategory_(value) {
  const category = String(value || '').trim();
  return ALLOWED_PRODUCT_CATEGORIES.indexOf(category) >= 0 ? category : 'อื่นๆ';
}

function getProducts() {

  const rows = getData(SHEETS.PRODUCTS);

  return rows.map(r => ({
    ProductID: r[0],
    ProductName: r[1],
    Category: r[2],
    Cost: r[3],
    RetailPrice: r[4],
    Stock: r[5],
    MinStock: r[6],
    Status: r[7],
    Created: r[8],
    Updated: r[9],
    BaseUnit: r[10] || 'ขวด',
    PackUnits: parsePackUnitsFromRow_(r),
    UnitName: r[10] || 'ขวด'
  }));

}

function getProductById(productId) {

  return getProducts().find(product => product.ProductID === productId) || null;

}

function addProduct(data) {

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.PRODUCTS);
  const status = String(data && data.Status || 'ACTIVE').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

  sheet.appendRow([

    data.ProductID,
    data.ProductName,
    normalizeProductCategory_(data.Category),
    data.Cost,
    data.RetailPrice,
    data.Stock,
    data.MinStock,
    status,
    new Date(),
    new Date(),
    normalizeProductBaseUnit_(data.BaseUnit || data.UnitName),
    serializePackUnits_(data.PackUnits)

  ]);

  return true;

}

/** Create a product through the authenticated UI path. */
function createProduct(sessionToken, data) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  if (!data) throw new Error('Product details are required');
  const productId = String(data.ProductID || '').trim().toUpperCase();
  const productName = String(data.ProductName || '').trim();
  const baseUnit = normalizeProductBaseUnit_(data.BaseUnit || data.UnitName);
  const category = normalizeProductCategory_(data.Category);
  const values = ['Cost', 'RetailPrice', 'Stock', 'MinStock'].reduce(function(result, key) {
    result[key] = Number(data[key]);
    return result;
  }, {});
  if (!/^[A-Z0-9_-]{1,50}$/.test(productId) || !productName || productName.length > 200) throw new Error('Invalid product details');
  if (baseUnit.length > 20) throw new Error('Invalid product details');
  if (!Number.isFinite(values.Cost) || !Number.isFinite(values.RetailPrice) || !Number.isInteger(values.Stock) || !Number.isInteger(values.MinStock) || values.Cost < 0 || values.RetailPrice < 0 || values.Stock < 0 || values.MinStock < 0) throw new Error('Invalid product quantities or prices');
  const packUnits = normalizePackUnits_(data.PackUnits);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (getProductById(productId)) throw new Error('Product ID already exists');
    addProduct({
      ProductID: productId, ProductName: productName, Category: category,
      Cost: values.Cost, RetailPrice: values.RetailPrice, Stock: values.Stock,
      MinStock: values.MinStock,
      BaseUnit: baseUnit, PackUnits: packUnits,
      Status: String(data.Status || 'ACTIVE').trim().toUpperCase()
    });
    return true;
  } finally {
    lock.releaseLock();
  }
}

function updateProduct(data) {

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.PRODUCTS);

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (values[i][0] == data.ProductID) {
      var currentStatus = String(data.Status || values[i][7] || 'ACTIVE').trim() || 'ACTIVE';
      var currentCreated = values[i][8] || new Date();

      sheet.getRange(i + 1, 2, 1, 11).setValues([[

        data.ProductName,
        normalizeProductCategory_(data.Category),
        data.Cost,
        data.RetailPrice,
        data.Stock,
        data.MinStock,
        currentStatus,
        currentCreated,
        new Date(),
        normalizeProductBaseUnit_(data.BaseUnit || data.UnitName),
        serializePackUnits_(data.PackUnits)

      ]]);

      return true;

    }

  }

  return false;

}

function deleteProduct(productId) {

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.PRODUCTS);

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {

    if (values[i][0] == productId) {

      sheet.getRange(i + 1, 8).setValue("INACTIVE");

      return true;

    }

  }

  return false;

}

function toggleProductStatus(sessionToken, productId, status) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  const id = String(productId || '').trim();
  if (!id) throw new Error('Product ID is required');
  const nextStatus = String(status || '').trim().toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.PRODUCTS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == id) {
      sheet.getRange(i + 1, 8).setValue(nextStatus);
      sheet.getRange(i + 1, 10).setValue(new Date());
      return getProductById(id);
    }
  }

  throw new Error('Product not found: ' + id);
}

var PRODUCTS_CACHE_ = null;

function getProducts() {
  if (PRODUCTS_CACHE_) return PRODUCTS_CACHE_;

  var rows = getData(SHEETS.PRODUCTS);
  PRODUCTS_CACHE_ = rows.map(function (r) {
    return {
      ProductID: r[0],
      ProductName: r[1],
      Category: r[2],
      Cost: r[3],
      RetailPrice: r[4],
      Stock: r[5],
      MinStock: r[6],
      Status: r[7],
      Created: r[8],
      Updated: r[9],
      BaseUnit: r[10] || 'à¸‚à¸§à¸”',
      PackUnits: parsePackUnitsFromRow_(r),
      UnitName: r[10] || 'à¸‚à¸§à¸”'
    };
  });
  return PRODUCTS_CACHE_;
}
