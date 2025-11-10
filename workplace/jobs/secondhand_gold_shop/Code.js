const SHEET_NAME = {
    BUY: 'บันทึกซื้อ',
    TRANSACTION: 'บันทึกการรับจ่าย',
    SUMMARY: 'สรุป',
    MELT: 'บันทึกหลอม',
    SELL: 'บันทึกขาย',
    LIST: 'List',
    LOG: 'Event Log',
    USER: 'Users',
    BRANCH: 'สาขา',
}
function doGet() {

    let html = HtmlService.createTemplateFromFile('index');
    html.lists = getList();
    return html.evaluate()
        .setTitle('บันทึกซื้อ | HENG MONEY - เฮงมันนี่ 4289')
        .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/b6ea3192-e74b-4483-a7a5-ac5f86a81191.png')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function validatePassword(password) {
    return PropertiesService.getScriptProperties().getProperty('pwd') == password;
}

function getBuyData(isAll = false, reports = false, branch = '') {
    if (!branch || branch === '') {
        return JSON.stringify([]);
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.BUY);
    let today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let timezone = Session.getScriptTimeZone()
    let data = sheet.getDataRange().getValues().slice(1).filter(row => {
        return row[0] && row[0] instanceof Date
    })

    data = data.filter(row => {
        return (row[10] === "" || row[10] === 'รอหลอม') && (branch === 'all' || row[6] === branch)
    })

    let last32Days = new Date();
    last32Days.setDate(last32Days.getDate() - 32);
    last32Days.setHours(0, 0, 0, 0); // Set to start of the day

    if (reports) {
        let timezone = Session.getScriptTimeZone();
        let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
        data = data.filter(row => {
            return row[9] === 'เสร็จสิ้น' && Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today;
        })
    } else {
        data = data.filter(row => {
            let isWithinLast32Days = row[0] >= last32Days;
            return isAll || isWithinLast32Days;
        })
    }

    data = data.sort((a, b) => {
        return b[0] - a[0]; // Sort by date descending
    });
    return JSON.stringify(data.map((row, index) => {
        return {
            date: row[0],
            category: row[1],
            product: row[2],
            weight: row[3],
            price: row[4],
            seller: row[5],
            branch: row[6],
            bank: row[7] || 'ไม่ระบุ',
            monthYear: row[8],
            status: row[9],
            billNo: row[10],
            uuid: row[11],
            enableEdit: Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today,
        }
    }));
}

function getBuySummaryData(isAll = true, branch = 'all') {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.BUY);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let data = sheet.getDataRange().getValues().slice(1).filter(row => {
        return row[0] && row[0] instanceof Date
    })

    let allSellers = [...new Set(data.map(r => r[5]))]
    data = data.filter(row => row[9] !== 'ยกเลิก' && row[9] !== '' && (branch === 'all' || row[6] === branch));
    let groupByMonthYear = Object.groupBy(data, (row) => row[8]); // Group by monthYear
    Object.keys(groupByMonthYear).forEach(monthYear => {
        let groupBySeller = Object.groupBy(groupByMonthYear[monthYear], (row) => row[5]); // Group by seller
        Object.keys(groupBySeller).forEach(seller => {
            groupBySeller[seller] = groupBySeller[seller].length
        })
        groupByMonthYear[monthYear] = groupBySeller
    })
    let result = [];
    Object.keys(groupByMonthYear).forEach(monthYear => {
        result.push({
            monthYear: monthYear,
            sellers: groupByMonthYear[monthYear],
        })
    })
    return JSON.stringify({
        buyData: result,
        allSellers: allSellers,
    });
}

function saveSellData(data) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        throw new Error('ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.BUY);
    if (data.category === 'ค่าบริการ') {
        data.weight = '';
        // inverse price sign for service fee
        data.price = -Math.abs(data.price);
    }
    let newrow = [
        new Date(),
        data.category,
        data.category === 'ค่าบริการ' ? 'ค่าบริการ' : data.product != "" ? (data.category + " " + data.product + '%') : "",
        data.weight,
        data.price,
        data.seller,
        data.branch,
        data.bank,
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-yyyy'),
        "เสร็จสิ้น",
        data.billNo,
        Utilities.getUuid()
    ]
    sheet.getRange(SuperScript.getRealLastRow('A', sheet) + 1, 1, 1, newrow.length).setValues([newrow])
    eventLog('บันทึกข้อมูลการขาย\n' + newrow.join(', ') + '\nโดย ' + data.seller);
    lock.releaseLock();
    return true;
}

