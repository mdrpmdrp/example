const FIELD = {
    EVENT_NAME: 'Event Name',
    DATE: 'DATE',
};

const CALENDAR_ID = 'f99f6c1f368607108c81b6303c42ce7aeb81776a648ef098582d4da9a5d88156@group.calendar.google.com';
const EVENT_COLOR = CalendarApp.EventColor.ORANGE;
const EVENT_START_HOUR = 10; // 10:00 AM
const EVENT_END_HOUR = 11; // 11:00 AM

function onFormSubmit(e) {
    try {
        if (!e?.namedValues) {
            throw new Error('onFormSubmit must be run via a form-submit trigger.');
        }

        const { namedValues } = e;

        Logger.log('Raw namedValues: ' + JSON.stringify(namedValues));

        const eventName = getFieldValue_(namedValues, FIELD.EVENT_NAME);
        const dateValue = getFieldValue_(namedValues, FIELD.DATE);

        Logger.log(`Event Name: "${eventName}" | DATE: "${dateValue}"`);

        if (!eventName) throw new Error(`Form is missing the "${FIELD.EVENT_NAME}" field.`);
        if (!dateValue) throw new Error(`Form is missing the "${FIELD.DATE}" field.`);

        const startTime = parseFormDate_(dateValue, EVENT_START_HOUR);
        const endTime = parseFormDate_(dateValue, EVENT_END_HOUR);

        Logger.log(`Parsed start: ${startTime} | end: ${endTime}`);

        const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
        if (!calendar) throw new Error(`Calendar not found for ID: ${CALENDAR_ID}`);

        const recurrence = CalendarApp.newRecurrence().addYearlyRule();
        const eventSeries = calendar.createEventSeries(eventName, startTime, endTime, recurrence);

        eventSeries.setColor(EVENT_COLOR);

        // Write the event series ID back to column D of the response row
        if (e.range) {
            const responseRow = e.range.getRow();
            e.range.getSheet().getRange(responseRow, 4).setValue(eventSeries.getId());
            Logger.log(`📝 Event ID written to row ${responseRow}, col D: ${eventSeries.getId()}`);
        }

        Logger.log(`✅ Event series created: "${eventName}" on ${startTime.toDateString()}`);
    } catch (err) {
        Logger.log(`❌ onFormSubmit error: ${err.message}`);
        throw err; // re-throw so Apps Script marks the trigger execution as failed
    }
}

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Calendar Tools')
        .addItem('Delete Event', 'deleteEventSeriesById')
        .addToUi();
}


function deleteEventSeriesById() {
    let activeCell = SpreadsheetApp.getActiveSpreadsheet().getActiveCell();
    if (!activeCell) {
        Logger.log('No active cell selected.');
        return;
    }

    if (activeCell.getColumn() !== 4) {
        Logger.log('Active cell is not in column D. Please select a cell in column D that contains the event ID.');
        return;
    }

    const eventId = activeCell.getValue();
    if (!eventId) {
        Logger.log('Selected cell is empty. Please select a cell in column D that contains the event ID.');
        return;
    }
    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
        Logger.log(`Calendar not found for ID: ${CALENDAR_ID}`);
        return;
    }

    const events = calendar.getEventSeriesById(eventId);
    if (!events) {
        Logger.log(`No event series found with ID: ${eventId}`);
        return;
    }

    events.deleteEventSeries();
    Logger.log(`Deleted event series with ID: ${eventId}`);
    SpreadsheetApp.getActiveSheet().getRange(activeCell.getRow(), 4).setValue("DELETED");
}

function getFieldValue_(namedValues, fieldName) {
    const key = Object.keys(namedValues)
        .find(k => k.trim().toLowerCase() === fieldName.toLowerCase());

    if (!key) return '';

    const value = namedValues[key];
    return String(Array.isArray(value) ? value[0] ?? '' : value ?? '').trim();
}

/**
 * Parses a date string from a Google Form response into a local Date set to
 * `hour` o'clock (defaults to 0). Supports ISO / native JS-parseable strings
 * and MM/DD/YYYY or MM-DD-YYYY formats.
 */
