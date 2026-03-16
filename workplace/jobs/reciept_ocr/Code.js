function sendData() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("รายการ");
  let selected_rows = sheet.getRange("R2:R" + SuperScript.getRealLastRow('R', sheet)).getValues()
    .map((e, i) => {
      return {
        row: i + 2,
        cell: e[0]
      }
    }).filter(e => e.cell == true)

  let group_id = ss.getSheetByName("Group ID").getDataRange().getValues().reduce((acc, row) => {
    acc[row[0]] = row[1];
    return acc;
  }, {});
  let error_data = []
  selected_rows.forEach(e => {
    let row = e.row
    if (row == 1) return
    let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues().map(row => {
      return formatData(row)
    })[0]
    if (data && !group_id[data.branch]) {
      group_id[data.branch] = group_id['main group id']
    }
    if (data && data.branch && group_id[data.branch]) {
      sendMessages(group_id[data.branch], data)
      sheet.getRange(row, 18).removeCheckboxes()
      sheet.getRange(row, 1, 1, 18).setBackground("lightgreen")
      sheet.getRange(row, 18).setNumberFormat('').setValue('ส่งไลน์แล้ว')
    } else {
      error_data.push(data.work_id)
    }
  })
  if (error_data.length > 0) {
    SpreadsheetApp.getUi().alert(`ไม่พบ Group ID สำหรับงานเลข\n-  ${error_data.join("\n- ")}\n\nกรุณาตรวจสอบข้อมูลสาขาให้ถูกต้อง`)
  }
}

// const LINE_ACCESS_TOKEN = 'TmO6zZ4elwE/LvZosHZFM8nYx+KaiMBssRi/VFo2JQFffrdfuq1vRyPhGfAPWPpfw+Plm6Bm5IDFnsm9VJ1TBcMCg57RSTQBsNtgEjOJrObUCNGF6W5VjcMuqqe3P790Hug/3U+RNbmSkaYxhrCd9AdB04t89/1O/w1cDnyilFU='
const LINE_ACCESS_TOKEN = '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU='
const update_url = 'https://liff.line.me/2006601191-QGe1GayY';
function sendMessages(id, data, resend = false) {
  const messages = [
    {
      type: 'text',
      text: `📍เลขใบงาน: ${data.work_id}
    
    👉สถานะ: ${data.status}
    
    📅วันที่: ${data.date}
    แหล่งที่มา: ${data.source}
    ผู้ส่ง: ${data.sender}
    สาขาทีลูกค้าสนใจ: ${data.branch}
    สินค้าที่สนใจ: ${data.product}
    
    📁 ข้อมูลลูกค้า
    ชื่อ-สกุล: ${data.customer.fname} ${data.customer.lname}
    เลข ปชช: ${data.customer.nationid}
    อายุ: ${data.customer.age} ปี
    เบอร์โทร: ${data.customer.phone}
    Line ID: ${data.customer.lineid}
    จังหวัด: ${data.customer.province}
    อาชีพ: ${data.customer.occupation}
    งบเงินดาวน์: ${Number(data.customer.downpayment).toLocaleString()} บาท
    ${data.remark == '' ? '' : ('\n📝 หมายเหตุ: ' + data.remark + '\n')}
    👉 อัพเดทข้อมูล
    ${update_url}?wid=${data.work_id}`
    }
  ];
  Logger.log(messages)
  if (resend) {
    messages.push({
      type: 'text',
      text: `📌 กรุณาอัพเดทสถานะของใบงานเลขที่ ${data.work_id} ในลิงค์ด้านบน`
    })
    messages[0].text = '⚠️⚠️⚠️ แจ้งเตือน ใบงานเลขที่ ' + data.work_id + ' ไม่มีการอัพเดทเกิน 2 วัน ⚠️⚠️⚠️\n\n' + messages[0].text
  }
  LineBotWebhook.push(id, LINE_ACCESS_TOKEN, messages)

}

