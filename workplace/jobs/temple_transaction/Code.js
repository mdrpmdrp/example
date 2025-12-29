// Global variables
const SHEET_ID = '1WClE8Nicl8enmodKLWkBENPNz_ABQckqQsQN7UK1oQQ';
const FOLDER_ID = '1CEWlvFURW0X6uRa_uAAPDjyczE5cr329';


function doGet(e) {
  if (!e.parameter.action) {
    let settings = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('setting').getDataRange().getDisplayValues().slice(1).filter(row => row[0] && row[1]).reduce((obj, row) => {
      obj[row[0]] = row[1];
      return obj;
    }, {});
    let html = HtmlService.createTemplateFromFile('index');
    html.settings = settings;
    return html.evaluate()
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'getData':
        return getDataResponse();
      case 'getIncomeCodes':
        return getIncomeCodesResponse();
      case 'getExpenseCodes':
        return getExpenseCodesResponse();

      case 'getWithdrawData':
        return getWithdrawDataResponse();

      case 'getWithdrawCodes':
        return getWithdrawCodesResponse();

      case 'getBankAccounts':
        const sheetName = e.parameter.sheetName || 'บัญชีธนาคาร';
        return ContentService.createTextOutput(JSON.stringify(getBankAccounts(sheetName)))
          .setMimeType(ContentService.MimeType.JSON);
      case 'getTransferCodes':
        return getTransferCodesResponse();
      // ในส่วน doGet เพิ่ม case ใหม่สำหรับการโหลดข้อมูลโอน
      case 'getTransferData':
        return getTransferDataResponse();
      case 'getBalanceSummary': // เพิ่ม case ใหม่นี้
        const balanceSheetName = e.parameter.sheetName || 'รายงานเงินคงเหลือ';
        return ContentService.createTextOutput(JSON.stringify(getBalanceSummary(balanceSheetName)))
          .setMimeType(ContentService.MimeType.JSON);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    return createResponse(false, 'Error: ' + error.message);
  }
}

function doPost(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'addData':
        return addDataResponse(e.parameter);
      case 'updateData':
        return updateDataResponse(e.parameter);
      case 'deleteData':
        return deleteDataResponse(e.parameter);


      case 'addWithdrawData':
        return addWithdrawDataResponse(e.parameter);
      case 'updateWithdrawData':
        return updateWithdrawDataResponse(e.parameter);
      case 'deleteWithdrawData':
        return deleteWithdrawDataResponse(e.parameter);


      // ในส่วน doPost เพิ่ม case ใหม่สำหรับการเพิ่มข้อมูลโอน
      case 'addTransferData':
        return addTransferDataResponse(e.parameter);
      // ในส่วน doPost เพิ่ม case ใหม่สำหรับการอัปเดตและลบข้อมูลโอน
      case 'updateTransferData':
        return updateTransferDataResponse(e.parameter);
      case 'deleteTransferData':
        return deleteTransferDataResponse(e.parameter);
      default:
        return createResponse(false, 'Invalid action');
    }
  } catch (error) {
    return createResponse(false, 'Error: ' + error.message);
  }
}

// Get all data from sheets
function getDataResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const incomeSheet = getOrCreateSheet(ss, 'รายรับ', ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการรับ', 'รหัสรายรับ', 'จำนวนเงิน', 'รูปภาพ']); //แก้ไข
  const expenseSheet = getOrCreateSheet(ss, 'รายจ่าย', ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการจ่าย', 'รหัสรายจ่าย', 'จำนวนเงิน', 'รูปภาพ']); //แก้ไข

  const incomeData = getSheetData(incomeSheet, 'income');
  const expenseData = getSheetData(expenseSheet, 'expense');

  const allData = [...incomeData, ...expenseData];

  return createResponse(true, 'Data retrieved successfully', allData);
}

// Get income codes from sheet
function getIncomeCodesResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'รหัสรายรับ', ['รหัส', 'รายละเอียด']);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const codes = data.map(row => ({
    code: row[0],
    description: row[1]
  }));

  return createResponse(true, 'Income codes retrieved successfully', codes);
}

// Get expense codes from sheet
function getExpenseCodesResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'รหัสรายจ่าย', ['รหัส', 'รายละเอียด']);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const codes = data.map(row => ({
    code: row[0],
    description: row[1]
  }));

  return createResponse(true, 'Expense codes retrieved successfully', codes);
}

// Add new data
function addDataResponse(params) {
  const type = params.type;
  const sheetName = type === 'income' ? 'รายรับ' : 'รายจ่าย';
  const headers = type === 'income'
    ? ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการรับ', 'รหัสรายรับ', 'จำนวนเงิน', 'รูปภาพ']
    : ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการจ่าย', 'รหัสรายจ่าย', 'จำนวนเงิน', 'รูปภาพ'];

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, sheetName, headers);

  // Generate unique ID
  const id = Utilities.getUuid();

  // Handle image upload if present
  let imageUrl = '';
  if (params.imageBase64 && params.imageName && params.imageType) {
    imageUrl = uploadImage(params.imageBase64, params.imageName, params.imageType);
  }

  // Prepare row data
  const rowData = [
    id,
    params.day,
    params.month,
    params.year,
    params.docNo,
    params.description,
    params.code,
    params.amount,
    imageUrl
  ];

  // Append data to sheet
  sheet.appendRow(rowData);

  return createResponse(true, 'Data added successfully');
}

