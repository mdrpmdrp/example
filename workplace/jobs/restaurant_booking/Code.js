const timesIndex = {
  '13:00': { start: 4, count: 10 },
  '17:00': { start: 15, count: 10 },
  '18:00': { start: 26, count: 6 },
  '19:30': { start: 33, count: 10 }
};

function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index');
  html.availableDates = getAvailableDates();
  html.scriptUrl = ScriptApp.getService().getUrl();
  return html.evaluate()
    .setTitle('Sang ท่าเตียน - จองโต๊ะ')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl('https://img2.pic.in.th/pic/_logo-removebg-previewb741755d6ce9d8e5.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

function getAvailableDates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("schedule");
  const [rounds, , ...data] = sheet.getDataRange().getValues().filter(r => r[0] !== '');
  const filteredRounds = rounds.filter(r => r !== '').slice(2);

  const result = {
    available: [],
    closedDays: [],
    fullDays: []
  };

  data.forEach(row => {
    const date = Utilities.formatDate(row[0], 'Asia/Bangkok', 'yyyy-MM-dd');

    if (!row[2] || row[2] === false) {
      result.closedDays.push({ date });
      return;
    }

    const roundsGrouped = [
      row.slice(3, 13),
      row.slice(14, 24),
      row.slice(25, 31),
      row.slice(32, 42)
    ];

    filteredRounds.forEach((round, index) => {
      if (roundsGrouped[index].every(cell => cell !== 'ว่าง')) {
        result.fullDays.push({ date, round });
      } else {
        result.available.push({ date, round });
      }
    });
  });

  return JSON.stringify(result);
}

function include(filename) {
  return HtmlService.createTemplateFromFile(filename)
    .evaluate().getContent();
}

function checkAvailableTableTypes(dateString = "2026-05-26", time = "18:00") {
  const parsedDate = dateString.split('-').reverse().join('/');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Schedule");
  const finder = sheet.createTextFinder(parsedDate).findNext();

  if (!finder) {
    return JSON.stringify([]);
  }

  if (!timesIndex[time]) {
    return JSON.stringify([]);
  }

  const tables = sheet.getRange(finder.getRow(), timesIndex[time].start, 1, timesIndex[time].count).getValues()[0];
  const header = sheet.getRange(2, timesIndex[time].start, 1, timesIndex[time].count).getValues()[0];
  const seats = [];
  const location = [];

  header.forEach(header => {
    const parts = header.split('(');
    seats.push(parts[0].trim());
    location.push(parts[1].replace(')', '').trim());
  });

  const availableTables = [];
  for (let i = 0; i < tables.length; i++) {
    if (tables[i] === 'ว่าง') {
      const [min, max] = seats[i].includes('-') ? seats[i].split('-').map(Number) : [Number(seats[i]), Number(seats[i])];
      availableTables.push({
        guests: { min, max },
        location: location[i]
      });
    }
  }

  return JSON.stringify(availableTables);
}

