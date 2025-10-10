const LINE_ACCESS_TOKEN = '7Zq0bQKGGJVUnuzLQyjf/235++1jYMhjthNroXkPcqSBeb6TzbgKYHpW5WkJrckE5dw2pGiMKKNIaax9rU9P0oMlHtpReUzs3WSO9LANtbMHoSHiqkt5czf044y3zTJon/UoxyPI5BUBot8VmenDIwdB04t89/1O/w1cDnyilFU='

// Constants
const SHEET_NAME = 'ลูกค้าได้สิทธิ์เข้างาน';
const SHEET_SATURDAY = 'วันเสาร์ที่ 14 ธันวาคม 2567';
const SHEET_SUNDAY = 'วันอาทิตย์ที่ 15 ธันวาคม 2567';

// Helper functions
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetWithCache(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(sheetName);
}

function getHeaderIndices(header) {
  const indices = {};
  header.forEach((col, i) => {
    if (col) indices[col] = i;
  });
  return indices;
}

function rowToObject(row, header) {
  const obj = {};
  header.forEach((col, i) => {
    obj[col] = row[i];
  });
  return obj;
}

function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  let opt = e.parameter.opt;
  try {
    switch (opt) {
      case 'getAuth_users':
        return getAuth_users();
      case 'authen':
        return userAuthen(e);
      case 'checkMemberId':
        return checkMemberId(e)
      case 'searchCustomer':
        return searchCustomer(e);
      case 'memberRegist':
        return memberRegist(e);
      case 'guestRegist':
        return guestRegist(e);
      case 'getdownload_token':
        return getFolderAndToken();
      case 'checkin':
        return checkin(e);
      case 'addbill':
        return addBill(e);
      case 'getCustomers_in':
        return getCustomers_in();
      case 'getBills':
        return getBills(e);
      case 'updateBill':
        return updateBill(e);
      case 'setRichMenu':
        return setRichMenu(e);
      case 'delRichMenu':
        return delRichMenu(e);
      case 'sendFlex':
        return sendFlex(e);
      default:
        return ContentService.createTextOutput('No option').setMimeType(ContentService.MimeType.JSON);
    }
  } catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    throw e;
  }
}

function onOpen() {
  let ui = SpreadsheetApp.getUi();
  ui.createMenu('Line Bot')
    .addItem('ลงทะเบียนใหม่', 'guest_reRegist')

    .addToUi();
}

function getAuth_users() {
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0].filter(r => r != '');
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['customer-id'];
  
  const obj = {};
  for (let i = 2; i < allValues.length; i++) {
    const row = allValues[i];
    obj[row[customerIdIndex]] = rowToObject(row, header);
  }
  
  return createJsonResponse(obj);
}

function checkMemberId(e) {
  const id = e.parameter.id.toString().toUpperCase();
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['customer-id'];
  
  // Search in memory instead of using TextFinder
  for (let i = 1; i < allValues.length; i++) {
    if (allValues[i][customerIdIndex] === id) {
      const obj = rowToObject(allValues[i], header);
      obj.status = 'found';
      return createJsonResponse(obj);
    }
  }
  
  return createJsonResponse({ status: 'not found' });
}

function searchCustomer(e) {
  const searchValue = e.parameter.searchValue.toString().trim();
  let uid = e.parameter.uid;
  const searchValueUpper = searchValue.toUpperCase();
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['รหัสลูกค้า'];
  const phoneIndex = headerIndices['เบอร์โทร'];
  const uidIndex = headerIndices['uid'];
  if(allValues.map(v => v[uidIndex]).indexOf(uid) > 0) {
    return createJsonResponse({ status: 'found dup' });
  }

  // Search by customer ID or phone number
  for (let i = 1; i < allValues.length; i++) {
    const customerId = allValues[i][customerIdIndex];
    
    // Check customer ID first (faster)
    if (customerId === searchValueUpper) {
      const obj = rowToObject(allValues[i], header);
      obj.status = 'found';
      obj.member_id = customerId;
      return createJsonResponse(obj);
    }
    
    // Check phone number (more expensive operation)
    const phone = allValues[i][phoneIndex];
    if (phone) {
      // Remove dashes and split by comma
      const phoneString = phone.toString().replace(/-/g, '');
      const phones = phoneString.split(',');
      
      // Check each phone number
      for (let j = 0; j < phones.length; j++) {
        const normalizedPhone = phones[j].trim().padStart(10, '0');
        if (normalizedPhone === searchValue) {
          const obj = rowToObject(allValues[i], header);
          obj.status = 'found';
          obj.member_id = customerId;
          return createJsonResponse(obj);
        }
      }
    }
  }
  
  return createJsonResponse({ status: 'not found' });
}

