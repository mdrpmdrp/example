// Sheet Service - Handle all spreadsheet operations

/**
 * Update sheet with Event ID
 */
function updateSheetWithEventId(sheet, row, eventId) {
  const header = sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  let eventIdIndex = header.indexOf('Event Id') + 1;

  if (eventIdIndex === 0) {
    eventIdIndex = header.length + 1;
    sheet.getRange(HEADER_ROW, eventIdIndex).setValue('Event Id');
  }

  sheet.getRange(row, eventIdIndex).setValue(eventId);
}

/**
 * Get header row data
 */
function getSheetHeader(sheet) {
  return sheet.getRange(HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
}

/**
 * Get column index by header name (1-based)
 * @param {Array} header - Header row
 * @param {string} columnName - Column name to find
 * @returns {number} 1-based column index or 0 if not found
 */
function getColumnIndex(header, columnName) {
  return header.indexOf(columnName) + 1;
}

/**
 * Get cell value by header name
 * @returns {*} Cell value
 */
function getCellByHeader(sheet, row, header, columnName) {
  const colIndex = getColumnIndex(header, columnName);
  if (colIndex === 0) return null;
  return sheet.getRange(row, colIndex).getValue();
}

/**
 * Get all data from sheet starting from row 5
 */
function getSheetData(sheet) {
  const dataRange = sheet.getDataRange();
  return dataRange.getValues();
}

/**
 * Get branch name by postcode
 */
function getBranchByPostcode(postcode) {
  // for (const branch of BRANCH_DATA) {
  //   if (branch.postcodes.includes(postcode)) {
  //     return {
  //       name: branch.name,
  //       groupId: branch.groupId
  //     }
  //   }
  // }
  // return null;
  let branch = Object.values(BRANCH_DATA).find(b => b.postcodes.includes(postcode));
  if (branch) {
    return {
      name: branch.name,
      groupId: branch.groupId
    };
  }
  return null;
}

/**
 * showe menu on sheet open
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Calendar Sync')
    .addItem('Sync Row to Calendar', 'syncRowToCalendarEvent')
    .addToUi();
}