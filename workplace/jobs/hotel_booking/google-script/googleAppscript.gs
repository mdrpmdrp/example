function doPost(e) {
    // Get the requested action
    const action = e.parameter.action;
    let result = {};
    
    if (action === 'createBooking') {
        result = handleCreateBooking(e.parameter);
    } 
    else if (action === 'cancelBooking') {
        result = handleCancelBooking(e.parameter);
    }
    else {
        result = {
            success: false,
            message: 'Invalid action requested'
        };
    }
    
    // Return JSONP-formatted response
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
    // Set up JSONP response
    var callback = e.parameter.callback || 'callback';
    var output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JAVASCRIPT);
    
    // Get the requested action
    const action = e.parameter.action;
    let result = {};
    
    if (action === 'checkAvailability') {
        result = handleCheckAvailability(e.parameter);
    } else if (action === 'searchBooking') {
        result = handleSearchBooking(e.parameter);
    } else if (action === 'searchBookingByEmail') {
        result = handleSearchBookingByEmail(e.parameter);
    }  else {
        result = {
            success: false,
            message: 'Invalid action requested'
        };
    }
    
    // Return JSONP-formatted response
    return output.setContent(callback + '(' + JSON.stringify(result) + ')');
}

/**
 * Handle the check availability action
 * @param {Object} params - The request parameters
 * @return {Object} The availability result
 */
function handleCheckAvailability(params) {
    try {
        // Get parameters
        const checkInDate = params?.checkInDate || '2025-04-09'
        const checkOutDate = params?.checkOutDate || '2025-04-25'
        const roomQuantity = params?.roomQuantity || 1;
        
        // Validate dates
        if (!checkInDate || !checkOutDate) {
            return { success: false, message: 'วันที่ไม่ถูกต้อง กรุณากรอกวันที่ให้ถูกต้อง' };
        }
        
        
        // Validate date range
        if (new Date(checkInDate) > new Date(checkOutDate)) {
            return { success: false, message: 'วันที่เช็คอินต้องน้อยกว่าหรือเท่ากับวันที่เช็คเอาท์' };
        }
        
        // Calculate number of nights
        const daysDiff = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 0) {
            return { success: false, message: 'กรุณาเลือกวันที่เช็คอินและเช็คเอาท์ที่ถูกต้อง' };
        }
        
        // Check availability in the spreadsheet
        const availableRooms = getAvailableRooms(checkInDate, checkOutDate, roomQuantity);
        
        return { 
            success: true, 
            availableRooms: availableRooms,
            nights: daysDiff 
        };
    } catch (error) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบความพร้อมใช้งาน: ' + error.message };
    }
}

/**
 * Get the number of available rooms for the given date range
 * @param {Date} checkIn - Check-in date
 * @param {Date} checkOut - Check-out date
 * @param {number} roomQuantity - Number of rooms requested
 * @return {number} Number of available rooms
 */
