function doGet() {
    let html = HtmlService.createTemplateFromFile('index');
    html.lists = getList();
    return html.evaluate()
        .setTitle('HENG MONEY - เฮงมันนี่ 4289')
        .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/b6ea3192-e74b-4483-a7a5-ac5f86a81191.png')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSellData() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('รายการขาย');
    let data = sheet.getDataRange().getValues().slice(1).filter(row => row[0] instanceof Date);
    return JSON.stringify(data.map((row, index) => {
        return {
            date: row[0],
            category: row[1],
            product: row[2],
            weight: row[3],
            price: row[4],
            seller: row[5],
            status: row[6],
            YM: row[7],
            billNo: row[8],
            uuid: row[9],
        }
    }));
}

function saveSellData(data) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('รายการขาย');
    let newrow = [
        new Date(),
        data.category,
        data.product,
        data.weight,
        data.price,
        data.seller,
        "", // status
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM'),
        data.billNo,
        Utilities.getUuid()
    ]
    sheet.appendRow(newrow);
    return true;
}

function deleteSellData(row) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('รายการขาย');
    sheet.deleteRow(row);
    return true;
}

function getList() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let listSheet = ss.getSheetByName('List');
    let list = listSheet.getDataRange().getValues().reduce((acc, row) => {
        if (row[0] == "") return acc; // Skip empty rows
        let key = row[0];
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(row[1]);
        return acc;
    }, {})
    return list
}