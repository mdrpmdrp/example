defafunction doGet(e) {
    let html = HtmlService.createTemplateFromFile('index')
    html.lists = getLists();
    html = html.evaluate()
        .setTitle('Quick Deal Project')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setFaviconUrl('https://www.samitivejchonburi.com/html/images/icon-cat-02.png');
    return html
}

function returnObj(obj) {
    return JSON.stringify(obj);
}

function doLogin(user, pass) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Users');
    let data = ws.getDataRange().getValues();
    let user_found = data.find(row => row[0] == user && row[1] == pass);
    if (!user_found) return returnObj({ success: false, message: 'Invalid username or password' })
    user_found = {
        name: user_found[2],
        role: user_found[3],
        expiry: new Date().getTime() + 3600000
    }
    return returnObj({ success: true, user: user_found }); // 1 hour   
}

function getContractData(role) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Query Helper Sheet');
    let data = ws.getDataRange().getValues();
    let headers = data.shift();
    let contracts = data.map(row => {
        return {
            hn: row[0],
            company: row[1],
            employeeId: row[2],
            prefix: row[3],
            fullName: row[4],
            birthDate: row[5],
            citizenId: row[6],
            checkupProgram: row[7],
            additionalCheckupProgram: row[8],
            entitlementDocument: row[9],
            startDate: row[10],
            endDate: row[11],
            serviceStatus: row[12],
            registerNote: row[13],
            opdNote: row[14],
            serviceDate: row[15],
            lastUpdated: row[16],
            phone: row[17],
            dataStatus: row[18] || "Locked"
        }
    })
    if (role === 'เวชระเบียน') {
        contracts = contracts.filter(c => c.dataStatus !== 'Inactive');
    } else if (role !== 'admin') {
        contracts = contracts.filter(c => c.dataStatus === 'Active' && c.serviceStatus !== '');
    }
    return returnObj({
        success: true,
        data: contracts
    });

}

function getLists() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Lists');
    let data = ws.getDataRange().getValues();
    let headers = data.shift();
    let lists = {}
    headers.forEach((header, index) => {
        lists[header.toLowerCase()] = data.map(row => row[index]).filter(item => item);
    })
    return lists
}

function saveUpdateData(formData) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        return returnObj({ success: false, message: 'Could not acquire lock' });
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ws = ss.getSheetByName('Visit Data');
    const data = ws.getDataRange().getValues();
    const today = new Date();
    const newRow = [
        formData.hn,
        formData.company,
        formData.employeeId,
        formData.prefix,
        formData.fullName,
        formData.birthDate,
        formData.citizenId,
        formData.checkupProgram,
        formData.additionalCheckupProgram,
        formData.entitlementDocument,
        formData.startDate,
        formData.endDate,
        formData.serviceStatus || "Register",
        formData.registerNote,
        formData.opdNote,
        today, // serviceDate is set to
        today, // lastUpdated
        "'" + formData.phone,
        formData.dataStatus || "Active"
    ];

    // Always append if no serviceDate
    if (!formData.serviceDate) {
        ws.appendRow(newRow);
        lock.releaseLock();
        return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    }

    newRow[15] = new Date(formData.serviceDate); // use existing serviceDate if provided

    // Find row by citizenId or trimmed fullName
    const rowIdx = data.findIndex(row =>
        row[6] === formData.citizenId ||
        (row[4] && row[4].trim() === formData.fullName)
    );

    if (rowIdx !== -1) {
        const existingDate = data[rowIdx][15]; // existing serviceDate
        if (existingDate && new Date(existingDate).toDateString() === today.toDateString()) {
            ws.getRange(rowIdx + 1, 1, 1, newRow.length).setValues([newRow]);
            lock.releaseLock();
            return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
        } else {
            newRow[15] = today; // update serviceDate to today if not same day
            newRow[16] = today;
        }
    }

    ws.appendRow(newRow);
    lock.releaseLock();
    return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
}

function saveQuickUpdate(formData) {
    formData = {
        "serviceStatus": "OBG",
        "opdNote": "qwedweferdsv",
        "hn": "hn12424"
    }
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        return returnObj({ success: false, message: 'Could not acquire lock' });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Visit Data');
    let finder = ws.getRange("A:A").createTextFinder(formData.hn).matchEntireCell(true).findNext();
    if (!finder) {
        lock.releaseLock();
        return returnObj({ success: false, message: 'ไม่พบข้อมูล HN นี้' });
    }
    const today = new Date();
    const newRow = ws.getRange(finder.getRow(), 1, 1, ws.getLastColumn()).getValues()[0];
    const existingDate = newRow[15];
    let serviceStatus = formData.serviceStatus;
    let opdNote = formData.opdNote;
    newRow[12] = serviceStatus;
    newRow[14] = opdNote;
    newRow[16] = today;
    if (existingDate && new Date(existingDate).toDateString() === today.toDateString()) {
        ws.getRange(finder.getRow(), 1, 1, newRow.length).setValues([newRow]);
        lock.releaseLock();
        return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    } else {
        newRow[15] = today; // update serviceDate to today if not same day
        newRow[16] = today;
        ws.appendRow(newRow);
        lock.releaseLock();
        return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    }
}

function setDataActive(hn) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        return returnObj({ success: false, message: 'Could not acquire lock' });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Visit Data');
    let finder = ws.getRange("A:A").createTextFinder(hn).matchEntireCell(true).findNext();
    if (finder) {
        let row = finder.getRow();
        ws.getRange(row, 17).setValue(new Date());
        ws.getRange(row, 19).setValue("Active");
        lock.releaseLock();
        return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    }
    else {
        lock.releaseLock();
        return returnObj({ success: false, message: 'ไม่พบข้อมูล HN นี้' });
    }
}


function setDataInactive(hn) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        return returnObj({ success: false, message: 'Could not acquire lock' });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let ws = ss.getSheetByName('Visit Data');
    let finder = ws.getRange("A:A").createTextFinder(hn).matchEntireCell(true).findNext();
    if (finder) {
        let row = finder.getRow();
        ws.getRange(row, 17).setValue(new Date());
        ws.getRange(row, 19).setValue("Inactive");
        lock.releaseLock();
        return returnObj({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
    } else {
        lock.releaseLock();
        return returnObj({ success: false, message: 'ไม่พบข้อมูล HN นี้' });
    }

}