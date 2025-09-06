function doGet() {
    let html = HtmlService.createTemplateFromFile('index');
    html.site_url = ScriptApp.getService().getUrl();
    return html.evaluate()
        .setTitle('ระบบลงเวลาทำงาน')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function authenticateUser(empId = '11111', pin = '1234') {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Employee Status');
    let data = sheet.getDataRange().getValues();
    let user = data.find(row => row[0] == empId && row[3] == pin && row[4] === true);
    if (!user) return JSON.stringify({ success: false });
    let result = {
        success: true,
        empCode: user[0],
        name: user[1],
        team: user[2],
        lastStatus: user[5],
        lastStatusTime: user[6]
    }
    let today = new Date().toDateString();
    let siteSheet = ss.getSheetByName('Sites');
    let assignSheet = ss.getSheetByName('Team Assignments');
    let siteData = siteSheet.getDataRange().getValues().slice(1)
    let assignData = assignSheet.getDataRange().getValues().slice(1)
    let isAssigned = assignData.find(row => row[0] && row[0].toDateString() === today && row[1] == result.team);
    result.isAssigned = isAssigned ? true : false
    if (!isAssigned) {
        return JSON.stringify(result);
    }
    result.siteId = isAssigned[2];
    let site = siteData.find(row => row[0] == result.siteId);
    if (site) {
        result.punchInSite = siteData[0];
        result.punchInCoords = { lat: siteData[0][2], lng: siteData[0][3] };
        result.punchInAllowedRadius = siteData[0][4];
        result.siteName = site[1];
        result.coords = { lat: site[2], lng: site[3] };
        result.allowedRadius = site[4];
        return JSON.stringify(result);
    }
}

function checkInUser(data) {
    let { empCode, checkInTime, location, currentUser, accuracy } = data
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Punches');
    let timestamp = new Date();
    let newRow = [
        timestamp,
        empCode,
        currentUser.name,
        currentUser.team,
        'IN',
        currentUser.siteId || '',
        location.latitude || '',
        location.longitude || '',
        accuracy
    ]
    sheet.appendRow(newRow);
    return JSON.stringify({ success: true, timestamp: timestamp });
}
