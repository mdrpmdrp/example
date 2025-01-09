function doPost(e) {
    let opt = e.parameter.opt;
    switch (opt) {
        case 'register':
            return register(e);
        case 'saveData':
            return saveData(e);
        case 'searchData':
            return searchData(e);
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
    let uuid = generateUUID();
    let newRow = [
        new Date(),
        plateNumber,
        houseNumber,
        ownerName,
        ownerPhone,
        uuid,
        e.parameter.base+ '?u=' + uuid
    ]
    let range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length);
    range
        .setNumberFormats([['dd/MM/yyyy HH:mm:ss', plateNumber, houseNumber, ownerName, ownerPhone, '@', ""]])
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
    let uuid = e.parameter.uuid;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Sheet1');
    let data = sheet.getDataRange().getValues();
    let result = data.find(row => row[5] === uuid);
    if(result){
        result = {
            date: result[0],
            plateNumber: result[1],
            houseNumber: result[2],
            ownerName: result[3],
            ownerPhone: result[4],
            uuid: result[5],
            url: result[6]
        }
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
    }

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