function cancelSellData(uuid, canceler) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถยกเลิกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.BUY);
    let finder = sheet.createTextFinder(uuid).findNext()
    if (!finder) {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'ไม่พบข้อมูลที่ต้องการยกเลิก'
        })
    }
    let row = finder.getRow();
    let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    if (data[9] !== "เสร็จสิ้น") {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'รายการนี้ถูกยกเลิกไปแล้ว'
        });
    }
    data[9] = "ยกเลิก";
    data[13] = data[14] = "";
    sheet.getRange(row, 1, 1, data.length).setValues([data]);
    data.splice(9, 1); // Remove the YM column
    eventLog('ยกเลิกข้อมูลการขาย\n' + data.join(', ') + '\nโดย ' + canceler);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'ยกเลิกข้อมูลการขายสำเร็จ'
    });
}

function cancelTransaction(uuid, canceler) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถยกเลิกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.TRANSACTION);
    let finder = sheet.createTextFinder(uuid).findNext()
    if (!finder) {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'ไม่พบข้อมูลที่ต้องการยกเลิก'
        })
    }
    let row = finder.getRow();
    let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    if (data[8] !== "เสร็จสิ้น") {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'รายการนี้ถูกยกเลิกไปแล้ว'
        });
    }
    data[8] = "ยกเลิก";
    sheet.getRange(row, 1, 1, data.length).setValues([data]);
    data.splice(8, 1); // Remove the YM column
    eventLog('ยกเลิกข้อมูลการขาย\n' + data.join(', ') + '\nโดย ' + canceler);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'ยกเลิกข้อมูลการขายสำเร็จ'
    });
}

function getList() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let listSheet = ss.getSheetByName(SHEET_NAME.LIST);
    let [header, ...list] = listSheet.getDataRange().getValues()
    let obj = {}
    header.forEach((key, index) => {
        obj[key] = list.map(row => row[index]).filter(x => x != '')
    });
    return obj
}

function generateUUID() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.BUY);
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        throw new Error('ไม่สามารถสร้าง UUID ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
    try {
        let lastRow = SuperScript.getRealLastRow('A', sheet)
        let uuidRange = sheet.getRange('L2:L' + lastRow).getValues();

        for (let i = 0; i < lastRow - 1; i++) {
            // Check if the cell is empty
            if (uuidRange[i][0] === '') {
                let newUuid = Utilities.getUuid();
                uuidRange[i][0] = newUuid;
            }
        }
        sheet.getRange('L2:L' + lastRow).setValues(uuidRange);
        eventLog('สร้าง UUID สำหรับรายการขายใหม่');
    } finally {
        lock.releaseLock();
    }
}

function saveMeltBill(meltData) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.MELT);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (meltData.selectedRows.length === 0) {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'กรุณาเลือกข้อมูลที่ต้องการหลอม'
        })
    }
    let meltBillNo = generateMeltBillNo(sheet)
    let newRow = [
        new Date(),
        meltBillNo,
        meltData.meltType || '',
        '',
        '',
        meltData.meltWeight || '',
        meltData.meltSellPrice || '',
        "", // sellBillNo
        meltData.recorder || '',
        meltData.branch || '',
        'รอส่ง',
        meltData.percentAfterMelt || '',
    ];
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    let buySheet = ss.getSheetByName(SHEET_NAME.BUY);
    lastRow = SuperScript.getRealLastRow('A', buySheet);
    let dataRange = buySheet.getRange(2, 1, lastRow - 1, buySheet.getLastColumn()).getValues();
    meltData.selectedRows.forEach(uuid => {
        let rowIndex = dataRange.findIndex(row => row[11] === uuid); // Assuming UUID is in column K (index 10)
        if (rowIndex !== -1) {
            let row = dataRange[rowIndex];
            row[10] = meltBillNo; // Update bill number
            row[13] = row[14] = ""; // Clear sell-related fields
            buySheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]); // +2 because of header and zero-based index
        }
    });
    eventLog('บันทึกข้อมูลการหลอม\n' + newRow.join(', ') + '\nโดย ' + meltData.recorder);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลการหลอมสำเร็จ<br>หมายเลขบิลหลอม: ' + meltBillNo
    });
}

