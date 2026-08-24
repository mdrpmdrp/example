Logger = BetterLog.useSpreadsheet()
function doPost(e) {
  try {
    let opt = e.parameter.opt
    if (opt == 'submit') return submit(e)
    if (opt == 'submittest') return submittest(e)
    if (opt == 'sendLineNotify') return sendNotify(e)
    if (opt == 'sendLineNotifyTest') return sendNotifyTest(e)
    if (opt == 'save_remark') return saveRemark(e)
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid opt' })).setMimeType(ContentService.MimeType.JSON)
  } catch (error) {
    Logger.log(error)
  }

}

function doGet(e) {
  e = { parameter: { opt: 'get_last'} }
  if (e.parameter.opt == 'get_last') {
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let sh = ss.getSheetByName('Query  Last')
    if (!sh) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid form' })).setMimeType(ContentService.MimeType.JSON)
    let data = sh.getDataRange().getValues().filter(r => r[1] != '')
    let lastData = {}
    while (data.length > 0) {
        let [headers, ...rows] = data.splice(0, 2)
        if(rows.length > 0){
            lastData[headers[0]] = rows[rows.length - 1].reduce((acc, value, index) => {
                acc[headers[index]] = value
                return acc
            }, {})
        }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: lastData, tg: '7961993233:AAEPc4HcJa6t9C1-mDh8qB3herAEs90JtUU'})).setMimeType(ContentService.MimeType.JSON)
  }
  let html = HtmlService.createTemplateFromFile('index')
  return html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')

}

function getFormSheet(ss, name) {
  switch (name) {
    case 'med-gas-checklist':
      sheet = ss.getSheetByName('med gas')
      break;
    case 'stockroom-checklist':
      sheet = ss.getSheetByName('stock room')
      break;
    case 'liquid-nitrogen-checklist':
      sheet = ss.getSheetByName('liquid nitrogen stock room')
      break;
    case 'embryology-statusroom-checklist':
      sheet = ss.getSheetByName('Embryology status room')
      break;
    case 'embryology-embryo-checklist':
      sheet = ss.getSheetByName('Embryology embryo culture')
      break;
    case 'embryology-refrigerator-checklist':
      sheet = ss.getSheetByName('Embryology refrigerator')
      break;
    case 'embryology-incubator-checklist':
      sheet = ss.getSheetByName('Embryology incubator')
      break;
    case 'andrology-statusroom-checklist':
      sheet = ss.getSheetByName('Andrology status room')
      break;
    case 'andrology-refrigerator-checklist':
      sheet = ss.getSheetByName('Andrology refrigerator')
      break;
    case 'andrology-incubator-checklist':
      sheet = ss.getSheetByName('Andrology incubator')
      break;
    default:
      sheet = false
      break;
  }
  return sheet
}

function createSheet(e, ss) {
  let name = e.parameter.form
  let sheet
  switch (name) {
    case 'med-gas-checklist':
      sheet = ss.insertSheet('med gas')
      break;
    case 'stockroom-checklist':
      sheet = ss.insertSheet('stock room')
      break;
    case 'liquid-nitrogen-checklist':
      sheet = ss.insertSheet('liquid nitrogen stock room')
      break;
    case 'embryology-statusroom-checklist':
      sheet = ss.insertSheet('Embryology status room')
      break;
    case 'embryology-embryo-checklist':
      sheet = ss.insertSheet('Embryology embryo culture')
      break;
    case 'embryology-refrigerator-checklist':
      sheet = ss.insertSheet('Embryology refrigerator')
      break;
    case 'embryology-incubator-checklist':
      sheet = ss.insertSheet('Embryology incubator')
      break;
    case 'andrology-statusroom-checklist':
      sheet = ss.insertSheet('Andrology status room')
      break;
    case 'andrology-refrigerator-checklist':
      sheet = ss.insertSheet('Andrology refrigerator')
      break;
    case 'andrology-incubator-checklist':
      sheet = ss.insertSheet('Andrology incubator')
      break;
    default:
      sheet = false
      break;
  }
  let headers = Object.keys(e.parameter)
  headers.unshift('timestamp')
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
}

