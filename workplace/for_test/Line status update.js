function onFormSubitForLineStatusUpdate(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chatConfig = getChatConfig(ss);
    const LINE_ACCESS_TOKEN = chatConfig.lineAccessToken;
    const ADMIN_GROUP_ID = chatConfig.adminGroupId;
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
    const COL_LEAVE_REASON = 16; // P
    const COL_SYSTEM_RECOMMEND = 22; // V
    let uuid = Utilities.getUuid();
    // save uuid ไว้ในคอลัมน์ที่ซ่อนอยู่ เพื่อใช้เป็น token ในการอัปเดตสถานะผ่าน Line
    sh.getRange(rowIndex, COL_UUID).setValue(uuid);
    const message = buildLeaveApprovalFlexMessage({
        rowIndex: rowIndex,
        employeeName: submitData[COL_NAME - 1],
        plate: submitData[COL_PLATE - 1],
        leaveType: submitData[COL_TYPE - 1],
        leaveReason: submitData[COL_LEAVE_REASON - 1],
        startDate: submitData[COL_START - 1],
        endDate: submitData[COL_END - 1],
        jobType: submitData[COL_JOB_TYPE - 1],
        leaveDays: submitData[COL_DAYS - 1],
        status: submitData[COL_STATUS - 1] || 'รออนุมัติ',
        systemRecommend: submitData[COL_SYSTEM_RECOMMEND - 1],
        companyName: chatConfig.companyName,
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
    const recommendationMeta = getRecommendationMeta(payload.systemRecommend);
    const showActions = payload.showActions !== false;
    const showRecommendation = showActions;
    const displayStatus = showActions ? payload.status : getDisplayStatusForFlex(payload.status);
    const statusMeta = getFlexStatusMeta(displayStatus);
    const companyName = getDisplayCompanyName(payload.companyName);
    const flexTitle = showActions ? `แจ้งการลางาน ${companyName}` : `ผลการอนุมัติการลา ${companyName}`;
    const altTextPrefix = showActions ? `แจ้งการลางาน ${companyName}` : `ผลการอนุมัติการลา ${companyName}`;
    const footerContents = [];
    const bodyContents = [
        {
            type: 'box',
            layout: 'vertical',
            paddingAll: '16px',
            cornerRadius: '18px',
            backgroundColor: '#0F766E',
            contents: [
                {
                    type: 'text',
                    text: flexTitle,
                    weight: 'bold',
                    size: 'lg',
                    color: '#FFFFFF',
                    wrap: true
                },
                {
                    type: 'text',
                    text: payload.employeeName,
                    size: showActions ? 'xl' : 'sm',
                    weight: 'bold',
                    color: '#FFFFFF',
                    margin: 'sm',
                    wrap: true,
                    adjustMode: 'shrink-to-fit'
                },
                {
                    type: 'text',
                    text: stringifyFlexValue(payload.leaveType),
                    size: 'sm',
                    color: '#CCFBF1',
                    margin: 'sm',
                    wrap: true
                }
            ]
        },
        {
            type: 'box',
            layout: 'vertical',
            spacing: showActions ? 'sm' : 'md',
            paddingAll: showActions ? '12px' : '16px',
            cornerRadius: '18px',
            backgroundColor: statusMeta.badgeColor,
            contents: [
                {
                    type: 'box',
                    layout: 'vertical',
                    paddingStart: '10px',
                    paddingEnd: '10px',
                    paddingTop: '5px',
                    paddingBottom: '5px',
                    cornerRadius: '999px',
                    backgroundColor: statusMeta.accentColor,
                    contents: [
                        {
                            type: 'text',
                            text: statusMeta.heading,
                            size: 'xs',
                            weight: 'bold',
                            color: statusMeta.accentTextColor,
                            align: 'center'
                        }
                    ]
                },
                {
                    type: 'text',
                    text: 'สถานะการอนุมัติ',
                    size: 'sm',
                    color: statusMeta.textColor,
                    weight: 'bold',
                    align: 'center'
                },
                {
                    type: 'text',
                    text: statusMeta.label,
                    size: showActions ? 'md' : 'xl',
                    weight: 'bold',
                    color: statusMeta.textColor,
                    margin: 'sm',
                    adjustMode: 'shrink-to-fit',
                    align: 'center',
                },
                {
                    type: 'text',
                    text: showActions ? 'รอผู้อนุมัติดำเนินการ' : 'ผลการอนุมัติจากผู้ดูแลถูกอัปเดตแล้ว',
                    size: showActions ? 'xs' : 'sm',
                    color: statusMeta.textColor,
                    wrap: true,
                    align: 'center',

                }
            ]
        },
        {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '12px',
            cornerRadius: '16px',
            backgroundColor: '#ECFDF5',
            contents: [
                buildFlexHighlightBlock('เหตุผลการลา', payload.leaveReason)
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
                    text: 'สรุปคำขอ',
                    size: 'sm',
                    weight: 'bold',
                    color: '#0F172A'
                },
                buildFlexDetailRow('พนักงาน', payload.employeeName),
                buildFlexDetailRow('วันที่แจ้ง', payload.notifyDate),
                buildFlexDetailRow('ช่วงลา', `${stringifyFlexValue(payload.startDate)} - ${stringifyFlexValue(payload.endDate)}`),
                buildFlexDetailRow('จำนวนวัน', `${stringifyFlexValue(payload.leaveDays)} วัน`, true),
                buildFlexDetailRow('ทะเบียนรถ', payload.plate)
            ]
        }
    ];

    if (showActions) {
        footerContents.push(
            {
                type: 'button',
                style: 'primary',
                color: '#0F9D58',
                height: 'md',
                action: {
                    type: 'postback',
                    label: 'อนุมัติ',
                    data: payload.approveData,
                    displayText: `✅ อนุมัติ การลาของ ${payload.employeeName}`
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
                    displayText: `❌ ไม่อนุมัติ การลาของ ${payload.employeeName}`
                }
            }
        );
    }

    if (showRecommendation) {
        bodyContents.push({
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
        });
    }

    bodyContents.push({
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
            {
                type: 'text',
                text: showActions ? 'ตรวจสอบและเลือกผลการอนุมัติได้จากปุ่มด้านล่าง' : 'ระบบได้อัปเดตผลการอนุมัติใบลาของคุณแล้ว',
                size: 'xs',
                color: '#64748B',
                wrap: true
            }
        ]
    });

    return {
        type: 'flex',
        altText: `${altTextPrefix}: ${payload.employeeName}`,
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
                contents: bodyContents
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '16px',
                contents: footerContents
            }
        }
    };
}

