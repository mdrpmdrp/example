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
    return SpreadsheetApp.getActiveSpreadsheet();
    // try {
    //     // Try to open existing spreadsheet
    //     let spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    //     return spreadsheet;
    // } catch (e) {
    //     // Create new spreadsheet if it doesn't exist
    //     let spreadsheet = SpreadsheetApp.create('Non La Mer Hostel - Bed Management');
    //     Logger.log('Created new spreadsheet with ID: ' + spreadsheet.getId());

    //     // Create the main data sheet
    //     let sheet = spreadsheet.getActiveSheet();
    //     sheet.setName(SHEET_NAME);

    //     // Set up headers
    //     sheet.getRange(1, 1, 1, 7).setValues([
    //         ['Date', 'BedID', 'Status', 'GuestName', 'CheckInDate', 'CheckOutDate', 'Notes']
    //     ]);

    //     // Format headers
    //     sheet.getRange(1, 1, 1, 7)
    //         .setFontWeight('bold')
    //         .setBackground('#db0b20')
    //         .setFontColor('white');

    //     return spreadsheet;
    // }
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

function loadAllBedData() {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();

        const allData = {};

        // Process data rows (skip header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const bedId = row[0];
            if(row[1] === '') continue;
            const bed_data = JSON.parse(row[1]);
            const date = bed_data.date;


            let dateRange = generateDateRange(bed_data.checkIn, bed_data.checkOut);
            dateRange.pop(); // Remove checkout date to allow back-to-back bookings
            if (!allData[date]) {
                allData[date] = {};
            }
            dateRange.forEach(d => {
                allData[d] = allData[d] || {};
                allData[d][bedId] = {
                    status: bed_data.status,
                    guest: bed_data.guest,
                    checkIn: bed_data.checkIn,
                    checkOut: bed_data.checkOut,
                    phone: bed_data.phone,
                    notes: bed_data.notes,
                    bookingId: bed_data.bookingId,
                    noteColor: bed_data.noteColor || 'default'
                };
            });
        }

        return JSON.stringify({ success: true, data: allData });
    } catch (error) {
        Logger.log('Error loading all data: ' + error.toString());
        return JSON.stringify({ success: false, message: error.toString(), data: {} });
    }
}

/**
 * Load bed data from Google Sheets
 */
