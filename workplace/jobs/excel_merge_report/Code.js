// Configuration - Update with your Google Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID
const UPLOAD_SHEET_NAME = 'UploadedData';

// Serve upload page
function doGet(e) {
  const page = e.parameter.page || 'upload';
  
  if (page === 'search') {
    return HtmlService.createHtmlOutputFromFile('search')
      .setTitle('Search & Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return HtmlService.createHtmlOutputFromFile('upload')
    .setTitle('Upload Excel Files')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Upload Excel data to Google Sheets
function uploadExcelData(parsedData) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheet = ss.getSheetByName(UPLOAD_SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(UPLOAD_SHEET_NAME);
      // Add headers
      sheet.appendRow(['Timestamp', 'Email', 'Group', 'Date', 'Description', 'Category', 'Type', 'Amount']);
      sheet.getRange(1, 1, 1, 8).setBackground('#008894').setFontColor('#FFFFFF').setFontWeight('bold');
    }
    
    const userEmail = Session.getActiveUser().getEmail();
    const timestamp = new Date();
    let totalRows = 0;
    
    // Process each group
    parsedData.forEach(group => {
      const data = group.data;
      const headers = data[0];
      
      // Find column indices (case-insensitive search)
      const dateCol = findColumnIndex(headers, ['date', 'วันที่', 'transaction date']);
      const descCol = findColumnIndex(headers, ['description', 'รายละเอียด', 'details', 'note']);
      const categoryCol = findColumnIndex(headers, ['category', 'หมวดหมู่', 'type']);
      const typeCol = findColumnIndex(headers, ['type', 'transaction type', 'ประเภท', 'income/expense']);
      const amountCol = findColumnIndex(headers, ['amount', 'จำนวนเงิน', 'value', 'price']);
      
      // Add data rows
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const rowData = [
          timestamp,
          userEmail,
          group.groupName,
          dateCol >= 0 ? row[dateCol] : '',
          descCol >= 0 ? row[descCol] : '',
          categoryCol >= 0 ? row[categoryCol] : '',
          typeCol >= 0 ? row[typeCol] : '',
          amountCol >= 0 ? row[amountCol] : ''
        ];
        sheet.appendRow(rowData);
        totalRows++;
      }
    });
    
    return {
      success: true,
      message: `Successfully uploaded ${totalRows} rows to Google Sheets`
    };
    
  } catch (error) {
    Logger.log('Upload error: ' + error.toString());
    throw new Error('Failed to upload data: ' + error.message);
  }
}

// Helper function to find column index by possible names
function findColumnIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i]).toLowerCase().trim();
    for (const name of possibleNames) {
      if (header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

// Login with Google
function loginWithGoogle() {
  try {
    const userEmail = Session.getActiveUser().getEmail();
    
    if (!userEmail) {
      return {
        success: false,
        message: 'Unable to get user email. Please make sure you are logged in.'
      };
    }
    
    return {
      success: true,
      email: userEmail
    };
    
  } catch (error) {
    Logger.log('Login error: ' + error.toString());
    return {
      success: false,
      message: 'Login failed: ' + error.message
    };
  }
}

// Get user data filtered by email
function getUserData(email) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(UPLOAD_SHEET_NAME);
    
    if (!sheet) {
      return [];
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find email column index
    const emailColIndex = headers.indexOf('Email');
    
    if (emailColIndex === -1) {
      return [];
    }
    
    // Filter data by user email
    const userData = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[emailColIndex] === email) {
        userData.push({
          timestamp: row[0],
          email: row[1],
          group: row[2],
          date: row[3],
          description: row[4],
          category: row[5],
          type: row[6],
          amount: row[7]
        });
      }
    }
    
    return userData;
    
  } catch (error) {
    Logger.log('Get user data error: ' + error.toString());
    throw new Error('Failed to get user data: ' + error.message);
  }
}

// Helper function to test the script
function testUpload() {
  const testData = [
    {
      groupName: "Test Group",
      fileCount: 1,
      data: [
        ['Date', 'Description', 'Category', 'Type', 'Amount'],
        ['2025-12-13', 'Test income', 'Salary', 'Income', 50000],
        ['2025-12-13', 'Test expense', 'Food', 'Expense', 500]
      ]
    }
  ];
  
  const result = uploadExcelData(testData);
  Logger.log(result);
}
