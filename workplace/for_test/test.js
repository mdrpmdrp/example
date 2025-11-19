/**
 * Main entry point and menu functions
 * Depends on: constants.js, utils.js, fileOperations.js, sheetOperations.js
 */

function onOpen() {
    let ui = SpreadsheetApp.getUi();
    ui.createMenu('จัดการใบส่งของ')
        .addItem('ย้ายไฟล์ที่เปลี่ยนชื่อแล้ว', 'moveAlreadyRenamedFiles')
        .addItem('ย้ายไฟล์ที่จ่ายเงินแล้ว', 'saveAlreadyPaidFileToPaidSheet')
        .addSeparator()
        .addItem('ย้ายใบค้างส่วนลด', 'moveDiscountBillFiles')
        .addItem('ลบใบค้างส่วนลดที่จ่ายเงินแล้ว', 'deletePaidDiscountBillFiles')
        .addSeparator()
        .addItem('อัปเดต Daily Records', 'updateDailyRecordSummary')
        .addSeparator()
        .addItem('อัปเดตสรุปรายปี', 'updateYearSummary')
        .addToUi();
}

function moveAlreadyRenamedFiles() {
    withLock(30000, () => {
        let ss = getSpreadsheet();
        let masterSheet = ss.getSheetByName(SHEET_MASTER);
        let move_files = [];

        let processFile = (file) => {
            let file_name = file.getName();
            let parsedData = parseFileName(file_name);

            if (!parsedData) {
                Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
                return null;
            }

            let fileId = file.getId();
            let row_data = createRowData(parsedData, fileId);
            masterSheet.appendRow(row_data);

            let yearFolder = getFolder(parsedData.year, UPLOAD_FOLDER_ID);
            let monthFolder = getFolder(parsedData.month, yearFolder.getId());

            return {
                id: fileId,
                parent: ACHIVE_FOLDER_ID,
                target: monthFolder.getId()
            };
        };

        move_files = processFilesFromFolder(ACHIVE_FOLDER_ID, processFile);

        if (move_files.length > 0) {
            moveFilesToFolder(move_files);
        }

        sortSheet(masterSheet, [
            { column: COL_CODE, ascending: true },
            { column: COL_YEAR, ascending: true },
            { column: COL_MONTH, ascending: true },
            { column: COL_INVOICE, ascending: true }
        ]);

        updateYearSummary();
    });
}
function moveDiscountBillFiles() {
    withLock(30000, () => {
        let ss = getSpreadsheet();
        let masterSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
        let move_files = [];

        let processFile = (file) => {
            let file_name = file.getName();
            let parsedData = parseFileName(file_name);

            if (!parsedData) {
                Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
                return null;
            }

            let fileId = file.getId();
            let row_data = createRowData(parsedData, fileId);
            masterSheet.appendRow(row_data);

            let yearFolder = getFolder(parsedData.year, DISCOUNT_BILL_WAITING_PAY_FOLDER_ID);
            let monthFolder = getFolder(parsedData.month, yearFolder.getId());

            return {
                id: fileId,
                parent: ACHIVE_DISCOUNT_BILL_FOLDER_ID,
                target: monthFolder.getId()
            };
        };

        move_files = processFilesFromFolder(ACHIVE_DISCOUNT_BILL_FOLDER_ID, processFile);

        if (move_files.length > 0) {
            moveFilesToFolder(move_files);
        }

        sortSheet(masterSheet, [
            { column: COL_CODE, ascending: true },
            { column: COL_YEAR, ascending: true },
            { column: COL_MONTH, ascending: true },
            { column: COL_INVOICE, ascending: true }
        ]);

        updateYearSummary();
    });
}

function saveAlreadyPaidFileToPaidSheet() {
    withLock(30000, () => {
        let ss = getSpreadsheet();
        let masterSheet = ss.getSheetByName(SHEET_MASTER);
        let paidSheet = ss.getSheetByName(SHEET_PAID);

        let move_files = movePaidRecords(masterSheet, paidSheet);

        sortSheet(paidSheet, [
            { column: COL_CODE, ascending: true },
            { column: COL_YEAR, ascending: true },
            { column: COL_MONTH, ascending: true },
            { column: COL_INVOICE, ascending: true }
        ]);

        if (move_files.length > 0) {
            moveFilesToFolder(move_files);
        }

        updateYearSummary();
    });
}