function buildRegistrationSuccessFlexMessage(payload) {
    const companyName = getDisplayCompanyName(payload.companyName);

    return {
        type: 'flex',
        altText: `ลงทะเบียนสำเร็จ ${companyName}: ${payload.employeeName}`,
        contents: {
            type: 'bubble',
            size: 'mega',
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '16px',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        paddingAll: '16px',
                        cornerRadius: '18px',
                        backgroundColor: '#0F766E',
                        contents: [
                            {
                                type: 'text',
                                text: 'ลงทะเบียนสำเร็จ',
                                size: 'lg',
                                weight: 'bold',
                                color: '#FFFFFF'
                            },
                            {
                                type: 'text',
                                text: companyName,
                                size: 'xs',
                                color: '#CCFBF1',
                                margin: 'sm',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: payload.employeeName,
                                size: 'sm',
                                color: '#CCFBF1',
                                wrap: true
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'sm',
                        paddingAll: '12px',
                        cornerRadius: '16px',
                        backgroundColor: '#F8FAFC',
                        contents: [
                            buildFlexDetailRow('รหัสพนักงาน', payload.employeeId),
                            {
                                type: 'text',
                                text: 'ระบบจะแจ้งผลการลาให้คุณทันทีเมื่อมีการอนุมัติหรือไม่อนุมัติ',
                                size: 'sm',
                                color: '#334155',
                                wrap: true,
                                margin: 'sm'
                            }
                        ]
                    }
                ]
            }
        }
    };
}

