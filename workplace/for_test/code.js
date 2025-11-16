const SPREADSHEET_ID = '1sW7WMWXYtmo87XiweRdyEL5hNhtQc1jH_Eu2vdX3H-Q';
const ACHIVE_FOLDER_ID = '1aIS4IF_FWu9WgAsMb2fV6XtGqn9Dap9F';
const UPLOAD_FOLDER_ID = '1Gu3yiv7EbOrP-XBEHr6xe1vWKT8HMEna';
const ALL_FILES_FOLDER = '1DbVOZa02GmYjI957eQA56pzWl_hAT2l6';

const ACHIVE_DISCOUNT_BILL_FOLDER_ID = '1myVym_eCPMb3EhcnWQ-g2gsMavInzkVA';
const DISCOUNT_BILL_WAITING_PAY_FOLDER_ID = '1A4LPApesK5kYjDWpPIsl8Rs3Fu5Tkj8t';

const SHEET_MASTER = 'ใบส่งของ_สรุปลูกค้า';
const SHEET_PAID = 'ลูกค้าจ่ายเงิน';
const SHEET_DISCOUNT_BILL = 'ใบค้างส่วนลด';
const SHEET_YEAR = 'ใบส่งของ_รายปี';
const SHEET_PAID_SUMMARY_YEARLY = 'สรุปใบส่งของ';

// column indices (1-based)
const COL_CODE = 1;
const COL_NAME = 2;
const COL_MONTH = 3;
const COL_YEAR = 4;
const COL_INVOICE = 5;
const COL_AMOUNT = 6;
const COL_FILEURL = 7;
const COL_PAIDFLAG = 8;
const COL_FILEID = 9;
const monthShortNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

const getId = function (fileurl) {
    const regex = /([\w-]{19,33})/;
    const match = fileurl.match(regex);
    return match ? match[0] : false;
};

const FOLDER_MAP = {}

function onOpen() {
    let ui = SpreadsheetApp.getUi();
    ui.createMenu('จัดการใบส่งของ')
        .addItem('ย้ายไฟล์ที่เปลี่ยนชื่อแล้ว', 'moveAlreadyRenamedFiles')
        .addItem('ย้ายไฟล์ที่จ่ายเงินแล้ว', 'saveAlreadyPaidFileToPaidSheet')
        .addSeparator()
        .addItem('ย้ายใบค้างส่วนลด', 'moveDiscountBillFiles')
        .addItem('ลบใบค้างส่วนลดที่จ่ายเงินแล้ว', 'deletePaidDiscountBillFiles')
        .addSeparator()
        .addItem('อัปเดตสรุปรายปี', 'updateYearSummary')
        .addToUi();
}

