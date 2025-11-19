/**
 * Functions for formatting summary sheets
 */

/**
 * Apply formatting to all summary sheets
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 * @param {Object} formatInfo - Formatting information object
 * @param {Array} yearColumns - Array of years
 */
function formatAllSummarySheets(dailySheet, yearlySheet, bankSheet, formatInfo, yearColumns) {
    const {
        formatListNameRow,
        formatSumRow,
        netAmountRow,
        summary_array_length,
        year_summary_array_length
    } = formatInfo;
    
    // Clear existing formatting
    clearSheetFormatting(dailySheet);
    clearSheetFormatting(yearlySheet);
    clearSheetFormatting(bankSheet);
    
    // Format headers
    formatHeaders(dailySheet, yearlySheet, bankSheet);
    
    // Format bank sheet year headers
    formatBankYearHeaders(bankSheet, yearColumns);
    
    // Format net amount rows with conditional formatting
    if (netAmountRow) {
        formatNetAmountRows(dailySheet, yearlySheet, netAmountRow, summary_array_length, year_summary_array_length);
    }
    
    // Format total rows
    formatTotalRows(dailySheet, yearlySheet);
    
    // Format list name and sum rows
    formatSpecialRows(dailySheet, yearlySheet, formatListNameRow, formatSumRow);
    
    // Format data cells
    formatDataCells(dailySheet, yearlySheet, bankSheet);
    
    // Auto resize columns
    autoResizeColumns(dailySheet, yearlySheet, bankSheet);
    
    // Set column widths
    setColumnWidths(dailySheet, yearlySheet, bankSheet);
}

/**
 * Clear existing formatting from a sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet to clear
 */
function clearSheetFormatting(sheet) {
    // Clear conditional format rules
    sheet.setConditionalFormatRules([]);
    
    // Break apart existing merges
    const mergedRanges = sheet.getDataRange().getMergedRanges();
    for (let i = 0; i < mergedRanges.length; i++) {
        mergedRanges[i].breakApart();
    }
}

/**
 * Format header rows for all sheets
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 */
function formatHeaders(dailySheet, yearlySheet, bankSheet) {
    const headerFormat = {
        fontWeight: 'bold',
        background: '#1F1F1F',
        fontColor: '#FFFFFF',
        horizontalAlignment: 'center'
    };
    
    // Format daily sheet headers
    const dailyHeaderRange = dailySheet.getRange(1, 1, 2, dailySheet.getLastColumn());
    applyFormatting(dailyHeaderRange, headerFormat);
    
    // Format yearly sheet headers
    const yearlyHeaderRange = yearlySheet.getRange(1, 1, 2, yearlySheet.getLastColumn());
    applyFormatting(yearlyHeaderRange, headerFormat);
    
    // Format bank sheet headers
    const bankHeaderRange = bankSheet.getRange(1, 1, 2, bankSheet.getLastColumn());
    applyFormatting(bankHeaderRange, headerFormat);
    
    // Special formatting for bank sheet first cells
    bankSheet.getRange(1, 1, 1, 2)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
}

/**
 * Format bank sheet year headers with merging
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 * @param {Array} yearColumns - Array of years
 */
function formatBankYearHeaders(bankSheet, yearColumns) {
    for (let i = 0; i < yearColumns.length; i++) {
        const colStart = i * 3 + 3;
        
        // Merge year header
        bankSheet.getRange(1, colStart, 1, 3)
            .merge()
            .setHorizontalAlignment('center');
        
        // Color code the three columns
        const lastRow = bankSheet.getLastRow() - 2;
        if (lastRow > 2) {
            bankSheet.getRange(2, colStart, lastRow+1, 1)
                .setBackgroundColor('#ffffff')
                .setFontColor('#000000');
            
            bankSheet.getRange(2, colStart + 1, lastRow+1, 1)
                .setBackgroundColor('#ffffff')
                .setFontColor('#ff0000');
            
            bankSheet.getRange(2, colStart + 2, lastRow+1, 1)
                .setBackgroundColor('#ffffff')
                .setFontColor('#000000');
        }
    }
}

/**
 * Format net amount rows with conditional formatting
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {number} netAmountRow - Row index for net amount
 * @param {number} dailyLastRow - Last row index for daily sheet
 * @param {number} yearlyLastRow - Last row index for yearly sheet
 */
