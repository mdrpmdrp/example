function onFormSubmit(e) {
    Logger = BetterLog.useSpreadsheet();
    let formData = cleanTextData(e.namedValues);
    switch(formData['หมวดที่ต้องการรายงาน'][0]){
        case "Clinical Chemistry":
            createMessageClinicalChemistry(formData);
            break;
        case "Hematology":
            createMessageHematology(formData);
            break;
        case "Microbiology":
            createMessageMicrobiology(formData);
            break;
    }
}

function cleanTextData(data) {
    for (let key in data) {
        data[key] = data[key].map(item => {
            item = item.replace(/\</g, "&lt;").replace(/\>/g, "&gt;").trim();
            return item.trim();
        });
    }
    return data;
}

function sendTelegram(message) {
    Logger.log(message)
    let chatId = '-5070163537'; // chat ID ของลูกค้าใช้จริง
    if (!chatId) {
        return;
    }
    const telegramToken = '8292193034:AAGmqqVKfbg4KBw4JrcKbQCtn9NFpyNxcCU'; // bot token ของลูกค้าใช้จริง
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
    
    // Send each chunk sequentially
    for (let chunk of messageChunks) {
        const payload = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({
                chat_id: chatId,
                text: chunk,
                parse_mode: 'HTML'
            })
        };
        
        try {
            UrlFetchApp.fetch(url, payload);
        } catch (error) {
            Logger.log("Error sending Telegram message: " + error.message);
        }
    }
}

function createMessageClinicalChemistry(formData) {
    let message = "<b>แจ้งเตือนค่าวิกฤต - Clinical Chemistry</b>\n\n";
    message += "รายงานไปยัง : <b>" + formData['รายงานไปยัง'][0] + "</b>\n\n";
    message += "ชื่อผู้ป่วย : <b>" + formData['ชื่อ-สกุล คนไข้'][0] + "</b>\n\n";
    message += "HN : <b>" + formData['HN'][0] + "</b>\n\n";
    message += "<blockquote>";
    message += "<b>รายการที่แจ้ง:</b>\n";
    formData["รายการ Clinical chemistry ที่ต้องการรายงาน"][0].split(",").forEach(item => {
        message += "- " + item + "\n";
    });
    message += "\n";
    message += "ค่าที่แจ้ง : <b>" + formData["ค่า Clinical chemistry ที่รายงาน"][0] + "</b>\n";
    message += "</blockquote>\n\n";
    message += "<b>ผู้รับรายงานผล:</b>\n";
    formData["ผู้รับรายงานผล"][0].split(",").forEach(item => {
        message += "- " + item + "\n";
    });
    message += "\n";
    message += "ผู้รายงานผล: <b>" + formData['ผู้รายงานผล'][0] + "</b>\n";
    sendTelegram(message);
}

function createMessageHematology(formData) {
    let message = "<b>แจ้งเตือนค่าวิกฤต - Hematology</b>\n\n";
    message += "รายงานไปยัง : <b>" + formData['รายงานไปยัง'][0] + "</b>\n\n";
    message += "ชื่อผู้ป่วย : <b>" + formData['ชื่อ-สกุล คนไข้'][0] + "</b>\n\n";
    message += "HN : <b>" + formData['HN'][0] + "</b>\n\n";
    message += "<blockquote>";
    message += "<b>รายการที่แจ้ง:</b>\n";
    formData["รายการ Hematology ที่ต้องการรายงาน"][0].split(",").forEach(item => {
        message += "- " + item + "\n";
    });
    message += "\n";
    message += "ค่าที่แจ้ง : <b>" + formData["ค่า Hematology ที่รายงาน"][0] + "</b>\n";
    message += "</blockquote>\n\n";
    message += "<b>ผู้รับรายงานผล:</b>\n";
    formData["ผู้รับรายงานผล"][0].split(",").forEach(item => {
        message += "- " + item + "\n";
    });
    message += "\n";
    message += "ผู้รายงานผล: <b>" + formData['ผู้รายงานผล'][0] + "</b>\n";
    sendTelegram(message);
}

function createMessageMicrobiology(formData) {
    let message = "<b>แจ้งเตือนค่าวิกฤต - Microbiology</b>\n\n";
    message += "รายงานไปยัง : <b>" + formData['รายงานไปยัง'][0] + "</b>\n\n";
    message += "ชื่อผู้ป่วย : <b>" + formData['ชื่อ-สกุล คนไข้'][0] + "</b>\n\n";
    message += "HN : <b>" + formData['HN'][0] + "</b>\n\n";
    message += "<blockquote>";
    message += formData["รายการ Microbiology ที่ต้องการรายงาน"][0]
    switch(formData["รายการ Microbiology ที่ต้องการรายงาน"][0]) {
        case "Hemoculture":
            message += "\n<b>ค่าที่แจ้ง:</b>\n";
            formData["ค่าที่รายงาน Hemoculture / CSF culture"][0].split(",").forEach(item => {
                message += "- " + item + "\n";
            });
            break;
        case "เชื้อดื้อยา":
            message += "\n<b>ค่าที่แจ้ง:</b>\n";
            formData["ค่าที่รายงาน เชื้อดื้อยา"][0].split(",").forEach(item => {
                message += "- " + item + "\n";
            });
            break;
        case "AFB":
            message += "\n<b>ค่าที่แจ้ง:</b>\n";
            message += formData["ค่า AFB ที่รายงาน"][0] + "\n";
            break;
        case "CSF culture/sen":
            message += "\n<b>ค่าที่แจ้ง:</b>\n";
            formData["ค่าที่รายงาน Hemoculture / CSF culture"][0].split(",").forEach(item => {
                message += "- " + item + "\n";
            });
            break;
        default:
            break;

    }
    message += "</blockquote>\n\n";
    message += "<b>ผู้รับรายงานผล:</b>\n";
    formData["ผู้รับรายงานผล"][0].split(",").forEach(item => {
        message += "- " + item + "\n";
    });
    message += "ผู้รายงานผล: <b>" + formData['ผู้รายงานผล'][0] + "</b>\n";
    sendTelegram(message);
}