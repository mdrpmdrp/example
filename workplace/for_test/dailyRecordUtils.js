/**
 * Utility functions for daily record operations
 */

/**
 * Generate year columns from daily record data
 * @param {Array} dailyRecordData - Daily record data array
 * @returns {Array} Sorted array of unique years
 */
function generateYearColumns(dailyRecordData) {
    const years = new Set();
    for (let i = 0; i < dailyRecordData.length; i++) {
        const year = new Date(dailyRecordData[i][0]).getFullYear();
        if (!isNaN(year)) years.add(year);
    }
    return Array.from(years).sort((a, b) => a - b);
}

/**
 * Generate month columns (Thai month names)
 * @returns {Array} Array of month names
 */
function generateMonthColumns() {
    return [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
}

/**
 * Create SUM formula for a range
 * @param {number} startRow - Start row number
 * @param {number} endRow - End row number
 * @param {number} colIndex - Column index
 * @returns {string} Excel formula string
 */
function createSummaryFormula(startRow, endRow, colIndex) {
    return `=SUM(${getColumnLetter(colIndex)}${startRow}:${getColumnLetter(colIndex)}${endRow})`;
}

// Cache for column letters to improve performance
const _columnLetterCache = {};

/**
 * Convert column index to Excel column letter
 * @param {number} colIndex - Column index (1-based)
 * @returns {string} Column letter (A, B, AA, etc.)
 */
function getColumnLetter(colIndex) {
    // Return from cache if available
    if (_columnLetterCache[colIndex]) {
        return _columnLetterCache[colIndex];
    }
    
    let letter = '';
    let tempIndex = colIndex;
    
    while (tempIndex > 0) {
        const mod = (tempIndex - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        tempIndex = Math.floor((tempIndex - mod) / 26);
    }
    
    // Cache the result
    _columnLetterCache[colIndex] = letter;
    return letter;
}

/**
 * Build lists from sheet data efficiently
 * @param {Array} header - Header row
 * @param {Array} data - Data rows
 * @returns {Object} Object mapping list names to arrays of items
 */
function buildListsFromSheet(header, data) {
    const lists = {};
    const headerCols = header.slice(1, -1);
    
    for (let colIdx = 0; colIdx < headerCols.length; colIdx++) {
        const col = headerCols[colIdx];
        const items = new Set();
        
        for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
            const value = data[rowIdx][colIdx + 1];
            if (value) items.add(value);
        }
        
        lists[col] = Array.from(items);
    }
    
    return lists;
}

/**
 * Create header index map for faster lookups
 * @param {Array} headers - Array of header strings
 * @returns {Object} Map of header names to indices
 */
function createHeaderIndexMap(headers) {
    const map = {};
    for (let i = 0; i < headers.length; i++) {
        map[headers[i]] = i;
    }
    return map;
}

/**
 * Transform daily record rows to objects
 * @param {Array} data - Raw data array with headers
 * @param {Object} headerIndexMap - Map of header names to indices
 * @returns {Array} Array of record objects
 */
function transformDailyRecords(data, headerIndexMap) {
    const transformed = [];
    
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row[headerIndexMap['วันที่']]) continue;
        
        transformed.push({
            'หมวด': row[headerIndexMap['หมวด']],
            'วันที่': row[headerIndexMap['วันที่']],
            'รายรับ': row[headerIndexMap['รายรับ']],
            'รายจ่าย': row[headerIndexMap['รายจ่าย']],
            'ยอดยกไป': row[headerIndexMap['ยอดยกไป']]
        });
    }
    
    return transformed;
}

/**
 * Create month index map for fast column lookups
 * @param {Array} yearColumns - Array of years
 * @param {Array} monthColumns - Array of month names
 * @returns {Object} Nested map: year -> month -> column index
 */
function createMonthIndexMap(yearColumns, monthColumns) {
    const map = {};
    const monthLength = monthColumns.length;
    
    for (let i = 0; i < yearColumns.length; i++) {
        const yearStr = yearColumns[i];
        map[yearStr] = {};
        
        for (let j = 0; j < monthColumns.length; j++) {
            map[yearStr][monthColumns[j]] = i * monthLength + j + 1;
        }
    }
    
    return map;
}

/**
 * Build bank year index map
 * @param {Array} yearColumns - Array of years
 * @returns {Object} Map of year to column index
 */
function createBankYearIndexMap(yearColumns) {
    const map = {};
    for (let i = 0; i < yearColumns.length; i++) {
        map[yearColumns[i]] = i * 3 + 3; // +3 for first two columns
    }
    return map;
}
