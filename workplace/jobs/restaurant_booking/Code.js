const timesIndex = {
  '13:00': { start: 4, count: 10 }, // Column D to M
  '17:00': { start: 15, count: 10 }, // Column O to X
  '18:00': { start: 26, count: 8 }, // Column Z to AG
  '19:30': { start: 35, count: 10 } // Column AI to AR
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
  // data = {
  //   "date": "2026-05-26",
  //   "time": "13:00",
  //   "guests": 18,
  //   "location": "thirdFloor",
  //   "title": "นาย",
  //   "fname": "test",
  //   "lname": "fwefsdfw",
  //   "phone": "8978987978",
  //   "email": "mdrpdeveloper@gmail.com",
  //   "menuImage": "https://lh3.googleusercontent.com/d/1y5mYt64Wt7IR8lpy17b3TNny549t7INi"
  // }
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

  if (!timesIndex[time]) {
    return { success: false, message: 'รอบเวลานี้ไม่ถูกต้อง', messageEn: 'Invalid time slot.' };
  }

  const row = finder.getRow();
  const startCol = timesIndex[time].start;
  const countCol = timesIndex[time].count;
  const currentBookingStatus = sheet.getRange(row, startCol, 1, countCol).getValues()[0];
  const header = sheet.getRange(2, startCol, 1, countCol).getValues()[0];
  const toColumnLetter = (colNumber) => {
    let temp = colNumber;
    let letter = '';
    while (temp > 0) {
      const mod = (temp - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      temp = Math.floor((temp - mod) / 26);
    }
    return letter;
  };

  const normalizedLocationMap = {
    firstFloor: 'ชั้น 1',
    secondFloor: 'ชั้น 2',
    thirdFloor: 'ชั้น 3',
    downstairs: 'ชั้นล่าง',
    upstairs: 'ชั้นบน',
    'ชั้น 1': 'ชั้น 1',
    'ชั้น 2': 'ชั้น 2',
    'ชั้น 3': 'ชั้น 3',
    'ชั้นล่าง': 'ชั้นล่าง',
    'ชั้นบน': 'ชั้นบน'
  };

  const targetLocation = normalizedLocationMap[location] || location;
  const targetGuests = Number(guests);

  const tables = header.map((h, index) => {
    const raw = String(h || '').trim();
    const parts = raw.split('(');
    const seatText = (parts[0] || '').trim();
    const locText = ((parts[1] || '').replace(')', '')).trim();
    const seatRange = seatText.includes('-') ? seatText.split('-').map(Number) : [Number(seatText), Number(seatText)];
    const min = seatRange[0];
    const max = seatRange[1];
    return {
      index,
      min,
      max,
      location: locText,
      isAvailable: currentBookingStatus[index] === 'ว่าง'
    };
  });

  const canSeat = (table, seats) => table.min <= seats && table.max >= seats;
  const getAvailableBy = (loc, predicate) => tables.filter(t => t.isAvailable && t.location === loc && predicate(t));

  const selectedTableIndexes = [];
  const pick = (table) => {
    if (!table) return false;
    if (selectedTableIndexes.includes(table.index)) return false;
    selectedTableIndexes.push(table.index);
    return true;
  };

  if (time === '18:00') {
    if (targetLocation === 'ชั้นล่าง') {
      const exact4 = getAvailableBy('ชั้นล่าง', t => canSeat(t, 4));
      const exact6 = getAvailableBy('ชั้นล่าง', t => canSeat(t, 6));
      if (targetGuests === 4) pick(exact4[0]);
      if (targetGuests === 6) pick(exact6[0]);
      if (targetGuests === 10) {
        if (exact6.length > 0 && exact4.length > 0) {
          selectedTableIndexes.length = 0;
          pick(exact4[0]);
          pick(exact6[0]);
        }
      }
    }

    if (targetLocation === 'ชั้นบน') {
      const exact4Up = getAvailableBy('ชั้นบน', t => t.min === 4 && t.max === 4);
      if (targetGuests === 4) {
        pick(exact4Up[0]);
      }
      if (targetGuests === 8 && exact4Up.length >= 2) {
        selectedTableIndexes.length = 0;
        pick(exact4Up[0]);
        pick(exact4Up[1]);
      }
    }
  } else {
    if (targetLocation === 'ชั้น 1') {
      const exact4 = getAvailableBy('ชั้น 1', t => t.min === 4 && t.max === 4);
      const sixToEight = getAvailableBy('ชั้น 1', t => t.min === 6 && t.max === 8);
      const can8 = getAvailableBy('ชั้น 1', t => canSeat(t, 8));
      const can10 = getAvailableBy('ชั้น 1', t => canSeat(t, 10));

      if (targetGuests === 4) pick(exact4[0]);
      if (targetGuests === 6) pick(sixToEight[0]);
      if (targetGuests === 8) {
        if (can8.length > 0) {
          selectedTableIndexes.length = 0;
          pick(can8[0]);
        } else if (exact4.length >= 2) {
          selectedTableIndexes.length = 0;
          pick(exact4[0]);
          pick(exact4[1]);
        } else if (sixToEight.length > 0) {
          selectedTableIndexes.length = 0;
          pick(sixToEight[0]);
        }
      }
      if (targetGuests === 10) {
        if (can10.length > 0) {
          selectedTableIndexes.length = 0;
          pick(can10[0]);
        } else if (sixToEight.length > 0 && exact4.length > 0) {
          selectedTableIndexes.length = 0;
          pick(sixToEight[0]);
          pick(exact4[0]);
        }
      }
      if (targetGuests === 12) {
        if (sixToEight.length > 0 && exact4.length > 0) {
          selectedTableIndexes.length = 0;
          pick(sixToEight[0]);
          pick(exact4[0]);
        }
      }
    }

    if (targetLocation === 'ชั้น 2') {
      const can6 = getAvailableBy('ชั้น 2', t => canSeat(t, 6));
      const can8 = getAvailableBy('ชั้น 2', t => canSeat(t, 8));
      const can10 = getAvailableBy('ชั้น 2', t => canSeat(t, 10));
      if (targetGuests === 6) pick(can6[0]);
      if (targetGuests === 8) pick(can8[0]);
      if (targetGuests === 10) pick(can10[0]);
    }

    if (targetLocation === 'ชั้น 3') {
      const exact4 = getAvailableBy('ชั้น 3', t => t.min === 4 && t.max === 4);
      const sixToEight = getAvailableBy('ชั้น 3', t => t.min === 6 && t.max === 8);
      const allFloor3 = getAvailableBy('ชั้น 3', () => true);
      if (targetGuests === 4) pick(exact4[0]);
      if (targetGuests === 6 || targetGuests === 8) pick(sixToEight[0]);
      if (targetGuests === 18 && allFloor3.length >= 4) {
        allFloor3.forEach(t => pick(t));
      }
    }
  }

  if (selectedTableIndexes.length === 0) {
    Logger.log(
      '[updateSchedule] No table matched | date=%s time=%s location=%s guests=%s row=%s startCol=%s count=%s',
      parsedDate,
      time,
      targetLocation,
      targetGuests,
      row,
      startCol,
      countCol
    );
    return {
      success: false,
      message: `โต๊ะสำหรับ ${targetGuests} คน ${targetLocation} ถูกจองไปแล้ว`,
      messageEn: `The table for ${targetGuests} persons at ${targetLocation} has already been booked.`
    };
  }

  const selectedDebug = selectedTableIndexes
    .slice()
    .sort((a, b) => a - b)
    .map(i => {
      const sheetCol = startCol + i;
      return {
        indexInSlot: i,
        sheetColumnNumber: sheetCol,
        sheetColumnA1: toColumnLetter(sheetCol),
        header: String(header[i] || '').trim()
      };
    });

  Logger.log(
    '[updateSchedule] Reserve columns | date=%s time=%s location=%s guests=%s row=%s details=%s',
    parsedDate,
    time,
    targetLocation,
    targetGuests,
    row,
    JSON.stringify(selectedDebug)
  );

  selectedTableIndexes.forEach(i => {
    currentBookingStatus[i] = 'จองแล้ว';
  });

  // Write the updated values back to the sheet
  sheet.getRange(row, startCol, 1, countCol).setValues([currentBookingStatus]);

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
  switch (data.location) {
    case 'firstFloor':
      data.location = 'ชั้น 1';
      break;
    case 'secondFloor':
      data.location = 'ชั้น 2';
      break;
    case 'thirdFloor':
      data.location = 'ชั้น 3';
      break;
    case 'downstairs':
      data.location = 'ชั้นล่าง';
      break;
    case 'upstairs':
      data.location = 'ชั้นบน';
      break;
  };
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
ชื่อผู้จอง: ${data.title} ${data.fname} ${data.lname}
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

