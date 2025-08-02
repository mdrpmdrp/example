function doGet() {
    let html = HtmlService.createTemplateFromFile('index');
    html.lists = getList();
    return html.evaluate()
        .setTitle('บันทึกซื้อ | HENG MONEY - เฮงมันนี่ 4289')
        .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/b6ea3192-e74b-4483-a7a5-ac5f86a81191.png')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSellData() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกซื้อ');
    let data = sheet.getDataRange().getValues().slice(1).filter(row => row[0] instanceof Date).sort((a, b) => {
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
            bank: row[6],
            monthYear: row[7],
            status: row[8],
            billNo: row[9],
            uuid: row[10]
        }
    }));
}

function saveSellData(data) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกซื้อ');
    let newrow = [
        new Date(),
        data.category,
        data.product != ""? (data.category + " " + data.product +'%') : "",
        data.weight,
        data.price,
        data.seller,
        data.bank,
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM-yyyy'),
        "เสร็จสิ้น",
        data.billNo,
        Utilities.getUuid()
    ]
    sheet.appendRow(newrow);
    eventLog('บันทึกข้อมูลการขาย\n' + newrow.join(', ') + '\nโดย ' + data.seller);
    return true;
}

function cancelSellData(uuid, canceler){
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('บันทึกซื้อ');
    let finder = sheet.createTextFinder(uuid).findNext()
    if(!finder){
        return JSON.stringify({
            success: false,
            message: 'ไม่พบข้อมูลที่ต้องการยกเลิก'
        })
    }
    let row = finder.getRow();
    let data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    if(data[8] !== "เสร็จสิ้น"){
        return JSON.stringify({
            success: false,
            message: 'รายการนี้ถูกยกเลิกไปแล้ว'
        });
    }
    data[8] = "ยกเลิก";
    sheet.getRange(row, 1, 1, data.length).setValues([data]);
    data.splice(8,1); // Remove the YM column
    eventLog('ยกเลิกข้อมูลการขาย\n' + data.join(', ') + '\nโดย ' + canceler);
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
        obj[key] = list.map(row => row[index]).filter(x => x!= '')
    });
    return obj
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