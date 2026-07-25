const ALLOWED_PRODUCT_BASE_UNITS = ['ขวด', 'กล่อง', 'เส้น', 'แพค', 'คู่'];
const ALLOWED_PRODUCT_CATEGORIES = ['botox', 'filler', 'fat', 'หน้าใส', 'วิตามินผิว', 'ร้อยไหม', 'อื่นๆ'];

function normalizeProductBaseUnit_(value) {
  const unit = String(value || '').trim();
  return ALLOWED_PRODUCT_BASE_UNITS.indexOf(unit) >= 0 ? unit : 'ขวด';
}

function normalizePackUnits_(value) {
  var items = [];
  if (Array.isArray(value)) {
    items = value;
  } else if (value && typeof value === 'object') {
    items = [value];
  } else if (Number.isFinite(Number(value)) && Number(value) > 1) {
    items = [{ unit: 'แพค', packSize: Number(value) }];
  } else if (typeof value === 'string') {
    var text = value.trim();
    if (text) {
      try {
        var parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
      } catch (error) {
        var asNumber = Number(text);
        if (Number.isFinite(asNumber) && asNumber > 1) {
          items = [{ unit: 'แพค', packSize: asNumber }];
        }
      }
    }
  }

  return items.map(function(item) {
    var unit = String(item && item.unit || item && item.Unit || item && item.name || '').trim();
    var packSize = Number(item && (item.packSize != null ? item.packSize : item && item.PackSize));
    if (!unit || !Number.isInteger(packSize) || packSize < 1) return null;
    return { unit: unit, packSize: packSize };
  }).filter(Boolean);
}

function serializePackUnits_(value) {
  var packUnits = normalizePackUnits_(value);
  return JSON.stringify(packUnits);
}

function parsePackUnitsFromRow_(row) {
  var legacyPackSize = Number(row[13]) || 1;
  var stored = row[13];
  var packUnits = normalizePackUnits_(stored);
  if (packUnits.length) return packUnits;
  if (Number.isInteger(legacyPackSize) && legacyPackSize > 1) {
    return [{ unit: 'แพค', packSize: legacyPackSize }];
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
    Barcode: r[1],
    ProductName: r[2],
    Category: r[3],
    Cost: r[4],
    RetailPrice: r[5],
    Stock: r[6],
    MinStock: r[7],
    MaxStock: r[8],
    Status: r[9],
    Created: r[10],
    Updated: r[11],
    BaseUnit: r[12] || 'ขวด',
    PackUnits: parsePackUnitsFromRow_(r),
    UnitName: r[12] || 'ขวด',
    PackSize: Number(r[13]) || 1

  }));

}

function getProductById(productId) {

  return getProducts().find(product => product.ProductID === productId) || null;

}

function addProduct(data) {

  const sheet = SpreadsheetApp.getActive()
    .getSheetByName(SHEETS.PRODUCTS);

  sheet.appendRow([

    data.ProductID,
    data.Barcode,
    data.ProductName,
    normalizeProductCategory_(data.Category),
    data.Cost,
    data.RetailPrice,
    data.Stock,
    data.MinStock,
    '',
    "ACTIVE",
    new Date(),
    new Date(),
    normalizeProductBaseUnit_(data.BaseUnit || data.UnitName),
    serializePackUnits_(data.PackUnits || data.PackSizes || data.PackSize || [])

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
  const values = ['Cost', 'RetailPrice', 'Stock', 'MinStock', 'MaxStock'].reduce(function(result, key) {
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
      ProductID: productId, Barcode: '', ProductName: productName, Category: category,
      Cost: values.Cost, RetailPrice: values.RetailPrice, Stock: values.Stock,
      MinStock: values.MinStock,
      BaseUnit: baseUnit, PackUnits: packUnits
    });
    return getProductById(productId);
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

      sheet.getRange(i + 1, 2, 1, 13).setValues([[

        data.Barcode,
        data.ProductName,
        normalizeProductCategory_(data.Category),
        data.Cost,
        data.RetailPrice,
        data.Stock,
        data.MinStock,
        '',
        data.Status,
        values[i][10] || new Date(),
        new Date(),
        normalizeProductBaseUnit_(data.BaseUnit || data.UnitName),
        serializePackUnits_(data.PackUnits || data.PackSizes || data.PackSize || [])

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

      sheet.getRange(i + 1, 10).setValue("INACTIVE");

      return true;

    }

  }

  return false;

}

function searchProducts(keyword) {

  keyword = String(keyword).trim().toLowerCase();

  return getProducts().filter(product => {

    return (
      product.ProductID.toLowerCase().includes(keyword) ||
      product.Barcode.toLowerCase().includes(keyword) ||
      product.ProductName.toLowerCase().includes(keyword) ||
      product.Category.toLowerCase().includes(keyword)
    );

  });

}

function test() {
  let aa = searchProducts("กระเป๋า")
  Logger.log(aa)
}