function generateMeltBillNo(sheet) {
    const now = new Date();
    const year = now.getFullYear() > 2300 ? now.getFullYear() : now.getFullYear() + 543;
    const prefix = year.toString().slice(-2) + Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMdd');
    const lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) return prefix + '001';

    const lastBillNo = String(sheet.getRange(lastRow, 2).getValue());
    if (!lastBillNo.startsWith(prefix)) return prefix + '001';

    const lastNumber = parseInt(lastBillNo.slice(prefix.length), 10);
    if (isNaN(lastNumber)) return prefix + '001'; // Fallback if last number is not a valid number
    return prefix + String(lastNumber + 1).padStart(3, '0');
}

function saveSellBill(sellData) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.SELL);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (sellData.selectedRows.length === 0) {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'กรุณาเลือกข้อมูลที่ต้องการขาย'
        })
    }
    let sellBillNo = generateSellBillNo(sheet)
    let newRow = [
        new Date(),
        sellBillNo,
        sellData.summaryWeightBefore || '',
        sellData.summaryWeightAfter || '',
        sellData.percentCalc || '',
        sellData.summaryPrice || '',
        sellData.sellBillStatus || '',
        sellData.sellPercentAfterMelt || '',
        sellData.sellPrice || '',
        sellData.sellBillBank || '',
        sellData.sellBillNote || '',
        sellData.recorder || ''
    ];
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    let meltSheet = ss.getSheetByName(SHEET_NAME.MELT);
    lastRow = SuperScript.getRealLastRow('A', meltSheet);
    let dataRange = meltSheet.getRange(2, 1, lastRow - 1, meltSheet.getLastColumn()).getValues();
    sellData.selectedRows.forEach(melt_id => {
        let rowIndex = dataRange.findIndex(row => row[1] === melt_id); // Assuming UUID is in column B (index 1)
        if (rowIndex !== -1) {
            let row = dataRange[rowIndex];
            row[7] = sellBillNo; // Update bill number
            row[3] = row[4] = row[12] = row[15] = '';
            meltSheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]); // +2 because of header and zero-based index
        }
    });
    eventLog('บันทึกข้อมูลการขาย\n' + newRow.join(', ') + '\nโดย ' + sellData.recorder);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลการขายสำเร็จ<br>หมายเลขบิลขาย: ' + sellBillNo
    });
}

function generateSellBillNo(sheet) {
    const now = new Date();
    const year = now.getFullYear() > 2300 ? now.getFullYear() : now.getFullYear() + 543;
    const prefix = "S" + year.toString().slice(-2) + Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMdd');
    const lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) return prefix + '001';

    const lastBillNo = String(sheet.getRange(lastRow, 2).getValue());
    if (!lastBillNo.startsWith(prefix)) return prefix + '001';

    const lastNumber = parseInt(lastBillNo.slice(prefix.length), 10);
    if (isNaN(lastNumber)) return prefix + '001'; // Fallback if last number is not a valid number
    return prefix + String(lastNumber + 1).padStart(3, '0');
}

