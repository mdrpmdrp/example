function onFormSubitForLineStatusUpdate(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const LINE_ACCESS_TOKEN = ss.getSheetByName('chatid').getRange('D2').getValue();
    let range = e.range;
    let sh = range.getSheet();
    let header = sh.getRange(HEADER_ROW, 1, 1, sh.getLastColumn()).getValues()[0];
    let statusColIndex = header.indexOf('สถานะการอนุมัติ'); // หาดัชนีของคอลัมน์ "สถานะการอนุมัติ"
    if (sh.getName() !== SHEET_NAME) return;
    let rowIndex = range.getRow();
    let submitData = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
    const COL_NAME = 2; // B
    const COL_PLATE = 3; // C
    const COL_TYPE = 4; // D    
    const COL_START = 5; // E
    const COL_END = 6; // F
    const COL_DAYS = 7; // G
    const COL_STATUS = 8; // H
    const COL_USERNAME = 10; // J
    const COL_UUID = 11; // K
    let uuid = Utilities.getUuid();
    // save uuid ไว้ในคอลัมน์ที่ซ่อนอยู่ เพื่อใช้เป็น token ในการอัปเดตสถานะผ่าน Line
    sh.getRange(rowIndex, COL_UUID).setValue(uuid);
    const message = buildLeaveApprovalFlexMessage({
        rowIndex: rowIndex,
        employeeName: submitData[COL_NAME - 1],
        plate: submitData[COL_PLATE - 1],
        leaveType: submitData[COL_TYPE - 1],
        startDate: submitData[COL_START - 1],
        endDate: submitData[COL_END - 1],
        leaveDays: submitData[COL_DAYS - 1],
        status: submitData[COL_STATUS - 1] || 'รออนุมัติ',
        notifyDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'),
        approveData: `action=approve&uuid=${uuid}&id=${encodeURIComponent(submitData[COL_USERNAME - 1])}`,
        rejectData: `action=reject&uuid=${uuid}&id=${encodeURIComponent(submitData[COL_USERNAME - 1])}`,
    });

    // send Line to admin
    if (LINE_ACCESS_TOKEN) {
        LineBotWebhook.push('xxxxxxx', LINE_ACCESS_TOKEN, [message]);
    }
}

function buildLeaveApprovalFlexMessage(payload) {
    return {
        type: 'flex',
        altText: `แจ้งการลางาน: ${payload.employeeName} (${payload.status})`,
        contents: {
            type: 'bubble',
            size: 'mega',
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                contents: [
                    {
                        type: 'text',
                        text: 'แจ้งการลางาน',
                        weight: 'bold',
                        size: 'xl',
                        color: '#1F2937'
                    },
                    {
                        type: 'text',
                        text: 'บริษัท LACO',
                        size: 'sm',
                        color: '#6B7280'
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    buildFlexDetailRow('วันที่แจ้ง', payload.notifyDate),
                    buildFlexDetailRow('พนักงาน', payload.employeeName),
                    buildFlexDetailRow('ทะเบียนรถ', payload.plate),
                    buildFlexDetailRow('ประเภทการลา', payload.leaveType),
                    buildFlexDetailRow('วันที่เริ่มลา', payload.startDate),
                    buildFlexDetailRow('วันที่สิ้นสุด', payload.endDate),
                    buildFlexDetailRow('จำนวนวันลา', payload.leaveDays),
                    buildFlexDetailRow('สถานะ', payload.status, true)
                ]
            },
            footer: {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#2E7D32',
                        height: 'sm',
                        action: {
                            type: 'postback',
                            label: 'Approve',
                            data: payload.approveData,
                            displayText: `อนุมัติการลา: ${payload.employeeName}`
                        }
                    },
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#C62828',
                        height: 'sm',
                        action: {
                            type: 'postback',
                            label: 'Reject',
                            data: payload.rejectData,
                            displayText: `ไม่อนุมัติการลา: ${payload.employeeName}`
                        }
                    }
                ]
            }
        }
    };
}

