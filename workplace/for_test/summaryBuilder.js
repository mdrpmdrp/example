/**
 * Functions for building and formatting summary arrays
 */

/**
 * Build header rows for summary sheet
 * @param {Array} yearColumns - Array of years
 * @param {Array} monthColumn - Array of month names
 * @returns {Array} Array of header rows
 */
function buildSummaryHeaders(yearColumns, monthColumn) {
    const yearRow = ["ปี"];
    const monthRow = ["เดือน"];
    
    for (let i = 0; i < yearColumns.length; i++) {
        yearRow.push(yearColumns[i], ...new Array(monthColumn.length - 1).fill(''));
        monthRow.push(...monthColumn);
    }
    
    return [yearRow, monthRow];
}

/**
 * Initialize summary array structure with list items
 * @param {Object} lists - Lists object from buildListsFromSheet
 * @param {number} totalCols - Total number of data columns
 * @returns {Object} Object with summary_array and formatting info
 */
function initializeSummaryStructure(lists, totalCols) {
    const summary_array = [];
    const formatListNameRow = [];
    const formatSumRow = [];
    const rowLength = totalCols + 1;
    let sumIncomeRowIndex = null;
    let sumExpenseRowIndex = null;
    
    const listKeys = Object.keys(lists);
    for (let listIdx = 0; listIdx < listKeys.length; listIdx++) {
        const listName = listKeys[listIdx];
        const items = lists[listName];
        
        // Add list name row
        const listNameRow = new Array(rowLength).fill('');
        listNameRow[0] = listName;
        summary_array.push(listNameRow);
        formatListNameRow.push({
            index: summary_array.length,
            backgroundColor: '#4285f4',
            fontColor: '#FFFFFF'
        });
        
        // Add item rows
        for (let i = 0; i < items.length; i++) {
            const itemRow = new Array(rowLength).fill('');
            itemRow[0] = items[i];
            summary_array.push(itemRow);
        }
        
        const startRowIndex = formatListNameRow[formatListNameRow.length - 1].index + 1;
        const endRowIndex = summary_array.length;
        
        // Add summary row
        const summaryLabel = listName === 'รายได้' ? 'ยอดรวมรวมรายรับอื่นๆ' :
                            listName === 'รายจ่าย' ? 'ค่าใช้จ่ายรวม' : 'ยอดรวม';
        const summaryRow = [summaryLabel];
        
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            summaryRow.push(createSummaryFormula(startRowIndex, endRowIndex, colIndex + 2));
        }
        summary_array.push(summaryRow);
        
        formatSumRow.push({
            index: summary_array.length,
            backgroundColor: '#FBBC04',
            fontColor: '#000000'
        });
        
        // Track income and expense rows
        if (listName === 'รายได้') {
            sumIncomeRowIndex = summary_array.length;
        } else if (listName === 'รายจ่าย') {
            sumExpenseRowIndex = summary_array.length;
        }
        
        // Add empty row
        summary_array.push(new Array(rowLength).fill(''));
    }
    
    return {
        summary_array,
        formatListNameRow,
        formatSumRow,
        sumIncomeRowIndex,
        sumExpenseRowIndex
    };
}

/**
 * Add net income and total rows to summary
 * @param {Array} summary_array - Summary array to modify
 * @param {number} sumIncomeRowIndex - Row index of income sum
 * @param {number} sumExpenseRowIndex - Row index of expense sum
 * @param {number} totalCols - Total number of columns
 * @param {Array} formatSumRow - Array of format row info
 * @returns {Object} Updated indices
 */
function addCalculatedRows(summary_array, sumIncomeRowIndex, sumExpenseRowIndex, totalCols, formatSumRow) {
    let netAmountRow = null;
    let carriedForwardRow = null;
    
    if (sumIncomeRowIndex && sumExpenseRowIndex) {
        // Net income row
        const netIncomeRow = ['รายได้จากการดำเนินงานสุทธิ'];
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            const colLetter = getColumnLetter(colIndex + 2);
            netIncomeRow.push(`=${colLetter}${sumIncomeRowIndex} - ${colLetter}${sumExpenseRowIndex}`);
        }
        summary_array.splice(summary_array.length - 1, 0, netIncomeRow);
        netAmountRow = summary_array.length - 1;
        
        // Carried forward row
        const carriedRow = new Array(totalCols + 1).fill('');
        carriedRow[0] = 'ยอดยกไป';
        summary_array.splice(summary_array.length - 1, 0, carriedRow);
        carriedForwardRow = summary_array.length - 1;
        
        // Total row
        const totalRowData = ['สุทธิ'];
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            if (colIndex === 0) {
                totalRowData.push('');
            } else {
                const offsetIndex = colIndex + 2;
                const colLetter = getColumnLetter(offsetIndex);
                const prevColLetter = getColumnLetter(offsetIndex - 1);
                totalRowData.push(
                    `=${prevColLetter}${carriedForwardRow} - ${colLetter}${carriedForwardRow} + ${colLetter}${netAmountRow} - ${colLetter}${formatSumRow[0].index}`
                );
            }
        }
        summary_array.push(totalRowData);
    }
    
    return { netAmountRow, carriedForwardRow };
}

/**
 * Populate summary array with data from records
 * @param {Array} summary_array - Summary array to populate
 * @param {Array} transformedData - Transformed daily records
 * @param {Object} monthIndexMap - Month index map
 * @param {Array} monthColumn - Array of month names
 * @param {Array} carriedForwardRow - Carried forward row reference
 */
