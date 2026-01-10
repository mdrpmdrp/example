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
  const ok = () => ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  const reply = (messages, notify = false) => {
    event.replyToline(Array.isArray(messages) ? messages : [messages], notify);
    return ok();
  };

  const { message, groupId } = event;
  const prop = PropertiesService.getScriptProperties();
  let groupList = JSON.parse(prop.getProperty('registeredGroups') || '[]');

  if (message === '#getGroupID') {
    return reply(`Group ID: ${groupId}`);
  }

  if (message.startsWith('#registerGroup')) {
    if (!groupId) {
      return reply('คำสั่งนี้ใช้ได้เฉพาะในกลุ่มเท่านั้น');
    }
    const [, rawBranch = ''] = message.split('=');
    const branch = rawBranch.trim();
    if (!branch) {
      return reply('กรุณาระบุสาขาหลังเครื่องหมาย =');
    }
    if (groupList.some(g => g.groupId === groupId)) {
      return reply('กลุ่มนี้ได้ลงทะเบียนไว้แล้ว');
    }
    groupList.push({ groupId, branch });
    prop.setProperty('registeredGroups', JSON.stringify(groupList));
    return reply('ลงทะเบียนกลุ่มเรียบร้อยแล้ว');
  }

  if (message === '#unregisterGroup') {
    if (!groupId) {
      return reply('คำสั่งนี้ใช้ได้เฉพาะในกลุ่มเท่านั้น');
    }
    if (!groupList.some(g => g.groupId === groupId)) {
      return reply('กลุ่มนี้ยังไม่ได้ลงทะเบียน');
    }
    groupList = groupList.filter(g => g.groupId !== groupId);
    prop.setProperty('registeredGroups', JSON.stringify(groupList));
    return reply('ยกเลิกการลงทะเบียนกลุ่มเรียบร้อยแล้ว');
  }

  if (!isFromRegisteredGroup(event)) {
    return ok();
  }

  if (message === '##') {
    return getSummaryAssetInBranch(event);
  }

  if (message === '**') {
    return getSummaryAssetInAllBranches(event);
  }

  const userGroup = groupList.find(g => g.groupId === groupId);
  if (!userGroup) {
    return ok();
  }

  const pattern = /(เงิน|ทอง|แพลตตินัม|รูปพรรณ)\s*\d{1,3}\.?\d{0,2}%\s*@\s*\d{1,3}\.?\d{0,2}/;
  const matchedText = (message.match(pattern) || [])[0];
  if (!matchedText) {
    return ok();
  }

  const type = (matchedText.match(/(เงิน|ทอง|แพลตตินัม|รูปพรรณ)/) || [])[0];
  const percentText = (matchedText.match(/\d{1,3}\.?\d{0,2}%/) || [])[0];
  const weightText = (matchedText.match(/@\s*\d{1,3}\.?\d{0,2}/) || [])[0];
  if (!type || !percentText || !weightText) {
    return ok();
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const criteria = getCriteria(type, percentText);
  if (!criteria) {
    return ok();
  }

  const branch = userGroup.branch;
  const percent = Number(percentText.replace('%', ''));
  const weight = Number(weightText.replace('@', '').trim());
  const [, platinumPrice = 0, percentOfOrnament = 0] = sheet.getRange('H1:H3').getValues().flat().map(Number);

  let price = 0;
  let goldPrice = 0;
  let silverPerGram = 0;

  if (type === 'ทอง' || type === 'รูปพรรณ') {
    goldPrice = getGoldPrice(type);
    price = type === 'รูปพรรณ'
      ? goldPrice - (goldPrice * (Math.abs(percentOfOrnament) / 100))
      : goldPrice;
  } else if (type === 'เงิน') {
    price = getSilverPrice();
  } else if (type === 'แพลตตินัม') {
    price = platinumPrice;
  }

  let estimatedPrice = 0
  if (type === 'รูปพรรณ') {
    estimatedPrice = (price - (branch === 'ร้อยเอ็ด' ? 0 : criteria.meltPrice)) * 0.0656 * (percent / 100) * weight;
    estimatedPrice -= estimatedPrice * ((branch === 'ร้อยเอ็ด' ? 7 : criteria.percent) / 100);
  }
  else if (type === 'ทอง') {
    estimatedPrice = (price - (branch === 'ร้อยเอ็ด' ? 0 : criteria.meltPrice)) * 0.0656 * (percent / 100) * weight;
    estimatedPrice -= estimatedPrice * ((branch === 'ร้อยเอ็ด' ? 7 : criteria.percent) / 100);
    const range = branch === 'ร้อยเอ็ด' ? 'J14:K17' : 'J2:K6';
    const commissions = sheet.getRange(range).getDisplayValues()
      .filter(([rangeText]) => rangeText)
      .map(([rangeText, commission]) => {
        const numbers = rangeText.match(/\d+(?:\.\d+)?/g) || [0];
        const min = Number(numbers[0] || 0);
        const max = /ขึ้นไป/.test(rangeText) ? Number.MAX_SAFE_INTEGER : Number(numbers[1] || numbers[0]);
        return { min, max, commission };
      });

    for (const { min, max, commission } of commissions) {
      if (estimatedPrice >= min && estimatedPrice <= max) {
        if (commission.includes('%')) {
          estimatedPrice -= estimatedPrice * (Number(commission.replace('%', '')) / 100);
        } else {
          estimatedPrice -= Number(commission);
        }
        break;
      }
    }
  }else if(type === 'เงิน'){
    silverPerGram = Math.floor(((price - criteria.meltPrice)/1000) * (percent / 100));
    if(percent < 99){
      silverPerGram -= 3
    }
    estimatedPrice = silverPerGram * weight;
  }

  estimatedPrice = Math.floor(estimatedPrice);

  return reply(`ประเภท: ${type} (${percent}%)
น้ำหนัก: ${weight} กรัม${type === 'ทอง' ? `\n\nราคาทอง: ${goldPrice.toLocaleString()} บาท` : type === 'เงิน' ? `\n\nเงินกรัมละ: ${silverPerGram.toLocaleString()} บาท` : ''}${type === 'รูปพรรณ' ? `\n\nราคารูปพรรณ: ${price.toLocaleString()} บาท` : ''}

👉 ราคาประเมิน: 
${estimatedPrice.toLocaleString()} บาท`, true);
}

