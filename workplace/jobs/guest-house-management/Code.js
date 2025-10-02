/**
 * Non La Mer Hostel - Bed Management System
 * Google Apps Script Backend
 */

// Configuration
const SHEET_NAME = 'HostelData';

/**
 * Main function to serve the HTML page
 */
function doGet() {
    return HtmlService.createTemplateFromFile('index').evaluate()
        .setTitle('Non La Mer Hostel - Bed Management System')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setFaviconUrl('https://img2.pic.in.th/pic/1759252648621.png'); // Replace with your favicon URL

}

/**
 * Initialize the hostel data structure
 */
function initializeHostelData() {
    const hostelConfig = {
        name: "Non La Mer Hostel - Bed & Yoga",
        totalBeds: 48,
        dorms: {
            'Dorm 1': ['1A', '1B', '1C', '1D', '1E', '1F', '1G', '1H'],
            'Dorm 2': ['2A', '2B', '2C', '2D', '2E', '2F'],
            'Dorm 3': ['3A', '3B', '3C', '3D', '3E', '3F'],
            'Dorm 4': ['4A', '4B', '4C', '4D', '4E', '4F'],
            'Dorm 5': ['5A', '5B', '5C', '5D', '5E', '5F', '5G', '5H'],
            'Dorm 7': ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H'],
            'Dorm 8': ['8A', '8B', '8C', '8D', '8E', '8F']
        }
    };

    return hostelConfig;
}

/**
 * Get or create the spreadsheet for data storage
 */
function getOrCreateSpreadsheet() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
        
        // Set up headers for normal row-column structure
        const headers = [
            'BookingID', 'BedID', 'Status', 'GuestName', 'CheckInDate', 
            'CheckOutDate', 'Notes', 'NoteColor', 'BookingType', 'CreatedDate',
            'ActualCheckIn', 'ActualCheckOut', 'LastModified', 'CancelledDate',
            'MovedDate', 'OriginalBedID'
        ];
        
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        
        // Format headers
        sheet.getRange(1, 1, 1, headers.length)
            .setFontWeight('bold')
            .setBackground('#db0b20')
            .setFontColor('white');
    }
    
    return spreadsheet;
}

function generateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];
    let currentDate = start;

    while (currentDate <= end) {
        dateArray.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
}

/**
 * Convert spreadsheet row to booking object
 */
function rowToBookingObject(row) {
    return {
        bookingId: row[0] || '',
        bedId: row[1] || '',
        status: row[2] || 'available',
        guest: row[3] || '',
        checkIn: row[4] || '',
        checkOut: row[5] || '',
        notes: row[6] || '',
        noteColor: row[7] || 'default',
        bookingType: row[8] || 'checkin',
        createdDate: row[9] || '',
        actualCheckIn: row[10] || '',
        actualCheckOut: row[11] || '',
        lastModified: row[12] || '',
        cancelledDate: row[13] || '',
        movedDate: row[14] || '',
        originalBedId: row[15] || ''
    };
}

/**
 * Convert booking object to spreadsheet row
 */
function bookingObjectToRow(booking) {
    return [
        booking.bookingId || '',
        booking.bedId || '',
        booking.status || '',
        booking.guest || '',
        booking.checkIn || '',
        booking.checkOut || '',
        booking.notes || '',
        booking.noteColor || 'default',
        booking.bookingType || 'checkin',
        booking.createdDate || '',
        booking.actualCheckIn || '',
        booking.actualCheckOut || '',
        booking.lastModified || '',
        booking.cancelledDate || '',
        booking.movedDate || '',
        booking.originalBedId || ''
    ];
}

