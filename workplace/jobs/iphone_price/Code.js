// 7/4/2026 18:35

var SS = SpreadsheetApp.getActiveSpreadsheet();

// Column counts for known price sheets — avoids reading unused columns
var _SHEET_COLS = { 'ผ่อน': 8, 'มือสอง': 8, 'Freedown': 8, 'ซื้อสด': 4, 'สดvnphone': 6 };
var _INSTALLMENT = { 'ผ่อน': true, 'มือสอง': true, 'Freedown': true };
var _USERS_HEADERS = ['Company', 'First Name', 'Last Name', 'Nickname', 'Email', 'Phone', 'Status', 'Created At', 'Role', 'Branch'];
var _STOCK_REQUEST_HEADERS = [
  'DocNo', 'Date', 'Priority', 'Branch', 'Requester',
  'Items (JSON)', 'Status', 'AdminNote', 'SubmittedBy', 'CreatedAt', 'UpdatedAt', 'DecisionBy', 'DecisionAt'
];

// ---------- Serve Web App ----------
function getLogoBase64() {
  try {
    var blob = UrlFetchApp.fetch('https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png').getBlob();
    return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return 'https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png';
  }
}

function doGet(e) {
  let page = e.parameter.page || 'index';
  if (page === 'stockreq') page = 'stock_request';
  var html = HtmlService.createTemplateFromFile(page);
  html.priceData = getPriceData();
  html.logoB64 = getLogoBase64();
  var title = (page === 'stock_request') ? 'Stock Request System' : 'Mobile Price Checker';
  return html.evaluate()
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl('https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ---------- Helper ----------
var _sheetCache = {};
function sheetData(sheetName) {
  if (_sheetCache[sheetName]) return _sheetCache[sheetName];
  var sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  var last = sheet.getLastRow();
  if (last < 2) return [];
  // Read only the columns we actually need
  var cols = _SHEET_COLS[sheetName] || sheet.getLastColumn();
  var all = sheet.getRange(2, 1, last - 1, cols).getValues();
  var result;
  if (_INSTALLMENT[sheetName]) {
    // Avoid .some() + array literal on every row; use explicit OR checks
    result = all.filter(function (r) {
      return String(r[0]).trim() !== '' && !isNaN(Number(r[3])) &&
        (r[4] !== '' || r[5] !== '' || r[6] !== '' || r[7] !== '');
    });
  } else if (sheetName === 'ซื้อสด') {
    result = all.filter(function (r) {
      return String(r[0]).trim() !== '' && r[3] !== '' && !isNaN(Number(r[3]));
    });
  } else {
    result = all;
  }
  _sheetCache[sheetName] = result;
  return result;
}

function jsonSuccess(data) { return JSON.stringify({ status: 'ok', data: data }); }
function jsonError(msg) { return JSON.stringify({ status: 'error', message: msg }); }

function getUsersSheet() {
  var sheet = SS.getSheetByName('Users');
  if (!sheet) {
    sheet = SS.insertSheet('Users');
  }
  ensureSheetHeaders(sheet, _USERS_HEADERS);
  return sheet;
}

function ensureSheetHeaders(sheet, headers) {
  for (var i = 0; i < headers.length; i++) {
    var cell = sheet.getRange(1, i + 1);
    if (String(cell.getValue()).trim() !== headers[i]) {
      cell.setValue(headers[i]);
    }
  }
}

function getBranchOptions_() {
  var sheet = SS.getSheetByName('DW สาขา');
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var seen = {};
  var result = [];
  for (var i = 0; i < values.length; i++) {
    var branch = String(values[i][0] || '').trim();
    if (!branch || seen[branch]) continue;
    seen[branch] = true;
    result.push(branch);
  }
  return result;
}

function findUserRowByEmail_(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  var emailLower = String(email || '').toLowerCase();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][4] || '').toLowerCase() === emailLower) {
      return { rowIndex: i + 2, values: data[i] };
    }
  }
  return null;
}

