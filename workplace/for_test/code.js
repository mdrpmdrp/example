// /**
//  * Main entry point and menu functions
//  * Depends on: constants.js, utils.js, fileOperations.js, sheetOperations.js, dailyRecordOperations.js
//  */

// function onOpen() {
//     let ui = SpreadsheetApp.getUi();
//     ui.createMenu('จัดการใบส่งของ')
//         .addItem('ย้ายไฟล์ที่เปลี่ยนชื่อแล้ว', 'moveAlreadyRenamedFiles')
//         .addItem('ย้ายไฟล์ที่จ่ายเงินแล้ว', 'saveAlreadyPaidFileToPaidSheet')
//         .addSeparator()
//         .addItem('ย้ายใบค้างส่วนลด', 'moveDiscountBillFiles')
//         .addItem('ลบใบค้างส่วนลดที่จ่ายเงินแล้ว', 'deletePaidDiscountBillFiles')
//         .addSeparator()
//         .addItem('อัปเดต Daily Records', 'updateDailyRecordSummary')
//         .addSeparator()
//         .addItem('อัปเดตสรุปรายปี', 'updateYearSummary')
//         .addToUi();
// }

// function moveAlreadyRenamedFiles() {
//     withLock(30000, () => {
//         let ss = getSpreadsheet();
//         let masterSheet = ss.getSheetByName(SHEET_MASTER);
//         let move_files = [];

//         let processFile = (file) => {
//             let file_name = file.getName();
//             let parsedData = parseFileName(file_name);

//             if (!parsedData) {
//                 Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
//                 return null;
//             }

//             let fileId = file.getId();
//             let row_data = createRowData(parsedData, fileId);
//             masterSheet.appendRow(row_data);

//             let yearFolder = getFolder(parsedData.year, UPLOAD_FOLDER_ID);
//             let monthFolder = getFolder(parsedData.month, yearFolder.getId());

//             return {
//                 id: fileId,
//                 parent: ACHIVE_FOLDER_ID,
//                 target: monthFolder.getId()
//             };
//         };

//         move_files = processFilesFromFolder(ACHIVE_FOLDER_ID, processFile);

//         if (move_files.length > 0) {
//             moveFilesToFolder(move_files);
//         }

//         sortSheet(masterSheet, [
//             { column: COL_CODE, ascending: true },
//             { column: COL_YEAR, ascending: true },
//             { column: COL_MONTH, ascending: true },
//             { column: COL_INVOICE, ascending: true }
//         ]);

//         updateYearSummary();
//     });
// }
// function moveDiscountBillFiles() {
//     withLock(30000, () => {
//         let ss = getSpreadsheet();
//         let masterSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
//         let move_files = [];

//         let processFile = (file) => {
//             let file_name = file.getName();
//             let parsedData = parseFileName(file_name);

//             if (!parsedData) {
//                 Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
//                 return null;
//             }

//             let fileId = file.getId();
//             let row_data = createRowData(parsedData, fileId);
//             masterSheet.appendRow(row_data);

//             let yearFolder = getFolder(parsedData.year, DISCOUNT_BILL_WAITING_PAY_FOLDER_ID);
//             let monthFolder = getFolder(parsedData.month, yearFolder.getId());

//             return {
//                 id: fileId,
//                 parent: ACHIVE_DISCOUNT_BILL_FOLDER_ID,
//                 target: monthFolder.getId()
//             };
//         };

//         move_files = processFilesFromFolder(ACHIVE_DISCOUNT_BILL_FOLDER_ID, processFile);

//         if (move_files.length > 0) {
//             moveFilesToFolder(move_files);
//         }

//         sortSheet(masterSheet, [
//             { column: COL_CODE, ascending: true },
//             { column: COL_YEAR, ascending: true },
//             { column: COL_MONTH, ascending: true },
//             { column: COL_INVOICE, ascending: true }
//         ]);

//         updateYearSummary();
//     });
// }

// function saveAlreadyPaidFileToPaidSheet() {
//     withLock(30000, () => {
//         let ss = getSpreadsheet();
//         let masterSheet = ss.getSheetByName(SHEET_MASTER);
//         let paidSheet = ss.getSheetByName(SHEET_PAID);

//         let move_files = movePaidRecords(masterSheet, paidSheet);

//         sortSheet(paidSheet, [
//             { column: COL_CODE, ascending: true },
//             { column: COL_YEAR, ascending: true },
//             { column: COL_MONTH, ascending: true },
//             { column: COL_INVOICE, ascending: true }
//         ]);

//         if (move_files.length > 0) {
//             moveFilesToFolder(move_files);
//         }

//         updateYearSummary();
//     });
// }

// function deletePaidDiscountBillFiles() {
//     withLock(30000, () => {
//         let ss = getSpreadsheet();
//         let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
//         let discountData = discountBillSheet.getDataRange().getValues();
//         let delete_fileIds = [];

//         for (let i = 1; i < discountData.length; i++) {
//             let row = discountData[i];
//             if (row[COL_PAIDFLAG - 1] === 'Y') {
//                 let fileId = row[COL_FILEID - 1];
//                 delete_fileIds.push(fileId);
//                 discountBillSheet.getRange(i + 1, COL_FILEID).clearContent();
//             }
//         }

//         if (delete_fileIds.length > 0) {
//             deleteFiles(delete_fileIds);
//         }
//     });
// }

