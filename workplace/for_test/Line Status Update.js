const SHEET_NAME = 'Form Responses 1';
function onFormSubitForLineStatusUpdate(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const chatConfig = getChatConfig(ss);
    const LINE_ACCESS_TOKEN = chatConfig.lineAccessToken;
    const ADMIN_GROUP_ID = chatConfig.adminGroupId;
    let range = e.range;
    let sh = range.getSheet();
    if (sh.getName() !== SHEET_NAME) return;
    let rowIndex = range.getRow();
    // let sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1')
    // let rowIndex = 50
    let submitData = sh.getRange(rowIndex, 1, 1, sh.getLastColumn()).getValues()[0];
    const COL_COMPANY = 2; // B
    const COL_NAME = 3; // C
    const COL_TYPE = 4; // D
    const COL_LEAVE_REASON = 5; // E
    const COL_USERNAME = 6; // F
    const COL_START_DATE = 7; // G
    const COL_START_TIME = 8; // H
    const COL_END_DATE = 9; // I
    const COL_END_TIME = 10; // J
    const COL_EMP_ID = 11; // K
    const COL_DAYS = 12; // L 
    const COL_STATUS = 13; // M
    const COL_REASON = 14; // N
    const COL_UUID = 15; // O
    const COL_DATE_APPROVED = 18; // R
    const dateApprove = new Date();
    sh.getRange(rowIndex, COL_DATE_APPROVED).setValue(dateApprove);
    const flex_data = {
        rowIndex: rowIndex,
        employeeName: submitData[COL_NAME - 1],
        leaveType: submitData[COL_TYPE - 1],
        leaveReason: submitData[COL_LEAVE_REASON - 1],
        startDate: submitData[COL_START_DATE - 1],
        startTime: submitData[COL_START_TIME - 1] != "" ? Utilities.formatDate(submitData[COL_START_TIME - 1], "GMT+7", "HH:mm") : "",
        endDate: submitData[COL_END_DATE - 1],
        endTime: submitData[COL_END_TIME - 1]  != "" ? Utilities.formatDate(submitData[COL_END_TIME - 1], "GMT+7", "HH:mm") : "",
        leaveDays: submitData[COL_DAYS - 1],
        status: submitData[COL_STATUS - 1] || 'รออนุมัติ',
        reason: submitData[COL_REASON - 1],
        dateApproved: dateApprove,
        companyName: submitData[COL_COMPANY - 1],
        notifyDate: Utilities.formatDate(dateApprove, 'Asia/Bangkok', 'dd/MM/yyyy'),
        username: submitData[COL_USERNAME - 1],
        showActions: true,
    }
    const message = buildLeaveApprovalFlexMessage(flex_data);
    // send Line to admin
    if (LINE_ACCESS_TOKEN && ADMIN_GROUP_ID) {
        LineBotWebhook.push(ADMIN_GROUP_ID, LINE_ACCESS_TOKEN, [message]);
        Utilities.sleep(2000); // delay 1 second before sending to user
        sendLeaveStatusToUser(flex_data);
    }
}

