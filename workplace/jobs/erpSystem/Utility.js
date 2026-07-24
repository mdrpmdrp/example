/**
 * คืนค่า Sheet
 */
function getSheet(sheetName) {
  return SpreadsheetApp.getActive().getSheetByName(sheetName);
}

/**
 * คืนค่าข้อมูลทั้งหมด (ไม่มี Header)
 */
function getData(sheetName) {

  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2) return [];

  return sheet.getRange(
    2,
    1,
    lastRow - 1,
    lastCol
  ).getValues();

}

function generateId(prefix, sheetName) {

  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();

  if (lastRow < 2)
    return prefix + "000001";

  const lastId = sheet
    .getRange(lastRow,1)
    .getValue();

  const number = parseInt(
      String(lastId).replace(prefix,"")
  );

  return prefix +
      String(number+1).padStart(6,"0");

}

function appendObject(sheetName,data){

  const sheet=getSheet(sheetName);

  sheet.appendRow(data);

}

function updateRow(
    sheetName,
    row,
    values
){

  getSheet(sheetName)
      .getRange(
          row,
          1,
          1,
          values.length
      )
      .setValues([values]);

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