function getTransactionData(report = true, branch = null) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.TRANSACTION);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let timezone = Session.getScriptTimeZone()
    let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
    let data = sheet.getDataRange().getValues().slice(1).filter(row => {
        return row[0] && row[0] instanceof Date && (branch === 'all' || row[7] === branch)
    })
    if (report) {
        data = data.filter(row => {
            return row[8] === 'เสร็จสิ้น' && Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today;
        })
    } else {
        let last32Days = new Date();
        last32Days.setDate(last32Days.getDate() - 32);
        last32Days.setHours(0, 0, 0, 0); // Set to start of the day
        data = data.filter(row => {
            return row[0] >= last32Days
        })
    }

    data = data.sort((a, b) => {
        return b[0] - a[0]; // Sort by date descending
    });
    return JSON.stringify(data.map(row => {
        return {
            date: row[0],
            type: row[1],
            item: row[2],
            bank: row[3] || 'ไม่ระบุ',
            amount: row[4],
            note: row[5],
            staff: row[6],
            branch: row[7],
            status: row[8],
            uuid: row[9],
            enableEdit: Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today,
        }
    }));
}

function saveTransactionData(transactionData) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.TRANSACTION);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    let newRow = [
        new Date(),
        transactionData.type,
        transactionData.item,
        transactionData.bank,
        transactionData.type === 'รับ' ? transactionData.amount : -transactionData.amount,
        transactionData.note,
        transactionData.staff,
        transactionData.branch || 'สาขาหลัก',
        'เสร็จสิ้น',
        Utilities.getUuid()
    ];
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    eventLog('บันทึกข้อมูลการรับจ่าย\n' + newRow.join(', ') + '\nโดย ' + transactionData.staff);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลการรับจ่ายสำเร็จ'
    })
}

function getSummaryData(reports, branch) {
    let result = {}
    if (reports.buy) {
        result.buy = JSON.parse(getBuyData(false, true, branch)).filter(row => row.status === 'เสร็จสิ้น');
    }
    if (reports.trans) {
        result.trans = JSON.parse(getTransactionData(true, branch)).filter(row => row.status === 'เสร็จสิ้น');
    }
    if (reports.acc && reports.banks && reports.banks.length > 0) {
        reports.banks.push('ไม่ระบุ')
        let buy_groupByBank = Object.groupBy(result.buy, (row) => row.bank);
        let trans_groupByBank = Object.groupBy(result.trans, (row) => row.bank);
        result.acc = {};
        reports.banks.forEach(bank => {
            if (bank.includes("เฮีย")) return;
            result.acc[bank] = {
                in: trans_groupByBank[bank]?.filter(row => row.type === 'รับ') || [],
                out: trans_groupByBank[bank]?.filter(row => row.type === 'จ่าย') || [],
                buy: buy_groupByBank[bank] || [],
            }
        })

    }
    return JSON.stringify(result);
}

function eventLog(message) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(SHEET_NAME.LOG);
    if (!logSheet) {
        logSheet = ss.insertSheet(SHEET_NAME.LOG);
        logSheet.appendRow(['Timestamp', 'Message']);
    }
    logSheet.appendRow([new Date(), message]);
}


function onEdit(e) {
    let sheet = e.range.getSheet();
    let col = e.range.getColumn();
    let row = e.range.getRow();
    if (sheet.getName() === SHEET_NAME.MELT && col === 9 && e.value === 'ยกเลิก') {
        let meltBillNo = sheet.getRange(row, 2).getValue();
        cancelMeltBill(meltBillNo, 'ยกเลิกโดยตรงในชีท');
    }
}

function generateMockupTransactionData() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.TRANSACTION);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    let mockupData = [];
    let mockupBank = ['สด', 'บช.เฮียเจี๋ย', 'บช.หน้าร้าน'];
    for (let i = 0; i < 50; i++) {
        mockupData.push([
            new Date(),
            i % 2 === 0 ? 'รับ' : 'จ่าย',
            'Mock Item ' + (i + 1),
            mockupBank[Math.floor(Math.random() * mockupBank.length)],
            (i + 1) * 1000,
            'หมายเหตุ Mock ' + (i + 1),
            'พนักงาน Mock',
            'เสร็จสิ้น',
            Utilities.getUuid()
        ]);
    }
    sheet.getRange(lastRow + 1, 1, mockupData.length, mockupData[0].length).setValues(mockupData);
}

