// Version: 2026-02-23-14:37

/**
 * Configuration constants and sheet names
 */

const CONFIG = {
  /* Sheet Names */
  SHEETS: {
    WORK_ORDERS: 'Work Orders',
    CONTRACTORS: 'Contractors',
    SUPERVISORS: 'Supervisors',
    PRE_DEFINED_WORK_ORDERS: 'Predefined Work Orders',
    EMAILS: 'Emails'
  },
  
  /* Column Indices for Work Orders Sheet */
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
    EXTERNAL_COST: 10,
    STATUS: 11,
    TIMESTAMP: 12,
    RECORD_ID: 13
  },
  
  /* Status Values */
  STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },
  
  /* Default Time Settings */
  DEFAULT_TIMES: {
    START: '08:00',
    FINISH: '17:00'
  },

  /* Messaging API Configuration */
  MESSAGING_API: {
    ADMIN_GROUP: 'C9e1485ee3418fc1635cea3cf09b4ae11',
    ACCESS_TOKEN: 'kQueHBV7KljhTVLTH1QuxXQXwdLvo5pBCdDlPqP5/dtAaNEEBeChSLaVlzXGdzCW5pjRkPRIB/dnC3FzRiNq18bSgv/7HCjWANOoGH/4S5ELafVuMYYWGDLzXymzeGYmqxUrrlw8Aamz6f+JLBqcugdB04t89/1O/w1cDnyilFU=',
    URL: {
      PUSH_MESSAGE: 'https://api.line.me/v2/bot/message/push'
    }
  }
  
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
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return null;
  }
  
  return sheet;
}
