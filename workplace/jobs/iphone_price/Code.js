var SS = SpreadsheetApp.getActiveSpreadsheet();

// ---------- Serve Web App ----------
function getLogoBase64() {
  try {
    var response = UrlFetchApp.fetch('https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png');
    var blob = response.getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mime = blob.getContentType() || 'image/png';
    return 'data:' + mime + ';base64,' + base64;
  } catch (e) {
    return 'https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png';
  }
}

function doGet() {
  let html = HtmlService.createTemplateFromFile('index')
  html.priceData = getPriceData();
  html.logoB64 = getLogoBase64();
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
  var all = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var result;
  if (sheetName === 'ผ่อน' || sheetName === 'ซื้อสด') {
    result = all.filter(function (r) {
      var col3 = Number(r[3]);
      return String(r[0]).trim() !== '' && !isNaN(col3) && col3 > 0;
    });
  } else {
    result = all;
  }
  _sheetCache[sheetName] = result;
  return result;
}

function jsonSuccess(data) {
  return JSON.stringify({ status: 'ok', data: data });
}
function jsonError(msg) {
  return JSON.stringify({ status: 'error', message: msg });
}

function onStatusEdit(e) {
  var sheet = e.source.getActiveSheet();
  if (sheet.getName() === 'Users') {
    var range = e.range;
    var col = range.getColumn();
    var row = range.getRow();
    if (col === 7 && row > 1) { // Status column
      var status = String(range.getValue()).trim();
      if (status === 'Approved' || status === 'Blocked') {
        var user = {
          company: String(sheet.getRange(row, 1).getValue()),
          firstName: String(sheet.getRange(row, 2).getValue()),
          lastName: String(sheet.getRange(row, 3).getValue()),
          nickname: String(sheet.getRange(row, 4).getValue()),
          email: String(sheet.getRange(row, 5).getValue()),
          phone: String(sheet.getRange(row, 6).getValue()),
          status: status
        };
        sendApprovalEmail(user);
        logEvent('Status Change to ' + status, user);
      }
    }
  }
}

// ---------- Log Helper ----------
function logEvent(event, user) {
  try {
    var sheet = SS.getSheetByName('Log Event');
    if (!sheet) {
      sheet = SS.insertSheet('Log Event');
      sheet.appendRow(['Timestamp', 'Event', 'User', 'Email']);
    }
    var timestamp = new Date();
    sheet.appendRow([timestamp, event, user.nickname + ' (' + user.firstName + ')', user.email]);
  } catch (e) {
    console.error('Log error: ' + e.message);
  }
}

// ---------- Search Log ----------
function logSearch(payload) {
  var p = JSON.parse(payload);
  try {
    var eventStr;
    if (p.type === 'ผ่อน') {
      eventStr = 'Search ผ่อน: ' + p.brand + ' ' + p.model + ' ' + p.storage
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

    // Check duplicate email - Read all data including header to match correctly
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) { // Skip header
      if (String(data[i][4]).toLowerCase() === String(p.email).toLowerCase()) {
        return jsonError('อีเมลนี้ถูกใช้งานแล้ว');
      }
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

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Check email (col 4) and phone (col 5)
      if (String(row[4]).toLowerCase() === String(p.email).toLowerCase() &&
        String(row[5]) === String(p.phone)) {
        if (String(row[6]) === 'Pending') {
          return jsonError('บัญชีผู้ใช้อยู่ระหว่างการตรวจสอบ กรุณาติดต่อเจ้าหน้าที่');
        }
        if (String(row[6]) === 'Blocked') {
          return jsonError('บัญชีผู้ใช้ถูกระงับ กรุณาติดต่อเจ้าหน้าที่');
        }
        var user = {
          company: String(row[0]),
          firstName: String(row[1]),
          lastName: String(row[2]),
          nickname: String(row[3]),
          email: String(row[4]),
          phone: String(row[5]),
          status: String(row[6])
        };

        // Log the event
        logEvent('Login', user);

        return jsonSuccess(user);
      }
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
    var result = { ผ่อน: {}, ซื้อสด: {} };

    // ผ่อน: brand | model | storage | downPayment | 6mo | 8mo | 10mo | 12mo
    sheetData('ผ่อน').forEach(function (r) {
      var b = String(r[0]), m = String(r[1]), s = String(r[2]);
      if (!result['ผ่อน'][b]) result['ผ่อน'][b] = {};
      if (!result['ผ่อน'][b][m]) result['ผ่อน'][b][m] = {};
      if (!result['ผ่อน'][b][m][s]) result['ผ่อน'][b][m][s] = [];
      result['ผ่อน'][b][m][s].push({
        down: Number(r[3]),
        m6: Number(r[4]),
        m8: Number(r[5]),
        m10: Number(r[6]),
        m12: Number(r[7])
      });
    });

    // ซื้อสด: brand | model | storage | price
    sheetData('ซื้อสด').forEach(function (r) {
      var b = String(r[0]), m = String(r[1]), s = String(r[2]);
      if (!result['ซื้อสด'][b]) result['ซื้อสด'][b] = {};
      if (!result['ซื้อสด'][b][m]) result['ซื้อสด'][b][m] = {};
      result['ซื้อสด'][b][m][s] = Number(r[3]);
    });

    return jsonSuccess(result);
  } catch (e) {
    return jsonError(e.message);
  }
}