function loadAllBedData() {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        const allData = {};
        const allBookings = [];

        // Process data rows (skip header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if(!row[0] || !row[1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(row);
                allBookings.push(bookingData);
                
                // Generate date range for this booking
                let dateRange = generateDateRange(bookingData.checkIn, bookingData.checkOut);
                dateRange.pop(); // Remove checkout date to allow back-to-back bookings
                
                dateRange.forEach(d => {
                    if (!allData[d]) {
                        allData[d] = {};
                    }
                    allData[d][bookingData.bedId] = {
                        status: bookingData.status,
                        guest: bookingData.guest,
                        checkIn: bookingData.checkIn,
                        checkOut: bookingData.checkOut,
                        notes: bookingData.notes,
                        bookingId: bookingData.bookingId,
                        noteColor: bookingData.noteColor || 'default',
                        bookingType: bookingData.bookingType || 'checkin'
                    };
                });
            } catch (parseError) {
                Logger.log('Error processing booking data at row ' + i + ': ' + parseError.toString());
            }
        }

        return JSON.stringify({ success: true, data: allData, bookings: allBookings });
    } catch (error) {
        Logger.log('Error loading all data: ' + error.toString());
        return JSON.stringify({ success: false, message: error.toString(), data: {}, bookings: [] });
    }
}

/**
 * Load bed data from Google Sheets for a specific date
 */
function loadBedData(date) {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        const dateData = {};
        const targetDate = new Date(date);
        
        // Process all bookings to find those that cover the target date
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                
                if (bookingData.status === 'cancelled') continue;
                
                const checkIn = new Date(bookingData.checkIn);
                const checkOut = new Date(bookingData.checkOut);
                
                // Check if the target date falls within this booking period
                if (targetDate >= checkIn && targetDate < checkOut) {
                    dateData[bookingData.bedId] = {
                        status: bookingData.status,
                        guest: bookingData.guest,
                        checkIn: bookingData.checkIn,
                        checkOut: bookingData.checkOut,
                        notes: bookingData.notes,
                        bookingId: bookingData.bookingId,
                        noteColor: bookingData.noteColor || 'default',
                        bookingType: bookingData.bookingType || 'checkin'
                    };
                }
            } catch (parseError) {
                continue;
            }
        }
        
        return JSON.stringify({ success: true, data: dateData });
    } catch (error) {
        Logger.log('Error loading data: ' + error.toString());
        return JSON.stringify({ success: false, message: error.toString(), data: {} });
    }
}

/**
 * Get occupancy statistics for a date range
 */
