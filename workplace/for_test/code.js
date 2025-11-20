/**
 * Main entry point and menu functions
 * Depends on: constants.js, utils.js, fileOperations.js, sheetOperations.js,
 *             dailyRecordUtils.js, summaryBuilder.js, sheetFormatter.js
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
        let discountAlreadyPaidSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL_ALREADY_PAID);
        let discountData = discountBillSheet.getDataRange().getValues();
        let delete_fileIds = [];

        for (let i = discountData.length - 1; i >= 1; i--) {
            let row = discountData[i];
            if (row[COL_PAIDFLAG - 1] === 'Y') {
                let fileId = row[COL_FILEID - 1];
                delete_fileIds.push(fileId);
                discountBillSheet.getRange(i + 1, 1, 1, discountData[0].length -1).copyTo(discountAlreadyPaidSheet.getRange(discountAlreadyPaidSheet.getLastRow() + 1, 1));
                discountBillSheet.deleteRow(i + 1);
            }
        }

        if (delete_fileIds.length > 0) {
            deleteFiles(delete_fileIds);
        }
        updateYearSummary();
    });
}

function updateYearSummary() {
    let ss = getSpreadsheet();
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let paidSheet = ss.getSheetByName(SHEET_PAID);
    let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
    let discountAlreadyPaidSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL_ALREADY_PAID);
    let yearSheet = ss.getSheetByName(SHEET_YEAR);
    let paidSummaryYearlySheet = ss.getSheetByName(SHEET_PAID_SUMMARY_YEARLY);

    // Get all data at once
    let masterData = masterSheet.getDataRange().getValues().slice(1);
    let paidData = paidSheet.getDataRange().getValues().slice(1);
    let discountData = [...discountBillSheet.getDataRange().getValues().slice(1), ...discountAlreadyPaidSheet.getDataRange().getValues().slice(1)];

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
    
    // Load data from sheets
    const listSheet = ss.getSheetByName(SHEET_LISTS);
    const [header, ...data] = listSheet.getDataRange().getValues();
    const lists = buildListsFromSheet(header, data);
    
    const dailyRecordSheet = ss.getSheetByName(SHEET_DAILY_RECORD);
    const dailyRecordData = dailyRecordSheet.getDataRange().getValues().filter(row => row[0]);
    const dailyHeader = dailyRecordData.shift();
    
    // Generate year and month columns
    const yearColumns = generateYearColumns(dailyRecordData);
    const monthColumn = generateMonthColumns();
    const monthColumnLength = monthColumn.length;
    const totalCols = yearColumns.length * monthColumnLength;
    
    // Build header rows
    const [yearRow, monthRow] = buildSummaryHeaders(yearColumns, monthColumn);
    
    // Initialize summary structure
    const {
        summary_array,
        formatListNameRow,
        formatSumRow,
        sumIncomeRowIndex,
        sumExpenseRowIndex
    } = initializeSummaryStructure(lists, totalCols);
    
    // Add calculated rows (net income, carried forward, total)
    const { netAmountRow, grandNetRow } = addCalculatedRows(
        summary_array,
        sumIncomeRowIndex,
        sumExpenseRowIndex,
        totalCols,
        formatSumRow
    );
    
    // Transform and populate data
    const headerIndexMap = createHeaderIndexMap(dailyHeader);
    const transformedData = transformDailyRecords(dailyRecordData, headerIndexMap);
    const monthIndexMap = createMonthIndexMap(yearColumns, monthColumn);
    
    populateSummaryData(
        summary_array,
        transformedData,
        monthIndexMap,
        monthColumn,
        summary_array[grandNetRow-2],
        lists
    );
    
    // Prepend header rows
    summary_array.unshift(yearRow, monthRow);
    
    // Build yearly and bank summaries
    const year_summary_array = buildYearlySummary(summary_array, yearColumns, monthColumnLength);
    const bank_summary_array = buildBankSummary(yearColumns, lists, dailyRecordData, headerIndexMap);
    
    // Get sheets
    const dailyRecordSummarySheet = ss.getSheetByName(SHEET_DAILY_RECORD_SUMMARY);
    const yearlySummarySheet = ss.getSheetByName(SHEET_YEARLY_SUMMARY);
    const bankSummarySheet = ss.getSheetByName(SHEET_BANK_SUMMARY);
    
    // Clear and write data (batch operations)
    batchClearAndWrite(
        dailyRecordSummarySheet,
        yearlySummarySheet,
        bankSummarySheet,
        summary_array,
        year_summary_array,
        bank_summary_array
    );
    
    // Apply all formatting
    formatAllSummarySheets(
        dailyRecordSummarySheet,
        yearlySummarySheet,
        bankSummarySheet,
        {
            formatListNameRow,
            formatSumRow,
            netAmountRow: netAmountRow ? netAmountRow + 2 : null, // +2 for header rows
            summary_array_length: summary_array.length,
            year_summary_array_length: year_summary_array.length
        },
        yearColumns
    );
}

/**
 * Batch clear and write operations for better performance
 * @param {GoogleAppsScript.Spreadsheet.Sheet} dailySheet - Daily summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} yearlySheet - Yearly summary sheet
 * @param {GoogleAppsScript.Spreadsheet.Sheet} bankSheet - Bank summary sheet
 * @param {Array} dailyData - Daily summary data
 * @param {Array} yearlyData - Yearly summary data
 * @param {Array} bankData - Bank summary data
 */
function batchClearAndWrite(dailySheet, yearlySheet, bankSheet, dailyData, yearlyData, bankData) {
    // keep existing Data
    const bankExistingData = bankSheet.getDataRange().getValues();
    
    // Clear all sheets at once
    dailySheet.getRange(1, 1, dailySheet.getMaxRows(), dailySheet.getMaxColumns()).clear();
    yearlySheet.getRange(1, 1, yearlySheet.getMaxRows(), yearlySheet.getMaxColumns()).clear();
    bankSheet.getRange(1, 1, bankSheet.getMaxRows(), bankSheet.getMaxColumns()).clear();
    
    // Write all data at once
    if (dailyData.length > 0 && dailyData[0].length > 0) {
        dailySheet.getRange(1, 1, dailyData.length, dailyData[0].length).setValues(dailyData);
    }
    
    if (yearlyData.length > 0 && yearlyData[0].length > 0) {
        yearlySheet.getRange(1, 1, yearlyData.length, yearlyData[0].length).setValues(yearlyData);
    }
    
    if (bankData.length > 0 && bankData[0].length > 0) {
        bankData = bankData.map((row, rowIndex) => {
            if(rowIndex < 2) return row; // Keep header rows
            let findIndex = bankExistingData.findIndex(existingRow => existingRow[0] === row[0]);
            if(findIndex === -1) return row; // New bank, keep as is
            // Existing bank, keep current balance
            let existingBalance = bankExistingData[findIndex][1];
            let newRow = [...row];
            newRow[1] = existingBalance;
            return newRow;
        })
        bankSheet.getRange(1, 1, bankData.length, bankData[0].length).setValues(bankData);

    }
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