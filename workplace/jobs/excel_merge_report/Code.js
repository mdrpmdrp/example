// Configuration - Update with your Google Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID
const INCOME_FOLDER = 'https://drive.google.com/drive/folders/1c51FoO2-FpO-5oeAYNhAe0l0RFMDdJLK?usp=drive_link';
const EXPENSE_FOLDER = 'https://drive.google.com/drive/folders/10v5M1wn_HOUi47SkZ-tEkOQqa5WI_Mvs?usp=drive_link';
const MASTER_DATA_FOLDER = 'https://drive.google.com/drive/folders/1_1lepHb6vP1fnruA66DK4P8jcSB2Lp8b?usp=sharing';
const INCOME_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1AtjBJz5awB3nKl9ZckjvVgqz7hH4Ou1w?usp=drive_link';
const EXPENSE_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1RyOqEKvawsBJtpG2AHAAeSxlq3cLNuaR?usp=drive_link';
const MASTER_DATA_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1_1lepHb6vP1fnruA66DK4P8jcSB2Lp8b?usp=drive_link';
// Serve upload page
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('search')
    .setTitle('Search & Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getFolderId(url) {
  const regex = /folders\/([a-zA-Z0-9_-]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

function importIncomeFiles() {
  let folder = DriveApp.getFolderById(getFolderId(INCOME_FOLDER));
  let archiveFolder = DriveApp.getFolderById(getFolderId(INCOME_ARCHIVE_FOLDER));
  let files = folder.getFiles();
  let importData = [];
  while (files.hasNext()) {
    let file = files.next();
    // if the file not csv, skip
    if (!file.getName().endsWith('.csv')) {
      continue;
    }

    let mergedData = Utilities.parseCsv(file.getBlob().getDataAsString()).slice(1); // Skip header
    Logger.log('⏳ Importing file: ' + file.getName() + ' with ' + mergedData.length + ' rows');
    if (mergedData.length === 0) {
      // Move empty file to archive folder
      file.moveTo(archiveFolder);
      Logger.log('📁 File ' + file.getName() + ' is empty. Moved to archive.');
      continue;
    }
    processIncomeData(mergedData);
    importData = importData.concat(mergedData);
    // Move file to archive folder
    file.moveTo(archiveFolder);
    Logger.log('📁 File ' + file.getName() + ' processed and moved to archive.');
  }
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Income Files');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    sheet.getRange(lastRow + 1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Income Files sheet.');
  }
}

function processIncomeData(mergedData) {
  if (mergedData?.length > 0) {
    const dataRows = mergedData.slice(1);
    for (let i = 0; i < dataRows.length; i++) {
      let row = dataRows[i];
      row[0] = row[0] ? Utilities.parseDate(row[0], 'GMT+7', "MM/dd/yyyy") : '';
      row[1] = row[1] ? Utilities.parseDate(row[1], 'GMT+7', "MM/dd/yyyy") : '';
      row[4] = row[4] ? Utilities.parseDate(row[4], 'GMT+7', "MM/dd/yyyy") : '';
      row[5] = row[5] ? Utilities.parseDate(row[5], 'GMT+7', "MM/dd/yyyy") : '';
      row[6] = row[6] ? Utilities.parseDate(row[6], 'GMT+7', "MM/dd/yyyy") : '';
      row[21] = row[0];
      if (row[10] == '' || String(row[2]).startsWith("Resolution")) {
        if (row[10] == '' || dataRows[i > 0 ? i - 1 : 0][10] == '') {
          row[22] = dataRows[i > 0 ? i - 1 : 0][22];
        } else {
          if (String(row[2]).toLowerCase().includes("Resolution")) {
            row[22] = dataRows[i > 0 ? i - 1 : 0][22];
          } else {
            row[22] = row[10]
          }
        }
      } else {
        row[22] = row[10];
      }
      row[23] = row[22]?.slice(12)
    }
    // Sort by date (first column)
    dataRows.sort((a, b) => {
      const dateA = a[0];
      const dateB = b[0];
      return dateA - dateB;
    });
    mergedData.length = 0;
    mergedData.push(...dataRows);
  }
}

