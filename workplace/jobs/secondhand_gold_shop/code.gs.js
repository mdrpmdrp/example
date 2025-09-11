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
    let sheet = ss.getSheetByName('บันทึกซื้อ');
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
        return (row[10] === "" || row[10] === 'รอหลอม') && (branch === 'all' || row[5] === branch)
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
            branch: branch,
            bank: row[7] || 'ไม่ระบุ',
            monthYear: row[8],
            status: row[9],
            billNo: row[10],
            uuid: row[11],
            enableEdit: Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today,
        }
    }));
}

function getBuySummaryData(isAll = true) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกซื้อ');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let data = sheet.getDataRange().getValues().slice(1).filter(row => {
        return row[0] && row[0] instanceof Date
    })

    let allSellers = [...new Set(data.map(r => r[5]))]
    data = data.filter(row => row[8] !== 'ยกเลิก' && row[8] !== '');
    let groupByMonthYear = Object.groupBy(data, (row) => row[7]); // Group by monthYear
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
    let sheet = ss.getSheetByName('บันทึกซื้อ');
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
    let sheet = ss.getSheetByName('บันทึกซื้อ');
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

function cancelTransaction(uuid, canceler) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return JSON.stringify({
            success: false,
            message: 'ไม่สามารถยกเลิกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
        });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกการรับจ่าย');
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
    if (data[7] !== "เสร็จสิ้น") {
        lock.releaseLock();
        return JSON.stringify({
            success: false,
            message: 'รายการนี้ถูกยกเลิกไปแล้ว'
        });
    }
    data[7] = "ยกเลิก";
    sheet.getRange(row, 1, 1, data.length).setValues([data]);
    data.splice(7, 1); // Remove the YM column
    eventLog('ยกเลิกข้อมูลการขาย\n' + data.join(', ') + '\nโดย ' + canceler);
    lock.releaseLock();
    return JSON.stringify({
        success: true,
        message: 'ยกเลิกข้อมูลการขายสำเร็จ'
    });
}

function getList() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let listSheet = ss.getSheetByName('List');
    let [header, ...list] = listSheet.getDataRange().getValues()
    let obj = {}
    header.forEach((key, index) => {
        obj[key] = list.map(row => row[index]).filter(x => x != '')
    });
    return obj
}

function generateUUID() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกซื้อ');
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        throw new Error('ไม่สามารถสร้าง UUID ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
    }
    try {
        let lastRow = SuperScript.getRealLastRow('A', sheet)
        let uuidRange = sheet.getRange('K2:K' + lastRow).getValues();

        for (let i = 0; i < lastRow - 1; i++) {
            // Check if the cell is empty
            if (uuidRange[i][0] === '') {
                let newUuid = Utilities.getUuid();
                uuidRange[i][0] = newUuid;
            }
        }
        sheet.getRange('K2:K' + lastRow).setValues(uuidRange);
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
    let sheet = ss.getSheetByName('บันทึกหลอม');
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
        '',
        '',
        meltData.meltWeight || '',
        meltData.meltSellPrice || '',
        meltData.recorder || '',
        'เสร็จสิ้น'
    ];
    sheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
    let buySheet = ss.getSheetByName('บันทึกซื้อ');
    lastRow = SuperScript.getRealLastRow('A', buySheet);
    let dataRange = buySheet.getRange(2, 1, lastRow - 1, buySheet.getLastColumn()).getValues();
    meltData.selectedRows.forEach(uuid => {
        let rowIndex = dataRange.findIndex(row => row[10] === uuid); // Assuming UUID is in column K (index 10)
        if (rowIndex !== -1) {
            let row = dataRange[rowIndex];
            row[9] = meltBillNo; // Update bill number
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
    if (lastRow < 2) return prefix + '01';

    const lastBillNo = String(sheet.getRange(lastRow, 2).getValue());
    if (!lastBillNo.startsWith(prefix)) return prefix + '1';

    const lastNumber = parseInt(lastBillNo.slice(prefix.length), 10);
    if (isNaN(lastNumber)) return prefix + '1'; // Fallback if last number is not a valid number
    return prefix + String(lastNumber + 1)
}

function getTransactionData(report = true) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกการรับจ่าย');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    if (lastRow < 2) {
        return JSON.stringify([]);
    }
    let timezone = Session.getScriptTimeZone()
    let today = Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd');
    let data = sheet.getDataRange().getValues().slice(1).filter(row => {
        return row[0] && row[0] instanceof Date
    })
    if (report) {
        data = data.filter(row => {
            return row[7] === 'เสร็จสิ้น' && Utilities.formatDate(row[0], timezone, 'yyyy-MM-dd') === today;
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
            status: row[7],
            uuid: row[8],
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
    let sheet = ss.getSheetByName('บันทึกการรับจ่าย');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    let newRow = [
        new Date(),
        transactionData.type,
        transactionData.item,
        transactionData.bank,
        transactionData.type === 'รับ' ? transactionData.amount : -transactionData.amount,
        transactionData.note,
        transactionData.staff,
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

function getSummaryData(reports) {
    let result = {}
    if (reports.buy) {
        result.buy = JSON.parse(getBuyData(false, true)).filter(row => row.status === 'เสร็จสิ้น');
    }
    if (reports.trans) {
        result.trans = JSON.parse(getTransactionData(true)).filter(row => row.status === 'เสร็จสิ้น');
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
    let logSheet = ss.getSheetByName('Event Log');
    if (!logSheet) {
        logSheet = ss.insertSheet('Event Log');
        logSheet.appendRow(['Timestamp', 'Message']);
    }
    logSheet.appendRow([new Date(), message]);
}


function onEdit(e) {
    let sheet = e.range.getSheet();
    let col = e.range.getColumn();
    let row = e.range.getRow();
    if (sheet.getName() === 'บันทึกหลอม' && col === 8 && e.value === 'ยกเลิก') {
        let lock = LockService.getScriptLock();
        if (!lock.tryLock(10000)) {
            throw new Error('ไม่สามารถยกเลิกการหลอมได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
        }
        let meltBillNo = sheet.getRange(row, 2).getValue();
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let buySheet = ss.getSheetByName('บันทึกซื้อ');
        let lastRow = SuperScript.getRealLastRow('A', buySheet);
        let dataRange = buySheet.getRange(2, 1, lastRow - 1, buySheet.getLastColumn()).getValues();
        dataRange.forEach((row, index) => {
            if (row[9] == meltBillNo) { // Assuming bill number is in column J (index 9)
                row[9] = ''; // Reset bill number to ''
                buySheet.getRange(index + 2, 1, 1, row.length).setValues([row]); // +2 because of header and zero-based index
            }
        });
        sheet.deleteRow(row); // Delete the row where the cancel was triggered
        eventLog('ยกเลิกบิลหลอม ' + meltBillNo + '\nโดย ' + Session.getActiveUser().getEmail());
        lock.releaseLock();
    }
}

function generateMockupTransactionData() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกการรับจ่าย');
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
    let sheet = ss.getSheetByName('Users');
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