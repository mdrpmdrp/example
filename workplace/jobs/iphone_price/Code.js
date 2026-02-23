// ============================================================
//  Google Apps Script – Mobile Price Checker
//  Sheet structure:
//    "Users"  : company | firstName | lastName | nickname | email | phone
//    "ผ่อน"   : ยี่ห้อ | รุ่น | ความจุ | ราคาดาวน์ | 6 | 8 | 10 | 12 | NOTE
//    "ซื้อสด" : ยี่ห้อ | รุ่น | ความจุ | ราคา
//  Note: Both price sheets have multi-row headers + section divider rows.
//        sheetData() filters to rows where col[0] is non-empty and col[3] is a
//        valid positive number, so headers and section banners are skipped.
// ============================================================

var SS = SpreadsheetApp.getActiveSpreadsheet();

// ---------- Serve Web App ----------
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Mobile Price Checker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ---------- Helper ----------
function sheetData(sheetName) {
  var sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var all = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  // Skip header rows, column-label rows and section-divider rows:
  // A valid data row must have a non-empty brand (col 0) AND a positive number in col 3
  // This safely handles the title row, sub-header rows and the red "IPHONE" banner row
  // that exist in both "ผ่อน" and "ซื้อสด" sheets.
  if (sheetName === 'ผ่อน' || sheetName === 'ซื้อสด') {
    return all.filter(function(r) {
      var brand = String(r[0]).trim();
      var col3  = Number(r[3]);
      return brand !== '' && !isNaN(col3) && col3 > 0;
    });
  }
  return all;
}

function jsonSuccess(data) {
  return JSON.stringify({ status: 'ok', data: data });
}
function jsonError(msg) {
  return JSON.stringify({ status: 'error', message: msg });
}

// ---------- Auth ----------
function registerUser(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = SS.getSheetByName('Users');
    if (!sheet) sheet = SS.insertSheet('Users');
    // Check duplicate email
    var rows = sheetData('Users');
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i][4]).toLowerCase() === String(p.email).toLowerCase()) {
        return jsonError('อีเมลนี้ถูกใช้งานแล้ว');
      }
    }
    sheet.appendRow([p.company, p.firstName, p.lastName, p.nickname, p.email, p.phone]);
    return jsonSuccess({ company: p.company, nickname: p.nickname });
  } catch (e) {
    return jsonError(e.message);
  }
}

function loginUser(payload) {
  try {
    var p = JSON.parse(payload);
    var rows = sheetData('Users');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (String(row[4]).toLowerCase() === String(p.email).toLowerCase() &&
          String(row[5]) === String(p.phone)) {
        return jsonSuccess({
          company:   String(row[0]),
          firstName: String(row[1]),
          lastName:  String(row[2]),
          nickname:  String(row[3]),
          email:     String(row[4]),
          phone:     String(row[5])
        });
      }
    }
    return jsonError('ไม่พบบัญชีผู้ใช้ กรุณาตรวจสอบอีเมลและเบอร์โทร');
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Shared – Brand / Model / Storage ----------
function getBrands(sheetName) {
  try {
    var rows = sheetData(sheetName);
    var brands = [];
    rows.forEach(function(r) {
      if (r[0] && brands.indexOf(String(r[0])) === -1) brands.push(String(r[0]));
    });
    return jsonSuccess(brands.sort());
  } catch (e) {
    return jsonError(e.message);
  }
}

function getModels(payload) {
  try {
    var p = JSON.parse(payload);
    var rows = sheetData(p.sheet);
    var models = [];
    rows.forEach(function(r) {
      if (String(r[0]) === p.brand && r[1] && models.indexOf(String(r[1])) === -1)
        models.push(String(r[1]));
    });
    return jsonSuccess(models.sort());
  } catch (e) {
    return jsonError(e.message);
  }
}

function getStorages(payload) {
  try {
    var p = JSON.parse(payload);
    var rows = sheetData(p.sheet);
    var storages = [];
    rows.forEach(function(r) {
      if (String(r[0]) === p.brand && String(r[1]) === p.model &&
          r[2] && storages.indexOf(String(r[2])) === -1)
        storages.push(String(r[2]));
    });
    return jsonSuccess(storages);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- VN Phone (ผ่อน) ----------
function getDownPayments(payload) {
  try {
    var p = JSON.parse(payload);
    var rows = sheetData('ผ่อน');
    var downs = [];
    rows.forEach(function(r) {
      if (String(r[0]) === p.brand && String(r[1]) === p.model && String(r[2]) === p.storage) {
        var d = Number(r[3]);
        if (!isNaN(d) && downs.indexOf(d) === -1) downs.push(d);
      }
    });
    downs.sort(function(a, b) { return a - b; });
    return jsonSuccess(downs);
  } catch (e) {
    return jsonError(e.message);
  }
}

function getInstallmentPrice(payload) {
  try {
    var p = JSON.parse(payload);
    var colMap = { '6': 4, '8': 5, '10': 6, '12': 7 };
    var col = colMap[String(p.months)];
    if (col === undefined) return jsonError('จำนวนงวดไม่ถูกต้อง');
    var rows = sheetData('ผ่อน');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[0]) === p.brand && String(r[1]) === p.model &&
          String(r[2]) === p.storage && Number(r[3]) === Number(p.downPayment)) {
        var price = Number(r[col]);
        return jsonSuccess({
          brand: p.brand, model: p.model, storage: p.storage,
          downPayment: Number(p.downPayment),
          months: Number(p.months),
          installment: price,
          total: Number(p.downPayment) + price * Number(p.months)
        });
      }
    }
    return jsonError('ไม่พบข้อมูลราคา');
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- ซื้อสด ----------
function getCashPrice(payload) {
  try {
    var p = JSON.parse(payload);
    var rows = sheetData('ซื้อสด');
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (String(r[0]) === p.brand && String(r[1]) === p.model && String(r[2]) === p.storage) {
        return jsonSuccess({
          brand: p.brand, model: p.model, storage: p.storage,
          price: Number(r[3])
        });
      }
    }
    return jsonError('ไม่พบข้อมูลราคา');
  } catch (e) {
    return jsonError(e.message);
  }
}
