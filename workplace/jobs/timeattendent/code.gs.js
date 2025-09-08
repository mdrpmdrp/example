const MAIN_FOLDER_ID = '1mjyrYs_9rd3llex15KAzWD_QcL7_xFzM';
function doGet() {
    let html = HtmlService.createTemplateFromFile('index');
    html.site_url = getScriptUrl();
    return html.evaluate()
        .setTitle('ระบบลงเวลาทำงาน')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setFaviconUrl('https://img2.pic.in.th/pic/sivathai-logo.th.png');
}

function getScriptUrl() {
    let url = ScriptApp.getService().getUrl();
    url = url.split('.com/').join('.com/a/*/');
    return url;
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

function checkOutUser(data) {
    let { empCode, photoFile, checkOutTime, location, currentUser, accuracy } = data
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Punches');
    let timestamp = new Date();
    let newRow = [
        timestamp,
        empCode,
        currentUser.name,
        currentUser.team,
        'OUT',
        currentUser.siteId || '',
        location.latitude || '',
        location.longitude || '',
        accuracy,
        currentUser.photoFolder || ''
    ]
    sheet.appendRow(newRow);
    return JSON.stringify({ success: true, timestamp: timestamp });
}

function uploadPhotoFile(photoFile, empCode, empName, siteName, timestamp) {
    const getFolder = function (root, f_name) {
        let folder = root.getFoldersByName(f_name);
        if (!folder.hasNext()) {
            folder = root.createFolder(f_name);
        } else {
            folder = folder.next();
        }
        return folder;
    }
    if (!photoFile) return null;
    let folderId = MAIN_FOLDER_ID;
    let mainFolder = DriveApp.getFolderById(folderId);
    let siteFolder = getFolder(mainFolder, siteName);
    timestamp = new Date(timestamp);
    let dateText = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    let datefolder = getFolder(siteFolder, dateText);
    let f_name = photoFile.name
    let f_type = photoFile.type
    let f_dataurl = photoFile.dataUrl
    let base64Data = f_dataurl.split(',')[1];
    let blob = Utilities.newBlob(Utilities.base64Decode(base64Data), f_type, '[OUT]_' + empCode + '_' + empName + '_' + f_name);
    let file = datefolder.createFile(blob);
    return file
}

function sendTelegramNotification(data) {
    const BOT_TOKEN = '7372234796:AAHP2Wxs3jAZggbEG4K7glvFBhojDq-MSck'; // Store securely
    const CHAT_ID = '1354847893';

    const locationInfo = data.location ?
        // `📍 ตำแหน่ง: ${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}` :
        `📍 ตำแหน่ง: <a href="https://www.google.com/maps/search/?api=1&query=${data.location.latitude},${data.location.longitude}" target="_blank">ดูแผนที่</a>
    (ความแม่นยำ: ${data.accuracy.toFixed(2)} เมตร)` :
        '📍 ตำแหน่ง: ไม่สามารถระบุได้';

    let message = `🔔 แจ้งเตือนลงเวลา${data.action == "IN" ? "เข้า" : "ออก"}งาน\n\n` +
        `👤 พนักงาน: ${data.currentUser.name}\n\n` +
        `🆔 รหัส: ${data.currentUser.empCode}\n\n` +
        `🏢 ไซต์: ${data.currentUser.siteName}\n\n` +
        `⏰ เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}\n` +
        locationInfo;
    let photoUrls = data.currentUser.photos || false;
    if(photoUrls && photoUrls.length > 0){
        photoUrls = photoUrls.map(url => ({ type: 'photo', media: url }))
        photoUrls.at(-1).caption = message;
        photoUrls.at(-1).parse_mode = 'HTML';
        const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            payload: JSON.stringify({
                chat_id: CHAT_ID,
                media: photoUrls,
                parse_mode: 'HTML'
            })
        });
        return JSON.stringify({ success: true, response: response.getContentText() });
    }
    else{
        const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            payload: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        return JSON.stringify({ success: true, response: response.getContentText() });
    }
}

function getDownloadToken(siteName = 'ทั่วไป', empCode = '00000', empName = 'ไม่ระบุ') {
    const getFolder = function (root, f_name) {
        let folder = root.getFoldersByName(f_name);
        if (!folder.hasNext()) {
            folder = root.createFolder(f_name);
        } else {
            folder = folder.next();
        }
        return folder;
    }
    let main_folder = DriveApp.getFolderById(MAIN_FOLDER_ID);
    let site_folder = getFolder(main_folder, siteName);
    let date_folder = getFolder(site_folder, Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    let user_folder = getFolder(date_folder, empCode + '_' + empName);
    return JSON.stringify({ success: true, token: ScriptApp.getOAuthToken(), folder_id: user_folder.getId() });
}