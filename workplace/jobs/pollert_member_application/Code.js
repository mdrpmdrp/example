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
    // Implement your logic to fetch application data by appId
    // This is just a placeholder function
    return {
        id: appId,
        name: 'John Doe',
        position: 'Software Engineer'
        // Add more fields as necessary
    };
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
        e.parameter.application_id,
        e.parameter.prefix,
        e.parameter.full_name,
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
        uploaded_files?.photo_1_inch || '',
        uploaded_files?.occupation_proof || '',
        e.parameter.reviewer_officer,
        e.parameter.approval_date || '',
        e.parameter.signatures
    ]

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Member Applications');
    sheet.appendRow(applicationData);

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
}