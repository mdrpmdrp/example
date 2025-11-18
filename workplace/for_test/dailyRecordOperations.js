/**
 * Build category lists from list sheet data
 * @param {Array} header - Header row from list sheet
 * @param {Array} data - Data rows from list sheet
 * @returns {Object} Object with category names as keys and arrays of subcategories as values
 */
function buildCategoryLists(header, data) {
    let lists = {};
    header.slice(1, -1).forEach((col, index) => {
        if (!lists[col]) {
            lists[col] = new Set();
        }
        data.forEach(row => {
            lists[col].add(row[index + 1]);
        });
        lists[col] = Array.from(lists[col]).filter(Boolean);
    });
    return lists;
}

/**
 * Build column headers for daily record summary
 * @param {Object} lists - Category lists object
 * @returns {Object} Object with columnHeaders, columnHeaders2, and mergeRanges
 */
function buildColumnHeaders(lists) {
    let columnHeaders = ['วันที่'];
    let columnHeaders2 = [''];
    let mergeRanges = [];
    
    Object.keys(lists).forEach(listName => {
        lists[listName].forEach(sublist => {
            columnHeaders2.push(sublist);
        });
        columnHeaders = columnHeaders.concat([listName, ...new Array(lists[listName].length - 1).fill('')]);
        let startCol = columnHeaders.length - lists[listName].length + 1;
        let endCol = columnHeaders.length;
        mergeRanges.push({ startCol, endCol });
    });
    
    columnHeaders.push('รวม');
    columnHeaders2.push('');
    
    return { columnHeaders, columnHeaders2, mergeRanges };
}

/**
 * Transform daily record data to object format
 * @param {Array} data - Raw data with headers
 * @returns {Array} Array of data objects
 */
function transformDailyRecordData(data) {
    let dailyHeader = data[0];
    let rows = data.slice(1);
    
    return rows.map(row => {
        let obj = {};
        dailyHeader.forEach((col, index) => {
            if (row[index] === "") return;
            obj[col] = row[index];
        });
        return obj;
    });
}

/**
 * Group daily records by date
 * @param {Array} data - Transformed daily record data
 * @param {Array} columnHeaders2 - Subcategory headers
 * @param {number} columnCount - Total number of columns
 * @returns {Object} Date map with aggregated amounts
 */
function groupRecordsByDate(data, columnHeaders2, columnCount) {
    let dateMap = {};
    let timezone = Session.getScriptTimeZone();
    
    data.forEach(row => {
        let dateObj = new Date(row['วันที่']);
        let columnIndex = columnHeaders2.indexOf(`${row['หมวด']}`);
        let dateStr = Utilities.formatDate(dateObj, timezone, "d/M/yyyy");
        
        if (!columnIndex) return; // skip if category not found
        
        if (!dateMap[dateStr]) {
            dateMap[dateStr] = [dateStr, ...new Array(columnCount - 1).fill(0)];
        }
        
        let amount = parseFloat(row['รายรับ'] || parseFloat(row['รายจ่าย'])) || 0;
        dateMap[dateStr][columnIndex] += amount;
    });
    
    return dateMap;
}

/**
 * Calculate year range from date strings
 * @param {Array} dateStrings - Array of date strings in format "d/M/yyyy"
 * @returns {Object} Object with min_year and max_year
 */
function getYearRange(dateStrings) {
    let years = dateStrings.map(dateStr => {
        let parts = dateStr.split('/');
        return parseInt(parts[2], 10);
    });
    
    return {
        min_year: Math.min(...years),
        max_year: Math.max(...years)
    };
}

/**
 * Build monthly summary with totals and grouping
 * @param {Array} summary_array - Array of daily summaries
 * @param {number} columnCount - Total number of columns
 * @param {number} min_year - Minimum year
 * @param {number} max_year - Maximum year
 * @returns {Object} Object with result_array, monthTotalRowIndex, and groupRows
 */