function formatNetAmountRows(dailySheet, yearlySheet, netAmountRow, dailyLastRow, yearlyLastRow) {
    const netFormat = {
        background: '#34a853',
        fontColor: '#ffffff',
        fontWeight: 'bold'
    };
    
    // Daily sheet net amount rows
    const dailyNetRange1 = dailySheet.getRange(netAmountRow, 1, 1, dailySheet.getLastColumn());
    const dailyNetRange2 = dailySheet.getRange(dailyLastRow, 1, 1, dailySheet.getLastColumn());
    applyFormatting(dailyNetRange1, netFormat);
    applyFormatting(dailyNetRange2, netFormat);
    
    // Yearly sheet net amount rows
    const yearlyNetRange1 = yearlySheet.getRange(netAmountRow, 1, 1, yearlySheet.getLastColumn());
    const yearlyNetRange2 = yearlySheet.getRange(yearlyLastRow, 1, 1, yearlySheet.getLastColumn());
    applyFormatting(yearlyNetRange1, netFormat);
    applyFormatting(yearlyNetRange2, netFormat);
    
    // Add conditional formatting for negative values
    const dailyRanges = [dailyNetRange1, dailyNetRange2];
    const yearlyRanges = [yearlyNetRange1, yearlyNetRange2];
    
    const negativeRule = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0)
        .setBackground('#ea4335')
        .setFontColor('#ffffff')
        .setRanges(dailyRanges)
        .build();
    
    const yearlyNegativeRule = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0)
        .setBackground('#ea4335')
        .setFontColor('#ffffff')
        .setRanges(yearlyRanges)
        .build();
    
    dailySheet.setConditionalFormatRules([negativeRule]);
    yearlySheet.setConditionalFormatRules([yearlyNegativeRule]);
}

/**
 * Format total rows
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 */
function formatTotalRows(dailySheet, yearlySheet) {
    const totalFormat = {
        fontWeight: 'bold',
        background: '#34a853',
        fontColor: '#ffffff'
    };
    
    const dailyTotalRange = dailySheet.getRange(dailySheet.getLastRow(), 1, 1, dailySheet.getLastColumn());
    const yearlyTotalRange = yearlySheet.getRange(yearlySheet.getLastRow(), 1, 1, yearlySheet.getLastColumn());
    
    applyFormatting(dailyTotalRange, totalFormat);
    applyFormatting(yearlyTotalRange, totalFormat);
}

/**
 * Format special rows (list names and sum rows)
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {Array} formatListNameRow - List name row info
 * @param {Array} formatSumRow - Sum row info
 */
function formatSpecialRows(dailySheet, yearlySheet, formatListNameRow, formatSumRow) {
    const allFormatRows = [...formatListNameRow, ...formatSumRow];
    
    for (let i = 0; i < allFormatRows.length; i++) {
        const row = allFormatRows[i];
        const format = {
            fontWeight: 'bold',
            background: row.backgroundColor,
            fontColor: row.fontColor
        };
        
        const dailyRange = dailySheet.getRange(row.index, 1, 1, dailySheet.getLastColumn());
        const yearlyRange = yearlySheet.getRange(row.index, 1, 1, yearlySheet.getLastColumn());
        
        applyFormatting(dailyRange, format);
        applyFormatting(yearlyRange, format);
    }
}

/**
 * Format data cells with number format
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 */
function formatDataCells(dailySheet, yearlySheet, bankSheet) {
    const numberFormat = '#,##0.00';
    
    // Daily sheet data
    if (dailySheet.getLastRow() > 2) {
        dailySheet.getRange(3, 2, dailySheet.getLastRow() - 2, dailySheet.getLastColumn() - 1)
            .setNumberFormat(numberFormat);
    }
    
    // Yearly sheet data
    if (yearlySheet.getLastRow() > 2) {
        yearlySheet.getRange(3, 2, yearlySheet.getLastRow() - 2, yearlySheet.getLastColumn() - 1)
            .setNumberFormat(numberFormat);
    }
    
    // Bank sheet data
    if (bankSheet.getLastRow() > 2) {
        bankSheet.getRange(3, 2, bankSheet.getLastRow() - 2, bankSheet.getLastColumn() - 1)
            .setNumberFormat(numberFormat);
    }
}

/**
 * Auto resize first columns
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 */
function autoResizeColumns(dailySheet, yearlySheet, bankSheet) {
    dailySheet.autoResizeColumn(1);
    yearlySheet.autoResizeColumn(1);
    bankSheet.autoResizeColumn(1);
    bankSheet.autoResizeColumn(2);
}

/**
 * Set column widths
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 */
function setColumnWidths(dailySheet, yearlySheet, bankSheet) {
    if (dailySheet.getLastColumn() > 1) {
        dailySheet.setColumnWidths(2, dailySheet.getLastColumn() - 1, 90);
    }
    
    if (yearlySheet.getLastColumn() > 1) {
        yearlySheet.setColumnWidths(2, yearlySheet.getLastColumn() - 1, 90);
    }
    
    if (bankSheet.getLastColumn() > 2) {
        bankSheet.setColumnWidths(3, bankSheet.getLastColumn() - 2, 110);
    }
}

/**
 * Apply formatting properties to a range
 * @param {GoogleAppsScript.Spreadsheet.Range} range - Range to format
 * @param {Object} format - Format object with properties
 */
function applyFormatting(range, format) {
    if (format.fontWeight) range.setFontWeight(format.fontWeight);
    if (format.background) range.setBackground(format.background);
    if (format.fontColor) range.setFontColor(format.fontColor);
    if (format.horizontalAlignment) range.setHorizontalAlignment(format.horizontalAlignment);
    if (format.verticalAlignment) range.setVerticalAlignment(format.verticalAlignment);
}