function getUserBranchByEmail_(email) {
  if (!email) return '';
  var found = findUserRowByEmail_(getUsersSheet(), email);
  return found ? String(found.values[9] || '').trim() : '';
}

function normalizeUserForLog_(user) {
  user = user || {};
  var branch = String(user.branch || '').trim();
  if (!branch && user.email) {
    branch = getUserBranchByEmail_(user.email);
  }
  return {
    nickname: String(user.nickname || '').trim(),
    firstName: String(user.firstName || '').trim(),
    email: String(user.email || '').trim(),
    branch: branch
  };
}

function buildDisplayName_(user) {
  user = user || {};
  var nickname = String(user.nickname || '').trim();
  var firstName = String(user.firstName || '').trim();
  var lastName = String(user.lastName || '').trim();
  var fullName = (firstName + ' ' + lastName).trim();
  if (nickname && fullName) return nickname + ' (' + fullName + ')';
  if (nickname) return nickname;
  if (fullName) return fullName;
  return '';
}

// ---------- Trigger ----------
function onStatusEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'Users') return;
  var range = e.range;
  // Early exits before any getValue() call
  if (range.getColumn() !== 7 || range.getRow() <= 1) return;
  var status = String(range.getValue()).trim();
  if (status !== 'Approved' && status !== 'Blocked') return;
  // One batch read instead of 6 individual getValue() round-trips
  var vals = sheet.getRange(range.getRow(), 1, 1, 10).getValues()[0];
  var user = {
    company: String(vals[0]),
    firstName: String(vals[1]),
    lastName: String(vals[2]),
    nickname: String(vals[3]),
    email: String(vals[4]),
    phone: String(vals[5]),
    status: status,
    branch: String(vals[9] || '')
  };
  sendApprovalEmail(user);
  logEvent('Status Change to ' + status, user);
}

// ---------- Log Helper ----------
function logEvent(event, user) {
  try {
    var sheet = SS.getSheetByName('Log Event');
    if (!sheet) {
      sheet = SS.insertSheet('Log Event');
    }
    ensureSheetHeaders(sheet, ['Timestamp', 'Event', 'User', 'Email', 'Branch']);
    var actor = normalizeUserForLog_(user);
    var displayName = actor.nickname;
    if (actor.firstName) {
      displayName = actor.nickname ? actor.nickname + ' (' + actor.firstName + ')' : actor.firstName;
    }
    sheet.appendRow([new Date(), event, displayName, actor.email, actor.branch]);
  } catch (e) {
    console.error('Log error: ' + e.message);
  }
}

// ---------- Search Log ----------
function logSearch(payload) {
  var p = JSON.parse(payload);
  try {
    var eventStr;
    if (p.type === 'ผ่อน' || p.type === 'ผ่อนมือสอง' || p.type === 'Freedown') {
      eventStr = 'Search ' + p.type + ': ' + p.brand + ' ' + p.model + ' ' + p.storage
        + ' | ดาวน์ ' + p.down + ' | ' + p.months + ' งวด'
        + ' | ค่างวด ' + p.installment + ' | รวม ' + p.total;
    } else if (p.type && p.type.indexOf('ดาวน์โหลด') === 0) {
      eventStr = p.type + ': ' + p.brand + ' ' + p.model + ' ' + p.storage;
    } else {
      eventStr = 'Search ซื้อสด: ' + p.brand + ' ' + p.model + ' ' + p.storage
        + ' | ' + p.price + ' บาท';
    }
    logEvent(eventStr, {
      nickname: p.nickname,
      firstName: p.firstName || p.nickname,
      email: p.email || '',
      branch: p.branch || ''
    });
    return jsonSuccess('logged');
  } catch (e) {
    return jsonError(e.message);
  }
}


