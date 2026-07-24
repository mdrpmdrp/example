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
    Updated: r[11]

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
    data.Category,
    data.Cost,
    data.RetailPrice,
    data.Stock,
    data.MinStock,
    data.MaxStock,
    "ACTIVE",
    new Date(),
    new Date()

  ]);

  return true;

}

/** Create a product through the authenticated UI path. */
function createProduct(sessionToken, data) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  if (!data) throw new Error('Product details are required');
  const productId = String(data.ProductID || '').trim().toUpperCase();
  const productName = String(data.ProductName || '').trim();
  const values = ['Cost', 'RetailPrice', 'Stock', 'MinStock', 'MaxStock'].reduce(function(result, key) {
    result[key] = Number(data[key]);
    return result;
  }, {});
  if (!/^[A-Z0-9_-]{1,50}$/.test(productId) || !productName || productName.length > 200) throw new Error('Invalid product details');
  if (!Number.isFinite(values.Cost) || !Number.isFinite(values.RetailPrice) || !Number.isInteger(values.Stock) || !Number.isInteger(values.MinStock) || !Number.isInteger(values.MaxStock) || values.Cost < 0 || values.RetailPrice < 0 || values.Stock < 0 || values.MinStock < 0 || values.MaxStock < values.MinStock) throw new Error('Invalid product quantities or prices');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (getProductById(productId)) throw new Error('Product ID already exists');
    addProduct({
      ProductID: productId, Barcode: '', ProductName: productName, Category: '',
      Cost: values.Cost, RetailPrice: values.RetailPrice, Stock: values.Stock,
      MinStock: values.MinStock, MaxStock: values.MaxStock
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

      sheet.getRange(i + 1, 2, 1, 10).setValues([[

        data.Barcode,
        data.ProductName,
        data.Category,
        data.Cost,
        data.RetailPrice,
        data.Stock,
        data.MinStock,
        data.MaxStock,
        data.Status,
        new Date()

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
