function onFormSubitForLineStatusUpdate(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const [LINE_ACCESS_TOKEN, ADMIN_GROUP_ID] = ss.getSheetByName('chatid').getRange('D2:E2').getValues()[0].map(String);
    let range = e.range;
    let sh = range.getSheet();
    if (sh.getName() !== SHEET_NAME) return;
    let rowIndex = range.getRow();
    let submitData = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
    const COL_NAME = 2; // B
    const COL_PLATE = 3; // C
    const COL_TYPE = 4; // D
    const COL_START = 5; // E
    const COL_END = 6; // F
    const COL_USERNAME = 7; // G
    const COL_DAYS = 8; // H
    const COL_JOB_TYPE = 9; // I
    const COL_STATUS = 10; // J
    const COL_UUID = 13; // M
    const COL_SYSTEM_RECOMMEND = 19; // S
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
        jobType: submitData[COL_JOB_TYPE - 1],
        leaveDays: submitData[COL_DAYS - 1],
        status: submitData[COL_STATUS - 1] || 'รออนุมัติ',
        systemRecommend: submitData[COL_SYSTEM_RECOMMEND - 1],
        notifyDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'),
        approveData: `action=approve&uuid=${uuid}&id=${encodeURIComponent(submitData[COL_USERNAME - 1])}`,
        rejectData: `action=reject&uuid=${uuid}&id=${encodeURIComponent(submitData[COL_USERNAME - 1])}`,
    });

    // send Line to admin
    if (LINE_ACCESS_TOKEN && ADMIN_GROUP_ID) {
        LineBotWebhook.push(ADMIN_GROUP_ID, LINE_ACCESS_TOKEN, [message]);
    }
}

