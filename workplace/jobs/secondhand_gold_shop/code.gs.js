function doGet(){
    let html = HtmlService.createTemplateFromFile('index');
    return html.evaluate()
        .setTitle('HENG MONEY - เฮงมันนี่ 4289')
        .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/b6ea3192-e74b-4483-a7a5-ac5f86a81191.png')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function saveSellData(data) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('รายการขาย');
    let newrow = [
        new Date(),
        data.name,
        data.phone,
        data.weight,
        data.price,
        data.note
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