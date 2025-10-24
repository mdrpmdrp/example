const SPREADSHEET_ID = '1sW7WMWXYtmo87XiweRdyEL5hNhtQc1jH_Eu2vdX3H-Q';
const ACHIVE_FOLDER_ID = '1aIS4IF_FWu9WgAsMb2fV6XtGqn9Dap9F';
const UPLOAD_FOLDER_ID = '1Gu3yiv7EbOrP-XBEHr6xe1vWKT8HMEna';
const ALL_FILES_FOLDER = '1DbVOZa02GmYjI957eQA56pzWl_hAT2l6';

const SHEET_MASTER = 'ใบส่งของ_สรุปลูกค้า';
const SHEET_PAID = 'ลูกค้าจ่ายเงิน';
const SHEET_YEAR = 'ใบส่งของ_รายปี';

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
        move_files.push(file.getId());
    }
    if (move_files.length > 0) {
        move_files = move_files.map(fileId => ({ id: fileId, parent: ACHIVE_FOLDER_ID, target: UPLOAD_FOLDER_ID }));
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
    // let paidData = masterData.filter(row => row[COL_PAIDFLAG - 1] === 'Y');
    // let remain_data = masterData.filter(row => row[COL_PAIDFLAG - 1] !== 'Y').slice(1)
    // masterSheet.getRange(2, 1, masterSheet.getLastRow(), masterData[0].length).clearContent();
    // if (remain_data.length > 0) {
    //     masterSheet.getRange(2, 1, remain_data.length, remain_data[0].length).setValues(remain_data);
    // }
    // if (paidData.length > 0) {
    //     paidSheet.getRange(paidSheet.getLastRow() + 1, 1, paidData.length, paidData[0].length).setValues(paidData);
    //     let move_files = paidData.map(row => {
    //         let fileId = row[COL_FILEID - 1];
    //         let yearFolder = getFolder(row[COL_YEAR - 1], UPLOAD_FOLDER_ID);
    //         let monthFolder = getFolder(row[COL_MONTH - 1], yearFolder.getId());
    //         return { id: fileId, parent: UPLOAD_FOLDER_ID, target: monthFolder.getId() };
    //     });
    //     moveFilesToFolder(move_files);
    // }
    // updateYearSummary();
    let move_files = [];
    for (let i = masterData.length - 1; i >= 1; i--) {
        let row = masterData[i];
        if (row[COL_PAIDFLAG - 1] === 'Y') {
            masterSheet.getRange(i + 1, 1, 1, masterData[0].length).copyTo(paidSheet.getRange(paidSheet.getLastRow() + 1, 1));
            masterSheet.deleteRow(i + 1); // +1 เพราะว่า i เริ่มจาก 0 แต่แถวในสเปรดชีตเริ่มจาก 1
            let fileId = row[COL_FILEID - 1];
            let yearFolder = getFolder(row[COL_YEAR - 1], ALL_FILES_FOLDER);
            let monthFolder = getFolder(row[COL_MONTH - 1], yearFolder.getId());
            move_files.push({ id: fileId, parent: UPLOAD_FOLDER_ID, target: monthFolder.getId() });
        }
    }
    if(paidSheet.getLastRow() > 1){
        paidSheet.getRange(2, 1, paidSheet.getLastRow() - 1, paidSheet.getLastColumn()).sort([{ column: COL_CODE, ascending: true }, { column: COL_YEAR, ascending: true }, { column: COL_MONTH, ascending: true }, { column: COL_INVOICE, ascending: true }]);
    }
    if (move_files.length > 0) {
        moveFilesToFolder(move_files);
    }
    updateYearSummary();
    lock.releaseLock();
}

function updateYearSummary() {
    let ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let masterSheet = ss.getSheetByName(SHEET_MASTER);
    let paidSheet = ss.getSheetByName(SHEET_PAID);
    let yearSheet = ss.getSheetByName(SHEET_YEAR);
    let data_to_calculate = masterSheet.getDataRange().getValues().slice(1).concat(paidSheet.getDataRange().getValues().slice(1)).filter(row => row[COL_YEAR - 1] !== '');

    // รวมข้อมูลตามรหัสลูกค้า
    let groupByCode = Object.groupBy(data_to_calculate, row => row[COL_CODE - 1]);
    let summary = []
    for (let code in groupByCode) {
        let rows = groupByCode[code];
        let name = rows[0][COL_NAME - 1];
        let totalAmount = rows.reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
        let totalFiles = rows.length;
        let paidFiles = rows.filter(row => row[COL_PAIDFLAG - 1] === 'Y').length;
        let paidAmount = rows.filter(row => row[COL_PAIDFLAG - 1] === 'Y').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
        let unpaidFiles = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'Y').length;
        let unpaidAmount = rows.filter(row => row[COL_PAIDFLAG - 1] !== 'Y').reduce((sum, row) => sum + parseFloat(row[COL_AMOUNT - 1]), 0);
        let year = rows[0][COL_YEAR - 1];
        summary.push([code, name, year, totalFiles, totalAmount, paidFiles, paidAmount, unpaidFiles, unpaidAmount]);
    }
    summary.sort((a, b) => a[0].localeCompare(b[0]));

    // เขียนสรุปลง yearSheet
    yearSheet.getRange(2, 1, yearSheet.getLastRow(), yearSheet.getLastColumn()).clearContent();
    if (summary.length > 0) {
        yearSheet.getRange(2, 1, summary.length, summary[0].length).setValues(summary);
    }
}

function moveFilesToFolder(files) {
    var requests = {
        batchPath: "batch/drive/v3", // batch path. This will be introduced in the near future.
        requests: files.map(file => {
            return {
                method: "PATCH",
                endpoint: `https://www.googleapis.com/drive/v3/files/${file.id}?addParents=${file.target}&removeParents=${file.parent}&fields=id, parents`,
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