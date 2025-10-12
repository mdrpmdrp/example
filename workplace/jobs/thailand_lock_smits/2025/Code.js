const FOR_TEST = true

// const LINE_ACCESS_TOKEN = '7Zq0bQKGGJVUnuzLQyjf/235++1jYMhjthNroXkPcqSBeb6TzbgKYHpW5WkJrckE5dw2pGiMKKNIaax9rU9P0oMlHtpReUzs3WSO9LANtbMHoSHiqkt5czf044y3zTJon/UoxyPI5BUBot8VmenDIwdB04t89/1O/w1cDnyilFU='
const LINE_ACCESS_TOKEN = '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU='

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
      case 'checkRegist':
        return checkRegist(e);
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
      case 'sendWelcomeMessage':
        return sendWelcomeMessage(e);
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
  const customerIdIndex = headerIndices['รหัสลูกค้า'];

  const obj = {};
  for (let i = 1; i < allValues.length; i++) {
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
  const customerIdIndex = headerIndices['รหัสลูกค้า'];

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

function checkRegist(e) {
  const uid = e.parameter.uid;
  const sheet = getSheetWithCache(SHEET_NAME);
  const allValues = sheet.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const uidIndex = headerIndices['uid'];
  for (let i = 1; i < allValues.length; i++) {
    if (allValues[i][uidIndex] === uid) {
      const obj = rowToObject(allValues[i], header);
      obj.status = 'already registed';
      obj.member_id = allValues[i][headerIndices['รหัสลูกค้า']];
      return createJsonResponse(obj);
    }
  }

  return createJsonResponse({ status: 'not found' });
}

function searchCustomer(e) {
  //  e = {
  //   parameter: {
  //     uid: 'Ua55431b2d9be5d104c316ccb8ef54e80',
  //     searchValue: '0904017402'
  //   }
  // }
  const searchValue = e.parameter.searchValue.toString().trim();
  const uid = e.parameter.uid;
  const searchValueUpper = searchValue.toUpperCase();
  const sh = getSheetWithCache(SHEET_NAME);
  const allValues = sh.getDataRange().getValues();
  const header = allValues[0];
  const headerIndices = getHeaderIndices(header);
  const customerIdIndex = headerIndices['รหัสลูกค้า'];
  const phoneIndex = headerIndices['เบอร์โทร'];
  const uidIndex = headerIndices['uid'];

  // Determine if we're searching by phone (numeric only) or customer ID
  const isPhoneSearch = /^\d+$/.test(searchValue);

  if (isPhoneSearch) {
    const searchValuePadded = searchValue.padStart(10, '0');
    let foundRow = null;
    let userRow = null;

    // Single pass through data
    for (let i = 1; i < allValues.length; i++) {
      const row = allValues[i];

      // Check if this row belongs to the current user
      if (row[uidIndex] === uid) {
        userRow = row;
      }

      // Check if phone matches
      const phone = row[phoneIndex];
      if (phone && phone !== '') {
        const phones = phone.toString().replace(/-/g, '').split(',').map(p => p.trim().padStart(10, '0'));
        if (phones.includes(searchValuePadded)) {
          foundRow = row;
          // If we found both user row and matching phone, we can decide early
          if (userRow && userRow !== foundRow) {
            return createJsonResponse({ status: 'already registed uid' });
          }
        }
      }
    }

    if (!foundRow) {
      if (userRow) {
        return createJsonResponse({ status: 'already registed uid' });
      }
      return createJsonResponse({ status: 'not found' });
    }

    // If user has a row and it matches the found phone
    if (userRow && userRow === foundRow) {
      const obj = rowToObject(foundRow, header);
      obj.status = 'found';
      obj.member_id = foundRow[customerIdIndex];
      return createJsonResponse(obj);
    }

    // User has different row
    if (userRow) {
      return createJsonResponse({ status: 'already registed uid' });
    } else {
      if (foundRow[uidIndex] !== '' && foundRow[uidIndex] !== uid) {
        return createJsonResponse({ status: 'already registed customerId' });
      }
    }

    // User not registered yet
    const obj = rowToObject(foundRow, header);
    obj.status = 'found';
    obj.member_id = foundRow[customerIdIndex];
    return createJsonResponse(obj);

  } else {
    let foundRow = null;
    let hasConflictingUid = false;

    // Single pass through data
    for (let i = 1; i < allValues.length; i++) {
      const row = allValues[i];

      if (row[customerIdIndex] === searchValueUpper) {
        foundRow = row;
        if (row[uidIndex] !== "" && row[uidIndex] !== uid) {
          hasConflictingUid = true;
        }
      } else if (row[uidIndex] === uid && row[customerIdIndex] !== "" && row[customerIdIndex] !== searchValueUpper) {
        hasConflictingUid = true;
      }

      // Early exit if we found both conditions
      if (foundRow && hasConflictingUid) {
        if (foundRow[uidIndex] !== '' && foundRow[uidIndex] !== uid) {
          return createJsonResponse({ status: 'already registed customerId' });
        } else {
          return createJsonResponse({ status: 'already registed uid' });
        }
      }
    }

    if (!foundRow) {
      if (hasConflictingUid) {
        return createJsonResponse({ status: 'already registed uid' });
      }
      return createJsonResponse({ status: 'not found' });
    }

    if (hasConflictingUid) {
      return createJsonResponse({ status: 'already registed uid' });
    }

    const obj = rowToObject(foundRow, header);
    obj.status = 'found';
    obj.member_id = foundRow[customerIdIndex];
    return createJsonResponse(obj);
  }
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
  // e = {parameter: {"member_id": "WS0004", "name": "ชูชัย  วรรณโกมลวัฒน", "province": "-- -- -- --", "phone": "081-731-6676, 02-460-0121", "date": "เข้าร่วมทั้ง 2 วัน", "follower": "", "uid": "Ua55431b2d9be5d104c316ccb8ef54e81", "opt": "memberRegist"}}
  let lock = LockService.getScriptLock();
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    if (lock.tryLock(30000)) {
      break;
    }
    retries++;
    if (retries >= maxRetries) {
      return createJsonResponse({ status: 'system busy' });
    }
    Utilities.sleep(1000);
  }
  try {
    const sh = getSheetWithCache(SHEET_NAME);
    const allValues = sh.getDataRange().getValues();
    const header = allValues[0];
    const headerIndices = getHeaderIndices(header);
    const data = allValues.slice(1);

    const memberId = e.parameter['member_id'].toUpperCase();
    const paramUid = e.parameter['uid'];
    const customerIdIndex = headerIndices['รหัสลูกค้า'];
    const uidIndex = headerIndices['uid'];

    Logger.log('Looking for member: ' + memberId + ', UID: ' + paramUid);
    Logger.log('customerIdIndex: ' + customerIdIndex + ', uidIndex: ' + uidIndex);

    let memberIndex = -1;
    let memberRow = null;
    let hasUidConflict = false;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowCustomerId = row[customerIdIndex];
      const rowUid = row[uidIndex];

      // Find target member
      if (rowCustomerId === memberId) {
        memberIndex = i;
        memberRow = row;
        Logger.log('Found member at index: ' + i + ', existing UID: "' + rowUid + '"');

        // Check if member already has UID (early exit)
        if (rowUid !== '' && rowUid != null) {
          Logger.log('Member already has UID, returning...');
          return createJsonResponse({ status: 'member id already validated' });
        }
      }

      // Check for UID conflict
      if (rowUid === paramUid) {
        hasUidConflict = true;
        Logger.log('UID conflict found at row index: ' + i + ', customer: ' + rowCustomerId);
        // If we already found the member and there's a conflict, exit immediately
        if (memberIndex >= 0) {
          return createJsonResponse({ status: 'userid already validated' });
        }
      }

      // Early exit if we found member and checked all UIDs up to this point
      if (memberIndex >= 0 && hasUidConflict) {
        return createJsonResponse({ status: 'userid already validated' });
      }
    }

    // Member not found
    if (memberIndex < 0) {
      return createJsonResponse({ status: 'not validated' });
    }

    // UID already exists
    if (hasUidConflict) {
      return createJsonResponse({ status: 'userid already validated' });
    }

    // Cache header indices for faster access
    const nameIndex = headerIndices['ชื่อ นามสกุล'];
    const provinceIndex = headerIndices['จังหวัด'];
    const visitDateIndex = headerIndices['ลงทะเบียนเข้างานวันที่'];
    const phoneIndex = headerIndices['เบอร์โทร'];
    const followerIndex = headerIndices['ผู้ติดตาม'];
    const checkInIndex = headerIndices['เช็คอิน'];

    // Update the row (avoid array spread for better performance)
    const row = memberIndex + 2;
    const d = memberRow.slice(); // Faster than spread operator
    d[uidIndex] = paramUid;
    d[nameIndex] = e.parameter['name'];
    d[provinceIndex] = e.parameter['province'];
    d[visitDateIndex] = e.parameter['date'];
    d[phoneIndex] = e.parameter['phone'] ? ("'" + e.parameter['phone']) : "";
    d[followerIndex] = e.parameter['follower'];
    d[checkInIndex] = `=IF( COUNTIF({'${SHEET_SATURDAY}'!C:C;'${SHEET_SUNDAY}'!C:C},B${row}) > 0,"YES","NO")`;

    sh.getRange(row, 1, 1, d.length).setValues([d]);

    // // Send LINE message with registration card
    // sendMessage('member', {
    //   member_id: d[customerIdIndex],
    //   name: d[nameIndex],
    //   province: d[provinceIndex],
    //   phone: d[phoneIndex],
    //   date: d[visitDateIndex],
    //   follower: d[followerIndex] || '',
    //   uid: d[uidIndex]
    // });
    lock.releaseLock();
    return createJsonResponse({ status: 'success' });
  } catch (err) {
    lock.releaseLock();
    throw err;
  } finally {
    lock.releaseLock();
  }
}
// https://liff.line.me/1656187634-ZrAvz5Q9 staff
// https://liff.line.me/1656187634-ZVB4KEdw login