function buildLeaveApprovalFlexMessage(payload) {
    const recommendationMeta = getRecommendationMeta(payload.status);
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
                    text: 'เหตุผล: ' + (payload.reason || '---'),
                    size: showActions ? 'md' : 'lg',
                    color: '#64748B',
                    wrap: true,
                    margin: 'sm',
                    weight: 'regular',
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
                buildFlexDetailRow('ตั้งแต่', `${stringifyFlexValue(payload.startDate)} ${stringifyFlexValue(payload.startTime)}`),
                buildFlexDetailRow('จนถึง', `${stringifyFlexValue(payload.endDate)} ${stringifyFlexValue(payload.endTime)}`),
                buildFlexDetailRow('จำนวนวัน', `${stringifyFlexValue(payload.leaveDays)} วัน`, true)
            ]
        }
    ];

    // if (showActions) {
    //     footerContents.push(
    //         {
    //             type: 'button',
    //             style: 'primary',
    //             color: '#0F9D58',
    //             height: 'md',
    //             action: {
    //                 type: 'postback',
    //                 label: 'อนุมัติ',
    //                 data: payload.approveData,
    //                 displayText: `✅ อนุมัติ การลาของ ${payload.employeeName}`
    //             }
    //         },
    //         {
    //             type: 'button',
    //             style: 'link',
    //             color: '#B91C1C',
    //             height: 'md',
    //             action: {
    //                 type: 'postback',
    //                 label: 'ไม่อนุมัติ',
    //                 data: payload.rejectData,
    //                 displayText: `❌ ไม่อนุมัติ การลาของ ${payload.employeeName}`
    //             }
    //         }
    //     );
    // }

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
                    text: 'ผลการลา',
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

    // bodyContents.push({
    //     type: 'box',
    //     layout: 'baseline',
    //     spacing: 'sm',
    //     contents: [
    //         {
    //             type: 'text',
    //             text: showActions ? 'ข้อมูลการลา' : 'ระบบได้อัปเดตผลการอนุมัติใบลาของคุณแล้ว',
    //             size: 'xs',
    //             color: '#64748B',
    //             wrap: true
    //         }
    //     ]
    // });

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
            // footer: {
            //     type: 'box',
            //     layout: 'vertical',
            //     spacing: 'md',
            //     paddingAll: '16px',
            //     contents: footerContents
            // }
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
            if (events === 'message' && webhook.messageType === 'text') {
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


function sendLeaveStatusToUser(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(SHEET_NAME);
    const registrationSheet = ss.getSheetByName('Line Registration');
    const registrationData = registrationSheet.getDataRange().getValues();
    const registrationHeader = registrationData[0];
    let userID = null;
    let username = payload.username.toLowerCase();
    for (let i = 1; i < registrationData.length; i++) {
        if (String(registrationData[i][0]).toLowerCase() === username) {
            userID = registrationData[i][2];
            break;
        }
    }
    // const dataRange = sh.getDataRange().getValues();
    // const header = dataRange[0];
    // const uuidColIndex = 13;
    // const statusColIndex = 10;
    // const approvedAtColIndex = 12;
    // const usernameColIndex = 6;
    // const approverUserIdColIndex = 14;
    // const approverDisplayNameColIndex = 15;
    let chatConfig = getChatConfig(ss);
    let lineAccessToken = chatConfig.lineAccessToken;
    let currentStatus = normalizeDecisionValue(payload.status);

    if (currentStatus && userID && lineAccessToken) {
        const employeeMessage = buildLeaveApprovalFlexMessage({
            employeeName: payload.employeeName,
            leaveType: payload.leaveType,
            leaveReason: payload.leaveReason,
            startDate: payload.startDate,
            startTime: payload.startTime,
            endDate: payload.endDate,
            endTime: payload.endTime,
            jobType: payload.jobType,
            leaveDays: payload.leaveDays,
            status: currentStatus,
            reason: payload.reason,
            systemRecommend: payload.systemRecommend,
            companyName: chatConfig.companyName,
            notifyDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'),
            showActions: false
        });
        LineBotWebhook.push(userID, lineAccessToken, [employeeMessage]);
    }

    return;
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

function getDisplayStatusForFlex(status) {
    return normalizeDecisionValue(status).replace(/\s*\(auto\)$/i, '');
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


function testBuildFlexMessage() {
    const row = 2
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const testData = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];
    const testPayload = {
        employeeName: testData[2],
        leaveType: testData[3],
        leaveReason: testData[4],
        startDate: testData[6],
        startTime: testData[7] != "" ? Utilities.formatDate(testData[7], "GMT+7", "HH:mm") : "",
        endDate: testData[8],
        endTime: testData[9] != "" ? Utilities.formatDate(testData[9], "GMT+7", "HH:mm") : "",
        jobType: '',
        leaveDays: testData[11],
        status: testData[12] || 'รออนุมัติ',
        reason: testData[13],
        systemRecommend: '',
        companyName: testData[1],
        notifyDate: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'),
        showActions: true,
    };

    const flexMessage = buildLeaveApprovalFlexMessage(testPayload);
    Logger.log(JSON.stringify(flexMessage));
}