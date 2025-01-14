const LINE_TOKEN = '2hM47bPSHc9pbY0ud7qH/crUyykf4+hp4yiQS4XP45pSEfuv634xxV4vGRCZPHEajuDzZFBG2A1H/8QORqkciWxkgEq8tyxBDXoOOn/1ANXJpjVzckzDn33t5bwgSpIAW5uFJody+KVoASikraDK1QdB04t89/1O/w1cDnyilFU='
const FOLDER = '1aTuyDDkytk686Uxe5HkIVucwqCL7-Tj5'
function onOpen(e) {

    SpreadsheetApp.getUi()
        .createMenu('Admin Menu')
        .addItem('👉 Generate Code', 'generateCode')
        .addToUi();
}
function doPost(e) {
    Logger = BetterLog.useSpreadsheet();
    try {
        let opt = e.parameter.opt;
        switch (opt) {
            case 'register':
                return register(e);
            case 'saveData':
                return saveData(e);
            case 'searchData':
                return searchData(e);
            case 'getUploadKey':
                return getUploadKey(e);
            case 'checkCode':
                return checkCode(e);
            case 'report':
                return report(e);
            case 'sendline':
                return sendToLine(e);
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid option' })).setMimeType(ContentService.MimeType.JSON);
    } catch (e) { //with stack tracing if your exceptions bubble up to here
        e = (typeof e === 'string') ? new Error(e) : e;
        Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
            e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
        throw e;
    }
}

function doGet(e) {
    let opt = e.parameter.opt;
    switch (opt) {
        case 'checkqr':
            return checkQRCode(e);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid option' })).setMimeType(ContentService.MimeType.JSON);
}

function register(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Script is currently running' })).setMimeType(ContentService.MimeType.JSON);
    }
    let { plateNumber, houseNumber, ownerName, ownerPhone } = e.parameter;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');
    let uuid = e.parameter.uuid;
    let index = sheet.getDataRange().getValues().findIndex(row => row[6] === uuid);

    let newRow = [
        new Date(),
        plateNumber,
        houseNumber,
        ownerName,
        ownerPhone,
        e.parameter.uid,
        uuid,
    ]
    let range = sheet.getRange(index+ 1, 1, 1, newRow.length);
    range
        .setNumberFormats([['dd/MM/yyyy HH:mm:ss', '@', '@', '@', '@', '@', '@']])
        .setValues([newRow]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data saved', data: newRow })).setMimeType(ContentService.MimeType.JSON);
}

function saveData(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Script is currently running' })).setMimeType(ContentService.MimeType.JSON);
    }
}

function searchData(e) {
    let user_id = e.parameter.user_id;
    let auth = checkAuth(user_id);
    let uuid = e.parameter.uuid;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');
    let data = sheet.getDataRange().getValues();
    let result = data.find(row => row[6] === uuid);
    if (result) {
        result = {
            date: result[0],
            plateNumber: result[1],
            houseNumber: result[2],
            ownerName: result[3],
            ownerPhone: result[4],
            uid: result[5],
            url: result[7]
        }
        let res = { status: 'success', data: result, user: auth ? auth[0] : "" }
        if (!auth) {
            res.message = 'Unauthorized'
        }

        return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Data not found' })).setMimeType(ContentService.MimeType.JSON);
    }

}

function checkCode(e) {
    let uid = e.parameter.uid;
    let code = e.parameter.code;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Auth');
    let data = sheet.getDataRange().getValues();
    let index = data.findIndex(row => row[1] == code);
    if (index > -1) {
        sheet.getRange(index + 1, 3).setValue(uid);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', user: data[index][0] })).setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Code not found' })).setMimeType(ContentService.MimeType.JSON);
    }

}

function checkQRCode(e) {
    let auth = checkAuth(e.parameter.uid);
    if(!auth) auth = 'Unauthorized'
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');
    let data = sheet.getDataRange().getValues();
    let result = data.findIndex(row => row[6] === e.parameter.code);
    if (result < 0) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Code not found', auth })).setMimeType(ContentService.MimeType.JSON);
    }
    res = {
        plateNumber: data[result][1],
        houseNumber: data[result][2],
        ownerName: data[result][3],
        ownerPhone: data[result][4],
        uid: data[result][5],
        url: data[result][7]
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: res, auth })).setMimeType(ContentService.MimeType.JSON);
}

function checkAuth(user_id) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Auth');
    let data = sheet.getDataRange().getValues();
    let result = data.find(row => row[2] === user_id);
    return result
}

function getUploadKey(e) {
    let token = ScriptApp.getOAuthToken()
    let folder = FOLDER
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { token, folder } })).setMimeType(ContentService.MimeType.JSON);
}

function report(e) {
    let {uuid, uid, detail, user_name, image, plateNumber, houseNumber, ownerName, ownerPhone } = e.parameter;
    if (image) image = 'https://lh3.googleusercontent.com/d/' + image;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('ข้อมูลร้องเรียน');
    uuid = e.parameter.uuid;
    let newRow = [
        new Date(),
        uuid,
        uid,
        user_name,
        detail,
        plateNumber,
        houseNumber,
        ownerName,
        ownerPhone,
        image
    ]
    let range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length);
    range
        .setNumberFormats([['dd/MM/yyyy HH:mm:ss', '@', '@', '@', '@', '@', '@', '@', '@', '@']])
        .setValues([newRow]);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data saved', report_id: uuid })).setMimeType(ContentService.MimeType.JSON);
}

function sendToLine(e) {
    let { uid, report_id, image } = e.parameter;
    let token = 'Bearer ' + LINE_TOKEN;
    let url = 'https://api.line.me/v2/bot/message/push';
    let headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    }
    let message = 'มีรายงานข้อมูลร้องเรียนใหม่ รหัส #' + report_id +
        '\n\nรายละเอียด: ' + e.parameter.detail +
        '\nเลขทะเบียน: ' + e.parameter.plateNumber +
        '\nเลขที่บ้าน: ' + e.parameter.houseNumber +
        '\nชื่อเจ้าของ: ' + e.parameter.ownerName

    let messages = [
        {
            type: 'text',
            text: message,
            sender: {
                name: 'ระบบแจ้งปัญหา',
                iconUrl: 'https://img.icons8.com/arcade/50/bot.png'
            }
        }
    ]
    if (image && image != '' && image != null && image != 'null') {
        messages.push({
            type: 'image',
            originalContentUrl: 'https://lh3.googleusercontent.com/d/' + image,
            previewImageUrl: 'https://lh3.googleusercontent.com/d/' + image,
            sender: {
                name: 'ระบบแจ้งปัญหา',
                iconUrl: 'https://img.icons8.com/arcade/50/bot.png'
            }
        })
    }
    let data = {
        to: uid,
        messages: messages,

    }
    let options = {
        'method': 'post',
        'headers': headers,
        'payload': JSON.stringify(data)
    }
    let response = UrlFetchApp.fetch(url, options);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Message sent' })).setMimeType(ContentService.MimeType.JSON);
}

function generateCode() {
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
        return [code, 'https://liff.line.me/2006763668-b44qpLQN?u=' + code]
    });
    range.offset(0, 0, values.length, values[0].length).setValues(values);
}