const USER_SHEET_NAME = 'users'
const LEAVE_SHEET_NAME = 'leaves'
const ss = SpreadsheetApp.getActiveSpreadsheet();
const userSheet = ss.getSheetByName(USER_SHEET_NAME) || ss.insertSheet(USER_SHEET_NAME);
const leaveSheet = ss.getSheetByName(LEAVE_SHEET_NAME) || ss.insertSheet(LEAVE_SHEET_NAME);
const driveFolder = DriveApp.getFoldersByName("LeaveDocuments").hasNext()
  ? DriveApp.getFoldersByName("LeaveDocuments").next()
  : DriveApp.createFolder("LeaveDocuments");

// ใช้ Script Properties เพื่อเก็บข้อมูลที่ละเอียดอ่อน
const BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN') || '7665058062:AAGgVh-hPjrMgEejoIX7oWTAjXrEATI1tUw';
const CHAT_ID = PropertiesService.getScriptProperties().getProperty('CHAT_ID') || '-4740976422';

// ส่งข้อความแจ้งเตือนไปยัง Telegram
function sendTelegramMessage(message) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    };
    const options = {
      method: 'POST',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    if (!result.ok) {
      Logger.log('Telegram API error: ' + result.description);
      return false;
    }
    Logger.log('Telegram message sent: ' + message);
    return true;
  } catch (e) {
    Logger.log('Error sending Telegram message: ' + e.message);
    return false;
  }
}

// Helper: Get current timestamp in Thai timezone
function getThaiTimestamp() {
  return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
}

// Generate Random Member ID (ตัวเลขและตัวอักษรผสมกัน)
function generateRandomMemberId(existingIds) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // ตัวอักษรและตัวเลขที่ใช้
  const idLength = 6; // ความยาวของเลขประจำตัว
  let memberId;

  do {
    memberId = '';
    for (let i = 0; i < idLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      memberId += characters[randomIndex];
    }
  } while (existingIds.includes(memberId)); // ตรวจสอบว่าไม่ซ้ำ

  return memberId;
}

// Setup Sheets
function setupSheets() {
  try {
    if (!userSheet.getRange("A1").getValue()) {
      userSheet.getRange("A1:G1").setValues([["ชื่อผู้ใช้งาน", "รหัสผ่าน", "บทบาท", "เลขประจำตัว", "ชื่อ-นามสกุล", "เบอร์โทร", "วันที่สร้าง"]]);
      userSheet.appendRow(["admin", "admin123", "Admin", "", "", "", getThaiTimestamp()]);
    }
    if (!leaveSheet.getRange("A1").getValue()) {
      leaveSheet.getRange("A1:M1").setValues([
        ["เลขประจำตัว", "ชื่อ-นามสกุล", "ประเภทการลา", "วันเวลาเริ่ม", "วันเวลาสิ้นสุด",
          "จำนวนวัน", "จำนวนชั่วโมง", "จำนวนนาที", "เอกสารแนบ", "วันที่บันทึก", "สถานะ", "เหตุผล", "เหตุผล (Admin)"]
      ]);
    }
    Logger.log("Sheets initialized: users = " + userSheet.getName() + ", leaves = " + leaveSheet.getName());
  } catch (e) {
    Logger.log("Error in setupSheets: " + e.message);
    throw new Error("ไม่สามารถตั้งค่า Sheets ได้: " + e.message);
  }
}

// Entry Point
function doGet(e) {
  try {
    setupSheets();
    Logger.log("Loading index.html template");
    const template = HtmlService.createTemplateFromFile("index");
    template.baseUrl = ScriptApp.getService().getUrl();
    Logger.log("Rendering page: index.html, baseUrl: " + template.baseUrl);
    return template.evaluate()
      .setTitle("ระบบจัดการการลา")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    Logger.log("Error in doGet: " + e.message);
    return HtmlService.createHtmlOutput(`<h3>เกิดข้อผิดพลาด: ${e.message}</h3>`);
  }
}

// Authenticate User
function authenticateUser(username, password) {
  try {
    const users = userSheet.getDataRange().getValues().slice(1);
    const user = users.find(row => row[0] === username && row[1] === password);
    if (!user) throw new Error("ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง!");
    if (user[6] !== "Active") throw new Error("บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน!");
    Logger.log("User authenticated: " + username + ", Role: " + user[2] + ", MemberId: " + user[3]);
    return {
      username: user[0],
      role: user[2],
      memberId: user[3],
      name: user[4],
      phone: user[5],
      status: user[6]
    };
  } catch (e) {
    Logger.log("Error in authenticateUser: " + e.message);
    throw new Error(e.message);
  }
}