function submitBooking(data) {
  let lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    throw new Error('Could not acquire lock, please try again later.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Booking");
  let isDuplicated = checkDuplicateBooking(ss, data.phone, data.email);
  if (isDuplicated) {
    lock.releaseLock();
    return JSON.stringify({
      success: false,
      message: 'มีการจองที่ซ้ำกัน กรุณารอเจ้าหน้าที่ติดต่อกลับก่อนทำการจองใหม่',
      messageEn: 'There is a duplicate booking, please wait for the staff to contact you before making a new booking.'
    });
  }
  let reserveData = updateSchedule(data.date, data.time, data.location, data.guests);
  if (!reserveData.success) {
    lock.releaseLock();
    return JSON.stringify(reserveData)
  }
  try {
    const lastRow = sheet.getLastRow() + 1;
    data.bookingId = getBookingId(sheet);
    const bookingData = [
      new Date(),
      data.date.split('-').reverse().join('/'),
      data.time,
      data.guests,
      data.location,
      data.title,
      data.fname,
      data.lname,
      "'" + data.phone,
      data.email,
      data.bookingId,
      "",
      "",
      'Waiting'
    ];

    sheet.getRange(lastRow, 1, 1, bookingData.length).setValues([bookingData]);
    lock.releaseLock();
    // sendTelegramToAdmin(data);
    return JSON.stringify({
      success: true,
      message: 'จองโต๊ะเรียบร้อยแล้ว',
      data
    })
  } catch (e) {
    Logger.log('Error while submitting booking: ' + e.message);
    lock.releaseLock();
  }
}

function checkDuplicateBooking(ss, phone, email) {
  let sheet = ss.getSheetByName("Helper Sheet");
  let data = sheet.getDataRange().getValues();
  return data.some(row => {
    return row[0] == phone || row[1] == email
  });
}

function updateSchedule(date = '2025-07-17', time = '13:00', location = 'downstairs', guests = 10) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Schedule");
  const parsedDate = date.split('-').reverse().join('/');
  const finder = sheet.createTextFinder(parsedDate).findNext();

  if (!finder) {
    return { success: false, message: 'วันที่ท่านเลือกยังไม่เปิดให้จองโต๊ะ', messageEn: 'The selected date is not available for booking.' };
  }

  // Fixed the array syntax and values
  const tablesIndex = [
    [4, 'downstairs'],
    [6, 'downstairs'],
    [6, 'downstairs'],
    [6, 'downstairs'],
    [8, 'upstairs'],
    [10, 'upstairs']
  ];

  if (!timesIndex[time]) {
    return false;
  }

  const row = finder.getRow();
  const currentBookingStatus = sheet.getRange(row, timesIndex[time].start, 1, timesIndex[time].count).getValues()[0];

  if (guests == 10 && location === 'downstairs') {
    if (currentBookingStatus[0] === 'จองแล้ว' || currentBookingStatus.slice(1, 3).every(status => status === 'จองแล้ว')) {
      return {
        success: false,
        message: 'โต๊ะสำหรับ 10 คน ชั้นล่าง ถูกจองไปแล้ว',
        messageEn: 'The table for 10 persons downstairs has already been booked.'
      };
    }
    currentBookingStatus[0] = 'จองแล้ว';
    for (let i = 1; i < currentBookingStatus.length; i++) {
      if (currentBookingStatus[i] === 'ว่าง') {
        currentBookingStatus[i] = 'จองแล้ว';
        break;
      }
    }
  } else {
    let found = false;
    for (let i = 0; i < currentBookingStatus.length; i++) {
      if (currentBookingStatus[i] === 'ว่าง' && tablesIndex[i][0] === guests && tablesIndex[i][1] === location) {
        currentBookingStatus[i] = 'จองแล้ว';
        found = true;
        break;
      }
    }
    if (!found) {
      return {
        success: false,
        message: `โต๊ะสำหรับ ${guests} คน ชั้น ${location === 'downstairs' ? 'ล่าง' : 'บน'} ถูกจองไปแล้ว`,
        messageEn: `The table for ${guests} persons on the ${location === 'downstairs' ? 'downstairs' : 'upstairs'} has already been booked.`
      };
    }
  }

  // Write the updated values back to the sheet
  sheet.getRange(row, timesIndex[time].start, 1, timesIndex[time].count).setValues([currentBookingStatus]);

  return { success: true, message: 'โต๊ะถูกจองเรียบร้อยแล้ว' }
}

function getBookingId(sheet) {
  let charactors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let bookingId = '';
  let length = 8; // Length of the booking ID
  // Check if the booking ID already exists
  let existingIds = sheet.getRange('I2:I' + sheet.getLastRow()).getValues().flat();
  while (bookingId === '' || existingIds.includes(bookingId)) {
    bookingId = '';
    for (let i = 0; i < length; i++) {
      bookingId += charactors.charAt(Math.floor(Math.random() * charactors.length));
    }
  }
  return bookingId;
}