function loadBedData(date) {
    try {
        const spreadsheet = getOrCreateSpreadsheet();
        const sheet = spreadsheet.getSheetByName(SHEET_NAME);
        const data = sheet.getDataRange().getValues();
        const bedData = data.find(row =>{
            const row_data = JSON.parse(row[1]);
            return row_data.date === date;
        });
        if (bedData) {
            return JSON.stringify({ success: true, data: JSON.parse(bedData[1]) });
        } else {
            return JSON.stringify({ success: true, data: {} });
        }
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

        // Process data rows (skip header)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const bed_data = JSON.parse(row[1]);
            const date = new Date(bed_data.date);

            if (date >= start && date <= end) {                                                             
                const status = bed_data.status;
                stats[date] = stats[date] || { total: 0, occupied: 0, available: 0 };
                stats[date].total++;

                if (status === 'occupied') {
                    stats[date].occupied++;
                } else {
                    stats[date].available++;
                }
            }
        }

        // Calculate occupancy rates
        Object.keys(stats).forEach(date => {
            stats[date].occupancyRate = Math.round((stats[date].occupied / stats[date].total) * 100);
        });

        return { success: true, data: stats };
    } catch (error) {
        Logger.log('Error getting stats: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Check in a guest
 */
function checkInGuest(guestName, bedId, checkInDate, checkOutDate, phone, notes, bookingId, noteColor) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const finder = sheet.getRange(1, 1, sheet.getLastRow(), 2).createTextFinder(bedId);
        const foundCell = finder.findNext();
        if(!foundCell) {
            sheet.appendRow([bedId, JSON.stringify({
                date: checkInDate,
                status: 'occupied',
                guest: guestName,
                checkIn: checkInDate,
                checkOut: checkOutDate,
                phone: phone,
                notes: notes,
                noteColor: noteColor || 'default',
                bookingId: bookingId
            })]);
            return { success: true, message: 'Guest checked in successfully' };
        }
        const row = foundCell.getRow();
        let bedData = sheet.getRange(row, 2).getValue()
        if(bedData === '') {
            bedData = {
                date: checkInDate,
                status: 'available',
                guest: null,
                checkIn: null,
                checkOut: null,
                phone: null,
                notes: '',
                noteColor: 'default',
                bookingId: null
            };
        } else {
            bedData = JSON.parse(bedData);
        }

        // Check if bed is already occupied
        if (bedData.status === 'occupied') {
            return { success: false, message: 'Bed is already occupied' };
        }

        // Update bed data
        bedData.status = 'occupied';
        bedData.guest = guestName;
        bedData.checkIn = checkInDate;
        bedData.checkOut = checkOutDate;
        bedData.phone = phone;
        bedData.notes = notes;
        bedData.noteColor = noteColor || 'default';
        bedData.bookingId = bookingId;

        // Save updated data
        sheet.getRange(row, 2).setValue(JSON.stringify(bedData));
        return { success: true, message: 'Guest checked in successfully' };
    } catch (error) {
        Logger.log('Error checking in guest: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Check out a guest
 */
function checkOutGuest(bedId) {
    try{
         const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        const finder = sheet.getRange(1, 1, sheet.getLastRow(), 2).createTextFinder(bedId);
        const foundCell = finder.findNext();
        if (!foundCell) {
            return { success: false, message: 'Bed not found' };
        }
        const row = foundCell.getRow();
        const bedData = JSON.parse(sheet.getRange(row, 2).getValue());
        // Check if bed is already available
        if (bedData.status === 'available') {
            return { success: false, message: 'Bed is already available' };
        }

        sheet.getRange(row, 2).clear()
        return { success: true, message: 'Guest checked out successfully' };
    } catch (error) {
        Logger.log('Error checking out guest: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Swap two beds
 */
function moveBed(fromBedId, toBedId) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);

        const finderFrom = sheet.getRange(1, 1, sheet.getLastRow(), 2).createTextFinder(fromBedId);
        const foundCellFrom = finderFrom.findNext();
        if (!foundCellFrom) {
            return { success: false, message: 'Current bed not found' };
        }
        const rowFrom = foundCellFrom.getRow();
        const bedDataFrom = JSON.parse(sheet.getRange(rowFrom, 2).getValue());

        const finderTo = sheet.getRange(1, 1, sheet.getLastRow(), 2).createTextFinder(toBedId);
        const foundCellTo = finderTo.findNext();
        if (!foundCellTo) {
            sheet.appendRow([toBedId, JSON.stringify(bedDataFrom)]);
            sheet.getRange(rowFrom, 2).clear();
            return { success: true, message: 'Beds swapped successfully' };
        }
        const rowTo = foundCellTo.getRow();

        // Swap bed data
        sheet.getRange(rowFrom, 2).clear();
        sheet.getRange(rowTo, 2).setValue(JSON.stringify(bedDataFrom));

        return { success: true, message: 'Beds swapped successfully' };
    } catch (error) {
        Logger.log('Error swapping beds: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Update guest notes
 */
function updateGuestNotes(bedId, notes, noteColor) {
    try {
        const ss = getOrCreateSpreadsheet();
        const sheet = ss.getSheetByName(SHEET_NAME);
        
        const finder = sheet.getRange(1, 1, sheet.getLastRow(), 2).createTextFinder(bedId);
        const foundCell = finder.findNext();
        
        if (!foundCell) {
            return { success: false, message: 'Bed not found' };
        }
        
        const row = foundCell.getRow();
        let bedData = sheet.getRange(row, 2).getValue()
        if(bedData === '') {
            return { success: false, message: 'No data for this bed' };
        }
        bedData = JSON.parse(bedData);

        // Update notes and note color
        bedData.notes = notes;
        bedData.noteColor = noteColor || 'default';
        
        // Save updated data
        sheet.getRange(row, 2).setValue(JSON.stringify(bedData));
        
        return { success: true, message: 'Notes updated successfully' };
    } catch (error) {
        Logger.log('Error updating notes: ' + error.toString());
        return { success: false, message: error.toString() };
    }
}

/**
 * Reset all beds for a specific date
 */
function resetAllBeds(currentDate) {
    try {
        const hostelConfig = initializeHostelData();
        const bedData = {};

        // Initialize all beds as available
        Object.keys(hostelConfig.dorms).forEach(dormName => {
            hostelConfig.dorms[dormName].forEach(bedId => {
                bedData[bedId] = {
                    status: 'available',
                    guest: null,
                    checkIn: null,
                    checkOut: null,
                    notes: ''
                };
            });
        });

        return saveBedData(currentDate, bedData);
    } catch (error) {
        Logger.log('Error resetting beds: ' + error.toString());
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
            const row = data[i];
            const rowDate = new Date(row[0]);

            if (rowDate >= start && rowDate <= end && row[2] === 'occupied') {
                exportData.push({
                    date: row[0],
                    bedId: row[1],
                    guestName: row[3],
                    checkInDate: row[4],
                    checkOutDate: row[5],
                    notes: row[6]
                });
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

    // Test loading data
    const loadResult = loadBedData(testDate);
    Logger.log('Load test:', loadResult);

    // Test check-in
    const checkInResult = checkInGuest('1A', 'John Doe', testDate, '2025-10-03', 'Test guest', testDate);
    Logger.log('Check-in test:', checkInResult);

    // Test loading updated data
    const loadResult2 = loadBedData(testDate);
    Logger.log('Load after check-in:', loadResult2);

    // Test check-out
    const checkOutResult = checkOutGuest('1A', '2025-10-02', 'Early checkout', testDate);
    Logger.log('Check-out test:', checkOutResult);
}
