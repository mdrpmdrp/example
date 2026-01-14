function onOpen() {
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .createMenu('Custom Menu')
    .addItem('Update Vender Details', 'showSidebar')
    .addItem('New Month Sheet', 'newMonthSheet')
    .addItem('Update Month Sheet', 'updateMonthSheet')
    .addSeparator()
    .addItem('SORT', 'sortSheetRange')
    .addSeparator()
    .addItem('Upload PM Plan', 'showUploadPMPage')
    .addItem('Upload Cal Plan', 'showUploadCalPage')
    .addItem('Upload Equipment Data', 'showUploadEquipment')
    .addSeparator()
    .addItem('Re-Initialize SpreadSheet', 'reInitializeSpreadheet')
    //.addItem('Rename Sheets 2022 to 2023', 'renameSheets')
    .addToUi();
}

function sortSheets() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheetNameArray = [];
  var sheets = ss.getSheets();

  if (sheets.length <= 2) {
    return;
  }

  for (var i = 0; i < sheets.length; i++) {
    sheetNameArray.push(sheets[i].getName());
  }

  sheetNameArray.sort();

  for (var j = 0; j < sheetNameArray.length; j++) {
    ss.setActiveSheet(ss.getSheetByName(sheetNameArray[j]));
    ss.moveActiveSheet(j + 1);
  }
}

function renameSheets() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheetNameArray = [];
  var sheets = ss.getSheets();

  sheets.forEach(sh => {
    if (sh.getName().indexOf('2022') > -1) sh.setName(sh.getName().replace('2022', '2023'))
  })
}

function newMonthSheet() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheets = ss.getSheets()
    .map(sheet => {
      let name = sheet.getName()
      let id = sheet.getSheetId()
      return { sheet, name, id }
    }).filter(sheet => sheet.name.indexOf('vender') > -1).sort((a, b) => -1 * a.name.localeCompare(b.name))
  let lastest_month = Number(sheets[0].name.split(' ')[1].split('/')[0])
  let new_month = lastest_month + 1
  let new_sheet = sheets[0].sheet.copyTo(ss)
  sheets[0].sheet.getDataRange().copyTo(new_sheet.getRange(sheets[0].sheet.getDataRange().getA1Notation()), SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false)
  new_sheet.getRange('Y1').setValue(new_month)
  new_sheet.setName('vender ' + ('00' + new_month).slice(-2) + "/" + new Date().getFullYear())
  new_sheet.activate()
  new_sheet.getRangeList(['A2:J', 'M2:N', 'P2:U']).clearContent()
}

function updateMonthSheet() {
  let page = HtmlService.createTemplateFromFile('updateMonthSheet')
  page.sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(sh => sh.getName()).filter(name => name.indexOf('vender') == 0)
  page = page.evaluate().setTitle('Update Month Sheet').setWidth(500)
  SpreadsheetApp.getUi().showModalDialog(page, 'Update Month Sheet')
}

function SHEETNAME() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
}

function showUploadPMPage() {
  let page = HtmlService.createTemplateFromFile('uploadPM').evaluate().setTitle('Upload PM').setHeight(500)
  SpreadsheetApp.getUi().showModalDialog(page, 'Upload PM');
}

function showUploadCalPage() {
  let page = HtmlService.createTemplateFromFile('uploadCal').evaluate().setTitle('Upload Cal').setHeight(500)
  SpreadsheetApp.getUi().showModalDialog(page, 'Upload Cal')
}

function showUploadEquipment() {
  let page = HtmlService.createTemplateFromFile('uploadEquipment').evaluate().setTitle('Upload Equipment').setHeight(500)
  SpreadsheetApp.getUi().showModalDialog(page, 'Upload Equipment')
}

function importData(data, sheetname, start, length, isLast) {
  Logger.log(`importData to ${sheetname} at ${start} length ${length} isLast:${isLast}`)
  data = JSON.parse(data)
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(sheetname)
  let range = sheet.getRange(start, 1, length, data[0].length)
  range.clearContent()
  range.setValues(data)
  if (isLast && sheet.getLastRow() > (start + length - 1)) {
    sheet.getRange(start + length, 1, (start + length) - sheet.getLastRow() + 1, sheet.getLastColumn()).clearContent()
  }

}

function sortImportData(sheetname) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetname)
  if (sheetname == 'pm plan') sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).sort(7)
  else sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).sort(15)
  return true
}

function testGetConditionalFormatting() {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName('vender 01/2025')
  let rules = sheet.getConditionalFormatRules()
  rules.forEach(rule => {
    console.log(rule)
  })
}

