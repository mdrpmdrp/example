
function doGet(e){
    let action = e.parameter.action;
    switch(action){
        case 'getGifts':
            return getGifts();
        case 'getActivities':
            return getActivities();
        case 'getUserPoint':
            return getUserPoint(e);
        default:
            return ContentService.createTextOutput('No action found').setMimeType(ContentService.MimeType.JSON);
    }
}

function doPost(e){
    Logger = BetterLog.useSpreadsheet()
    let action = e.parameter.action;
    switch(action){
        case 'saveRedeemItems':
            return saveRedeemItems(e);
        case 'redeemCode':
            return redeemCode(e);
        default:
            return ContentService.createTextOutput('No action found').setMimeType(ContentService.MimeType.JSON);
    }
}

function getGifts(){
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Gifts');
    if(!sheet){
        sheet = ss.insertSheet('Gifts');
        sheet.appendRow(['ID', 'Title', 'Description', 'Image', 'Point']);
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    let data = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
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

function getActivities(){
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Activities');
    if(!sheet){
        sheet = ss.insertSheet('Activities');
        sheet.appendRow(['ID', 'Title', 'Description', 'Date', 'Point']);
        return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
    }
    let data = sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    data = data.map(row => {
        return {
            id: row[0],
            title: row[1],
            description: row[2],
            date: row[3],
            point: row[4]
        }
    });
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getUserPoint(e){
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Users');
    if(!sheet){
        sheet = ss.insertSheet('Users');
        sheet.appendRow(['UID', 'Name', 'Point']);
        return ContentService.createTextOutput('0').setMimeType(ContentService.MimeType.JSON);
    }
    let user = sheet.creatTextFinder(e.parameter.uid).matchEntireCell(true).findNext();
    if(user == null){
        return ContentService.createTextOutput('0').setMimeType(ContentService.MimeType.JSON);
    }
    let point = user.offset(0, 2).getValue();
    if(point == '' || isNaN(point)){
        point = 0;
    }
    return ContentService.createTextOutput(point).setMimeType(ContentService.MimeType.JSON);
}

function saveRedeemItems(e){
    let lock = LockService.getScriptLock();
    if(!lock.tryLock(10000)){
        return ContentService.createTextOutput('Unable to obtain lock').setMimeType(ContentService.MimeType.JSON);
    }
    let items = JSON.parse(e.parameter.items);
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('RedeemItems');
    if(!sheet){
        sheet = ss.insertSheet('RedeemItems');
        sheet.appendRow(['Timestamp', 'Redeem ID', 'UID', 'Name', 'Gift ID', 'Gift Title', 'Gift Amount', 'Total Point', 'Status']);
    }
    let timestamp = new Date(); 
    let redeemId = 'REDEEM' + Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
    let total = items.reduce((acc, item) => acc + item.point, 0);
    let data = items.map(item => {
        return [timestamp, redeemId, item.uid, item.name, item.id, item.title, item.amount, total, 'Pending'];
    });
    Logger.log('Redeem Items: ' + redeemId + ': ' + total + 'point');
    sheet.getRange(sheet.getLastRow() + 1, 1, data.length, data[0].length).setValues(data);\
    return ContentService.createTextOutput("success").setMimeType(ContentService.MimeType.JSON);
}

function redeemCode(e){
    let lock = LockService.getScriptLock();
    if(!lock.tryLock(10000)){
        return ContentService.createTextOutput('Unable to obtain lock').setMimeType(ContentService.MimeType.JSON);
    }
    let ss= SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Users');
    if(!sheet){
        sheet = ss.insertSheet('Users');
        sheet.appendRow(['UID', 'Name', 'Point']);
        return ContentService.createTextOutput('User not found').setMimeType(ContentService.MimeType.JSON);
    }
    let code_sheet = ss.getSheetByName('Redeem Codes');
    if(!code_sheet){
        code_sheet = ss.insertSheet('Redeem Codes');
        code_sheet.appendRow(['Code', 'Point', 'Status']);
        return ContentService.createTextOutput('Code not found').setMimeType(ContentService.MimeType.JSON);
    }
    let index = code_sheet.creatTextFinder(e.parameter.code).matchEntireCell(true).findNext();
    if(index == null){
        return ContentService.createTextOutput('Code not found').setMimeType(ContentService.MimeType.JSON);
    }
    let [redeem_point, status] = index.offset(0, 1, 1, 2).getValues()[0];
    if(status == 'Used'){
        return ContentService.createTextOutput('Code already used').setMimeType(ContentService.MimeType.JSON);
    }
    let uid = e.parameter.uid;
    let point = parseInt(redeem_point);
    let user = sheet.creatTextFinder(uid).matchEntireCell(true).findNext();
    if(user == null){
        return ContentService.createTextOutput('User not found').setMimeType(ContentService.MimeType.JSON);
    }
    let row = user.getRow();
    let userPoint = user.offset(0, 2).getValue();
    if(userPoint == '' || isNaN(userPoint)){
        userPoint = 0;
    }
    user.offset(0, 2).setValue(userPoint + point);
    Logger.log('Redeem Point: ' + uid + ':  ' + point + 'point');
    return ContentService.createTextOutput(JSON.stringify({status: 'success', add_point: point, total_point: userPoint + point})).setMimeType(ContentService.MimeType.JSON);
}