function deletePaidDiscountBillFiles() {
    withLock(30000, () => {
        let ss = getSpreadsheet();
        let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
        let discountData = discountBillSheet.getDataRange().getValues();
        let delete_fileIds = [];

        for (let i = 1; i < discountData.length; i++) {
            let row = discountData[i];
            if (row[COL_PAIDFLAG - 1] === 'Y') {
                let fileId = row[COL_FILEID - 1];
                delete_fileIds.push(fileId);
                discountBillSheet.getRange(i + 1, COL_FILEID).clearContent();
            }
        }

        if (delete_fileIds.length > 0) {
            deleteFiles(delete_fileIds);
        }
    });
}

function updateYearSummary() {
    let ss = getSpreadsheet();
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let paidSheet = ss.getSheetByName(SHEET_PAID);
    let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
    let yearSheet = ss.getSheetByName(SHEET_YEAR);
    let paidSummaryYearlySheet = ss.getSheetByName(SHEET_PAID_SUMMARY_YEARLY);

    // Get all data at once
    let masterData = masterSheet.getDataRange().getValues().slice(1);
    let paidData = paidSheet.getDataRange().getValues().slice(1);
    let discountData = discountBillSheet.getDataRange().getValues().slice(1);

    // Calculate summary
    let summary = calculateYearSummary(masterData, paidData, discountData);

    // Prepare data for paid summary yearly sheet
    let data_to_calculate = masterData.concat(paidData).filter(row => row[COL_YEAR - 1] !== '');
    let groupByYear = groupBy(data_to_calculate, row => row[COL_YEAR - 1]);

    // Clear and setup headers
    paidSummaryYearlySheet.getDataRange().clearContent();
    let COL_YEAR_MAP = {};

    Object.keys(groupByYear).sort().forEach((year, i) => {
        const colIndex = 2 + (i * 4);
        paidSummaryYearlySheet.getRange(1, colIndex, 3, 4).setValues([
            [year, "", "", ""],
            ["ใบส่งของ", "", "ใบจ่ายเงิน", ""],
            ["จำนวน", "ยอดเงิน", "จำนวน", "ยอดเงิน"]
        ]).setFontWeight("bold");

        paidSummaryYearlySheet.getRange(1, colIndex, 1, 4).merge().setHorizontalAlignment("center");
        paidSummaryYearlySheet.getRange(2, colIndex, 1, 2).merge().setHorizontalAlignment("center");
        paidSummaryYearlySheet.getRange(2, colIndex + 2, 1, 2).merge().setHorizontalAlignment("center");

        COL_YEAR_MAP[year] = colIndex;
    });

    // Generate and format monthly summary
    let summaryData = generateMonthlySummary(data_to_calculate, COL_YEAR_MAP);
    formatPaidSummarySheet(paidSummaryYearlySheet, summaryData, COL_YEAR_MAP);

    // Write summary to year sheet
    yearSheet.getRange(2, 1, yearSheet.getLastRow(), yearSheet.getLastColumn()).clearContent();
    if (summary.length > 0) {
        yearSheet.getRange(2, 1, summary.length, summary[0].length).setValues(summary);
    }

    sortSheet(yearSheet, [
        { column: 1, ascending: true },
        { column: 3, ascending: true }
    ]);
}

