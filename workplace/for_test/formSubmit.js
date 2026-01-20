// Cache template files and frequently used objects
const TEMPLATES = {
  BAXTER: DriveApp.getFileById('1PeC9jUHSChq3FEaR98SvlBH52mkwIU9P-BBoFHWjAAc'),
  BENNETT840: DriveApp.getFileById('17euVsXQOTdZ-ehQ0UfjowUmILgSDa05s05oHzJWjxyQ')
}

const FOLDER_CACHE = {}

function onFormSubmit(e) {
  let lock = LockService.getScriptLock()
  const sheetName = e.range.getSheet().getName()
  const functionName = 'create_file_for_' + sheetName.toLowerCase().replace(/ /g, '')

  if (!lock.tryLock(30000)) {

    let trigger = ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === functionName + '_manual')
    if (!trigger) {
      ScriptApp.newTrigger(functionName + '_manual')
        .timeBased()
        .after(1 * 60 * 1000)
        .create()
    }
    Logger.log('Could not obtain lock after 30 seconds.')
    return
  }

  if (typeof this[functionName] === 'function') {
    this[functionName](e)
  } else {
    Logger.log('function not found')
  }
  lock.releaseLock()
}


function create_file_for_baxter(e) {
  const obj = e.namedValues
  const row = e.range.getRow()
  const folder = getCachedFolder('BAXTER')
  const file = createFileInDateFolder(TEMPLATES.BAXTER, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])
  populateBaxterWorksheet(file, obj, row)
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('baxter')
  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  sheet.getRange(row, headers.indexOf('สร้างไฟล์แล้ว') + 1).setValue('done')

}

function testCreaeFileForBaxter() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName('baxter')
  let data = sheet.getDataRange().getValues()
  let headers = data.shift()
  data = data.at(-1)
  let obj = {}
  headers.forEach((header, index) => {
    obj[header] = data[index]
  })
  const folder = getCachedFolder('BAXTER')
  const file = createFileInDateFolder(TEMPLATES.BAXTER, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])
  populateBaxterWorksheet(file, obj)

}

function create_file_for_bennett840(e) {
  const obj = e.namedValues
  const row = e.range.getRow()
  const folder = getCachedFolder('BENNETT 840')
  const file = createFileInDateFolder(TEMPLATES.BENNETT840, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])

  populateBennett840Worksheet(file, obj, row)
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('bennett 840')
  let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  sheet.getRange(row, headers.indexOf('สร้างไฟล์แล้ว') + 1).setValue('done')
}

function create_file_for_baxter_manual() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName('baxter')
  let data = sheet.getDataRange().getValues()
  let headers = data.shift()
  let alreadyCreateFileIdx = headers.indexOf('สร้างไฟล์แล้ว')
  data.forEach((row, i) => {
    if (row[alreadyCreateFileIdx] === 'done') {
      return
    }
    let obj = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })
    const folder = getCachedFolder('BAXTER')
    const file = createFileInDateFolder(TEMPLATES.BAXTER, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])
    populateBaxterWorksheet(file, obj)
    sheet.getRange(i+2, headers.indexOf('สร้างไฟล์แล้ว') + 1).setValue('done')
  })

  // Remove the trigger after execution
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'create_file_for_baxter_manual').forEach(t => ScriptApp.deleteTrigger(t))
}

function create_file_for_bennett840_manual() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName('BENNETT 840')
  let data = sheet.getDataRange().getValues()
  let headers = data.shift()
  let alreadyCreateFileIdx = headers.indexOf('สร้างไฟล์แล้ว')
  data.forEach((row, i) => {
    if (row[alreadyCreateFileIdx] === 'done') {
      return
    }
    let obj = {}
    headers.forEach((header, index) => {
      obj[header] = row[index]
    })
    const folder = getCachedFolder('BENNETT 840')
    const file = createFileInDateFolder(TEMPLATES.BENNETT840, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])
    populateBennett840Worksheet(file, obj)
    sheet.getRange(i+2, headers.indexOf('สร้างไฟล์แล้ว') + 1).setValue('done')
  })
  // Remove the trigger after execution
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'create_file_for_bennett840_manual').forEach(t => ScriptApp.deleteTrigger(t))
}

function getCachedFolder(folderName) {
  if (!FOLDER_CACHE[folderName]) {
    const BASE_FOLDER = DriveApp.getFolderById('1V-I_9WnznKXKQ0WzHND66pcMRAtDM6Nh')
    FOLDER_CACHE[folderName] = BASE_FOLDER.getFoldersByName(folderName).next()
  }
  return FOLDER_CACHE[folderName]
}

