/* ============================================================
   Code.js — Google Apps Script (Quotation Management)
   ============================================================
   Deploy as a Web App:
     Execute as: Me
     Who has access: Anyone (or Anyone in your domain)
   ============================================================ */

// ── Sheet Names ──────────────────────────────────────────────
const SHEET_QUOTATIONS = 'Quotations';
const SHEET_CUSTOMERS = 'Customers';
const SHEET_PRODUCTS = 'Products';
const SHEET_BANK = 'BankAccounts';

// ── Column Definitions ───────────────────────────────────────
//   Each array defines the header row for that sheet.

const QUOTATION_COLS = [
  'id', 'date', 'name', 'tel', 'taxId', 'address',
  'status', 'subTotal', 'deposit', 'wantVat', 'grandTotal',
  'items',          // stored as JSON string
  'confirmDeposit',  // boolean: true when deposit payment is confirmed
  'confirmSuccess',   // datetime when quotation is marked as successful (won)
  'bankId',           // reference to BankAccounts id
];

const CUSTOMER_COLS = [
  'id', 'name', 'tel', 'taxId', 'address'
];

const PRODUCT_COLS = [
  'id', 'code', 'name', 'price', 'unit', 'color',
  'desc', 'spec', 'warranty', 'notes',
  'images',         // stored as JSON string (base64 array)
  'warrantyItems'   // stored as JSON string ([{label, months}])
];

const BANK_COLS = [
  'id', 'bankName', 'accountName', 'accountNumber'
];

