// Utility Functions Module
// File: utils.js

/**
 * Helper to get solutions from cell with error handling
 * @param {string} jsonString - JSON string to parse
 * @returns {Array} Parsed solutions array or empty array
 */
function parseSolutionsJson(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') return [];
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.warn('Failed to parse solutions JSON:', e);
    return [];
  }
}

/**
 * Generate next complaint ID
 * @returns {string} Generated complaint ID (e.g., C00001)
 */
function getComplainId() {
  const prefix = 'C';
  const sheet = getOrCreateSheet('ComplainData');
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return prefix + '00001';
  
  const lastId = sheet.getRange(lastRow, 1).getValue();
  const nextIdNum = lastId ? parseInt(lastId.slice(1)) + 1 : 1;
  return prefix + String(nextIdNum).padStart(5, '0');
}

/**
 * Generate follow-up/solution ID based on timestamp
 * @returns {string} Generated follow-up ID (e.g., F123456)
 */
function getFollowUpId() {
  const prefix = 'F';
  const timestamp = Date.now();
  return prefix + String(timestamp).slice(-6);
}

/**
 * Uses Intl.DateTimeFormat to format the date according to the UTC+7 time zone.
 * @param {Date|string} date - Date object or date string to format.
 * @returns {string} The date formatted as 'yyyy-MM-dd' in UTC+7.
 */
function formatDate(date) {
  if (!date) return '';

  if (typeof date === 'string') {
    return date;
  }

  if (date instanceof Date) {
    // 1. Define the formatter only once for optimal performance (memoization)
    if (!formatDate.formatter) {
      formatDate.formatter = new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        // 2. Explicitly set the time zone to UTC+7 (Asia/Bangkok)
        timeZone: 'Asia/Bangkok' 
      });
    }
    
    // 3. The 'sv-SE' (Swedish) locale is used because it natively outputs in 'yyyy-MM-dd' format
    return formatDate.formatter.format(date);
  }

  return date.toString();
}

/**
 * Test function to verify setup
 * @returns {string} Success or error message
 */
function testSetup() {
  try {
    const sheet = getOrCreateSheet();
    console.log('Sheet created/found successfully:', sheet.getName());

    const testData = getData();
    console.log('Data retrieval test:', testData);

    return 'Setup completed successfully!';

  } catch (error) {
    console.error('Setup error:', error);
    return 'Setup failed: ' + error.toString();
  }
}

/**
 * Generate download token for a specific complain and solution
 */
function getDownloadToken(complainId, solutionId) {
  const token = Utilities.getUuid();
  let mainFolder = DriveApp.getFolderById('1KPys5yGNFyv0Q1IGCmHbAsruR6HZkjVx'); // Replace with actual folder ID
  let complainFolder = getOrCreateFolder(complainId, mainFolder);
  let solutionFolder = getOrCreateFolder(solutionId, complainFolder);

  return {
    token: token,
    folderId: solutionFolder.getId()
  }
}

/** Helper to get or create a folder by name under a parent folder
 */
function getOrCreateFolder(folderName, parentFolder) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}