// function updateYearSummary() {
//     let ss = getSpreadsheet();
//     let masterSheet = ss.getSheetByName(SHEET_MASTER);
//     let paidSheet = ss.getSheetByName(SHEET_PAID);
//     let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
//     let yearSheet = ss.getSheetByName(SHEET_YEAR);
//     let paidSummaryYearlySheet = ss.getSheetByName(SHEET_PAID_SUMMARY_YEARLY);

//     // Get all data at once
//     let masterData = masterSheet.getDataRange().getValues().slice(1);
//     let paidData = paidSheet.getDataRange().getValues().slice(1);
//     let discountData = discountBillSheet.getDataRange().getValues().slice(1);

//     // Calculate summary
//     let summary = calculateYearSummary(masterData, paidData, discountData);

//     // Prepare data for paid summary yearly sheet
//     let data_to_calculate = masterData.concat(paidData).filter(row => row[COL_YEAR - 1] !== '');
//     let groupByYear = groupBy(data_to_calculate, row => row[COL_YEAR - 1]);

//     // Clear and setup headers
//     paidSummaryYearlySheet.getDataRange().clearContent();
//     let COL_YEAR_MAP = {};

//     Object.keys(groupByYear).sort().forEach((year, i) => {
//         const colIndex = 2 + (i * 4);
//         paidSummaryYearlySheet.getRange(1, colIndex, 3, 4).setValues([
//             [year, "", "", ""],
//             ["ใบส่งของ", "", "ใบจ่ายเงิน", ""],
//             ["จำนวน", "ยอดเงิน", "จำนวน", "ยอดเงิน"]
//         ]).setFontWeight("bold");

//         paidSummaryYearlySheet.getRange(1, colIndex, 1, 4).merge().setHorizontalAlignment("center");
//         paidSummaryYearlySheet.getRange(2, colIndex, 1, 2).merge().setHorizontalAlignment("center");
//         paidSummaryYearlySheet.getRange(2, colIndex + 2, 1, 2).merge().setHorizontalAlignment("center");

//         COL_YEAR_MAP[year] = colIndex;
//     });

//     // Generate and format monthly summary
//     let summaryData = generateMonthlySummary(data_to_calculate, COL_YEAR_MAP);
//     formatPaidSummarySheet(paidSummaryYearlySheet, summaryData, COL_YEAR_MAP);

//     // Write summary to year sheet
//     yearSheet.getRange(2, 1, yearSheet.getLastRow(), yearSheet.getLastColumn()).clearContent();
//     if (summary.length > 0) {
//         yearSheet.getRange(2, 1, summary.length, summary[0].length).setValues(summary);
//     }

//     sortSheet(yearSheet, [
//         { column: 1, ascending: true },
//         { column: 3, ascending: true }
//     ]);
// }

// function updateDailyRecordSummary() {
//     let ss = getSpreadsheet();
//     let listSheet = ss.getSheetByName(SHEET_LISTS);
//     let [header, ...data] = listSheet.getDataRange().getValues();
    
//     // Build category lists
//     let lists = buildCategoryLists(header, data);
    
//     // Build column headers
//     let { columnHeaders, columnHeaders2, mergeRanges } = buildColumnHeaders(lists);
    
//     // Get and transform daily record data
//     let dailyRecordSheet = ss.getSheetByName(SHEET_DAILY_RECORD);
//     let dailyRecordData = dailyRecordSheet.getDataRange().getValues().filter(row => row[0]);
//     let transformedData = transformDailyRecordData(dailyRecordData);
    
//     // Group data by date
//     let dateMap = groupRecordsByDate(transformedData, columnHeaders2, columnHeaders.length);
    
//     // Sort dates and build summary array
//     let sortedDates = Object.keys(dateMap).sort((a, b) => {
//         return new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'));
//     });
    
//     let summary_array = sortedDates.map(dateStr => {
//         let row = dateMap[dateStr];
//         let total = row.slice(1).reduce((sum, val) => sum + val, 0);
//         row[row.length - 1] = total;
//         return row;
//     });
    
//     // Get year range
//     let { min_year, max_year } = getYearRange(sortedDates);
    
//     // Build monthly summary with grouping
//     let { result_array, monthTotalRowIndex, groupRows } = buildMonthlySummary(
//         summary_array, 
//         columnHeaders.length, 
//         min_year, 
//         max_year
//     );
    
//     // Prepend headers
//     result_array = [columnHeaders, columnHeaders2, ...result_array];
    
//     // Write data to sheet
//     let dailyRecordSummarySheet = ss.getSheetByName(SHEET_DAILY_RECORD_SUMMARY);
//     dailyRecordSummarySheet.getDataRange().clear();
//     dailyRecordSummarySheet.getRange(1, 1, result_array.length, result_array[0].length).setValues(result_array);
    
//     // Apply all formatting
//     formatDailyRecordHeaders(dailyRecordSummarySheet, mergeRanges);
//     applyRowGrouping(dailyRecordSummarySheet, groupRows);
//     formatTotalsAndAmounts(dailyRecordSummarySheet, monthTotalRowIndex, result_array);
// }

// function temp() {
//     let ss = getSpreadsheet();
//     let masterSheet = ss.getSheetByName(SHEET_MASTER);
//     let masterData = masterSheet.getDataRange().getValues().slice(1);
//     masterData.forEach((row, i) => {
//         let code = row[COL_CODE - 1];
//         code = "'" + code.padStart(4, '0');
//         masterSheet.getRange(i + 2, COL_CODE).setValue(code);
//     });
// }