function buildMonthlySummary(summary_array, columnCount, min_year, max_year) {
    let result_array = [];
    let monthTotalRowIndex = [];
    let groupRows = [];
    
    for (let year = min_year; year <= max_year; year++) {
        let yearFiltered = summary_array.filter(row => {
            let parts = row[0].split('/');
            return parseInt(parts[2], 10) === year;
        });
        
        for (let month = 1; month <= 12; month++) {
            let monthFiltered = yearFiltered.filter(row => {
                let parts = row[0].split('/');
                return parseInt(parts[1], 10) === month;
            });
            
            if (monthFiltered.length === 0) {
                monthTotalRowIndex.push(result_array.length + 1);
                result_array.push([`${month}/${year} รวม`, ...new Array(columnCount - 1).fill(0)]);
            } else {
                let monthTotal = monthFiltered.reduce((sumRow, currentRow) => {
                    return sumRow.map((val, index) => {
                        if (index === 0) return val;
                        return val + currentRow[index];
                    });
                }, new Array(columnCount).fill(0));
                
                monthTotalRowIndex.push(result_array.length + 1);
                groupRows.push({
                    start: monthTotalRowIndex[monthTotalRowIndex.length - 1],
                    end: monthTotalRowIndex[monthTotalRowIndex.length - 1] + monthFiltered.length
                });
                result_array = [...result_array, [`${month}/${year} รวม`, ...monthTotal.slice(1)], ...monthFiltered];
            }
        }
    }
    
    return { result_array, monthTotalRowIndex, groupRows };
}

/**
 * Apply header formatting to daily record summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet
 * @param {Array} mergeRanges - Array of merge range objects
 */
function formatDailyRecordHeaders(sheet, mergeRanges) {
    // Merge and color header cells
    for (let i = 0; i < mergeRanges.length; i++) {
        let range = mergeRanges[i];
        let selectedColor = HEADER_COLORS[i % HEADER_COLORS.length];
        
        // Apply color to header row 1
        sheet.getRange(1, range.startCol, 1, range.endCol - range.startCol + 1)
            .merge()
            .setBackground(selectedColor.background)
            .setFontColor(selectedColor.font);
        
        // Apply same color to header row 2
        sheet.getRange(2, range.startCol, 1, range.endCol - range.startCol + 1)
            .setBackground(selectedColor.background)
            .setFontColor(selectedColor.font);
    }
    
    // Set border for header rows
    sheet.getRange(1, 1, 2, sheet.getLastColumn())
        .setBorder(true, true, true, true, true, true, 'black', SpreadsheetApp.BorderStyle.SOLID);
    
    // Format header row 1
    sheet.getRange(1, 1, 1, sheet.getLastColumn())
        .setFontWeight('bold')
        .setHorizontalAlignment('center');
    
    // Format header row 2
    sheet.getRange(2, 1, 1, sheet.getLastColumn())
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setFontSize(8)
        .setWrap(true);
}

/**
 * Apply row grouping to daily record summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet
 * @param {Array} groupRows - Array of group objects with start and end
 */
function applyRowGrouping(sheet, groupRows) {
    sheet.expandAllRowGroups();
    sheet.getDataRange().shiftRowGroupDepth(-1); // reset all groups
    
    groupRows.forEach(group => {
        sheet.getRange(group.start + 3, 1, group.end - group.start, sheet.getLastColumn())
            .shiftRowGroupDepth(1);
        // +3 because of header rows
    });
    
    sheet.collapseAllRowGroups();
}

/**
 * Format month total rows and total column
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Target sheet
 * @param {Array} monthTotalRowIndex - Array of row indices for month totals
 * @param {Array} result_array - Complete data array
 */
function formatTotalsAndAmounts(sheet, monthTotalRowIndex, result_array) {
    // Format month total rows
    sheet.getRangeList(monthTotalRowIndex.map(rowIndex => 
        sheet.getRange(rowIndex + 2, 1, 1, sheet.getLastColumn()).getA1Notation()
    ))
        .setFontWeight('bold')
        .setBackground('#1f1f1f')
        .setFontColor('#ffffff')
        .setBorder(null, null, true, null, null, null, 'red', SpreadsheetApp.BorderStyle.SOLID);
    
    // Format total column
    let totalColIndex = sheet.getLastColumn();
    sheet.getRange(1, totalColIndex, result_array.length, 1)
        .setFontWeight('bold')
        .setBackground('#00FF00')
        .setFontColor('#000000');
    
    // Set number format for all amount cells
    sheet.getRange(3, 2, result_array.length - 2, sheet.getLastColumn() - 1)
        .setNumberFormats(result_array.slice(2).map((row) => {
            return row.slice(1).map((cell) => {
                if (cell === 0) return '0';
                return '#,##0.00';
            });
        }))
        .setFontSize(8);

    // set Date Column font size
    sheet.getRange(3, 1, result_array.length - 2, 1)
        .setFontSize(8);

    // Set column widths
    sheet.autoResizeColumn(1);
    sheet.setColumnWidths(2, sheet.getLastColumn() - 1, 80);
}
