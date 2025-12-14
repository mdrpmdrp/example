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
    const range = sheet.getRange(2, 1, lastRow - 1, 16);
    const values = range.getValues();

    // Pre-allocate array for better performance
    const data = new Array(values.length);
    const len = values.length;

    // Use for loop with cached length for better performance
    for (let i = 0; i < len; i++) {
      const row = values[i];

      // Parse solutions JSON with helper
      const solutions = parseSolutionsJson(row[12]);

      data[i] = {
        id: row[0],
        date: formatDate(row[1]),
        product: row[2],
        quantity: row[3],
        unit: row[4],
        problem: row[5],
        store: row[6],
        type: row[7],
        severity: row[8],
        claimValue: row[9],
        responsibleTeam: row[10],
        teamRepresentative: row[11],
        solutions: solutions,
        pipeline: row[13],
        timestamp: row[14],
        images: row[15] ? row[15].split('\n') : []
      };
    }
    return JSON.stringify({ success: true, data: data });

  } catch (error) {
    console.error('Error in getData:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
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

    const rowData = [
      nextId,
      formData.date,
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
      formData.images || []
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
      sheet.getRange(newRowNum, 1, 1, 16).setBackground('#f9fafb');
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
        images: formData.images ? formData.images.split('\n') : []
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

    const rowData = [
      formData.id,
      formData.date,
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
      formData.images || []
    ];

    sheet.getRange(actualRow, 1, 1, 16).setValues([rowData]);

    // // Send notification asynchronously (non-blocking)
    try {
      sendComplainChatText(formData.date, formData.product, formData.problem, formData.pipeline,
                   formData.responsibleTeam, formData.teamRepresentative, 'update', formData.store, formData.id);
    } catch (notifError) {
      console.warn('Notification failed but data updated:', notifError);
    }

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
          header: {
            title: prefix || "แจ้งปัญหา",
            subtitle: "ระบบ Complain",
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    // แปลง \n เป็น <br> เพื่อให้ขึ้นบรรทัดใน Card
                    text: text.replace(/\n/g, "<br>")
                  }
                },
                {
                  buttonList: {
                    buttons: [
                      {
                        text: "เปิดหน้าเว็บดูรายละเอียด",
                        onClick: {
                          openLink: {
                            url: linkUrl
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