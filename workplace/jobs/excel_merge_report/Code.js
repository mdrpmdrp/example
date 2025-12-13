// Configuration - Update with your Google Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID

// Serve upload page
function doGet(e) {
  const page = e.parameter.page || 'upload';

  if (page === 'search') {
    return HtmlService.createHtmlOutputFromFile('search')
      .setTitle('Search & Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  return HtmlService.createHtmlOutputFromFile('upload')
    .setTitle('Upload Excel Files')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Upload Excel data to Google Sheets
function uploadExcelData(parsedData) {
  parsedData = JSON.parse(parsedData);
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const fileGroup of parsedData) {
    let sheet = ss.getSheetByName(fileGroup.groupName);
    if (!sheet) {
      sheet = ss.insertSheet(fileGroup.groupName);
    }

    const headers = fileGroup.data[0];
    const existingData = sheet.getDataRange().getValues();

    // If sheet is empty, set headers
    if (existingData.length === 0) {
      sheet.appendRow(headers);
    } else {
      // Check if headers match
      const existingHeaders = existingData[0];
      if (JSON.stringify(existingHeaders) !== JSON.stringify(headers)) {
        return {
          success: false,
          message: `Header mismatch in sheet ${fileGroup.groupName}`
        }
      }

      // Append new data rows
      sheet.getRange(sheet.getLastRow() + 1, 1, fileGroup.data.length - 1, headers.length).setValues(fileGroup.data.slice(1));
      return {
        success: true,
        message: `Data uploaded successfully to sheet ${fileGroup.groupName}`
      }
    }
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
        message: 'Unable to retrieve user email. Please ensure you are logged in with your Google account.'
      };
    }

    let userData = getUserData(userEmail);

    return {
      success: true,
      email: userEmail,
      data: userData
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
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let incomeSheet = ss.getSheetByName('Income Files');
  let expenseSheet = ss.getSheetByName('Expense Files');

  if (!incomeSheet || !expenseSheet) {
    return {
      success: false,
      message: 'Required sheets (Income Files or Expense Files) are missing.'
    };
  }

  const incomeData = incomeSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column Z (index 25)
    return row[25] === userEmail && row[0] != ""
  });
  const expenseData = expenseSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column J (index 10)
    return row[9] === userEmail && row[0] != ""
  });
  if (incomeData.length === 0 && expenseData.length === 0) {
    return {
      success: false,
      message: 'No data found for the provided email.'
    };
  }
  if (incomeData.length > 0) {
    incomeData = incomeData.map(row => {
      return {
        date: row[0],
        arriving_by_date: row[1],
        type: row[2],
        confirmation_code: row[3],
        booking_date: row[4],
        start_date: row[5],
        end_date: row[6],
        nights: row[7],
        guest: row[8],
        listing: row[9],
        detail: row[10],
        reference_code: row[11],
        currency: row[12],
        amount: row[13],
        paid_out: row[14],
        service_fee: row[15],
        fast_pay_fee: row[16],
        cleaning_fee: row[17],
        gross_earnings: row[18],
        occupancy_taxes: row[19],
        earnings_year: row[20],
        payout_date: row[21],
        bank_account_logic: row[22],
        bank_account: row[23],
        owner_name: row[24],
        owner_email: row[25]
      }
    })
  }

  if (expenseData.length > 0) {
    expenseData = expenseData.map(row => {
      return {
        date: row[0],
        listing_name: row[1],
        category: row[2],
        description: row[3],
        amount: row[4],
        remark: row[5],
        paid_to: row[6],
        paid_by: row[7],
        owner_name: row[8],
        owner_email: row[9
      }
    })
  }

  let userData = {
    name = incomeData.length > 0 ? incomeData[0].owner_name : (expenseData.length > 0 ? expenseData[0].owner_name : ""),
    income: incomeData,
    expense: expenseData
  };

  return userData;
}
