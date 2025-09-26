/**
 * Performance optimization utilities
 * Contains functions for caching, batching, and performance monitoring
 */

/**
 * Load all data in batch for better performance - multi-user optimized
 */
function loadAllDataBatch() {
  try {
    const startTime = Date.now();
    
    if (!shouldWarmCache()) {
      return { success: true, message: "Cache warming not needed", cached: true };
    }

    // Set warming flag
    dataCache.isWarming = true;
    dataCache.warmingStartTime = Date.now();

    const results = {
      patients: { success: false },
      appointments: { success: false },
      doctors: { success: false },
      revenues: { success: false },
      users: { success: false },
    };

    try {
      // Load patients
      const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
      const patientsData = patientsSheet.getDataRange().getValues();
      if (patientsData.length > 1) {
        dataCache.patients = convertSheetDataToObjects(patientsData);
        dataCache.lastUpdated.patients = Date.now();
        results.patients.success = true;
      }

      // Load appointments
      const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
      const appointmentsData = appointmentsSheet.getDataRange().getValues();
      if (appointmentsData.length > 1) {
        dataCache.appointments = convertSheetDataToObjects(appointmentsData);
        dataCache.lastUpdated.appointments = Date.now();
        results.appointments.success = true;
      }

      // Load doctors
      const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
      const doctorsData = doctorsSheet.getDataRange().getValues();
      if (doctorsData.length > 1) {
        dataCache.doctors = convertSheetDataToObjects(doctorsData);
        dataCache.lastUpdated.doctors = Date.now();
        results.doctors.success = true;
      }

      // Load users
      const usersSheet = getSheet(SHEET_NAMES.USERS);
      const usersData = usersSheet.getDataRange().getValues();
      if (usersData.length > 1) {
        dataCache.users = convertSheetDataToObjects(usersData);
        dataCache.lastUpdated.users = Date.now();
        results.users.success = true;
      }

    } finally {
      // Reset warming state
      dataCache.isWarming = false;
    }

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    return {
      success: true,
      message: "Data loaded successfully",
      loadTime: loadTime,
      results: results,
    };
  } catch (error) {
    // Reset warming state on error
    dataCache.isWarming = false;
    console.error("Error loading all data batch:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Debounce function to prevent too frequent calls
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Batch update operations to reduce API calls
 */
function batchUpdateRows(sheet, updates) {
  try {
    if (!updates || updates.length === 0) {
      return { success: true, message: "No updates to process" };
    }

    // Group updates by row to optimize
    const rowUpdates = {};
    updates.forEach(update => {
      const { row, col, value } = update;
      if (!rowUpdates[row]) {
        rowUpdates[row] = {};
      }
      rowUpdates[row][col] = value;
    });

    // Apply all updates
    Object.keys(rowUpdates).forEach(row => {
      const rowData = rowUpdates[row];
      const cols = Object.keys(rowData).map(Number).sort((a, b) => a - b);
      const startCol = cols[0];
      const endCol = cols[cols.length - 1];
      const values = [];
      
      for (let col = startCol; col <= endCol; col++) {
        values.push(rowData[col] || '');
      }
      
      sheet.getRange(row, startCol, 1, values.length).setValues([values]);
    });

    return { success: true, message: `Updated ${Object.keys(rowUpdates).length} rows` };
  } catch (error) {
    console.error("Error in batch update:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Memory-efficient data processing for large datasets
 */
function processLargeDataset(data, processingFunction, batchSize = 100) {
  const results = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = processingFunction(batch);
    if (Array.isArray(batchResults)) {
      results.push(...batchResults);
    } else {
      results.push(batchResults);
    }
  }

  return results;
}

/**
 * Intelligent cache warming - multi-user optimized
 */
function warmCache(forceWarm = false) {
  try {
    if (!forceWarm && !shouldWarmCache()) {
      return { success: true, message: "Cache warming not needed", skipped: true };
    }

    const warmingResult = loadAllDataBatch();
    
    if (warmingResult.success) {
      return {
        success: true,
        message: "Cache warmed successfully",
        loadTime: warmingResult.loadTime,
        results: warmingResult.results,
      };
    }

    return warmingResult;
  } catch (error) {
    console.error("Error warming cache:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Smart cache warming that only warms if needed
 */
function smartWarmCache() {
  return warmCache(false);
}

/**
 * Performance monitoring function
 */
function measurePerformance(functionName, func) {
  return function (...args) {
    const startTime = Date.now();
    try {
      const result = func.apply(this, args);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      console.log(`Performance: ${functionName} took ${executionTime}ms`);
      
      // Log slow operations
      if (executionTime > 1000) {
        console.warn(`Slow operation detected: ${functionName} took ${executionTime}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      console.error(`Performance: ${functionName} failed after ${executionTime}ms`, error);
      throw error;
    }
  };
}

/**
 * Enhanced initialization with performance monitoring - multi-user safe
 */
function initializeSystemWithPerformance() {
  const performanceMonitor = measurePerformance(
    "initializeSystem",
    initializeSystem
  );
  const result = performanceMonitor();

  if (result.success) {
    // Warm cache after initialization
    smartWarmCache();
  }

  return result;
}

/**
 * Performance-optimized data retrieval for frontend - multi-user safe
 */
function getOptimizedDashboardData() {
  try {
    const startTime = Date.now();
    
    // Try to warm cache if needed
    smartWarmCache();

    const dashboardData = {
      patients: { count: 0, recent: [] },
      appointments: { count: 0, today: [], upcoming: [] },
      doctors: { count: 0, active: [] },
      revenues: { thisMonth: 0, lastMonth: 0 },
    };

    // Use cached data if available
    if (dataCache.patients) {
      dashboardData.patients.count = dataCache.patients.length;
      dashboardData.patients.recent = dataCache.patients
        .slice(-5)
        .reverse();
    }

    if (dataCache.appointments) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      dashboardData.appointments.count = dataCache.appointments.length;
      dashboardData.appointments.today = dataCache.appointments.filter(
        apt => apt.appointment_date === todayStr
      );
    }

    if (dataCache.doctors) {
      dashboardData.doctors.count = dataCache.doctors.length;
      dashboardData.doctors.active = dataCache.doctors.filter(
        doc => doc.status === 'active'
      );
    }

    const endTime = Date.now();
    
    return {
      success: true,
      data: dashboardData,
      loadTime: endTime - startTime,
      cacheStatus: {
        patients: !!dataCache.patients,
        appointments: !!dataCache.appointments,
        doctors: !!dataCache.doctors,
        revenues: !!dataCache.revenues,
      }
    };
  } catch (error) {
    console.error("Error getting optimized dashboard data:", error);
    return { success: false, message: error.toString() };
  }
}