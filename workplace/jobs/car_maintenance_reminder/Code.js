const CONFIG = {
    FORM_SHEET_NAME: 'Form Responses 1',
    REGISTRATION_SHEET_NAME: 'Line Registration Overall',
    LANLEK_CONFIG_SHEET_NAME: 'chatIDLanlek',
    NARONO_CONFIG_SHEET_NAME: 'chatIDNarono',
    WEB_APP_URL:
        'https://script.google.com/macros/s/AKfycbzA5TKaFjk2nbEdXQ7nu81h6os5y1m8WQ-et8jm0afWxzBHyBT1zfu8asfGNbrPAM59Wg/exec',
    LINE_PUSH_API: 'https://api.line.me/v2/bot/message/push',
    LINE_REPLY_API: 'https://api.line.me/v2/bot/message/reply',
};

/**
 * Installable trigger: run when Google Form writes a new row.
 */
function onFormSubmit(e) {
    const reminder = parseReminderFromFormEvent(e);
    if (!reminder) return;
    const companyConfig = getCompanyChannelConfig(reminder.company);
    if (!companyConfig || !companyConfig.lineAccessToken) {
        Logger.log('Company channel config missing for company: ' + reminder.company);
        return;
    }

    const employee = findEmployeeByUsername(reminder.username);
    if (!employee || !employee.userId) {
        Logger.log('Employee not found for username: ' + reminder.username);
        return;
    }

    const flex = buildReminderFlexMessage({
        reminderDate: reminder.timestamp,
        company: reminder.company,
        plate: reminder.plate,
        reminderType: reminder.reminderType,
        reminderCount: reminder.reminderCount,
        employeeName: employee.name,
        username: reminder.username,
        userId: employee.userId
    });
    Logger.log(JSON.stringify(flex));
    pushLineMessage(employee.userId, [flex], companyConfig.lineAccessToken);
}

/**
 * Handle LINE webhook and external booking payload.
 */
function doPost(e) {
    const payload = parsePostPayload(e);

    if (payload && payload.events && payload.events.length) {
        handleLineWebhookEvents(payload.events);
        return ContentService.createTextOutput('ok');
    }
    
    const p = Object.assign({}, (e && e.parameter) || {}, payload || {});
    if ((p.action || '').toString() !== 'book') {
        return ContentService.createTextOutput('invalid action').setMimeType(ContentService.MimeType.TEXT);
    }

    return ContentService
        .createTextOutput(JSON.stringify(auth))
        .setMimeType(ContentService.MimeType.JSON);

    const result = processBookingRequest(p);
    return ContentService
        .createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}


function handleLineWebhookEvents(events) {
    events.forEach(function (event) {
        if (event.type !== 'postback') return;
        const data = parseQueryString(event.postback && event.postback.data);
        if (data.action !== 'not_done') return;
        const companyConfig = getCompanyChannelConfig(data.company || '');
        if (!companyConfig || !companyConfig.lineAccessToken) {
            Logger.log('Company channel config missing for postback company: ' + (data.company || '-'));
            return;
        }

        const warningText = '⚠️ หากไม่นำรถเข้า Maintenance จะไม่สามารถรับงานได้ และบริษัทสงวนสิทธิ์ไม่จ่ายงานทุกกรณี';

        if (event.replyToken) {
            replyLineMessage(event.replyToken, [{ type: 'text', text: warningText }], companyConfig.lineAccessToken);
        }
    });
}

function processBookingRequest(params) {
    const reminderDate = pickFirst(params, ['date', 'reminderDate', 'reminder_date']);
    const company = pickFirst(params, ['company']);
    const plate = pickFirst(params, ['plate', 'licensePlate', 'ทะเบียน']);
    const reminderType = pickFirst(params, ['status', 'reminderType', 'type']);
    const username = pickFirst(params, ['username', 'userName']);
    const userId = pickFirst(params, ['userId', 'lineUserId']);

    if (!company) {
        return { ok: false, message: 'company is required' };
    }

    const companyConfig = getCompanyChannelConfig(company);
    if (!companyConfig) {
        return { ok: false, message: 'company config not found' };
    }

    const employee = findEmployeeByUsername(username);
    const employeeName = (employee && employee.name) || username || '-';
    const targetUserId = userId || ((employee && employee.userId) || '');

    sendTelegramBookingNotification(
        {
            reminderDate: reminderDate,
            company: company,
            plate: plate,
            reminderType: reminderType,
            employeeName: employeeName,
            username: username
        },
        companyConfig
    );

    if (targetUserId && companyConfig.lineAccessToken) {
        pushLineMessage(targetUserId, [
            {
                type: 'text',
                text:
                    'ยืนยันการจองเรียบร้อยแล้ว\n' +
                    'วันที่แจ้งเตือน: ' + (reminderDate || '-') + '\n' +
                    'บริษัท: ' + (company || '-') + '\n' +
                    'ทะเบียน: ' + (plate || '-') + '\n' +
                    'สถานะ: ' + (reminderType || '-')
            }
        ], companyConfig.lineAccessToken);
    }

    return {
        ok: true,
        message: 'booking processed',
        company: company,
        username: username || '',
        lineConfirmationSent: Boolean(targetUserId && companyConfig.lineAccessToken)
    };
}

