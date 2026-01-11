/**
 * ระบบจัดการสวนป่า - Forest Plantation Management System
 * ใช้ Google Sheets เป็นฐานข้อมูล
 */

// กำหนด Sheet Names
const SHEETS = {
  PLOTS: 'แปลงปลูก',
  STAFF: 'พนักงาน',
  ASSETS: 'เครื่องจักร',
  VENDORS: 'คู่ค้า',
  OPERATIONS: 'กิจกรรมสวน',
  EXPENSES: 'รายจ่าย',
  FUEL: 'ระบบน้ำมัน',
  MAINTENANCE: 'ซ่อมบำรุง',
  LABOR: 'ค่าแรง',
  SALES: 'ขายไม้',
  AR: 'ลูกหนี้'
};

/**
 * แสดงหน้าเว็บหลัก
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจัดการสวนป่า')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ดึงข้อมูลจาก Google Sheets
 */
function getData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  // ถ้ายังไม่มี sheet ให้สร้างใหม่
  if (!sheet) {
    sheet = createSheet(sheetName);
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * บันทึกข้อมูล
 */
function saveData(sheetName, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = createSheet(sheetName);
    }
    
    // เพิ่มข้อมูลลงในแถวใหม่
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = headers.map(header => data[header] || '');
    sheet.appendRow(newRow);
    
    return { success: true, message: 'บันทึกข้อมูลสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * แก้ไขข้อมูล
 */
function updateData(sheetName, rowIndex, data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    headers.forEach((header, index) => {
      if (data.hasOwnProperty(header)) {
        sheet.getRange(rowIndex + 2, index + 1).setValue(data[header]);
      }
    });
    
    return { success: true, message: 'แก้ไขข้อมูลสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * ลบข้อมูล
 */
function deleteData(sheetName, rowIndex) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    sheet.deleteRow(rowIndex + 2);
    
    return { success: true, message: 'ลบข้อมูลสำเร็จ' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

/**
 * สร้าง Sheet ตามประเภท
 */
function createSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.insertSheet(sheetName);
  
  let headers = [];
  
  switch(sheetName) {
    case SHEETS.PLOTS:
      headers = ['Plot ID', 'จังหวัด', 'อำเภอ', 'พิกัด', 'ชนิดไม้', 'พันธุ์', 
                 'วันที่ปลูก', 'อายุ(ปี)', 'ระยะปลูก', 'พื้นที่(ไร่)', 
                 'เป้าหมายตัด(ปี)', 'สถานะ', 'วันที่สร้าง'];
      break;
      
    case SHEETS.STAFF:
      headers = ['Staff ID', 'ชื่อ', 'ประเภทแรงงาน', 'ค่าแรงมาตรฐาน', 
                 'เลขบัญชี', 'สถานะการจ้าง', 'วันที่สร้าง'];
      break;
      
    case SHEETS.ASSETS:
      headers = ['Asset ID', 'ประเภท', 'ยี่ห้อ/รุ่น', 'วันที่ซื้อ', 
                 'ค่าเสื่อม', 'สถานะพร้อมใช้งาน', 'วันที่สร้าง'];
      break;
      
    case SHEETS.VENDORS:
      headers = ['Vendor ID', 'ชื่อ', 'ประเภท', 'เงื่อนไขเครดิต(วัน)', 
                 'เบอร์ติดต่อ', 'วันที่สร้าง'];
      break;
      
    case SHEETS.OPERATIONS:
      headers = ['วันที่', 'Plot ID', 'กิจกรรม', 'Staff ID', 'ผู้รับเหมา', 
                 'ชั่วโมง/วัน', 'ต้นทุนแรงงาน', 'หมายเหตุ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.EXPENSES:
      headers = ['วันที่', 'ประเภทค่าใช้จ่าย', 'Asset ID', 'Vendor ID', 
                 'จำนวนเงิน', 'วิธีจ่าย', 'รูปเอกสาร URL', 'หมายเหตุ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.FUEL:
      headers = ['วันที่', 'Asset ID', 'ปริมาณเบิก(ลิตร)', 'เลขไมล์/ชั่วโมง', 
                 'ผู้เบิก', 'หมายเหตุ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.MAINTENANCE:
      headers = ['Asset ID', 'วันที่ซ่อม', 'อาการ', 'อะไหล่ที่เปลี่ยน', 
                 'ค่าแรง', 'ค่าอะไหล่', 'วันที่ซ่อมครั้งถัดไป', 'หมายเหตุ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.LABOR:
      headers = ['วันที่', 'Staff ID', 'ประเภทค่าแรง', 'จำนวนวัน/ชั่วโมง', 
                 'จำนวนเงิน', 'สถานะจ่าย', 'วันที่จ่าย', 'หมายเหตุ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.SALES:
      headers = ['วันที่ตัด', 'Plot ID', 'ชนิดไม้', 'น้ำหนัก/ปริมาตร', 
                 'ราคา/ตัน', 'ยอดขาย', 'ลูกค้า', 'เงื่อนไขเครดิต(วัน)', 
                 'วันที่ครบกำหนดชำระ', 'สถานะชำระ', 'วันที่บันทึก'];
      break;
      
    case SHEETS.AR:
      headers = ['Invoice No.', 'ลูกค้า', 'ยอดเงิน', 'วันที่ออก Invoice', 
                 'วันที่ครบกำหนด', 'ยอดค้าง', 'อายุหนี้', 'สถานะชำระ', 'วันที่บันทึก'];
      break;
      
    default:
      headers = ['ID', 'ข้อมูล', 'วันที่สร้าง'];
  }
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold')
    .setBackground('#4CAF50')
    .setFontColor('#FFFFFF');
  
  return sheet;
}

/**
 * สร้าง ID อัตโนมัติ
 */
function generateID(prefix) {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}${timestamp}${random}`;
}

/**
 * คำนวณอายุจากวันที่ปลูก
 */
function calculateAge(plantDate) {
  const now = new Date();
  const plant = new Date(plantDate);
  const years = (now - plant) / (1000 * 60 * 60 * 24 * 365.25);
  return years.toFixed(1);
}

/**
 * ดึงข้อมูล Dashboard
 */
function getDashboardData() {
  try {
    const plots = getData(SHEETS.PLOTS);
    const expenses = getData(SHEETS.EXPENSES);
    const sales = getData(SHEETS.SALES);
    const operations = getData(SHEETS.OPERATIONS);
    const fuel = getData(SHEETS.FUEL);
    
    // คำนวณ KPI
    const totalArea = plots.reduce((sum, plot) => sum + (parseFloat(plot['พื้นที่(ไร่)']) || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp['จำนวนเงิน']) || 0), 0);
    const totalSales = sales.reduce((sum, sale) => sum + (parseFloat(sale['ยอดขาย']) || 0), 0);
    const totalFuel = fuel.reduce((sum, f) => sum + (parseFloat(f['ปริมาณเบิก(ลิตร)']) || 0), 0);
    
    const costPerRai = totalArea > 0 ? totalExpenses / totalArea : 0;
    const fuelPerRai = totalArea > 0 ? totalFuel / totalArea : 0;
    const netProfit = totalSales - totalExpenses;
    
    return {
      totalPlots: plots.length,
      totalArea: totalArea,
      totalExpenses: totalExpenses,
      totalSales: totalSales,
      costPerRai: costPerRai,
      fuelPerRai: fuelPerRai,
      netProfit: netProfit,
      plots: plots,
      recentOperations: operations.slice(-10).reverse()
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * ค้นหาข้อมูล
 */
function searchData(sheetName, searchTerm, searchField) {
  const allData = getData(sheetName);
  
  if (!searchTerm) return allData;
  
  return allData.filter(item => {
    if (searchField && item[searchField]) {
      return item[searchField].toString().toLowerCase().includes(searchTerm.toLowerCase());
    } else {
      return Object.values(item).some(value => 
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  });
}

/**
 * อัพโหลดรูปภาพไปยัง Google Drive
 */
function uploadImage(base64Data, fileName) {
  try {
    const folderId = getFolderIdOrCreate('ForestDocuments');
    const folder = DriveApp.getFolderById(folderId);
    
    const contentType = base64Data.split(';')[0].split(':')[1];
    const bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      url: file.getUrl(),
      id: file.getId()
    };
  } catch (error) {
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * สร้างหรือหาโฟลเดอร์
 */
function getFolderIdOrCreate(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next().getId();
  } else {
    return DriveApp.createFolder(folderName).getId();
  }
}

/**
 * Export ข้อมูลเป็น CSV
 */
function exportToCSV(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  let csv = '';
  data.forEach(row => {
    csv += row.join(',') + '\n';
  });
  
  return csv;
}