function moveAlreadyRenamedFiles() {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        Logger.log("มีการทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง");
        Utilities.sleep(5000);
        moveAlreadyRenamedFiles();
        return;
    }
    let achive_folder = DriveApp.getFolderById(ACHIVE_FOLDER_ID);
    if (!achive_folder) {
        Logger.log("ไม่พบโฟลเดอร์เก็บเอกสาร");
        throw new Error("ไม่พบโฟลเดอร์เก็บเอกสาร");
    }
    let files = achive_folder.getFiles();
    let extracted_data = [], move_files = [];
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    while (files.hasNext()) {
        let file = files.next();
        let file_name = file.getName();
        let name_parts = file_name.split('_');
        if (name_parts.length != 4) {
            Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
            continue; // ข้ามไฟล์ที่ชื่อไม่ถูกต้อง
        }
        name_parts[3] = name_parts[3].replace(/\.[^/.]+$/, ""); // ลบสกุลไฟล์ออก
        let [code, name, doc_id, price] = name_parts;
        let [yearMonth, no] = doc_id.split('-');
        if (!yearMonth || !no) {
            Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
            continue; // ข้ามไฟล์ที่ชื่อไม่ถูกต้อง
        }
        yearMonth = yearMonth.replace(/\D/g, '');
        let year = yearMonth.substring(0, 2);
        let month = monthShortNames[parseInt(yearMonth.substring(2, 4), 10) - 1];
        code = "'" + code.padStart(4, '0');
        let row_data = [code, name, month, '25' + year, doc_id, price, '=HYPERLINK("' + 'https://drive.google.com/file/d/' + file.getId() + '/view' + '", "ดูไฟล์")', 'N', file.getId()];
        masterSheet.appendRow(row_data);
        let fileId = row_data[COL_FILEID - 1];
        let yearFolder = getFolder(row_data[COL_YEAR - 1], UPLOAD_FOLDER_ID);
        let monthFolder = getFolder(row_data[COL_MONTH - 1], yearFolder.getId());
        move_files.push({ id: fileId, parent: ACHIVE_FOLDER_ID, target: monthFolder.getId() });
    }
    if (move_files.length > 0) {
        moveFilesToFolder(move_files);
    }
    masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, masterSheet.getLastColumn()).sort([{ column: COL_CODE, ascending: true }, { column: COL_YEAR, ascending: true }, { column: COL_MONTH, ascending: true }, { column: COL_INVOICE, ascending: true }]);
    updateYearSummary();
    lock.releaseLock();
}
function moveDiscountBillFiles() {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        Logger.log("มีการทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง");
        Utilities.sleep(5000);
        moveDiscountBillFiles();
        return;
    }
    let achive_folder = DriveApp.getFolderById(ACHIVE_DISCOUNT_BILL_FOLDER_ID);
    if (!achive_folder) {
        Logger.log("ไม่พบโฟลเดอร์เก็บเอกสาร");
        throw new Error("ไม่พบโฟลเดอร์เก็บเอกสาร");
    }
    let files = achive_folder.getFiles();
    let extracted_data = [], move_files = [];
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
    while (files.hasNext()) {
        let file = files.next();
        let file_name = file.getName();
        let name_parts = file_name.split('_');
        if (name_parts.length != 4) {
            Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
            continue; // ข้ามไฟล์ที่ชื่อไม่ถูกต้อง
        }
        name_parts[3] = name_parts[3].replace(/\.[^/.]+$/, ""); // ลบสกุลไฟล์ออก
        let [code, name, doc_id, price] = name_parts;
        let [yearMonth, no] = doc_id.split('-');
        if (!yearMonth || !no) {
            Logger.log(`ข้ามไฟล์ ${file_name} เนื่องจากชื่อไฟล์ไม่ถูกต้อง`);
            continue; // ข้ามไฟล์ที่ชื่อไม่ถูกต้อง
        }
        yearMonth = yearMonth.replace(/\D/g, '');
        let year = yearMonth.substring(0, 2);
        let month = monthShortNames[parseInt(yearMonth.substring(2, 4), 10) - 1];
        code = "'" + code.padStart(4, '0');
        let row_data = [code, name, month, '25' + year, doc_id, price, '=HYPERLINK("' + 'https://drive.google.com/file/d/' + file.getId() + '/view' + '", "ดูไฟล์")', 'N', file.getId()];
        masterSheet.appendRow(row_data);
        let fileId = row_data[COL_FILEID - 1];
        let yearFolder = getFolder(row_data[COL_YEAR - 1], DISCOUNT_BILL_WAITING_PAY_FOLDER_ID);
        let monthFolder = getFolder(row_data[COL_MONTH - 1], yearFolder.getId());
        move_files.push({ id: fileId, parent: ACHIVE_DISCOUNT_BILL_FOLDER_ID, target: monthFolder.getId() });
    }
    if (move_files.length > 0) {
        moveFilesToFolder(move_files);
    }
    masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, masterSheet.getLastColumn()).sort([{ column: COL_CODE, ascending: true }, { column: COL_YEAR, ascending: true }, { column: COL_MONTH, ascending: true }, { column: COL_INVOICE, ascending: true }]);
    updateYearSummary();
    lock.releaseLock();
}



function getFolder(folderName, parentFolderId) {
    let parentFolder = FOLDER_MAP[parentFolderId];
    if (!parentFolder) {
        parentFolder = DriveApp.getFolderById(parentFolderId);
        FOLDER_MAP[parentFolderId] = parentFolder;
    }
    let folder = FOLDER_MAP[parentFolderId][folderName]
    if (!folder) {
        let folderIterator = parentFolder.getFoldersByName(folderName);
        if (folderIterator.hasNext()) {
            folder = folderIterator.next();
        } else {
            folder = parentFolder.createFolder(folderName);
        }
    }
    FOLDER_MAP[parentFolderId][folderName] = folder;
    return folder;
}