// ---------- Interest Calc Log ----------
function logVnCalInterest(payload) {
  var p = JSON.parse(payload);
  try {
    var eventStr = 'Calc Interest: ราคา ' + p.cashPrice
      + ' | ดาวน์ ' + p.down
      + ' | งวด ' + p.installment + 'x' + p.periods
      + ' | rate ' + (Number(p.interestRate) || 0).toFixed(2) + '%';
    logEvent(eventStr, {
      nickname: p.nickname || '',
      firstName: p.firstName || p.nickname || '',
      email: p.email || '',
      branch: p.branch || ''
    });
    return jsonSuccess('logged');
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Auth ----------
function registerUser(payload) {
  var p = JSON.parse(payload);
  try {
    var sheet = getUsersSheet();

    var data = sheet.getDataRange().getValues();
    var emailLower = String(p.email).toLowerCase();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][4]).toLowerCase() === emailLower) return jsonError('อีเมลนี้ถูกใช้งานแล้ว');
    }

    sheet.appendRow([
      p.company,
      p.firstName,
      p.lastName,
      p.nickname,
      p.email,
      "'" + p.phone,
      'Pending',
      new Date(),
      'no role',
      ''
    ]);

    // Log the event
    logEvent('Register', p);

    return jsonSuccess({
      company: p.company,
      firstName: p.firstName,
      lastName: p.lastName,
      nickname: p.nickname,
      email: p.email,
      phone: p.phone,
      status: 'Pending',
      createdAt: new Date(),
      role: 'no role',
      branch: ''
    });
  } catch (e) {
    return jsonError(e.message);
  }
}

