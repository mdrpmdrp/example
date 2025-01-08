let default_richmenu = "richmenu-b3f8a9e102549609114cd04d669ce52d";
let main_richmenu = "richmenu-e20786474dc63f6b4eb40f0833d40baa";
let access_token =
    "+1WkljXys7Dq3xgkVph9eNPrTLVQlQTxFBTfWshs2+THKHHxMw1lBPje2Qd2rg4VZhlEIlcKvybH9u4Tk6Q1SSg3FG1QO9IFFZcvm6iA6x7UznuTOFTthpspjXZdiln1oQSfuKSSMVGOAbHSSwEfUQdB04t89/1O/w1cDnyilFU=";
let Logger
function doGet(e) {
    Logger = BetterLog.useSpreadsheet();
    try {
        let opt = e.parameter.opt
        let uid = e.parameter.uid
        // if (opt == 'set') {

        //   let index = e.parameter.index
        //   setRichMenu(uid, index)
        // }
        switch (opt) {
            case 'set':
                let index = e.parameter.index
                return setRichMenu(uid, index);
            case 'getGifts':
                return getGifts();
            case 'getActivities':
                return getActivities();
            case 'getUserPoint':
                return getUserPoint(e);
        }
        let username = e.parameter.username || ''
        let password = e.parameter.password || ''
        let result = login(username, password, uid)
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } catch (e) { //with stack tracing if your exceptions bubble up to here
        e = (typeof e === 'string') ? new Error(e) : e;
        Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
            e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
        throw e;
    }
}

function doPost(e) {
    Logger = BetterLog.useSpreadsheet()
    try {
        let opt = e.parameter.opt;
        switch (opt) {
            case 'saveRedeemItems':
                return saveRedeemItems(e);
            case 'redeemCode':
                return redeemCode(e);
            default:
                return ContentService.createTextOutput('No action found').setMimeType(ContentService.MimeType.JSON);
        }
    } catch (e) {
        e = (typeof e === 'string') ? new Error(e) : e;
        Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
            e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
        throw e;
    }

}
function onOpen(e) {

    SpreadsheetApp.getUi()
        .createMenu('Admin Menu')
        .addItem('Unlink Richmenu', 'unlinkrichMenu')
        .addSeparator()
        .addItem('👉 Generate Redeem Code', 'generateRedeemCode')
        .addItem('🎁 Generate Gift Code', 'generageGiftCode')  
        .addItem('🗓️ Generate Activity Code', 'generateActivityCode')
        .addSeparator()
        .addItem('✅ Approve Redeem', 'approveRedeem')
        .addToUi();
}

function setRichMenu(uid, index) {
    let options = {
        'method': 'post',
        'headers': {
            'Authorization': 'Bearer ' + access_token
        }
    };
    let result
    let response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/${uid}/richmenu/${main_richmenu}`, options);
    response = response.toString()
    Logger.log(`set Richmenu: ${uid} row: ${parseInt(index) + 1}`)
    if (response) {
        let ss = SpreadsheetApp.getActiveSpreadsheet()
        let userDataSheet = ss.getSheetByName('userLogin')
        if (!userDataSheet) ss.insertSheet('userLogin')
        userDataSheet.getRange('C' + (parseInt(index) + 1)).setValue(uid)
        result = true
    } else result = false
    return result
}

function unlinkrichMenu() {
    let range = SpreadsheetApp.getActiveRange()
    let row = range.getRow()
    let uid = range.getSheet().getRange(row, 3).getDisplayValue()
    if (uid == '') {
        SpreadsheetApp.getUi().alert(`ไม่มี user Id ในแถวที่เลือก`)
    } else {
        let options = {
            'method': 'delete',
            'headers': {
                'Authorization': 'Bearer ' + access_token
            }
        };
        let result
        let response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/user/${uid}/richmenu`, options);
        response = response.toString()
        if (response == "{}") {
            range.getSheet().getRange(row, 3).clearContent()
            let user = range.getSheet().getRange(row, 4, 1, 2).getDisplayValues().map(r => r[0]).join(' ')
            SpreadsheetApp.getUi().alert(`ยกเลิก richmenu ของ ${user} เรียบร้อบ`)

        } else {
            SpreadsheetApp.getUi().alert(`มีข้อผิดพลาด ${response}`)
        }
    }


}
function login(user, password, uid) {
    // user = 'ไพรสัณท์'
    // password= '910014'
    // uid = 'sdfsdfddfgjvdfklgvjndklfvd'
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let userDataSheet = ss.getSheetByName('userLogin')
    if (!userDataSheet) ss.insertSheet('userLogin')

    let userData_data = userDataSheet.getDataRange().getDisplayValues().map(row => {
        let x = {}
        row.forEach((col, i) => {
            let c = columnToLetter(i + 1)
            x[c] = col
        })
        return x
    })

    //U78f6e272ed83c5831d39213c14f9dfae
    let index = userData_data.findIndex(row => (row.A === user && row.B === password))
    let result
    if (index > -1) {
        Logger.log(JSON.stringify(userData_data[index]))
        if (userData_data[index].C != '' && userData_data[index].C != uid) {
            result = 'isduplicate'
        } else {
            result = index
            Logger.log(`LOGIN: ${user} row: ${parseInt(index) + 1}`)
        }
    } else {
        result = false
    }
    return result
}

