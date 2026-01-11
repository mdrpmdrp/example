// Calendar Service - Handle all calendar operations

/**
 * Create event in calendar with reminders
 */
function createCalendarEvent(title, start, end, description, location) {
  const event = CALENDAR.createEvent(title, start, end, {
    description,
    location
  });
  event.setColor(CalendarApp.EventColor.BLUE);
  
  REMINDER_MINUTES.forEach((mins) => event.addPopupReminder(mins));
  
  return event.getId();
}

/**
 * Update calendar event
 */
function updateCalendarEvent(eventId, start, end, title, description, location) {
  const event = CALENDAR.getEventById(eventId);
  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  event.setTime(start, end);
  event.setTitle(title);
  event.setDescription(description);
  event.setLocation(location);

}

/**
 * Get calendar event by ID
 */
function getCalendarEvent(eventId) {
  return CALENDAR.getEventById(eventId);
}

/**
 * sync row to calendar event
 */
function syncRowToCalendarEvent() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetObj = ss.getSheetByName('Booking Info');
  let header = getSheetHeader(sheetObj);
  let row = sheetObj.getActiveCell().getRow();
  let eventId = getCellByHeader(sheetObj, row, header, 'Event Id');
  
  let namedValues = {};
  header.forEach((h, i) => {
    namedValues[h] = sheetObj.getRange(row, i + 1).getValue();
  });
  let mockEvent = {
    namedValues: namedValues,
    range: sheetObj.getRange(row, 1)
  };
  const payload = buildPayload(mockEvent);
  if (!payload) return;
  
  const { title, description, location, start, end } = payload;

  if (start >= end) {
    Logger.log('❌ เวลาเริ่มต้องน้อยกว่าสิ้นสุด');
    return;
  }

  if (!eventId) {
    const newEventId = createCalendarEvent(title, start, end, description, location);
    updateSheetWithEventId(sheetObj, row, newEventId);
    Logger.log(`✅ Event สร้างสำเร็จ: ${title}`);
  } else {
    updateCalendarEvent(eventId, start, end, title, description, location);
    Logger.log(`✅ Event อัพเดทสำเร็จ: ${title}`);
  }
}