function buildFlexDetailRow(label, value, emphasize) {
    return {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
            {
                type: 'text',
                text: label,
                size: 'sm',
                color: '#6B7280',
                flex: 3
            },
            {
                type: 'text',
                text: stringifyFlexValue(value),
                size: 'sm',
                color: emphasize ? '#111827' : '#374151',
                weight: emphasize ? 'bold' : 'regular',
                wrap: true,
                flex: 5
            }
        ]
    };
}

function stringifyFlexValue(value) {
    if (value instanceof Date) {
        return Utilities.formatDate(value, 'Asia/Bangkok', 'dd/MM/yyyy');
    }
    if (value === null || value === undefined || value === '') {
        return '-';
    }
    return String(value);
}

function doPost(e) {
    const LINE_ACCESS_TOKEN = ss.getSheetByName('chatid').getRange('D2').getValue();
    try {
        LineBotWebhook.init(e, LINE_ACCESS_TOKEN, true).forEach(webhook => {
            const events = webhook.eventType
            if (events === 'postback') {
                return handleLeaveApprovalPostback(webhook);
            } else if (events === 'message' && webhook.messageType === 'text') {
                return handleMessage(webhook);
            }
            return webhook.ok;
        });
    } catch (error) {
        Logger.log(error);
        return ContentService
            .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function handleMessage(webhook) {
    let message = webhook.message.toLowerCase();
    if (message.startsWith('#') && message.endsWith('#') && message.length > 2) {
        let emp_id = message.slice(1, -1).trim(); // ดึงข้อความระหว่าง # และ #
        // ทำการค้นหาข้อมูลพนักงานจาก emp_id ในสเปรดชีต
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName('Line Registration');
        const data = sh.getDataRange().getValues();
        const header = data[0];
        const empIdColIndex = 1
        const nameColIndex = 2
        const uidColIndex = 3
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][empIdColIndex]) == emp_id) {
                // พบข้อมูลพนักงานที่ตรงกับ emp_id
                const employeeName = data[i][nameColIndex];
                const lineUid = webhook.userId;
                // บันทึก Line UID ลงในสเปรดชีต
                sh.getRange(i + 1, uidColIndex + 1).setValue(lineUid);
                // ตอบกลับข้อความยืนยันการลงทะเบียน
                webhook.replyToline(['สวัสดี ' + employeeName + '! คุณได้ลงทะเบียนกับระบบเรียบร้อยแล้ว 😊\n\nระบบจะแจ้งผลการลาให้คุณทราบทันที เมื่อมีการอนุมัติหรือไม่อนุมัติ']);
                return webhook.ok;
            }
        }
        // หากไม่พบ emp_id ที่ตรงกัน ให้ตอบกลับข้อความแจ้งว่าไม่พบข้อมูล
        webhook.replyToline(['ไม่พบข้อมูลพนักงานที่ตรงกับรหัส ' + emp_id + '. กรุณาตรวจสอบและลองใหม่อีกครั้ง']);
        return webhook.ok;
    }
}

function handleLeaveApprovalPostback(postbackData) {
    let postback = webhook.postback;
    let data = parsePostbackData(postback);
    let action = data.action;
}

function parsePostbackData(postbackData) {
    return String(postbackData)
        .split('&')
        .filter(Boolean)
        .reduce(function (result, pair) {
            const parts = pair.split('=');
            const key = decodeURIComponent(parts[0] || '');
            const value = decodeURIComponent(parts.slice(1).join('=') || '');
            result[key] = value;
            return result;
        }, {});
}

function replyLineMessage(replyToken, text) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const lineAccessToken = ss.getSheetByName('chatid').getRange('D2').getValue();

    if (!lineAccessToken) {
        return;
    }

    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + lineAccessToken
        },
        payload: JSON.stringify({
            replyToken: replyToken,
            messages: [
                {
                    type: 'text',
                    text: text
                }
            ]
        }),
        muteHttpExceptions: true
    });
}