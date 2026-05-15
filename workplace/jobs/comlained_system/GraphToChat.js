function sendChartsToGoogleChat() {
  // 1. ระบุ Webhook URL ของคุณ
  const webhookUrl = "https://chat.googleapis.com/v1/spaces/AAQAA948O7w/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=4d9Puz1jCrKy8a3f9U3b9T1_4uzqbcxm8yWKQq3YE0c";
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("ComplainData");
    
    if (!sheet) {
      Logger.log("ไม่พบชีทชื่อ ComplainData");
      return;
    }

    // ยืนยันว่าการคำนวณและกราฟถูก Render เสร็จสมบูรณ์
    SpreadsheetApp.flush();

    const charts = sheet.getCharts();
    const maxCharts = Math.min(charts.length, 5);
    
    if (charts.length === 0) {
      Logger.log("ไม่พบกราฟในชีท");
      return;
    }

    for (let i = 0; i < maxCharts; i++) {
      try {
        // ดึงรูปกราฟออกมาตรงๆ (ไม่ใช้ modify() เพื่อเลี่ยง Error)
        const chartBlob = charts[i].getBlob().setName(`Chart_${i + 1}.png`);
        
        // บันทึกลง Drive ชั่วคราวเพื่อให้ Chat ดึงรูปไปแสดงได้
        const file = DriveApp.createFile(chartBlob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        const imageUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;
        
        // สร้างข้อความส่งไปที่ Chat
        const payload = {
          "cardsV2": [{
            "cardId": `chart_${i}`,
            "card": {
              "header": { "title": `รายงานกราฟที่ ${i + 1}` },
              "sections": [{
                "widgets": [{
                  "image": { "imageUrl": imageUrl }
                }]
              }]
            }
          }]
        };

        const options = {
          "method": "post",
          "contentType": "application/json",
          "payload": JSON.stringify(payload)
        };

        UrlFetchApp.fetch(webhookUrl, options);
        Logger.log(`กราฟที่ ${i + 1} ส่งเรียบร้อยแล้ว`);

      } catch (err) {
        Logger.log(`ล้มเหลวที่กราฟที่ ${i + 1}: ${err.message}`);
      }
    }
  } catch (globalErr) {
    Logger.log(`เกิดข้อผิดพลาดรุนแรง: ${globalErr.message}`);
  }
}