function populateSummaryData(summary_array, transformedData, monthIndexMap, monthColumn, carriedForwardRow) {
    // Create a map for faster row lookup
    const rowMap = {};
    for (let i = 0; i < summary_array.length; i++) {
        const rowName = summary_array[i][0];
        if (rowName && !rowMap[rowName]) {
            rowMap[rowName] = i;
        }
    }
    
    for (let i = 0; i < transformedData.length; i++) {
        const record = transformedData[i];
        const listName = record['หมวด'];
        const date = new Date(record['วันที่']);
        const yearStr = date.getFullYear();
        const monthStr = monthColumn[date.getMonth()];
        const amount = parseFloat(record['รายรับ'] || record['รายจ่าย'] || 0);
        const carriedAmount = parseFloat(record['ยอดยกไป'] || 0);
        
        const targetRowIndex = rowMap[listName];
        
        if (targetRowIndex !== undefined && monthIndexMap[yearStr] && monthIndexMap[yearStr][monthStr]) {
            const colIndex = monthIndexMap[yearStr][monthStr];
            const currentVal = summary_array[targetRowIndex][colIndex];
            summary_array[targetRowIndex][colIndex] = (currentVal === '' ? 0 : currentVal) + amount;
            
            if (carriedForwardRow) {
                carriedForwardRow[colIndex] = carriedAmount;
            }
        }
    }
}

/**
 * Build yearly summary from monthly summary
 * @param {Array} summary_array - Monthly summary array
 * @param {Array} yearColumns - Array of years
 * @param {number} monthColumnLength - Number of months
 * @returns {Array} Yearly summary array
 */
function buildYearlySummary(summary_array, yearColumns, monthColumnLength) {
    const year_summary_array = [
        new Array(yearColumns.length + 1).fill(''),
        ['ปี', ...yearColumns]
    ];
    
    for (let rowIndex = 2; rowIndex < summary_array.length; rowIndex++) {
        const row = summary_array[rowIndex];
        const new_row = [row[0]];
        
        for (let colIndex = 0; colIndex < yearColumns.length; colIndex++) {
            let yearTotal = 0;
            let formulaFound = false;
            
            for (let monthColIndex = 0; monthColIndex < monthColumnLength; monthColIndex++) {
                const cellValue = row[colIndex * monthColumnLength + monthColIndex + 1];
                
                if (cellValue !== '' && !isNaN(cellValue)) {
                    yearTotal += cellValue;
                } else if (typeof cellValue === 'string' && cellValue.startsWith('=') && monthColIndex === 0 && !formulaFound) {
                    const newColumn = getColumnLetter(colIndex + 2);
                    const matches = cellValue.match(/\d+/g);
                    if (matches) {
                        const [startRow, endRow] = matches;
                        yearTotal = cellValue.includes('SUM') ?
                            `=SUM(${newColumn}${startRow}:${newColumn}${endRow})` :
                            cellValue.replace(/[A-Z]+/, newColumn);
                        formulaFound = true;
                    }
                }
            }
            
            new_row.push(yearTotal === 0 ? '' : yearTotal);
        }
        year_summary_array.push(new_row);
    }
    
    return year_summary_array;
}

/**
 * Build bank summary array
 * @param {Array} yearColumns - Array of years
 * @param {Object} lists - Lists object
 * @param {Array} dailyRecordData - Daily record data
 * @param {Object} headerIndexMap - Header index map
 * @returns {Array} Bank summary array
 */
function buildBankSummary(yearColumns, lists, dailyRecordData, headerIndexMap) {
    const bank_summary_array = [
        ['บัญชีธนาคาร', 'ยอดคงเหลือปัจจุบัน', ...yearColumns.flatMap(yearStr => [yearStr, '', ''])],
        [' ', ' ', ...yearColumns.flatMap(() => ['ยอดเงินฝากรวม', 'ยอดถอนรวม', 'ยกไป'])]
    ];
    
    const bankRecords = dailyRecordData.filter(row => 
        lists['ธนาคาร'] && lists['ธนาคาร'].includes(row[headerIndexMap['หมวด']])
    );
    
    const bankYearIndexMap = createBankYearIndexMap(yearColumns);
    
    if (lists['ธนาคาร']) {
        for (let i = 0; i < lists['ธนาคาร'].length; i++) {
            const bankName = lists['ธนาคาร'][i];
            const bankRow = new Array(bank_summary_array[0].length).fill(0);
            bankRow[0] = bankName;
            let currentBalance = 0;
            
            for (let j = 0; j < bankRecords.length; j++) {
                const record = bankRecords[j];
                if (record[headerIndexMap['หมวด']] === bankName) {
                    const date = new Date(record[headerIndexMap['วันที่']]);
                    const yearStr = date.getFullYear();
                    const amountDeposit = parseFloat(record[headerIndexMap['รายรับ']] || 0);
                    const amountWithdraw = parseFloat(record[headerIndexMap['รายจ่าย']] || 0);
                    currentBalance += amountDeposit - amountWithdraw;
                    
                    if (bankYearIndexMap[yearStr]) {
                        bankRow[bankYearIndexMap[yearStr] - 1] += amountDeposit;
                        bankRow[bankYearIndexMap[yearStr]] += amountWithdraw;
                        bankRow[bankYearIndexMap[yearStr] + 1] = parseFloat(record[headerIndexMap['ยอดยกไป']] || 0);
                    }
                }
            }
            bankRow[1] = currentBalance;
            bank_summary_array.push(bankRow);
        }
    }
    
    return bank_summary_array;
}
