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
    let listSheet = getSpreadsheet().getSheetByName(SHEET_LISTS);
    let [header, ...data] = listSheet.getDataRange().getValues();
    let lists = {}
    header.slice(1,-1).forEach((col, index) => {
        if(!lists[col]) {
            lists[col] = new Set();
        }
        data.forEach(row => {
            lists[col].add(row[index+1]);
        })
        lists[col] = Array.from(lists[col]).filter(Boolean)
    })
    let summary_array = []
    let dateColumns = generateDateColumns()
    summary_array.push(['', ...dateColumns])
    let formatListName = []
    Object.keys(lists).forEach(listName => {
        let newRow = new Array(dateColumns.length + 1).fill('');
        newRow[0] = listName;
        let items = lists[listName];
        summary_array.push(newRow);
        formatListName.push(summary_array.length);
        items.forEach(item => {
            let itemRow = new Array(dateColumns.length + 1).fill('');
            itemRow[0] = item;
            summary_array.push(itemRow);
        });
        summary_array.push(new Array(dateColumns.length + 1).fill(''));
    });
    let dailyRecordSheet = getSpreadsheet().getSheetByName(SHEET_DAILY_RECORD_SUMMARY);
    dailyRecordSheet.getDataRange().clearContent();
    dailyRecordSheet.getRange(1, 1, summary_array.length, summary_array[0].length).setValues(summary_array);
    // Format list names
    formatListName.forEach(rowIndex => {
        dailyRecordSheet.getRange(rowIndex, 1, 1, dailyRecordSheet.getLastColumn())
            .setFontWeight('bold')
            .setBackground('#D9E1F2');
    });
}

function generateDateColumns() {
    const year = new Date().getFullYear();
    const timezone = Session.getScriptTimeZone();
    const dateColumns = [];
    const daysInYear = new Date(year, 11, 31).getDate() === 31 ? 
        (new Date(year, 1, 29).getMonth() === 1 ? 366 : 365) : 365;
    
    const startDate = new Date(year, 0, 1);
    
    for (let i = 0; i < daysInYear; i++) {
        const currentDate = new Date(year, 0, 1 + i);
        dateColumns.push(Utilities.formatDate(currentDate, timezone, "d/M"));
    }
    
    return dateColumns;
}