function getOccupancyStats(startDate, endDate) {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        const stats = {};
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Initialize stats for each day in range
        let currentDate = new Date(start);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            stats[dateStr] = { 
                total: 0, 
                occupied: 0, 
                booked: 0, 
                available: 0,
                occupancyRate: 0,
                bookingRate: 0
            };
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Process booking data
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                
                if (bookingData.status === 'cancelled') continue;
                
                // Generate date range for this booking
                const bookingStart = new Date(bookingData.checkIn);
                const bookingEnd = new Date(bookingData.checkOut);
                
                let currentBookingDate = new Date(bookingStart);
                while (currentBookingDate < bookingEnd) {
                    const dateStr = currentBookingDate.toISOString().split('T')[0];
                    
                    if (stats[dateStr]) {
                        stats[dateStr].total++;
                        
                        if (bookingData.status === 'occupied') {
                            stats[dateStr].occupied++;
                        } else if (bookingData.status === 'booked') {
                            stats[dateStr].booked++;
                        }
                    }
                    
                    currentBookingDate.setDate(currentBookingDate.getDate() + 1);
                }
            } catch (parseError) {
                continue;
            }
        }

        // Calculate rates and available beds
        const hostelConfig = initializeHostelData();
        const totalBeds = hostelConfig.totalBeds;
        
        Object.keys(stats).forEach(date => {
            stats[date].available = totalBeds - stats[date].occupied - stats[date].booked;
            stats[date].occupancyRate = totalBeds > 0 ? Math.round((stats[date].occupied / totalBeds) * 100) : 0;
            stats[date].bookingRate = totalBeds > 0 ? Math.round(((stats[date].occupied + stats[date].booked) / totalBeds) * 100) : 0;
        });

        return { success: true, data: stats };
    } catch (error) {
        Logger.log('Error getting stats: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Pre-book a bed (advance booking)
 */
function preBookBed(guestName, bedId, checkInDate, checkOutDate, notes, bookingId, noteColor) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        
        // Generate unique booking ID if not provided
        if (!bookingId) {
            bookingId = 'PRE-' + Date.now();
        }
        
        // Check for conflicts with existing bookings
        const existingData = sheet.getDataRange().getValues();
        for (let i = 1; i < existingData.length; i++) {
            if (!existingData[i][0] || !existingData[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const existingBooking = rowToBookingObject(existingData[i]);
                if (existingBooking.bedId === bedId && existingBooking.status !== 'cancelled') {
                    // Check date overlap
                    const existingStart = new Date(existingBooking.checkIn);
                    const existingEnd = new Date(existingBooking.checkOut);
                    const newStart = new Date(checkInDate);
                    const newEnd = new Date(checkOutDate);
                    
                    if ((newStart < existingEnd && newEnd > existingStart)) {
                        return { success: false, message: 'Bed is already booked for these dates' };
                    }
                }
            } catch (parseError) {
                continue;
            }
        }
        
        // Create new booking
        const bookingData = {
            bookingId: bookingId,
            bedId: bedId,
            status: 'booked',
            guest: guestName,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            notes: notes,
            noteColor: noteColor || 'default',
            bookingType: 'prebooking',
            createdDate: new Date().toISOString().split('T')[0]
        };
        
        // Add new row with booking data
        sheet.appendRow(bookingObjectToRow(bookingData));
        
        return { success: true, message: 'Bed pre-booked successfully', bookingId: bookingId };
    } catch (error) {
        Logger.log('Error pre-booking bed: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Check in a guest
 */
function checkInGuest(guestName, bedId, checkInDate, checkOutDate, notes, bookingId, noteColor) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        
        // Check if there's an existing pre-booking for this bed/guest
        let existingBookingRow = null;
        const data = sheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                if (bookingData.bedId === bedId && bookingData.status === 'booked' && 
                    (bookingId && bookingData.bookingId === bookingId || 
                     bookingData.guest === guestName)) {
                    existingBookingRow = i + 1; // Convert to 1-based row number
                    break;
                }
            } catch (parseError) {
                continue;
            }
        }
        
        if (existingBookingRow) {
            // Update existing pre-booking to checked-in status
            const existingBooking = rowToBookingObject(sheet.getRange(existingBookingRow, 1, 1, 16).getValues()[0]);
            existingBooking.status = 'occupied';
            existingBooking.bookingType = 'checkin';
            existingBooking.actualCheckIn = checkInDate;
            
            // Update any changed details
            if (guestName) existingBooking.guest = guestName;
            if (notes) existingBooking.notes = notes;
            if (noteColor) existingBooking.noteColor = noteColor;
            
            sheet.getRange(existingBookingRow, 1, 1, 16).setValues([bookingObjectToRow(existingBooking)]);
            return { success: true, message: 'Guest checked in successfully (from pre-booking)' };
        } else {
            // Check for conflicts with existing bookings
            for (let i = 1; i < data.length; i++) {
                if (!data[i][0] || !data[i][1]) continue;
                
                try {
                    const bookingData = rowToBookingObject(data[i]);
                    if (bookingData.bedId === bedId && (bookingData.status === 'occupied' || bookingData.status === 'booked')) {
                        // Check date overlap
                        const existingStart = new Date(bookingData.checkIn);
                        const existingEnd = new Date(bookingData.checkOut);
                        const newStart = new Date(checkInDate);
                        const newEnd = new Date(checkOutDate);
                        
                        if ((newStart < existingEnd && newEnd > existingStart)) {
                            return { success: false, message: 'Bed is already occupied or booked for these dates' };
                        }
                    }
                } catch (parseError) {
                    continue;
                }
            }
            
            // Create new check-in booking
            if (!bookingId) {
                bookingId = 'CHK-' + Date.now();
            }
            
            const bookingData = {
                bookingId: bookingId,
                bedId: bedId,
                status: 'occupied',
                guest: guestName,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                notes: notes,
                noteColor: noteColor || 'default',
                bookingType: 'checkin',
                createdDate: new Date().toISOString().split('T')[0]
            };
            
            sheet.appendRow(bookingObjectToRow(bookingData));
            return { success: true, message: 'Guest checked in successfully' };
        }
    } catch (error) {
        Logger.log('Error checking in guest: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Cancel a pre-booking
 */
function cancelPreBooking(bookingId) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                if (bookingData.bookingId === bookingId && bookingData.status === 'booked') {
                    // Update booking status to cancelled
                    bookingData.status = 'cancelled';
                    bookingData.cancelledDate = new Date().toISOString().split('T')[0];
                    
                    sheet.getRange(i + 1, 1, 1, 16).setValues([bookingObjectToRow(bookingData)]);
                    return { success: true, message: 'Pre-booking cancelled successfully' };
                }
            } catch (parseError) {
                continue;
            }
        }
        
        return { success: false, message: 'Pre-booking not found or already processed' };
    } catch (error) {
        Logger.log('Error cancelling pre-booking: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Get all bookings (including pre-bookings)
 */
function getAllBookings(startDate, endDate) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        const bookings = [];
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                
                // Filter by date range if provided
                if (start && end) {
                    const bookingStart = new Date(bookingData.checkIn);
                    const bookingEnd = new Date(bookingData.checkOut);
                    
                    if (bookingEnd < start || bookingStart > end) {
                        continue;
                    }
                }
                
                bookings.push(bookingData);
            } catch (parseError) {
                continue;
            }
        }
        
        return { success: true, data: bookings };
    } catch (error) {
        Logger.log('Error getting all bookings: ' + error.toString());
        return { success: false, message: error.toString(), data: [] };
    }
}

