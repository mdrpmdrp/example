var SS = SpreadsheetApp.getActiveSpreadsheet();

// Column counts for known price sheets — avoids reading unused columns
var _SHEET_COLS    = { 'ผ่อน': 8, 'มือสอง': 8, 'Freedown': 8, 'ซื้อสด': 4 };
var _INSTALLMENT   = { 'ผ่อน': true, 'มือสอง': true, 'Freedown': true };

// ---------- Serve Web App ----------
function getLogoBase64() {
  try {
    var blob = UrlFetchApp.fetch('https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png').getBlob();
    return 'data:' + (blob.getContentType() || 'image/png') + ';base64,' + Utilities.base64Encode(blob.getBytes());
  } catch (e) {
    return 'https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png';
  }
}

function doGet() {
  var html = HtmlService.createTemplateFromFile('index');
  html.priceData = getPriceData();
  html.logoB64    = getLogoBase64();
  return html.evaluate()
    .setTitle('Mobile Price Checker')
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
  var all  = sheet.getRange(2, 1, last - 1, cols).getValues();
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

function jsonSuccess(data) { return JSON.stringify({ status: 'ok',    data: data }); }
function jsonError(msg)    { return JSON.stringify({ status: 'error', message: msg }); }

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
  var vals = sheet.getRange(range.getRow(), 1, 1, 7).getValues()[0];
  var user = {
    company:   String(vals[0]),
    firstName: String(vals[1]),
    lastName:  String(vals[2]),
    nickname:  String(vals[3]),
    email:     String(vals[4]),
    phone:     String(vals[5]),
    status:    status
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
      sheet.appendRow(['Timestamp', 'Event', 'User', 'Email']);
    }
    sheet.appendRow([new Date(), event, user.nickname + ' (' + user.firstName + ')', user.email]);
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
    logEvent(eventStr, { nickname: p.nickname, firstName: p.firstName || p.nickname, email: p.email || '' });
    return jsonSuccess('logged');
  } catch (e) {
    return jsonError(e.message);
  }
}

// ---------- Auth ----------
function registerUser(payload) {
  var p = JSON.parse(payload);
  try {
    var sheet = SS.getSheetByName('Users');
    if (!sheet) {
      sheet = SS.insertSheet('Users');
      sheet.appendRow(['Company', 'First Name', 'Last Name', 'Nickname', 'Email', 'Phone', 'Status', 'Created At']);
    }

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
      new Date()
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
      createdAt: new Date()
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
    var sheet = SS.getSheetByName('Users');
    if (!sheet) return jsonError('ไม่พบฐานข้อมูลผู้ใช้');

    var emailLower = String(p.email).toLowerCase();
    var phonStr = String(p.phone);
    
    // Read only needed columns (0-6) instead of entire range
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      // Early exit if email doesn't match
      if (String(row[4]).toLowerCase() !== emailLower) continue;
      // Check phone after email match
      if (String(row[5]) !== phonStr) continue;
      
      var status = String(row[6]);
      if (status === 'Pending') {
        return jsonError('บัญชีผู้ใช้อยู่ระหว่างการตรวจสอบ กรุณาติดต่อเจ้าหน้าที่');
      }
      if (status === 'Blocked') {
        return jsonError('บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่');
      }
      
      var user = {
        company: String(row[0]),
        firstName: String(row[1]),
        lastName: String(row[2]),
        nickname: String(row[3]),
        email: String(row[4]),
        phone: String(row[5]),
        status: status
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

function getPriceData() {
  try {
    var result = { 'ผ่อน': {}, 'มือสอง': {}, 'Freedown': {}, 'ซื้อสด': {} };

    // Installment sheets: brand | model | storage | down | 6mo | 8mo | 10mo | 12mo
    ['ผ่อน', 'มือสอง', 'Freedown'].forEach(function (sn) {
      var bucket = result[sn];
      sheetData(sn).forEach(function (r) {
        var b = String(r[0]), m = String(r[1]), s = String(r[2]);
        if (!bucket[b])       bucket[b]    = {};
        if (!bucket[b][m])    bucket[b][m] = {};
        if (!bucket[b][m][s]) bucket[b][m][s] = [];
        bucket[b][m][s].push({ down: Number(r[3]), m6: Number(r[4]), m8: Number(r[5]), m10: Number(r[6]), m12: Number(r[7]) });
      });
    });

    // ซื้อสด: brand | model | storage | price
    // Read H1 (MDM+service fee) and H2 (delivery fee) in one batch call
    var scSheet = SS.getSheetByName('ซื้อสด');
    var scFees = scSheet ? scSheet.getRange(1, 8, 2, 1).getValues() : [[0],[0]];
    result.scMdmFee      = Number(scFees[0][0]) || 0;
    result.scDeliveryFee = Number(scFees[1][0]) || 0;
    var sc = result['ซื้อสด'];
    sheetData('ซื้อสด').forEach(function (r) {
      var b = String(r[0]), m = String(r[1]), s = String(r[2]), price = Number(r[3]);
      if (!price || isNaN(price)) return;
      if (!sc[b])    sc[b]    = {};
      if (!sc[b][m]) sc[b][m] = {};
      sc[b][m][s] = price;
    });

    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e.message);
  }
}