function createFileInDateFolder(template, baseFolder, fileName, timestamp) {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp || Date.now())
  const monthKey = Utilities.formatDate(d, 'GMT+7', 'yyyy-MM')
  const dateKey = Utilities.formatDate(d, 'GMT+7', 'dd-MM-yyyy')

  const monthFolder = getFolder(baseFolder, monthKey)
  const dateFolder = getFolder(monthFolder, dateKey)

  return template.makeCopy(fileName, dateFolder)
}

function populateBaxterWorksheet(file, obj) {
  const sheet = SpreadsheetApp.openById(file.getId())
  const worksheet = sheet.getSheetByName(obj['Service Engineer']) ||
    sheet.getSheetByName('ANUPHAB CHANTO')
  // remove other sheets
  sheet.getSheets().forEach(s => {
    if (s.getName() !== worksheet.getName()) {
      sheet.deleteSheet(s)
    }
  })

  let headers = worksheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]

  // Batch all single cell updates
  const singleUpdates = {
    'E7': obj['ME Code'],
    'G8': obj['หมายเลขเครื่อง (Serial Number)'],
    'G9': obj['วันรับเครื่องคืน (Date received)'],
    'H11': obj['ชื่อหน่วยงานที่คืนเครื่อง (Customer Name)'],
    'F30': obj['หมายเหตุ']
  }

  // Apply single updates in batch
  Object.entries(singleUpdates).forEach(([range, value]) => {
    worksheet.getRange(range).setValue(value)
  })

  // Set date checking values in one operation
  if(typeof obj['วันตรวจสอบ (Date of checking)'] === 'string'){
    obj['วันตรวจสอบ (Date of checking)'] = new Date(obj['วันตรวจสอบ (Date of checking)'])
  }
  let date_checking = Utilities.formatDate((obj['วันตรวจสอบ (Date of checking)']), "GMT+7", "dd/MM/yyyy")
  worksheet.getRangeList(['G9', 'G10', 'F37', 'K37']).setValue("'" + date_checking)

  // Process checkbox arrays more efficiently
  const checkboxData1 = [
    ' [ทำความสะอาดเครื่อง]', ' [เช็คแบตเตอรี่]', ' [Test Key Pad]',
    ' [สวิทซ์ปิด-เปิดเครื่อง (Electronic Socket)]', ' [สายไฟ (Power cord)]',
    ' [Test Sound]', ' [Bright Screen]', ' [Cover]',
    ' [ที่เก็บสายไฟ Power cord]', ' [สถานะไฟ Charge]'
  ].map(key => getResult(obj[key]))

  worksheet.getRange('B16:B25').setValues(checkboxData1)
  worksheet.getRange('D16:D25').setValues(checkboxData1.map(r => [r[0] === 'TRUE' ? 'FALSE' : 'TRUE']))

  const checkboxData2 = [
    ' [Safe Alarm Test 1]', ' [Safe Alarm Test 2]', ' [Safe Alarm Test 3]',
    ' [Safe Alarm Test 4]', ' [Safe Alarm Test 5]', ' [Safe Alarm Test 6]',
    ' [สติ๊กเกอร์สายไฟ]', ' [การทำงานของเครื่อง]'
  ].map(key => getResult(obj[key]))

  worksheet.getRange('I16:I23').setValues(checkboxData2)
  worksheet.getRange('K16:K23').setValues(checkboxData2.map(r => [r[0] === 'TRUE' ? 'FALSE' : 'TRUE']))

  const result = getResult2(obj['จากการตรวจสอบ สามารถสรุปได้ว่าเครื่องอยู่ในสภาพ'])
  worksheet.getRange(result).setValue('TRUE')
  SpreadsheetApp.flush()
}