// Update existing data
function updateDataResponse(params) {
  const type = params.type;
  const id = params.id;
  const sheetName = type === 'income' ? 'รายรับ' : 'รายจ่าย';

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  // Find row with matching ID
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === id) {
      // Handle image upload if present
      let imageUrl = params.imageUrl || '';
      if (params.imageBase64 && params.imageName && params.imageType) {
        imageUrl = uploadImage(params.imageBase64, params.imageName, params.imageType);
      }

      // Update row data
      sheet.getRange(i + 2, 2).setValue(params.day);
      sheet.getRange(i + 2, 3).setValue(params.month);
      sheet.getRange(i + 2, 4).setValue(params.year);
      sheet.getRange(i + 2, 5).setValue(params.docNo);
      sheet.getRange(i + 2, 6).setValue(params.description);
      sheet.getRange(i + 2, 7).setValue(params.code);
      sheet.getRange(i + 2, 8).setValue(params.amount);

      if (imageUrl) {
        sheet.getRange(i + 2, 9).setValue(imageUrl);
      }

      return createResponse(true, 'Data updated successfully');
    }
  }

  return createResponse(false, 'Record not found');
}

// Delete data
function deleteDataResponse(params) {
  const type = params.type;
  const id = params.id;
  const sheetName = type === 'income' ? 'รายรับ' : 'รายจ่าย';

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  // Find row with matching ID
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 2);
      return createResponse(true, 'Data deleted successfully');
    }
  }

  return createResponse(false, 'Record not found');
}

// Helper function to get or create a sheet
function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    sheet.appendRow(headers);
  }

  return sheet;
}

// Helper function to get data from a sheet
function getSheetData(sheet, type) {
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map(row => {
    const item = {
      id: row[0],
      day: row[1],
      month: row[2],
      year: row[3],
      docNo: row[4],
      description: row[5],
      code: row[6],
      amount: row[7],
      imageUrl: row[8],
      type: type
    };

    return item;
  });
}

// Helper function to upload an image to Google Drive
function uploadImage(base64Data, fileName, mimeType) {
  // Extract the base64 data (remove the data:image/xxx;base64, prefix)
  const base64Content = base64Data.split(',')[1];

  // Decode the base64 data
  const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, fileName);

  // Get the folder
  const folder = DriveApp.getFolderById(FOLDER_ID);

  // Upload the file
  const file = folder.createFile(blob);

  // Return the URL in the format: https://lh3.googleusercontent.com/d/{fileId}
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

// Helper function to create a standardized response
function createResponse(success, message, data = null) {
  const response = {
    success: success,
    message: message
  };

  if (data !== null) {
    response.data = data;
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}




// สรุปบัญชีธนาคาร
function getBankAccounts(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, message: "ไม่พบชีตบัญชีธนาคาร" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const accounts = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.every(cell => cell === '')) continue;

      const account = {};
      for (let j = 0; j < headers.length; j++) {
        account[headers[j]] = row[j];
      }
      accounts.push(account);
    }

    return { success: true, data: accounts };
  } catch (error) {
    return { success: false, message: error.message };
  }
}




// รายงานเงินคงเหลือ
function getBalanceSummary(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return { success: false, message: "ไม่พบชีต 'รายงานเงินคงเหลือ'" };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // แปลงข้อมูลเป็น array of objects
    const result = rows.map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, message: error.message };
  }
}





// เพิ่มฟังก์ชันใหม่สำหรับโหลดรหัสการโอน
function getTransferCodesResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'รหัสการโอน', ['รหัส', 'รายละเอียด']);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const codes = data.map(row => ({
    code: row[0],
    description: row[1]
  }));

  return createResponse(true, 'Transfer codes retrieved successfully', codes);
}

// เพิ่มฟังก์ชันใหม่สำหรับเพิ่มข้อมูลโอน
function addTransferDataResponse(params) {
  const headers = ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการโอน', 'รหัสการโอน', 'จำนวนเงิน', 'รูปภาพ'];

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'โอนเข้าบัญชีโดยตรง', headers);

  // Generate unique ID
  const id = Utilities.getUuid();

  // Handle image upload if present
  let imageUrl = '';
  if (params.imageBase64 && params.imageName && params.imageType) {
    imageUrl = uploadImage(params.imageBase64, params.imageName, params.imageType);
  }

  // Prepare row data
  const rowData = [
    id,
    params.day,
    params.month,
    params.year,
    params.docNo,
    params.description,
    params.code,
    params.amount,
    imageUrl
  ];

  // Append data to sheet
  sheet.appendRow(rowData);

  return createResponse(true, 'Transfer data added successfully');
}