function getGoldPrice() {
  let endPoint = 'https://api.chnwt.dev/thai-gold-api/latest';
  let response = UrlFetchApp.fetch(endPoint);
  let data = JSON.parse(response.getContentText());
  return Number(data.response.price.gold_bar.sell.replace(/,/g, ''));
}

function getSilverPrice() {
  let endPoint = 'http://27.254.77.78/rest/public/rest/silver';
  let response = UrlFetchApp.fetch(endPoint);
  let data = JSON.parse(response.getContentText());
  let price = Number(data.Silver.bid.replace(/,/g, ''));
  return price 
}

function getCriteria(type="เงิน", percent=90) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Sheet1');
  let data = sheet.getRange('A2:E').getValues();
  let criteria = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === "ปกติ" && data[i][1] === type) {
      criteria = {
        meltPrice: Number(data[i][2]),
        percent: Math.abs(Number(data[i][3])),
        less99: Number(data[i][4] || 0)
      };
      break;
    }
  }
  Logger.log(criteria)
  return criteria;
}

function getSummaryAssetInBranch(event) {
  let prop = PropertiesService.getScriptProperties();
  let groups = prop.getProperty('registeredGroups');
  let groupList = groups ? JSON.parse(groups) : [];
  let group = groupList.find(g => g.groupId === event.groupId);
  if (!group) {
    event.replyToline(["กลุ่มนี้ยังไม่ได้ลงทะเบียน"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }
  let branch = group.branch;
  // let branch = "สาขา 1"
  // Fetch summary asset from external API or database based on branch
  // This is a placeholder response

  let ss = SpreadsheetApp.openById('1Z1mHUQMc4N_bLOtXPBraOC3YJRWOcgFoDJgmLb_PafA');
  let buySheet = ss.getSheetByName('บันทึกซื้อ');
  let meltSheet = ss.getSheetByName('บันทึกหลอม');
  let buyData = buySheet.getRange('A2:K').getDisplayValues().filter(r => r[0] != '' && r[6] === branch && r[9] !== 'ยกเลิก' && !r[10].match(/^\d{7,}$/)).map(r => percentExtract(r, 2));
  let meltData = meltSheet.getRange('A2:L').getDisplayValues().filter(r => r[0] != '' && r[9] === branch && r[10] === 'รอส่ง')
  let gold_equalOrMoreThan99 = [], gold_lessThan99 = [];
  let silver_equalOrMoreThan90 = [], silver_lessThan90 = [];
  let otherAssets = {}
  buyData.forEach(row => {
    let type = row[1];
    let percent = row[2];
    let weight = Number(row[3]);
    if (type.indexOf('ทอง') !== -1) {
      if (percent >= 99) {
        gold_equalOrMoreThan99.push(weight);
      }
      else gold_lessThan99.push(weight);
    } else if (type.indexOf('เงิน') !== -1) {
      if (percent >= 90) silver_equalOrMoreThan90.push(weight);
      else silver_lessThan90.push(weight);
    } else {
      if (!otherAssets[type]) {
        otherAssets[type] = []
      }
      otherAssets[type].push(weight);
    }
  });
  meltData.forEach(row => {
    let type = row[2];
    let percent = Number(row[11] || 0);
    let weight = Number(row[3] || 0);
    if (type.indexOf('ทอง') !== -1) {
      if (percent >= 99) {
        gold_equalOrMoreThan99.push(weight);
      }
      else gold_lessThan99.push(weight);
    } else if (type.indexOf('เงิน') !== -1) {
      if (percent >= 90) silver_equalOrMoreThan90.push(weight);
      else silver_lessThan90.push(weight);
    } else {
      if (type === 'ค่าบริการ') return; // ข้ามค่าบริการ
      if (!otherAssets[type]) {
        otherAssets[type] = []
      }
      otherAssets[type].push(weight);
    }
  });
  let replyMessages = [`สาขา: ${branch}\nสรุปสินทรัพย์:`];
  replyMessages.push(`ทอง >=99%:\nจำนวน ${gold_equalOrMoreThan99.length} รายการ\nน้ำหนักรวม ${gold_equalOrMoreThan99.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`ทอง <99%:\nจำนวน ${gold_lessThan99.length} รายการ\nน้ำหนักรวม ${gold_lessThan99.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`เงิน >=90%:\nจำนวน ${silver_equalOrMoreThan90.length} รายการ\nน้ำหนักรวม ${silver_equalOrMoreThan90.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`เงิน <90%:\nจำนวน ${silver_lessThan90.length} รายการ\nน้ำหนักรวม ${silver_lessThan90.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  for (let [type, weights] of Object.entries(otherAssets)) {
    if (type === 'ค่าบริการ') continue; // ข้ามค่าบริการ
    replyMessages.push(`${type}:\nจำนวน ${weights.length} รายการ\nน้ำหนักรวม ${weights.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  }
  event.replyToline([replyMessages.join('\n\n')], true);
  return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
}

function getSummaryAssetInAllBranches(event) {
  let prop = PropertiesService.getScriptProperties();
  let groups = prop.getProperty('registeredGroups');
  let groupList = groups ? JSON.parse(groups) : [];
  let group = groupList.find(g => g.groupId === event.groupId);
  if (!group) {
    event.replyToline(["กลุ่มนี้ยังไม่ได้ลงทะเบียน"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }
  let branch = group.branch;

  if (branch.toLowerCase() !== 'all') {
    event.replyToline(["คำสั่งนี้ใช้ได้เฉพาะกลุ่มที่ลงทะเบียนสาขาเป็น All เท่านั้น"]);
    return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.JSON);
  }

  let ss = SpreadsheetApp.openById('1Z1mHUQMc4N_bLOtXPBraOC3YJRWOcgFoDJgmLb_PafA');
  let buySheet = ss.getSheetByName('บันทึกซื้อ');
  let meltSheet = ss.getSheetByName('บันทึกหลอม');
  let buyData = buySheet.getRange('A2:K').getDisplayValues().filter(r => r[0] != '' && r[9] !== 'ยกเลิก' && !r[10].match(/^\d{7,}$/)).map(r => percentExtract(r, 2));
  let meltData = meltSheet.getRange('A2:L').getDisplayValues().filter(r => r[0] != '' && r[10] === 'รอส่ง')
  let gold_equalOrMoreThan99 = [], gold_lessThan99 = [];
  let silver_equalOrMoreThan90 = [], silver_lessThan90 = [];
  let otherAssets = {}
  buyData.forEach(row => {
    let type = row[1];
    let percent = row[2];
    let weight = Number(row[3]);
    if (type.indexOf('ทอง') !== -1) {
      if (percent >= 99) {
        gold_equalOrMoreThan99.push(weight);
      }
      else gold_lessThan99.push(weight);
    } else if (type.indexOf('เงิน') !== -1) {
      if (percent >= 90) silver_equalOrMoreThan90.push(weight);
      else silver_lessThan90.push(weight);
    } else {
      if (!otherAssets[type]) {
        otherAssets[type] = []
      }
      otherAssets[type].push(weight);
    }
  });
  meltData.forEach(row => {
    let type = row[2];
    let percent = Number(row[11] || 0);
    let weight = Number(row[3] || 0);
    if (type.indexOf('ทอง') !== -1) {
      if (percent >= 99) {
        gold_equalOrMoreThan99.push(weight);
      }
      else gold_lessThan99.push(weight);
    } else if (type.indexOf('เงิน') !== -1) {
      if (percent >= 90) silver_equalOrMoreThan90.push(weight);
      else silver_lessThan90.push(weight);
    } else {
      if (type === 'ค่าบริการ') return; // ข้ามค่าบริการ
      if (!otherAssets[type]) {
        otherAssets[type] = []
      }
      otherAssets[type].push(weight);
    }
  });
  let replyMessages = [`สรุปสินทรัพย์รวมทุกสาขา:`];
  replyMessages.push(`ทอง >=99%:\nจำนวน ${gold_equalOrMoreThan99.length} รายการ\nน้ำหนักรวม ${gold_equalOrMoreThan99.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`ทอง <99%:\nจำนวน ${gold_lessThan99.length} รายการ\nน้ำหนักรวม ${gold_lessThan99.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`เงิน >=90%:\nจำนวน ${silver_equalOrMoreThan90.length} รายการ\nน้ำหนักรวม ${silver_equalOrMoreThan90.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  replyMessages.push(`เงิน <90%:\nจำนวน ${silver_lessThan90.length} รายการ\nน้ำหนักรวม ${silver_lessThan90.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
  for (let [type, weights] of Object.entries(otherAssets)) {
    if (type === 'ค่าบริการ') continue; // ข้ามค่าบริการ
    replyMessages.push(`${type}:\nจำนวน ${weights.length} รายการ\nน้ำหนักรวม ${weights.reduce((a, b) => a + b, 0).toLocaleString()} กรัม`);
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