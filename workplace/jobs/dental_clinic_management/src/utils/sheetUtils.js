/**
 * Core utilities for spreadsheet access and caching
 * Contains core functions for accessing Google Sheets and managing cache
 */

// Cache for spreadsheet and sheets to avoid repeated API calls
let spreadsheetCache = null;
let sheetCache = {};

// Data cache for improved performance - optimized for multi-user environment
let dataCache = {
  patients: null,
  appointments: null,
  doctors: null,
  revenues: null,
  users: null,
  lastUpdated: {
    patients: 0,
    appointments: 0,
    doctors: 0,
    revenues: 0,
    users: 0,
  },
  // Multi-user optimization flags
  isWarming: false,
  warmingStartTime: 0,
  lastWarmingUser: null,
};

/**
 * Get cached spreadsheet instance
 */
function getCachedSpreadsheet() {
  if (!spreadsheetCache) {
    spreadsheetCache = SpreadsheetApp.getActiveSpreadsheet();
  }
  return spreadsheetCache;
}

/**
 * Get cached sheet instance
 */
function getCachedSheet(sheetName) {
  if (!sheetCache[sheetName]) {
    const spreadsheet = getCachedSpreadsheet();
    sheetCache[sheetName] = spreadsheet.getSheetByName(sheetName);

    if (!sheetCache[sheetName]) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
  }
  return sheetCache[sheetName];
}

/**
 * Clear cache when sheets are modified
 */
function clearCache() {
  spreadsheetCache = null;
  sheetCache = {};
}

/**
 * Get a specific sheet from the main spreadsheet (optimized with cache)
 */
function getSheet(sheetName) {
  try {
    return getCachedSheet(sheetName);
  } catch (error) {
    console.error(`Error getting sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Get or create a sheet within the main spreadsheet
 */
function getOrCreateSheetInSpreadsheet(spreadsheet, sheetName) {
  try {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
    }

    return sheet;
  } catch (error) {
    console.error(`Error getting/creating sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(dataType) {
  return (
    dataCache.lastUpdated[dataType] &&
    Date.now() - dataCache.lastUpdated[dataType] < CACHE_DURATION
  );
}

/**
 * Check if cache warming is needed and safe to perform
 */
function shouldWarmCache() {
  const now = Date.now();

  // Don't warm if already warming
  if (dataCache.isWarming) {
    // Check if warming has been stuck for too long
    if (now - dataCache.warmingStartTime > CACHE_WARMING_TIMEOUT) {
      dataCache.isWarming = false;
    }
    return false;
  }

  // Don't warm if recently warmed by another user
  if (
    dataCache.warmingStartTime &&
    now - dataCache.warmingStartTime < CACHE_WARMING_COOLDOWN
  ) {
    return false;
  }

  // Check if any cache is invalid
  const cacheTypes = [
    "patients",
    "appointments",
    "doctors",
    "revenues",
    "users",
  ];
  return cacheTypes.some((type) => !isCacheValid(type));
}

/**
 * Invalidate specific cache - thread-safe
 */
function invalidateCache(dataType) {
  if (dataType) {
    dataCache[dataType] = null;
    dataCache.lastUpdated[dataType] = 0;
  } else {
    // Clear all cache
    Object.keys(dataCache.lastUpdated).forEach((key) => {
      dataCache[key] = null;
      dataCache.lastUpdated[key] = 0;
    });
  }

  // Reset warming state when cache is invalidated
  dataCache.isWarming = false;
  dataCache.warmingStartTime = 0;
}

/**
 * Convert sheet data to objects efficiently
 */
function convertSheetDataToObjects(data, skipEmptyRows = true) {
  if (!data || data.length <= 1) {
    return [];
  }

  const headers = data[0];
  const objects = [];

  // Pre-process headers for performance
  const processedHeaders = headers.map((header) =>
    header.toString().replace(/\s+/g, "_").toLowerCase()
  );

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    // Skip empty rows if requested
    if (skipEmptyRows && row.every((cell) => !cell)) {
      continue;
    }

    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[processedHeaders[j]] = row[j];
    }
    objects.push(obj);
  }

  return objects;
}