function loginUser(formObj) {
    const { username, password } = formObj;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.USER);
    let data = sheet.getDataRange().getValues().slice(1)
    let userData = data.find(row => row[1] == username && row[2] == password);
    if (!userData) {
        return JSON.stringify({ success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }
    let userObj = {
        name: userData[0],
        branch: userData[4] === 'admin' ? 'all' : userData[3],
        role: userData[4],
        allowAccounts: userData[5] ? userData[5].split(',').map(s => s.trim()) : [],
    }
    return JSON.stringify({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user: userObj });
}

function getBranch() {
    let branch = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME.BRANCH).getDataRange().getValues().filter(v => v[0]).map(branch => branch[0].trim()).slice(1);
    branch.unshift('all');
    return branch;
}

function getMeltData(branch = 'สาขา 2') {
    if (!branch || branch === '') {
        return JSON.stringify([]);
    }

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.MELT);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }

    let timezone = Session.getScriptTimeZone();
    let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
    const startOfWeek = new Date();
    const endOfWeek = new Date();
    if (startOfWeek.getDay() > 1) { // If today more than Monday
        // get last monday
        startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() - 1));
        endOfWeek.setDate(startOfWeek.getDate() + 6);
    } else if (startOfWeek.getDay() === 0) { // If today is Sunday
        // get last monday
        startOfWeek.setDate(startOfWeek.getDate() - 6);
        // endOfWeek.setDate(startOfWeek.getDate() + 6);
    }
    startOfWeek.setHours(0, 0, 0, 0); // Set to start of the day
    endOfWeek.setHours(23, 59, 59, 999); // Set to end of the day

    let data = sheet.getRange(2, 1, lastRow, sheet.getLastColumn()).getValues().filter(row => {
        return row[0] && row[0] instanceof Date;
    });

    // Filter by branch
    data = data.filter(row => {
        return branch === 'all' || row[8] === branch; // Column I (index 8) is branch
    });

    // Sort by date descending
    data = data.sort((a, b) => {
        return b[0] - a[0];
    });
    return JSON.stringify(data.map(row => {
        return {
            date: row[0],
            billNo: row[1],
            meltType: row[2],
            beforeWeight: row[3],
            buyPrice: row[4],
            afterWeight: row[5],
            sellPrice: row[6],
            sellBillNo: row[7],
            recorder: row[8],
            branch: row[9],
            status: row[10],
            percentAfterMelt: row[11],
            percentCalc: row[12],
            enableEdit: row[10] !== 'ยกเลิก' && (row[0] >= startOfWeek && row[0] <= endOfWeek),
        }
    }));
}

function getSellBillData(branch = 'สาขา 2') {
    if (!branch || branch === '') {
        return JSON.stringify([]);
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME.SELL);
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let timezone = Session.getScriptTimeZone();
    let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
    let data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues().filter(row => {
        return row[0] && row[0] instanceof Date;
    });

    // Filter by branch
    data = data.filter(row => {
        return branch === 'all' || row[11] === branch; // Column L (index 11) is recorder/branch
    });
    // Sort by date descending
    data = data.sort((a, b) => {
        return b[0] - a[0];
    });
    return JSON.stringify(data.map(row => {
        return {
            date: row[0],
            billNo: row[1],
            summaryWeightBefore: row[2],
            summaryWeightAfter: row[3],
            percentCalc: row[4],
            summaryPrice: row[5],
            sellBillStatus: row[6],
            sellPercentAfterMelt: row[7],
            sellPrice: row[8],
            sellBillBank: row[9],
            sellBillNote: row[10],
            recorder: row[11],
        }
    }));
}