function checkAuth(id) {
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['customer-id'];
  const uidIndex = headerIndices['UID'];
  
  for (let i = 1; i < allValues.length; i++) {
    if (allValues[i][customerIdIndex] === id) {
      return allValues[i][uidIndex] === '' ? 'not regist' : 'authen';
    }
  }
  
  return false;
}

function userAuthen(e) {
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['customer-id'];
  const uidIndex = headerIndices['uid'];
  
  const customer_id = e.parameter.customer_id_auth ? e.parameter.customer_id_auth.toUpperCase() : null;
  
  if (customer_id) {
    // Search by customer ID
    for (let i = 1; i < allValues.length; i++) {
      if (allValues[i][customerIdIndex] === customer_id) {
        const obj = rowToObject(allValues[i], header);
        
        if (allValues[i][uidIndex] !== '') {
          return createJsonResponse({ status: 'validated', data: obj });
        }
        
        obj.uid = e.parameter.uid;
        return createJsonResponse({ status: 'success', data: obj });
      }
    }
    return createJsonResponse({ status: 'not found' });
  } else {
    // Search by UID
    const searchUid = e.parameter.uid;
    for (let i = 1; i < allValues.length; i++) {
      if (allValues[i][uidIndex] === searchUid) {
        const obj = rowToObject(allValues[i], header);
        return createJsonResponse({ status: 'validated', data: obj });
      }
    }
    return createJsonResponse({ status: 'not validated' });
  }
}

function memberRegist(e) {
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const data = allValues.slice(2);
  
  const memberId = e.parameter['member_id'].toUpperCase();
  const paramUid = e.parameter['uid'];
  const customerIdIndex = headerIndices['customer-id'];
  const uidIndex = headerIndices['uid'];
  
  // Find member by ID
  const memberIndex = data.findIndex(v => v[customerIdIndex] === memberId);
  if (memberIndex < 0) {
    return createJsonResponse({ status: 'not validated' });
  }
  
  // Check if member already has UID
  if (data[memberIndex][uidIndex] !== '') {
    return createJsonResponse({ status: 'member id already validated' });
  }
  
  // Check if UID already exists
  if (data.some(v => v[uidIndex] === paramUid)) {
    return createJsonResponse({ status: 'userid already validated' });
  }
  
  // Update the row
  const row = memberIndex + 3; // +2 for header and slice offset, +1 for 1-based index
  const d = [...data[memberIndex]]; // Create copy
  d[uidIndex] = paramUid;
  d[headerIndices['name']] = e.parameter['name'];
  d[headerIndices['province']] = e.parameter['province'];
  d[headerIndices['visit-date']] = e.parameter['date'];
  d[headerIndices['phone']] = e.parameter['phone'];
  d[headerIndices['follower']] = e.parameter['follower'];
  d[headerIndices['check-in']] = `=IF( COUNTIF({'${SHEET_SATURDAY}'!C:C;'${SHEET_SUNDAY}'!C:C},B${row}) > 0,"YES","NO")`;
  
  sh.getRange(row, 1, 1, d.length).setValues([d]);
  
  // // Send LINE message with registration card
  // sendMessage('member', {
  //   member_id: d[headerIndices['customer-id'] || 0],
  //   name: d[headerIndices['name'] || 1],
  //   province: d[headerIndices['province'] || 2],
  //   phone: d[headerIndices['phone'] || 3],
  //   date: d[headerIndices['visit-date'] || 4],
  //   follower: d[headerIndices['follower'] || 5] || '',
  //   uid: d[uidIndex]
  // });
  
  return createJsonResponse({ status: 'success' });
}
// https://liff.line.me/1656187634-ZrAvz5Q9 staff
// https://liff.line.me/1656187634-ZVB4KEdw login