function hanDleAPI(e) {
  Logger = BetterLog.useSpreadsheet()
  try {
    switch (e.parameter.action) {
      case 'login':
        return login(e)
      case 'getDropdown':
        return getDropdown(e)
      case 'saveData':
        return saveData(e)
      case 'editData':
        return editData(e)
      case 'saveResponse':
        return saveResponse(e)
      case 'getUpdateData':
        return getUpdateData(e)
      case 'getTableData':
        return getTableData(e)
    }
  } catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    throw e;
  }
}

function login(e) {
  let user = e.parameter.u
  let pass = e.parameter.p
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Users");
  let user_data = sheet.getDataRange().getValues()
    .reduce((acc, row, i) => {
      acc[row[0]] = {
        pass: row[1],
        name: row[2],
        branch: row[3],
        role: row[4],
        uuid: row[5],
        index: i + 1
      }
      return acc;
    }, {});
  if (user_data[user]?.pass == pass) {
    if (user_data[user].uuid == '') {
      user_data[user].uuid = Utilities.getUuid()
      sheet.getRange(user_data[user].index, 6).setValue(user_data[user].uuid)
    }
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'success', role: user_data[user].role, uuid: user_data[user].uuid, branch: user_data[user].branch, name: user_data[user].name }))
      .setMimeType(ContentService.MimeType.JSON)
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON)
}
function getDropdown(e) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("dropdown");
  let branch = [...new Set(sheet.getRange("B2:B" + SuperScript.getRealLastRow('B', sheet)).getValues().flat())].filter(e => e != '')
  let product = [...new Set(sheet.getRange("C2:C" + SuperScript.getRealLastRow('C', sheet)).getValues().flat())].filter(e => e != '')
  let customer_province = [...new Set(sheet.getRange("D2:D" + SuperScript.getRealLastRow('D', sheet)).getValues().flat())].filter(e => e != '')
  let status = [...new Set(sheet.getRange("E2:E" + SuperScript.getRealLastRow('E', sheet)).getValues().flat())].filter(e => e != '')
  let source = [...new Set(sheet.getRange("F2:F" + SuperScript.getRealLastRow('F', sheet)).getValues().flat())].filter(e => e != '')
  return ContentService.createTextOutput(JSON.stringify({ product, source, customer_province, status, branch })).setMimeType(ContentService.MimeType.JSON)
}

function saveData(e) {
  const getID = (sheet) => {
    let last_row = SuperScript.getRealLastRow('A', sheet)
    if (last_row <= 2) return { row: last_row, id: 'AD0001' }
    let last_id = sheet.getRange(last_row, 1).getValue()
    let last_id_num = last_id.replace('AD', '')
    let new_id = 'AD' + ('0000' + (parseInt(last_id_num) + 1)).slice(-4)
    return { row: last_row, id: new_id }
  }

  let lock = LockService.getScriptLock();
  lock.tryLock(10000);
  if (lock.hasLock()) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("รายการ");
    let last = getID(sheet)
    let data = [
      last.id,
      new Date(e.parameter.date),
      e.parameter.uuid,
      e.parameter.source,
      e.parameter.sender,
      e.parameter.branch,
      e.parameter.product,
      e.parameter.customer_fname,
      e.parameter.customer_lname,
      e.parameter.customer_nationid,
      e.parameter.customer_age,
      e.parameter.customer_phone,
      e.parameter.customer_lineid,
      e.parameter.customer_province,
      e.parameter.customer_occupation,
      e.parameter.customer_downpayment,
      e.parameter.remark,
      false,
      e.parameter.status
    ]
    sheet.getRange(last.row + 1, 1, 1, data.length)
      .setNumberFormats([['@', 'dd/MM/yyyy', '@', '@', '@', '@', '@', '@', '@', '@', '#', '@', '@', '@', '@', '@', '#', 'boolean', '@']])
      .setValues([data])
    sheet.getRange(last.row + 1, 18).insertCheckboxes()
    lock.releaseLock();
    data = {
      work_id: last.id,
      date: Utilities.formatDate(new Date(e.parameter.date), 'GMT+7', 'dd/MM/yyyy'),
      source: data[3],
      sender: data[4],
      branch: data[5],
      product: data[6],
      remark: data[16],
      status: data[18],
      customer: {
        fname: data[7],
        lname: data[8],
        nationid: data[9],
        age: data[10],
        phone: data[11],
        lineid: data[12],
        province: data[13],
        occupation: data[14],
        downpayment: data[15],
      }
    }
    let group_id = ss.getSheetByName("Group ID").getDataRange().getValues().reduce((acc, row) => {
      acc[row[0]] = row[1];
      return acc;
    }, {});
    if (data && !group_id[data.branch]) {
      group_id[data.branch] = group_id['main group id']
    }
    if (group_id[data.branch]) {
      sendMessages(group_id[data.branch], data)
      sheet.getRange(last.row + 1, 18).removeCheckboxes()
      sheet.getRange(last.row + 1, 18)
        .setNumberFormat('')
        .setValue('ส่งไลน์แล้ว')
      sheet.getRange(last.row + 1, 1, 1, 18).setBackground("lightgreen")
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON)
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON)
}

