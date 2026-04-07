/************ CONFIG ************/
const SHEET_NAME = 'Form Responses 1';
const HEADER_ROW = 1;

// map คอลัมน์
// A: Timestamp
const COL_NAME   = 2;  // B ชื่อพนักงานขับรถ
const COL_PLATE  = 3;  // C ทะเบียน
const COL_TYPE   = 4;  // D ประเภทการลา
const COL_START  = 5;  // E วันที่เริ่มต้นการลา
const COL_END    = 6;  // F วันที่สิ้นสุดการลา
const COL_DAYS   = 7;  // G จำนวนวันลา
const COL_STATUS = 8;  // H สถานะการอนุมัติ
const COL_TIME   = 9;  // I วันเวลาอนุมัติ

/**
 * คืนหน้าเว็บ พร้อมข้อมูลจากชีทฝั่งเซิร์ฟเวอร์เลย
 */
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    throw new Error('ไม่พบชีทชื่อ ' + SHEET_NAME);
  }

  const lastRow = sh.getLastRow();
  let rows = [];

  if (lastRow > HEADER_ROW) {
    const numRows = lastRow - HEADER_ROW;
    // ดึง A:I ของทุกแถวที่มีข้อมูล
    const values = sh.getRange(HEADER_ROW + 1, 1, numRows, COL_TIME).getValues();

    for (let i = 0; i < values.length; i++) {
      const r = values[i];
      const sheetRow = HEADER_ROW + 1 + i;

      const name   = r[COL_NAME   - 1]; // B
      const plate  = r[COL_PLATE  - 1]; // C
      const type   = r[COL_TYPE   - 1]; // D
      const start  = r[COL_START  - 1]; // E
      const end    = r[COL_END    - 1]; // F
      const days   = r[COL_DAYS   - 1]; // G
      const status = r[COL_STATUS - 1]; // H

      // ข้ามแถวที่ไม่มีข้อมูลเลย
      if (!name && !plate && !type) continue;

      rows.push({
        row: sheetRow,
        name: name,
        plate: plate,
        type: type,
        start: start,
        end: end,
        days: days,
        status: status || ''  // '', 'อนุมัติ', 'ไม่อนุมัติ'
      });
    }
  }

  // ส่งข้อมูลไปที่ template
  const tmpl = HtmlService.createTemplateFromFile('Index');
  tmpl.rows = rows; // ส่ง array ของข้อมูลไปให้หน้าเว็บ
  return tmpl
    .evaluate()
    .setTitle('การอนุมัติการลางานพนักงานขับรถ LACO')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * อัปเดตสถานะ + เวลาอนุมัติ จากปุ่มบนหน้าเว็บ
 */
function updateStatus(rowIndex, newStatus) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_NAME);
  sh.getRange(rowIndex, COL_STATUS).setValue(newStatus);
  sh.getRange(rowIndex, COL_TIME).setValue(new Date());
  return true;
}
function onFormSubmit(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ====== SHEETS ======
  const chatSheet = ss.getSheetByName("chatid");

  // ====== TELEGRAM CONFIG ======
  const token = chatSheet.getRange("A2").getValue();
  const chatId = chatSheet.getRange("B2").getValue();

  // ====== FORM DATA ======
  const values = e.values;
  // values structure:
  // [0] Timestamp
  // [1] ชื่อพนักงานขับรถ
  // [2] ทะเบียน
  // [3] ประเภทการลา
  // [4] วันที่เริ่มต้นการลา
  // [5] วันที่สิ้นสุดการลา

  const timestamp = new Date(values[0]);
  const driverName = values[1];
  const plate = values[2];
  const leaveType = values[3];
  const startDate = values[4];
  const endDate = values[5];

  const todayTxt = Utilities.formatDate(
    timestamp,
    "Asia/Bangkok",
    "dd/MM/yy"
  );

  // ====== MESSAGE FORMAT ======
const message =
`📝✨ แจ้งการลางาน
━━━━━━━━━━━━━━
🏢 บริษัท LACO
📅 วันที่แจ้ง: ${todayTxt}

👤 พนักงาน: ${driverName}
🚛 ทะเบียนรถ: ${plate}

📌 รายละเอียดการลา
🗂️ ประเภทการลา: ${leaveType}
🟢 วันที่เริ่มลา: ${startDate}
🔴 วันที่สิ้นสุดการลา: ${endDate}
━━━━━━━━━━━━━━`;


  sendTelegram(token, chatId, message);
}

// ====== SEND TELEGRAM ======
function sendTelegram(token, chatId, text) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML"
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(url, options);
}
