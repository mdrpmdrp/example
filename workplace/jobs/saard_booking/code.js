// const TIMEZONE = 'Asia/Bangkok';
// const CALENDAR_ID = 'mdrpdeveloper@gmail.com';
// const CALENDAR = CalendarApp.getCalendarById(CALENDAR_ID);
// const REMINDER_MINUTES = [24 * 60, 2 * 60];
// const DESCRIPTION_FIELDS = [
//   'Booking ID',
//   'ชื่อ-นามสกุล',
//   'จำนวนทีมงาน (คน)',
//   'วันที่ให้บริการ',
//   'เวลาที่ให้บริการ เริ่มงาน',
//   'เวลาที่ให้บริการ เลิกงาน',
//   'สถานที่ / ที่อยู่',
//   'ลิงก์ Google Maps',
//   'เบอร์โทร',
//   'หมายเหตุเพิ่มเติม'
// ];

// function onFormSubmit(e) {
//   try {
//     const payload = buildPayload(e);
//     if (!payload) return;

//     const { title, description, location, start, end, sheet, row } = payload;
//     if (start >= end) {
//       Logger.log('❌ เวลาเริ่มต้องน้อยกว่าสิ้นสุด');
//       return;
//     }

//     const event = CALENDAR.createEvent(title, start, end, { description, location });
//     REMINDER_MINUTES.forEach((mins) => event.addPopupReminder(mins));

//     const eventId = event.getId();
//     updateSheetWithEventId(sheet, row, eventId);
//     Logger.log(`✅ Event สร้างสำเร็จ: ${title}`);
//   } catch (err) {
//     Logger.log('❌ ERROR: ' + err);
//     throw err;
//   }
// }

// function buildPayload(e) {
//   if (!e?.namedValues) {
//     Logger.log('❌ ไม่พบข้อมูลจากฟอร์ม');
//     return null;
//   }

//   const data = e.namedValues;
//   const bookingId = getVal(data, 'Booking ID');
//   const name = getVal(data, 'ชื่อ-นามสกุล');
//   const dateStr = getVal(data, 'วันที่ให้บริการ');
//   const startTime = getVal(data, 'เวลาที่ให้บริการ เริ่มงาน');
//   const endTime = getVal(data, 'เวลาที่ให้บริการ เลิกงาน');
//   const facebookName = getVal(data, 'Facebook Name');
//   const staffQuantity = getVal(data, 'จำนวนทีมงาน (คน)');

//   const start = parseDateTime(dateStr, startTime);
//   const end = parseDateTime(dateStr, endTime);
//   if (!start || !end) {
//     Logger.log(`❌ แปลงวันเวลาไม่สำเร็จ: ${dateStr}`);
//     return null;
//   }

//   const description = formatDescription(data);
//   const location = buildLocation(data);
//   const title = `${staffQuantity} ${bookingId} ${name} FB:${facebookName}`.trim();

//   const sheet = e.range.getSheet();
//   const row = e.range.getRow();

//   return { title, description, location, start, end, sheet, row };
// }

// function buildLocation(data) {
//   return [getVal(data, 'สถานที่ / ที่อยู่'), getVal(data, 'ลิงก์ Google Maps')]
//     .filter(Boolean)
//     .join(' ');
// }

// function formatDescription(data) {
//   return DESCRIPTION_FIELDS
//     .map((key) => `${key}\t: ${getVal(data, key)}`)
//     .join('\n');
// }

// function getVal(namedValues, key) {
//   const v = namedValues[key];
//   return Array.isArray(v) ? (v[0] || '') : (v || '');
// }

// function parseDateTime(dateStr, timeStr) {
//   if (!dateStr || !timeStr) return null;
//   const [day, month, year] = dateStr.split('/').map(Number);
//   const [hh, mm] = timeStr.split(':').map(Number);

//   if (!day || !month || !year) return null;

//   const dt = new Date(year, month - 1, day, hh || 0, mm || 0, 0);
//   const iso = Utilities.formatDate(dt, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
//   return new Date(iso);
// }