function buildFlexDetailRow(label, value, emphasize) {
    return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
            {
                type: 'text',
                text: label,
                size: 'sm',
                color: '#64748B',
                flex: 2,
                align: 'start'
            },
            {
                type: 'text',
                text: stringifyFlexValue(value),
                size: 'sm',
                color: emphasize ? '#0F172A' : '#334155',
                weight: emphasize ? 'bold' : 'regular',
                wrap: true,
                flex: 3,
                align: 'end'
            }
        ]
    };
}

function buildFlexHighlightBlock(label, value) {
    return {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        contents: [
            {
                type: 'text',
                text: label,
                size: 'xs',
                color: '#0F766E',
                weight: 'bold'
            },
            {
                type: 'text',
                text: stringifyFlexValue(value),
                size: 'sm',
                color: '#0F172A',
                weight: 'bold',
                wrap: true
            }
        ]
    };
}

function getFlexStatusMeta(status) {
    const normalizedStatus = normalizeDecisionValue(status);
    const isAutoStatus = normalizedStatus.indexOf('(auto)') !== -1;
    const decisionType = getDecisionType(normalizedStatus);

    if (decisionType === 'approve') {
        return {
            label: isAutoStatus ? 'อนุมัติ (auto)' : 'อนุมัติแล้ว',
            heading: isAutoStatus ? 'AUTO APPROVED' : 'APPROVED',
            badgeColor: '#D1FAE5',
            textColor: '#14532D',
            accentColor: '#166534',
            accentTextColor: '#ECFDF5'
        };
    }

    if (decisionType === 'reject') {
        return {
            label: isAutoStatus ? 'ไม่อนุมัติ (auto)' : 'คำขอไม่ผ่านอนุมัติ',
            heading: isAutoStatus ? 'AUTO REJECTED' : 'REJECTED',
            badgeColor: '#FEE2E2',
            textColor: '#7F1D1D',
            accentColor: '#B91C1C',
            accentTextColor: '#FEF2F2'
        };
    }

    return {
        label: 'รออนุมัติ',
        heading: 'PENDING',
        badgeColor: '#FEF3C7',
        textColor: '#92400E',
        accentColor: '#D97706',
        accentTextColor: '#FFFBEB'
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

// Logger = BetterLog.useSpreadsheet();
function doPost(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chatConfig = getChatConfig(ss);
    const LINE_ACCESS_TOKEN = chatConfig.lineAccessToken;
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
        webhook.showLoading();
        let emp_id = message.slice(1, -1).trim(); // ดึงข้อความระหว่าง # และ #
        // ทำการค้นหาข้อมูลพนักงานจาก emp_id ในสเปรดชีต
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sh = ss.getSheetByName('Line Registration');
        const data = sh.getDataRange().getDisplayValues();
        const header = data[0];
        const empIdColIndex = 0
        const nameColIndex = 1
        const uidColIndex = 2
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][empIdColIndex]).toLowerCase() == emp_id) {
                // พบข้อมูลพนักงานที่ตรงกับ emp_id
                const employeeName = data[i][nameColIndex];
                const lineUid = webhook.userId;
                // บันทึก Line UID ลงในสเปรดชีต
                sh.getRange(i + 1, uidColIndex + 1).setValue(lineUid);
                // ตอบกลับข้อความยืนยันการลงทะเบียน
                webhook.replyToline([
                    buildRegistrationSuccessFlexMessage({
                        employeeName: employeeName,
                        employeeId: emp_id,
                        companyName: getChatConfig(ss).companyName
                    })
                ]);
                return webhook.ok;
            }
        }
        // หากไม่พบ emp_id ที่ตรงกัน ให้ตอบกลับข้อความแจ้งว่าไม่พบข้อมูล
        webhook.replyToline(['ไม่พบข้อมูลพนักงานที่ตรงกับรหัส ' + emp_id + '. กรุณาตรวจสอบและลองใหม่อีกครั้ง']);
        return webhook.ok;
    }
}