function guestRegist(e) {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(10000)) {
      return createJsonResponse({ status: 'system busy' });
    }
    
    const sh = getSheetWithCache(SHEET_NAME);
    const allValues = sh.getDataRange().getValues();
    const header = allValues[0];
    const headerIndices = getHeaderIndices(header);
    const data = allValues.slice(2);
    const uidIndex = headerIndices['uid'];
    const paramUid = e.parameter['uid'];
    
    // Check if UID already registered
    if (data.some(v => v[uidIndex] === paramUid)) {
      return createJsonResponse({ status: 'already register' });
    }
    
    const row = SuperScript.getRealLastRow('A', sh);
    const guest_id = '#G' + ('0000' + getGuestId()).slice(-4);
    const new_row = [
      guest_id,
      e.parameter['name'],
      e.parameter['province'],
      e.parameter['phone'],
      e.parameter['date'],
      e.parameter['follower'] || '',
      e.parameter['occupation'],
      e.parameter['interest'],
      paramUid,
      `=IF( COUNTIF({'${SHEET_SATURDAY}'!B:B;'${SHEET_SUNDAY}'!B:B},A${row + 1}) > 0,"YES","NO")`
    ];
    
    sh.getRange(row + 1, 1, 1, 10).setValues([new_row]);
    
    // // Send LINE message with registration card
    // sendMessage('guest', {
    //   guest_id: guest_id,
    //   name: e.parameter['name'],
    //   province: e.parameter['province'],
    //   phone: e.parameter['phone'],
    //   date: e.parameter['date'],
    //   follower: e.parameter['follower'] || '',
    //   occupation: e.parameter['occupation'],
    //   interest: e.parameter['interest'],
    //   uid: paramUid
    // });
    
    return createJsonResponse({ status: 'success', guest_id });
  } finally {
    lock.releaseLock();
  }
}

function guest_reRegist(e) {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(10000)) {
      SpreadsheetApp.getUi().alert('System busy, please try again');
      return;
    }
    
    const sh = getSheetWithCache(SHEET_NAME);
    const active_row = sh.getActiveRange().getRow();
    const data = sh.getRange(active_row, 1, 1, sh.getLastColumn()).getValues()[0];
    const guest_id = '#G' + ('0000' + getGuestId()).slice(-4);
    
    data[0] = guest_id;
    data[9] = `=IF( COUNTIF({'${SHEET_SATURDAY}'!B:B;'${SHEET_SUNDAY}'!B:B},A${active_row}) > 0,"YES","NO")`;
    
    const lastRow = SuperScript.getRealLastRow('A', sh);
    sh.getRange(lastRow + 1, 1, 1, data.length).setValues([data]);
    sh.deleteRow(active_row);
    
    const guestData = {
      guest_id: data[0],
      name: data[1],
      province: data[2],
      phone: data[3],
      date: data[4],
      follower: data[5],
      occupation: data[6],
      interest: data[7],
      uid: data[8]
    };
    
    sendMessage('guest', guestData);
  } finally {
    lock.releaseLock();
  }
}