// function updateSheetWithEventId(sheet, row, eventId) {
//   const headerRow = 4;
//   const header = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
//   let eventIdIndex = header.indexOf('Event Id') + 1;

//   if (eventIdIndex === 0) {
//     eventIdIndex = header.length + 1;
//     sheet.getRange(headerRow, eventIdIndex).setValue('Event Id');
//   }

//   sheet.getRange(row, eventIdIndex).setValue(eventId);
// }

// function nextDateBriefSummary() {
//   let today = new Date();
//   // let tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
//   // let tomorrowStr = Utilities.formatDate(tomorrow, TIMEZONE, 'yyyy-MM-dd');
//   let tomorrowStr = '2025-08-24'; // For testing purpose
//   let tomorrowEvents = [];
//   let ss = SpreadsheetApp.getActiveSpreadsheet();
//   let sheet = ss.getActiveSheet();
//   let dataRange = sheet.getDataRange();
//   let data = dataRange.getValues();
//   let header = data[3].map(h => h.trim())
//   // let eventIdIndex = header.indexOf('Event Id');
//   let dateIndex = header.indexOf('วันที่ให้บริการ');

//   dataRange.getValues().forEach((row, rowIndex) => {
//     if (rowIndex < 4) return; // Skip header rows
//     let dateStr = Utilities.formatDate(new Date(row[dateIndex]), TIMEZONE, 'yyyy-MM-dd');
//     if (dateStr !== tomorrowStr) return;
//     // let eventId = row[eventIdIndex];
//     // if (!eventId) return;
//     try {
//       let eventStr = `👉 Booking ID : ${row[header.indexOf('Booking ID')]}\n` +
//         `ชื่อ-นามสกุล : ${row[header.indexOf('ชื่อ-นามสกุล')]}\n` +
//         `จำนวนทีมงาน (คน) : ${row[header.indexOf('จำนวนทีมงาน (คน)')]}\n` +
//         `วันที่ให้บริการ  : ${Utilities.formatDate(new Date(row[dateIndex]), TIMEZONE, 'dd/MM/yyyy')} น.\n` +
//         `เวลา  : ${row[header.indexOf('เวลาที่ให้บริการ (เริ่มงาน)')]} - ${row[header.indexOf('เวลาที่ให้บริการ (เลิกงาน)')]}\n` +
//         `สถานที่ / ที่อยู่ : ${row[header.indexOf('สถานที่ / ที่อยู่')]}\n` +
//         `ลิงก์ Google Maps : ${row[header.indexOf('ลิงก์ Google Maps')]}\n` +
//         `เบอร์โทร : ${row[header.indexOf('เบอร์โทร')]}\n` +
//         `หมายเหตุเพิ่มเติม : ${row[header.indexOf('หมายเหตุเพิ่มเติม')]}`;
//       tomorrowEvents.push(eventStr);
//     } catch (err) {
//       Logger.log('❌ ERROR fetching event: ' + err);
//     }
//   });
//   if (tomorrowEvents.length === 0) {
//     Logger.log('ไม่มีงานสำหรับวันพรุ่งนี้');
//   } else {
//     let summary = `📅 นัดหมายสำหรับพรุ่งนี้ (${Utilities.formatDate(new Date(tomorrowStr), TIMEZONE, 'dd/MM/yyyy')})\n\n📞 รบกวนโทรคอนเฟิร์มลูกค้าก่อน 15.00 ค่ะ`
//     sendLineOA(summary, tomorrowEvents);
//   }
// }

