/**
 * คืนค่า Sheet
 */
function getSheet(sheetName) {
  return SpreadsheetApp.getActive().getSheetByName(sheetName);
}

function withConsoleTiming_(label, fn) {
  var hasConsole = typeof console !== 'undefined' && console && typeof console.time === 'function' && typeof console.timeEnd === 'function';
  if (hasConsole) console.time(label);
  try {
    return fn();
  } finally {
    if (hasConsole) console.timeEnd(label);
  }
}

/**
 * คืนค่าข้อมูลทั้งหมด (ไม่มี Header)
 */
function getData(sheetName) {
  return withConsoleTiming_('server:getData:' + sheetName, function () {
    const sheet = getSheet(sheetName);
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 2) return [];

    return sheet.getRange(
      2,
      1,
      lastRow - 1,
      lastCol
    ).getValues();
  });

}

function generateId(prefix, sheetName, prefixLength = 6) {

  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2)
    return prefix + ( "1".padStart(prefixLength,"0") );

  const lastId = sheet
    .getRange(lastRow,1)
    .getValue();

  const number = parseInt(
      String(lastId).replace(prefix,"")
  );

  return prefix +
      String(number+1).padStart(prefixLength,"0");

}

function appendObject(sheetName,data){

  const sheet=getSheet(sheetName);

  sheet.appendRow(data);

}

function ensureSheetWithHeaders(sheetName, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1565C0")
      .setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    return sheet;
  }

  const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const headerMatches = headers.every(function (header, index) {
    return String(existingHeaders[index] || '') === String(header || '');
  });
  if (!headerMatches) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#1565C0")
      .setFontColor("white");
  }
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function getMonthKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return '';
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
}

function normalizeMonthKey(value) {
  const key = String(value || '').trim();
  if (/^\d{4}-\d{2}$/.test(key)) return key;
  return getMonthKeyFromDate(new Date());
}

function getMonthRange_(monthKey) {
  const key = normalizeMonthKey(monthKey);
  const parts = key.split('-');
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  return { start: start, end: end };
}

function isDateInMonth_(value, monthKey) {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return false;
  const range = getMonthRange_(monthKey);
  return date >= range.start && date < range.end;
}

function deleteRowsByIndexes_(sheet, rowIndexes) {
  if (!sheet || !rowIndexes || !rowIndexes.length) return;
  rowIndexes
    .slice()
    .sort(function (a, b) { return b - a; })
    .forEach(function (rowIndex) {
      if (rowIndex > 1) {
        sheet.deleteRow(rowIndex);
      }
    });
}

function appendRows_(sheetName, rows) {
  if (!rows || !rows.length) return;
  const sheet = getSheet(sheetName);
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function findRow(
    sheetName,
    id
){

  const rows=getData(sheetName);

  for(let i=0;i<rows.length;i++){

      if(rows[i][0]==id)
          return i+2;

  }

  return -1;

}