function sendMessage(type, data) {
  Logger.log(data)
  Logger.log(type)
  let flex = {
    "type": "bubble",
    "size": "giga",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "image",
          "url": "https://lh3.googleusercontent.com/d/1k6X_DgBaR1IxIXFRq5n6ex7Jomzg_TAZ",
          "size": "full",
          "position": "absolute",
          "aspectMode": "cover",
          "margin": "none",
          "aspectRatio": "1:1.5"
        },
        {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "box",
              "layout": "horizontal",
              "flex": 1,
              "width": "350px",
              "contents": [
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "text",
                      "text": "WWW.POLLERT.COM",
                      "color": "#eac284",
                      "size": "xxs",
                      "align": "start"
                    },
                    {
                      "type": "text",
                      "text": "THAILAND LOCKSMITH 2024",
                      "color": "#FFFFFF",
                      "size": "lg",
                      "align": "start",
                      "weight": "bold",
                      "scaling": true,
                      "adjustMode": "shrink-to-fit"
                    }
                  ],
                  "flex": 9,
                  "spacing": "md"
                },
                {
                  "type": "box",
                  "layout": "vertical",
                  "contents": [
                    {
                      "type": "image",
                      "url": "https://img2.pic.in.th/pic/1730737040513.png",
                      "aspectMode": "fit",
                      "position": "relative",
                      "size": "xs",
                      "offsetTop": "-10px"
                    }
                  ],
                  "flex": 2,
                  "alignItems": "flex-end",
                  "justifyContent": "flex-start",
                  "offsetTop": "none",
                  "paddingTop": "none"
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": type == 'member' ? data.member_id : data.guest_id,
                  "align": "center",
                  "size": "xl",
                  "weight": "bold",
                  "gravity": "center",
                  "color": "#000000",
                  "scaling": true,
                  "adjustMode": "shrink-to-fit"
                }
              ],
              "width": "230px",
              "backgroundColor": "#eac285",
              "cornerRadius": "md",
              "justifyContent": "center",
              "alignItems": "center"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": data.name,
                  "weight": "bold",
                  "size": "xl",
                  "color": "#eac285",
                  "align": "center",
                  "adjustMode": "shrink-to-fit",
                  "scaling": true
                }
              ]
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "โปรดแสดงบัตรนี้พร้อมบัตรประชาชนก่อนเข้างาน",
                  "color": "#FFD700",
                  "size": "sm",
                  "align": "center",
                  "wrap": true
                },
                {
                  "type": "image",
                  "url": "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" + encodeURIComponent(type == 'member' ? data.member_id : data.guest_id),
                  "size": "sm",
                  "aspectMode": "cover",
                  "margin": "lg"
                },
                {
                  "type": "text",
                  "text": "SCAN QR-CODE",
                  "color": "#eac285",
                  "size": "xs",
                  "align": "center",
                  "margin": "md"
                }
              ],
              "paddingAll": "lg"
            }
          ],
          "paddingAll": "md",
          "justifyContent": "center",
          "alignItems": "center",
          "spacing": "md",
          "backgroundColor": "#00000066"
        }
      ],
      "backgroundColor": "#004225",
      "justifyContent": "center",
      "alignItems": "center",
      "paddingAll": "none"
    },
    "styles": {
      "body": {
        "backgroundColor": "#004225"
      },
      "footer": {
        "backgroundColor": "#004225"
      }
    }
  }

  if (data.follower && data.follower != '') {
    flex.body.contents[1].contents[2].contents.push(
      {
        "type": "text",
        "text": "&",
        "weight": "bold",
        "size": "xl",
        "color": "#eac285",
        "align": "center"
      }, {
      "type": "text",
      "text": data.follower,
      "weight": "bold",
      "size": "xl",
      "color": "#eac285",
      "align": "center",
      "scaling": true,
      "adjustMode": "shrink-to-fit"
    })
  }
  
  const idToShow = type == 'member' ? data.member_id : data.guest_id;
  const msg = [
    {
      "type": "flex",
      "altText": "ลงทะเบียนสำเร็จ",
      "contents": flex
    }
  ];
  
  Logger.log(JSON.stringify(msg));
  LineBotWebhook.push(data.uid, LINE_ACCESS_TOKEN, msg);
}

function getGuestId() {
  const sh = getSheetWithCache(SHEET_NAME);
  const data = sh.getDataRange().getValues().slice(2);
  
  let maxId = 0;
  for (let i = 0; i < data.length; i++) {
    const cellValue = data[i][0].toString();
    if (cellValue.includes('#G')) {
      const id = parseInt(cellValue.split('#G')[1]);
      if (id > maxId) maxId = id;
    }
  }
  
  return maxId + 1;
}