function saveAlreadyPaidFileToPaidSheet() {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        Logger.log("มีการทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง");
        Utilities.sleep(5000);
        return;
    }
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let paidSheet = ss.getSheetByName(SHEET_PAID);
    let masterData = masterSheet.getDataRange().getValues();
    let move_files = [];
    for (let i = masterData.length - 1; i >= 1; i--) {
        let row = masterData[i];
        if (row[COL_PAIDFLAG - 1] === 'Y') {
            // เพิ่มวันที่จ่ายเงินหลัง paidflag
            let paidDate = new Date();
            let fileId = row[COL_FILEID - 1];
            masterSheet.getRange(i + 1, COL_FILEID).setValue(paidDate);
            masterSheet.getRange(i + 1, 1, 1, masterData[0].length).copyTo(paidSheet.getRange(paidSheet.getLastRow() + 1, 1));
            masterSheet.deleteRow(i + 1); // +1 เพราะว่า i เริ่มจาก 0 แต่แถวในสเปรดชีตเริ่มจาก 1
            let yearFolder = getFolder(row[COL_YEAR - 1], ALL_FILES_FOLDER);
            let monthFolder = getFolder(row[COL_MONTH - 1], yearFolder.getId());
            let parentYearFolder = getFolder(row[COL_YEAR - 1], UPLOAD_FOLDER_ID);
            let parentMonthFolder = getFolder(row[COL_MONTH - 1], parentYearFolder.getId());
            move_files.push({ id: fileId, parent: parentMonthFolder.getId(), target: monthFolder.getId() });
        }
    }
    if (paidSheet.getLastRow() > 1) {
        paidSheet.getRange(2, 1, paidSheet.getLastRow() - 1, paidSheet.getLastColumn()).sort([{ column: COL_CODE, ascending: true }, { column: COL_YEAR, ascending: true }, { column: COL_MONTH, ascending: true }, { column: COL_INVOICE, ascending: true }]);
    }
    if (move_files.length > 0) {
        moveFilesToFolder(move_files);
    }
    updateYearSummary();
    lock.releaseLock();
}