function editData(e) {
  let lock = LockService.getScriptLock();
  lock.tryLock(10000);
  if (lock.hasLock()) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("รายการ");
    let work_id = e.parameter.work_id
    let finder = sheet.getRange("A2:A" + SuperScript.getRealLastRow('A', sheet)).createTextFinder(work_id).findNext()
    if (finder == null) return ContentService.createTextOutput(JSON.stringify({ status: 'notfound', text: 'ไม่พบข้อมูลใบงานเลขที่ ' + work_id })).setMimeType(ContentService.MimeType.JSON)
    let row = finder.getRow()
    let editrow = [
      e.parameter.date,
      e.parameter.uuid,
      e.parameter.source,
      e.parameter.sender,
      e.parameter.branch,
      e.parameter.product,
      e.parameter.customer_fname,
      e.parameter.customer_lname,
      e.parameter.customer_nationid,
      e.parameter.customer_age,
      e.parameter.customer_phone,
      e.parameter.customer_lineid,
      e.parameter.customer_province,
      e.parameter.customer_occupation,
      e.parameter.customer_downpayment,
      e.parameter.remark,
    ]
    sheet.getRange(row, 2, 1, editrow.length).setValues([editrow])
    lock.releaseLock();
    if (e.parameter.isSendLine) {
      let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues().flat()
      data = formatData(data)
      let group_id = ss.getSheetByName("Group ID").getDataRange().getValues().reduce((acc, row) => {
        acc[row[0]] = row[1];
        return acc;
      }, {});
      if (group_id[data.branch]) {
        sendMessages(group_id[data.branch], data)
        sheet.getRange(row, 18).removeCheckboxes()
        sheet.getRange(row, 18)
          .setNumberFormat('@')
          .setValue('ส่งไลน์แล้ว')
        sheet.getRange(row, 1, 1, 18).setBackground("lightgreen")
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON)
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON)
}

function saveResponse(e) {
  let lock = LockService.getScriptLock();
  lock.tryLock(10000);
  if (lock.hasLock()) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("รายการ");
    let finder = sheet.getRange("A2:A" + SuperScript.getRealLastRow('A', sheet)).createTextFinder(e.parameter.wid).findNext()
    if (finder == null) return ContentService.createTextOutput(JSON.stringify({ status: 'notfound', text: 'ไม่พบข้อมูลใบงานเลขที่ ' + e.parameter.wid })).setMimeType(ContentService.MimeType.JSON)
    let row = finder.getRow()
    let update_row = [
      e.parameter.status,
      e.parameter.sell_price,
      e.parameter.contract_no,
      new Date(e.parameter.close_date),
      e.parameter.seller
    ]
    sheet.getRange(row, 19, 1, update_row.length).setValues([update_row])
    sheet.getRange(row, 22).setNumberFormat('dd/MM/yyyy')
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON)
  }
}