function populateBennett840Worksheet(file, obj) {
  const sheet = SpreadsheetApp.openById(file.getId())
  const worksheet = sheet.getSheetByName(obj['Service Engineer']) ||
    sheet.getSheetByName('ANUPHAB CHANTO')
  // remove other sheets
  sheet.getSheets().forEach(s => {
    if (s.getName() !== worksheet.getName()) {
      sheet.deleteSheet(s)
    }
  })

  let headers = worksheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
  // Batch single cell updates
  const singleUpdates = {
    'E7': obj['ME Code'],
    'G8': obj['หมายเลขเครื่อง (Serial Number)'],
    'G9': obj['วันรับเครื่องคืน (Date received)'],
    'H11': obj['ชื่อหน่วยงานที่คืนเครื่อง (Customer Name)'],
    'F16': obj['ชั่วโมงการทำงาน'],
    'F17': obj['วันที่ตรวจสอบ EST ล่าสุด'],
    'M17': obj['วันที่ตรวจสอบ SST ล่าสุด'],
    'F33': obj['หมายเหตุ']
  }

  Object.entries(singleUpdates).forEach(([range, value]) => {
    worksheet.getRange(range).setValue(value)
  })

  if(typeof obj['วันตรวจสอบ (Date of checking)'] === 'string'){
    obj['วันตรวจสอบ (Date of checking)'] = new Date(obj['วันตรวจสอบ (Date of checking)'])
  }
  let date_checking = Utilities.formatDate((obj['วันตรวจสอบ (Date of checking)']), "GMT+7", "dd/MM/yyyy")
  worksheet.getRangeList(['G9', 'G10', 'F40', 'K40']).setValue("'" + date_checking)
  const checkboxData1 = [
    ' [Monitor]', ' [Cover]', ' [สวิทช์ปิด-เปิดเครื่อง (Electruc socket)]',
    ' [สายไฟ (Power cord)]', ' [เก็บสายไฟ Power cord]', ' [สาย OXYGEN]',
    ' [สาย AIR]', ' [สถานะไฟ Charge Battery สำรอง]', ' [EST]'
  ].map(key => getResult(obj[key]))

  worksheet.getRange('B19:B27').setValues(checkboxData1)
  worksheet.getRange('D19:D27').setValues(checkboxData1.map(r => [r[0] === 'TRUE' ? 'FALSE' : 'TRUE']))

  const checkboxData2 = [
    ' [SST]', ' [Humidifier]', ' [UPS]', ' [ล้อ]', ' [สติ๊กเกอร์สายไฟ]', ' [การทำงานของเครื่อง]'
  ].map(key => getResult(obj[key]))

  worksheet.getRange('I19:I24').setValues(checkboxData2)
  worksheet.getRange('K19:K24').setValues(checkboxData2.map(r => [r[0] === 'TRUE' ? 'FALSE' : 'TRUE']))

  const result = getResult2(obj['จากการตรวจสอบ สามารถสรุปได้ว่าเครื่องอยู่ในสภาพ'])
  worksheet.getRange(result).setValue('TRUE')
  SpreadsheetApp.flush()
}

function getFolder(root, name) {
  const cacheKey = `${root.getId()}_${name}`
  if (FOLDER_CACHE[cacheKey]) {
    return FOLDER_CACHE[cacheKey]
  }

  let folder = root.getFoldersByName(name)
  if (!folder.hasNext()) {
    folder = root.createFolder(name)
  } else {
    folder = folder.next()
  }

  FOLDER_CACHE[cacheKey] = folder
  return folder
}

function getResult(res) {
  return res === 'YES' ? ['TRUE'] : ['FALSE']
}

function getResult2(res) {
  const resultMap = {
    'สมบูรณ์ (Complete)': 'D32',
    'ไม่สมบูรณ์ (Non-Complete)': 'G32',
    'ปรับปรุง (Improve)': 'I32'
  }
  return resultMap[res[0]] || 'D32'
}