function deletePaidDiscountBillFiles() {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        Logger.log("มีการทำงานอื่นอยู่ กรุณาลองใหม่อีกครั้ง");
        Utilities.sleep(5000);
        deletePaidDiscountBillFiles();
        return;
    }
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
    let discountData = discountBillSheet.getDataRange().getValues();
    let delete_files = []
    for (let i = 1; i < discountData.length; i++) {
        let row = discountData[i];
        if (row[COL_PAIDFLAG - 1] === 'Y') {
            let fileId = row[COL_FILEID - 1];
            delete_files.push({
                method: "DELETE",
                endpoint: `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
            });
            discountBillSheet.getRange(i + 1, COL_FILEID).clearContent(); // ลบค่า fileId ในสเปรดชีต
        }
    }
    // ลบไฟล์จาก Google Drive
    if (delete_files.length > 0) {
        var requests = {
            batchPath: "batch/drive/v3", // batch path. This will be introduced in the near future.
            requests: delete_files,
            accessToken: ScriptApp.getOAuthToken(), // Use the current script's OAuth token
        };
        let result = BatchRequest.EDo(requests)
        Logger.log(result);
    }

    lock.releaseLock();
}

function updateYearSummary() {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let paidSheet = ss.getSheetByName(SHEET_PAID);
    let discountBillSheet = ss.getSheetByName(SHEET_DISCOUNT_BILL);
    let yearSheet = ss.getSheetByName(SHEET_YEAR);
    let paidSummaryYearlySheet = ss.getSheetByName(SHEET_PAID_SUMMARY_YEARLY);
    let data_to_calculate = masterSheet.getDataRange().getValues().slice(1).concat(paidSheet.getDataRange().getValues().slice(1)).filter(row => row[COL_YEAR - 1] !== '');
    let discount_data = discountBillSheet.getDataRange().getValues().slice(1).filter(row => row[COL_YEAR - 1] !== '');

    // รวมข้อมูลตามรหัสลูกค้า
    let groupByCode = Object.groupBy(data_to_calculate, row => row[COL_CODE - 1]);
    let discountGroupByCode = Object.groupBy(discount_data, row => row[COL_CODE - 1]);
    let summary = []
    for (let code in groupByCode) {
        let groupByYear = Object.groupBy(groupByCode[code], row => row[COL_YEAR - 1]);
        let discountGroupByYear = discountGroupByCode[code] ? Object.groupBy(discountGroupByCode[code], row => row[COL_YEAR - 1]) : {};
        // รวมข้อมูลตามปี
        for (let year in groupByYear) {
            let rows = groupByYear[year];
            let name = rows[0][COL_NAME - 1];
            let totalAmount = rows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let totalFiles = rows.length;
            let paidFiles = rows.filter(row => row[COL_PAIDFLAG - 1] === 'Y').length;
            let paidAmount = rows.filter(row => row[COL_PAIDFLAG - 1] === 'Y').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let unpaidFiles = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'Y').length;
            let unpaidAmount = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'Y').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let discountAmount = discountGroupByYear[year] ? discountGroupByYear[year].reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0) : 0;
            let discountRemaining = discountGroupByYear[year] ? discountGroupByYear[year].filter(row => row[COL_PAIDFLAG - 1] !== 'Y').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0) : 0;
            summary.push([code, name, year, totalFiles, totalAmount, paidFiles, paidAmount, discountAmount, discountRemaining, unpaidFiles, unpaidAmount]);
        }
    }
    let groupByYear = Object.groupBy(data_to_calculate, row => row[COL_YEAR - 1]);
    let groupByMonth = Object.groupBy(data_to_calculate, row => row[COL_MONTH - 1]);
    let COL_YEAR_MAP = {}
    paidSummaryYearlySheet.getDataRange().clearContent();
    Object.keys(groupByYear).sort().forEach((year, i) => {
        const colIndex = 2 + (i * 2); // B=2, D=4, F=6, H=8, etc.
        paidSummaryYearlySheet.getRange(1, colIndex, 2, 2).setValues([[year, ""], ["ยอดใบส่งของ", "ยอดจ่ายเงิน"]]).setFontWeight("bold");
        paidSummaryYearlySheet.getRange(1, colIndex, 1, 2).merge().setHorizontalAlignment("center");
        COL_YEAR_MAP[year] = colIndex;
    })
    let monthHeaderMap = {
        'ม.ค.': 'มกราคม',
        'ก.พ.': 'กุมภาพันธ์',
        'มี.ค.': 'มีนาคม',
        'เม.ย.': 'เมษายน',
        'พ.ค.': 'พฤษภาคม',
        'มิ.ย.': 'มิถุนายน',
        'ก.ค.': 'กรกฎาคม',
        'ส.ค.': 'สิงหาคม',
        'ก.ย.': 'กันยายน',
        'ต.ค.': 'ตุลาคม',
        'พ.ย.': 'พฤศจิกายน',
        'ธ.ค.': 'ธันวาคม'
    }
    let summaryData = []
    // for (let year in groupByYear) {
    //     let groupByMonth = Object.groupBy(groupByYear[year], row => row[COL_MONTH - 1]);
    //     Object.keys(monthHeaderMap).forEach((month, index) => {
    //         let newRow = new Array(Object.keys(COL_YEAR_MAP).length * 2 + 1).fill('');
    //         newRow[0] = monthHeaderMap[month];
    //         if (!groupByMonth[month]) {
    //             // ถ้าไม่มีข้อมูลเดือนนี้ ให้ข้าม
    //             summaryData.push(newRow);
    //             return;
    //         }
    //         let rows = groupByMonth[month];
    //         let totalFiles = rows.length;
    //         let totalAmount = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'N').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
    //     })
    // }
    Object.keys(monthHeaderMap).forEach((month, index) => {
        let newRow = new Array(Object.keys(COL_YEAR_MAP).length * 2 + 1).fill('0');
        newRow[0] = monthHeaderMap[month];
        if (!groupByMonth[month]) {
            // ถ้าไม่มีข้อมูลเดือนนี้ ให้ข้าม
            summaryData.push(newRow);
            return;
        }
        let rows = groupByMonth[month];
        Object.keys(COL_YEAR_MAP).forEach(year => {
            let totalFiles = rows.filter(row => row[COL_YEAR - 1] == year).length;
            let totalAmount = rows.filter(row => row[COL_YEAR - 1] == year && row[COL_PAIDFLAG - 1] !== 'N').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
            let colIndex = COL_YEAR_MAP[year];
            newRow[colIndex-1] = totalFiles; // ยอดใบส่งของ
            newRow[colIndex] = totalAmount; // ยอดจ่ายเงิน
        })  
        summaryData.push(newRow);
    })
    if (summaryData.length > 0) {
        // add sommary Footer
        let footerRow = new Array(Object.keys(COL_YEAR_MAP).length * 2 + 1).fill('');
        footerRow[0] = 'ยอดรวม';
        Object.keys(COL_YEAR_MAP).forEach(year => {
            let colIndex = COL_YEAR_MAP[year];
            let totalFiles = summaryData.reduce((sum, row) => sum + parseInt(row[colIndex-1]), 0);
            let totalAmount = summaryData.reduce((sum, row) => sum + parseFloat(row[colIndex]), 0);
            footerRow[colIndex-1] = totalFiles;
            footerRow[colIndex] = totalAmount;
        })
        summaryData.push(footerRow);
        paidSummaryYearlySheet.getRange(3, 1, summaryData.length, summaryData[0].length).setValues(summaryData);
        // paidSummaryYearlySheet.getRange(3, 2, summaryData.length, summaryData[0].length-1).setNumberFormat('#,##0.00');
        Object.keys(COL_YEAR_MAP).forEach(year => {
            let colIndex = COL_YEAR_MAP[year];
            paidSummaryYearlySheet.getRange(3, colIndex, summaryData.length, 1).setNumberFormat('#,##0'); // ยอดใบส่งของ
            paidSummaryYearlySheet.getRange(3, colIndex+1, summaryData.length, 1).setNumberFormat('#,##0.00'); // ยอดจ่ายเงิน
        })
        // ตั้งพื้นหลังหัวตาราง และ ตารางสรุป
        paidSummaryYearlySheet.getRange(1, 1, 2, paidSummaryYearlySheet.getLastColumn()).setBackground('#D9E1F2').setFontWeight('bold');
        paidSummaryYearlySheet.getRange(paidSummaryYearlySheet.getLastRow(), 1, 1, paidSummaryYearlySheet.getLastColumn()).setBackground('#FFC000').setFontWeight('bold');
        // ตั้งเส้นขอบตาราง
        paidSummaryYearlySheet.getRange(1, 1, paidSummaryYearlySheet.getLastRow(), paidSummaryYearlySheet.getLastColumn()).setBorder(true, true, true, true, true, true);
    }

    // เขียนสรุปลง yearSheet
    yearSheet.getRange(2, 1, yearSheet.getLastRow(), yearSheet.getLastColumn()).clearContent();
    if (summary.length > 0) {
        yearSheet.getRange(2, 1, summary.length, summary[0].length).setValues(summary);
    }
    yearSheet.getRange(2, 1, yearSheet.getLastRow() - 1, yearSheet.getLastColumn()).sort([{ column: 1, ascending: true }, { column: 3, ascending: true }]);
}

function moveFilesToFolder(files) {
    if (files.length < 1) return
    var requests = {
        batchPath: "batch/drive/v3", // batch path. This will be introduced in the near future.
        requests: files.map(file => {
            return {
                method: "PATCH",
                endpoint: `https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${file.target}&removeParents=${file.parent}`,
            }
        }),
        accessToken: ScriptApp.getOAuthToken(), // Use the current script's OAuth token
    };

    let result = BatchRequest.EDo(requests)
    Logger.log(result);
}

function temp() {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let masterData = masterSheet.getDataRange().getValues().slice(1);
    masterData.forEach((row, i) => {
        let code = row[COL_CODE - 1];
        code = "'" + code.padStart(4, '0');
        masterSheet.getRange(i + 2, COL_CODE).setValue(code);
    });
}