// function sendLineOA(header, tomorrowEvents) {
//   const LINE_OA_TOKEN = '19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU=';
//   const GROUP_ID = 'Ua55431b2d9be5d104c316ccb8ef54e81';
//   const url = 'https://api.line.me/v2/bot/message/push';
//   const max_message_length = 5000;
//   let messages_to_send = [];
//   let message = header
//   for (let i = 0; i < tomorrowEvents.length; i++) {
//     let temp_msg = message + '\n\n' + tomorrowEvents[i];
//     if (temp_msg.length > max_message_length) {
//       messages_to_send.push(message);
//       message = tomorrowEvents[i];
//     } else {
//       message = temp_msg;
//     }
//   }
//   if (messages_to_send.length > 0) {
//     const payload = {
//       to: GROUP_ID,
//       messages: messages_to_send.map(msg => ({ type: 'text', text: msg }))
//     };
//     const options = {
//       method: 'post',
//       contentType: 'application/json',
//       headers: {
//         Authorization: `Bearer ${LINE_OA_TOKEN}`
//       },
//       payload: JSON.stringify(payload)
//     };
//     let res = UrlFetchApp.fetch(url, options);
//     if (res.getResponseCode() === 200) {
//       Logger.log('✅ ส่งข้อความไปยัง LINE OA สำเร็จ');
//     } else {
//       Logger.log('❌ ส่งข้อความไปยัง LINE OA ล้มเหลว: ' + res.getContentText());
//     }
//   }
// }

// function onEventEdit(e) {
//   let sheet = e.range.getSheet();
//   let row = e.range.getRow();
//   if(sheet.getName() !== 'Booking Info' && row <= 4) return; // Skip header rows
//   let headerRow = 4;
//   let header = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn()).getValues()[0];
//   let eventIdIndex = header.indexOf('Event Id') + 1;
//   let dateIndex = header.indexOf('วันที่ให้บริการ') + 1;
//   let startTimeIndex = header.indexOf('เวลาที่ให้บริการ เริ่มงาน') + 1;
//   let endTimeIndex = header.indexOf('เวลาที่ให้บริการ เลิกงาน') + 1;

//   let eventId = sheet.getRange(row, eventIdIndex).getValue();
//   if (!eventId) return; // No event to update

//   let dateStr = sheet.getRange(row, dateIndex).getValue();
//   let startTime = sheet.getRange(row, startTimeIndex).getValue();
//   let endTime = sheet.getRange(row, endTimeIndex).getValue();

//   let start = parseDateTime(dateStr, startTime);
//   let end = parseDateTime(dateStr, endTime);
//   if (!start || !end) {
//     Logger.log(`❌ แปลงวันเวลาไม่สำเร็จ: ${dateStr}`);
//     return;
//   }
//   if (start >= end) {
//     Logger.log('❌ เวลาเริ่มต้องน้อยกว่าสิ้นสุด');
//     return;
//   }

//   try {
//     let event = CALENDAR.getEventById(eventId);
//     if (!event) {
//       Logger.log(`❌ ไม่พบ Event Id: ${eventId}`);
//       return;
//     }
//     event.setTime(start, end);
    
//     const nameIndex = header.indexOf('ชื่อ-นามสกุล') + 1;
//     const staffQuantityIndex = header.indexOf('จำนวนทีมงาน (คน)') + 1;
//     const facebookNameIndex = header.indexOf('Facebook Name') + 1;
//     const locationIndex = header.indexOf('สถานที่ / ที่อยู่') + 1;
//     const mapsIndex = header.indexOf('ลิงก์ Google Maps') + 1;
    
//     const name = sheet.getRange(row, nameIndex).getValue();
//     const staffQuantity = sheet.getRange(row, staffQuantityIndex).getValue();
//     const facebookName = sheet.getRange(row, facebookNameIndex).getValue();
//     const location = [
//       sheet.getRange(row, locationIndex).getValue(),
//       sheet.getRange(row, mapsIndex).getValue()
//     ].filter(Boolean).join(' ');
    
//     const namedValues = {};
//     header.forEach((h, i) => {
//       namedValues[h] = sheet.getRange(row, i + 1).getValue();
//     });
    
//     const title = `${staffQuantity} ${namedValues['Booking ID']} ${name} FB:${facebookName}`.trim();
//     const description = formatDescription(namedValues);
    
//     event.setTitle(title);
//     event.setDescription(description);
//     event.setLocation(location);
    
//     Logger.log(`✅ อัพเดททั้งหมดสำเร็จสำหรับ Event Id: ${eventId}`);
//   } catch (err) {
//     Logger.log('❌ ERROR อัพเดท Event: ' + err);
//   }
// }