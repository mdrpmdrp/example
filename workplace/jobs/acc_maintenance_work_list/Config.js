/**
 * Configuration constants and sheet names
 */

const CONFIG = {
  SHEETS: {
    WORK_ORDERS: 'Work Orders',
    CONTRACTORS: 'Contractors',
    SUPERVISORS: 'Supervisors',
    SPARE_PARTS: 'Spare Parts',
    PRE_DEFINED_WORK_ORDERS: 'Predefined Work Orders'
  },
  
  WORK_ORDER_COLUMNS: {
    ID: 0,
    DATE: 1,
    SUPERVISOR_ID: 2,
    SUPERVISOR_NAME: 3,
    PLAN_DATE: 4,
    START_TIME: 5,
    FINISH_TIME: 6,
    DETAILS: 7,
    CONTRACTORS_JSON: 8,
    SPARE_PARTS_JSON: 9,
    STATUS: 10,
    TIMESTAMP: 11,
    RECORD_ID: 12
  },
  
  STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  
  DEFAULT_TIMES: {
    START: '08:00',
    FINISH: '17:00'
  },
  
};

/**
 * Get cached spreadsheet instance
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Get or create sheet by name
 */
function getOrCreateSheet(sheetName, createHeadersFn) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (createHeadersFn && typeof createHeadersFn === 'function') {
      createHeadersFn(sheet);
    }
  }
  
  return sheet;
}