// Add User
function addUser(data, currentUserRole) {
  let lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("Could not obtain lock");
    throw new Error("ระบบกำลังมีผู้ใช้งานจำนวนมาก กรุณาลองใหม่อีกครั้งในภายหลัง");
  }
  try {
    if (currentUserRole !== "Admin") throw new Error("เฉพาะ Admin เท่านั้นที่สามารถเพิ่มผู้ใช้งานได้!");
    if (!data.username || !data.password || !data.role || !data.phone) {
      lock.releaseLock();
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน!");
    }
    const users = userSheet.getDataRange().getValues().slice(1);
    if (users.some(row => row[0] === data.username)) {
      lock.releaseLock();
      throw new Error("ชื่อผู้ใช้งานซ้ำ!");
    }
    let memberId = "";
    if (data.role === "User") {
      if (!data.name) throw new Error("กรุณากรอกชื่อ-นามสกุลสำหรับผู้ใช้งาน!");
      const existingIds = users.map(row => row[3]).filter(id => id);
      memberId = generateRandomMemberId(existingIds);
    }
    userSheet.appendRow([
      data.username.trim(),
      data.password.trim(),
      data.role,
      memberId,
      data.name ? data.name.trim() : "",
      data.phone.trim(),
      "Active",
      getThaiTimestamp()
    ]);

    // ส่งแจ้งเตือนไปยัง Telegram
    const message = `<b>👤 ผู้ใช้งานใหม่</b>\n` +
      `<b>ชื่อผู้ใช้งาน:</b> ${data.username}\n` +
      `<b>บทบาท:</b> ${data.role}\n` +
      `<b>เลขประจำตัว:</b> ${memberId || '-'}\n` +
      `<b>ชื่อ-นามสกุล:</b> ${data.name || '-'}\n` +
      `<b>เบอร์โทร:</b> ${data.phone}`;
    sendTelegramMessage(message);

    Logger.log("User added: " + data.username + ", MemberId: " + memberId);
    lock.releaseLock();
    return "เพิ่มผู้ใช้งานสำเร็จ!";
  } catch (e) {
    Logger.log("Error in addUser: " + e.message);
    lock.releaseLock();
    throw new Error(e.message);
  }
}

// Update User
function updateUser(data, role) {
  try {
    if (role !== 'Admin') throw new Error('เฉพาะ Admin เท่านั้นที่สามารถแก้ไขผู้ใช้งานได้!');
    if (!data.username || !data.password || !data.role || !data.phone) {
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน!");
    }
    const users = userSheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < users.length; i++) {
      if (users[i][0] === data.username) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) throw new Error('ไม่พบผู้ใช้งานนี้!');
    let memberId = users[rowIndex - 1][3];
    if (data.role === "User" && !memberId) {
      if (!data.name) throw new Error("กรุณากรอกชื่อ-นามสกุลสำหรับผู้ใช้งาน!");
      const existingIds = users.map(row => row[3]).filter(id => id);
      memberId = generateRandomMemberId(existingIds);
    } else if (data.role === "Admin") {
      memberId = "";
      data.name = "";
    }
    userSheet.getRange(rowIndex, 1, 1, 7).setValues([[
      data.username,
      data.password.trim(),
      data.role,
      memberId,
      data.name ? data.name.trim() : "",
      data.phone.trim(),
      data.status || "Active",
      getThaiTimestamp()
    ]]);

    // ส่งแจ้งเตือนไปยัง Telegram
    const message = `<b>🔄 อัปเดตผู้ใช้งาน</b>\n` +
      `<b>ชื่อผู้ใช้งาน:</b> ${data.username}\n` +
      `<b>บทบาท:</b> ${data.role}\n` +
      `<b>เลขประจำตัว:</b> ${memberId || '-'}\n` +
      `<b>ชื่อ-นามสกุล:</b> ${data.name || '-'}\n` +
      `<b>เบอร์โทร:</b> ${data.phone}` +
      `\n<b>สถานะ:</b> ${data.active}`;
    sendTelegramMessage(message);

    Logger.log("User updated: " + data.username + ", MemberId: " + memberId);
    return 'แก้ไขผู้ใช้งานสำเร็จ!';
  } catch (e) {
    Logger.log("Error in updateUser: " + e.message);
    throw new Error(e.message);
  }
}