function handleLeaveApprovalPostback(webhook) {
    let postback = webhook.postback;
    Logger.log('Received postback: ' + JSON.stringify(postback));
    let data = parsePostbackData(postback);
    let action = data.action;
    let uuid = data.uuid;
    let username = data.id;
    Logger.log('Received postback with action: ' + action + ', uuid: ' + uuid + ', username: ' + username);
    if (!action || !uuid || !username) {
        webhook.replyToline(['ข้อมูลไม่ครบถ้วนสำหรับการดำเนินการนี้']);
        return webhook.ok;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME);
    const registrationSheet = ss.getSheetByName('Line Registration');
    const registrationData = registrationSheet.getDataRange().getValues();
    const registrationHeader = registrationData[0];
    let userID = null;
    for (let i = 1; i < registrationData.length; i++) {
        if (String(registrationData[i][0]).toLowerCase() === username.toLowerCase()) {
            userID = registrationData[i][2];
            break;
        }
    }
    const dataRange = sh.getDataRange().getValues();
    const header = dataRange[0];
    const uuidColIndex = 12;
    const statusColIndex = 9;
    const approvedAtColIndex = 11;
    const usernameColIndex = 6;
    const approverUserIdColIndex = 13;
    const approverDisplayNameColIndex = 14;
    const chatConfig = getChatConfig(ss);
    const lineAccessToken = chatConfig.lineAccessToken;
    for (let i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][uuidColIndex]) === uuid) {
            const row = dataRange[i];
            const currentStatus = normalizeDecisionValue(row[statusColIndex]);
            let updatedStatus = null;

            if (isFinalLeaveStatus(currentStatus)) {
                const approvedAtText = formatApprovalTimestamp(row[approvedAtColIndex]);
                const approverDisplayName = stringifyFlexValue(row[approverDisplayNameColIndex]);
                const approverText = approverDisplayName !== '-' ? approverDisplayName : 'ผู้อนุมัติคนก่อนหน้า';
                const duplicateMessage = approvedAtText
                    ? `รายการนี้ถูก${currentStatus}ไปแล้วโดย ${approverText} เมื่อ ${approvedAtText} และไม่สามารถดำเนินการซ้ำได้`
                    : `รายการนี้ถูก${currentStatus}ไปแล้วโดย ${approverText} และไม่สามารถดำเนินการซ้ำได้`;
                webhook.replyToline([duplicateMessage]);
                return webhook.ok;
            }

            if (action === 'approve') {
                updatedStatus = 'อนุมัติ';
                sh.getRange(i + 1, statusColIndex + 1).setValue(updatedStatus);
                webhook.replyToline(['คุณได้อนุมัติการลาเรียบร้อยแล้ว']);
            } else if (action === 'reject') {
                updatedStatus = 'ไม่อนุมัติ';
                sh.getRange(i + 1, statusColIndex + 1).setValue(updatedStatus);
                webhook.replyToline(['คุณได้ไม่อนุมัติการลาเรียบร้อยแล้ว']);
            } else {
                webhook.replyToline(['การดำเนินการไม่ถูกต้อง']);
                return webhook.ok;
            }

            if (updatedStatus) {
                const approvedAt = new Date();
                const approverUserId = webhook.userId || '';
                let approverDisplayName = '';

                try {
                    const profile = webhook.profile();
                    approverDisplayName = profile && profile.displayName ? profile.displayName : '';
                } catch (error) {
                    Logger.log('Unable to load approver profile: ' + error.message);
                }

                sh.getRange(i + 1, approvedAtColIndex + 1).setValue(approvedAt);
                sh.getRange(i + 1, approverUserIdColIndex + 1).setValue(approverUserId);
                sh.getRange(i + 1, approverDisplayNameColIndex + 1).setValue(approverDisplayName);
            }

            if (updatedStatus && userID && lineAccessToken) {
                const employeeMessage = buildLeaveApprovalFlexMessage({
                    rowIndex: i + 1,
                    employeeName: row[1],
                    plate: row[2],
                    leaveType: row[3],
                    leaveReason: row[15],
                    startDate: row[4],
                    endDate: row[5],
                    jobType: row[8],
                    leaveDays: row[7],
                    status: updatedStatus,
                    systemRecommend: row[19],
                    companyName: chatConfig.companyName,
                    notifyDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'),
                    showActions: false
                });
                LineBotWebhook.push(userID, lineAccessToken, [employeeMessage]);
            }

            return webhook.ok;
        }
    }
    webhook.replyToline(['ไม่พบข้อมูลการลาที่เกี่ยวข้องกับการดำเนินการนี้']);
    return webhook.ok;
}

