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