// Delete User
function deleteUser(username, currentUserRole) {
  try {
    if (currentUserRole !== "Admin") throw new Error("เฉพาะ Admin เท่านั้นที่สามารถลบผู้ใช้งานได้!");
    const users = userSheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
      if (users[i][0] === username) {
        userSheet.deleteRow(i + 1);

        // ส่งแจ้งเตือนไปยัง Telegram
        const message = `<b>🗑️ ลบผู้ใช้งาน</b>\n` +
          `<b>ชื่อผู้ใช้งาน:</b> ${username}`;
        sendTelegramMessage(message);

        Logger.log("User deleted: " + username);
        return "ลบผู้ใช้งานสำเร็จ!";
      }
    }
    throw new Error("ไม่พบชื่อผู้ใช้งาน!");
  } catch (e) {
    Logger.log("Error in deleteUser: " + e.message);
    throw new Error(e.message);
  }
}

// Toggle User Status
function toggleUserStatus(username, status, currentUserRole) {
  try {
    if (currentUserRole !== "Admin") throw new Error("เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนสถานะผู้ใช้งานได้!");
    const users = userSheet.getDataRange().getValues();
    for (let i = 1; i < users.length; i++) {
      if (users[i][0] === username) {
        userSheet.getRange(i + 1, 7).setValue(status);

        // ส่งแจ้งเตือนไปยัง Telegram
        const message = `<b>🔄 เปลี่ยนสถานะผู้ใช้งาน</b>\n` +
          `<b>ชื่อผู้ใช้งาน:</b> ${username}\n` +
          `<b>สถานะใหม่:</b> ${status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}`;
        sendTelegramMessage(message);

        Logger.log("User status toggled: " + username + " -> " + status);
        return `เปลี่ยนสถานะผู้ใช้งาน ${username} เป็น ${status === 'Active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'} สำเร็จ!`;
      }
    }
    throw new Error("ไม่พบชื่อผู้ใช้งาน!");
  } catch (e) {
    Logger.log("Error in toggleUserStatus: " + e.message);
    throw new Error(e.message);
  }
}

// Get Users
function getUsers(currentUserRole) {
  try {
    if (currentUserRole !== "Admin") throw new Error("เฉพาะ Admin เท่านั้นที่สามารถดูข้อมูลผู้ใช้งานได้!");
    const users = userSheet.getDataRange().getValues().slice(1);
    Logger.log("Retrieved " + users.length + " users.");
    return users.map(row => [
      row[0], // username
      row[1], // password
      row[2], // role
      row[3] || '', // memberId
      row[4] || '', // name
      row[5] || '', // phone
      row[6] || ''  // active
    ]);
  } catch (e) {
    Logger.log("Error in getUsers: " + e.message);
    throw new Error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้: " + e.message);
  }
}