function sendApprovalEmail(payload) {
  try {
    if (payload.status === 'Approved') {
      var subject = '✅ บัญชีผู้ใช้ของคุณได้รับการอนุมัติแล้ว';
      var htmlBody =
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px;">' +
        '<div style="background:linear-gradient(135deg,#0d1b2a 0%,#1a3a5c 60%,#1565c0 100%);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">' +
        '<h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:1px;">Mobile Price Checker</h1>' +
        '<p style="color:#90caf9;margin:8px 0 0;font-size:14px;">Account Notification</p>' +
        '</div>' +
        '<div style="background:#ffffff;padding:36px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.10);">' +
        '<div style="text-align:center;margin-bottom:24px;">' +
        '<span style="display:inline-block;background:#e3f2fd;border-radius:50%;padding:16px;">' +
        '<span style="font-size:40px;">✅</span>' +
        '</span>' +
        '</div>' +
        '<h2 style="color:#0d1b2a;font-size:22px;margin:0 0 8px;">สวัสดี, ' + payload.nickname + '!</h2>' +
        '<p style="color:#37474f;font-size:15px;line-height:1.7;margin:0 0 20px;">' +
        'บัญชีผู้ใช้ของคุณ <strong style="color:#1565c0;">ได้รับการอนุมัติแล้ว</strong> 🎉<br>' +
        'คุณสามารถเข้าสู่ระบบและใช้งานได้ทันที' +
        '</p>' +
        '<div style="background:#e3f2fd;border-left:4px solid #1565c0;border-radius:6px;padding:14px 18px;margin-bottom:28px;">' +
        '<p style="margin:0;color:#0d47a1;font-size:14px;">📧 ' + payload.firstName + " " + payload.lastName + '<br>🏢 ' + payload.company + '</p>' +
        '</div>' +
        '<div style="text-align:center;">' +
        '<a href="' + ScriptApp.getService().getUrl() + '" style="display:inline-block;background:linear-gradient(90deg,#1565c0,#0d47a1);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:bold;letter-spacing:0.5px;">เข้าสู่ระบบ</a>' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0 16px;">' +
        '<p style="color:#90a4ae;font-size:12px;text-align:center;margin:0;">ขอบคุณที่ลงทะเบียนกับเรา · Mobile Price Checker</p>' +
        '</div>' +
        '</div>';
      MailApp.sendEmail({ to: payload.email, subject: subject, htmlBody: htmlBody, name: payload.company.toUpperCase() + ' · Mobile Price Checker' });

    } else if (payload.status === 'Blocked') {
      var subject = '🚫 บัญชีผู้ใช้ของคุณถูกระงับ';
      var htmlBody =
        '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px;">' +
        '<div style="background:linear-gradient(135deg,#0d1b2a 0%,#1a1a2e 60%,#263238 100%);padding:40px 30px;border-radius:12px 12px 0 0;text-align:center;">' +
        '<h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:1px;">Mobile Price Checker</h1>' +
        '<p style="color:#90a4ae;margin:8px 0 0;font-size:14px;">Account Notification</p>' +
        '</div>' +
        '<div style="background:#ffffff;padding:36px 30px;border-radius:0 0 12px 12px;box-shadow:0 4px 16px rgba(0,0,0,0.10);">' +
        '<div style="text-align:center;margin-bottom:24px;">' +
        '<span style="display:inline-block;background:#fce4ec;border-radius:50%;padding:16px;">' +
        '<span style="font-size:40px;">🚫</span>' +
        '</span>' +
        '</div>' +
        '<h2 style="color:#0d1b2a;font-size:22px;margin:0 0 8px;">สวัสดี, ' + payload.nickname + '!</h2>' +
        '<p style="color:#37474f;font-size:15px;line-height:1.7;margin:0 0 20px;">' +
        'บัญชีผู้ใช้ของคุณ <strong style="color:#b71c1c;">ถูกระงับการใช้งาน</strong><br>' +
        'กรุณาติดต่อเจ้าหน้าที่เพื่อสอบถามข้อมูลเพิ่มเติม' +
        '</p>' +
        '<div style="background:#fce4ec;border-left:4px solid #b71c1c;border-radius:6px;padding:14px 18px;margin-bottom:28px;">' +
        '<p style="margin:0;color:#b71c1c;font-size:14px;">📧 ' + payload.firstName + " " + payload.lastName + '<br>🏢 ' + payload.company + '</p>' +
        '</div>' +
        '<hr style="border:none;border-top:1px solid #e0e0e0;margin:28px 0 16px;">' +
        '<p style="color:#90a4ae;font-size:12px;text-align:center;margin:0;">ขอบคุณที่ลงทะเบียนกับเรา · Mobile Price Checker</p>' +
        '</div>' +
        '</div>';
      MailApp.sendEmail({ to: payload.email, subject: subject, htmlBody: htmlBody, name: payload.company.toUpperCase() + ' · Mobile Price Checker' });
    }
  } catch (e) {
    console.error('Email error: ' + e.message);
  }
}

function loginUser(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = getUsersSheet();
    if (!sheet) return jsonError('ไม่พบฐานข้อมูลผู้ใช้');
    var requestedPage = String(p.page || '').trim();

    var emailLower = String(p.email).toLowerCase();
    var phonStr = String(p.phone);

    // Read only needed columns (0-6) instead of entire range
    if (sheet.getLastRow() < 2) return jsonError('ไม่พบบัญชีผู้ใช้ กรุณาตรวจสอบอีเมลและเบอร์โทร');
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      // Early exit if email doesn't match
      if (String(row[4]).toLowerCase() !== emailLower) continue;
      // Check phone after email match
      if (String(row[5]) !== phonStr) continue;

      var status = String(row[6]);
      var role = row[8] || 'User';
      var branch = String(row[9] || '').trim();
      if (status === 'Pending') {
        return jsonError('บัญชีผู้ใช้อยู่ระหว่างการตรวจสอบ กรุณาติดต่อเจ้าหน้าที่');
      }
      if (status === 'Blocked') {
        return jsonError('บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่');
      }

      if(role !== 'User' && role !== 'Admin') {
        return jsonError('บัญชีนี้ ไม่มีสิทธิ์เข้าถึงระบบนี้ กรุณาติดต่อเจ้าหน้าที่');
      }

      if (requestedPage === 'stock_request' && String(row[0]) !== 'VN Phone') {
        return jsonError('เฉพาะผู้ใช้จากบริษัท VN Phone เท่านั้นที่เข้าใช้ระบบขอเบิกสต๊อกได้');
      }

      var user = {
        company: String(row[0]),
        firstName: String(row[1]),
        lastName: String(row[2]),
        nickname: String(row[3]),
        email: String(row[4]),
        phone: String(row[5]),
        status: status,
        role: role,
        branch: branch
      };
      logEvent('Login', user);
      return jsonSuccess(user);
    }
    return jsonError('ไม่พบบัญชีผู้ใช้ กรุณาตรวจสอบอีเมลและเบอร์โทร');
  } catch (e) {
    return jsonError(e.message);
  }
}