function getGifts() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Gifts');
    if (!sheet) {
        sheet = ss.insertSheet('Gifts');
        sheet.appendRow(['ID', 'Title', 'Description', 'Image', 'Point']);
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    let data = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues().filter(r => r[0] != '');
    data = data.map(row => {
        return {
            id: row[0],
            title: row[1],
            description: row[2],
            img: row[3],
            point: row[4]
        }
    });
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getActivities() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Activities');
    if (!sheet) {
        sheet = ss.insertSheet('Activities');
        sheet.appendRow(['ID', 'Title', 'Description', 'Date', 'Point']);
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    let data = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues().filter(r => r[0] != '');
    data = data.map(row => {
        return {
            id: row[0],
            title: row[1],
            description: row[2],
            date: row[3],
            point: row[4],
            url: row[5]
        }
    });
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getUserPoint(e) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('userLogin');
    let user = sheet.getRange('C2:C' + sheet.getLastRow()).createTextFinder(e.parameter.uid).matchEntireCell(true).findNext();
    if (user == null) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ท่านยังไม่ได้ลงทะเบียน<br>กรุณาลงทะเบียนก่อนใช้งาน' })).setMimeType(ContentService.MimeType.JSON);
    }
    // uid is col C and point is col Q
    // let point = user.offset(0, 16).getValue();
    // if (point == '' || isNaN(point)) {
    //     point = 0;
    // }
    let user_data = sheet.getRange(user.getRow(), 1, 1, sheet.getLastColumn()).getValues()[0];
    user = {
        point: user_data[16] == '' ? 0 : user_data[16],
        available_point: user_data[17] == '' ? 0 : user_data[17],
        sale_id: user_data[3],
        title: user_data[4],
        name: user_data[5],
        surname: user_data[6],
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', user })).setMimeType(ContentService.MimeType.JSON);
}

function saveRedeemItems(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unable to obtain lock' })).setMimeType(ContentService.MimeType.JSON);
    }
    let items = JSON.parse(e.parameter.items);
    let user = JSON.parse(e.parameter.user);
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('RedeemItems');
    if (!sheet) {
        sheet = ss.insertSheet('RedeemItems');
        sheet.appendRow(['Timestamp', 'Redeem ID', 'UID', 'SaleID', 'Name', 'Gift ID', 'Gift Title', 'Gift Amount', 'Total Point', 'Status']);
    }
    let timestamp = new Date();
    let redeemId = 'REDEEM' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
    let total = items.reduce((acc, item) => acc + item.point, 0);
    let data = items.map(item => {
        return [timestamp, redeemId, user.uid, user.sale_id, user.title + ' ' + user.name + ' ' + user.surname, item.id, item.title, item.amount, total, 'Pending'];
    });
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success'})).setMimeType(ContentService.MimeType.JSON);
}