function sendTelegramToAdmin(data) {
  Logger = BetterLog.useSpreadsheet()
  Logger.log('Sending Telegram message to admin with booking data:', data);
  try {
    let token = '8181527371:AAEF68vL9o1TOVz5QGNecAQPw2CrbnzsPlk';
    let chat_id = '-1002468279227';
    let message = `<b>🔔 มีการจองโต๊ะใหม่</b>
<blockquote>
📝 <b>Booking ID</b>: ${data.bookingId}

👉 <b>ชื่อ</b>: ${data.title} ${data.fname} ${data.lname}

📅 <b>วันที่</b>: ${data.date}

<b>เวลา</b>: ${data.time}

<b>จำนวนแขก</b>: ${data.guests}

<b>ตำแหน่ง</b>: ${data.location}

☎️ <b>เบอร์โทร</b>: <a href="tel:${data.phone}">${data.phone}</a>

📧 <b>อีเมล</b>: <a href="mailto:${data.email}">${data.email}</a>
</blockquote>
`;

    let options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        chat_id: chat_id,
        text: message,
        parse_mode: 'HTML'
      })
    }
    let response = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, options);
    let result = JSON.parse(response.getContentText());
    if (!result.ok) {
      throw new Error(result.description);
    }
    return true;
  } catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    throw e;
    return false;
  }
}

function getMenuImage() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu Of The Month').getRange('A1').getValue()
}