function logLogout(payload) {
  try {
    var user = JSON.parse(payload);
    logEvent('Logout', user);
    return jsonSuccess('Logged out');
  } catch (e) {
    return jsonError(e.message);
  }
}

function getBranchOptions() {
  try {
    return jsonSuccess(getBranchOptions_());
  } catch (e) {
    return jsonError(e.message);
  }
}

function updateUserBranch(payload) {
  try {
    var p = JSON.parse(payload);
    var branch = String(p.branch || '').trim();
    if (!branch) return jsonError('กรุณาเลือกสาขา');

    var allowedBranches = getBranchOptions_();
    if (allowedBranches.indexOf(branch) === -1) {
      return jsonError('ไม่พบสาขาที่เลือกในข้อมูลอ้างอิง');
    }

    var sheet = getUsersSheet();
    var found = findUserRowByEmail_(sheet, p.email);
    if (!found) return jsonError('ไม่พบบัญชีผู้ใช้');

    sheet.getRange(found.rowIndex, 10).setValue(branch);

    var user = {
      company: String(found.values[0]),
      firstName: String(found.values[1]),
      lastName: String(found.values[2]),
      nickname: String(found.values[3]),
      email: String(found.values[4]),
      phone: String(found.values[5]),
      status: String(found.values[6]),
      role: String(found.values[8] || 'User'),
      branch: branch
    };

    logEvent('Update Branch', user);
    return jsonSuccess(user);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ── Stock Request sheet helper ────────────────────────────────────────────
function getStockRequestSheet() {
  var sheet = SS.getSheetByName('StockRequests');
  if (!sheet) {
    sheet = SS.insertSheet('StockRequests');
    sheet.setFrozenRows(1);
  }
  ensureSheetHeaders(sheet, _STOCK_REQUEST_HEADERS);
  return sheet;
}

function generateDocNoForSheet_(sheet, referenceDate, usedDocNos) {
  var docNos = usedDocNos || getExistingDocNoMap_(sheet);
  var prefix = 'SR' + moment_format(referenceDate);
  var maxSeq = 0;

  for (var docNo in docNos) {
    if (!docNos.hasOwnProperty(docNo) || docNo.indexOf(prefix) !== 0) continue;
    var seq = parseInt(docNo.substring(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }

  var candidate;
  do {
    maxSeq++;
    candidate = prefix + String(maxSeq).padStart(4, '0');
  } while (docNos[candidate]);

  return candidate;
}

function getExistingDocNoMap_(sheet) {
  var map = {};
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var docNo = String(values[i][0] || '').trim();
    if (docNo) map[docNo] = true;
  }
  return map;
}

function moment_format(referenceDate) {
  // Returns YYYYMM string without moment.js (GAS runtime)
  var d = referenceDate instanceof Date && !isNaN(referenceDate.getTime()) ? referenceDate : new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  return y + '' + m;
}

// ---------- Save/Create Stock Request ----------
function saveStockRequest(payload) {
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000);
    var p = JSON.parse(payload);
    var sheet = getStockRequestSheet();
    var docNo;

    if (p.docNo) {
      // Update existing
      docNo = p.docNo;
      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === docNo) {
          sheet.getRange(i + 1, 2, 1, 5).setValues([[
            p.date, p.priority, p.branch, p.requester,
            JSON.stringify(p.items)
          ]]);
          sheet.getRange(i + 1, 12, 1, 2).setValues([['', '']]);
          sheet.getRange(i + 1, 11).setValue(new Date());
          found = true;
          break;
        }
      }
      if (!found) return jsonError('ไม่พบเอกสารเลขที่ ' + docNo);
    } else {
      // Create new
      docNo = generateDocNoForSheet_(sheet, new Date());
      sheet.appendRow([
        docNo,
        p.date,
        p.priority,
        p.branch,
        p.requester,
        JSON.stringify(p.items),
        'Pending',
        '',
        p.submittedBy,
        new Date(),
        new Date(),
        '',
        ''
      ]);
    }

    logEvent('StockRequest Submit: ' + docNo + ' | ' + p.branch + ' | ' + (p.items || []).length + ' items',
      {
        nickname: p.nickname || '',
        firstName: p.firstName || p.nickname || '',
        email: p.submittedBy || '',
        branch: p.branch || ''
      });
    return jsonSuccess({ docNo: docNo });
  } catch (e) {
    return jsonError(e.message);
  } finally {
    try { lock.releaseLock(); } catch (lockError) {}
  }
}

