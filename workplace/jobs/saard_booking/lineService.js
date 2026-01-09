// LINE OA Service - Handle LINE messaging

/**
 * Get tomorrow's booking summary and send via LINE OA
 */
function nextDateBriefSummary() {
  const today = new Date();

  const tomorrowStr = formatDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), 'yyyy-MM-dd');
  const tomorrowEvents = getTomorrowEvents(tomorrowStr);
  
  if (Object.keys(tomorrowEvents).length === 0) {
    Logger.log('ไม่มีงานสำหรับวันพรุ่งนี้');
  } else {
    const summary = `📅 นัดหมายสำหรับพรุ่งนี้ (${formatDate(new Date(tomorrowStr), 'dd/MM/yyyy')})`;
    for (const branchName in tomorrowEvents) {
      let branchGroupId = BRANCH_DATA[branchName]?.groupId;
      if (branchGroupId) {
        const branchHeader = summary + `\n🏢 สาขา: ${branchName}\n\n📞 รบกวนโทรคอนเฟิร์มลูกค้าก่อน 15.00 ค่ะ`;
        sendLineOA(branchHeader, tomorrowEvents[branchName]);
      }
    }
  }
}

/**
 * Get all bookings for a specific date
 */
function getTomorrowEvents(tomorrowStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Booking Info');
  const data = getSheetData(sheet);
  const header = data[HEADER_ROW - 1].map(h => h.trim());
  const dateIndex = header.indexOf('วันที่ให้บริการ');
  const groupByBranch = {};
  data.forEach((row, rowIndex) => {
    if (rowIndex < HEADER_ROW) return; // Skip header rows
    
    const dateStr = formatDate(new Date(row[dateIndex]), 'yyyy-MM-dd');
    if (dateStr !== tomorrowStr) return;
    
    try {
      const eventStr = buildEventSummary(row, header, dateIndex);
      const branch = getBranchByPostcode(String(row[header.indexOf('รหัสไปรษณีย์')]));
      if (branch) {
        if (!groupByBranch[branch.name]) {
          groupByBranch[branch.name] = [];
        }
        groupByBranch[branch.name].push(eventStr);
      }
    } catch (err) {
      Logger.log('❌ ERROR fetching event: ' + err);
    }
  });

  return groupByBranch;
}

/**
 * Build event summary string for LINE message
 */
function buildEventSummary(row, header, dateIndex) {
  const getValue = (colName) => {
    const idx = header.indexOf(colName);
    return idx >= 0 ? row[idx] : '';
  };

  return `👉 Booking ID : ${getValue('Booking ID')} 👈\n` +
    `ชื่อ : ${getValue('ชื่อ-นามสกุล')}\n` +
    `จำนวนทีมงาน : ${getValue('จำนวนทีมงาน (คน)')} คน\n` +
    `วันที่  : ${formatDate(new Date(row[dateIndex]), 'dd/MM/yyyy')}\n` +
    `เวลา  : ${formatTime(new Date(row[header.indexOf('เวลาที่ให้บริการ (เริ่มงาน)')]), 'HH:mm')} - ${formatTime(new Date(row[header.indexOf('เวลาที่ให้บริการ (เลิกงาน)')]), 'HH:mm')} น.\n` +
    `สถานที่: ${getValue('สถานที่ / ที่อยู่')}\n` +
    `Maps : ${getValue('ลิงก์ Google Maps')}\n` +
    `เบอร์ : ${getValue('เบอร์โทร')}\n` +
    `หมายเหตุ :\n ${getValue('หมายเหตุเพิ่มเติม')}`;
}

/**
 * Send message via LINE OA
 */
function sendLineOA(header, messages) {
  let messagesToSend = [];
  let message = header;
  
  for (let i = 0; i < messages.length; i++) {
    const tempMsg = message + '\n\n' + messages[i];
    if (tempMsg.length > MAX_MESSAGE_LENGTH) {
      messagesToSend.push(message);
      message = messages[i];
    } else {
      message = tempMsg;
    }
  }
  
  if (messagesToSend.length > 0 || message === header) {
    if (message !== header) {
      messagesToSend.push(message);
    }
  } else {
    messagesToSend.push(message);
  }

  const payload = {
    to: GROUP_ID,
    messages: messagesToSend.map(msg => ({ type: 'text', text: msg }))
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${LINE_OA_TOKEN}`
    },
    payload: JSON.stringify(payload)
  };
  
  try {
    const res = UrlFetchApp.fetch(LINE_API_URL, options);
    if (res.getResponseCode() === 200) {
      Logger.log('✅ ส่งข้อความไปยัง LINE OA สำเร็จ');
    } else {
      Logger.log('❌ ส่งข้อความไปยัง LINE OA ล้มเหลว: ' + res.getContentText());
    }
  } catch (err) {
    Logger.log('❌ ERROR sending LINE message: ' + err);
  }
}