/**
 * Check out a guest
 */
function checkOutGuest(bedId, checkOutDate) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        // Find the current booking for this bed
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                if (bookingData.bedId === bedId && bookingData.status === 'occupied') {
                    // Check if current date is within the booking period
                    const currentDate = checkOutDate || new Date().toISOString().split('T')[0];
                    const bookingStart = new Date(bookingData.checkIn);
                    const bookingEnd = new Date(bookingData.checkOut);
                    const today = new Date(currentDate);
                    
                    if (today >= bookingStart && today <= bookingEnd) {
                        // Update booking to checked out
                        bookingData.status = 'completed';
                        bookingData.actualCheckOut = currentDate;
                        
                        sheet.getRange(i + 1, 1, 1, 16).setValues([bookingObjectToRow(bookingData)]);
                        return { success: true, message: 'Guest checked out successfully' };
                    }
                }
            } catch (parseError) {
                continue;
            }
        }
        
        return { success: false, message: 'No active booking found for this bed' };
    } catch (error) {
        Logger.log('Error checking out guest: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Move a guest from one bed to another
 */
function moveBed(fromBedId, toBedId) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        let fromBookingRow = null;
        let fromBookingData = null;
        
        // Find the current booking for the source bed
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                if (bookingData.bedId === fromBedId && 
                    (bookingData.status === 'occupied' || bookingData.status === 'booked')) {
                    fromBookingRow = i + 1;
                    fromBookingData = bookingData;
                    break;
                }
            } catch (parseError) {
                continue;
            }
        }
        
        if (!fromBookingData) {
            return { success: false, message: 'No active booking found for source bed' };
        }
        
        // Check if target bed is available during the same period
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue;
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                if (bookingData.bedId === toBedId && 
                    (bookingData.status === 'occupied' || bookingData.status === 'booked')) {
                    
                    // Check date overlap
                    const existingStart = new Date(bookingData.checkIn);
                    const existingEnd = new Date(bookingData.checkOut);
                    const moveStart = new Date(fromBookingData.checkIn);
                    const moveEnd = new Date(fromBookingData.checkOut);
                    
                    if ((moveStart < existingEnd && moveEnd > existingStart)) {
                        return { success: false, message: 'Target bed is not available for the same period' };
                    }
                }
            } catch (parseError) {
                continue;
            }
        }
        
        // Update the booking with new bed ID
        fromBookingData.bedId = toBedId;
        fromBookingData.movedDate = new Date().toISOString().split('T')[0];
        fromBookingData.originalBedId = fromBedId;
        
        sheet.getRange(fromBookingRow, 1, 1, 16).setValues([bookingObjectToRow(fromBookingData)]);
        
        return { success: true, message: 'Guest moved successfully from ' + fromBedId + ' to ' + toBedId };
    } catch (error) {
        Logger.log('Error moving bed: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Update guest notes
 */
function updateGuestNotes(bedId, notes, noteColor, bookingId) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                
                // Match by bedId and optionally bookingId, and ensure it's an active booking
                if (bookingData.bedId === bedId && 
                    (bookingData.status === 'occupied' || bookingData.status === 'booked') &&
                    (!bookingId || bookingData.bookingId === bookingId)) {
                    
                    // Update notes and note color
                    bookingData.notes = notes;
                    bookingData.noteColor = noteColor || 'default';
                    bookingData.lastModified = new Date().toISOString().split('T')[0];
                    
                    sheet.getRange(i + 1, 1, 1, 16).setValues([bookingObjectToRow(bookingData)]);
                    return { success: true, message: 'Notes updated successfully' };
                }
            } catch (parseError) {
                continue;
            }
        }
        
        return { success: false, message: 'No active booking found for this bed' };
    } catch (error) {
        Logger.log('Error updating notes: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Get all guest data for export
 */
function exportGuestData(startDate, endDate) {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        const exportData = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Filter data by date range
        for (let i = 1; i < data.length; i++) {
            if (!data[i][0] || !data[i][1]) continue; // Skip if no booking ID or bed ID
            
            try {
                const bookingData = rowToBookingObject(data[i]);
                const bookingStart = new Date(bookingData.checkIn);
                const bookingEnd = new Date(bookingData.checkOut);

                // Check if booking overlaps with the requested date range
                if (bookingEnd >= start && bookingStart <= end) {
                    exportData.push({
                        bookingId: bookingData.bookingId,
                        bedId: bookingData.bedId,
                        status: bookingData.status,
                        bookingType: bookingData.bookingType,
                        guestName: bookingData.guest,
                        checkInDate: bookingData.checkIn,
                        checkOutDate: bookingData.checkOut,
                        actualCheckIn: bookingData.actualCheckIn || '',
                        actualCheckOut: bookingData.actualCheckOut || '',
                        notes: bookingData.notes,
                        noteColor: bookingData.noteColor,
                        createdDate: bookingData.createdDate,
                        lastModified: bookingData.lastModified || '',
                        originalBedId: bookingData.originalBedId || ''
                    });
                }
            } catch (parseError) {
                continue;
            }
        }

        return { success: true, data: exportData };
    } catch (error) {
        Logger.log('Error exporting data: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Test function to verify the system
 */
function testSystem() {
    const testDate = '2025-10-01';
    const checkOutDate = '2025-10-03';

    // Test pre-booking
    const preBookResult = preBookBed('Jane Smith', '1A', testDate, checkOutDate, 'Test pre-booking');
    Logger.log('Pre-booking test:', preBookResult);

    // Test loading all data
    const loadResult = loadAllBedData();
    Logger.log('Load all data test:', loadResult);

    // Test check-in (should work with existing pre-booking)
    const checkInResult = checkInGuest('Jane Smith', '1A', testDate, checkOutDate, 'Test guest checked in');
    Logger.log('Check-in test:', checkInResult);

    // Test getting all bookings
    const bookingsResult = getAllBookings(testDate, checkOutDate);
    Logger.log('Get all bookings test:', bookingsResult);

    // Test check-out
    const checkOutResult = checkOutGuest('1A', '2025-10-02');
    Logger.log('Check-out test:', checkOutResult);

    // Test occupancy stats
    const statsResult = getOccupancyStats(testDate, '2025-10-05');
    Logger.log('Occupancy stats test:', statsResult);
}
