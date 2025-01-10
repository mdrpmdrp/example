const LINE_TOKEN = '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU='
const FOLDER = '1FZnweakVXeIVN1NjGm63joM081vpnkaB'
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

function register(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Script is currently running' })).setMimeType(ContentService.MimeType.JSON);
    }
    let { plateNumber, houseNumber, ownerName, ownerPhone } = e.parameter;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');
    let uuid = generateUUID();
    let newRow = [
        new Date(),
        plateNumber,
        houseNumber,
        ownerName,
        ownerPhone,
        e.parameter.uid,
        uuid,
        e.parameter.base + '?u=' + uuid
    ]
    let range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length);
    range
        .setNumberFormats([['dd/MM/yyyy HH:mm:ss', '@', '@', '@', '@', '@', '@', ""]])
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
    if(!auth){
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized' })).setMimeType(ContentService.MimeType.JSON);
    }
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
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result, user: auth[0] })).setMimeType(ContentService.MimeType.JSON);
    }else{
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Data not found' })).setMimeType(ContentService.MimeType.JSON);
    }

}

function checkCode(e){
    let uid = e.parameter.uid;
    let code = e.parameter.code;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Auth');
    let data = sheet.getDataRange().getValues();
    let index = data.findIndex(row => row[1] == code);
    if (index > -1) {
        sheet.getRange(index + 1, 3).setValue(uid);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', user: data[index][0] })).setMimeType(ContentService.MimeType.JSON);
    }else{
        return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Code not found' })).setMimeType(ContentService.MimeType.JSON);
    }

}

function checkAuth(user_id){
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Auth');
    let data = sheet.getDataRange().getValues();
    let result = data.find(row => row[2] === user_id);
    return result
}

function generateUUID() {
    let alpahbet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let numbers = '0123456789';
    let length = 8;
    let uuid = '';
    for (let i = 0; i < length; i++) {
        let char = i % 2 === 0 ? alpahbet : numbers;
        uuid += char.charAt(Math.floor(Math.random() * char.length));
    }
    return uuid;
}

function getUploadKey(e) {
    let token = ScriptApp.getOAuthToken()
    let folder = FOLDER
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: { token, folder } })).setMimeType(ContentService.MimeType.JSON);
}

function report(e){
    let {uid,detail,user_name,image, plateNumber, houseNumber, ownerName, ownerPhone} = e.parameter;
    if(image) image = 'https://lh3.googleusercontent.com/d/' + image;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('ข้อมูลร้องเรียน');
    let uuid = generateUUID();
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
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Data saved', report_id: uuid})).setMimeType(ContentService.MimeType.JSON);   
}

function sendToLine(e){
    let {uid, report_id, image} = e.parameter;
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
    
    let data = {
        to: uid,
        messages: [
            {
                type: 'text',
                text: message,
                sender: {
                    name: 'ระบบแจ้งปัญหา',
                    iconUrl: 'https://img.icons8.com/arcade/50/bot.png'
                }
            },
            {
                type: 'image',
                originalContentUrl: 'https://lh3.googleusercontent.com/d/' + image,
                previewImageUrl: 'https://lh3.googleusercontent.com/d/' + image,
                sender: {
                    name: 'ระบบแจ้งปัญหา',
                    iconUrl: 'https://img.icons8.com/arcade/50/bot.png'
                }
            }
        ],

    }
    let options = {
        'method': 'post',
        'headers': headers,
        'payload': JSON.stringify(data)
    }
    let response = UrlFetchApp.fetch(url, options);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Message sent'})).setMimeType(ContentService.MimeType.JSON);   
}