// ── Serve Web App ─────────────────────────────────────────────
function doGet(e) {
  let html =  HtmlService.createTemplateFromFile('index')
  html.logoBase64 = _getLogoBase64();
  return html.evaluate()
    .setTitle('QT Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function _getLogoBase64() {
  const fileUrl = 'https://img2.pic.in.th/croped_Logo_cs168_png-02.png';
  try {
    const response = UrlFetchApp.fetch(fileUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return '';
    const contentType = (response.getHeaders()['Content-Type'] || 'image/png').split(';')[0].trim();
    const base64 = Utilities.base64Encode(response.getContent());
    return 'data:' + contentType + ';base64,' + base64;
  } catch (e) {
    Logger.log('Error fetching logo image: ' + e);
    return '';
  }
}

function _ensureSheet(ss, name, cols) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Write / verify header row
  const header = sheet.getRange(1, 1, 1, cols.length).getValues()[0];
  const needsHeader = header.every(h => h === '' || h === null);
  if (needsHeader) {
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    sheet.getRange(1, 1, 1, cols.length)
      .setFontWeight('bold')
      .setBackground('#1e293b')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMERS — CRUD
// ─────────────────────────────────────────────────────────────

/** Returns all customers as an array of objects. */
function getCustomers() {
  return JSON.stringify(_sheetToObjects(SHEET_CUSTOMERS, CUSTOMER_COLS, true));
}

/**
 * Save (insert or update) a customer.
 * @param {Object} data  { id?, name, tel, taxId, address }
 * @returns {Object}     saved record with id
 */
function saveCustomer(data) {
  const sheet = _getSheet(SHEET_CUSTOMERS);
  if (data.id) {
    // Update existing row
    const row = _findRowById(sheet, data.id);
    if (row) {
      _writeRow(sheet, row, CUSTOMER_COLS, data);
      return data;
    }
  }
  // Insert new
  data.id = data.id || 'C-' + Date.now();
  sheet.appendRow(_objToRow(CUSTOMER_COLS, data));
  return data;
}

/** Delete a customer row by id. */
function deleteCustomer(id) {
  return _deleteById(SHEET_CUSTOMERS, id);
}

// ─────────────────────────────────────────────────────────────
// PRODUCTS — CRUD
// ─────────────────────────────────────────────────────────────

/** Returns all products as an array of objects. Images array is parsed. */
function getProducts() {
  const rows = _sheetToObjects(SHEET_PRODUCTS, PRODUCT_COLS);
  return JSON.stringify(rows.map(p => {
    p.images = _parseJson(p.images, []);
    p.warrantyItems = _parseJson(p.warrantyItems, []);
    p.price = parseFloat(p.price) || 0;
    p.warranty = parseFloat(p.warranty) || 0;
    return p;
  }))
}

/**
 * Save (insert or update) a product.
 * @param {Object} data  product object (images must be JS array)
 * @returns {Object}     saved record with id
 */
function saveProduct(data) {
  const sheet = _getSheet(SHEET_PRODUCTS);
  // Serialize images and warrantyItems arrays to JSON strings
  const serialized = Object.assign({}, data, {
    images: JSON.stringify(data.images || []),
    warrantyItems: JSON.stringify(data.warrantyItems || [])
  });
  if (data.id) {
    const row = _findRowById(sheet, data.id);
    if (row) {
      _writeRow(sheet, row, PRODUCT_COLS, serialized);
      return data;
    }
  }
  serialized.id = serialized.id || 'P-' + Date.now();
  data.id = serialized.id;
  sheet.appendRow(_objToRow(PRODUCT_COLS, serialized));
  return data;
}

/** Delete a product row by id. */
function deleteProduct(id) {
  return _deleteById(SHEET_PRODUCTS, id);
}

// ─────────────────────────────────────────────────────────────
// BANK ACCOUNTS — CRUD
// ─────────────────────────────────────────────────────────────

/** Returns all bank accounts as an array of objects. */
function getBankAccounts() {
  return JSON.stringify(_sheetToObjects(SHEET_BANK, BANK_COLS, true));
}

/**
 * Save (insert or update) a bank account.
 * @param {Object} data  { id?, bankName, accountName, accountNumber }
 * @returns {Object}     saved record with id
 */
function saveBankAccount(data) {
  const sheet = _getSheet(SHEET_BANK) || _ensureSheet(SpreadsheetApp.getActiveSpreadsheet(), SHEET_BANK, BANK_COLS);
  if (data.id) {
    const row = _findRowById(sheet, data.id);
    if (row) {
      _writeRow(sheet, row, BANK_COLS, data);
      return data;
    }
  }
  data.id = data.id || 'B-' + Date.now();
  sheet.appendRow(_objToRow(BANK_COLS, data));
  return data;
}

/** Delete a bank account row by id. */
function deleteBankAccount(id) {
  return _deleteById(SHEET_BANK, id);
}

// ─────────────────────────────────────────────────────────────
// QUOTATIONS — CRUD
// ─────────────────────────────────────────────────────────────

/** Returns all quotations as an array of objects. Items array is parsed. */
function getQuotations() {
  const rows = _sheetToObjects(SHEET_QUOTATIONS, QUOTATION_COLS);
  return JSON.stringify(rows.map(q => {
    q.items = _parseJson(q.items, []);
    q.subTotal = parseFloat(q.subTotal) || 0;
    q.deposit = parseFloat(q.deposit) || 0;
    q.grandTotal = parseFloat(q.grandTotal) || 0;
    q.wantVat = (q.wantVat === true || q.wantVat === 'TRUE' || q.wantVat === 'true');
    q.confirmDeposit = (q.confirmDeposit === true || q.confirmDeposit === 'TRUE' || q.confirmDeposit === 'true');
    q.confirmSuccess = q.confirmSuccess ? String(q.confirmSuccess) : '';
    q.bankId = q.bankId ? String(q.bankId) : '';
    return q;
  }));
}

/**
 * Save (insert or update) a quotation.
 * @param {Object} data  quotation object (items must be JS array)
 * @returns {Object}     saved record with id
 */
function saveQuotation(data) {
  const sheet = _getSheet(SHEET_QUOTATIONS);
  const serialized = Object.assign({}, data, {
    items: JSON.stringify(data.items || [])
  });
  if (data.id) {
    const row = _findRowById(sheet, data.id);
    if (row) {
      _writeRow(sheet, row, QUOTATION_COLS, serialized);
      return data;
    }
  }
  // Generate QT id: QT-YYYYMMDD-XXX
  serialized.id = serialized.id || _generateQtId(sheet);
  data.id = serialized.id;
  sheet.appendRow(_objToRow(QUOTATION_COLS, serialized));
  return data;
}

/** Delete a quotation row by id. */
function deleteQuotation(id) {
  return _deleteById(SHEET_QUOTATIONS, id);
}

// ─────────────────────────────────────────────────────────────
// DATA LOADER — called from client via google.script.run
// Returns all data needed to boot the app in one round-trip.
// ─────────────────────────────────────────────────────────────
function loadAllData() {
  _ensureSheet(SpreadsheetApp.getActiveSpreadsheet(), SHEET_BANK, BANK_COLS);
  return {
    customers: getCustomers(),
    products: getProducts(),
    quotations: getQuotations(),
    bankAccounts: getBankAccounts()
  };
}

// ─────────────────────────────────────────────────────────────
// PRODUCT IMAGE UPLOAD — ResumableUploadForGoogleDrive support
// ─────────────────────────────────────────────────────────────

/**
 * Returns { token, folderId } for the product images Drive folder.
 * The token is the current OAuth access token; the folder is auto-created
 * under the root of the account running the script.
 */
function getProductImageUploadToken() {
  const token = ScriptApp.getOAuthToken();
  let folderId = PropertiesService.getScriptProperties().getProperty('productImagesFolderId');
  if (!folderId) {
    const folderName = 'ProductImages_QT';
    let folders = DriveApp.getFoldersByName(folderName);
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    folderId = folder.getId();
    PropertiesService.getScriptProperties().setProperty('productImagesFolderId', folderId);
  }
  return { token: token, folderId: folderId };
}

/**
 * Moves all Drive image files (given as thumbnail URLs) into a per-product
 * subfolder inside ProductImages_QT, using BatchRequest to do it in one
 * API round-trip instead of one call per file.
 *
 * @param {string[]} imageUrls  Array of Drive thumbnail URLs stored on the product.
 * @param {string}   productId  The product ID (used as subfolder name).
 */
function moveFilesToProductFolder(imageUrls, productId) {
  if (!imageUrls || imageUrls.length === 0 || !productId) return;

  // Extract file IDs from thumbnail URLs (drive.google.com/thumbnail?id=FILE_ID&sz=...)
  const fileIds = imageUrls
    .filter(function(url) { return url && typeof url === 'string' && url.indexOf('drive.google.com/thumbnail') !== -1; })
    .map(function(url) {
      try {
        var match = url.match(/[?&]id=([^&]+)/);
        return match ? match[1] : null;
      } catch (e) { return null; }
    })
    .filter(Boolean);

  if (fileIds.length === 0) return;

  // Get the parent ProductImages_QT folder
  var parentFolderId = PropertiesService.getScriptProperties().getProperty('productImagesFolderId');
  if (!parentFolderId) {
    var folderName = 'ProductImages_QT';
    var folders = DriveApp.getFoldersByName(folderName);
    var parent = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    parentFolderId = parent.getId();
    PropertiesService.getScriptProperties().setProperty('productImagesFolderId', parentFolderId);
  }

  // Get or create a subfolder named after the product ID
  var parentFolder = DriveApp.getFolderById(parentFolderId);
  var subFolderName = 'product_' + productId;
  var subFolders = parentFolder.getFoldersByName(subFolderName);
  var subFolder = subFolders.hasNext() ? subFolders.next() : parentFolder.createFolder(subFolderName);
  var subFolderId = subFolder.getId();

  // Build one PATCH request per file: move from parent → subfolder
  var requests = fileIds.map(function(fileId) {
    return {
      method: 'PATCH',
      endpoint: 'https://www.googleapis.com/drive/v3/files/' + fileId
        + '?addParents=' + subFolderId
        + '&removeParents=' + parentFolderId
        + '&fields=id,parents',
      requestBody: {}
    };
  });

  // Execute all moves in a single batch request
  BatchRequest.EDo({
    batchPath: BatchRequest.getBatchPath('drive'),
    requests: requests
  });
}

/**
 * Permanently deletes a single file from Google Drive by its file ID.
 * Called when the user removes an image from the product image picker.
 */
function deleteProductImage(fileId) {
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return true;
  } catch (e) {
    Logger.log('deleteProductImage error for id ' + fileId + ': ' + e);
    return false;
  }
}


// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function _getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/** Reads all data rows and converts to array of objects keyed by cols. */
function _sheetToObjects(sheetName, cols, asText = false) {
  const sheet = _getSheet(sheetName);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, cols.length)[asText ? 'getDisplayValues' : 'getValues']();
  return values
    .filter(row => row[0] !== '' && row[0] !== null)
    .map(row => {
      const obj = {};
      cols.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
}

/** Converts an object to a row array in the order of cols. */
function _objToRow(cols, obj) {
  return cols.map(col => (obj[col] !== undefined && obj[col] !== null) ? obj[col] : '');
}

/** Writes values to an existing row by row number (1-based). */
function _writeRow(sheet, rowNum, cols, obj) {
  const values = [_objToRow(cols, obj)];
  sheet.getRange(rowNum, 1, 1, cols.length).setValues(values);
}

/** Finds the row number (1-based) for a given id (col index 0). */
function _findRowById(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return null;
}

/** Deletes the row matching id in the specified sheet. */
function _deleteById(sheetName, id) {
  const sheet = _getSheet(sheetName);
  const row = _findRowById(sheet, id);
  if (row) {
    sheet.deleteRow(row);
    return true;
  }
  return false;
}

/** Safely parse a JSON string; returns fallback on error. */
function _parseJson(str, fallback) {
  if (!str || str === '') return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

/** Generates a sequential Quotation ID like QT-20260311-001 */
function _generateQtId(sheet) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const prefix = 'QT-' + today + '-';
  const last = sheet.getLastRow();
  let max = 0;
  if (last >= 2) {
    const ids = sheet.getRange(2, 1, last - 1, 1).getValues().flat();
    ids.forEach(id => {
      if (String(id).startsWith(prefix)) {
        const n = parseInt(String(id).replace(prefix, '')) || 0;
        if (n > max) max = n;
      }
    });
  }
  return prefix + String(max + 1).padStart(3, '0');
}