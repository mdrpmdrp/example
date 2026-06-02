// Get current Buddhist year
function getBuddhistYear() {
  const currentYear = new Date().getFullYear();
  return currentYear + 543; // Convert to Buddhist year
}

// Validate date format (returns date string or null)
function validateDate(date, convertToBuddhist = true) {
  if(date === null || date === undefined || date === '') {
    return null;
  }
  if (date instanceof Date && !isNaN(date)) {
    let year = date.getFullYear();
    if (convertToBuddhist && year < 2200) {
        year += 543; // Convert Gregorian year to Buddhist year
    }else if(!convertToBuddhist && year >= 2500) {
        year -= 543; // Convert Buddhist year to Gregorian year
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }else if(typeof date === 'string' && date.trim() !== '') {
    let [day,month,year] = date.split('/');
    year = parseInt(year, 10);
    if (convertToBuddhist && year < 2200) {
        year += 543; // Convert Gregorian year to Buddhist year
    }else if(!convertToBuddhist && year >= 2500) {
        year -= 543; // Convert Buddhist year to Gregorian year
    }
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return null;
}

// Validate phone number format
function validatePhoneNumber(phoneNumber){
  if(!phoneNumber) return null;
  const cleaned = phoneNumber.toString().replace(/\D/g, '');
  if(cleaned.length === 10){
    return cleaned;
  }
  if(cleaned.length === 9){
    return '0' + cleaned;
  }
  return null;
}

// Get current sheet name based on Buddhist year
function getCurrentSheetName() {
  return `งานขยายเขตฯ${getBuddhistYear()}`;
}

// Column mapping based on headers
const COLUMNS = {
  'กฟฟ': 0,
  'ผู้รับผิดชอบแฟ้มงาน': 1,
  'หมายเลขผัง': 2,
  'ชื่องาน': 3,
  'ประเภทงาน': 4,
  'สถานที่/พิกัด': 7,
  'ชื่อผู้ใช้ไฟ': 8,
  'เบอร์โทร': 9,
  'วันรับคำร้อง': 10,
  'เลขคำร้อง': 11,
  'วันที่นัดสำรวจ': 12,
  'สถานะงาน (Work Status)': 5,
  'เลขที่อนุมัติงาน': 13,
  'วันที่แจ้งค่าใช้จ่าย ผชฟ.': 14,
  'วันที่ ผชฟ. ชำระเงิน': 15,
  'วันที่ก่อสร้างระบบจำหน่าย': 16,
  'วันที่ติดตั้งมิเตอร์': 17,
  'ส่งแฟ้มงาน ผกส.': 18,
  'สถานะผู้ใช้': 19,
  'มูลค่าประมาณการ': 20,
  'หมายเหตุ': 21
};

// Serve the web app
function doGet(e) {
    const page = e.parameter.page;
    const isJobboard = page === 'jobboard';
    const templateFile = isJobboard ? 'jobBoard' : 'index';
    const title = isJobboard ? 'กระดานงานบริการลูกค้า กฟจ.สงขลา' : 'บริการลูกค้าและสัมพันธ์ กฟจ.สงขลา';
    
    let html = HtmlService.createTemplateFromFile(templateFile)
    if(isJobboard){
      html.staffList = getStaffList();
    }
    
    return html.evaluate()
        .setTitle(title)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Calculate current step based on filled dates
function calculateCurrentStep(stepDates, workStatus = '') {
  let currentStep = 1;
  for (let i = 0; i < stepDates.length; i++) {
    if (stepDates[i]) {
      currentStep = i + 1;
    } else {
      break;
    }
  }

  // Extend progress by using the explicit work status from the sheet
  const normalizedStatus = (workStatus || '').toString().trim();
  if (normalizedStatus === 'ก่อสร้างระบบจำหน่าย') {
    currentStep = 5;
  } else if (normalizedStatus === 'ติดตั้งมิเตอร์') {
    currentStep = 6;
  }

  return currentStep;
}

// Get job status by tracking ID (เลขคำร้อง)
function getJobStatus(trackingId="120001610206") {
  try {
    const sheetName = getCurrentSheetName();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets().find(s => s.getName().replace(/\s/g, '') === sheetName.replace(/\s/g, ''));
    
    
    if (!sheet || trackingId == "") {
      return { error: `ไม่พบข้อมูลในระบบ (${sheetName}) กรุณาติดต่อเจ้าหน้าที่` };
    }
    
    const data = sheet.getDataRange().getValues();
    
    // Find job by tracking ID (เลขคำร้อง in column 9)
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLUMNS["เลขคำร้อง"]].toString().toUpperCase() === trackingId) {
        const stepDates = [
          validateDate(data[i][COLUMNS["วันรับคำร้อง"]]),
          validateDate(data[i][COLUMNS['วันที่นัดสำรวจ']]),
          validateDate(data[i][COLUMNS['วันที่แจ้งค่าใช้จ่าย ผชฟ.']]),
          validateDate(data[i][COLUMNS['วันที่ ผชฟ. ชำระเงิน']]),
          validateDate(data[i][COLUMNS['วันที่ก่อสร้างระบบจำหน่าย']]),
          validateDate(data[i][COLUMNS['วันที่ติดตั้งมิเตอร์']])
        ];
        
        return JSON.stringify({
          trackingId: data[i][COLUMNS["เลขคำร้อง"]],
          patternNumber: data[i][COLUMNS["หมายเลขผัง"]] || null,
          jobName: data[i][COLUMNS["ชื่องาน"]] || null,
          customerCoords: data[i][COLUMNS['สถานที่/พิกัด']] || null,
          requestDate: validateDate(data[i][COLUMNS["วันรับคำร้อง"]]) || null,
          currentStep: calculateCurrentStep(stepDates, data[i][COLUMNS['สถานะงาน (Work Status)']]),
          stepDates: stepDates,
          workStatus: data[i][COLUMNS['สถานะงาน (Work Status)']] || null,
        });
      }
    }
    
    return JSON.stringify({ error: 'ไม่พบหมายเลขติดตามในระบบ' });
    
  } catch (error) {
    Logger.log('Error in getJobStatus: ' + error);
    return JSON.stringify({ error: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล: ' + error.message });
  }
}

// Get list of all staff names
function getStaffList() {
  try {
    const sheetName = getCurrentSheetName();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets().find(s => s.getName().replace(/\s/g, '') === sheetName.replace(/\s/g, ''));
    
    if (!sheet) {
      return JSON.stringify([]);
    }
    
    const staffColumn = COLUMNS['ผู้รับผิดชอบแฟ้มงาน'] + 1;
    const lastRow = sheet.getLastRow();
    
    if (lastRow <= 1) {
      return JSON.stringify([]);
    }
    
    const staffData = sheet.getRange(2, staffColumn, lastRow - 1, 1).getValues();
    const staffSet = new Set();
    
    for (let i = 0; i < staffData.length; i++) {
      const staffName = staffData[i][0];
      if (staffName && staffName.toString().trim() !== '') {
        staffSet.add(staffName.toString().trim());
      }
    }
    
    return JSON.stringify(Array.from(staffSet).sort());
    
  } catch (error) {
    Logger.log('Error in getStaffList: ' + error);
    return JSON.stringify([]);
  }
}

// Get all jobs for a specific staff member
function getJobsByStaff(staffName) {
  try {
    const sheetName = getCurrentSheetName();
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets().find(s => s.getName().replace(/\s/g, '') === sheetName.replace(/\s/g, ''));
    
    if (!sheet) {
      return (JSON.stringify([]));
    }
    
    const data = sheet.getDataRange().getValues();
    const jobs = [];
    
    // Find all jobs for this staff member
    for (let i = 1; i < data.length; i++) {
      if (data[i][COLUMNS['ผู้รับผิดชอบแฟ้มงาน']] === staffName && data[i][COLUMNS['เลขคำร้อง']] && data[i][COLUMNS['วันที่นัดสำรวจ']]) {
        const stepDates = [
          validateDate(data[i][COLUMNS['วันรับคำร้อง']], false),
          validateDate(data[i][COLUMNS['วันที่นัดสำรวจ']], false),
          validateDate(data[i][COLUMNS['วันที่แจ้งค่าใช้จ่าย ผชฟ.']], false),
          validateDate(data[i][COLUMNS['วันที่ ผชฟ. ชำระเงิน']], false),
          validateDate(data[i][COLUMNS['วันที่ก่อสร้างระบบจำหน่าย']], false),
          validateDate(data[i][COLUMNS['วันที่ติดตั้งมิเตอร์']], false)
        ];
        
        jobs.push({
          trackingId: data[i][COLUMNS['เลขคำร้อง']],
          patternNumber: data[i][COLUMNS['หมายเลขผัง']] || null,
          jobName: data[i][COLUMNS['ชื่องาน']] || null,
          customerCoords: data[i][COLUMNS['สถานที่/พิกัด']] || null,
          customerName: data[i][COLUMNS['ชื่อผู้ใช้ไฟ']] || null,
          customerPhone: validatePhoneNumber(data[i][COLUMNS['เบอร์โทร']]) || null,
          requestDate: validateDate(data[i][COLUMNS['วันรับคำร้อง']], false) || null,
          appointmentDate: validateDate(data[i][COLUMNS['วันที่นัดสำรวจ']], false) || null,
          jobType: data[i][COLUMNS['ประเภทงาน']] || 'ไม่ระบุ',
          currentStep: calculateCurrentStep(stepDates, data[i][COLUMNS['สถานะงาน (Work Status)']]),
          stepDates: stepDates,
          workStatus: data[i][COLUMNS['สถานะงาน (Work Status)']] || null,
          notes: data[i][COLUMNS['หมายเหตุ']] || null
        });
      }
    }
    
    return JSON.stringify(jobs);
    
  } catch (error) {
    Logger.log('Error in getJobsByStaff: ' + error);
    return JSON.stringify([]);
  }
}
