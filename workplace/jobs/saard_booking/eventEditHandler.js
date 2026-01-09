// Event Edit Handler - Handle calendar event updates from sheet edits

/**
 * Handle sheet edit events
 */
function onEventEdit(e) {
  let sheet = e.range.getSheet();
  let row = e.range.getRow();
  let column = e.range.getColumn();
  
  // Skip header rows and non-Booking Info sheet
  if (sheet.getName() !== 'Booking Info' || row <= HEADER_ROW || column > 12) return;
  
  const header = getSheetHeader(sheet);
  const eventId = getCellByHeader(sheet, row, header, 'Event Id');
  
  if (!eventId) return; // No event to update

  const date = getCellByHeader(sheet, row, header, 'วันที่ให้บริการ');
  const start_time = getCellByHeader(sheet, row, header, 'เวลาที่ให้บริการ (เริ่มงาน)');
  const end_time = getCellByHeader(sheet, row, header, 'เวลาที่ให้บริการ (เลิกงาน)');

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), start_time.getHours(), start_time.getMinutes());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), end_time.getHours(), end_time.getMinutes());
  
  if (!start || !end) {
    Logger.log(`❌ แปลงวันเวลาไม่สำเร็จ: ${dateStr}`);
    return;
  }
  
  if (start >= end) {
    Logger.log('❌ เวลาเริ่มต้องน้อยกว่าสิ้นสุด');
    return;
  }

  try {
    const event = getCalendarEvent(eventId);
    if (!event) {
      Logger.log(`❌ ไม่พบ Event Id: ${eventId}`);
      return;
    }

    // Build event data from sheet row
    const name = getCellByHeader(sheet, row, header, 'ชื่อ-นามสกุล');
    const staffQuantity = getCellByHeader(sheet, row, header, 'จำนวนทีมงาน (คน)');
    const facebookName = getCellByHeader(sheet, row, header, 'Facebook Name');
    const bookingId = getCellByHeader(sheet, row, header, 'Booking ID');
    const contact = getCellByHeader(sheet,row,header, 'ช่องทางการติดต่อ')
    
    const location = [
      getCellByHeader(sheet, row, header, 'สถานที่ / ที่อยู่'),
      getCellByHeader(sheet, row, header, 'ลิงก์ Google Maps')
    ].filter(Boolean).join(' ');
    
    const namedValues = {};
    header.forEach((h, i) => {
      namedValues[h] = sheet.getRange(row, i + 1).getValue();
    });
    
    const title = `${staffQuantity} ${bookingId} ${name} ${contact}:${facebookName}`.trim();
    const description = formatDescription(namedValues);
    
    updateCalendarEvent(eventId, start, end, title, description, location);
    Logger.log(`✅ อัพเดททั้งหมดสำเร็จสำหรับ Event Id: ${eventId}`);
  } catch (err) {
    Logger.log('❌ ERROR อัพเดท Event: ' + err);
  }
}