function parsePostPayload(e) {
    if (!e || !e.postData || !e.postData.contents) return {};
    const raw = e.postData.contents;

    try {
        return JSON.parse(raw);
    } catch (err) {
        return parseQueryString(raw);
    }
}

function pickFirst(obj, keys) {
    for (let i = 0; i < keys.length; i += 1) {
        const v = obj[keys[i]];
        if (v !== undefined && v !== null && v !== '') return v.toString();
    }
    return '';
}

function parseReminderFromFormEvent(e) {
    if (!e || !e.range) return null;

    const sheet = e.range.getSheet();
    if (!sheet || sheet.getName() !== CONFIG.FORM_SHEET_NAME) return null;

    const row = e.range.getRow();
    const values = sheet.getRange(row, 1, 1, 10).getValues()[0];

    const timestamp = values[0];
    const company = (values[1] || '').toString().trim();

    let plate = '';
    let username = '';
    let reminderType = '';
    let reminderCount = '';

    if (company === 'ลานเหล็กลำเลียง') {
        plate = (values[2] || '').toString().trim();
        username = (values[3] || '').toString().trim();
        reminderType = (values[4] || '').toString().trim();
        reminderCount = (values[8] || '').toString().trim();
    } else if (company === 'ณโรโน่ โลจิสติกส์') {
        plate = (values[5] || '').toString().trim();
        username = (values[6] || '').toString().trim();
        reminderType = (values[7] || '').toString().trim();
        reminderCount = (values[9] || '').toString().trim();
    } else {
        return null;
    }

    return {
        timestamp: formatDateTime(timestamp),
        company: company,
        plate: plate,
        username: username,
        reminderType: reminderType,
        reminderCount: reminderCount
    };
}