function updateDailyRecordSummary() {
    const ss = getSpreadsheet();
    const listSheet = ss.getSheetByName(SHEET_LISTS);
    const [header, ...data] = listSheet.getDataRange().getValues();
    
    // Build lists more efficiently - single pass through data
    const lists = {};
    const headerCols = header.slice(1, -1);
    headerCols.forEach((col, index) => {
        const items = new Set();
        for (let i = 0; i < data.length; i++) {
            const value = data[i][index + 1];
            if (value) items.add(value);
        }
        lists[col] = Array.from(items);
    });

    const summary_array = [];
    const dailyRecordSheet = ss.getSheetByName(SHEET_DAILY_RECORD);
    const dailyRecordData = dailyRecordSheet.getDataRange().getValues().filter(row => row[0]);
    const dailyHeader = dailyRecordData.shift();
    const yearColumns = generateYearColumns(dailyRecordData);
    const monthColumn = generateMonthColumns();
    const monthColumnLength = monthColumn.length;
    
    // Pre-build month index map and cache month lookups
    const monthIndexMap = {};
    const monthNameToIndex = {};
    monthColumn.forEach((monthStr, idx) => {
        monthNameToIndex[monthStr] = idx;
    });
    
    yearColumns.forEach((yearStr, index) => {
        monthIndexMap[yearStr] = {};
        monthColumn.forEach((monthStr, monthIdx) => {
            monthIndexMap[yearStr][monthStr] = index * monthColumnLength + monthIdx + 1;
        });
    });
    
    let sumIncomeRow, sumExpenseRow;
    
    // Build header rows
    summary_array.push(["ปี", ...yearColumns.flatMap(yearStr => [yearStr, ...new Array(monthColumnLength - 1).fill('')])]);
    summary_array.push(["เดือน", ...yearColumns.flatMap(() => monthColumn)]);
    
    const formatListNameRow = [];
    const formatSumRow = [];
    let netAmountRow;
    const totalCols = yearColumns.length * monthColumnLength;
    const rowLength = totalCols + 1;
    
    // Build list structure
    Object.keys(lists).forEach(listName => {
        const items = lists[listName];
        
        // List name row
        const newRow = new Array(rowLength).fill('');
        newRow[0] = listName;
        summary_array.push(newRow);
        formatListNameRow.push({ index: summary_array.length, backgroundColor: '#4285f4', fontColor: '#FFFFFF' });
        
        // Item rows
        for (let i = 0; i < items.length; i++) {
            const itemRow = new Array(rowLength).fill('');
            itemRow[0] = items[i];
            summary_array.push(itemRow);
        }
        
        const startRowIndex = formatListNameRow[formatListNameRow.length - 1].index + 1;
        const endRowIndex = summary_array.length;
        
        formatSumRow.push({ index: endRowIndex + 1, backgroundColor: '#FBBC04', fontColor: '#000000' });
        
        // Summary row with formulas - build once
        const summaryLabel = listName === 'รายได้' ? 'ยอดรวมรวมรายรับอื่นๆ' : 
                            listName === 'รายจ่าย' ? 'ค่าใช้จ่ายรวม' : 'ยอดรวม';
        const summaryRow = [summaryLabel];
        
        for (let colIndex = 0; colIndex < totalCols; colIndex++) {
            summaryRow.push(createSummaryFormula(startRowIndex, endRowIndex, colIndex + 2));
        }
        summary_array.push(summaryRow);
        
        // Empty row
        summary_array.push(new Array(rowLength).fill(''));
        
        if (listName === 'รายได้') {
            sumIncomeRow = summary_array.length - 1;
        } else if (listName === 'รายจ่าย') {
            sumExpenseRow = summary_array.length - 1;
            
            // Net income row - build formulas efficiently
            const netIncomeRow = ['รายได้จากการดำเนินงานสุทธิ'];
            for (let colIndex = 0; colIndex < totalCols; colIndex++) {
                const colLetter = getColumnLetter(colIndex + 2);
                netIncomeRow.push(`=${colLetter}${sumIncomeRow} - ${colLetter}${sumExpenseRow}`);
            }
            summary_array.splice(summary_array.length - 1, 0, netIncomeRow);
            netAmountRow = summary_array.length - 1;
        }
    });
    
    // Transform dailyRecordData to object format - single pass
    const headerIndexMap = {};
    dailyHeader.forEach((col, index) => {
        headerIndexMap[col] = index;
    });
    
    const transformedData = [];
    for (let i = 0; i < dailyRecordData.length; i++) {
        const row = dailyRecordData[i];
        const obj = {
            'หมวด': row[headerIndexMap['หมวด']],
            'วันที่': row[headerIndexMap['วันที่']],
            'รายรับ': row[headerIndexMap['รายรับ']],
            'รายจ่าย': row[headerIndexMap['รายจ่าย']],
            'ยอดยกไป': row[headerIndexMap['ยอดยกไป']]
        };
        if (obj['วันที่']) transformedData.push(obj);
    }
    
    const carried_foward_row = new Array(totalCols + 1).fill('');
    carried_foward_row[0] = 'ยอดยกไป';
    
    // Process data - single loop with cached lookups
    for (let i = 0; i < transformedData.length; i++) {
        const row = transformedData[i];
        const listName = row['หมวด'];
        const date = new Date(row['วันที่']);
        const yearStr = date.getFullYear();
        const monthStr = monthColumn[date.getMonth()];
        const amount = parseFloat(row['รายรับ'] || row['รายจ่าย'] || 0);
        const carried_foward_amount = parseFloat(row['ยอดยกไป'] || 0);

        // Find target row - could be optimized with a map if needed
        let targetRowIndex = -1;
        for (let j = 0; j < summary_array.length; j++) {
            if (summary_array[j][0] === listName) {
                targetRowIndex = j;
                break;
            }
        }
        
        if (targetRowIndex !== -1 && monthIndexMap[yearStr] && monthIndexMap[yearStr][monthStr]) {
            const colIndex = monthIndexMap[yearStr][monthStr];
            const currentVal = summary_array[targetRowIndex][colIndex];
            summary_array[targetRowIndex][colIndex] = (currentVal === '' ? 0 : currentVal) + amount;
            
            const currentCarriedVal = carried_foward_row[colIndex];
            carried_foward_row[colIndex] = carried_foward_amount;
        }
    }

    summary_array.splice(summary_array.length - 1, 0, carried_foward_row);
    
    // Build total row formulas efficiently
    const totalRowData = ['สุทธิ'];
    for (let colYearIndex = 0; colYearIndex < yearColumns.length; colYearIndex++) {
        for (let colMonthIndex = 0; colMonthIndex < monthColumnLength; colMonthIndex++) {
            if (colYearIndex === 0 && colMonthIndex === 0) {
                totalRowData.push('');
            } else {
                const offsetIndex = colYearIndex * monthColumnLength + colMonthIndex + 2;
                const colLetter = getColumnLetter(offsetIndex);
                const prevColLetter = getColumnLetter(offsetIndex - 1);
                totalRowData.push(
                    `=${prevColLetter}${summary_array.length - 1} - ${colLetter}${summary_array.length - 1} + ${colLetter}${netAmountRow} - ${colLetter}${formatSumRow[0].index}`
                );
            }
        }
    }
    summary_array.push(totalRowData);
    
    // Build yearly summary - optimized calculation
    const year_summary_array = [new Array(yearColumns.length + 1).fill(''), ['ปี', ...yearColumns]];
    
    for (let rowIndex = 0; rowIndex < summary_array.length - 2; rowIndex++) {
        const row = summary_array[rowIndex + 2];
        const new_row = [row[0]];
        
        for (let colIndex = 0; colIndex < yearColumns.length; colIndex++) {
            let yearTotal = 0;
            let formulaFound = false;
            
            for (let monthColIndex = 0; monthColIndex < monthColumnLength; monthColIndex++) {
                const cellValue = summary_array[rowIndex + 2][colIndex * monthColumnLength + monthColIndex + 1];
                
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

    const dailyRecordSummarySheet = ss.getSheetByName(SHEET_DAILY_RECORD_SUMMARY);
    const yearlySummarySheet = ss.getSheetByName(SHEET_YEARLY_SUMMARY);
    
    // Batch clear and write operations
    dailyRecordSummarySheet.getDataRange().clearContent();
    yearlySummarySheet.getDataRange().clearContent();
    dailyRecordSummarySheet.getRange(1, 1, summary_array.length, summary_array[0].length).setValues(summary_array);
    yearlySummarySheet.getRange(1, 1, year_summary_array.length, year_summary_array[0].length).setValues(year_summary_array);

    // Clear formatting rules once
    dailyRecordSummarySheet.setConditionalFormatRules([]);
    yearlySummarySheet.setConditionalFormatRules([]);

    // Remove existing merges efficiently
    const existingMerges = dailyRecordSummarySheet.getDataRange().getMergedRanges();
    for (let i = 0; i < existingMerges.length; i++) {
        existingMerges[i].breakApart();
    }

    if (netAmountRow) {
        const netAmountRange = [
            dailyRecordSummarySheet.getRange(netAmountRow, 1, 1, dailyRecordSummarySheet.getLastColumn()),
            dailyRecordSummarySheet.getRange(summary_array.length, 1, 1, dailyRecordSummarySheet.getLastColumn()),
        ];

        const yearNetAmountRange = [
            yearlySummarySheet.getRange(netAmountRow, 1, 1, yearlySummarySheet.getLastColumn()),
            yearlySummarySheet.getRange(year_summary_array.length, 1, 1, yearlySummarySheet.getLastColumn())
        ];

        // Apply formatting to ranges
        const allNetRanges = [...netAmountRange, ...yearNetAmountRange];
        for (let i = 0; i < allNetRanges.length; i++) {
            allNetRanges[i].setBackground('#34a853').setFontColor('#ffffff').setFontWeight('bold');
        }

        // Add conditional formatting rules
        const ruleNegative = SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0)
            .setBackground('#ea4335')
            .setFontColor('#ffffff')
            .setRanges(netAmountRange)
            .build();
        const yearRuleNegative = SpreadsheetApp.newConditionalFormatRule()
            .whenNumberLessThan(0)
            .setBackground('#ea4335')
            .setFontColor('#ffffff')
            .setRanges(yearNetAmountRange)
            .build();
        
        dailyRecordSummarySheet.setConditionalFormatRules([ruleNegative]);
        yearlySummarySheet.setConditionalFormatRules([yearRuleNegative]);
    }

    // Format header rows - batch operations
    dailyRecordSummarySheet.getRange(1, 1, 2, dailyRecordSummarySheet.getLastColumn())
        .setFontWeight('bold')
        .setBackground('#1F1F1F')
        .setFontColor('#FFFFFF')
        .setHorizontalAlignment('center');
    yearlySummarySheet.getRange(1, 1, 2, yearlySummarySheet.getLastColumn())
        .setFontWeight('bold')
        .setBackground('#1F1F1F')
        .setFontColor('#FFFFFF')
        .setHorizontalAlignment('center');

    // Format total rows
    const totalRowIndex = dailyRecordSummarySheet.getLastRow();
    dailyRecordSummarySheet.getRange(totalRowIndex, 1, 1, dailyRecordSummarySheet.getLastColumn())
        .setFontWeight('bold')
        .setBackground('#34a853')
        .setFontColor('#ffffff');
    yearlySummarySheet.getRange(yearlySummarySheet.getLastRow(), 1, 1, yearlySummarySheet.getLastColumn())
        .setFontWeight('bold')
        .setBackground('#34a853')
        .setFontColor('#ffffff');

    // Format list names and sum rows
    const allFormatRows = [...formatListNameRow, ...formatSumRow];
    for (let i = 0; i < allFormatRows.length; i++) {
        const row = allFormatRows[i];
        dailyRecordSummarySheet.getRange(row.index, 1, 1, dailyRecordSummarySheet.getLastColumn())
            .setFontWeight('bold')
            .setBackground(row.backgroundColor)
            .setFontColor(row.fontColor);
        yearlySummarySheet.getRange(row.index, 1, 1, yearlySummarySheet.getLastColumn())
            .setFontWeight('bold')
            .setBackground(row.backgroundColor)
            .setFontColor(row.fontColor);
    }

    // Auto resize first column
    dailyRecordSummarySheet.autoResizeColumn(1);
    yearlySummarySheet.autoResizeColumn(1);

    // Set number format for data columns
    dailyRecordSummarySheet.getRange(3, 2, dailyRecordSummarySheet.getLastRow() - 2, dailyRecordSummarySheet.getLastColumn() - 1)
        .setNumberFormat('#,##0.00');
    yearlySummarySheet.getRange(3, 2, yearlySummarySheet.getLastRow() - 2, yearlySummarySheet.getLastColumn() - 1)
        .setNumberFormat('#,##0.00');

    // Set column widths
    dailyRecordSummarySheet.setColumnWidths(2, dailyRecordSummarySheet.getLastColumn() - 1, 90);
    yearlySummarySheet.setColumnWidths(2, yearlySummarySheet.getLastColumn() - 1, 90);
}

function generateYearColumns(dailyRecordData) {
    let years = new Set();
    dailyRecordData.forEach(row => {
        let year = new Date(row[0]).getFullYear();
        years.add(year);
    });
    return Array.from(years).sort();
}

function generateMonthColumns() {
    return [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
}

function createSummaryFormula(startRow, endRow, colIndex) {
    return `=SUM(${getColumnLetter(colIndex)}${startRow}:${getColumnLetter(colIndex)}${endRow})`;
}

function getColumnLetter(colIndex) {
    // Cache common column letters for performance
    if (colIndex <= 26) {
        return String.fromCharCode(64 + colIndex);
    }
    
    let letter = '';
    while (colIndex > 0) {
        const mod = (colIndex - 1) % 26;
        letter = String.fromCharCode(65 + mod) + letter;
        colIndex = Math.floor((colIndex - mod) / 26);
    }
    return letter;
}