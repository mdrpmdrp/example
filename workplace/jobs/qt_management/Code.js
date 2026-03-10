/* ============================================================
   Code.js — Google Apps Script (Quotation Management)
   ============================================================
   Deploy as a Web App:
     Execute as: Me
     Who has access: Anyone (or Anyone in your domain)
   ============================================================ */

// ── Sheet Names ──────────────────────────────────────────────
const SHEET_QUOTATIONS = 'Quotations';
const SHEET_CUSTOMERS  = 'Customers';
const SHEET_PRODUCTS   = 'Products';

// ── Column Definitions ───────────────────────────────────────
//   Each array defines the header row for that sheet.

const QUOTATION_COLS = [
  'id', 'date', 'name', 'tel', 'taxId', 'address',
  'status', 'subTotal', 'deposit', 'wantVat', 'grandTotal',
  'items'           // stored as JSON string
];

const CUSTOMER_COLS = [
  'id', 'name', 'tel', 'taxId', 'address'
];

const PRODUCT_COLS = [
  'id', 'code', 'name', 'price', 'unit', 'color',
  'desc', 'spec', 'warranty', 'notes',
  'images'          // stored as JSON string (base64 array)
];

// ── Serve Web App ─────────────────────────────────────────────
function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile('index')
    .setTitle('QT Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─────────────────────────────────────────────────────────────
// INIT — create sheets & headers if they don't exist
// Call once manually from Apps Script editor:  initSheets()
// ─────────────────────────────────────────────────────────────
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  _ensureSheet(ss, SHEET_QUOTATIONS, QUOTATION_COLS);
  _ensureSheet(ss, SHEET_CUSTOMERS,  CUSTOMER_COLS);
  _ensureSheet(ss, SHEET_PRODUCTS,   PRODUCT_COLS);

  // Seed sample customers if sheet is empty
  const custSheet = ss.getSheetByName(SHEET_CUSTOMERS);
  if (custSheet.getLastRow() <= 1) {
    _seedCustomers(custSheet);
  }

  // Seed sample products if sheet is empty
  const prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (prodSheet.getLastRow() <= 1) {
    _seedProducts(prodSheet);
  }

  SpreadsheetApp.getUi().alert('✅ Sheets initialized successfully!');
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
  return _sheetToObjects(SHEET_CUSTOMERS, CUSTOMER_COLS);
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
  return rows.map(p => {
    p.images   = _parseJson(p.images, []);
    p.price    = parseFloat(p.price)    || 0;
    p.warranty = parseFloat(p.warranty) || 0;
    return p;
  });
}

/**
 * Save (insert or update) a product.
 * @param {Object} data  product object (images must be JS array)
 * @returns {Object}     saved record with id
 */