// Save Leave
function saveLeave(data, fileData) {
  try {
    if (!data.memberId || !data.leaveType || !data.startDateTime || !data.endDateTime) {
      throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน!");
    }
    const users = userSheet.getDataRange().getValues().slice(1);
    const user = users.find(row => row[3] === data.memberId);
    if (!user) {
      Logger.log("Invalid memberId: " + data.memberId + ", Available IDs: " + JSON.stringify(users.map(row => row[3]).filter(id => id)));
      throw new Error("เลขประจำตัวไม่ถูกต้อง!");
    }
    if (user[6] !== "Active") {
      throw new Error("บัญชีผู้ใช้งานนี้ถูกระงับการใช้งาน!");
    }
    const memberName = user[4];
    if (!memberName) {
      Logger.log("Missing name for memberId: " + data.memberId);
      throw new Error("ไม่พบชื่อ-นามสกุลสำหรับเลขประจำตัวนี้!");
    }
    let fileUrl = "";
    if (fileData && fileData.data && fileData.name && fileData.mimeType) {
      Logger.log("Uploading file: " + fileData.name);
      const fileName = `${data.memberId}_${data.startDateTime.replace(/[: ]/g, "")}_${data.leaveType}`;
      const fileBlob = Utilities.newBlob(
        Utilities.base64Decode(fileData.data),
        fileData.mimeType,
        fileName
      );
      const uploadedFile = driveFolder.createFile(fileBlob);
      fileUrl = uploadedFile.getUrl();
      uploadedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      Logger.log("File uploaded successfully. URL: " + fileUrl);
    }
    const start = new Date(data.startDateTime);
    const end = new Date(data.endDateTime);
    if (end <= start) throw new Error("วันเวลาสิ้นสุดต้องมากกว่าวันเวลาเริ่ม!");
    const diffMs = end - start;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm");
    leaveSheet.appendRow([
      data.memberId,
      memberName,
      data.leaveType,
      data.startDateTime,
      data.endDateTime,
      days,
      hours,
      minutes,
      fileUrl,
      timestamp,
      "รอพิจารณา",
      data.reason || "",
      ""
    ]);

    // ส่งแจ้งเตือนไปยัง Telegram
    const message = `<b>📋 การลาใหม่</b>\n` +
      `<b>เลขประจำตัว:</b> ${data.memberId}\n` +
      `<b>ชื่อ:</b> ${memberName}\n` +
      `<b>ประเภท:</b> ${data.leaveType}\n` +
      `<b>เริ่ม:</b> ${Utilities.formatDate(start, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}\n` +
      `<b>สิ้นสุด:</b> ${Utilities.formatDate(end, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}\n` +
      `<b>ระยะเวลา:</b> ${days} วัน ${hours} ชม. ${minutes} นาที\n` +
      `<b>เหตุผล:</b> ${data.reason || '-'}\n` +
      `<b>เอกสาร:</b> ${fileUrl ? `<a href="${fileUrl}">ดูเอกสาร</a>` : '-'}\n` +
      `<b>สถานะ:</b> รอพิจารณา`;
    sendTelegramMessage(message);

    Logger.log("Leave saved: memberId: " + data.memberId + ", Type: " + data.leaveType);
    return "บันทึกการลาสำเร็จ!";
  } catch (e) {
    Logger.log("Error in saveLeave: " + e.message);
    throw new Error(e.message);
  }
}

// Get Leaves
function getLeaves(memberId, role) {
  try {
    const data = leaveSheet.getDataRange().getValues();
    const leaves = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] || String(data[i][0]).trim() === '') {
        Logger.log(`Skipping row ${i + 1}: empty memberId`);
        continue;
      }
      const rowMemberId = String(data[i][0] || '').trim();
      const requestDateStr = String(data[i][9] || '').trim();
      let requestDate;
      try {
        requestDate = new Date(requestDateStr);
        if (isNaN(requestDate.getTime())) {
          const parts = requestDateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2}):(\d{2})/);
          if (parts) {
            requestDate = new Date(`${parts[3]}-${parts[2]}-${parts[1]}T${parts[4]}:${parts[5]}:00`);
          } else {
            Logger.log(`Invalid date format at row ${i + 1}: ${requestDateStr}`);
            continue;
          }
        }
      } catch (e) {
        Logger.log(`Error parsing date at row ${i + 1}: ${requestDateStr}, error: ${e}`);
        continue;
      }
      if (role === 'Admin' || rowMemberId === String(memberId)) {
        leaves.push([
          rowMemberId,
          String(data[i][1] || ''),
          String(data[i][2] || ''),
          String(data[i][3] || ''),
          String(data[i][4] || ''),
          Number(data[i][5] || 0),
          Number(data[i][6] || 0),
          Number(data[i][7] || 0),
          String(data[i][8] || ''),
          String(data[i][9] || ''),
          String(data[i][10] || 'รอพิจารณา'),
          String(data[i][11] || ''),
          String(data[i][12] || '')
        ]);
      }
    }
    Logger.log('getLeaves: processed ' + (data.length - 1) + ' rows, returned ' + leaves.length + ' leaves');
    return leaves.length > 0 ? leaves : [];
  } catch (e) {
    Logger.log("Error in getLeaves: " + e.message);
    throw new Error("ไม่สามารถดึงข้อมูลการลาได้: " + e.message);
  }
}