// ---------- Get My Stock Requests ----------
function getMyStockRequests(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = getStockRequestSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonSuccess([]);
    var data = sheet.getRange(2, 1, lastRow - 1, _STOCK_REQUEST_HEADERS.length).getValues();
    var email = String(p.email || '').toLowerCase();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][8]).toLowerCase() === email) {
        result.push(rowToRequest(data[i]));
      }
    }
    result.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Get All Stock Requests (Admin) ----------
function getAllStockRequests(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = getStockRequestSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonSuccess([]);
    var data = sheet.getRange(2, 1, lastRow - 1, _STOCK_REQUEST_HEADERS.length).getValues();
    var filterStatus = (p.filterStatus || '').trim();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var req = rowToRequest(data[i]);
      if (!filterStatus || req.status === filterStatus) result.push(req);
    }
    result.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Get Single Request by DocNo ----------
function getStockRequestByDocNo(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = getStockRequestSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonError('ไม่พบเอกสาร');
    var data = sheet.getRange(2, 1, lastRow - 1, _STOCK_REQUEST_HEADERS.length).getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === String(p.docNo)) {
        return jsonSuccess(rowToRequest(data[i]));
      }
    }
    return jsonError('ไม่พบเอกสารเลขที่ ' + p.docNo);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Admin: Update Approval ----------
function updateStockRequestApproval(payload) {
  try {
    var p = JSON.parse(payload);
    var sheet = getStockRequestSheet();
    var data = sheet.getDataRange().getValues();
    var decisionBy = p.status === 'Pending' ? '' : buildDisplayName_({
      nickname: p.adminNickname || '',
      firstName: p.adminFirstName || '',
      lastName: p.adminLastName || ''
    });
    var decisionAt = p.status === 'Pending' ? '' : new Date();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(p.docNo)) {
        sheet.getRange(i + 1, 6).setValue(JSON.stringify(p.items));
        sheet.getRange(i + 1, 7).setValue(p.status);
        sheet.getRange(i + 1, 8).setValue(p.adminNote || '');
        sheet.getRange(i + 1, 12).setValue(decisionBy);
        sheet.getRange(i + 1, 13).setValue(decisionAt);
        sheet.getRange(i + 1, 11).setValue(new Date());
        logEvent('StockRequest Approval: ' + p.docNo + ' -> ' + p.status,
          {
            nickname: p.adminNickname || '',
            firstName: p.adminFirstName || '',
            email: p.adminEmail || '',
            branch: p.adminBranch || ''
          });
        return jsonSuccess({ docNo: p.docNo, status: p.status });
      }
    }
    return jsonError('ไม่พบเอกสารเลขที่ ' + p.docNo);
  } catch (e) {
    return jsonError(e.message);
  }
}