function parsePostbackData(postbackData) {
    return String(postbackData.data || '')
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
    const lineAccessToken = getChatConfig(ss).lineAccessToken;

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

function getDecisionType(value) {
    const normalizedValue = normalizeDecisionValue(value);

    if (normalizedValue.indexOf('ไม่อนุมัติ') === 0) {
        return 'reject';
    }

    if (normalizedValue.indexOf('อนุมัติ') === 0) {
        return 'approve';
    }

    return '';
}

function isFinalLeaveStatus(status) {
    return Boolean(getDecisionType(status));
}

function getAutoStatusFromRecommendation(recommendation) {
    const decisionType = getDecisionType(recommendation);

    if (decisionType === 'approve') {
        return 'อนุมัติ (auto)';
    }

    if (decisionType === 'reject') {
        return 'ไม่อนุมัติ (auto)';
    }

    return '';
}

function getDisplayStatusForFlex(status) {
    return normalizeDecisionValue(status).replace(/\s*\(auto\)$/i, '');
}

function formatApprovalTimestamp(value) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
        return '';
    }
    return Utilities.formatDate(value, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
}

function getChatConfig(ss) {
    const sheet = ss.getSheetByName('chatid');
    const row = sheet ? sheet.getRange('D2:G2').getValues()[0] : [];

    return {
        lineAccessToken: String(row[0] || ''),
        adminGroupId: String(row[1] || ''),
        companyName: String(row[3] || '').trim()
    };
}

function getDisplayCompanyName(companyName) {
    const normalizedCompanyName = String(companyName || '').trim();
    return normalizedCompanyName || 'บริษัท';
}

function getNumericLeaveDays(value) {
    if (typeof value === 'number') {
        return value;
    }

    const normalizedValue = normalizeDecisionValue(value);
    const matchedValue = normalizedValue.match(/\d+(?:\.\d+)?/);

    if (!matchedValue) {
        return NaN;
    }

    return parseFloat(matchedValue[0]);
}

function shouldUseShortAutoApprovalWindow(leaveType, leaveDays) {
    const normalizedLeaveType = normalizeDecisionValue(leaveType);
    const numericLeaveDays = getNumericLeaveDays(leaveDays);
    const isPersonalLeave = normalizedLeaveType.indexOf('ลากิจ') === 0;
    const isSickLeave = normalizedLeaveType.indexOf('ลาป่วย') === 0;

    if (!(isPersonalLeave || isSickLeave)) {
        return false;
    }

    return !isNaN(numericLeaveDays) && numericLeaveDays <= 1;
}

function getAutoUpdateCutoffTime(now, leaveType, leaveDays) {
    const waitMinutes = shouldUseShortAutoApprovalWindow(leaveType, leaveDays) ? 15 : 60;
    return now.getTime() - (waitMinutes * 60 * 1000);
}

