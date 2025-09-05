function doGet(){
    let html = HtmlService.createTemplateFromFile('index');
    return html.evaluate()
    .setTitle('ระบบลงเวลาทำงาน')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function authenticateUser(empId, pin) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Employees');
    let data = sheet.getDataRange().getValues();
    let user = data.find(row => row[0] == empId && row[3] == pin && row[4] === true);
    if(!user) return JSON.stringify({success: false});
    let result = {
        success: true,
        empCode: user[0],
        name: user[1],
        team: user[2]
    }
    let today = new Date().toDateString();
    let siteSheet = ss.getSheetByName('Sites');
    let assignSheet = ss.getSheetByName('Team Assignments');
    let siteData = siteSheet.getDataRange().getValues();
    let assignData = assignSheet.getDataRange().getValues();
    let isAssigned = assignData.some(row => row[0] && row[0].toDateString() === today && row[1] == result.team);
    result.isAssigned = isAssigned;
    if(!isAssigned) {
        return JSON.stringify(result);
    }
    let site = siteData.find(row => row[0] == result.team);
    if(site) {
        result.siteName = site[1];
        result.coords = {lat: site[2], lng: site[3]};
        result.radius = site[4];
        return JSON.stringify(result);
    }
}