function getAvailableRooms(checkIn, checkOut, roomQuantity=0) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const bookingsSheet = ss.getSheetByName('Summary Booking');
    let max_reamin = ss.getSheetByName('Room Detail').getRange('B2').getValue();
    
    // Get all bookings
    const dataRange = bookingsSheet.getDataRange();
    const summaryBooking = dataRange.getValues().slice(1).filter(row => row[0] != '').map(row =>{
        return {
            date: row[0],
            booked: row[1],
            remain: row[2]
        }
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    if(summaryBooking.length == 0) {
        return max_reamin;
    }
    let start_range = summaryBooking[0].date;
    let end_range = summaryBooking[summaryBooking.length - 1].date;
    let checkIn_date = new Date(checkIn);
    let checkOut_date = new Date(checkOut);
    let start_range_date = new Date(start_range);
    let end_range_date = new Date(end_range);
    if(checkIn_date < start_range_date) start_range_date = checkIn_date;
    if(checkOut_date > end_range_date) end_range_date = checkOut_date;
    let diff = Math.ceil((end_range_date - start_range_date) / (1000 * 60 * 60 * 24));
    let newDate = start_range_date
    for (let i = 0; i < diff; i++) {
        newDate.setDate(newDate.getDate() + 1);
        let date = Utilities.formatDate(newDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        let index = summaryBooking.findIndex(booking => booking.date == date);
        if(index == -1) {
            summaryBooking.push({
                date: date,
                booked: 0,
                remain: max_reamin
            });
        }
       
    }
    summaryBooking.sort((a, b) => new Date(a.date) - new Date(b.date));
    const bookings = summaryBooking.filter(booking => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= new Date(checkIn) && bookingDate <= new Date(checkOut);
    });

    let availableRooms = Math.min(...bookings.map(booking => booking.remain));
    // Check if the requested number of rooms is available
    if (availableRooms < roomQuantity) {
        return 0; // Not enough rooms available
    }

    
    return availableRooms;
}   

/**
 * Handle the create booking action - to be implemented
 * @param {Object} params - The request parameters
 * @return {Object} The booking result
 */
function handleCreateBooking(params) {
    let lock = LockService.getScriptLock();
    if(!lock.tryLock(30000)) {
        return { success: false, message: 'ไม่สามารถจองได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' };
    }
    
    try {
        const recaptchaResponse = verifyCaptcha(params);
        if (!recaptchaResponse.success) {
            lock.releaseLock();
            return { success: false, message: 'ไม่สามารถยืนยันตัวตนได้ กรุณาลองใหม่อีกครั้ง' };
        }
        // Verify required fields
        const requiredFields = ['checkInDate', 'checkOutDate', 'firstName', 'lastName', 'email', 'phone'];
        for (const field of requiredFields) {
            if (!params[field]) {
                lock.releaseLock();
                return { success: false, message: `กรุณากรอกข้อมูลให้ครบถ้วน` };
            }
        }
        
        // Check if rooms are available
        const checkIn = new Date(params.checkInDate);
        const checkOut = new Date(params.checkOutDate);
        const availableRooms = getAvailableRooms(checkIn, checkOut);
        
        if (availableRooms <= 0) {
            lock.releaseLock();
            return { success: false, message: 'ห้องพักในวันที่เลือกเต็มแล้ว กรุณาเลือกวันที่อื่น' };
        }
        
        // Generate booking ID
        const bookingId = generateBookingId();
        
        // Save booking to spreadsheet
        saveBooking({
            bookingId: bookingId,
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults || '1',
            children: params.children || '0',
            firstName: params.firstName,
            lastName: params.lastName,
            email: params.email,
            phone: params.phone,
            specialRequests: params.specialRequests || '',
            status: 'Pending',
            createdAt: new Date(),
            stay: params.stay || '1',
            roomQuantity: params.roomQuantity || 1
        });
        
        lock.releaseLock();
        return {
            success: true,
            bookingId: bookingId,
            message: 'บันทึกการจองเรียบร้อยแล้ว',
        };
        
    } catch (error) {
        lock.releaseLock();
        return { success: false, message: 'ข้อผิดพลาดในการจอง: ' + error.message };
    }
}

/**
 * Generate a unique booking ID
 */
function generateBookingId() {
    return 'BOOK-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

/**
 * Save booking to spreadsheet
 */
function saveBooking(booking) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let bookingsSheet = ss.getSheetByName('booking');
    let newrow = bookingsSheet.getLastRow() + 1;
    let numberFormats = [[
        '@', // Booking ID
        'yyyy-MM-dd HH:mm:ss', // Created At
        '@', // Name
        '@', // Email
        '@', // Phone
        'yyyy-MM-dd', // Check In Date
        'yyyy-MM-dd', // Check Out Date
        '0', // Adults
        '0', // Children
        '@', // Special Requests
        '0', // Stay
        '0', // Room Quantity
        '@' // Status
    ]];
    bookingsSheet.getRange(newrow, 1, 1, numberFormats[0].length)
    .setNumberFormats(numberFormats)
    .setValues([[
        booking.bookingId,
        booking.createdAt,
        booking.firstName + ' ' + booking.lastName,
        booking.email,
        booking.phone,
        booking.checkInDate,
        booking.checkOutDate,
        booking.adults,
        booking.children,
        booking.specialRequests,
        booking.stay,
        booking.roomQuantity,
        booking.status
    ]]);
    
}

function verifyCaptcha(params) {
    var secretKey = '6Lcy0hwrAAAAAEEIQxhiOzI93y9wdttGRnam5oEz'; // Replace with your reCAPTCHA secret
    var responseToken = params['g-recaptcha-response'];
    var remoteIp = params['remoteip'] || ''; // optional

    var url = 'https://www.google.com/recaptcha/api/siteverify';
    var payload = {
        'secret': secretKey,
        'response': responseToken,
        'remoteip': remoteIp
    };

    var options = {
        'method': 'post',
        'payload': payload
    };

    var verifyResponse = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(verifyResponse.getContentText());

    if (result.success) {
        // ✅ reCAPTCHA passed
        return {
            success: true,
            message: 'reCAPTCHA passed'
        }
    } else {
        // ❌ reCAPTCHA failed
        return {
            success: false,
            message: 'reCAPTCHA failed'
        }
    }
}

/**
 * Handle the search booking action
 * @param {Object} params - The request parameters
 * @return {Object} The search result
 */
function handleSearchBooking(params) {
    try {
        // Get booking ID from parameters
        const bookingId = params.bookingId;
        
        // Validate booking ID
        if (!bookingId) {
            return { success: false, message: 'กรุณากรอกหมายเลขการจอง' };
        }
        
        // Get the spreadsheet and the bookings sheet
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const bookingsSheet = ss.getSheetByName('Bookings');
        
        if (!bookingsSheet) {
            return { success: false, message: 'เกิดข้อผิดพลาดในการเข้าถึงข้อมูลการจอง' };
        }
        
        // Get all bookings
        const dataRange = bookingsSheet.getDataRange();
        const bookingsData = dataRange.getValues();
        
        // Find the booking with the matching ID
        let bookingRow = null;
        for (let i = 1; i < bookingsData.length; i++) {
            if (bookingsData[i][0] === bookingId) {
                bookingRow = bookingsData[i];
                break;
            }
        }
        
        // If booking not found
        if (!bookingRow) {
            return { success: false, message: 'ไม่พบข้อมูลการจองที่ตรงกัน' };
        }
        let room_detail = ss.getSheetByName('Room Detail').getRange(2, 1, 1, 4).getValues()[0];
        
        // Extract booking details
        const booking = {
            bookingId: bookingRow[0],
            checkInDate: bookingRow[1],
            checkOutDate: bookingRow[2],
            adults: bookingRow[3],
            children: bookingRow[4],
            firstName: bookingRow[5],
            lastName: bookingRow[6],
            email: bookingRow[7],
            phone: bookingRow[8],
            specialRequests: bookingRow[9],
            status: bookingRow[10].toLowerCase(),
            roomType: room_detail[0],
            roomPrice: room_detail[2],
            room_detail: room_detail[3]
        };
        
        return {
            success: true,
            data: booking
        };
    } catch (error) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการค้นหาการจอง: ' + error.message };
    }
}