// Get Leave Calendar Events
// Get Leave Calendar Events
function getLeaveCalendarEvents(memberId, role) {
  try {
    const data = leaveSheet.getDataRange().getValues();
    const events = [];
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0] || String(data[i][0]).trim() === '') {
        Logger.log(`Skipping row ${i + 1}: empty memberId`);
        continue;
      }
      const rowMemberId = String(data[i][0] || '').trim();
      if (role === 'Admin' || rowMemberId === String(memberId)) {
        const leaveType = String(data[i][2] || '');
        const startDateTime = String(data[i][3] || '');
        const endDateTime = String(data[i][4] || '');
        const status = String(data[i][10] || 'รอพิจารณา');
        // Skip invalid dates
        if (!startDateTime || !endDateTime) {
          Logger.log(`Skipping row ${i + 1}: invalid dates`);
          continue;
        }
        // Format event title with status indicator
        const memberName = String(data[i][1] || '');
        let statusEmoji = '';
        if (status === 'อนุมัติ') statusEmoji = '✅ ';
        else if (status === 'ไม่อนุมัติ') statusEmoji = '❌ ';
        else statusEmoji = '⏳ ';
        const title = `${statusEmoji}${memberName} (${leaveType})`;
        // Set event color based on leave type
        let color;
        switch (leaveType) {
          case 'ลาป่วย': color = '#e0f2fe'; break;
          case 'ลากิจ': color = '#f3e8ff'; break;
          case 'ลาพักร้อน': color = '#ffedd5'; break;
          case 'ลาคลอด': color = '#fce7f3'; break;
          default: color = '#e4e4e7'; break;
        }
        events.push({
          title: title,
          start: startDateTime,
          end: endDateTime,
          extendedProps: {
            memberId: rowMemberId,
            memberName: memberName,
            leaveType: leaveType,
            startDateTime: startDateTime,
            endDateTime: endDateTime,
            days: Number(data[i][5] || 0),
            hours: Number(data[i][6] || 0),
            minutes: Number(data[i][7] || 0),
            fileUrl: String(data[i][8] || ''),
            requestDate: String(data[i][9] || ''),
            status: status,
            reason: String(data[i][11] || ''),
            adminReason: String(data[i][12] || '')
          },
          backgroundColor: color,
          borderColor: color
        });
      }
    }
    Logger.log('getLeaveCalendarEvents: processed ' + (data.length - 1) + ' rows, returned ' + events.length + ' events');
    return events;
  } catch (e) {
    Logger.log("Error in getLeaveCalendarEvents: " + e.message);
    throw new Error("ไม่สามารถดึงข้อมูลปฏิทินการลาได้: " + e.message);
  }
}

// Update Leave Status
function updateLeaveStatus(data, currentUserRole) {
  try {
    if (currentUserRole !== "Admin") throw new Error("เฉพาะ Admin เท่านั้นที่สามารถอัปเดตสถานะการลาได้!");
    if (data.status === 'ไม่อนุมัติ' && !data.adminReason) {
      throw new Error('กรุณาระบุเหตุผลสำหรับสถานะไม่อนุมัติ');
    }
    const values = leaveSheet.getDataRange().getValues();
    let memberName = '';
    let startDateTime = '';
    let endDateTime = '';
    let days = 0;
    let hours = 0;
    let minutes = 0;
    let reason = '';
    let fileUrl = '';
    for (let i = 1; i < values.length; i++) {
      if (
        String(values[i][0] || '') === String(data.memberId) &&
        String(values[i][2] || '') === String(data.leaveType) &&
        String(values[i][3] || '') === String(data.startDateTime)
      ) {
        memberName = String(values[i][1] || '');
        startDateTime = String(values[i][3] || '');
        endDateTime = String(values[i][4] || '');
        days = Number(values[i][5] || 0);
        hours = Number(values[i][6] || 0);
        minutes = Number(values[i][7] || 0);
        reason = String(values[i][11] || '');
        leaveSheet.getRange(i + 1, 11).setValue(String(data.status));
        leaveSheet.getRange(i + 1, 13).setValue(String(data.adminReason || ''));

        // ส่งแจ้งเตือนไปยัง Telegram
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        const message = `<b>🔄 อัปเดตสถานะการลา</b>\n` +
          `<b>เลขประจำตัว:</b> ${data.memberId}\n` +
          `<b>ชื่อ:</b> ${memberName}\n` +
          `<b>ประเภท:</b> ${data.leaveType}\n` +
          `<b>เริ่ม:</b> ${Utilities.formatDate(start, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}\n` +
          `<b>สิ้นสุด:</b> ${Utilities.formatDate(end, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm')}\n` +
          `<b>ระยะเวลา:</b> ${days} วัน ${hours} ชม. ${minutes} นาที\n` +
          `<b>เหตุผล:</b> ${reason || '-'}\n` +
          `<b>สถานะใหม่:</b> ${data.status}\n` +
          `<b>เหตุผล (Admin):</b> ${data.adminReason || '-'}`;
        sendTelegramMessage(message);

        Logger.log("Leave status updated: memberId: " + data.memberId + ", Status: " + data.status);
        return 'อัปเดตสถานะการลาเรียบร้อย';
      }
    }
    throw new Error('ไม่พบข้อมูลการลาที่ต้องการอัปเดต');
  } catch (e) {
    Logger.log("Error in updateLeaveStatus: " + e.message);
    throw new Error(e.message);
  }
}

