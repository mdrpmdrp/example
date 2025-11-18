/**
 * Extract file ID from Google Drive URL
 * @param {string} fileurl - Google Drive file URL
 * @returns {string|boolean} File ID or false if not found
 */
const getId = function (fileurl) {
    const regex = /([\w-]{19,33})/;
    const match = fileurl.match(regex);
    return match ? match[0] : false;
};

/**
 * Parse filename and extract invoice data
 * @param {string} fileName - File name in format: code_name_docId_price.ext
 * @returns {Object|null} Parsed data or null if invalid format
 */
function parseFileName(fileName) {
    let name_parts = fileName.split('_');
    if (name_parts.length != 4) {
        return null;
    }
    
    name_parts[3] = name_parts[3].replace(/\.[^/.]+$/, ""); // Remove file extension
    let [code, name, doc_id, price] = name_parts;
    let [yearMonth, no] = doc_id.split('-');
    
    if (!yearMonth || !no) {
        return null;
    }
    
    yearMonth = yearMonth.replace(/\D/g, '');
    let year = yearMonth.substring(0, 2);
    let monthIndex = parseInt(yearMonth.substring(2, 4), 10) - 1;
    let month = monthShortNames[monthIndex];
    code = "'" + code.padStart(4, '0');
    
    return {
        code,
        name,
        doc_id,
        price,
        year: '25' + year,
        month
    };
}

/**
 * Create row data for spreadsheet
 * @param {Object} parsedData - Parsed file data
 * @param {string} fileId - Google Drive file ID
 * @returns {Array} Row data array
 */
function createRowData(parsedData, fileId) {
    return [
        parsedData.code,
        parsedData.name,
        parsedData.month,
        parsedData.year,
        parsedData.doc_id,
        parsedData.price,
        `=HYPERLINK("https://drive.google.com/file/d/${fileId}/view", "ดูไฟล์")`,
        'N',
        fileId
    ];
}

/**
 * Try to acquire script lock with retry
 * @param {number} timeout - Lock timeout in milliseconds
 * @param {Function} callback - Function to call when lock acquired
 */
function withLock(timeout, callback) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(timeout)) {
        Logger.log("มีการทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง");
        Utilities.sleep(5000);
        return withLock(timeout, callback);
    }
    
    try {
        callback();
    } finally {
        lock.releaseLock();
    }
}

/**
 * Group array by key function
 * @param {Array} array - Array to group
 * @param {Function} keyFn - Function to extract key
 * @returns {Object} Grouped object
 */
function groupBy(array, keyFn) {
    return array.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {});
}