function submit(e) {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = getFormSheet(ss, e.parameter.form)
  let headers
  if (!sheet) sheet = createSheet(e, ss)
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid form' })).setMimeType(ContentService.MimeType.JSON)
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  let newrow = [...headers.map(a => {
    if (!e.parameter[a]) e.parameter[a] = ''
    if (e.parameter[a].toString() == "TRUE") e.parameter[a] = '✓'
    return e.parameter[a]
  })]
  newrow[0] = new Date()
  sheet.getRange(sheet.getLastRow() + 1, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss')
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, newrow.length).setValues([newrow])
  // let triggers = ScriptApp.getProjectTriggers()
  // triggers.forEach(trigger => {
  //   if (trigger.getHandlerFunction() == 'sendDashboard') ScriptApp.deleteTrigger(trigger)
  // })
  // // create Trigger
  // ScriptApp.newTrigger('sendDashboard').timeBased().at(new Date(new Date().getTime() + (1000 * 60 * 16))).create()
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data submitted' })).setMimeType(ContentService.MimeType.JSON)
}
function submittest(e) {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = getFormSheet(ss, e.parameter.form)
  let headers
  if (!sheet) sheet = createSheet(e, ss)
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid form' })).setMimeType(ContentService.MimeType.JSON)
  headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  let newrow = [...headers.map(a => {
    if (!e.parameter[a]) e.parameter[a] = ''
    if (e.parameter[a].toString() == "TRUE") e.parameter[a] = '✓'
    return e.parameter[a]
  })]
  newrow[0] = new Date()
  let targetRow = sheet.getLastRow() + 1
  let shiftValue = (e.parameter.shift || '').toString()
  let shiftCol = headers.indexOf('shift')
  let todayKey = Utilities.formatDate(newrow[0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
  let lastRow = sheet.getLastRow()
  let lastCol = sheet.getLastColumn()
  if (lastRow > 1) {
    let scanStartRow = Math.max(2, lastRow - 19)
    let scanRows = lastRow - scanStartRow + 1
    // Check only recent rows so duplicate handling stays fast.
    let recentRows = sheet.getRange(scanStartRow, 1, scanRows, lastCol).getValues()
    for (let i = recentRows.length - 1; i >= 0; i--) {
      let row = recentRows[i]
      let rowDate = row[0] instanceof Date ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd') : ''
      if (rowDate && rowDate < todayKey) break
      if (rowDate == todayKey && shiftCol >= 0 && (row[shiftCol] || '').toString() == shiftValue) {
        targetRow = scanStartRow + i
        break
      }
    }
  }
  sheet.getRange(targetRow, 1).setNumberFormat('dd/mm/yyyy hh:mm:ss')
  sheet.getRange(targetRow, 1, 1, newrow.length).setValues([newrow])
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data submitted' })).setMimeType(ContentService.MimeType.JSON)
}

function sendDashboard() {
  return
  // https://lookerstudio.google.com/embed/reporting/1294e79e-cc4e-43a8-8c40-7ca259c65cc9/page/V9LZD
  let url = 'https://api.screenshotone.com/take?access_key=E7jIMIIm6awBuw&url=https%3A%2F%2Flookerstudio.google.com%2Fembed%2Freporting%2F1294e79e-cc4e-43a8-8c40-7ca259c65cc9%2Fpage%2FV9LZD&viewport_width=2000&viewport_height=2600&device_scale_factor=2&format=png&block_ads=true&block_cookie_banners=true&block_trackers=true&delay=30&cache=false&timeout=90'
  let response = UrlFetchApp.fetch(url)
  const max_retry = 3
  let retry = 0
  while (response.getResponseCode() != 200 && retry < max_retry) {
    response = UrlFetchApp.fetch(url)
    retry++
  }
  if (response.getResponseCode() != 200) {
    NotifyApp.sendNotify('113333555555', 'Error: ไม่สามารถสร้าง Dashboard ของ Medical Gas ART ได้ กรุณาตรวจสอบอีกครั้ง')
  } else {
    response = response.getBlob()
    // insert file and share public
    let img = Drive.Files.insert({ title: 'dashboard', mimeType: 'image/png' }, response)
    Drive.Permissions.insert({ 'role': 'reader', 'type': 'anyone' }, img.id)
    let token = "N3nCfqab0hWo7ijw0opz3tH8a1itm8Jm2JGnAJZHL3i"
    //  let token = "113333555555"
    NotifyApp.sendNotify(token, '\n📊 สรุปผลการตรวจเช็ค Medical Gas ART ประจำวันที่ ' + Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy') + '\n\nดูรายการแบบละเอียดได้ที่\nhttps://lookerstudio.google.com/embed/reporting/1294e79e-cc4e-43a8-8c40-7ca259c65cc9/page/V9LZD', DriveApp.getFileById(img.id).getBlob())
    DriveApp.getFileById(img.id).setTrashed(true)
  }
  deleteTrigger('sendDashboard')
}

function sendToTrash() {
  let prop = PropertiesService.getScriptProperties()
  let id = prop.getProperty('img2Trashed_art')
  if (id != null) Drive.Files.trash(id)
  deleteTrigger('sendToTrash')
}


function deleteTrigger(name = 'sendDashboard') {
  let triggers = ScriptApp.getProjectTriggers()
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() == name) ScriptApp.deleteTrigger(trigger)
  })
  let next_trig = PropertiesService.getScriptProperties().getProperty('next_trig')
  if (next_trig == null) next_trig = new Date(2024, 0, 5, 12, 0, 0)
  else next_trig = new Date(next_trig)
  ScriptApp.newTrigger('sendDashboard').timeBased().at(new Date(next_trig)).create()
  let hour = new Date(next_trig).getHours()
  if (hour == 12) {
    next_trig.setHours(18)
  }
  else {
    next_trig.setHours(12)
    next_trig.setDate(next_trig.getDate() + 1)
  }
  PropertiesService.getScriptProperties().setProperty('next_trig', next_trig)
}

