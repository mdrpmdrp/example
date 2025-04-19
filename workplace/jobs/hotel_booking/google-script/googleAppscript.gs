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
    } else {
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
        let checkInDate = params?.checkInDate || '2025-04-20'
        let checkOutDate = params?.checkOutDate || '2025-04-25'
        let roomQuantity = params?.roomQuantity || 1;

        // Validate dates
        if (!checkInDate || !checkOutDate) {
            return { success: false, message: 'วันที่ไม่ถูกต้อง กรุณากรอกวันที่ให้ถูกต้อง' };
        }

        // Validate date range
        if (new Date(checkInDate) > new Date(checkOutDate)) {
            return { success: false, message: 'วันที่เช็คอินต้องน้อยกว่าหรือเท่ากับวันที่เช็คเอาท์' };
        }

        // Calculate number of nights
        let daysDiff = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 0) {
            return { success: false, message: 'กรุณาเลือกวันที่เช็คอินและเช็คเอาท์ที่ถูกต้อง' };
        }


        let room_detail_sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Room Detail')
        let room_detail_data = room_detail_sheet.getRange(2, 1, 1, 2).getValues()[0];
        let room_rate = room_detail_sheet.getRange(2, 4, room_detail_sheet.getLastRow(), 6).getDisplayValues().filter(row => row[0] != '');

        let checkIn_date = new Date(checkInDate);
        let checkOut_date = new Date(checkOutDate);
        let dates_array = []
        while (checkIn_date < checkOut_date) {
            let index = room_rate.findIndex((item) => {
                return item[0] == checkInDate
            });
            if (index != -1) {
                dates_array.push(room_rate[index]);
            }
            checkIn_date.setDate(checkIn_date.getDate() + 1);
            checkInDate = Utilities.formatDate(checkIn_date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }

        if (dates_array.length == 0) {
            return { success: false, message: 'ไม่พบห้องว่างในช่วงวันที่เลือก กรุณาเลือกวันที่อื่น' };
        }
        if (dates_array.some((item) => item[3] == 'CLOSED')) {
            let closed_date = dates_array.filter((item) => item[3] == 'CLOSED').map((item) => item[0]);
            return { success: false, message: 'ห้องพักไม่ว่างในช่วงวันที่ ' + closed_date.join(', ') + ' กรุณาเลือกวันที่อื่น' };
        }

        // Check availability in the spreadsheet
        let available_data = getAvailableRooms(roomQuantity, dates_array);
        if (available_data.available <= 0) {
            return { success: false, message: 'ไม่พบห้องว่างในช่วงวันที่เลือก กรุณาเลือกวันที่อื่น' };
        }

        return {
            success: true,
            availableRooms: available_data.available,
            roomType: room_detail_data[0],
            roomDescription: room_detail_data[1],
            roomPrice: available_data.roomRate,
        };
    } catch (error) {
        return { success: false, message: 'เกิดข้อผิดพลาดในการตรวจสอบความพร้อมใช้งาน: ' + error.message };
    }
}

/**
 * Get the number of available rooms for the given date range
 * @param {number} roomQuantity - Number of rooms requested
 * @param {Array} dates_array - Array of room availability data
 * @return {number} Number of available rooms
 */
function getAvailableRooms(roomQuantity = 0, dates_array = []) {
    dates_array = dates_array
        .map((item) => {
            return {
                date: item[0],
                available: item[1],
                rate: item[2],
                status: item[3],
                booked: item[4],
                remain: item[5]
            }
        })
        .filter((item) => {
            return item.status == 'OPEN' && item.remain > 0;
        })
        .sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
    if (dates_array.length == 0) {
        return {
            available: 0,
            roomRate: 0
        }
    }

    let available_data = {}
    available_data['available'] = dates_array.length <= 0 ? 0 : Math.min(...dates_array.map((item) => item.remain));
    available_data['available'] = available_data.available < roomQuantity ? 0 : available_data.available;
    available_data['roomRate'] = parseFloat(dates_array[0].rate);

    return available_data;
    // const ss = SpreadsheetApp.getActiveSpreadsheet();
    // const bookingsSheet = ss.getSheetByName('Summary Booking');
    // let max_reamin = ss.getSheetByName('Room Detail').getRange('B2').getValue();

    // // Get all bookings
    // const dataRange = bookingsSheet.getDataRange();
    // const summaryBooking = dataRange.getValues().slice(1).filter(row => row[0] != '').map(row => {
    //     return {
    //         date: row[0],
    //         booked: row[1],
    //         remain: row[2]
    //     }
    // }).sort((a, b) => new Date(a.date) - new Date(b.date));
    // if (summaryBooking.length == 0) {
    //     return max_reamin;
    // }
    // let start_range = summaryBooking[0].date;
    // let end_range = summaryBooking[summaryBooking.length - 1].date;
    // let checkIn_date = new Date(checkIn);
    // let checkOut_date = new Date(checkOut);
    // let start_range_date = new Date(start_range);
    // let end_range_date = new Date(end_range);
    // if (checkIn_date < start_range_date) start_range_date = checkIn_date;
    // if (checkOut_date > end_range_date) end_range_date = checkOut_date;
    // let diff = Math.ceil((end_range_date - start_range_date) / (1000 * 60 * 60 * 24));
    // let newDate = start_range_date
    // for (let i = 0; i < diff; i++) {
    //     newDate.setDate(newDate.getDate() + 1);
    //     let date = Utilities.formatDate(newDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    //     let index = summaryBooking.findIndex(booking => booking.date == date);
    //     if (index == -1) {
    //         summaryBooking.push({
    //             date: date,
    //             booked: 0,
    //             remain: max_reamin
    //         });
    //     }

    // }
    // summaryBooking.sort((a, b) => new Date(a.date) - new Date(b.date));
    // const bookings = summaryBooking.filter(booking => {
    //     const bookingDate = new Date(booking.date);
    //     return bookingDate >= new Date(checkIn) && bookingDate <= new Date(checkOut);
    // });

    // let availableRooms = Math.min(...bookings.map(booking => booking.remain));
    // // Check if the requested number of rooms is available
    // if (availableRooms < roomQuantity) {
    //     return 0; // Not enough rooms available
    // }


    // return availableRooms;
}