function guestRegist(e) {
  const lock = LockService.getScriptLock();

  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
    if (lock.tryLock(30000)) {
      break;
    }
    retries++;
    if (retries >= maxRetries) {
      return createJsonResponse({ status: 'system busy' });
    }
    Utilities.sleep(1000);
  }
  try {
    const sh = getSheetWithCache(SHEET_NAME);
    const allValues = sh.getDataRange().getValues();
    const header = allValues[0];
    const headerIndices = getHeaderIndices(header);
    const data = allValues.slice(1);
    const uidIndex = headerIndices['uid'];
    const paramUid = e.parameter['uid'];

    // Check if UID already registered
    if (data.some(v => v[uidIndex] === paramUid)) {
      return createJsonResponse({ status: 'already register' });
    }

    const row = SuperScript.getRealLastRow('A', sh);
    const guest_id = '#G' + ('0000' + getGuestId()).slice(-4);
    const nameIndex = headerIndices['ชื่อ นามสกุล'];
    const provinceIndex = headerIndices['จังหวัด'];
    const visitDateIndex = headerIndices['ลงทะเบียนเข้างานวันที่'];
    const phoneIndex = headerIndices['เบอร์โทร'];
    const followerIndex = headerIndices['ผู้ติดตาม'];
    const checkInIndex = headerIndices['เช็คอิน'];
    const occupationIndex = headerIndices['อาชีพ'];
    const interestIndex = headerIndices['สินค้าที่สนใจ'];
    const new_row = new Array(header.length).fill('');
    new_row[0] = guest_id;
    new_row[nameIndex] = e.parameter['name'];
    new_row[provinceIndex] = e.parameter['province'];
    new_row[phoneIndex] = e.parameter['phone'] ? ("'" + e.parameter['phone']) : "";
    new_row[visitDateIndex] = e.parameter['date'];
    new_row[followerIndex] = e.parameter['follower'] || '';
    new_row[occupationIndex] = e.parameter['occupation'];
    new_row[interestIndex] = e.parameter['interest'];
    new_row[uidIndex] = paramUid;
    new_row[checkInIndex] = `=IF( COUNTIF({'${SHEET_SATURDAY}'!B:B;'${SHEET_SUNDAY}'!B:B},A${row + 1}) > 0,"YES","NO")`;

    sh.getRange(row + 1, 1, 1, 10).setValues([new_row]);
    PropertiesService.getScriptProperties().setProperty('lastGuestID', guest_id.replace('#G', ''));
    lock.releaseLock();
    return createJsonResponse({ status: 'success', guest_id });
  }
  catch (err) {
    lock.releaseLock();
    throw err;
  }
  finally {
    lock.releaseLock();
  }
}