function redeemCode(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput('Unable to obtain lock').setMimeType(ContentService.MimeType.JSON);
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('userLogin');
    let code_sheet = ss.getSheetByName('Redeem Codes');
    if (!code_sheet) {
        code_sheet = ss.insertSheet('Redeem Codes');
        code_sheet.appendRow(['Code', 'Point', 'Status']);
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No redeem code found' })).setMimeType(ContentService.MimeType.JSON);
    }
    let index = code_sheet.getRange('A2:A' + code_sheet.getLastRow()).createTextFinder(e.parameter.code).matchEntireCell(true).findNext();
    if (index == null) {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid redeem code' })).setMimeType(ContentService.MimeType.JSON);
    }
    let [redeem_point, status] = index.offset(0, 1, 1, 2).getValues()[0];
    if (status == 'Used') {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Redeem code already used' })).setMimeType(ContentService.MimeType.JSON);
    }
    let uid = e.parameter.uid;
    let point = parseInt(redeem_point);
    let user = sheet.getRange('C2:C' + sheet.getLastRow()).createTextFinder(uid).matchEntireCell(true).findNext();
    if (user == null) {
        lock.releaseLock();
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'User not found' })).setMimeType(ContentService.MimeType.JSON);
    }
    let point_range = sheet.getRange(user.getRow(), 17);
    let userPoint = point_range.getValue();
    if (userPoint == '' || isNaN(userPoint)) {
        userPoint = 0;
    }
    point_range.setValue(userPoint + point);
    index.offset(0, 2).setValue('Used');
    user = JSON.parse(e.parameter.user);
    redeemLog(sheet, user, point, userPoint + point, e.parameter.code);
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', add_point: point, total_point: userPoint + point })).setMimeType(ContentService.MimeType.JSON);
}

function redeemLog(sheet, user, point, userPoint, code) {
    let log_sheet = sheet.getParent().getSheetByName('RedeemLog');
    if (!log_sheet) {
        log_sheet = sheet.getParent().insertSheet('RedeemLog');
        log_sheet.appendRow(['Timestamp', 'SaleID', 'Name', 'Redeem Code', 'Redeem Point', 'Remain Point']);
    }
    let timestamp = new Date();
    let data = [timestamp, user.sale_id, user.title + ' ' + user.name + ' ' + user.surname, code, point, userPoint];
    log_sheet.appendRow(data);
}

function columnToLetter(column) {
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

function generateRedeemCode() {
    let letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let num = '0123456789';
    let length = 6;
    let range = SpreadsheetApp.getActiveRange();
    let values = range.getValues();
    values = values.map(row => {
        let code = '';
        for (let i = 0; i < length; i++) {
            let char = Math.random() < 0.5 ? letter : num;
            code += char.charAt(Math.floor(Math.random() * char.length));
        }
        return [code, 100, 'Available'];
    });
    range.offset(0, 0, values.length, values[0].length).setValues(values);
}

function generageGiftCode() {
    let letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let num = '0123456789';
    let length = 6;
    let range = SpreadsheetApp.getActiveRange();
    let values = range.getValues();
    values = values.map(row => {
        let code = '';
        for (let i = 0; i < length; i++) {
            let char = Math.random() < 0.5 ? letter : num;
            code += char.charAt(Math.floor(Math.random() * char.length));
        }
        return [code,'','','', 100];
    });
    range.offset(0, 0, values.length, values[0].length).setValues(values);
}

function generateActivityCode() {
    let letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let num = '0123456789';
    let length = 6;
    let range = SpreadsheetApp.getActiveRange();
    let values = range.getValues();
    values = values.map(row => {
        let code = '';
        for (let i = 0; i < length; i++) {
            let char = Math.random() < 0.5 ? letter : num;
            code += char.charAt(Math.floor(Math.random() * char.length));
        }
        return [code,'','','', 100];
    });
    range.offset(0, 0, values.length, values[0].length).setValues(values);
}

function approveRedeem() {
    let range = SpreadsheetApp.getActiveRange();
    let row = range.getRow();
    let col = range.getColumn();
    if(col != 10) {
        SpreadsheetApp.getUi().alert('Please select the status column');
        return;
    }
    let sheet = range.getSheet();
    let data = sheet.getRange(row, 1, 1, 9).getValues()[0];
    let uid = data[2];
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName('userLogin');
    let user = userSheet.getRange('C2:C' + userSheet.getLastRow()).createTextFinder(uid).matchEntireCell(true).findNext();
    let point = parseInt(data[8]);
    let userPoint = userSheet.getRange(user.getRow(), 17).getValue();
    userSheet.getRange(user.getRow(), 17).setValue(userPoint - point);
    sheet.getRange(row,10).setValue('Success');
}