/**
 * Handle the create booking action - to be implemented
 * @param {Object} params - The request parameters
 * @return {Object} The booking result
 */
function handleCreateBooking(params) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
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
        let room_detail = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Room Detail').getRange(2, 1, 1, 4).getValues()[0];

        // Create booking object
        const booking = {
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
            roomQuantity: params.roomQuantity || 1,
            roomType: room_detail[0],
            roomPrice: room_detail[2],
            room_detail: room_detail[3],
            check_endpoint: params['check-booking-endpoint']
        };

        // Save booking to spreadsheet
        saveBooking(booking);

        // Send confirmation email
        sendBookingConfirmationEmail(booking);

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
 * @return {string} The generated booking ID
 */
function generateBookingId() {
    return 'BOOK-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
}

/**
 * Save booking to spreadsheet
 * @param {Object} booking - The booking details
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

/**
 * Verify reCAPTCHA response
 * @param {Object} params - The request parameters
 * @return {Object} The verification result
 */
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
        let room_detail = ss.getSheetByName('Room Detail').getRange(2, 1, 1, 4).getValues()[0];

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
                    roomType: room_detail[0] || '',
                    pricePerNight: room_detail[2] || 0,
                    room_detail: room_detail[3] || '',
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
    if (!lock.tryLock(30000)) {
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

        // Send cancellation email
        const booking = {
            bookingId: bookingsData[bookingRow - 1][0],
            name: bookingsData[bookingRow - 1][2],
            email: bookingsData[bookingRow - 1][3],
            phone: bookingsData[bookingRow - 1][4],
            checkInDate: bookingsData[bookingRow - 1][5],
            checkOutDate: bookingsData[bookingRow - 1][6],
            adults: bookingsData[bookingRow - 1][7],
            children: bookingsData[bookingRow - 1][8],
            specialRequests: bookingsData[bookingRow - 1][9],
            stay: bookingsData[bookingRow - 1][10],
            roomQuantity: bookingsData[bookingRow - 1][11],
            status: 'Cancelled',
        };
        sendCancelBookingEmail(booking);
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

/**
 * Send booking confirmation email
 * @param {Object} booking - The booking details
 */
function sendBookingConfirmationEmail(booking) {
    // check available email quota
    const emailQuota = MailApp.getRemainingDailyQuota();
    if (emailQuota <= 0) {
        Logger.log('Daily email quota exceeded. Cannot send confirmation email.');
        return;
    }
    const checkInDate = new Date(booking.checkInDate);
    const checkOutDate = new Date(booking.checkOutDate);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const roomTotalPrice = nights * booking.roomPrice * booking.roomQuantity;

    const subject = `🏨 Booking Confirmation - ${booking.bookingId}`;

    // Create HTML email body with professional formatting
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ยืนยันได้รับข้อมูลการจอง</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                max-width: 600px;
                margin: 0 auto;
            }
            .email-container {
                border: 1px solid #e9e2d0;
                border-radius: 10px;
                overflow: hidden;
            }
            .email-header {
                background-color: #8e784f;
                background-image: linear-gradient(45deg, #8e784f, #70603e);
                color: white;
                padding: 20px;
                text-align: center;
            }
            .email-header h1 {
                margin: 0;
                color: white;
                font-size: 24px;
            }
            .email-body {
                padding: 20px;
                background-color: #ffffff;
            }
            .booking-details {
                background-color: #f5f1ea;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                border-bottom: 1px solid #e9e2d0;
                padding-bottom: 10px;
            }
            .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .price-row {
                font-weight: bold;
                color: #8e784f;
            }
            .total-price {
                font-size: 18px;
                color: #cc6b5a;
            }
            .email-footer {
                background-color: #f5f1ea;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .button {
                background-color: #8e784f;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin-top: 20px;
                font-weight: bold;
            }
            .special-requests {
                background-color: #f9f9f9;
                border-left: 3px solid #8e784f;
                padding: 10px 15px;
                margin: 15px 0;
                font-style: italic;
            }
            .thank-you {
                text-align: center;
                margin: 20px 0;
                color: #8e784f;
                font-weight: bold;
                font-size: 16px;
            }
            .booking-id {
                font-family: monospace;
                background-color: #f5f1ea;
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h1>ยืนยันการจอง</h1>
                <p>ขอบคุณที่เลือกใช้บริการโรงแรมของเรา</p>
            </div>
            <div class="email-body">
                <p>เรียน คุณ${booking.firstName} ${booking.lastName},</p>
                
                <p>ขอบคุณสำหรับการจองกับเรา เรายินดีที่จะต้อนรับคุณสู่โรงแรมของเรา กรุณาตรวจสอบรายละเอียดการจองด้านล่าง:</p>
                
                <div class="booking-details">
                    <div class="detail-row">
                        <strong>หมายเลขการจอง:  </strong>&nbsp;&nbsp;&nbsp;
                        <span class="booking-id">${booking.bookingId}</span>
                    </div>
                    <div class="detail-row">
                        <strong>วันเช็คอิน:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>${Utilities.formatDate(checkInDate, Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div class="detail-row">
                        <strong>วันเช็คเอาท์:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>${Utilities.formatDate(checkOutDate, Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy")}</span>
                    </div>
                    <div class="detail-row">
                        <strong>ระยะเวลาพักอาศัย:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>${nights} คืน</span>
                    </div>
                    <div class="detail-row">
                        <strong>จำนวนห้องพัก:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>${booking.roomQuantity} ห้องมาตรฐาน</span>
                    </div>
                    <div class="detail-row">
                        <strong>ผู้เข้าพัก:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>ผู้ใหญ่ ${booking.adults} ท่าน${booking.children > 0 ? ', เด็ก ' + booking.children + ' ท่าน' : ''}</span>
                    </div>
                    <div class="detail-row price-row">
                        <strong>ราคาต่อคืน:  </strong>&nbsp;&nbsp;&nbsp;
                        <span>฿${booking.roomPrice.toLocaleString()}</span>
                    </div>
                    <div class="detail-row price-row">
                        <strong>ราคารวมทั้งหมด:  </strong>&nbsp;&nbsp;&nbsp;
                        <span class="total-price">฿${roomTotalPrice.toLocaleString()}</span>
                    </div>
                </div>
                
                ${booking.specialRequests ? `
                <p><strong>ความต้องการพิเศษ:  </strong></p>
                <div class="special-requests">${booking.specialRequests}</div>
                ` : ''}
                
                <p>หากคุณต้องการเปลี่ยนแปลงการจองหรือมีคำถามใดๆ กรุณาติดต่อแผนกต้อนรับของเราพร้อมแจ้งหมายเลขการจอง หรือตรวจสอบสถานะการจองออนไลน์ได้</p>
                
                <div style="text-align: center;">
                    <a href="${booking.check_endpoint}?s=${encodeURIComponent(booking.email)
        }" class="button">ตรวจสอบการจองของคุณ</a>
                </div>
                
                <p class="thank-you">เราหวังว่าจะได้ต้อนรับคุณเร็วๆ นี้!</p>
            </div>
            <div class="email-footer">
                <p>นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
                <p>© 2025 บริการจองโรงแรม สงวนลิขสิทธิ์</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Create plain text version as fallback
    const plainBody = `
เรียน คุณ${booking.firstName} ${booking.lastName},

ขอบคุณสำหรับการจองกับเรา เรายินดีที่จะต้อนรับคุณสู่โรงแรมของเรา กรุณาตรวจสอบรายละเอียดการจองด้านล่าง:

รายละเอียดการจอง:
---------------
หมายเลขการจอง: ${booking.bookingId}
วันเช็คอิน: ${Utilities.formatDate(checkInDate, Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy")}
วันเช็คเอาท์: ${Utilities.formatDate(checkOutDate, Session.getScriptTimeZone(), "EEEE, MMMM d, yyyy")}
ระยะเวลาพักอาศัย: ${nights} คืน
จำนวนห้องพัก: ${booking.roomQuantity} ห้องมาตรฐาน
ผู้เข้าพัก: ผู้ใหญ่ ${booking.adults} ท่าน${booking.children > 0 ? ', เด็ก ' + booking.children + ' ท่าน' : ''}
ราคาต่อคืน: ฿${booking.roomPrice.toLocaleString()}
ราคารวมทั้งหมด: ฿${roomTotalPrice.toLocaleString()}

${booking.specialRequests ? `ความต้องการพิเศษ: ${booking.specialRequests}\n` : ''}

หากคุณต้องการเปลี่ยนแปลงการจองหรือมีคำถามใดๆ กรุณาติดต่อแผนกต้อนรับของเราพร้อมแจ้งหมายเลขการจอง

ตรวจสอบการจองออนไลน์: ${booking.check_endpoint}?s=${encodeURIComponent(booking.email)}

เราหวังว่าจะได้ต้อนรับคุณเร็วๆ นี้!

นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
© 2025 บริการจองโรงแรม สงวนลิขสิทธิ์
    `;

    // Send email with both HTML and plain text versions
    MailApp.sendEmail({
        to: booking.email,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody
    });
}

/**
 * Send booking cancellation email
 * @param {Object} booking - The booking details
*/
function sendCancelBookingEmail(booking) {
    const subject = `🏨 Booking Cancellation - ${booking.bookingId}`;

    // Create HTML email body with professional formatting
    const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ยืนยันการยกเลิกการจอง</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333333;
                max-width: 600px;
                margin: 0 auto;
            }
            .email-container {
                border: 1px solid #e9e2d0;
                border-radius: 10px;
                overflow: hidden;
            }
            .email-header {
                background-color: #8e784f;
                background-image: linear-gradient(45deg, #8e784f, #70603e);
                color: white;
                padding: 20px;
                text-align: center;
            }
            .email-header h1 {
                margin: 0;
                color: white;
                font-size: 24px;
            }
            .email-body {
                padding: 20px;
                background-color: #ffffff;
            }
            .booking-details {
                background-color: #f5f1ea;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 10px;
                border-bottom: 1px solid #e9e2d0;
                padding-bottom: 10px;
            }
            .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
            }
            .price-row {
                font-weight: bold;
                color: #8e784f;
            }
            .total-price {
                font-size: 18px;
                color: #cc6b5a;
            }
            .email-footer {
                background-color: #f5f1ea;
                padding: 15px;
                text-align: center;
                font-size: 12px;
                color: #666;
            }
            .button {
                background-color: #8e784f;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                display: inline-block;
                margin-top: 20px;
                font-weight: bold;
            }
            .special-requests {
                background-color: #f9f9f9;
                border-left: 3px solid #8e784f;
                padding: 10px 15px;
                margin: 15px 0;
                font-style: italic;
            }
            .thank-you {
                text-align: center;
                margin: 20px 0;
                color: #8e784f;
                font-weight: bold;
                font-size: 16px;
            }
            .booking-id {
                font-family: monospace;
                background-color: #f5f1ea;
                padding: 5px 10px;
                border-radius: 4px;
                font-weight: bold;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="email-header">
                <h1>ยืนยันการยกเลิกการจอง</h1>
                <p>ขอบคุณที่เลือกใช้บริการโรงแรมของเรา</p>
            </div>
            <div class="email-body">
                <p>เรียน คุณ${booking.name},</p>
                
                <p>เราขอแจ้งให้ทราบว่าการจองของคุณหมายเลข ${booking.bookingId} ได้ถูกยกเลิกเรียบร้อยแล้ว</p>
                
                <p>หากคุณมีคำถามหรือข้อสงสัยเพิ่มเติม กรุณาติดต่อแผนกต้อนรับของเรา</p>
                
                <p class="thank-you">เราหวังว่าจะได้ต้อนรับคุณในโอกาสหน้า!</p>
            </div>
            <div class="email-footer">
                <p>นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้</p>
                <p>© 2025 บริการจองโรงแรม สงวนลิขสิทธิ์</p>
            </div>
        </div>
    </body>
    </html>
    `;
    // Create plain text version as fallback
    const plainBody = `
เรียน คุณ${booking.name},
เราขอแจ้งให้ทราบว่าการจองของคุณหมายเลข ${booking.bookingId} ได้ถูกยกเลิกเรียบร้อยแล้ว
หากคุณมีคำถามหรือข้อสงสัยเพิ่มเติม กรุณาติดต่อแผนกต้อนรับของเรา
เราหวังว่าจะได้ต้อนรับคุณในโอกาสหน้า!
นี่คืออีเมลอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้
© 2025 บริการจองโรงแรม สงวนลิขสิทธิ์
    `;

    // Send email with both HTML and plain text versions
    MailApp.sendEmail({
        to: booking.email,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody
    });
}