function doGet(){
    let html = HtmlService.createTemplateFromFile("index").evaluate();
    html.setTitle("VNPHONE - ระบบสร้างป้ายผ่อน");
    html.addMetaTag("viewport", "width=device-width, initial-scale=1.0");
    html.setFaviconUrl("https://img2.pic.in.th/LOGO-VN-PHONE--edit_1.png");
    html.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    html.setSandboxMode(HtmlService.SandboxMode.IFRAME);
    return html;
}

function getAllData() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("AllData");
    let data = sheet.getDataRange().getValues().slice(1)
    return data;
}

function getSheetData(sheetName) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    let data = sheet.getDataRange().getDisplayValues().slice(1).filter(row => row[0] !== "") 
    return data
}