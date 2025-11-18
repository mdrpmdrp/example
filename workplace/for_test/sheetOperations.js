/**
 * Get cached spreadsheet instance
 */
let _cachedSpreadsheet = null;
function getSpreadsheet() {
    if (!_cachedSpreadsheet) {
        _cachedSpreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    return _cachedSpreadsheet;
}

/**
 * Sort sheet data by multiple columns
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to sort
 * @param {Array} sortColumns - Array of {column, ascending} objects
 */
function sortSheet(sheet, sortColumns) {
    if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
            .sort(sortColumns);
    }
}

/**
 * Move paid files from master sheet to paid sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} masterSheet - Master sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} paidSheet - Paid sheet
 * @returns {Array} Array of files to move
 */
function movePaidRecords(masterSheet, paidSheet) {
    let masterData = masterSheet.getDataRange().getValues();
    let move_files = [];
    
    // Process in reverse to safely delete rows
    for (let i = masterData.length - 1; i >= 1; i--) {
        let row = masterData[i];
        if (row[COL_PAIDFLAG - 1] === 'Y') {
            let paidDate = new Date();
            let fileId = row[COL_FILEID - 1];
            
            // Update master sheet with paid date
            masterSheet.getRange(i + 1, COL_FILEID, 1, 2).setValues([[paidDate, fileId]]);
            
            // Copy to paid sheet
            masterSheet.getRange(i + 1, 1, 1, masterData[0].length)
                .copyTo(paidSheet.getRange(paidSheet.getLastRow() + 1, 1));
            
            // Delete from master sheet
            masterSheet.deleteRow(i + 1);
            
            // Prepare file move operation
            let yearFolder = getFolder(row[COL_YEAR - 1], ALL_FILES_FOLDER);
            let monthFolder = getFolder(row[COL_MONTH - 1], yearFolder.getId());
            let parentYearFolder = getFolder(row[COL_YEAR - 1], UPLOAD_FOLDER_ID);
            let parentMonthFolder = getFolder(row[COL_MONTH - 1], parentYearFolder.getId());
            
            move_files.push({
                id: fileId,
                parent: parentMonthFolder.getId(),
                target: monthFolder.getId()
            });
        }
    }
    
    return move_files;
}

/**
 * Calculate year summary from invoice data
 * @param {Array} masterData - Master sheet data
 * @param {Array} paidData - Paid sheet data
 * @param {Array} discountData - Discount bill data
 * @returns {Array} Summary data array
 */
function calculateYearSummary(masterData, paidData, discountData) {
    let data_to_calculate = masterData.concat(paidData)
        .filter(row => row[COL_YEAR - 1] !== '');
    
    let discount_filtered = discountData.filter(row => row[COL_YEAR - 1] !== '');
    
    let groupByCode = groupBy(data_to_calculate, row => row[COL_CODE - 1]);
    let discountGroupByCode = groupBy(discount_filtered, row => row[COL_CODE - 1]);
    
    let summary = [];
    
    for (let code in groupByCode) {
        let groupByYear = groupBy(groupByCode[code], row => row[COL_YEAR - 1]);
        let discountGroupByYear = discountGroupByCode[code] 
            ? groupBy(discountGroupByCode[code], row => row[COL_YEAR - 1]) 
            : {};
        
        for (let year in groupByYear) {
            let rows = groupByYear[year];
            let name = rows[0][COL_NAME - 1];
            let totalAmount = rows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let totalFiles = rows.length;
            
            let paidRows = rows.filter(row => row[COL_PAIDFLAG - 1] === 'Y');
            let paidFiles = paidRows.length;
            let paidAmount = paidRows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            
            let unpaidRows = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'Y');
            let unpaidFiles = unpaidRows.length;
            let unpaidAmount = unpaidRows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            
            let discountYearRows = discountGroupByYear[year] || [];
            let discountCount = discountYearRows.length;
            let discountRemaining = discountYearRows
                .filter(row => row[COL_PAIDFLAG - 1] !== 'Y')
                .reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            
            summary.push([
                code, name, year, totalFiles, totalAmount,
                paidFiles, paidAmount, discountCount, discountRemaining,
                unpaidFiles, unpaidAmount
            ]);
        }
    }
    
    return summary;
}