function buildLeaveApprovalFlexMessage(payload) {
    const statusMeta = getFlexStatusMeta(payload.status);
    const recommendationMeta = getRecommendationMeta(payload.systemRecommend);

    return {
        type: 'flex',
        altText: `แจ้งการลางาน: ${payload.employeeName}`,
        contents: {
            type: 'bubble',
            size: 'mega',
            styles: {
                body: {
                    backgroundColor: '#F8FAFC'
                },
                footer: {
                    backgroundColor: '#FFFFFF',
                    separator: true
                }
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'lg',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: '20px',
                        cornerRadius: '20px',
                        backgroundColor: '#0F766E',
                        contents: [
                            {
                                type: 'box',
                                layout: 'baseline',
                                spacing: 'sm',
                                contents: [
                                    {
                                        type: 'text',
                                        text: 'LEAVE REQUEST',
                                        size: 'xs',
                                        weight: 'bold',
                                        color: '#CCFBF1',
                                        flex: 0
                                    },
                                    {
                                        type: 'filler'
                                    },
                                    {
                                        type: 'text',
                                        text: 'LACO',
                                        size: 'xs',
                                        color: '#F0FDFA',
                                        align: 'end',
                                        flex: 0
                                    }
                                ]
                            },
                            {
                                type: 'text',
                                text: 'แจ้งการลางาน',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FFFFFF',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text:  `ชื่อ: ${payload.employeeName}`,
                                size: 'md',
                                color: '#E6FFFB',
                                margin: 'sm',
                                wrap: true,
                                adjustMode: 'shrink-to-fit'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        paddingAll: '12px',
                        cornerRadius: '16px',
                        backgroundColor: '#FFFFFF',
                        contents: [
                            {
                                type: 'text',
                                text: 'รายละเอียด',
                                size: 'sm',
                                weight: 'bold',
                                color: '#0F172A'
                            },
                            buildFlexDetailRow('วันที่แจ้ง', payload.notifyDate),
                            buildFlexDetailRow('พนักงาน', payload.employeeName),
                            buildFlexDetailRow('ทะเบียนรถ', payload.plate),
                            buildFlexDetailRow('ประเภทการลา', payload.leaveType),
                            buildFlexDetailRow('ประเภทงาน', payload.jobType)
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        paddingAll: '12px',
                        cornerRadius: '16px',
                        backgroundColor: '#ECFEFF',
                        contents: [
                            {
                                type: 'text',
                                text: 'ช่วงวันลา',
                                size: 'sm',
                                weight: 'bold',
                                color: '#155E75'
                            },
                            buildFlexDetailRow('เริ่มลา', payload.startDate),
                            buildFlexDetailRow('สิ้นสุด', payload.endDate),
                            buildFlexLeaveDaysRow(payload.leaveDays)
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'sm',
                        paddingAll: '12px',
                        cornerRadius: '16px',
                        backgroundColor: recommendationMeta.backgroundColor,
                        contents: [
                            {
                                type: 'text',
                                text: 'ระบบแนะนำ',
                                size: 'sm',
                                color: recommendationMeta.labelColor,
                                flex: 2,
                                gravity: 'center'
                            },
                            {
                                type: 'text',
                                text: recommendationMeta.label,
                                size: 'sm',
                                weight: 'bold',
                                color: recommendationMeta.valueColor,
                                align: 'end',
                                flex: 3,
                                wrap: true,
                                gravity: 'center'
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'baseline',
                        spacing: 'sm',
                        contents: [
                            {
                                type: 'text',
                                text: 'ตรวจสอบและเลือกผลการอนุมัติได้จากปุ่มด้านล่าง',
                                size: 'xs',
                                color: '#64748B',
                                wrap: true
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '16px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#0F9D58',
                        height: 'md',
                        action: {
                            type: 'postback',
                            label: 'อนุมัติ',
                            data: payload.approveData,
                            displayText: `อนุมัติการลา: ${payload.employeeName}`
                        }
                    },
                    {
                        type: 'button',
                        style: 'link',
                        color: '#B91C1C',
                        height: 'md',
                        action: {
                            type: 'postback',
                            label: 'ไม่อนุมัติ',
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
                color: '#64748B',
                flex: 1,
                align: 'start'
            },
            {
                type: 'text',
                text: stringifyFlexValue(value),
                size: 'sm',
                color: emphasize ? '#0F172A' : '#334155',
                weight: emphasize ? 'bold' : 'regular',
                wrap: true,
                flex: 1,
                align: 'end'
            }
        ]
    };
}

function buildFlexLeaveDaysRow(value) {
    return {
        type: 'box',
        layout: 'baseline',
        margin: 'sm',
        cornerRadius: '12px',
        paddingAll: '10px',
        backgroundColor: '#CFFAFE',
        contents: [
            {
                type: 'text',
                text: 'จำนวนวันลา',
                size: 'xs',
                color: '#155E75',
                flex: 2
            },
            {
                type: 'text',
                text: stringifyFlexValue(value) + ' วัน',
                size: 'sm',
                weight: 'bold',
                color: '#0F172A',
                align: 'end',
                flex: 3,
                wrap: true
            }
        ]
    };
}

function getFlexStatusMeta(status) {
    const normalizedStatus = stringifyFlexValue(status);

    if (normalizedStatus === 'อนุมัติ') {
        return {
            label: 'อนุมัติแล้ว',
            badgeColor: '#DCFCE7',
            textColor: '#166534'
        };
    }

    if (normalizedStatus === 'ไม่อนุมัติ') {
        return {
            label: 'ไม่อนุมัติ',
            badgeColor: '#FEE2E2',
            textColor: '#991B1B'
        };
    }

    return {
        label: 'รออนุมัติ',
        badgeColor: '#FEF3C7',
        textColor: '#92400E'
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const [LINE_ACCESS_TOKEN, ADMIN_GROUP_ID] = ss.getSheetByName('chatid').getRange('D2:E2').getValues()[0].map(String);
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

function getRecommendationMeta(recommendation) {
    const normalizedRecommendation = normalizeDecisionValue(recommendation);

    if (normalizedRecommendation === 'อนุมัติ') {
        return {
            label: 'อนุมัติ',
            backgroundColor: '#DCFCE7',
            labelColor: '#166534',
            valueColor: '#166534'
        };
    }

    if (normalizedRecommendation === 'ไม่อนุมัติ') {
        return {
            label: 'ไม่อนุมัติ',
            backgroundColor: '#FEE2E2',
            labelColor: '#991B1B',
            valueColor: '#991B1B'
        };
    }

    return {
        label: stringifyFlexValue(recommendation),
        backgroundColor: '#E2E8F0',
        labelColor: '#475569',
        valueColor: '#334155'
    };
}

function normalizeDecisionValue(value) {
    return stringifyFlexValue(value).replace(/\s+/g, ' ').trim();
}