function guest_reRegist(e) {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    SpreadsheetApp.getUi().alert('System busy, please try again');
    return;
  }
  try {

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
    lock.releaseLock();
    sendMessage('guest', guestData);
  }
  catch (err) {
    lock.releaseLock();
    throw err;
  }
  finally {
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
  const lastGuestID = PropertiesService.getScriptProperties().getProperty('lastGuestID');
  let newGuestID = lastGuestID ? parseInt(lastGuestID) + 1 : 1;
  return newGuestID;
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
    if (!lock.tryLock(10000)) {
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
    } else if (FOR_TEST) {
      sh = getSheetWithCache(SHEET_SATURDAY);
    } else {
      return createJsonResponse({
        status: 'not allowed',
        message: 'กรุณาเช็คอินใน' + SHEET_SATURDAY + ' หรือ ' + SHEET_SUNDAY + ' เท่านั้น'
      });
    }

    const customer_id = e.parameter.id;
    const allValues = sh.getDataRange().getValues();
    const header = allValues[0];

    // Check if already checked in
    for (let i = 1; i < allValues.length; i++) {
      if (allValues[i][1] === customer_id) {
        return createJsonResponse({ status: 'already checked', time_in: allValues[i][0] });
      }
    }

    // Add new check-in
    const lastRow = sh.getRange('L1').getValue() + 2;
    const formula = `=XLOOKUP(B${lastRow}, '${SHEET_NAME}'!A:A, '${SHEET_NAME}'!B:I, "ไม่มีสิทธื์เข้างาน")`;

    sh.getRange(lastRow, 1, 1, 3)
      .setNumberFormats([['dd/MM/yyyy, HH:mm:ss', '@', '']])
      .setValues([[date, customer_id, formula]]);

    SpreadsheetApp.flush();

    const data = sh.getRange(lastRow, 1, 1, sh.getLastColumn()).getValues()[0];
    const headerSlice = header.slice(0, sh.getLastColumn() - 2);
    const obj = rowToObject(data, headerSlice);
    const uid = sh.getRange('J' + lastRow).getValue();

    lock.releaseLock();
    return createJsonResponse({ status: 'success', time_in: date, data: obj, uid: uid });
  } catch (e) {
    Logger.log(e)
    lock.releaseLock();
    return createJsonResponse({ status: 'error', message: e.message });
  }
}