function parseFormDate_(dateString, hour = 0) {
    const s = String(dateString).trim();

    // DD/MM/YYYY
    let [date, month, year] = s.split("/").map(Number);
    if (!isNaN(date) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, date, hour);
    }

    // DD-MM-YYYY
    [date, month, year] = s.split("-").map(Number);
    if (!isNaN(date) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month - 1, date, hour);
    }

    // Fallback to native parsing (supports ISO and other formats)
    const parsed = new Date(s);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Unable to parse date: "${dateString}"`);
    }
    parsed.setHours(hour, 0, 0, 0);
    return parsed;

}

// ---------------------------------------------------------------------------
// Test – run manually from the Apps Script editor (Run > testOnFormSubmit)
// No calendar events are created.
// ---------------------------------------------------------------------------

/**
 * Tests all logic without writing anything to Google Calendar.
 * Results are written to Apps Script Logs (View > Logs).
 *
 * To run: open the Apps Script editor, select "testOnFormSubmit" and click Run.
 */
function testOnFormSubmit() {
    const results = { passed: 0, failed: 0 };

    function assert(label, fn) {
        try {
            fn();
            Logger.log(`✅ PASS – ${label}`);
            results.passed++;
        } catch (err) {
            Logger.log(`❌ FAIL – ${label}: ${err.message}`);
            results.failed++;
        }
    }

    function assertThrows(label, fn) {
        try {
            fn();
            Logger.log(`❌ FAIL – ${label}: expected an error but none was thrown`);
            results.failed++;
        } catch (_) {
            Logger.log(`✅ PASS – ${label}`);
            results.passed++;
        }
    }

    // --- getFieldValue_ ---------------------------------------------------------

    assert('getFieldValue_: exact match', () => {
        const val = getFieldValue_({ 'Event Name': ['Annual Meeting'] }, 'Event Name');
        if (val !== 'Annual Meeting') throw new Error(`Got "${val}"`);
    });

    assert('getFieldValue_: case-insensitive match', () => {
        const val = getFieldValue_({ 'event name': ['Annual Meeting'] }, 'Event Name');
        if (val !== 'Annual Meeting') throw new Error(`Got "${val}"`);
    });

    assert('getFieldValue_: trims whitespace', () => {
        const val = getFieldValue_({ 'Event Name': ['  Birthday  '] }, 'Event Name');
        if (val !== 'Birthday') throw new Error(`Got "${val}"`);
    });

    assert('getFieldValue_: missing key returns empty string', () => {
        const val = getFieldValue_({ 'Other': ['x'] }, 'Event Name');
        if (val !== '') throw new Error(`Got "${val}"`);
    });

    // --- parseFormDate_ ---------------------------------------------------------

    assert('parseFormDate_: ISO string sets correct date', () => {
        const d = parseFormDate_('2026-06-15', 10);
        if (d.getFullYear() !== 2026 || d.getMonth() !== 5 || d.getDate() !== 15)
            throw new Error(`Got ${d}`);
    });

    assert('parseFormDate_: MM/DD/YYYY format', () => {
        const d = parseFormDate_('06/15/2026', 10);
        if (d.getFullYear() !== 2026 || d.getMonth() !== 5 || d.getDate() !== 15)
            throw new Error(`Got ${d}`);
    });

    assert('parseFormDate_: MM-DD-YYYY format', () => {
        const d = parseFormDate_('06-15-2026', 11);
        if (d.getHours() !== 11) throw new Error(`Expected hour 11, got ${d.getHours()}`);
    });

    assert('parseFormDate_: start hour is 10, end hour is 11', () => {
        const start = parseFormDate_('2026-06-15', EVENT_START_HOUR);
        const end = parseFormDate_('2026-06-15', EVENT_END_HOUR);
        if (start.getHours() !== 10) throw new Error(`Start hour: ${start.getHours()}`);
        if (end.getHours() !== 11) throw new Error(`End hour: ${end.getHours()}`);
    });

    assertThrows('parseFormDate_: invalid string throws', () => {
        parseFormDate_('not-a-date');
    });

    // --- onFormSubmit input validation (no calendar write) ----------------------

    assertThrows('onFormSubmit: throws when namedValues absent', () => {
        onFormSubmit({});
    });

    assertThrows('onFormSubmit: throws when Event Name missing', () => {
        onFormSubmit({ namedValues: { 'DATE': ['2026-06-15'] } });
    });

    assertThrows('onFormSubmit: throws when DATE missing', () => {
        onFormSubmit({ namedValues: { 'Event Name': ['Birthday'] } });
    });

    assert('onFormSubmit: resolves correct start/end times from namedValues', () => {
        const namedValues = {
            'Event Name': ['Dry-run Test'],
            'DATE': ['2026-06-15'],
        };
        const eventName = getFieldValue_(namedValues, FIELD.EVENT_NAME);
        const dateValue = getFieldValue_(namedValues, FIELD.DATE);
        const startTime = parseFormDate_(dateValue, EVENT_START_HOUR);
        const endTime = parseFormDate_(dateValue, EVENT_END_HOUR);

        if (eventName !== 'Dry-run Test') throw new Error(`Name: "${eventName}"`);
        if (startTime.getHours() !== 10) throw new Error(`Start hour: ${startTime.getHours()}`);
        if (endTime.getHours() !== 11) throw new Error(`End hour: ${endTime.getHours()}`);
        if (startTime.getDate() !== 15) throw new Error(`Day: ${startTime.getDate()}`);
    });

    // --- Summary ----------------------------------------------------------------

    Logger.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
}