// เพิ่มฟังก์ชันใหม่สำหรับโหลดข้อมูลโอน
function getTransferDataResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเข้าบัญชีโดยตรง');

  if (!sheet) {
    return createResponse(true, 'No transfer data', []);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const transferData = data.map(row => ({
    id: row[0],
    day: row[1],
    month: row[2],
    year: row[3],
    docNo: row[4],
    description: row[5],
    code: row[6],
    amount: row[7],
    imageUrl: row[8],
    type: 'transfer'
  }));

  return createResponse(true, 'Transfer data retrieved successfully', transferData);
}

// ฟังก์ชันอัปเดตข้อมูลโอน (มีอยู่แล้วในโค้ดก่อนหน้า)
function updateTransferDataResponse(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเข้าบัญชีโดยตรง');

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  // ค้นหาแถวด้วย ID
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === params.id) {
      // อัปเดตข้อมูลในแถวที่พบ
      sheet.getRange(i + 2, 2).setValue(params.day); // วันที่
      sheet.getRange(i + 2, 3).setValue(params.month); // เดือน
      sheet.getRange(i + 2, 4).setValue(params.year); // ปี
      sheet.getRange(i + 2, 5).setValue(params.docNo); // เลขที่เอกสาร
      sheet.getRange(i + 2, 6).setValue(params.description); // รายการ
      sheet.getRange(i + 2, 7).setValue(params.code); // รหัส
      sheet.getRange(i + 2, 8).setValue(params.amount); // จำนวนเงิน

      // อัปเดตรูปภาพถ้ามี
      if (params.imageUrl) {
        sheet.getRange(i + 2, 9).setValue(params.imageUrl);
      }

      return createResponse(true, 'Transfer data updated successfully');
    }
  }

  return createResponse(false, 'Record not found');
}

// เพิ่มฟังก์ชันใหม่สำหรับลบข้อมูลโอน
function deleteTransferDataResponse(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเข้าบัญชีโดยตรง');

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  // Find row with matching ID
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === params.id) {
      sheet.deleteRow(i + 2);
      return createResponse(true, 'Transfer data deleted successfully');
    }
  }

  return createResponse(false, 'Record not found');
}








// เพิ่มฟังก์ชันใหม่สำหรับจัดการข้อมูลตัดโอน
function getWithdrawDataResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเงินออกจากบัญชีธนาคาร');

  if (!sheet) {
    return createResponse(true, 'No withdraw data', []);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const withdrawData = data.map(row => ({
    id: row[0],
    day: row[1],
    month: row[2],
    year: row[3],
    docNo: row[4],
    description: row[5],
    code: row[6],
    amount: row[7],
    imageUrl: row[8],
    type: 'withdraw'
  }));

  return createResponse(true, 'Withdraw data retrieved successfully', withdrawData);
}

function addWithdrawDataResponse(params) {
  const headers = ['ID', 'วันที่', 'เดือน', 'ปี', 'เลขที่เอกสาร', 'รายการตัดโอน', 'รหัสการตัดโอน', 'จำนวนเงิน', 'รูปภาพ'];

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'โอนเงินออกจากบัญชีธนาคาร', headers);

  const id = Utilities.getUuid();

  let imageUrl = '';
  if (params.imageBase64 && params.imageName && params.imageType) {
    imageUrl = uploadImage(params.imageBase64, params.imageName, params.imageType);
  }

  const rowData = [
    id,
    params.day,
    params.month,
    params.year,
    params.docNo,
    params.description,
    params.code,
    params.amount,
    imageUrl
  ];

  sheet.appendRow(rowData);

  return createResponse(true, 'Withdraw data added successfully');
}

function updateWithdrawDataResponse(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเงินออกจากบัญชีธนาคาร');

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === params.id) {
      sheet.getRange(i + 2, 2).setValue(params.day);
      sheet.getRange(i + 2, 3).setValue(params.month);
      sheet.getRange(i + 2, 4).setValue(params.year);
      sheet.getRange(i + 2, 5).setValue(params.docNo);
      sheet.getRange(i + 2, 6).setValue(params.description);
      sheet.getRange(i + 2, 7).setValue(params.code);
      sheet.getRange(i + 2, 8).setValue(params.amount);

      if (params.imageUrl) {
        sheet.getRange(i + 2, 9).setValue(params.imageUrl);
      }

      return createResponse(true, 'Withdraw data updated successfully');
    }
  }

  return createResponse(false, 'Record not found');
}

// ฟังก์ชันลบข้อมูลตัดโอน
function deleteWithdrawDataResponse(params) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('โอนเงินออกจากบัญชีธนาคาร');

  if (!sheet) {
    return createResponse(false, 'Sheet not found');
  }

  // Find row with matching ID
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === params.id) {
      sheet.deleteRow(i + 2);
      return createResponse(true, 'Withdraw data deleted successfully');
    }
  }

  return createResponse(false, 'Record not found');
}





// เพิ่มฟังก์ชันโหลดรหัสการตัดโอน
function getWithdrawCodesResponse() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = getOrCreateSheet(ss, 'รหัสการตัดโอน', ['รหัส', 'รายละเอียด']);

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const codes = data.map(row => ({
    code: row[0],
    description: row[1]
  }));

  return createResponse(true, 'Withdraw codes retrieved successfully', codes);
}