function sendWelcomeMessage(e) {
  // const uid = e.parameter.uid;  
  const uid = 'Ua55431b2d9be5d104c316ccb8ef54e81'
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  let eventDate = '';
  if (year === 2024 && month === 11 && day === 14) {
    eventDate = 'วันเสาร์ที่ 14 ธันวาคม 2567';
  } else if (year === 2024 && month === 11 && day === 15) {
    eventDate = 'วันอาทิตย์ที่ 15 ธันวาคม 2567';
  } else if (FOR_TEST) {
    eventDate = 'วันเสาร์ที่ 14 ธันวาคม 2567';
  }

  const msg = [
    {
      "type": "flex",
      "altText": "ยินดีต้อนรับเข้าสู่งาน THAILAND LOCKSMITH 2025",
      "contents": {
        "type": "bubble",
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "image",
                  "url": "https://img2.pic.in.th/pic/1730737040513.png",
                  "size": "md",
                  "aspectMode": "fit",
                  "margin": "none"
                }
              ],
              "alignItems": "center",
              "paddingAll": "sm"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "text",
                  "text": "ยินดีต้อนรับเข้าสู่งาน",
                  "weight": "bold",
                  "size": "lg",
                  "color": "#ff8f04",
                  "align": "center",
                  "wrap": true
                },
                {
                  "type": "text",
                  "text": "THAILAND LOCKSMITH 2025",
                  "weight": "bold",
                  "size": "xxl",
                  "color": "#000000",
                  "align": "center",
                  "wrap": true,
                  "margin": "md",
                  "scaling": true,
                  "adjustMode": "shrink-to-fit"
                }
              ],
              "spacing": "none",
              "margin": "lg"
            },
            {
              "type": "separator",
              "margin": "xl",
              "color": "#ff8f04"
            },
            {
              "type": "box",
              "layout": "vertical",
              "contents": [
                {
                  "type": "box",
                  "layout": "horizontal",
                  "contents": [
                    {
                      "type": "box",
                      "layout": "vertical",
                      "contents": [
                        {
                          "type": "filler"
                        }
                      ],
                      "width": "12px",
                      "height": "12px",
                      "backgroundColor": "#ff8f04",
                      "cornerRadius": "30px"
                    },
                    {
                      "type": "text",
                      "text": eventDate,
                      "size": "md",
                      "color": "#333333",
                      "weight": "bold",
                      "flex": 1,
                      "gravity": "center",
                      "margin": "md"
                    }
                  ],
                  "alignItems": "center"
                }
              ],
              "margin": "xl",
              "paddingAll": "md"
            }
          ],
          "paddingAll": "none",
          "backgroundColor": "#ffffff",
          "spacing": "none"
        },
        "styles": {
          "body": {
            "backgroundColor": "#ffffff"
          }
        }
      }
    }
  ];

  LineBotWebhook.push(uid, LINE_ACCESS_TOKEN, msg);
  return createJsonResponse({ status: 'success' });
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