/**
 * Handle search booking by email action
 * @param {Object} params - The request parameters
 * @return {Object} The search result
 */
function handleSearchBookingByEmail(params) {
    try {
        // Get email from parameters
        const email = params.email;
        
        // Validate email
        if (!email) {
            return { success: false, message: 'Missing email address' };
        }
        
        // Get the spreadsheet and the bookings sheet
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let bookingsSheet = ss.getSheetByName('booking');
        
        if (!bookingsSheet) {
            return { success: false, message: 'Bookings sheet not found' };
        }
        
        // Get all bookings
        const dataRange = bookingsSheet.getDataRange();
        const bookingsData = dataRange.getValues();
        
        // Find all bookings with the matching email
        const matchingBookings = [];
        // Skip header row (i=1)
        for (let i = 1; i < bookingsData.length; i++) {
            // Assuming email is in column D (index 3)
            if (bookingsData[i][3] && bookingsData[i][3].toLowerCase() === email.toLowerCase()) {
                const booking = {
                    bookingId: bookingsData[i][0] || '',
                    createdAt: bookingsData[i][1] || '',
                    name: bookingsData[i][2] || '',
                    email: bookingsData[i][3] || '',
                    phone: bookingsData[i][4] || '',
                    checkInDate: bookingsData[i][5] || '',
                    checkOutDate: bookingsData[i][6] || '',
                    adults: bookingsData[i][7] || 0,
                    children: bookingsData[i][8] || 0,
                    specialRequests: bookingsData[i][9] || '',
                    stay: bookingsData[i][10] || 0,
                    roomQuantity: bookingsData[i][11] || 1,
                    status: bookingsData[i][12] || '',
                    roomType: 'Standard', // Default room type
                    pricePerNight: 1200,    // Default price
                    // Extract first and last name from full name
                    firstName: (bookingsData[i][2] || '').split(' ')[0] || '',
                    lastName: (bookingsData[i][2] || '').split(' ').slice(1).join(' ') || ''
                };
                
                matchingBookings.push(booking);
            }
        }
        
        // If no bookings found
        if (matchingBookings.length === 0) {
            return { 
                success: false, 
                message: 'No bookings found for this email address' 
            };
        }
        
        // Sort bookings by check-in date (newest first)
        matchingBookings.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));
        
        return {
            success: true,
            data: matchingBookings
        };
    } catch (error) {
        return { 
            success: false, 
            message: 'Error searching bookings: ' + error.message 
        };
    }
}