function getUpdateData(e) {
  let { branch, wid, role } = e.parameter
  console.log(branch)
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("รายการ");
  let finder = sheet.getRange("A2:A" + SuperScript.getRealLastRow('A', sheet)).createTextFinder(wid).findNext()
  if (finder == null) return ContentService.createTextOutput(JSON.stringify({ status: 'notfound', text: 'ไม่พบข้อมูลใบงานเลขที่ ' + wid })).setMimeType(ContentService.MimeType.JSON)
  let row = finder.getRow()
  let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues().flat()
  data = formatData(data)
  if (data.branch != branch && role != 'admin') {
    return ContentService.createTextOutput(JSON.stringify({ status: 'noauth', text: 'ไม่สามารถแก้ไขข้อมูลใบงานเลขที่ ' + wid + ' ได้ เนื่องจากสาขาของ User ไม่ตรงกับงาน', data, e_data: e.parameter })).
      setMimeType(ContentService.MimeType.JSON)
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data })).setMimeType(ContentService.MimeType.JSON)
}

function getTableData(e) {
  let { uuid, role } = e.parameter
  // let uuid = 'b170fd86-26f7-415e-9d25-eabb926abce3'
  // let role = 'admin'
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("รายการ");
  let data = sheet.getRange("A2:V" + SuperScript.getRealLastRow('A', sheet)).getValues().slice(1)
    .filter(row => row[1] != "")
    .filter(row => role == 'admin' || row[2] == uuid)
    .map(row => {
      return formatData(row)
    })
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data })).setMimeType(ContentService.MimeType.JSON)
}

function formatData(row) {
  return {
    work_id: row[0],
    date: row[1] != '' ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd') : '',
    source: row[3],
    sender: row[4],
    branch: row[5],
    product: row[6],
    remark: row[16],
    status: row[18],
    sell_price: row[19],
    contract_no: row[20],
    close_date: row[21] != '' ? Utilities.formatDate(row[21], 'GMT+7', 'yyyy-MM-dd') : '',
    seller: row[22],
    customer: {
      fname: row[7],
      lname: row[8],
      nationid: row[9],
      age: row[10],
      phone: row[11],
      lineid: row[12],
      province: row[13],
      occupation: row[14],
      downpayment: row[15],
    }
  }
}

// function to re-send message if no update in 2 days
function checkUpdate() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("รายการ");
  let group_id = ss.getSheetByName("Group ID").getDataRange().getValues().reduce((acc, row) => {
    acc[row[0]] = row[1];
    return acc;
  }, {});
  let data = sheet.getRange("A2:W" + SuperScript.getRealLastRow('A', sheet)).getValues().slice(1)
    .filter(row => row[16] == 'ส่งไลน์แล้ว' && row[20] == '' && getDiffDate(row[1]) > 2)
    .map(row => {
      return formatData(row)
    })
  data.forEach(e => {
    if (group_id[e.branch]) {
      sendMessages(group_id[e.branch], e, true)
    }
  })
}

// function to summary data for each branch only not update
function summaryData() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("รายการ");
  let group_id = ss.getSheetByName("Group ID").getDataRange().getValues().slice(1).reduce((acc, row) => {
    acc[row[0]] = row[1];
    return acc;
  }, {});
  let data = sheet.getRange("A2:V" + SuperScript.getRealLastRow('A', sheet)).getValues().slice(1)
    .filter(row => row[17] == 'ส่งไลน์แล้ว' && row[21] == '')
    .map(row => {
      return formatData(row)
    })
  let group_data = Object.groupBy(data, (e) => e.branch)
  let message = `⚠️⚠️สรุปงานค้างรายสาขา⚠️⚠️
    📆วันที่ ${Utilities.formatDate(new Date(), 'GPT+&', 'dd/MM/yyyy')}\n`
  Object.keys(group_data).sort().forEach(branch => {
    message += `\n ${branch} = ${group_data[branch].length} งาน`
  })
  LineBotWebhook.push(Object.values(group_id)[0], LINE_ACCESS_TOKEN, [{ type: 'text', text: message }])
}
