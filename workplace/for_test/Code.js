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
  return groupList.find(g => g.groupId === event.groupId);
}

function handleTextMessage(event) {

  let message = event.message;
  // let message = "ทอง75% @5"
  if (message === '#getGroupID') {
    event.replyToline([`Group ID: ${event.groupId}`]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  } else if (message.startsWith('#registerGroup')) {
    if (!event.groupId) {
      event.replyToline(["คำสั่งนี้ใช้ได้เฉพาะในกลุ่มเท่านั้น"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    let prop = PropertiesService.getScriptProperties();
    let groups = prop.getProperty('registeredGroups');
    let groupList = groups ? JSON.parse(groups) : [];
    let groupId = event.groupId;
    let branch = message.split('=')[1].trim();
    if (groupList.find(g => g.groupId === groupId)) {
      event.replyToline(["กลุ่มนี้ได้ลงทะเบียนไว้แล้ว"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    groupList.push({ groupId, branch });
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
    if (!groupList.find(g => g.groupId === event.groupId)) {
      event.replyToline(["กลุ่มนี้ยังไม่ได้ลงทะเบียน"]);
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    }
    groupList = groupList.filter(g => g.groupId !== event.groupId);
    prop.setProperty('registeredGroups', JSON.stringify(groupList));
    event.replyToline(["ยกเลิกการลงทะเบียนกลุ่มเรียบร้อยแล้ว"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }
  if (!isFromRegisteredGroup(event)) {
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }
  if(message === "##"){
    return getSummaryAssetInBranch(event);
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
      // goldPrice = 60200
      if (type === 'รูปพรรณ') price = goldPrice - (goldPrice * (Math.abs(percentOfOrnament) / 100));
      else price = goldPrice;
    } else {
      if (type === 'เงิน') price = silverPrice
      else if (type === 'แพลตตินัม') price = platinumPrice;
    }
    estimatedPrice = (price - criteria.meltPrice) * 0.0656 * (percent / 100) * weight;
    estimatedPrice = estimatedPrice - (estimatedPrice * (criteria.percent / 100));
    if (type === 'ทอง') {
      let commissions = sheet.getRange('J2:K').getDisplayValues().filter(r => r[0] != '').reduce((obj, row) => {
        let [min, max] = row[0].split(/-|\s/g).map(x => {
          if (x.includes('ขึ้นไป')) {
            return Number.MAX_SAFE_INTEGER;
          }
          return Number(x);
        });
        let commission = row[1]
        obj.push({ min, max, commission });
        return obj;
      }, [])
      for (let i = 0; i < commissions.length; i++) {
        let range = commissions[i];
        if (estimatedPrice >= range.min && estimatedPrice <= range.max) {
          if (range.commission.includes('%')) {
            let percentCommission = Number(range.commission.replace('%', ''));
            estimatedPrice = estimatedPrice - (estimatedPrice * (percentCommission / 100));
          } else {
            let fixedCommission = Number(range.commission);
            estimatedPrice = estimatedPrice - fixedCommission;
          }
          break;
        }
      }
    }
    estimatedPrice = Math.floor(estimatedPrice);
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

function getSummaryAssetInBranch(event) {
    // let prop = PropertiesService.getScriptProperties();
    // let groups = prop.getProperty('registeredGroups');
    // let groupList = groups ? JSON.parse(groups) : [];
    // let group = groupList.find(g => g.groupId === event.groupId);
    // if (!group) {
    //   event.replyToline(["กลุ่มนี้ยังไม่ได้ลงทะเบียน"]);
    //   return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
    // }
    // let branch = group.branch;
    let branch = "สาขา 1"
    // Fetch summary asset from external API or database based on branch
    // This is a placeholder response
    
    let ss = SpreadsheetApp.openById('1Z1mHUQMc4N_bLOtXPBraOC3YJRWOcgFoDJgmLb_PafA');
    let buySheet = ss.getSheetByName('บันทึกซื้อ');
    let meltSheet = ss.getSheetByName('บันทึกหลอม');
    let buyData = buySheet.getRange('A2:K').getDisplayValues().filter(r => r[0] != '' && r[6] === branch && r[9] !== 'ยกเลิก' && !r[10].match(/^\d{7,}$/)).map(r => percentExtract(r,2));
    let meltData = meltSheet.getRange('A2:J').getDisplayValues().filter(r => r[0] != '' && r[8] === branch && r[9] === 'รอส่ง')
    let gold_equalOrMoreThan99 = [], gold_lessThan99 = [];
    let silver_equalOrMoreThan90 = [], silver_lessThan90 = [];
    let otherAssets = {}
    buyData.forEach(row => {
      let type = row[1];
      let percent = row[2];
      let weight = Number(row[3]);
      if (type.indexOf('ทอง') !== -1) {
        if (percent >= 99) gold_equalOrMoreThan99.push(weight);
        else gold_lessThan99.push(weight);
      } else if (type.indexOf('เงิน') !== -1) {
        if (percent >= 90) silver_equalOrMoreThan90.push(weight);
        else silver_lessThan90.push(weight);
      }else{
        if(!otherAssets[type]){
          otherAssets[type] = []
        }
        otherAssets[type].push(weight);
      }
    });
    meltData.forEach(row => {
      let type = row[2];
      let percent = row[10];
      let weight = Number(row[5] || 0);
      if (type.indexOf('ทอง') !== -1) {
        if (percent >= 99) gold_equalOrMoreThan99.push(weight);
        else gold_lessThan99.push(weight);
      } else if (type.indexOf('เงิน') !== -1) {
        if (percent >= 90) silver_equalOrMoreThan90.push(weight);
        else silver_lessThan90.push(weight);
      }else{
        if(type === 'ค่าบริการ') return; // ข้ามค่าบริการ
        if(!otherAssets[type]){
          otherAssets[type] = []
        }
        otherAssets[type].push(weight);
      }
    });
    let replyMessages = [`สาขา: ${branch}\nสรุปสินทรัพย์:`];
    replyMessages.push(`ทอง >=99%:\nจำนวน ${gold_equalOrMoreThan99.length} รายการ\nน้ำหนักรวม ${gold_equalOrMoreThan99.reduce((a,b) => a + b, 0).toLocaleString()} กรัม`);
    replyMessages.push(`ทอง <99%:\nจำนวน ${gold_lessThan99.length} รายการ\nน้ำหนักรวม ${gold_lessThan99.reduce((a,b) => a + b, 0).toLocaleString()} กรัม`);
    replyMessages.push(`เงิน >=90%:\nจำนวน ${silver_equalOrMoreThan90.length} รายการ\nน้ำหนักรวม ${silver_equalOrMoreThan90.reduce((a,b) => a + b, 0).toLocaleString()} กรัม`);
    replyMessages.push(`เงิน <90%:\nจำนวน ${silver_lessThan90.length} รายการ\nน้ำหนักรวม ${silver_lessThan90.reduce((a,b) => a + b, 0).toLocaleString()} กรัม`);
    for(let [type, weights] of Object.entries(otherAssets)){
        if(type === 'ค่าบริการ') continue; // ข้ามค่าบริการ
      replyMessages.push(`${type}:\nจำนวน ${weights.length} รายการ\nน้ำหนักรวม ${weights.reduce((a,b) => a + b, 0).toLocaleString()} กรัม`);
    }
    event.replyToline([replyMessages.join('\n\n')], true);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
}

function percentExtract(row, colIndex = 2) {
    let col = row[colIndex]
    let percent = col.split(' ')[1]
    row[colIndex] = percent ? Number(percent.replace('%', '')) : 0
    return row
}