/**
 * Handle cancel booking action
 * @param {Object} params - The request parameters
 * @return {Object} The cancellation result
 */
function handleCancelBooking(params) {
    let lock = LockService.getScriptLock();
    if(!lock.tryLock(30000)) {
        return { 
            success: false, 
            message: 'ไม่สามารถยกเลิกได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' 
        };
    }
    
    try {
        // Get booking ID
        const bookingId = params.bookingId;
        
        // Validate booking ID
        if (!bookingId) {
            lock.releaseLock();
            return { success: false, message: 'กรุณาระบุหมายเลขการจอง' };
        }
        
        // Get the spreadsheet and the bookings sheet
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let bookingsSheet = ss.getSheetByName('booking');
        
        if (!bookingsSheet) {
            lock.releaseLock();
            return { success: false, message: 'ไม่พบข้อมูลการจอง' };
        }
        
        // Find the booking
        const dataRange = bookingsSheet.getDataRange();
        const bookingsData = dataRange.getValues();
        let bookingRow = -1;
        
        for (let i = 1; i < bookingsData.length; i++) {
            if (bookingsData[i][0] === bookingId) {
                bookingRow = i + 1; // +1 because sheet rows are 1-indexed
                break;
            }
        }
        
        // If booking not found
        if (bookingRow === -1) {
            lock.releaseLock();
            return { success: false, message: 'ไม่พบข้อมูลการจอง' };
        }
        
        
        // Update booking status to 'cancelled'
        bookingsSheet.getRange(bookingRow, 13).setValue('Cancelled'); // Adjust column index based on your sheet structure
        
        lock.releaseLock();
        return { 
            success: true, 
            message: 'ยกเลิกการจองเรียบร้อยแล้ว' 
        };
        
    } catch (error) {
        lock.releaseLock();
        return { 
            success: false, 
            message: 'เกิดข้อผิดพลาดในการยกเลิกการจอง: ' + error.message 
        };
    }
}