function updateMeltBill(billNo, updateData, updater) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({ success: false, message: 'ไม่สามารถแก้ไขข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }

    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(SHEET_NAME.MELT);
        let lastRow = SuperScript.getRealLastRow('A', sheet);
        let dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

        let rowIndex = -1;
        for (let i = 0; i < dataRange.length; i++) {
            if (dataRange[i][1] === billNo) { // Column B (index 1) is bill number
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            return JSON.stringify({ success: false, message: 'ไม่พบบิลหลอมที่ต้องการแก้ไข' });
        }

        let row = dataRange[rowIndex];

        // Update fields
        if (updateData.afterWeight !== undefined && updateData.afterWeight !== null && updateData.afterWeight !== '') {
            row[5] = parseFloat(updateData.afterWeight);
        }
        if (updateData.sellPrice !== undefined && updateData.sellPrice !== null && updateData.sellPrice !== '') {
            row[6] = parseFloat(updateData.sellPrice);
        }
        if (updateData.percentAfterMelt !== undefined && updateData.percentAfterMelt !== null && updateData.percentAfterMelt !== '') {
            row[11] = parseFloat(updateData.percentAfterMelt);
        }
        row[3] = row[4] = row[12] = row[15] = '';
        sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);

        eventLog('แก้ไขข้อมูลบิลหลอม ' + billNo + '\n' + row.join(', ') + '\nโดย ' + updater);

        return JSON.stringify({ success: true, message: 'แก้ไขข้อมูลบิลหลอมสำเร็จ' });
    } catch (error) {
        return JSON.stringify({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
        lock.releaseLock();
    }
}

function updateSellBill(sellBillNo, updateData, updater) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({ success: false, message: 'ไม่สามารถแก้ไขข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }

    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(SHEET_NAME.SELL);
        let lastRow = SuperScript.getRealLastRow('A', sheet);
        let dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

        let rowIndex = -1;
        for (let i = 0; i < dataRange.length; i++) {
            if (dataRange[i][1] === sellBillNo) { // Column B (index 1) is sell bill number
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            return JSON.stringify({ success: false, message: 'ไม่พบบิลขายที่ต้องการแก้ไข' });
        }

        let row = dataRange[rowIndex];

        // Update fields based on the saveSellBill structure
        // Column structure: [date, sellBillNo, summaryWeightBefore, summaryWeightAfter, percentCalc, summaryPrice, sellBillStatus, sellPercentAfterMelt, sellPrice, sellBillBank, sellBillNote, recorder]
        
        if (updateData.sellBillDate !== undefined && updateData.sellBillDate !== null && updateData.sellBillDate !== '') {
            row[0] = new Date(updateData.sellBillDate);
        }
        if (updateData.sellPercentAfterMelt !== undefined && updateData.sellPercentAfterMelt !== null && updateData.sellPercentAfterMelt !== '') {
            row[7] = parseFloat(updateData.sellPercentAfterMelt);
        }
        if (updateData.sellPrice !== undefined && updateData.sellPrice !== null && updateData.sellPrice !== '') {
            row[8] = parseFloat(updateData.sellPrice);
        }
        if (updateData.sellBillStatus !== undefined && updateData.sellBillStatus !== null && updateData.sellBillStatus !== '') {
            row[6] = updateData.sellBillStatus;
        }
        if (updateData.sellBillBank !== undefined && updateData.sellBillBank !== null && updateData.sellBillBank !== '') {
            row[9] = updateData.sellBillBank;
        }
        if (updateData.sellBillNote !== undefined && updateData.sellBillNote !== null) {
            row[10] = updateData.sellBillNote;
        }


        sheet.getRange(rowIndex + 2, 1, 1, row.length).setValues([row]);

        eventLog('แก้ไขข้อมูลบิลขาย ' + sellBillNo + '\n' + row.join(', ') + '\nโดย ' + updater);

        return JSON.stringify({ success: true, message: 'แก้ไขข้อมูลบิลขายสำเร็จ' });
    } catch (error) {
        return JSON.stringify({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
        lock.releaseLock();
    }
}

function cancelMeltBill(billNo, canceler) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({ success: false, message: 'ไม่สามารถยกเลิกบิลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }

    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let meltSheet = ss.getSheetByName(SHEET_NAME.MELT);
        let lastRow = SuperScript.getRealLastRow('A', meltSheet);
        let dataRange = meltSheet.getRange(2, 1, lastRow - 1, meltSheet.getLastColumn()).getValues();

        let rowIndex = -1;
        for (let i = 0; i < dataRange.length; i++) {
            if (dataRange[i][1] === billNo) { // Column B (index 1) is bill number
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            return JSON.stringify({ success: false, message: 'ไม่พบบิลหลอมที่ต้องการยกเลิก' });
        }

        let row = dataRange[rowIndex];

        if (row[10] === 'ยกเลิก') {
            return JSON.stringify({ success: false, message: 'บิลหลอมนี้ถูกยกเลิกไปแล้ว' });
        }

        // Update buy records - reset bill number
        let buySheet = ss.getSheetByName(SHEET_NAME.BUY);
        let buyLastRow = SuperScript.getRealLastRow('A', buySheet);
        let buyDataRange = buySheet.getRange(2, 1, buyLastRow - 1, buySheet.getLastColumn()).getValues();

        buyDataRange.forEach((buyRow, buyIndex) => {
            if (buyRow[10] === billNo) { // Column K (index 10) is bill number
                buyRow[10] = ''; // Reset bill number
                buyRow[13] = buyRow[14] = ""; // Clear sell-related fields
                buySheet.getRange(buyIndex + 2, 1, 1, buyRow.length).setValues([buyRow]);
            }
        });

        // Delete melt record row
        meltSheet.deleteRow(rowIndex + 2);

        eventLog('ยกเลิกบิลหลอม ' + billNo + '\nโดย ' + canceler);

        return JSON.stringify({ success: true, message: 'ยกเลิกบิลหลอมสำเร็จ' });
    } catch (error) {
        return JSON.stringify({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
        lock.releaseLock();
    }
}

function cancelSellBill(billNo, canceler) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({ success: false, message: 'ไม่สามารถยกเลิกบิลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }

    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sellSheet = ss.getSheetByName(SHEET_NAME.SELL);
        let lastRow = SuperScript.getRealLastRow('A', sellSheet);
        let dataRange = sellSheet.getRange(2, 1, lastRow - 1, sellSheet.getLastColumn()).getValues();

        let rowIndex = -1;
        for (let i = 0; i < dataRange.length; i++) {
            if (dataRange[i][1] === billNo) { // Column B (index 1) is bill number
                rowIndex = i;
                break;
            }
        }

        if (rowIndex === -1) {
            return JSON.stringify({ success: false, message: 'ไม่พบบิลขายที่ต้องการยกเลิก' });
        }

        let row = dataRange[rowIndex];

        if (row[6] === 'ยกเลิก') {
            return JSON.stringify({ success: false, message: 'บิลขายนี้ถูกยกเลิกไปแล้ว' });
        }

        // Update buy records - reset bill number
        let meltSheet = ss.getSheetByName(SHEET_NAME.MELT);
        let meltLastRow = SuperScript.getRealLastRow('A', meltSheet);
        let meltDataRange = meltSheet.getRange(2, 1, meltLastRow - 1, meltSheet.getLastColumn()).getValues();

        meltDataRange.forEach((meltRow, meltIndex) => {
            if (meltRow[7] === billNo) { // Column H (index 7) is bill number
                meltRow[7] = ''; // Reset bill number
                meltRow[3] = meltRow[4] = meltRow[12] = meltRow[15] = ''; // Clear related fields
                meltSheet.getRange(meltIndex + 2, 1, 1, meltRow.length).setValues([meltRow]);
            }
        });

        // Delete sell record row
        sellSheet.deleteRow(rowIndex + 2);

        eventLog('ยกเลิกบิลขาย ' + billNo + '\nโดย ' + canceler);

        return JSON.stringify({ success: true, message: 'ยกเลิกบิลขายสำเร็จ' });
    } catch (error) {
        return JSON.stringify({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
        lock.releaseLock();
    }
}

function getAccountBalance(branch = 'all') {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({ success: false, message: 'ไม่สามารถดึงข้อมูลยอดคงเหลือได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }
    let timezone = Session.getScriptTimeZone();

    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName(SHEET_NAME.BUY);
        let sheet2 = ss.getSheetByName(SHEET_NAME.TRANSACTION);
        let lastRow = SuperScript.getRealLastRow('A', sheet);
        let dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
        let lastRow2 = SuperScript.getRealLastRow('A', sheet2);
        let dataRange2 = sheet2.getRange(2, 1, lastRow2 - 1, sheet2.getLastColumn()).getValues();

        let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
        let accountBalance = {
            summary: 0,
            todaybuy: 0,
            todaytrans: 0,
        }
        dataRange.forEach(row => {
            if (row[7] !== 'สด' + branch || row[9] === 'ยกเลิก') return;
            if (branch === 'all' || row[6] === branch) { // Column B (index 1) is branch
                accountBalance.summary -= parseFloat(row[4]) || 0; // Column E (index 4) is amount
                if (Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today && row[9] === 'เสร็จสิ้น') {
                    accountBalance.todaybuy += parseFloat(row[4]) || 0;
                }
            }
        });

        dataRange2.forEach(row => {
            if (row[3] !== 'สด' + branch || row[8] !== 'เสร็จสิ้น') return;
            if (branch === 'all' || row[7] === branch) { // Column H (index 7) is branch
                accountBalance.summary += parseFloat(row[4]) || 0; // Column E (index 4) is amount
                if (Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today && row[8] === 'เสร็จสิ้น') {
                    accountBalance.todaytrans += parseFloat(row[4]) || 0;
                }
            }
        });


        return JSON.stringify({ success: true, accountBalance: accountBalance });
    } catch (error) {
        return JSON.stringify({ success: false, message: 'เกิดข้อผิดพลาด: ' + error.message });
    } finally {
        lock.releaseLock();
    }
}

function getMeltSummaryReport(options) {
    try {
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let meltSheet = ss.getSheetByName(SHEET_NAME.MELT);

        if (!meltSheet) {
            return JSON.stringify({ success: false, message: 'ไม่พบแผ่นงานบันทึกหลอม' });
        }
        let { startDate, endDate, branch } = options;

        startDate = new Date(startDate);
        endDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0); // Start of the day
        endDate.setHours(23, 59, 59, 999); // Include the entire end date

        let lastRow = SuperScript.getRealLastRow('A', meltSheet);
        if (lastRow < 2) {
            return JSON.stringify({ success: true, data: [] });
        }

        // Get all melt data
        let allData = meltSheet.getDataRange().getValues().slice(1);
        let timezone = Session.getScriptTimeZone();

        // Filter data based on options
        let filteredData = allData.filter(row => {
            if (!row[0] || !(row[0] instanceof Date)) return false;
            if (row[10] !== 'รอส่ง') return false; // Only include 'รอส่ง' status   

            // Check date range
            let rowDate = row[0];
            if (rowDate < startDate || rowDate > endDate) return false;

            // Check branch
            if (branch !== 'all' && row[10] !== branch) return false;
            return true;
        });
        // Transform data to expected format xxxxxx
        let transformedData = filteredData.map(row => {
            return {
                date: row[0],
                billNo: row[1] || '',
                meltType: row[2] || '',
                beforeWeight: parseFloat(row[3]) || 0,
                buyPrice: parseFloat(row[4]) || 0,
                afterWeight: parseFloat(row[5]) || 0,
                sellPrice: parseFloat(row[6]) || 0,
                sellBillNo: row[7] || '',
                recorder: row[8] || '',
                branch: row[9] || '',
                status: row[10] || 'เสร็จสิ้น',
                percentAfterMelt: parseFloat(row[11]) || 0,
                percentCalc: parseFloat(row[12]) || 0,
            };
        });
        return JSON.stringify({
            success: true,
            data: transformedData,
            rawData: transformedData,
            summary: {
                totalBills: filteredData.length,
                totalBeforeWeight: transformedData.reduce((sum, item) => sum + (item.totalBeforeWeight || item.beforeWeight), 0),
                totalAfterWeight: transformedData.reduce((sum, item) => sum + (item.totalAfterWeight || item.afterWeight), 0),
                totalBuyPrice: transformedData.reduce((sum, item) => sum + (item.totalBuyPrice || item.buyPrice), 0),
                totalSellPrice: transformedData.reduce((sum, item) => sum + (item.totalSellPrice || item.sellPrice), 0)
            }
        });

    } catch (error) {
        return JSON.stringify({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงรายงาน: ' + error.message
        });
    }
}