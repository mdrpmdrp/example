function checkForDue(){
    checkForContractDueAlerts();
    checkForRoomAvailableDateAlerts();
}

function checkForContractDueAlerts() {
    let timezone = Session.getScriptTimeZone();
    const formatDuedateAlertRow = (row) => {
        return {
            contractEndDate: Utilities.formatDate(row[34], timezone, 'dd/MM/yyyy'),
            project: row[6],
            roomNumber: row[9],
            customerName: row[21],
            customerPhone: row[24],
        }
    }

    const createTextForDuedateAlert = (days, rows) => {
        let text = `<b>📅 แจ้งเตือนสัญญาจะหมดอายุในอีก ${days} วัน</b>\nวันที่หมดสัญญา: ${rows[0].contractEndDate}\n\n`;
        rows.forEach(row => {
            text += `<blockquote>`;
            text += `<b>โครงการ : </b> ${row.project}\n`;
            text += `<b>ห้อง : </b> ${row.roomNumber}\n`;
            text += `<b>ชื่อผู้เช่า : </b> ${row.customerName}\n`;
            text += `<b>เบอร์โทรศัพท์ : </b> ${row.customerPhone}\n`
            text += `</blockquote>\n`;
        });
        return text;
    }

    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingSheet = ss.getSheetByName("Alert Settings");
    let contract_due_before_days = settingSheet.getRange("B2").getValue();
    let today = new Date();
    contract_due_before_days = contract_due_before_days.split(",").map(Number);

    let dataForContractDueAlerts = {}

    let dataSheet = ss.getSheetByName("PDF");
    let dataRange = dataSheet.getDataRange();
    let dataValues = dataRange.getValues();
    for (let i = 1; i < dataValues.length; i++) {
        let row = dataValues[i];
        let contractDueDate = row[34]; // Assuming Contract Due Date is in column AI (34th index)
        if (contractDueDate instanceof Date) {
            let timeDiff = contractDueDate.getTime() - today.getTime();
            let daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (contract_due_before_days.includes(daysDiff)) {
                let alertKey = daysDiff.toString();
                if (!dataForContractDueAlerts[alertKey]) {
                    dataForContractDueAlerts[alertKey] = [];
                }
                dataForContractDueAlerts[alertKey].push(formatDuedateAlertRow(row));
            }
        }
    }
    for (let days in dataForContractDueAlerts) {
        let rows = dataForContractDueAlerts[days];
        let message = createTextForDuedateAlert(days, rows);
        sendTelegramMessage(message);
    }
}

function checkForRoomAvailableDateAlerts() {
    const formatDuedateAlertRow = (row) => {
        return {
            date: Utilities.formatDate(row[12], Session.getScriptTimeZone(), 'dd/MM/yyyy'),
            project: row[2],
            roomNumber: row[3],
            size: row[6],
            rentalPrice: row[8],
            sellPrice: row[9],
            phone: row[14],
            remarks: row[17],
        }
    }

    const createTextForDuedateAlert = (days, rows) => {
        let text = `<b>📅 แจ้งเตือนห้องจะว่างในอีก ${days} วัน</b>\nวันที่ห้องว่าง: ${rows[0].date}\n\n`;
        rows.forEach(row => {
            text += `<blockquote>`;
            text += `<b>โครงการ : </b> ${row.project}\n`;
            text += `<b>ห้อง : </b> ${row.roomNumber} (${row.size})\n`;
            text += `<b>ราคาเช่า : </b> ${row.rentalPrice}\n`;
            text += `<b>เบอร์เจ้าของ : </b> ${row.phone}\n`
            text += `<b>หมายเหตุ : </b> ${row.remarks}\n`
            text += `</blockquote>\n`;
        });
        return text;
    }
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let settingSheet = ss.getSheetByName("Alert Settings");
    let room_available_before_days = settingSheet.getRange("B3").getValue().toString();
    let today = new Date();
    room_available_before_days = room_available_before_days.split(",").map(Number);
    
    let dataForRoomAvailableDateAlerts = {}
    let dataSheet = ss.getSheetByName("แจ้งเตือนห้องว่าง");
    let dataRange = dataSheet.getDataRange();
    let dataValues = dataRange.getValues();
    for (let i = 1; i < dataValues.length; i++) {
        let row = dataValues[i];
        let roomAvailableDate = row[11]; // Assuming Room Available Date is in column L 
        if (roomAvailableDate instanceof Date) {
            let timeDiff = roomAvailableDate.getTime() - today.getTime();
            let daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            if (room_available_before_days.includes(daysDiff)) {
                let alertKey = daysDiff.toString();
                if (!dataForRoomAvailableDateAlerts[alertKey]) {
                    dataForRoomAvailableDateAlerts[alertKey] = [];
                }
                dataForRoomAvailableDateAlerts[alertKey].push(formatDuedateAlertRow(row));
            }
        }
    }
    for (let days in dataForRoomAvailableDateAlerts) {
        let rows = dataForRoomAvailableDateAlerts[days];
        let message = createTextForDuedateAlert(days, rows);
        sendTelegramMessage(message);
    }
}

function sendTelegramMessage(message) {
    const telegramToken = '7372234796:AAHP2Wxs3jAZggbEG4K7glvFBhojDq-MSck';
    const chatId = '-1002528463574';    
    const MAX_MESSAGE_LENGTH = 4096;
    
    // Function to split message into chunks
    const chunkMessage = (text, maxLength) => {
         const chunks = [];
         let currentChunk = '';
         const lines = text.split('\n');
         
         for (let line of lines) {
              // If single line exceeds max length, force split it
              if (line.length > maxLength) {
                    if (currentChunk) {
                         chunks.push(currentChunk);
                         currentChunk = '';
                    }
                    // Split long line into smaller parts
                    for (let i = 0; i < line.length; i += maxLength) {
                         chunks.push(line.substring(i, i + maxLength));
                    }
              } else if ((currentChunk + '\n' + line).length > maxLength) {
                    // Current chunk would exceed limit, save it and start new chunk
                    chunks.push(currentChunk);
                    currentChunk = line;
              } else {
                    // Add line to current chunk
                    currentChunk += (currentChunk ? '\n' : '') + line;
              }
         }
         
         if (currentChunk) {
              chunks.push(currentChunk);
         }
         
         return chunks;
    };
    
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    
    // Split message if it exceeds the limit
    const messageChunks = message.length > MAX_MESSAGE_LENGTH 
         ? chunkMessage(message, MAX_MESSAGE_LENGTH) 
         : [message];
    
    // Send each chunk
    messageChunks.forEach((chunk, index) => {
         const payload = {
              chat_id: chatId,
              text: messageChunks.length > 1 ? `[Part ${index + 1}/${messageChunks.length}]\n${chunk}` : chunk,
              parse_mode: 'HTML'
         };
         
         const options = {
              method: 'post',
              contentType: 'application/json',
              payload: JSON.stringify(payload)
         };
         
         UrlFetchApp.fetch(url, options);
         
         // Add small delay between messages to avoid rate limiting
         if (index < messageChunks.length - 1) {
              Utilities.sleep(100);
         }
    });
}

function testSendTelegramMessage() {
    let longMessage = 'This is a test message. '; // Create a long message
    sendTelegramMessage(longMessage);
}