function getFolderAndToken() {
  const folder = DriveApp.getFolderById('1kkQX2BpYWyNIwpbeEt5qRax18kThKVC4');
  const res = {
    folder: folder.getId(),
    token: ScriptApp.getOAuthToken()
  };
  return createJsonResponse(res);
}

function checkin(e) {
  const lock = LockService.getScriptLock();
  
  try {
    if (!lock.tryLock(5000)) {
      return createJsonResponse({ status: 'system busy' });
    }
    
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    let sh;
    if (year === 2024 && month === 11 && day === 14) {
      sh = getSheetWithCache(SHEET_SATURDAY);
    } else if (year === 2024 && month === 11 && day === 15) {
      sh = getSheetWithCache(SHEET_SUNDAY);
    } else {
      return createJsonResponse({ status: 'not allowed' });
    }
    
    const customer_id = e.parameter.id;
    
    // Check if already checked in - read all data once
    const allValues = sh.getDataRange().getValues();
    for (let i = 1; i < allValues.length; i++) {
      if (allValues[i][1] === customer_id) {
        return createJsonResponse({ status: 'already checked', time_in: allValues[i][0] });
      }
    }
    
    const lastRow = sh.getRange('L1').getValue() + 2;
    const formula = `=XLOOKUP(B${lastRow}, '${SHEET_NAME}'!A:A, '${SHEET_NAME}'!B:I, "ไม่มีสิทธื์เข้างาน")`;
    
    sh.getRange(lastRow, 1, 1, 3)
      .setNumberFormats([['dd/MM/yyyy, HH:mm:ss', '@', '']])
      .setValues([[date, customer_id, formula]]);
    
    SpreadsheetApp.flush();
    
    const data = sh.getRange(lastRow, 1, 1, sh.getLastColumn()).getValues()[0];
    const header = allValues[0].slice(0, sh.getLastColumn() - 2);
    const obj = rowToObject(data, header);
    const uid = sh.getRange('J' + lastRow).getValue();
    
    LineBotWebhook.push(uid, LINE_ACCESS_TOKEN, ['ยินดีต้อนรับเข้าสู่งาน THAILAND LOCKSMITH 2024']);
    
    return createJsonResponse({ status: 'success', time_in: date, data: obj });
  } finally {
    lock.releaseLock();
  }
}


function getCustomers_in() {
  const sh2 = getSheetWithCache(SHEET_SATURDAY);
  const sh3 = getSheetWithCache(SHEET_SUNDAY);
  
  const data2 = sh2.getDataRange().getValues();
  const data3 = sh3.getDataRange().getValues();
  const header = data2[0];
  
  const allData = [...data2.slice(1), ...data3.slice(1)];
  const obj = allData.map(row => rowToObject(row, header));
  
  return createJsonResponse({ status: 'success', data: obj, header: header });
}

function setRichMenu(e) {
  const uid = e.parameter.uid;
  const richmenu_id = 'richmenu-0e47da3aafd3d862885cc45ac86a8aa1';
  const endpoint = `https://api.line.me/v2/bot/user/${uid}/richmenu/${richmenu_id}`;
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(endpoint, options);
  const status = response.getResponseCode() === 200 ? 'success' : 'fail';
  
  return createJsonResponse({ status: status });
}

function delRichMenu(e) {
  const uid = e.parameter.uid;
  const endpoint = `https://api.line.me/v2/bot/user/${uid}/richmenu`;
  
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
    },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(endpoint, options);
  const status = response.getResponseCode() === 200 ? 'success' : 'fail';
  
  return createJsonResponse({ status: status });
}

function sendFlex(e) {
  const uid = e.parameter.uid;
  const flex = JSON.parse(e.parameter.flex);
  LineBotWebhook.push(uid, LINE_ACCESS_TOKEN, flex);
  return createJsonResponse({ status: 'success' });
}