function autoSetStatus() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME);
    const registrationSheet = ss.getSheetByName('Line Registration');
    const chatConfig = getChatConfig(ss);
    const lineAccessToken = chatConfig.lineAccessToken;

    if (!sh) {
        return;
    }

    const dataRange = sh.getDataRange().getValues();

    if (dataRange.length <= 1) {
        return;
    }

    const registrationMap = {};
    const registrationData = registrationSheet ? registrationSheet.getDataRange().getValues() : [];
    const now = new Date();
    const submittedAtColIndex = 0;
    const employeeNameColIndex = 1;
    const plateColIndex = 2;
    const leaveTypeColIndex = 3;
    const startDateColIndex = 4;
    const endDateColIndex = 5;
    const usernameColIndex = 6;
    const leaveDaysColIndex = 7;
    const jobTypeColIndex = 8;
    const statusColIndex = 9;
    const approvedAtColIndex = 11;
    const leaveReasonColIndex = 15;
    const approverUserIdColIndex = 13;
    const approverDisplayNameColIndex = 14;
    const systemRecommendColIndex = 19;

    for (let i = 1; i < registrationData.length; i++) {
        const employeeId = normalizeDecisionValue(registrationData[i][0]).toLowerCase();
        const lineUserId = registrationData[i][2];

        if (employeeId && lineUserId) {
            registrationMap[employeeId] = lineUserId;
        }
    }

    for (let i = 1; i < dataRange.length; i++) {
        const row = dataRange[i];
        const submittedAt = row[submittedAtColIndex];
        const currentStatus = row[statusColIndex];
        const approvedAt = row[approvedAtColIndex];
        const autoStatus = getAutoStatusFromRecommendation(row[systemRecommendColIndex]);
        const cutoffTime = getAutoUpdateCutoffTime(now, row[leaveTypeColIndex], row[leaveDaysColIndex]);

        if (!(submittedAt instanceof Date) || isNaN(submittedAt.getTime())) {
            continue;
        }

        if (submittedAt.getTime() > cutoffTime) {
            continue;
        }

        if (isFinalLeaveStatus(currentStatus) || (approvedAt instanceof Date && !isNaN(approvedAt.getTime()))) {
            continue;
        }

        if (!autoStatus) {
            continue;
        }

        const sheetRowIndex = i + 1;
        const employeeId = normalizeDecisionValue(row[usernameColIndex]).toLowerCase();
        const registeredLineUserId = registrationMap[employeeId] || '';

        sh.getRange(sheetRowIndex, statusColIndex + 1).setValue(autoStatus);
        sh.getRange(sheetRowIndex, approvedAtColIndex + 1).setValue(now);
        sh.getRange(sheetRowIndex, approverUserIdColIndex + 1).setValue('AUTO_TRIGGER');
        sh.getRange(sheetRowIndex, approverDisplayNameColIndex + 1).setValue('ระบบอัตโนมัติ');

        if (registeredLineUserId && lineAccessToken) {
            const employeeMessage = buildLeaveApprovalFlexMessage({
                rowIndex: sheetRowIndex,
                employeeName: row[employeeNameColIndex],
                plate: row[plateColIndex],
                leaveType: row[leaveTypeColIndex],
                leaveReason: row[leaveReasonColIndex],
                startDate: row[startDateColIndex],
                endDate: row[endDateColIndex],
                jobType: row[jobTypeColIndex],
                leaveDays: row[leaveDaysColIndex],
                status: autoStatus,
                systemRecommend: row[systemRecommendColIndex],
                companyName: chatConfig.companyName,
                notifyDate: Utilities.formatDate(now, 'Asia/Bangkok', 'dd/MM/yyyy'),
                showActions: false
            });
            LineBotWebhook.push(registeredLineUserId, lineAccessToken, [employeeMessage]);
        }
    }
}