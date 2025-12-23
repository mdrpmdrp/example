function doPost(e) {
    Logger = BetterLog.useSpreadsheet()
    try{
        return handleRequest(e);
    }catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'');
    throw e;
  }
}


function handleRequest(e) {
    const func = e.parameter.func;
    return this[func](e);
}

function verifyOfficerPassword(e) {
    const password = e.parameter.password;
    const appId = e.parameter.appId;

    // Replace with your actual password verification logic
    const correctPassword = '1234'; // Example hardcoded password
    if (password == correctPassword) {
        // Fetch application data based on appId if needed
        const applicationData = getApplicationDataById(appId); // Implement this function as needed
        return ContentService.createTextOutput(JSON.stringify({ success: true, applicationData: applicationData })).setMimeType(ContentService.MimeType.JSON);
    } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
    }
}

function getApplicationDataById(appId) {
   let ss = SpreadsheetApp.getActiveSpreadsheet();
   let sheet = ss.getSheetByName('Member Applications');
   let data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) { // Start from 1 to skip header row
         if (data[i][1] == appId) { // Assuming application_id is in the first column
              return {
                submission_date:Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
                application_id: data[i][1],
                prefix: data[i][2],
                first_name: data[i][3],
                last_name: data[i][4],
                id_card_number: data[i][5],
                date_of_birth: Utilities.formatDate(new Date(data[i][6]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
                age: data[i][7],
                nationality: data[i][8],
                religion: data[i][9],
                mobile_phone: data[i][10],
                email: data[i][11],
                address_registration: data[i][12],
                address_current: data[i][13],
                occupation: data[i][14],
                business_name: data[i][15],
                address_business: data[i][16],
                business_location_details: data[i][17],
                business_phone: data[i][18],
                years_experience: data[i][19],
                expertise: data[i][20].split(',').map(s => s.trim()),
                delivery_address_type: data[i][21],
                health_status: data[i][22],
                health_chronic_detail: data[i][23],
                health_disability_detail: data[i][24],
                beneficiary_name: data[i][25],
                beneficiary_relationship: data[i][26],
                beneficiary_id_card: data[i][27],
                beneficiary_phone: data[i][28],
                beneficiary_address: data[i][29],
                is_approved: data[i][30],
                copy_id_card: data[i][31],
                copy_house_reg: data[i][32],
                portrait_photo: data[i][33],
                occupation_proof: data[i][34],
                officer_id: data[i][35],
                reviewer_officer: data[i][36],
                approval_date: data[i][37],
                signatures: data[i][38]
              };
         }
    }
    return null; // Return null if application not found
}

function getDownloadToken(e) {
    let applicationId = e.parameter.applicationId;
    if (!applicationId) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Missing applicationId' })).setMimeType(ContentService.MimeType.JSON);
    }
    let folder = DriveApp.getFolderById('1CEWlvFURW0X6uRa_uAAPDjyczE5cr329');
    let applicationFolder = folder.getFoldersByName(applicationId)
    if (!applicationFolder.hasNext()) {
        applicationFolder = folder.createFolder(applicationId);
    } else {
        applicationFolder = applicationFolder.next();
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, token: ScriptApp.getOAuthToken(), folderId: applicationFolder.getId() })).setMimeType(ContentService.MimeType.JSON);
}


function submitMemberApplication(e) {
    let uploaded_files = e.parameter.uploaded_files ? JSON.parse(e.parameter.uploaded_files) : {};
    let applicationData = [
        new Date(),
        e.parameter.application_id,
        e.parameter.prefix,
        e.parameter.first_name,
        e.parameter.last_name,
        e.parameter.id_card_number,
        e.parameter.date_of_birth,
        e.parameter.age,
        e.parameter.nationality,
        e.parameter.religion,
        e.parameter.mobile_phone,
        e.parameter.email,
        e.parameter.address_registration,
        e.parameter.address_current,
        e.parameter.occupation,
        e.parameter.business_name,
        e.parameter.address_business,
        e.parameter.business_location_details,
        e.parameter.business_phone,
        e.parameter.years_experience,
        e.parameter.expertise,
        e.parameter.delivery_address_type,
        e.parameter.health_status,
        e.parameter.health_chronic_detail,
        e.parameter.health_disability_detail,
        e.parameter.beneficiary_name,
        e.parameter.beneficiary_relationship,
        e.parameter.beneficiary_id_card,
        e.parameter.beneficiary_phone,
        e.parameter.beneficiary_address,
        e.parameter.is_approved,
        uploaded_files?.copy_id_card || '',
        uploaded_files?.copy_house_reg || '',
        uploaded_files?.portrait_photo || '',
        uploaded_files?.occupation_proof || '',
        e.parameter.officer_id || '',
        e.parameter.reviewer_officer,
        e.parameter.approval_date || '',
        e.parameter.signatures
    ]

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Member Applications');
    sheet.appendRow(applicationData);

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}