// Get Dashboard Data
function getDashboardData(userRole) {
  Logger.log('getDashboardData called with userRole: ' + userRole);
  if (userRole !== 'Admin') {
    Logger.log('Access denied: User is not Admin');
    throw new Error('เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงข้อมูลนี้');
  }
  try {
    const leaveData = leaveSheet.getDataRange().getValues();
    Logger.log('Leave data rows: ' + leaveData.length);
    const statusCounts = { pending: 0, approved: 0, rejected: 0 };
    const statisticsMap = {};
    leaveData.slice(1).forEach((row, index) => {
      const status = row[10];
      const leaveType = row[2];
      Logger.log(`Row ${index + 2}: status=${status}, leaveType=${leaveType}`);
      if (status === 'รอพิจารณา') statusCounts.pending++;
      else if (status === 'อนุมัติ') statusCounts.approved++;
      else if (status === 'ไม่อนุมัติ') statusCounts.rejected++;
      if (leaveType) {
        statisticsMap[leaveType] = (statisticsMap[leaveType] || 0) + 1;
      }
    });
    const statistics = Object.keys(statisticsMap).map(leaveType => ({
      leaveType,
      count: statisticsMap[leaveType]
    }));
    Logger.log('Returning data: ' + JSON.stringify({ statusCounts, statistics }));
    return { statusCounts, statistics };
  } catch (error) {
    Logger.log('Error in getDashboardData: ' + error.message);
    throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูลแดชบอร์ด: ' + error.message);
  }
}