function sendNotify(e) {
  let { msg } = e.parameter
  // let today = Utilities.formatDate(new Date(), 'GMT+7', '📆 วันที่ dd/MM/yyyy')
  // let now = Utilities.formatDate(new Date(), 'GMT+7', '⌚ เวลา HH:mm น.')
  // msg = '\n' + today + '\n' + now + '\n\n' + msg
  let token = "N3nCfqab0hWo7ijw0opz3tH8a1itm8Jm2JGnAJZHL3i"
  NotifyApp.sendNotify(token, msg)
  // NotifyApp.sendNotify('113333555555', msg)
}
function sendNotifyTest(e) {
  let { msg } = e.parameter
  let token = "N3nCfqab0hWo7ijw0opz3tH8a1itm8Jm2JGnAJZHL3i"
  NotifyApp.sendNotify(token, msg)
  // NotifyApp.sendNotify('113333555555', msg)
  return ContentService.createTextOutput('success').setMimeType(ContentService.MimeType.JSON)
}

function saveRemark(e) {
  let sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Remarks')
  let { co2_1, co2_2, n2 } = e.parameter
  sh.getRange(sh.getLastRow() + 1, 1, 1, 7).setNumberFormats([['dd/MM/yyyy, HH:mm:ss', '#', '#', '#', '@', '@', '@']]).setValues([[new Date(), new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate(), co2_1, co2_2, n2]])
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data submitted' })).setMimeType(ContentService.MimeType.JSON)
}

function temp() {
  let sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('med gas')
  let range = sh.getRange('T4:T62')
  let data = []
  for (let i = 0; i < 59; i++) {
    // random increase number
    let last = data[i - 1] ? data[i - 1][0] : 5
    let randomNum = Math.floor(Math.random() * 2) + last
    data.push([randomNum])
    // let min = 55
    // let max = 75
    // let distance = 0.1
    // let randomNum = Math.floor(Math.random() * ((max - min) / distance)) * distance + min
    // data.push([randomNum])
  }
  range.setValues(data)
}

function getCharts(range) {
  let charts = SpreadsheetApp.getActiveSheet().getCharts()
  let chart_obj = {}
  charts.forEach(chart => {
    chart_obj[chart.getOptions().get('title')] = convertBlobToDataURL(chart.getAs('image/png'))
  })
  // Logger.log(Object.keys(chart_obj))
  return chart_obj

}

function convertBlobToDataURL(blob) {
  let base64 = Utilities.base64Encode(blob.getBytes())
  return 'data:' + blob.getContentType() + ';base64,' + base64
}

function convertDataURItoBlob(dataURI, name) {
  let type = (dataURI.split(";")[0]).replace('data:', '');
  let imageUpload = Utilities.base64Decode(dataURI.split(",")[1]);
  let blob = Utilities.newBlob(imageUpload, type, name);
  return blob
}