function recheckDateInFiles() {
  const createTrigger = () => {
    let trigger = ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === 'recheckDateInFiles')
    if (!trigger) {
      ScriptApp.newTrigger('recheckDateInFiles')
        .timeBased()
        .after(1 * 60 * 1000)
        .create()
    }
  }

  const deleteTrigger = () => {
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'recheckDateInFiles').forEach(t => ScriptApp.deleteTrigger(t))
  }
  try {
    const BASE_FOLDER = DriveApp.getFolderById('1V-I_9WnznKXKQ0WzHND66pcMRAtDM6Nh')
    let RECENT_ROW = PropertiesService.getScriptProperties().getProperty('RECENT_ROWS') || '2'
    Logger.log('Starting recheck from row: ' + RECENT_ROW)
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let sheetName = PropertiesService.getScriptProperties().getProperty('SHEET_NAME') || 'BAXTER'
    let folder = BASE_FOLDER.getFoldersByName(sheetName).next()
    let mainSheet = ss.getSheetByName(sheetName)
    let data = mainSheet.getRange(RECENT_ROW, 1, 200, mainSheet.getLastColumn()).getValues()
    let headers = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0]
    if (data.filter(row => row[0] !== '' && row[headers.indexOf('สร้างไฟล์แล้ว')] === '').length === 0) {
      Logger.log('No more rows to process. Exiting.')
      PropertiesService.getScriptProperties().deleteProperty('RECENT_ROWS')
      if (sheetName === 'BAXTER') {
        PropertiesService.getScriptProperties().setProperty('SHEET_NAME', 'BENNETT 840')
        createTrigger()
      } else {
        PropertiesService.getScriptProperties().deleteProperty('SHEET_NAME')
        deleteTrigger()
      }
      return
    }
    let dateColIndex = headers.indexOf('วันตรวจสอบ (Date of checking)')
    let meCodeColIndex = headers.indexOf('ME Code')
    RECENT_ROW = parseInt(RECENT_ROW)
    data.forEach((row, index) => {
      RECENT_ROW++
      if (row[0] === '') {
        return
      }
      let dateValue = row[dateColIndex]
      let meCodeValue = row[meCodeColIndex]
      if (dateValue instanceof Date && meCodeValue) {
        let dateText = Utilities.formatDate(dateValue, 'GMT+7', 'dd-MM-yyyy').split('-').map(Number).join('-')
        dateFolder = getFolder(getFolder(folder, Utilities.formatDate(dateValue, 'GMT+7', 'yyyy-MM')), Utilities.formatDate(dateValue, 'GMT+7', 'dd-MM-yyyy'))
        Logger.log(`Checking ME Code: ${meCodeValue} in folder: ${dateFolder.getName()}`)
        let files = dateFolder.getFilesByName(meCodeValue.toString())
        while (files.hasNext()) {
          let file = files.next()
          let sheet
          try {
            sheet = SpreadsheetApp.openById(file.getId())
          } catch (e) {
            Logger.log('Error opening file: ' + e.message)
            continue
          }
          let worksheet = sheet.getSheets()
          let keepsheet
          let checkList_worksheet = worksheet.filter(ws => {
            let cellRange = ws.getRange('G10')
            let cell = cellRange.getDisplayValue()
            return cell.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)
          })

          worksheet.forEach(ws => {
            let cellRange = ws.getRange('G10')
            let cell = cellRange.getDisplayValue()
            if (cell.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
              cell = cell.split('/').map(Number).join('-')
              if (cell === dateText || Utilities.formatDate(new Date(cell), 'GMT+7', 'dd-MM-yyyy') === dateText) {
                keepsheet = ws.getName()
              } else if (checkList_worksheet.length === 1) {
                ws.getRangeList(['G10', 'F37', 'K37']).setValue(dateValue)
                keepsheet = ws.getName()
              }
            }
          })
          if (keepsheet) {
            sheet.getSheets().forEach(s => {
              if (s.getName() !== keepsheet) {
                sheet.deleteSheet(s)
              }
            })
            mainSheet.getRange((index + 2), headers.indexOf('สร้างไฟล์แล้ว') + 1).setValue('done')
            Logger.log(`✅✅ Done checking ME Code: ${meCodeValue} in file: ${file.getName()}`)
            PropertiesService.getScriptProperties().setProperty('RECENT_ROWS', RECENT_ROW.toString())
          }
        }
      }
    })

  } catch (e) {
    deleteTrigger()
    Logger.log('Error occurred: ' + e.message)
    return
  } finally {
    // Remove the trigger after execution
    ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'recheckDateInFiles').forEach(t => ScriptApp.deleteTrigger(t))
    let trigger = ScriptApp.getProjectTriggers().find(t => t.getHandlerFunction() === 'recheckDateInFiles')
    if (!trigger) {
      ScriptApp.newTrigger('recheckDateInFiles')
        .timeBased()
        .after(1 * 60 * 1000)
        .create()
    }
  }
}

function reCreateBaxterFile(){
  try{
    create_file_for_baxter_manual()
  }catch(e){
    Logger.log('Error occurred: ' + e.message)
  }
}

function testCreateBaxterFile(){
  let form = FormApp.openById('1JMKlmjHdyxIzoxK-WjogkGFn7OqG0TYTymrG0yJ2ivw')
  let responses = form.getResponses()
  let lastResponse = responses[responses.length -1]
  let obj = lastResponse.getItemResponses().reduce((acc, curr) => {
    acc[curr.getItem().getTitle()] = curr.getResponse()
    return acc
  }, {})
  // const folder = getCachedFolder('BAXTER')
  // const file = createFileInDateFolder(TEMPLATES.BAXTER, folder, obj['ME Code'].toString(), obj['ประทับเวลา'])
  populateBaxterWorksheet(file, obj)
}