// Get Personal Leave Statistics
function getPersonalLeaveStatistics(memberId, userRole, leaveData = null) {
  Logger.log('getPersonalLeaveStatistics called with memberId: ' + memberId + ', userRole: ' + userRole);
  try {
    Logger.log('Leave data rows: ' + leaveData.length);
    let statsMap = {}, leftMinutes = 0;
    leaveData.forEach((row, index) => {
      const currentMemberId = row[0];
      const name = row[1];
      const startDateTime = row[3];
      const endDateTime = row[4];
      const status = row[10];
      if (!statsMap[currentMemberId]) {
        statsMap[currentMemberId] = {
          memberId: currentMemberId,
          name: name,
          leaveCount: 0,
          totalHours: 0,
          totalMinutes: 0
        };
      }
      if (status === 'อนุมัติ') {
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        let countDays = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        let countHours = Math.floor(((end - start) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        let countMinutes = Math.floor(((end - start) % (1000 * 60 * 60)) / (1000 * 60));
        if (countDays > 0) {
          countHours += countDays * 8; // สมมติ 1 วัน = 8 ชั่วโมง
        }
        if (countMinutes >= 60) {
          countHours += Math.floor(countMinutes / 60);
          countMinutes = countMinutes % 60;
        }
        statsMap[currentMemberId].leaveCount++;
        statsMap[currentMemberId].totalHours += countHours;
        statsMap[currentMemberId].totalMinutes += countMinutes;
        Logger.log(`Row ${index + 2}: memberId=${currentMemberId}, status=${status}, hours=${countHours.toFixed(2)}`);
      } else {
        Logger.log(`Row ${index + 2}: memberId=${currentMemberId}, status=${status}, hours=0`);
      }
    });
    // รวมชั่วโมงจากนาทีที่เหลือ
    for (let key in statsMap) {
      if (statsMap[key].totalMinutes >= 60) {
        const extraHours = Math.floor(statsMap[key].totalMinutes / 60);
        statsMap[key].totalHours += extraHours;
        statsMap[key].totalMinutes = statsMap[key].totalMinutes % 60;
      }
    }
    // เพิ่มชั่วโมงจากนาทีที่เหลือ
    const stats = Object.values(statsMap).filter(stat => {
      return userRole === 'Admin' || stat.memberId === memberId;
    });
    Logger.log('Returning personal stats: ' + JSON.stringify(stats));
    return stats;
  } catch (error) {
    Logger.log('Error in getPersonalLeaveStatistics: ' + error.message);
    throw new Error('เกิดข้อผิดพลาดในการดึงสถิติส่วนตัว: ' + error.message);
  }
}

// Get Leave Statistics
function getLeaveStatistics(memberId, userRole, leaveData = null) {
  Logger.log('getLeaveStatistics called with memberId: ' + memberId + ', userRole: ' + userRole);
  try {
    Logger.log('Leave data rows: ' + leaveData.length);
    const statisticsMap = {};
    leaveData.forEach((row, index) => {
      const currentMemberId = row[0];
      const leaveType = row[2];
      const status = row[10];
      if (status === 'อนุมัติ' && (userRole === 'Admin' || currentMemberId === memberId)) {
        statisticsMap[leaveType] = (statisticsMap[leaveType] || 0) + 1;
        Logger.log(`Row ${index + 2}: memberId=${currentMemberId}, leaveType=${leaveType}, status=${status}`);
      }
    });
    const statistics = Object.keys(statisticsMap).map(leaveType => ({
      leaveType,
      count: statisticsMap[leaveType]
    }));
    Logger.log('Returning leave stats: ' + JSON.stringify(statistics));
    return statistics;
  } catch (error) {
    Logger.log('Error in getLeaveStatistics: ' + error.message);
    throw new Error('เกิดข้อผิดพลาดในการดึงสถิติการลา: ' + error.message);
  }
}

// Get All Statistics
function getAllStatistics(memberId, userRole) {
  Logger.log('getAllStatistics called with memberId: ' + memberId + ', userRole: ' + userRole);
  try {
    const leaveData = leaveSheet.getDataRange().getValues().slice(1);
    const leaveStatistics = getLeaveStatistics(memberId, userRole, leaveData.filter(row => row[0] === memberId || userRole === 'Admin')); // กรองแถวที่มี memberId
    const personalStatistics = getPersonalLeaveStatistics(memberId, userRole, leaveData.filter(row => row[0] === memberId || userRole === 'Admin')); // กรองแถวที่มี memberId

    // Get all approved leaves for filtering
    const allLeaves = [];

    leaveData.forEach((row, index) => {
      const currentMemberId = row[0];
      const status = row[10];

      if (status === 'อนุมัติ' && (userRole === 'Admin' || currentMemberId === memberId)) {
        allLeaves.push({
          memberId: currentMemberId,
          name: row[1],
          leaveType: row[2],
          startDateTime: row[3],
          endDateTime: row[4],
          days: Number(row[5] || 0),
          hours: Number(row[6] || 0),
          minutes: Number(row[7] || 0)
        });
      }
    });

    Logger.log('Returning all stats with ' + allLeaves.length + ' approved leaves');
    return JSON.stringify({ leaveStatistics, personalStatistics, allLeaves });
  } catch (error) {
    Logger.log('Error in getAllStatistics: ' + error.message);
    throw new Error('เกิดข้อผิดพลาดในการดึงสถิติ: ' + error.message);
  }
}

// Get Member IDs
function getMemberIds() {
  try {
    const ids = userSheet.getDataRange().getValues().slice(1).map(row => row[3]).filter(id => id);
    Logger.log("Retrieved " + ids.length + " member IDs.");
    return ids;
  } catch (e) {
    Logger.log("Error in getMemberIds: " + e.message);
    throw new Error("ไม่สามารถดึงเลขประจำตัวได้: " + e.message);
  }
}

// Test Drive Access
function testDriveAccess() {
  try {
    const files = driveFolder.getFiles();
    let fileList = [];
    while (files.hasNext()) {
      const file = files.next();
      fileList.push({ name: file.getName(), url: file.getUrl() });
    }
    Logger.log("Drive files: " + JSON.stringify(fileList));
    return fileList;
  } catch (e) {
    Logger.log("Error in testDriveAccess: " + e.message);
    throw new Error("ไม่สามารถเข้าถึง Google Drive ได้: " + e.message);
  }
}