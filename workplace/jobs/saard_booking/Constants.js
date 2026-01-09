// Configuration and Constants
function getConfigss() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let configSheet = ss.getSheetByName('Config');
  let configData = configSheet.getDataRange().getValues();
  let lineToken = configData[0][1];
  let calendarId = configData[1][1];
  let reminderMinutes = configData[2][1].split(',').map(m => parseInt(m.trim()));
  let branchData = {};
  configData.slice(6).filter(row => row[0]).forEach(row => { // Skip empty rows
    branchData[row[0]] = {
      groupId: row[1],
      postcodes: row[2] ? row[2].toString().split(',').map(p => p.trim()) : [],
      name: row[0]
    };
  })

  return [calendarId, reminderMinutes, lineToken, branchData];
}

const TIMEZONE = 'Asia/Bangkok';

const DESCRIPTION_FIELDS = [
  'Booking ID',
  'ชื่อ-นามสกุล',
  'จำนวนทีมงาน (คน)',
  'วันที่ให้บริการ',
  'เวลาที่ให้บริการ (เริ่มงาน)',
  'เวลาที่ให้บริการ (เลิกงาน)',
  'สถานที่ / ที่อยู่',
  'ลิงก์ Google Maps',
  'เบอร์โทร',
  'หมายเหตุเพิ่มเติม'
];

// LINE OA Configuration
const GROUP_ID = 'Ua55431b2d9be5d104c316ccb8ef54e81';
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';
const MAX_MESSAGE_LENGTH = 5000;

// Test Configuration
const TEST_TOMORROW_DATE = '2025-08-24'; // For testing purpose
const HEADER_ROW = 4;

const [CALENDAR_ID, REMINDER_MINUTES, LINE_OA_TOKEN, BRANCH_DATA] = getConfigss();

const CALENDAR = CalendarApp.getCalendarById(CALENDAR_ID);
