// Configuration - Update with your Google Sheet ID
const SHEET_ID = 'YOUR_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID
const INCOME_FOLDER = 'https://drive.google.com/drive/folders/1nRrPE-4Dx8qgbPRRMXLQxEJoDXmR8QFS?usp=drive_link';
const EXPENSE_FOLDER = 'https://drive.google.com/drive/folders/1HXqLLr5l4XudL-Hozu4LLiln15BFkiiv?usp=drive_link';
const MASTER_DATA_FOLDER = 'https://drive.google.com/drive/folders/1hDSvH4_ycEAbrc2Djh6qt1t84NWntMsy?usp=drive_link';
const INCOME_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1bHD0sOmem6Wg3iqQNX2yUiTK3CQ9t4jk?usp=drive_link';
const EXPENSE_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1XPGSLrUtAJt1RqZ0Hklq-xDQdee2hpPx?usp=drive_link';
const MASTER_DATA_ARCHIVE_FOLDER = 'https://drive.google.com/drive/folders/1KZsEeVY9Bos1Pi8hWH8mLvsv7G9Fm152?usp=drive_link';
// Serve upload page
function doGet(e) {
  let html = HtmlService.createTemplateFromFile('search');
  html.userEmail = '';
  html.isLoggedIn = false;
  return html.evaluate()
    .setTitle('Search & Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl('https://img5.pic.in.th/file/secure-sv1/Sabai-Rent-Logo-Symbol-Y.png');  
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
    SpreadsheetApp.getActive().toast('Processing file: ' + file.getName(), 'Import Income Files', -1);

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
  SpreadsheetApp.getActive().toast('Import Income Data with ' + importData.length + ' rows', 'Import Income Files', -1);
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Income Files');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    sheet.getRange(lastRow + 1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Income Files sheet.');
    SpreadsheetApp.getActive().toast('✅ Imported Income Data Completed', 'Import Income Files', 5);
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
      if (row[10] == '' || String(row[2]).toLowerCase().startsWith("resolution")) {
        if (row[10] == '' || dataRows[i > 0 ? i - 1 : 0][10] == '') {
          row[22] = dataRows[i > 0 ? i - 1 : 0][22];
        } else {
          if (String(row[2]).toLowerCase().startsWith("resolution")) {
            row[22] = dataRows[i > 0 ? i - 1 : 0][22];
          } else {
            row[22] = row[10]
          }
        }
      } else {
        row[22] = row[10];
      }
      row[23] = row[22]?.slice(11).trim();
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
    SpreadsheetApp.getActive().toast('Processing file: ' + file.getName(), 'Import Expense Files', -1);

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
  SpreadsheetApp.getActive().toast('Import Expense Data with ' + importData.length + ' rows', 'Import Expense Files', -1);
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Expense Files');
    let lastRow = SuperScript.getRealLastRow('A', sheet);
    sheet.getRange(lastRow + 1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Expense Files sheet.');
    SpreadsheetApp.getActive().toast('✅ Imported Expense Data Completed', 'Import Expense Files', 5);
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
    SpreadsheetApp.getActive().toast('Processing file: ' + file.getName(), 'Import Master Data Files', -1);
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
  SpreadsheetApp.getActive().toast('Import Master Data with ' + importData.length + ' rows', 'Import Master Data Files', -1);
  if (importData.length > 0) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Master Data');
    sheet.getDataRange().clearContent();
    sheet.getRange(1, 1, importData.length, importData[0].length).setValues(importData);
    Logger.log('✅ Imported total ' + importData.length + ' rows to Master Data sheet.');
    SpreadsheetApp.getActive().toast('✅ Imported Master Data Completed', 'Import Master Data Files', 5);
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

// Login with email and password
function loginWithEmailPassword(email, password) {
  try {
    if (!email || !password) {
      return JSON.stringify({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง.'
      });
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let userSheet = ss.getSheetByName('Users');
    if (!userSheet) {
      return JSON.stringify({
        success: false,
        message: 'User sheet is missing.'
      });
    }
    let userData = userSheet.getDataRange().getValues();
    let authenticatedUser = userData.find(row => row[0].toLowerCase() === email.toLowerCase() && row[1] == password);
    if (authenticatedUser) {
      return JSON.stringify({
        success: true,
        message: 'ลงชื่อเข้าใช้งานสำเร็จ.',
        name: authenticatedUser[2] || email,
        email: email
      });
    } else {

      return JSON.stringify({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง.'
      });
    }
  } catch (error) {
    return JSON.stringify({
      success: false,
      message: 'เกิดข้อผิดพลาดระหว่างการเข้าสู่ระบบ: ' + error.message
    });
  }
}

// Get user data filtered by email
function getUserData(email) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let incomeSheet = ss.getSheetByName('Income Files');
  let expenseSheet = ss.getSheetByName('Expense Files');

  if (!incomeSheet || !expenseSheet) {
    return JSON.stringify({
      success: false,
      message: 'Required sheets (Income Files or Expense Files) are missing.'
    });
  }

  let incomeData = incomeSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column AA (index 26)
    return row[26] === email && row[0] != ""
  });
  let expenseData = expenseSheet.getDataRange().getValues().filter(row => {
    // Assuming email is in column J (index 10)
    return row[9] === email && row[0] != ""
  });
  if (incomeData.length === 0 && expenseData.length === 0) {
    return JSON.stringify({
      success: false,
      message: 'No data found for the provided email.'
    });
  }
  if (incomeData.length > 0) {
    incomeData = incomeData.filter(row => row[2] !== 'Payout').map(row => {
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
        listing_name: row[24],
        owner_name: row[25],
        owner_email: row[26],
        room_link: row[27]
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

  return JSON.stringify({
    success: true,
    data: userData
  });
}