function updateMonthSheetData(data, sheetName = 'vender 01/2026') {
  data = JSON.parse(data)
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);

  // Get header row safely
  const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if there's data in the sheet
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    // No data in sheet yet, just add the new data
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    sortSheetRange();
    return { old: 0, update: data.length };
  }

  // Get old data once and create lookup map
  const oldDataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const oldData = oldDataRange.getValues().filter(row => row[0] != '');

  // Create hash map for faster lookups
  const oldDataMap = new Map();
  oldData.forEach(row => {
    if (row[0]) oldDataMap.set(row[0], row);
  });

  // Process new data more efficiently
  const processedData = data.map(row => {
    if (row[0] == "") return [false]
    const oldRow = oldDataMap.get(row[0]);

    // Only assign values if old row exists

    row[13] = oldRow ? oldRow[13] : ""
    row[14] = oldRow ? oldRow[14] : ""
    row[17] = oldRow ? oldRow[17] : ""
    row[18] = oldRow ? oldRow[18] : ""
    row[19] = oldRow ? oldRow[19] : ""
    row[20] = oldRow ? oldRow[20] : ""

    // Handle decommission case
    if (row[2] === 'Decommission') {
      row[13] = 'Decommission';
    }

    // Clear these columns regardless
    row[header.indexOf('หมายเหตุ')] = "";
    row[header.indexOf('ระยะสัญญา')] = "";
    row[header.indexOf('Cal & PM')] = "";
    row[21] = "";
    row[22] = "";
    row[23] = "";
    row[24] = "";

    return row;
  }).filter(row => row[0])

  // Use bulk operations to minimize API calls
  // Check if we need to add more rows
  if (lastRow - 1 < processedData.length) {
    // Add enough rows to accommodate the new data
    sheet.insertRowsAfter(lastRow, processedData.length - (lastRow - 1));
  } else if (lastRow - 1 > processedData.length) {
    sheet.deleteRows(processedData.length +1, lastRow - processedData.length)
  }else{
    sheet.getRange(2,1,sheet.getLastRow(),sheet.getLastColumn()).clearContent()
  }
  sheet.getRange(2, 1, processedData.length, processedData[0].length).setValues(processedData);

  sortSheetRange(sheetName);
  return { old: oldData.length, update: processedData.length };
}


function sortSheetRange(sheetname) {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sh
  if (sheetname) {
    sh = ss.getSheetByName(sheetname)
  } else {
    sh = ss.getActiveSheet()
  }
  let header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
  Logger.log(sh.getName())
  sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).sort([header.indexOf('สถานะ') + 1, header.indexOf('วันที่นัด/วันที่ทำ') + 1, header.indexOf('VENDER') + 1, 1]);
}

function reInitializeSpreadheet() {
  // show prompt to insert year of plan
  let ui = SpreadsheetApp.getUi()
  let response = ui.prompt('Re-Initialize SpreadSheet', 'Please enter the year of the plan (e.g., 2024):', ui.ButtonSet.OK_CANCEL)
  if (response.getSelectedButton() != ui.Button.OK) {
    ui.alert('Operation cancelled.')
    return
  }
  let year = response.getResponseText()
  if (!year.match(/^\d{4}$/)) {
    ui.alert('Invalid year format. Please enter a valid year (e.g., 2024).')
    return
  }

  // proceed to reset sheets
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheets = ss.getSheets().map(sh => {
    return {
      name: sh.getName(),
      sheet: sh
    }
  })

  let resetSheets = sheets.filter(sh => sh.name.match(/^vender \d{2}\/\d{4}$/))
  resetSheets.forEach(sh => {
    if (!sh.name.match(/vender 01\/\d{4}/)) {
      ss.deleteSheet(sh.sheet)
      return
    }
    // rename to current year
    let month = sh.name.split(' ')[1].split('/')[0]
    sh.sheet.setName('vender ' + month + '/' + year)
    // set month value in Y1
    sh.sheet.getRange('Y1').setValue(Number(month))
    // clear content except header row
    sh.sheet.getRange(2, 1, sh.sheet.getLastRow() - 1, sh.sheet.getLastColumn()).clearContent()
    // remove row to maximum 50 rows
    if (sh.sheet.getLastRow() > 51) {
      sh.sheet.deleteRows(52, sh.sheet.getLastRow() - 51)
    }
  })
}

function clearSheetData(sheetname = "Sheet1") {
  let ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(sheetname)
  let lastRow = sheet.getLastRow()
  if (lastRow < 2) return true
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent()
  return true
}




















