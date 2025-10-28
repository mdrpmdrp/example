const LINE_CHANNEL_ACCESS_TOKEN = 'qFhbzR3rb6gXUDBPmXHIxmvJ8uWWh/5uxYEPSRZkV5tL7so5u8DcYguDjCAlwVt+QSXDLue3PO13a2Meb4Fo9Gi7SwXROqIAMecmb7m2eQS0aJMqan7jveODmbVDPNvbCr0t6sUZvIk+HIYcR1v+XwdB04t89/1O/w1cDnyilFU='
function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  try {
    LineBotWebhook.init(e, LINE_CHANNEL_ACCESS_TOKEN, true).forEach(event => {
      event.showLoading();
      if (event.eventType === 'message' && event.messageType === 'text') {
        return handleTextMessage(event);
      }
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    });
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"', e.name || '',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    return ContentService.createTextOutput("Error: " + e.message);
  }
}

function isFromRegisteredGroup(event) {
  if (!event.groupId) {
    return false;
  }
  let prop = PropertiesService.getScriptProperties();
  let groups = prop.getProperty('registeredGroups');
  let groupList = groups ? JSON.parse(groups) : [];
  return groupList.includes(event.groupId);
}

function handleTextMessage(event) {

  let message = event.message;
  if (message === '#getGroupID') {
    event.replyToline([`Group ID: ${event.groupId}`]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  } else if (message === "#registerGroup") {
    if (!event.groupId) {
      event.replyToline(["คำสั่งนี้ใช้ได้เฉพาะในกลุ่มเท่านั้น"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    let prop = PropertiesService.getScriptProperties();
    let groups = prop.getProperty('registeredGroups');
    let groupList = groups ? JSON.parse(groups) : [];
    if (groupList.includes(event.groupId)) {
      event.replyToline(["กลุ่มนี้ได้ลงทะเบียนไว้แล้ว"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    groupList.push(event.groupId);
    prop.setProperty('registeredGroups', JSON.stringify(groupList));
    event.replyToline(["ลงทะเบียนกลุ่มเรียบร้อยแล้ว"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  } else if (message === "#unregisterGroup") {
    if (!event.groupId) {
      event.replyToline(["คำสั่งนี้ใช้ได้เฉพาะในกลุ่มเท่านั้น"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    let prop = PropertiesService.getScriptProperties();
    let groups = prop.getProperty('registeredGroups');
    let groupList = groups ? JSON.parse(groups) : [];
    if (!groupList.includes(event.groupId)) {
      event.replyToline(["กลุ่มนี้ยังไม่ได้ลงทะเบียน"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    groupList = groupList.filter(id => id !== event.groupId);
    prop.setProperty('registeredGroups', JSON.stringify(groupList));
    event.replyToline(["ยกเลิกการลงทะเบียนกลุ่มเรียบร้อยแล้ว"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }
  if (!isFromRegisteredGroup(event)) {
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }

  let regex = /(เงิน|ทอง|แพลตตินัม|รูปพรรณ)\s{0,}\d{1,3}\.{0,1}\d{0,2}%\s{0,}\@\s{0,}\d{1,3}\.{0,1}\d{0,2}/g
  let match = message.match(regex);
  if (match) {
    let type = match[0].match(/(เงิน|ทอง|แพลตตินัม|รูปพรรณ)/)[0];
    let percent = match[0].match(/\d{1,3}\.{0,1}\d{0,2}%/)[0];
    let weight = match[0].match(/\@\s{0,}\d{1,3}\.{0,1}\d{0,2}/)[0].replace('@', '').trim();
    if (!type || !percent || !weight) {
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');

    let criteria = getCriteria(type, percent);
    if (!criteria) {
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }

    percent = Number(percent.replace('%', ''));
    weight = Number(weight);
    let estimatedPrice, goldPrice, price
    let [silverPrice, platinumPrice, percentOfOrnament] = sheet.getRange('H1:H3').getValues().flat().map(Number)
    if (type === 'ทอง' || type === 'รูปพรรณ') {
      goldPrice = getGoldPrice(type);
      if(type === 'รูปพรรณ') price = goldPrice - (goldPrice * (Math.abs(percentOfOrnament) / 100));
      else price = goldPrice;
    } else {
      if (type === 'เงิน') price = silverPrice
      else if (type === 'แพลตตินัม') price = platinumPrice;
    }
    estimatedPrice = (price - (price * (criteria.percent / 100)) - criteria.meltPrice) * (percent / 100) * 0.0656 * weight;
    estimatedPrice = Math.floor(estimatedPrice / 10) * 10;

    event.replyToline([`ประเภท: ${type} (${percent}%)
น้ำหนัก: ${weight} กรัม${type === 'ทอง' ? ('\n\nราคาทอง: ' + goldPrice.toLocaleString() + " บาท") : ""}${type === 'รูปพรรณ' ? ('\n\nราคารูปพรรณ: ' + price.toLocaleString() + " บาท") : ""}

👉 ราคาประเมิน: 
${estimatedPrice.toLocaleString()} บาท`], true);
  }
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
}

function getGoldPrice() {
  let endPoint = 'https://api.chnwt.dev/thai-gold-api/latest';
  let response = UrlFetchApp.fetch(endPoint);
  let data = JSON.parse(response.getContentText());
  return Number(data.response.price.gold_bar.sell.replace(/,/g, ''));
}

function getCriteria(type, percent) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Sheet1');
  let data = sheet.getRange('A2:D').getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === "ปกติ" && data[i][1] === type) {
      return {
        meltPrice: Number(data[i][2]),
        percent: Math.abs(Number(data[i][3])),
      };
    }
  }
  return null;
}