function sendEmailToCustomer(data, lang = 'th') {
  Logger = BetterLog.useSpreadsheet();
  Logger.log('Sending email to customer with booking data:', data);
  try {
    const subject = "ยืนยันการจองโต๊ะที่ Sang ท่าเตียน";
    const sender = "Sang ท่าเตียน";
    const plainTextBodyThai = `เรียน คุณ ${data.fname} ${data.lname},

ขอบคุณที่จองโต๊ะกับ Sang ท่าเตียน! เจ้าหน้าที่ของเราจะติดต่อกลับเพื่อยืนยันการจองของคุณ.
กรุณาตรวจสอบอีเมลของคุณเพื่อดูข้อมูลสรุปการจอง.
หากคุณต้องการยืนยันการจอง กรุณาคลิกลิงก์ด้านล่างและส่งรหัสการจองให้เจ้าหน้าที่ทาง LINE:
https://line.me/R/oaMessage/@sangthatien/?${data.bookingId}


ข้อมูลการจองของคุณ:
วันที่: ${data.date}
เวลา: ${data.time}
จำนวนแขก: ${data.guests} คน
ตำแหน่งโต๊ะ: ${data.location}
ชื่อผู้จอง: ${data.name}
เบอร์โทร: ${data.phone}
อีเมล: ${data.email}
  `;
    const plainTextBodyEnglish = `Dear ${data.title} ${data.fname} ${data.lname},
  
  Thank you for booking a table at Sang Thatien! Our staff will contact you to confirm your reservation.
  Please check your  booking summary in this email.
  If you would like to confirm your booking, please click the link below and send your booking via LINE:
  https://line.me/R/oaMessage/@sangthatien/?${data.bookingId}

  Your booking details:
  Date: ${data.date}
  Time: ${data.time}
  Number of Guests: ${data.guests} persons
  Table Location: ${data.location}
  Name: ${data.title} ${data.fname} ${data.lname}
  Phone: ${data.phone}
  Email: ${data.email}
  `;

    const htmlBodyThai = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f9; padding: 32px;">
    <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px;">
      <h2 style="color: #2d3748; margin-top: 0;">ขอบคุณที่จองโต๊ะกับ <span style="color:#e07a5f;">แสง ท่าเตียน</span>!</h2>
      <p style="font-size: 1.1em; color: #444;">
        เรียน คุณ <b> ${data.fname} ${data.lname}</b>,<br><br>
        เจ้าหน้าที่ของเราจะติดต่อกลับเพื่อยืนยันการจองของคุณ.<br>
        กรุณาตรวจสอบอีเมลของคุณเพื่อดูข้อมูลสรุปการจอง.<br><br>
        กรุณาคลิกลิงก์ด้านล่างและส่งรหัสการจองให้เจ้าหน้าที่ทาง LINE:
      </p>
      <p style="margin: 16px 0;">
        <a href="https://line.me/R/oaMessage/@sangthatien/?${data.bookingId}" style="background: #06c755; color: #fff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: bold;">ยืนยันการจองผ่าน LINE</a>
      </p>
      <h3 style="margin-top: 32px; color: #2d3748;">ข้อมูลการจองของคุณ</h3>
      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#888;">วันที่</td><td style="padding:6px 0;">${data.date}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">เวลา</td><td style="padding:6px 0;">${data.time}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">จำนวนแขก</td><td style="padding:6px 0;">${data.guests} คน</td></tr>
        <tr><td style="padding:6px 0; color:#888;">ตำแหน่งโต๊ะ</td><td style="padding:6px 0;">${data.location}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">ชื่อผู้จอง</td><td style="padding:6px 0;">${data.title} ${data.fname} ${data.lname}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">เบอร์โทร</td><td style="padding:6px 0;">${data.phone}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">อีเมล</td><td style="padding:6px 0;">${data.email}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Booking ID</td><td style="padding:6px 0;">${data.bookingId}</td></tr>
      </table>
      <div style="color:#aaa; font-size:0.95em; margin-top:24px;">หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่ของเรา</div>
    </div>
  </div>
  `;

    const htmlBodyEnglish = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f7f7f9; padding: 32px;">
    <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 32px;">
      <h2 style="color: #2d3748; margin-top: 0;">Thank you for booking at <span style="color:#e07a5f;">Sang Thatien</span>!</h2>
      <p style="font-size: 1.1em; color: #444;">
        Dear <b>${data.title} ${data.fname} ${data.lname}</b>,<br><br>
        Our staff will contact you to confirm your reservation.<br>
        Please check your booking summary below.<br><br>
        Please click the link below and send your booking ID via LINE:
      </p>
      <p style="margin: 16px 0;">
        <a href="https://line.me/R/oaMessage/@sangthatien/?${data.bookingId}" style="background: #06c755; color: #fff; padding: 10px 22px; border-radius: 6px; text-decoration: none; font-weight: bold;">Confirm via LINE</a>
      </p>
      <h3 style="margin-top: 32px; color: #2d3748;">Your Booking Details</h3>
      <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
        <tr><td style="padding:6px 0; color:#888;">Date</td><td style="padding:6px 0;">${data.date}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Time</td><td style="padding:6px 0;">${data.time}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Number of Guests</td><td style="padding:6px 0;">${data.guests} persons</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Table Location</td><td style="padding:6px 0;">${data.location}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Name</td><td style="padding:6px 0;">${data.title} ${data.fname} ${data.lname}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Phone</td><td style="padding:6px 0;">${data.phone}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Email</td><td style="padding:6px 0;">${data.email}</td></tr>
        <tr><td style="padding:6px 0; color:#888;">Booking ID</td><td style="padding:6px 0;">${data.bookingId}</td></tr>
      </table>
      <div style="color:#aaa; font-size:0.95em; margin-top:24px;">If you have any questions, please contact our staff.</div>
    </div>
  </div>
  `;

    const htmlBody = lang === 'en' ? htmlBodyEnglish : htmlBodyThai;
    const plainTextBody = lang === 'en' ? plainTextBodyEnglish : plainTextBodyThai;

    GmailApp.sendEmail(data.email, subject, plainTextBody, {
      htmlBody: htmlBody,
      name: sender,
      noReply: true
    })
    return true;
  } catch (e) {
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s"',
      e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
    throw e;
    return false;
  }

}

// ปรับ logic การเลือกโต๊ะ เงื่อนไขดังนี้

// ชั้น1 มี4โต๊ะ
// โต๊ะ 1: 6-8 คน
// โต๊ะ 2: 4 คน
// โต๊ะ 3: 4 คน
// โต๊ะ 4: 6-8 คน
// สามารถรวมโต๊ะเป็น 8 10 12 (ถ้า 6+4 จะสามาถนั่งได้ 12 คน)

// ชั้น2 มี2โต๊ะ
// โต๊ะ 1: 8- 10 คน
// โต๊ะ 2: 6 คน

// ชั้น3 มี4โต๊ะ
// โต๊ะ 1: 6-8 คน
// โต๊ะ 2: 6-8 คน
// โต๊ะ 3: 4 คน
// โต๊ะ 4: 4 คน
// สามารถรวมโต๊ะเป็น 8 10 คนได้