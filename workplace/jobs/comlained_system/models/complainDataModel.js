// Data CRUD Operations Module
// File: dataCrud.js

/**
 * Get all data from sheet
 */
function getComplainData() {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    // Read all columns including pipeline (column 14) in one batch
    const range = sheet.getRange(2, 1, lastRow - 1, 17);
    const values = range.getValues();

    // Pre-allocate array for better performance
    const data = new Array(values.length);
    const len = values.length;

    // Use for loop with cached length for better performance
    for (let i = 0; i < len; i++) {
      const row = values[i];

      // Parse solutions JSON with helper
      const solutions = parseSolutionsJson(row[13]);

      data[i] = {
        id: row[0],
        date: formatDate(row[1]),
        weekOfYear: row[2],
        product: row[3],
        quantity: row[4],
        unit: row[5],
        problem: row[6],
        store: row[7],
        type: row[8],
        severity: row[9],
        claimValue: row[10],
        responsibleTeam: row[11],
        teamRepresentative: row[12],
        solutions: solutions,
        pipeline: row[14],
        timestamp: row[15],
        images: row[16] ? row[16].split('\n') : []
      };
    }
    return JSON.stringify({ success: true, data: data });

  } catch (error) {
    console.error('Error in getData:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Normalize images value before writing to sheet.
 * Supports newline string and array inputs.
 */
function normalizeImagesForSheet(images) {
  if (!images) return '';

  if (Array.isArray(images)) {
    return images
      .filter(Boolean)
      .map(item => String(item).trim())
      .filter(Boolean)
      .join('\n');
  }

  if (typeof images === 'string') {
    const normalized = images.trim();
    return normalized === '[]' ? '' : normalized;
  }

  return String(images).trim();
}

/**
 * Add new data to sheet
 */
function addComplainData(formData) {
  try {
    const sheet = getOrCreateSheet('ComplainData');
    const timestamp = new Date();

    const nextId = getComplainId();

    // Convert solutions array to JSON string
    const solutionsJson = formData.solutions ? JSON.stringify(formData.solutions) : '';
    const imagesCellValue = normalizeImagesForSheet(formData.images);

    const rowData = [
      nextId,
      formData.date,
      formData.weekOfYear,
      formData.product,
      formData.quantity,
      formData.unit,
      formData.problem,
      formData.store,
      formData.type,
      String(formData.severity),
      formData.claimValue,
      formData.responsibleTeam,
      formData.teamRepresentative,
      solutionsJson,
      formData.pipeline,
      timestamp,
      imagesCellValue
    ];

    sheet.appendRow(rowData);

    // change folder name to match complain ID
    if (formData.folderId) {
      const folder = DriveApp.getFolderById(formData.folderId);
      if (folder) {
        folder.setName(nextId);
      }
    }

    const newRowNum = sheet.getLastRow();

    // Batch all formatting operations together for better performance
    if (newRowNum % 2 === 0) {
      sheet.getRange(newRowNum, 1, 1, 17).setBackground('#f9fafb');
    }
    sheet.getRange(newRowNum, 10).setNumberFormat('#,##0.00');

    // // Send notification asynchronously (non-blocking)
    try {
      sendComplainChatText(formData.date, formData.product, formData.problem, formData.pipeline,
        formData.responsibleTeam, formData.teamRepresentative, 'add', formData.store, nextId);
    } catch (notifError) {
      console.warn('Notification failed but data saved:', notifError);
    }
    return JSON.stringify({
      success: true,
      message: 'เพิ่มข้อมูลสำเร็จ',
      id: nextId,
      newRecord: {
        id: nextId,
        date: formData.date,
        weekOfYear: formData.weekOfYear,
        product: formData.product,
        quantity: formData.quantity,
        unit: formData.unit,
        problem: formData.problem,
        store: formData.store,
        type: formData.type,
        severity: formData.severity,
        claimValue: formData.claimValue,
        responsibleTeam: formData.responsibleTeam,
        teamRepresentative: formData.teamRepresentative,
        solutions: formData.solutions || [],
        pipeline: formData.pipeline,
        timestamp: timestamp,
        images: imagesCellValue ? imagesCellValue.split('\n') : []
      }
    });

  } catch (error) {
    console.error('Error in addData:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Update existing data in sheet
 */
function updateComplainData(formData) {
  const getWeekOfYear = (date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, formData.id);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
    }

    const actualRow = rowIndex + 2; // +2 because array is 0-indexed and we start from row 2
    const timestamp = new Date();

    // Convert solutions array to JSON string
    const solutionsJson = formData.solutions ? JSON.stringify(formData.solutions) : '';
    const imagesCellValue = normalizeImagesForSheet(formData.images);
    const rowData = [
      formData.id,
      formData.date,
      formData.weekOfYear,
      formData.product,
      formData.quantity,
      formData.unit,
      formData.problem,
      formData.store,
      formData.type,
      String(formData.severity),
      formData.claimValue,
      formData.responsibleTeam,
      formData.teamRepresentative,
      solutionsJson,
      formData.pipeline,
      timestamp,
      imagesCellValue
    ];

    sheet.getRange(actualRow, 1, 1, 17).setValues([rowData]);

    // // Send notification asynchronously (non-blocking)
    // try {
    //   sendComplainChatText(formData.date, formData.product, formData.problem, formData.pipeline,
    //                formData.responsibleTeam, formData.teamRepresentative, 'update', formData.store, formData.id);
    // } catch (notifError) {
    //   console.warn('Notification failed but data updated:', notifError);
    // }

    return JSON.stringify({
      success: true,
      message: 'แก้ไขข้อมูลสำเร็จ'
    });

  } catch (error) {
    console.error('Error in updateData:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Delete data from sheet
 */
function deleteComplainData({ id }) {
  console.log('deleteComplainData called with id:', id);
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, id);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูลที่ต้องการลบ');
    }

    const actualRow = rowIndex + 2; // +2 because array is 0-indexed and we start from row 2
    let folder = getOrCreateFolder(id, DriveApp.getFolderById(MAIN_FOLDER_ID));
    if (folder) {
      folder.setTrashed(true);
    }

    sheet.deleteRow(actualRow);

    return JSON.stringify({
      success: true,
      message: 'ลบข้อมูลสำเร็จ'
    });

  } catch (error) {
    console.error('Error in deleteData:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Send Google Chat notification for complain
 */
function sendComplainChatText(date, product, problem, pipeline, responsibleTeam, teamRepresentative, action, store, id) {
  // แปลง pipeline -> สถานะเป็น emoji
  var status = '';
  if (String(pipeline) == 'reported') {
    status = '🟦 แจ้งเรื่อง';
  } else if (String(pipeline) == 'in_progress') {
    status = '🟨 กำลังแก้ไข';
  } else if (String(pipeline) == 'pending_close') {
    status = '🟩 แก้ไขแล้วรอปิดเคส';
  } else if (String(pipeline) == 'closed') {
    status = '⬛ ปิดเคส';
  }

  var d = Utilities.formatDate(new Date(date), "Asia/Bangkok", "dd MMMM yyyy");

  var prefix = '';
  if (String(action) == 'add') {
    prefix = '📣 มีปัญหาใหม่';
  } else if (String(action) == 'update') {
    prefix = '🔁 อัปเดตปัญหา';
  }

  // ✅ แก้ \ปัญหา, \ทีม... ให้เป็น \n ทั้งหมด
  var text =
    prefix + "\n" +
    "วันที่ : " + d +
    "\nWeek : " + String(getWeekOfYear(new Date(date))) + "/" + String(new Date(date).getFullYear()) +
    "\nร้านค้า : " + String(store) +
    "\nสินค้า : " + String(product) +
    "\nปัญหา : " + String(problem) +
    "\nทีมรับผิดชอบ : " + String(responsibleTeam) +
    "\nตัวแทนทีม : " + String(teamRepresentative) +
    "\nสถานะ : " + status;

  // 🔗 URL เว็บที่อยากให้ปุ่มลิงก์ไป (แก้ตรงนี้เป็นของจริง)
  var linkUrl = ScriptApp.getService().getUrl() + "?page=complainDataView&id=" + encodeURIComponent(id);
  console.log("🚀 ~ sendComplainChatText ~ linkUrl:", linkUrl)
  // ✅ payload แบบ Card + ปุ่ม
  var payload = {
    // text: text,  // fallback ถ้า Card แสดงไม่ได้
    cardsV2: [
      {
        cardId: "complain-card",
        card: {
          "header": {
            "title": "แจ้งปัญหา",
            "subtitle": "ระบบ Complain"
          },
          "sections": [
            {
              "widgets": [
                {
                  "textParagraph": {
                    "text": `<br><font color=\"#1e64d4\"><strong>📅 Week : ${getWeekOfYear(new Date(date))}/${new Date(date).getFullYear()}</strong></font><br>วันที่ : ${Utilities.formatDate(new Date(date), "Asia/Bangkok", "dd MMMM yyyy")}<br>`
                  }
                },
                {
                  "textParagraph": {
                    "text": `ร้านค้า : ${store}<br>สินค้า : ${product}`
                  }
                },
                {
                  "textParagraph": {
                    "text": `<font color=\"#ff0e0e\"><strong>⚠️ ปัญหา : ${problem}</strong></font><br>สถานะ : ${status}`
                  }
                },
                {
                  "textParagraph": {
                    "text": `👤ทีมรับผิดชอบ : ${responsibleTeam}<br>ตัวแทนทีม : ${teamRepresentative}`
                  }
                },
                {
                  "buttonList": {
                    "buttons": [
                      {
                        "text": "เปิดหน้าเว็บดูรายละเอียด",
                        "type": "FILLED",
                        "onClick": {
                          "openLink": {
                            "url": linkUrl
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };

  sendGoogleChatText(payload);
}

function testSendComplainChatFromLastRow() {
  try {
    var sheet = getOrCreateSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      console.log('testSendComplainChatFromLastRow: no data rows');
      return { success: false, message: 'no data rows' };
    }

    // Read the full row where columns follow the addComplainData ordering
    var row = sheet.getRange(lastRow, 1, 1, 17).getValues()[0];

    var id = row[0];
    var date = row[1];
    var product = row[3];
    var problem = row[6];
    var store = row[7];
    var responsibleTeam = row[11];
    var teamRepresentative = row[12];
    var pipeline = row[14];

    console.log('testSendComplainChatFromLastRow -> id:', id, 'date:', date);

    // Call existing sender — action 'test' to differentiate notifications
    sendComplainChatText(date, product, problem, pipeline, responsibleTeam, teamRepresentative, 'test', store, id);

    return { success: true, id: id };
  } catch (err) {
    console.error('testSendComplainChatFromLastRow error:', err);
    return { success: false, error: err.toString() };
  }
}