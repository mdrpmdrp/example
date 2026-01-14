/**
 * Data Service - Handles data retrieval and caching
 */

/**
 * Get contractor list with caching
 */
function getContractorList(ss) {
  ss = ss || getSpreadsheet();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'contractorList';
  
  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('Cache parse error: ' + e);
    }
  }
  
  // Fetch from sheet
  const sheet = ss.getSheetByName(CONFIG.SHEETS.CONTRACTORS);
  if (!sheet) {
    return [];
  }
  
  const values = sheet.getDataRange().getValues();
  const [header, ...data] = values;
  
  const contractorList = data
    .filter(row => row[0])
    .map(row => ({
      type: row[0].toLowerCase(),
      contractor: row[1],
      me: row[2],
      capacity: row[3]
    }));
  
  // Cache for 5 minutes
  cache.put(cacheKey, JSON.stringify(contractorList), 300);
  
  return contractorList;
}

/**
 * Get supervisor list with caching
 */
function getSupervisorList(ss) {
  ss = ss || getSpreadsheet();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'supervisorList';
  
  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('Cache parse error: ' + e);
    }
  }
  
  // Fetch from sheet
  const sheet = ss.getSheetByName(CONFIG.SHEETS.SUPERVISORS);
  if (!sheet) {
    return [];
  }
  
  const values = sheet.getDataRange().getValues();
  const [header, ...data] = values;
  
  const supervisorList = data
    .filter(row => row[0])
    .map(row => ({
      userId: row[1],
      name: row[2],
      me: row[3],
      mainDuty: row[4],
      contractors: [row[5], row[6], row[7]].filter(Boolean)
    }));
  
  // Cache for 5 minutes
  cache.put(cacheKey, JSON.stringify(supervisorList), 300);
  
  return supervisorList;
}

function getPredefinedWorkOrderList(ss) {
  ss = ss || getSpreadsheet();
  const cache = CacheService.getScriptCache();
  const cacheKey = 'preDefinedWorkOrders';
  
  // Try to get from cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      Logger.log('Cache parse error: ' + e);
    }
  }
  
  // Fetch from sheet
  const sheet = ss.getSheetByName(CONFIG.SHEETS.PRE_DEFINED_WORK_ORDERS);
  if (!sheet) {
    return [];
  }
  const values = sheet.getDataRange().getValues();
  const [header, ...data] = values;
  const predefinedList = data
    .filter(row => row[0])
    .map(row => ({
      workOrderID: row[0],
      description: row[1]
    }));
  // Cache for 5 minutes
  cache.put(cacheKey, JSON.stringify(predefinedList), 300);
  return predefinedList;
}

/**
 * Get dashboard data for today and future dates
 */
function getDashboardData() {
  try {
    const ss = getSpreadsheet();
    const workOrderSheet = ss.getSheetByName(CONFIG.SHEETS.WORK_ORDERS);
    
    if (!workOrderSheet) {
      return JSON.stringify({
        success: false,
        message: 'Work Orders sheet not found',
      });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const values = workOrderSheet.getDataRange().getValues();
    const [header, ...rows] = values;
    
    // Filter and map in one pass for better performance
    const woData = rows
      .filter(row => {
        const planDate = new Date(row[CONFIG.WORK_ORDER_COLUMNS.PLAN_DATE]);
        planDate.setHours(0, 0, 0, 0);
        return planDate >= today;
      })
      .map(row => ({
        supervisor: {
          userId: row[CONFIG.WORK_ORDER_COLUMNS.SUPERVISOR_ID],
          name: row[CONFIG.WORK_ORDER_COLUMNS.SUPERVISOR_NAME],
          planDate: row[CONFIG.WORK_ORDER_COLUMNS.PLAN_DATE],
          startTime: row[CONFIG.WORK_ORDER_COLUMNS.START_TIME],
          finishTime: row[CONFIG.WORK_ORDER_COLUMNS.FINISH_TIME]
        },
        workOrder: {
          date: row[CONFIG.WORK_ORDER_COLUMNS.DATE],
          workOrderID: row[CONFIG.WORK_ORDER_COLUMNS.ID],
          details: row[CONFIG.WORK_ORDER_COLUMNS.DETAILS]
        },
        contractors: row[CONFIG.WORK_ORDER_COLUMNS.CONTRACTORS_JSON] 
          ? JSON.parse(row[CONFIG.WORK_ORDER_COLUMNS.CONTRACTORS_JSON]) 
          : [],
        spareParts: row[CONFIG.WORK_ORDER_COLUMNS.SPARE_PARTS_JSON] 
          ? JSON.parse(row[CONFIG.WORK_ORDER_COLUMNS.SPARE_PARTS_JSON]) 
          : [],
        status: row[CONFIG.WORK_ORDER_COLUMNS.STATUS],
        timestamp: row[CONFIG.WORK_ORDER_COLUMNS.TIMESTAMP],
        recordId: row[CONFIG.WORK_ORDER_COLUMNS.RECORD_ID]
      }));
    
    return JSON.stringify({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: woData
    });
    
  } catch (error) {
    Logger.log('Error in getDashboardData: ' + error);
    return JSON.stringify({
      success: false,
      message: 'Error getting dashboard data: ' + error.toString(),
      data: []
    });
  }
}

/**
 * Clear data cache
 */
function clearDataCache() {
  const cache = CacheService.getScriptCache();
  cache.removeAll(['contractorList', 'supervisorList']);
}
