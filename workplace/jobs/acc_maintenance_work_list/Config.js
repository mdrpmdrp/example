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
    EXTERNAL_COST: 10,
    STATUS: 11,
    TIMESTAMP: 12,
    RECORD_ID: 13
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
  MESSAGING_API: {
    ADMIN_GROUP: 'Ua55431b2d9be5d104c316ccb8ef54e81',
    ACCESS_TOKEN: '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU=',
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