function saveProduct(data) {
  const sheet = _getSheet(SHEET_PRODUCTS);
  // Serialize images array to JSON string
  const serialized = Object.assign({}, data, {
    images: JSON.stringify(data.images || [])
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
// QUOTATIONS — CRUD
// ─────────────────────────────────────────────────────────────

/** Returns all quotations as an array of objects. Items array is parsed. */
function getQuotations() {
  const rows = _sheetToObjects(SHEET_QUOTATIONS, QUOTATION_COLS);
  return rows.map(q => {
    q.items      = _parseJson(q.items, []);
    q.subTotal   = parseFloat(q.subTotal)   || 0;
    q.deposit    = parseFloat(q.deposit)    || 0;
    q.grandTotal = parseFloat(q.grandTotal) || 0;
    q.wantVat    = (q.wantVat === true || q.wantVat === 'TRUE' || q.wantVat === 'true');
    return q;
  });
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
  return {
    customers:   getCustomers(),
    products:    getProducts(),
    quotations:  getQuotations()
  };
}

// ─────────────────────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

function _getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/** Reads all data rows and converts to array of objects keyed by cols. */
function _sheetToObjects(sheetName, cols) {
  const sheet = _getSheet(sheetName);
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const values = sheet.getRange(2, 1, last - 1, cols.length).getValues();
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

// ─────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────

function _seedCustomers(sheet) {
  const rows = [
    ['C-001', 'บริษัท เทคโนโลยี สมาร์ท จำกัด',        '02-111-2222',  '0105560123456', '99/1 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'],
    ['C-002', 'ห้างหุ้นส่วน วิทยา เทรดดิ้ง',           '081-234-5678', '0103550234567', '12 ถ.พระราม 4 แขวงสีลม เขตบางรัก กรุงเทพฯ 10500'],
    ['C-003', 'บริษัท กรีน โซลูชั่น จำกัด',             '02-333-4444',  '0105570345678', '55 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพฯ 10400'],
    ['C-004', 'คุณ สมชาย มีทรัพย์',                     '089-456-7890', '3100600456789', '7/3 ซ.ลาดพร้าว 87 แขวงวังทองหลาง เขตวังทองหลาง กรุงเทพฯ 10310'],
    ['C-005', 'บริษัท พรีเมียม อีเว้นท์ จำกัด',         '02-555-6666',  '0105580567890', '201 ถ.เพชรบุรี แขวงราชเทวี เขตราชเทวี กรุงเทพฯ 10400'],
    ['C-006', 'ร้าน ไอที ช็อป เชียงใหม่',               '053-211-333',  '5500600678901', '88 ถ.นิมมานเหมินท์ ตำบลสุเทพ อำเภอเมือง เชียงใหม่ 50200'],
    ['C-007', 'บริษัท เน็กซ์ เจน โลจิสติกส์ จำกัด',    '038-789-012',  '0205590789012', '333 นิคมอุตสาหกรรมอมตะนคร ชลบุรี 20000'],
    ['C-008', 'คุณ วรรณา ใจดี',                          '091-012-3456', '3760500890123', '14 ม.3 ต.บางปลา อ.บางพลี สมุทรปราการ 10540'],
    ['C-009', 'สถาบันการศึกษา พัฒนาทักษะ',              '02-999-0000',  '0994000901234', '100 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400'],
    ['C-010', 'บริษัท ซันไชน์ มีเดีย กรุ๊ป จำกัด',     '02-777-8888',  '0105600012345', '30 อาคาร GMM Grammy ถ.สุขุมวิท 21 กรุงเทพฯ 10110'],
  ];
  sheet.getRange(2, 1, rows.length, CUSTOMER_COLS.length).setValues(rows);
}

function _seedProducts(sheet) {
  const rows = [
    ['P-001','NB-001','โน้ตบุ๊ก Asus VivoBook 15',     18900,'เครื่อง','เงิน',      'Intel Core i5 Gen 12, RAM 8GB, SSD 512GB', 'CPU: Intel Core i5-1235U\nRAM: 8GB DDR4\nSSD: 512GB NVMe\nจอ: 15.6" FHD IPS', 12,'ประกันศูนย์ไทย','[]'],
    ['P-002','NB-002','โน้ตบุ๊ก MacBook Air M2',        39900,'เครื่อง','เทาอวกาศ', 'Apple M2 Chip, RAM 8GB Unified, SSD 256GB', 'CPU: Apple M2\nRAM: 8GB Unified\nSSD: 256GB\nจอ: 13.6" Liquid Retina', 12,'ประกัน Apple Thailand','[]'],
    ['P-003','MON-001','จอมอนิเตอร์ LG 27" 4K',         9500,'จอ',     'ดำ',        'IPS 4K UHD 60Hz HDR400', 'ขนาด: 27 นิ้ว\nความละเอียด: 3840x2160 (4K)\nพาแนล: IPS\nรีเฟรชเรต: 60Hz', 36,'ประกันพาแนล 3 ปี','[]'],
    ['P-004','KEY-001','คีย์บอร์ด Keychron K2 Wireless', 3200,'ชิ้น',  'เทา',       'Mechanical Wireless TKL, Switch Red', 'ประเภท: Mechanical TKL\nSwitch: Gateron Red\nBluetooth 5.0 / USB-C\nแบตเตอรี่: 4000mAh', 12,'','[]'],
    ['P-005','MOUSE-001','เมาส์ Logitech MX Master 3',  3500,'ชิ้น',   'เทาเข้ม',   'Wireless Ergonomic Mouse 4000 DPI', 'DPI: 200-4000\nBluetooth / USB Nano\nแบตเตอรี่ชาร์จได้ 70 วัน\nน้ำหนัก: 141g', 24,'ของแท้ประกันศูนย์','[]'],
    ['P-006','SRV-INST','บริการติดตั้งระบบเครือข่าย',    5000,'ครั้ง', '-',          'ติดตั้งและตั้งค่า Network ภายในอาคาร', 'ขอบเขตงาน:\n- วางสายแลน\n- ตั้งค่า Router/Switch\n- ทดสอบระบบ', 1,'ราคาต่อจุด Access Point','[]'],
    ['P-007','BAG-001','กระเป๋าโน้ตบุ๊ก Targus 15.6"',   1290,'ใบ',    'ดำ',        'กระเป๋าสะพายหลัง ผ้ากันน้ำ', 'รองรับถึง 15.6 นิ้ว\nวัสดุ: โพลีเอสเตอร์กันน้ำ\nน้ำหนัก: 0.8kg', 6,'','[]'],
    ['P-008','HUB-001','USB-C Hub 7-in-1 Anker',         1690,'ชิ้น',  'เงิน',       'HDMI 4K, USB-A x3, SD Card, PD 100W', 'HDMI 4K@30Hz, USB-A 3.0 x3, SD/MicroSD, PD 100W\nสาย: 30cm', 12,'ประกัน Anker Thailand','[]'],
    ['P-009','SRV-MAINT','บริการซ่อมบำรุงคอมพิวเตอร์',   800,'ครั้ง', '-',          'ตรวจเช็คและซ่อมแซม Hardware/Software', 'บริการ:\n- ตรวจเช็คระบบ\n- ลงโปรแกรม/Windows\n- กำจัดไวรัส', 0,'ราคาเริ่มต้น ไม่รวมอะไหล่','[]'],
    ['P-010','SSD-001','SSD External Samsung T7 1TB',    3290,'ชิ้น',  'น้ำเงินเข้ม','Portable SSD USB 3.2 Gen 2 1050MB/s', 'ความจุ: 1TB\nUSB 3.2 Gen 2\nอ่าน: 1050 MB/s\nเขียน: 1000 MB/s\nน้ำหนัก: 57g', 36,'ประกัน Samsung Thailand','[]'],
  ];
  sheet.getRange(2, 1, rows.length, PRODUCT_COLS.length).setValues(rows);
}