function buildReminderFlexMessage(data) {
    const color = getBubbleColor(data.reminderType);
    const tone = getStatusTone(data.reminderType);
    const bookingUrl =CONFIG.WEB_APP_URL + '?username=' + encodeURIComponent(data.username || '') + '&action=book';

    return {
        type: 'flex',
        altText: 'แจ้งเตือนบำรุงรักษารถ ' + data.plate,
        contents: {
            type: 'bubble',
            size: 'mega',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: color,
                paddingAll: '18px',
                contents: [
                    {
                        type: 'text',
                        text: 'แจ้งเตือน Maintenance',
                        color: '#FFFFFF',
                        weight: 'bold',
                        size: 'xl',
                        align: 'center'
                    },
                    {
                        type: "text",
                        text: tone.subtitle,
                        color: "#FFFFFF",
                        size: "sm",
                        align: "center",
                        margin: "sm",
                        wrap: true
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                spacing: 'md',
                paddingAll: '18px',
                contents: [
                    {
                        type: 'box',
                        layout: 'vertical',
                        spacing: 'xs',
                        paddingAll: '14px',
                        cornerRadius: '12px',
                        backgroundColor: '#F7F9FC',
                        contents: [
                            {
                                type: 'text',
                                text: data.company,
                                size: 'sm',
                                color: '#5B6472',
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: data.plate,
                                size: 'xxl',
                                weight: 'bold',
                                color: '#101828',
                                wrap: true
                            },
                            {
                                type: 'text',
                                text: data.employeeName || data.username,
                                size: 'sm',
                                color: '#475467',
                                wrap: true
                            }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        spacing: 'sm',
                        contents: [
                            makeStatusChip(tone.label, color),
                        ]
                    },
                    {
                        type: 'separator',
                        margin: 'md'
                    },
                    makeInfoRow('วันที่แจ้งเตือน', data.reminderDate),
                    makeInfoRow('บริษัท', data.company),
                    makeInfoRow('พนักงาน', data.employeeName || data.username),
                    makeInfoRow('ทะเบียนรถ', data.plate),
                    makeInfoRow('สถานะ', data.reminderType),
                    makeInfoRow('แจ้งครั้งที่', data.reminderCount || '0')
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                paddingAll: '18px',
                contents: [
                    {
                        type: 'button',
                        style: 'primary',
                        color: '#2563EB',
                        action: {
                            type: 'uri',
                            label: 'จองคิวซ่อม',
                            uri: bookingUrl
                        }
                    },
                    {
                        type: 'button',
                        style: 'secondary',
                        color: '#FFFFFF',
                        action: {
                            type: 'postback',
                            label: 'ยังไม่ทำ',
                            data:
                                'action=not_done' +
                                '&company=' + encodeURIComponent(data.company || '') +
                                '&username=' + encodeURIComponent(data.username) +
                                '&plate=' + encodeURIComponent(data.plate)
                        }
                    }
                ]
            }
        }
    };

}

function getCompanyChannelConfig(company) {
    const sheetName = getCompanyConfigSheetName(company);
    if (!sheetName) return null;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return null;

    const row = sheet.getRange('A2:E2').getValues()[0];
    return {
        telegramBotToken: (row[0] || '').toString().trim(),
        telegramChatId: (row[1] || '').toString().trim(),
        lineAccessToken: (row[3] || '').toString().trim(),
        adminGroupId: (row[4] || '').toString().trim()
    };
}

function getCompanyConfigSheetName(company) {
    if (company === 'ลานเหล็กลำเลียง') return CONFIG.LANLEK_CONFIG_SHEET_NAME;
    if (company === 'ณโรโน่ โลจิสติกส์') return CONFIG.NARONO_CONFIG_SHEET_NAME;
    return '';
}

function getStatusTone(reminderType) {
    const normalized = normalizeThai(reminderType);

    if (normalized.indexOf(normalizeThai('เกินกำหนดถ่ายน้ำมันเครื่อง')) !== -1 || normalized.indexOf(normalizeThai('เกินกำหนดระยะเปลี่ยนยาง')) !== -1) {
        return {
            label: 'เกินกำหนด',
            subtitle: 'ต้องดำเนินการทันทีเพื่อไม่ให้กระทบงานและสถานะรถ',
            color: '#D32F2F'
        };
    }

    if (normalized.indexOf(normalizeThai('ใกล้ครบกำหนดถ่ายน้ำมันเครื่อง')) !== -1 || normalized.indexOf(normalizeThai('ใกล้ครบกำหนดระยะเปลี่ยนยาง')) !== -1) {
        return {
            label: 'ใกล้ครบกำหนด',
            subtitle: 'กรุณาจองคิวเข้าศูนย์เพื่อป้องกันการเกินกำหนด',
            color: '#F57C00'
        };
    }

    return {
        label: 'แจ้งเตือน',
        subtitle: 'โปรดตรวจสอบรายละเอียดการบำรุงรักษารถ',
        color: '#546E7A'
    };
}

function makeStatusChip(text, backgroundColor) {
    return {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        cornerRadius: '999px',
        backgroundColor: backgroundColor,
        paddingTop: '8px',
        paddingBottom: '8px',
        paddingStart: '12px',
        paddingEnd: '12px',
        contents: [
            {
                type: 'text',
                text: text,
                color: '#FFFFFF',
                size: 'xs',
                weight: 'bold',
                align: 'center',
                wrap: true
            }
        ]
    };
}

function makeInfoRow(label, value) {
    return {
        type: 'box',
        layout: 'baseline',
        spacing: 'md',
        contents: [
            {
                type: 'text',
                text: label,
                color: '#667085',
                size: 'sm',
                flex: 5,
                wrap: true
            },
            {
                type: 'text',
                text: value || '-',
                color: '#101828',
                size: 'sm',
                flex: 7,
                weight: 'bold',
                wrap: true
            }
        ]
    };
}

function getBubbleColor(reminderType) {
    const normalized = normalizeThai(reminderType);

    const orangeKeywords = [
        'ใกล้ครบกำหนดถ่ายน้ำมันเครื่อง',
        'ใกล้ครบกำหนดระยะเปลี่ยนยาง'
    ];
    const redKeywords = [
        'เกินกำหนดถ่ายน้ำมันเครื่อง',
        'เกินกำหนดระยะเปลี่ยนยาง'
    ];

    if (containsAny(normalized, redKeywords)) return '#D32F2F';
    if (containsAny(normalized, orangeKeywords)) return '#F57C00';
    return '#546E7A';
}

function containsAny(text, keywords) {
    const t = normalizeThai(text);
    return keywords.some(function (k) {
        return t.indexOf(normalizeThai(k)) !== -1;
    });
}

function normalizeThai(text) {
    return (text || '')
        .toString()
        .replace(/\s+/g, '')
        .trim();
}

function findEmployeeByUsername(username) {
    if (!username) return null;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.REGISTRATION_SHEET_NAME);
    if (!sheet) return null;

    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return null;

    const values = sheet.getRange(1, 1, lastRow, 3).getValues();
    const target = username.toString().trim().toLowerCase();

    for (let i = 0; i < values.length; i += 1) {
        const rowUsername = (values[i][0] || '').toString().trim().toLowerCase();
        if (rowUsername === target) {
            return {
                username: rowUsername,
                name: (values[i][1] || '').toString().trim(),
                userId: (values[i][2] || '').toString().trim()
            };
        }
    }

    return null;
}

function pushLineMessage(userId, messages, lineAccessToken) {
    if (!lineAccessToken) {
        throw new Error('Missing LINE access token');
    }

    const payload = {
        to: userId,
        messages: messages
    };

    UrlFetchApp.fetch(CONFIG.LINE_PUSH_API, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + lineAccessToken
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    });
}

function replyLineMessage(replyToken, messages, lineAccessToken) {
    if (!lineAccessToken) {
        throw new Error('Missing LINE access token');
    }

    const payload = {
        replyToken: replyToken,
        messages: messages
    };

    UrlFetchApp.fetch(CONFIG.LINE_REPLY_API, {
        method: 'post',
        contentType: 'application/json',
        headers: {
            Authorization: 'Bearer ' + lineAccessToken
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    });
}

function sendTelegramBookingNotification(data, companyConfig) {
    if (!companyConfig || !companyConfig.telegramBotToken || !companyConfig.telegramChatId) {
        Logger.log('Missing Telegram config, skip sending notification');
        return;
    }

    const url = 'https://api.telegram.org/bot' + companyConfig.telegramBotToken + '/sendMessage';
    const text =
        'มีการจองคิว Maintenance\n' +
        'วันที่แจ้งเตือน: ' + (data.reminderDate || '-') + '\n' +
        'บริษัท: ' + (data.company || '-') + '\n' +
        'ทะเบียน: ' + (data.plate || '-') + '\n' +
        'สถานะ: ' + (data.reminderType || '-') + '\n' +
        'พนักงาน: ' + (data.employeeName || '-') + '\n' +
        'username: ' + (data.username || '-');

    UrlFetchApp.fetch(url, {
        method: 'post',
        payload: {
            chat_id: companyConfig.telegramChatId,
            text: text
        },
        muteHttpExceptions: true
    });
}

function parseQueryString(query) {
    const out = {};
    if (!query) return out;

    query.split('&').forEach(function (pair) {
        const chunks = pair.split('=');
        const key = decodeURIComponent(chunks[0] || '');
        const value = decodeURIComponent((chunks[1] || '').replace(/\+/g, ' '));
        if (key) out[key] = value;
    });

    return out;
}

function formatDateTime(value) {
    if (!value) return '-';

    const date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
    if (isNaN(date.getTime())) return value.toString();

    return Utilities.formatDate(date, 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
}


function testformSubmit() {
    let formObject = {
        range: {
            getSheet: function () {
                return {
                    getName: function () {
                        return 'Form Responses 1';
                    },
                    getRange: function (row, col, numRows, numCols) {
                        return {
                            getValues: function () {
                                return [[new Date(), 'ลานเหล็กลำเลียง', 'กข1234', 'admin_001', 'ใกล้ครบกำหนดถ่ายน้ำมันเครื่อง', '', '', '', '2', '']];
                            }
                        };
                    }
                };
            },
            getRow: function () {
                return 2;
            }
        },
        values: [new Date(), 'ลานเหล็กลำเลียง', 'กข1234', 'john_doe', 'ใกล้ครบกำหนดถ่ายน้ำมันเครื่อง', '', '', '', '2', '']
    }
    onFormSubmit(formObject);
}