/**
 * Generate monthly payment summary
 * @param {Array} data - Invoice data
 * @param {Object} yearColMap - Map of year to column index
 * @returns {Array} Monthly summary data
 */
function generateMonthlySummary(data, yearColMap) {
    let groupByMonth = groupBy(data, row => row[COL_MONTH - 1]);
    let summaryData = [];
    
    Object.keys(monthHeaderMap).forEach(month => {
        let newRow = new Array(Object.keys(yearColMap).length * 4 + 1).fill('0');
        newRow[0] = monthHeaderMap[month];
        
        if (!groupByMonth[month]) {
            summaryData.push(newRow);
            return;
        }
        
        let rows = groupByMonth[month];
        
        Object.keys(yearColMap).forEach(year => {
            let yearRows = rows.filter(row => row[COL_YEAR - 1] == year);
            let paidRows = yearRows.filter(row => row[COL_PAIDFLAG - 1] !== 'N');
            
            let totalFiles = yearRows.length;
            let totalPaidFiles = paidRows.length;
            let totalAmount = yearRows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let totalPaidAmount = paidRows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            
            let colIndex = yearColMap[year];
            newRow[colIndex - 1] = totalFiles;
            newRow[colIndex] = totalAmount;
            newRow[colIndex + 1] = totalPaidFiles;
            newRow[colIndex + 2] = totalPaidAmount;
        });
        
        summaryData.push(newRow);
    });
    
    // Add footer row with totals
    let footerRow = new Array(Object.keys(yearColMap).length * 4 + 1).fill('');
    footerRow[0] = 'ยอดรวม';
    
    Object.keys(yearColMap).forEach(year => {
        let colIndex = yearColMap[year];
        let totalFiles = summaryData.reduce((sum, row) => sum + parseInt(row[colIndex - 1]), 0);
        let totalPaidFiles = summaryData.reduce((sum, row) => sum + parseInt(row[colIndex + 1]), 0);
        let totalAmount = summaryData.reduce((sum, row) => sum + parseFloat(row[colIndex]), 0);
        let totalPaidAmount = summaryData.reduce((sum, row) => sum + parseFloat(row[colIndex + 2]), 0);
        
        footerRow[colIndex - 1] = totalFiles;
        footerRow[colIndex] = totalAmount;
        footerRow[colIndex + 1] = totalPaidFiles;
        footerRow[colIndex + 2] = totalPaidAmount;
    });
    
    summaryData.push(footerRow);
    return summaryData;
}

/**
 * Format paid summary yearly sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to format
 * @param {Array} summaryData - Summary data
 * @param {Object} yearColMap - Map of year to column index
 */
function formatPaidSummarySheet(sheet, summaryData, yearColMap) {
    if (summaryData.length === 0) return;
    
    // Write data
    sheet.getRange(4, 1, summaryData.length, summaryData[0].length).setValues(summaryData);
    
    // Apply number formats
    Object.keys(yearColMap).forEach(year => {
        let colIndex = yearColMap[year];
        let formats = new Array(summaryData.length).fill(['#,##0', '#,##0.00', '#,##0', '#,##0.00']);
        sheet.getRange(4, colIndex, summaryData.length, 4).setNumberFormats(formats);
    });
    
    // Set backgrounds and borders
    sheet.getRange(1, 1, 3, sheet.getLastColumn())
        .setBackground('#D9E1F2')
        .setFontWeight('bold');
    
    sheet.getRange(sheet.getLastRow(), 1, 1, sheet.getLastColumn())
        .setBackground('#FFC000')
        .setFontWeight('bold');
    
    sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn())
        .setBorder(true, true, true, true, true, true);
}