function importExpenseFiles() {
  let folder = DriveApp.getFolderById(getFolderId(EXPENSE_FOLDER));
  let archiveFolder = DriveApp.getFolderById(getFolderId(EXPENSE_ARCHIVE_FOLDER));
  let files = folder.getFiles();
  let importData = [];
  while (files.hasNext()) {
    let file = files.next();
    // if the file not excel, skip
    if (!file.getName().endsWith('.xlsx') && !file.getName().endsWith('.xls')) {
      continue;
    }

    let excelFile = DriveApp.getFileById(Drive.Files.create({
      title: file.getName(),
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [{ id: DriveApp.getRootFolder().getId() }]
    }, file.getBlob()).id);
    let excelSheet = SpreadsheetApp.openById(excelFile.getId());
    let sheet = excelSheet.getSheets()[0];
    let mergedData = sheet.getDataRange().getValues().slice(1); // Skip header
    Logger.log('⏳ Importing file: ' + file.getName() + ' with ' + mergedData.length + ' rows');
    if (mergedData.length === 0) {
      // Move empty file to archive folder
      file.moveTo(archiveFolder);
      excelFile.setTrashed(true);
      Logger.log('📁 File ' + file.getName() + ' is empty. Moved to archive.');
      continue;
    }
    processExpenseData(mergedData);
    importData = importData.concat(mergedData);
    // Move file to archive folder
    file.moveTo(archiveFolder);
    excelFile.setTrashed(true);
    Logger.log('📁 File ' + file.getName() + ' processed and moved to archive.');
  }
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Expense Files');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    sheet.getRange(lastRow + 1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Expense Files sheet.');
  }
}

function processExpenseData(mergedData) {
  // just in case additional processing is needed in the future
}

function importMasterData() {
  let folder = DriveApp.getFolderById(getFolderId(MASTER_DATA_FOLDER));
  let archiveFolder = DriveApp.getFolderById(getFolderId(MASTER_DATA_ARCHIVE_FOLDER));
  let files = folder.getFiles();
  let importData = [];
  while (files.hasNext()) {
    let file = files.next();
    // if the file not excel, skip
    if (!file.getName().endsWith('.xlsx') && !file.getName().endsWith('.xls')) {
      continue;
    }
    let excelFile = DriveApp.getFileById(Drive.Files.create({
      title: file.getName(),
      mimeType: MimeType.GOOGLE_SHEETS,
      parents: [{ id: DriveApp.getRootFolder().getId() }]
    }, file.getBlob()).id);
    let excelSheet = SpreadsheetApp.openById(excelFile.getId());
    let sheet = excelSheet.getSheets()[0];
    let mergedData = sheet.getDataRange().getValues().slice(1); // Skip header
    Logger.log('⏳ Importing file: ' + file.getName() + ' with ' + mergedData.length + ' rows');
    if (mergedData.length === 0) {
      // Move empty file to archive folder
      file.moveTo(archiveFolder);
      excelFile.setTrashed(true);
      Logger.log('📁 File ' + file.getName() + ' is empty. Moved to archive.');
      continue;
    }
    importData = importData.concat(mergedData);
    // Move file to archive folder
    file.moveTo(archiveFolder);
    excelFile.setTrashed(true);
    Logger.log('📁 File ' + file.getName() + ' processed and moved to archive.');
  }
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Master Data');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    sheet.getRange(lastRow + 1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Master Data sheet.');
  }
}

function importData() {
  importIncomeFiles();
  importExpenseFiles();
  importMasterData();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Data Importer')
    .addItem('Import All Data', 'importData')
    .addSeparator()
    .addItem('Import Income Files', 'importIncomeFiles')
    .addItem('Import Expense Files', 'importExpenseFiles')
    .addItem('Import Master Data Files', 'importMasterData')
    .addToUi();
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
    // const userEmail = Session.getActiveUser().getEmail();
    const userEmail = 'tnaraporn@hotmail.com' // For testing purpose only, replace with above line in production
    if (!userEmail) {
      return {
        success: false,
        message: 'Unable to retrieve user email. Please ensure you are logged in with your Google account.'
      };
    }
    return getUserData(userEmail);
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred during login: ' + error.message
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

  let incomeData = incomeSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column Z (index 25)
    return row[25] === email && row[0] != ""
  });
  let expenseData = expenseSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column J (index 10)
    return row[9] === email && row[0] != ""
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
        owner_email: row[9]
      }
    })
  }

  let userData = {
    name: incomeData.length > 0 ? incomeData[0].owner_name : (expenseData.length > 0 ? expenseData[0].owner_name : ""),
    income: incomeData,
    expense: expenseData
  };

  return  JSON.stringify({
    success: true,
    data: userData
  });
}