// ── Row → Object helper ───────────────────────────────────────────────────
function rowToRequest(row) {
  var items = [];
  try { items = JSON.parse(String(row[5]) || '[]'); } catch(e) {}
  var decisionAt = row[12];
  return {
    docNo: String(row[0]),
    date: row[1] instanceof Date ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(row[1]),
    priority: String(row[2]),
    branch: String(row[3]),
    requester: String(row[4]),
    items: items,
    status: String(row[6]),
    adminNote: String(row[7]),
    submittedBy: String(row[8]),
    createdAt: row[9] instanceof Date ? row[9].toISOString() : String(row[9]),
    updatedAt: row[10] instanceof Date ? row[10].toISOString() : String(row[10]),
    decisionBy: String(row[11] || ''),
    decisionAt: decisionAt instanceof Date ? decisionAt.toISOString() : String(decisionAt || '')
  };
}

function getPriceData() {
  try {
    var result = { 'ผ่อน': {}, 'มือสอง': {}, 'Freedown': {}, 'ซื้อสด': {}, 'สดvnphone': {}, vn_stock: {} };

    // Installment sheets: brand | model | storage | down | 6mo | 8mo | 10mo | 12mo
    ['ผ่อน', 'มือสอง', 'Freedown'].forEach(function (sn) {
      var bucket = result[sn];
      sheetData(sn).forEach(function (r) {
        var b = String(r[0]), m = String(r[1]), s = String(r[2]);
        if (!bucket[b]) bucket[b] = {};
        if (!bucket[b][m]) bucket[b][m] = {};
        if (!bucket[b][m][s]) bucket[b][m][s] = [];
        bucket[b][m][s].push({ down: Number(r[3]), m6: Number(r[4]), m8: Number(r[5]), m10: Number(r[6]), m12: Number(r[7]) });
      });
    });

    // ซื้อสด: brand | model | storage | price
    // Read H1 (MDM+service fee) and H2 (delivery fee) in one batch call
    var scSheet = SS.getSheetByName('ซื้อสด');
    var scFees = scSheet ? scSheet.getRange(1, 8, 2, 1).getValues() : [[0], [0]];
    result.scMdmFee = Number(scFees[0][0]) || 0;
    result.scDeliveryFee = Number(scFees[1][0]) || 0;
    var sc = result['ซื้อสด'];
    sheetData('ซื้อสด').forEach(function (r) {
      var b = String(r[0]), m = String(r[1]), s = String(r[2]), price = Number(r[3]);
      if (!price || isNaN(price)) return;
      if (!sc[b]) sc[b] = {};
      if (!sc[b][m]) sc[b][m] = {};
      sc[b][m][s] = price;
    });

    var vn = result['สดvnphone'], vn_stock = result['vn_stock'];
    sheetData('สดvnphone').forEach(function (r) {
      var b = String(r[0]), m = String(r[1]), s = String(r[2]), price = Number(r[3]);
      var stock = Number(r[5]);
      if (isNaN(stock) && r.length > 4) stock = Number(r[4]);
      if (isNaN(stock)) stock = 0;
      if (!price || isNaN(price)) return;
      if (!vn[b]) vn[b] = {};
      if(!vn_stock[b]) vn_stock[b] = {};
      if (!vn[b][m]) vn[b][m] = {};
      if (!vn_stock[b][m]) vn_stock[b][m] = {};
      vn[b][m][s] = price;
      vn_stock[b][m][s] = stock;
    });

    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e.message);
  }
}
