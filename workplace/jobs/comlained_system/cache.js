// Cache Management Module
// File: cache.js

// Cache for spreadsheet and sheet references
let cachedSpreadsheet = null;
let cachedSheets = {};
let cacheTimes = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached sheet or create new cache entry
 * @param {string} sheetName - Name of the sheet
 * @returns {Sheet|null} Cached sheet or null if not found/expired
 */
function getCachedSheet(sheetName) {
  const now = Date.now();
  
  if (cachedSheets[sheetName] && cacheTimes[sheetName] && (now - cacheTimes[sheetName]) < CACHE_DURATION) {
    return cachedSheets[sheetName];
  }
  
  return null;
}

/**
 * Update sheet cache
 * @param {string} sheetName - Name of the sheet
 * @param {Sheet} sheet - Sheet object to cache
 */
function setCachedSheet(sheetName, sheet) {
  cachedSheets[sheetName] = sheet;
  cacheTimes[sheetName] = Date.now();
}

/**
 * Get cached spreadsheet
 * @returns {Spreadsheet} Cached spreadsheet
 */
function getCachedSpreadsheet() {
  if (!cachedSpreadsheet) {
    cachedSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  return cachedSpreadsheet;
}

/**
 * Clear all caches
 */
function clearCache() {
  cachedSpreadsheet = null;
  cachedSheets = {};
  cacheTimes = {};
}
