function onSubmit(e) {
    let lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
        Logger.log("Script is already running. Exiting.");
        return;
    }
    try {
        // Process the form submission
        processFormSubmission(e);
    } catch (error) {
        Logger.log("Error processing form submission: " + error.message);
    } finally {
        lock.releaseLock();
    }
}

function onStatusEdit(e) {
    let range = e.range;
    if (range.getColumn() !== 7) return; // Only process edits in column 6
    if (range.getSheet().getName() !== 'ลงทะเบียนผู้ใช้งาน') return; // Only process edits in the specified sheet
    let value = range.getValue();
    let uid = range.offset(0, 1).getValue(); // Assuming UID is in the next column (column 7)   
    handleUserStatusChange(value, range.getRow(), uid);
}
function processFormSubmission(e) {
    //  ประทับเวลา	วันที่ฝาก	รหัสนักเรียน	ห้อง/เลขที่	จำนวนเงินที่ฝาก  	ชื่อเจ้าหน้าที่ที่รับฝาก	หมายเหตุ (ถ้ามี)
    // duplicate data from 'การตอบแบบฟอร์ม 1' to 'สำหรับเก็บ แก้ไข ข้อมูล'
    let formData = e.values;
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('สำหรับเก็บ แก้ไข ข้อมูล');
    let lastRow = sheet.getLastRow() + 1; // Get the next empty row
    let dataToInsert = [
        new Date(), // ประทับเวลา
        formData[1], // วันที่ฝาก
        formData[2], // รหัสนักเรียน
        formData[3], // ห้อง
        formData[4], // เลขที่
        formData[5], // จำนวนเงินที่ฝาก
        formData[6], // ชื่อเจ้าหน้าที่ที่รับฝาก
        formData[7]  // หมายเหตุ (ถ้ามี)
    ];
    // Insert the data into the next empty row
    sheet.getRange(lastRow, 1, 1, dataToInsert.length).setValues([dataToInsert]);
}

function base_url() {
    return ScriptApp.getService().getUrl()
}

const { LINE_TOKEN, SCHOOL_NAME } = getSettings()
Logger = BetterLog.useSpreadsheet()
function doPost(e) {
    LineBotWebhook.init(e, LINE_TOKEN, true).forEach(webhook => {
        try {
            return handleEvent(webhook)
        } catch (e) { //with stack tracing if your exceptions bubble up to here
            e = (typeof e === 'string') ? new Error(e) : e;
            Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .', e.name || '',
                e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
            throw e;
        }
        finally {
            return webhook.ok
        }
    })
}

function getSettings() {
    return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('สำหรับตั้งค่าระบบ').getDataRange().getValues().reduce((acc, row) => {
        if (row[0] && row[1]) {
            acc[row[0].trim()] = row[1].trim();
        }
        return acc;
    }
        , { LINE_TOKEN: '', SCHOOL_NAME: '' });
}

function handleUserStatusChange(value, row, uid) {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let parent_sheet = ss.getSheetByName('ลงทะเบียนผู้ใช้งาน');
    let data = parent_sheet.getDataRange().getDisplayValues();
    let index = data.findIndex((row) => row[7] === uid);
    if (index < 0) {
        Logger.log(`User with UID ${uid} not found in the registration sheet.`);
        return;
    }
    // Update the status in the registration sheet
    let role = data[index][4] || 'Parent'; // Default to 'Parent' if role is not set
    Logger.log(row)
    let flex
    if (value === 'อนุมัติ') {
        flex = {
            type: "flex",
            altText: "การลงทะเบียนของคุณได้รับการอนุมัติ",
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "การลงทะเบียนสำเร็จ",
                            weight: "bold",
                            size: "xl",
                            color: "#FFFFFF",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#1565C0",
                    paddingAll: "15px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "✅",
                                            size: "3xl",
                                            align: "center",
                                            gravity: "center"
                                        }
                                    ],
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "#E3F2FD",
                                    cornerRadius: "100px",
                                    justifyContent: "center",
                                    alignItems: "center"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "ยินดีต้อนรับ!",
                                            weight: "bold",
                                            size: "lg",
                                            color: "#1565C0"
                                        },
                                        {
                                            type: "text",
                                            text: "การลงทะเบียนของคุณได้รับการอนุมัติแล้ว",
                                            size: "sm",
                                            wrap: true,
                                            margin: "sm"
                                        }
                                    ],
                                    margin: "sm"
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "xl"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "xl",
                            contents: [
                                {
                                    type: "text",
                                    text: SCHOOL_NAME,
                                    weight: "bold",
                                    size: "md",
                                    align: "center"
                                },
                                {
                                    type: "text",
                                    text: "คุณสามารถใช้งานระบบได้ทันที",
                                    size: "sm",
                                    color: "#555555",
                                    align: "center",
                                    margin: "md"
                                }
                            ]
                        }
                    ],
                    paddingAll: "20px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            style: "primary",
                            color: "#1565C0",
                            action: {
                                type: "postback",
                                label: "เช็คยอดเงินฝาก",
                                displayText: "เช็คยอดเงินฝาก",
                                data: "action=check_balance&role=" + role,
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#1565C0"
                    },
                    footer: {
                        separator: true
                    }
                }
            },
            quickReply: quickReply(uid,role, true, false, role === 'Parent', role === 'Parent' ? [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ]: [])
        };
    } else if (value === 'ไม่อนุมัติ') {
        flex = {
            type: "flex",
            altText: "การลงทะเบียนของคุณไม่ได้รับการอนุมัติ",
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่ได้รับการอนุมัติ",
                            weight: "bold",
                            color: "#FFFFFF",
                            size: "xl",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#E53935",
                    paddingAll: "15px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "❌",
                                            size: "3xl",
                                            align: "center",
                                            gravity: "center"
                                        }
                                    ],
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "#FFEBEE",
                                    cornerRadius: "100px",
                                    justifyContent: "center",
                                    alignItems: "center"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "ขออภัย",
                                            weight: "bold",
                                            size: "lg",
                                            color: "#E53935"
                                        },
                                        {
                                            type: "text",
                                            text: "การลงทะเบียนของคุณไม่ได้รับการอนุมัติ",
                                            size: "sm",
                                            wrap: true,
                                            margin: "sm"
                                        }
                                    ],
                                    margin: "sm"
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "xl"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "xl",
                            contents: [
                                {
                                    type: "text",
                                    text: "สิ่งที่ควรทำ",
                                    weight: "bold",
                                    size: "md"
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "📞",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "กรุณาติดต่อเจ้าหน้าที่เพื่อขอข้อมูลเพิ่มเติม",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "🔄",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "คุณสามารถลงทะเบียนใหม่ได้หลังจากแก้ไขข้อมูล",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    paddingAll: "20px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            style: "primary",
                            color: "#E53935",
                            action: {
                                type: "uri",
                                label: "ลงทะเบียนใหม่",
                                uri: "https://script.google.com/macros/s/AKfycbxW7-T4o4aHgkhuKnvVd82IdhymtV8q7lijYcIKtiPwsAbnaIlCI2oy4GZLQFNxLGi-/exec" + '?action=register_parent&uid=' + encodeURIComponent(uid)
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#E53935"
                    },
                    footer: {
                        separator: true
                    }
                }
            }
        };
    }
    LineBotWebhook.push(uid, LINE_TOKEN, [flex]);
}

function handleEvent(webhook) {
    if (webhook.eventType === 'follow') {
        webhook.showLoading();
        return checkRegister(webhook);
    }

    if (webhook.eventType === 'postback') {
        // Parse postback data more efficiently
        const data = webhook.postback.data;
        const actionMatch = data.match(/action=([^&]+)/);

        if (!actionMatch) return webhook.ok;
        webhook.showLoading();

        const action = actionMatch[1];
        const roleMatch = data.match(/role=([^&]+)/);
        const role = roleMatch ? roleMatch[1] : '';
        const stdIdMatch = data.match(/std_id=([^&]+)/);
        const std_id = stdIdMatch ? stdIdMatch[1].split(',') : [];

        switch (action) {
            case 'register_parent':
                return registerParent(webhook);
            case 'check_balance':
                return getAccountBalance(webhook, false, role);
            case 'manage_children':
                return getChildrenList(webhook);
            case 'delete_child':
                return deleteChild(webhook, std_id);
            default:
                return webhook.ok;
        }
    }

    // Exit early if not a text message
    if (webhook.eventType === 'message' || webhook.messageType === 'text') {
        return registerParent(webhook);
    }

    // Process text messages here (if needed)
    // This seems to be missing in the original code

    return webhook.ok;
}

function checkRegister(webhook) {

    let uid = webhook.userId
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let parent_sheet = ss.getSheetByName('ลงทะเบียนผู้ใช้งาน')
    let data = parent_sheet.getDataRange().getDisplayValues()
    let index = data.findIndex(row => row[7] == uid)
    if (index < 0) {
        let flex = {
            type: "flex",
            altText: "กรุณาลงทะเบียนก่อนใช้งาน",
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ยินดีต้อนรับ",
                            weight: "bold",
                            color: "#FFFFFF",
                            size: "xl",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#1565C0",
                    paddingAll: "15px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "ขอต้อนรับสู่",
                                    size: "md",
                                    color: "#555555",
                                    align: "center"
                                },
                                {
                                    type: "text",
                                    text: SCHOOL_NAME,
                                    weight: "bold",
                                    size: "lg",
                                    color: "#1565C0",
                                    align: "center",
                                    margin: "sm"
                                },
                                {
                                    type: "text",
                                    text: "ระบบธนาคารโรงเรียนอัจฉริยะ",
                                    size: "sm",
                                    color: "#555555",
                                    align: "center",
                                    margin: "md"
                                }
                            ],
                            margin: "md"
                        },
                        {
                            type: "box",
                            layout: "horizontal",
                            margin: "xl",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "📝",
                                            size: "xl",
                                            align: "center"
                                        }
                                    ],
                                    width: "50px"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "กรุณาลงทะเบียนเพื่อเริ่มใช้งานระบบ",
                                            wrap: true,
                                            size: "sm"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    paddingAll: "20px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button", style: "primary",
                            color: "#1565C0",
                            action: {
                                type: "uri",
                                label: "ลงทะเบียนผู้ปกครอง",
                                uri: 'https://script.google.com/macros/s/AKfycbxW7-T4o4aHgkhuKnvVd82IdhymtV8q7lijYcIKtiPwsAbnaIlCI2oy4GZLQFNxLGi-/exec' + '?action=register_parent&uid=' + encodeURIComponent(uid)
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#1565C0"
                    },
                    footer: {
                        separator: true
                    }
                }
            }
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    else if (data[index][5] === 'รอตรวจสอบ') {
        let flex = {
            type: "flex",
            altText: "รอการตรวจสอบ",
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "กำลังตรวจสอบข้อมูล",
                            weight: "bold",
                            color: "#FFFFFF",
                            size: "lg",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#42A5F5",
                    paddingAll: "15px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "⏳",
                                            size: "3xl",
                                            align: "center",
                                            gravity: "center"
                                        }
                                    ],
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "#BBDEFB",
                                    cornerRadius: "100px",
                                    justifyContent: "center",
                                    alignItems: "center"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "รอการตรวจสอบ",
                                            weight: "bold",
                                            size: "md",
                                            color: "#42A5F5"
                                        },
                                        {
                                            type: "text",
                                            text: "การลงทะเบียนของคุณกำลังอยู่ในขั้นตอนการตรวจสอบ",
                                            size: "sm",
                                            color: "#555555",
                                            wrap: true,
                                            margin: "sm"
                                        }
                                    ],
                                    margin: "md"
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "xl",
                            color: "#EEEEEE"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "xl",
                            contents: [
                                {
                                    type: "text",
                                    text: "ข้อควรทราบ",
                                    weight: "bold",
                                    size: "md"
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "📌",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "ระบบจะแจ้งผลการลงทะเบียนภายใน 24 ชั่วโมง",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "📱",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "กรุณาเปิดการแจ้งเตือนเพื่อรับข้อมูลข่าวสาร",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    paddingAll: "20px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ขอบคุณที่ใช้บริการ " + SCHOOL_NAME,
                            size: "xs",
                            color: "#777777",
                            align: "center"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#42A5F5"
                    },
                    footer: {
                        separator: true
                    }
                }
            }
        };
        webhook.replyToline([flex]);
        return webhook.ok;
    }
    else {
        let parent_data = data[index];
        let displayName = parent_data[1] || webhook.getProfile().displayName
        let role = parent_data[4] || 'Parent'

        let flex = {
            type: "flex",
            altText: "ยินดีต้อนรับกลับ",
            contents: {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ยินดีต้อนรับกลับ",
                            weight: "bold",
                            color: "#FFFFFF",
                            size: "xl",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#1565C0",
                    paddingAll: "15px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: `สวัสดี ${displayName}`,
                                    size: "lg",
                                    weight: "bold",
                                    color: "#1565C0",
                                    align: "center"
                                },
                                {
                                    type: "text",
                                    text: SCHOOL_NAME,
                                    size: "sm",
                                    color: "#555555",
                                    align: "center",
                                    margin: "md"
                                }
                            ],
                            margin: "md"
                        },
                        {
                            type: "separator",
                            margin: "xl"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "xl",
                            contents: [
                                {
                                    type: "text",
                                    text: "เมนูการใช้งาน",
                                    weight: "bold",
                                    color: "#1565C0"
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "💰",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "พิมพ์ \"เช็คยอดเงินฝาก\" เพื่อดูยอดเงินปัจจุบัน",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "👨‍👩‍👧‍👦",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "พิมพ์ \"จัดการรายการนักเรียน\" เพื่อดูรายการนักเรียนของท่าน",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                },
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    margin: "md",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "📝",
                                            flex: 1
                                        },
                                        {
                                            type: "text",
                                            text: "พิมพ์ \"ลงทะเบียน <รหัสนักเรียน>\" เพื่อเพิ่มนักเรียนในระบบ",
                                            wrap: true,
                                            flex: 9,
                                            size: "sm"
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    paddingAll: "20px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "button",
                            style: "primary",
                            color: "#1565C0",
                            action: {
                                type: "postback",
                                label: "เช็คยอดเงินฝาก",
                                displayText: "เช็คยอดเงินฝาก",
                                data: "action=check_balance&role=" + role,
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#1565C0"
                    },
                    footer: {
                        separator: true
                    }
                }
            }, quickReply: quickReply(uid, role, true, false, true, role === 'Parent' ? [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/color/48/add-user-male.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ] : [])
        };
        webhook.replyToline([flex]);
        return webhook.ok;
    }

}

function getAccountBalance(webhook, rawFlex = false, role) {
    let uid = webhook.userId
    let ss = SpreadsheetApp.getActiveSpreadsheet()

    let std_ids //= parent_row.map(row => row[1])
    if (!rawFlex) {
        let user_role
        let parent_sheet = ss.getSheetByName('เก็บข้อมูลผู้ปกครอง')
        let users_sheet = ss.getSheetByName('ลงทะเบียนผู้ใช้งาน')
        let users_data = users_sheet.getDataRange().getDisplayValues().find(row => row[7] == uid)
        if (!role || role === '') {
            if (!users_data) {
                let flex = {
                    type: "flex",
                    altText: "ไม่พบข้อมูลผู้ปกครอง",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "ไม่พบข้อมูลผู้ปกครอง",
                                    weight: "bold",
                                    size: "lg",
                                    color: "#FF0000"
                                },
                                {
                                    type: "text",
                                    text: "กรุณาลงทะเบียนก่อนใช้งาน",
                                    margin: "md"
                                }
                            ]
                        }, footer: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "button", style: "primary",
                                    color: "#1565C0",
                                    action: {
                                        type: "uri",
                                        label: "ลงทะเบียนผู้ปกครอง",
                                        uri: 'https://script.google.com/macros/s/AKfycbxW7-T4o4aHgkhuKnvVd82IdhymtV8q7lijYcIKtiPwsAbnaIlCI2oy4GZLQFNxLGi-/exec' + '?action=register_parent&uid=' + encodeURIComponent(uid)
                                    },
                                    height: "sm"
                                }
                            ],
                            paddingAll: "15px"
                        },
                        styles: {
                            header: {
                                backgroundColor: "#1565C0"
                            },
                            footer: {
                                separator: true
                            }
                        }
                    }
                }
                webhook.replyToline([flex])
                return webhook.ok
            }
            user_role = users_data[4]

        } else {
            user_role = role
        }
        let data = parent_sheet.getDataRange().getDisplayValues()
        let parent_row
        if (user_role === 'Parent') {
            parent_row = data.filter(row => row[3] == uid)
            if (parent_row.length <= 0) {
                let flex = {
                    type: "flex",
                    altText: "ไม่พบข้อมูลการลงทะเบียนนักเรียน",
                    contents: {
                        type: "bubble",
                        body: {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "text",
                                    text: "ไม่พบข้อมูลการลงทะเบียนนักเรียน",
                                    weight: "bold",
                                    size: "lg",
                                    color: "#FF0000"
                                },
                                {
                                    type: "text",
                                    text: "กรุณาลงทะเบียนนักเรียนก่อนใช้งาน",
                                    margin: "md"
                                }
                            ]
                        }
                    },
                    quickReply: quickReply(uid, 'Parent', true, false, true, [
                        {
                            type: "action",
                            imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                            action: {
                                type: "postback",
                                label: "ลงทะเบียนเพิ่ม",
                                displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                                inputOption: "openKeyboard",
                                data: "register_parent",
                                fillInText: "ลงทะเบียน "
                            }
                        }
                    ])
                }
                webhook.replyToline([flex])
                return webhook.ok
            }
            std_ids = parent_row.map(row => row[1])
        } else if (user_role === 'Admin') {
            let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
            let std_data = std_sheet.getDataRange().getValues().slice(1) // skip header row
            std_ids = std_data.map(row => row[0])
        } else if (user_role === 'Teacher') {
            let user_class = users_data[5]
            let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
            let std_data = std_sheet.getDataRange().getValues().slice(1) // skip header row
            std_data = std_data.filter(row => row[2] === user_class)
            std_ids = std_data.map(row => row[0])
        } else {
            let flex = {
                type: "flex",
                altText: "ไม่พบข้อมูลผู้ปกครอง",
                contents: {
                    type: "bubble",
                    body: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "ไม่พบข้อมูลผู้ปกครอง",
                                weight: "bold",
                                size: "lg",
                                color: "#FF0000"
                            },
                            {
                                type: "text",
                                text: "กรุณาลงทะเบียนก่อนใช้งาน",
                                margin: "md"
                            }
                        ]
                    },
                    footer: {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "button", style: "primary",
                                color: "#1565C0",
                                action: {
                                    type: "uri",
                                    label: "ลงทะเบียนผู้ปกครอง",
                                    uri: 'https://script.google.com/macros/s/AKfycbxW7-T4o4aHgkhuKnvVd82IdhymtV8q7lijYcIKtiPwsAbnaIlCI2oy4GZLQFNxLGi-/exec' + '?action=register_parent&uid=' + encodeURIComponent(uid)
                                },
                                height: "sm"
                            }
                        ],
                        paddingAll: "15px"
                    },
                    styles: {
                        header: {
                            backgroundColor: "#1565C0"
                        },
                        footer: {
                            separator: true
                        }
                    }
                }
            }
            webhook.replyToline([flex])
            return webhook.ok
        }
    } else {
        std_ids = webhook.std_ids
    }
    let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
    let std_data = std_sheet.getDataRange().getValues().slice(1).filter(r => r[0] != '')
    std_ids = std_ids.map(id => {
        let std_row = std_data.find(row => row[0] == id)
        if (!std_row) return null
        return {
            id: id,
            name: std_row[1],
            std_class: std_row[2],
            std_number: std_row[3],
            balance: std_row[4],
            lastDeposit: std_row[5],
            depositCount: std_row[6],
        }
    })
    if (std_ids.length <= 0 || std_ids.every(id => id === null)) {
        if (rawFlex) return false
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลนักเรียน",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [{
                        type: "text",
                        text: "ไม่พบข้อมูลนักเรียน",
                        weight: "bold",
                        size: "lg",
                        color: "#FF0000"
                    },
                    {
                        type: "text",
                        text: "กรุณาลงทะเบียนก่อนใช้งาน",
                        margin: "md"
                    }
                    ]
                }
            },
            quickReply: quickReply(uid, role, true, false, role === 'Parent', [])
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    let carousel = {
        type: "carousel",
        contents: std_ids.filter(id => id !== null).map(std => {
            return {
                type: "bubble",
                header: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ข้อมูลการออมเงิน",
                            weight: "bold",
                            color: "#FFFFFF",
                            size: "lg",
                            align: "center"
                        }
                    ],
                    backgroundColor: "#1565C0",
                    paddingBottom: "10px"
                },
                body: {
                    type: "box",
                    layout: "vertical",
                    spacing: "md",
                    contents: [
                        {
                            type: "box",
                            layout: "horizontal",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "💰",
                                            size: "xxl",
                                            align: "center",
                                            gravity: "center"
                                        }
                                    ],
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "#F5F5F5",
                                    cornerRadius: "100px",
                                    justifyContent: "center",
                                    alignItems: "center"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: std.name,
                                            weight: "bold",
                                            size: "md",
                                            wrap: true
                                        },
                                        {
                                            type: "text",
                                            text: `รหัส ${std.id} • ชั้น ${std.std_class} • เลขที่ ${std.std_number}`,
                                            size: "sm",
                                            color: "#777777"
                                        }
                                    ],
                                    margin: "md"
                                }
                            ]
                        },
                        {
                            type: "separator",
                            margin: "md"
                        },
                        {
                            type: "box",
                            layout: "vertical",
                            margin: "md",
                            cornerRadius: "10px",
                            backgroundColor: "#F5FFF7",
                            paddingAll: "10px",
                            contents: [
                                {
                                    type: "text",
                                    text: "ยอดเงินปัจจุบัน",
                                    size: "sm",
                                    color: "#555555"
                                },
                                {
                                    type: "text",
                                    text: `${std.balance.toLocaleString()} บาท`,
                                    weight: "bold",
                                    size: "xl",
                                    color: "#1565C0"
                                }
                            ]
                        },
                        {
                            type: "box",
                            layout: "horizontal",
                            margin: "md",
                            contents: [
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "จำนวนครั้ง",
                                            size: "xs",
                                            color: "#555555"
                                        },
                                        {
                                            type: "text",
                                            text: `${std.depositCount} ครั้ง`,
                                            size: "md",
                                            weight: "bold"
                                        }
                                    ],
                                    flex: 1,
                                    backgroundColor: "#F5F5F5",
                                    paddingAll: "10px",
                                    cornerRadius: "5px"
                                },
                                {
                                    type: "box",
                                    layout: "vertical",
                                    contents: [
                                        {
                                            type: "text",
                                            text: "ฝากล่าสุด",
                                            size: "xs",
                                            color: "#555555"
                                        },
                                        {
                                            type: "text",
                                            text: `${Utilities.formatDate(new Date(std.lastDeposit), Session.getScriptTimeZone(), 'dd/MM/yyyy')}`,
                                            size: "md",
                                            weight: "bold"
                                        }
                                    ],
                                    flex: 1,
                                    backgroundColor: "#F5F5F5",
                                    paddingAll: "10px",
                                    cornerRadius: "5px",
                                    margin: "10px"
                                }
                            ]
                        }
                    ],
                    paddingAll: "15px"
                },
                footer: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: `อัพเดทข้อมูลล่าสุด: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')}`,
                            size: "xxs",
                            color: "#777777",
                            align: "center",
                            margin: "md",
                            adjustMode: "shrink-to-fit"
                        }
                    ],
                },
                styles: {
                    header: {
                        backgroundColor: "#1565C0"
                    },
                    body: {
                        backgroundColor: "#FFFFFF"
                    },
                    footer: {
                        separator: true
                    }
                }
            };
        }).slice(0, 12) // limit to 12 bubbles
    }

    let flex = {
        type: "flex",
        altText: "ยอดเงินฝากนักเรียน",
        contents: carousel,
        quickReply: quickReply(uid, role, true, false, true, [
            {
                type: "action",
                imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                action: {
                    type: "postback",
                    label: "ลงทะเบียนเพิ่ม",
                    displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                    inputOption: "openKeyboard",
                    data: "register_parent",
                    fillInText: "ลงทะเบียน "
                }
            }
        ])

    }
    if (rawFlex) return flex

    webhook.replyToline([flex])
    return webhook.ok
}

function getChildrenList(webhook) {
    let uid = webhook.userId
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let parent_sheet = ss.getSheetByName('เก็บข้อมูลผู้ปกครอง')
    let data = parent_sheet.getDataRange().getDisplayValues()
    let parent_row = data.filter(row => row[3] == uid)
    if (parent_row.length <= 0) {
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลผู้ปกครอง",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่พบข้อมูลผู้ปกครอง",
                            weight: "bold",
                            size: "lg",
                            color: "#FF0000"
                        },
                        {
                            type: "text",
                            text: "กรุณาลงทะเบียนก่อนใช้งาน",
                            margin: "md"
                        }
                    ]
                }
            },
            quickReply: quickReply(uid, 'Parent', true, false, true, [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ])
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    let std_ids = parent_row.map(row => row[1])
    if (std_ids.length <= 0) {
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลนักเรียน",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่พบข้อมูลนักเรียน",
                            weight: "bold",
                            size: "lg",
                            color: "#FF0000"
                        },
                        {
                            type: "text",
                            text: "กรุณาลงทะเบียนก่อนใช้งาน",
                            margin: "md"
                        }
                    ]
                }
            },
            quickReply: quickReply(uid, 'Parent', true, false, true, [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ])
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
    let std_data = std_sheet.getDataRange().getValues()
    std_ids = std_ids.map(id => {
        let std_row = std_data.find(row => row[0] == id)
        if (!std_row) return null
        return {
            id: id,
            name: std_row[1],
            class: std_row[2],
        }
    })
    if (std_ids.length <= 0 || std_ids.every(id => id === null)) {
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลนักเรียน",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่พบข้อมูลนักเรียน",
                            weight: "bold",
                            size: "lg",
                            color: "#FF0000"
                        },
                        {
                            type: "text",
                            text: "กรุณาลงทะเบียนก่อนใช้งาน",
                            margin: "md"
                        }
                    ]
                }
            },
            quickReply: quickReply(uid, 'Parent', true, false, true, [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ])
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    // Create a bubble with all children in a vertical list
    let flex = {
        type: "flex",
        altText: "รายการนักเรียนของท่าน",
        contents: {
            type: "bubble",
            size: "giga",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "รายการนักเรียนของท่าน",
                        weight: "bold",
                        color: "#FFFFFF",
                        size: "lg",
                        align: "center"
                    }
                ],
                backgroundColor: "#1565C0",
                paddingTop: "12px",
                paddingBottom: "12px"
            },
            body: {
                type: "box",
                layout: "vertical",
                spacing: "md",
                paddingTop: "12px",
                paddingBottom: "12px",
                contents: [
                    ...std_ids.filter(id => id !== null).map((std, index) => {
                        return {
                            type: "box",
                            layout: "vertical",
                            contents: [
                                {
                                    type: "box",
                                    layout: "horizontal",
                                    contents: [
                                        {
                                            type: "box",
                                            layout: "vertical",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: `${index + 1}`,
                                                    size: "xs",
                                                    color: "#FFFFFF",
                                                    align: "center",
                                                    gravity: "center"
                                                }
                                            ],
                                            width: "24px",
                                            height: "24px",
                                            backgroundColor: "#1565C0",
                                            cornerRadius: "100px",
                                            justifyContent: "center",
                                            alignItems: "center"
                                        },
                                        {
                                            type: "box",
                                            layout: "vertical",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: std.name,
                                                    weight: "bold",
                                                    size: "md",
                                                    wrap: true
                                                },
                                                {
                                                    type: "text",
                                                    text: `รหัส ${std.id} • ${std.class}`,
                                                    size: "xs",
                                                    color: "#777777"
                                                }
                                            ],
                                            flex: 8,
                                            paddingStart: "10px"
                                        },
                                        {
                                            type: "box",
                                            layout: "vertical",
                                            contents: [
                                                {
                                                    type: "text",
                                                    text: "X",
                                                    size: "xs",
                                                    color: "#FFFFFF",
                                                    align: "center",
                                                    gravity: "center"
                                                }
                                            ],
                                            width: "20px",
                                            height: "20px",
                                            backgroundColor: "#E74C3C",
                                            cornerRadius: "100px",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            action: {
                                                type: "postback",
                                                label: "ลบ",
                                                data: `action=delete_child&std_id=${std.id}`,
                                                displayText: `ลบ ${std.name} (รหัส ${std.id})`
                                            }
                                        }
                                    ],
                                    alignItems: "center"
                                }
                            ],
                            margin: "sm",
                            cornerRadius: "8px",
                            paddingAll: "10px",
                            backgroundColor: "#F8F9FA",
                            borderWidth: "1px",
                            borderColor: "#EAEAEA"
                        };
                    }),
                    {
                        type: "separator",
                        margin: "xl",
                        color: "#EAEAEA"
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        margin: "xl",
                        backgroundColor: "#F5FFF7",
                        cornerRadius: "8px",
                        paddingAll: "12px",
                        contents: [
                            {
                                type: "text",
                                text: "💡",
                                flex: 1,
                                size: "md"
                            },
                            {
                                type: "text",
                                text: "วิธีลงทะเบียนเพิ่ม:\nพิมพ์ \"ลงทะเบียน <รหัสนักเรียน>\"",
                                flex: 9,
                                size: "sm",
                                color: "#1565C0",
                                wrap: true
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F8F9FA",
                paddingAll: "12px",
                contents: [
                    {
                        type: "text",
                        text: `จำนวนนักเรียนที่ลงทะเบียน: ${std_ids.filter(id => id !== null).length} คน`,
                        size: "xs",
                        color: "#666666",
                        align: "center"
                    }
                ]
            },
            styles: {
                header: {
                    backgroundColor: "#1565C0"
                },
                footer: {
                    separator: true
                }
            }
        },
        quickReply: quickReply(uid, 'Parent', true, false, true, [])
    };
    webhook.replyToline([flex]);
    return webhook.ok;
}

function deleteChild(webhook, std_id) {
    if (!std_id) {
        return webhook.ok
    }
    webhook.showLoading()
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let parent_sheet = ss.getSheetByName('เก็บข้อมูลผู้ปกครอง')
    let uid = webhook.userId
    let data = parent_sheet.getDataRange().getDisplayValues()
    let rowIndex = data.findIndex(row => row[1] == std_id && row[3] == uid)
    if (rowIndex < 0) {
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลนักเรียน",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่พบข้อมูลนักเรียน",
                            weight: "bold",
                            size: "lg",
                            color: "#FF0000"
                        },
                        {
                            type: "text",
                            text: `รหัส ${std_id} ไม่มีในระบบ`,
                            margin: "md"
                        },
                        {
                            type: "text",
                            text: "กรุณาตรวจสอบอีกครั้ง",
                            margin: "md",
                            size: "sm"
                        }
                    ]
                }
            },
            quickReply: quickReply(uid, 'Parent', true, false, true, [])
        }
        webhook.replyToline([flex])
        return webhook.ok
    } else {
        parent_sheet.deleteRow(rowIndex + 1) // delete row if exists
        let flex = {
            type: "flex",
            altText: "ลบข้อมูลสำเร็จ",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ลบข้อมูลสำเร็จ",
                            weight: "bold",
                            size: "lg",
                            color: "#1565C0"
                        },
                        {
                            type: "text",
                            text: `รหัส ${std_id} ถูกลบออกจากรายการนักเรียนของท่าน`,
                            margin: "md",
                            wrap: true
                        }
                    ]
                }
            },
            quickReply: quickReply(uid, 'Parent', true, false, true, [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ])
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
}

function registerParent(webhook) {
    let message = webhook.message.toLowerCase().trim()
    let regex = /ลงทะเบียน\s+(\d{8})/i
    // let regex = /ลงทะเบียน\s+/gm
    if (!regex.test(message)) {
        return webhook.ok
    }
    webhook.showLoading()
    let std_id = message.replace('ลงทะเบียน', '').trim()
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
    let std_data = std_sheet.getDataRange().getDisplayValues()
    let std_row = std_data.find(row => row[0] == std_id)
    if (!std_row) {
        let flex = {
            type: "flex",
            altText: "ไม่พบข้อมูลนักเรียน",
            contents: {
                type: "bubble",
                body: {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        {
                            type: "text",
                            text: "ไม่พบข้อมูลนักเรียน",
                            weight: "bold",
                            size: "lg",
                            color: "#FF0000"
                        },
                        {
                            type: "text",
                            text: `รหัส ${std_id} ไม่มีในระบบ`,
                            margin: "md"
                        },
                        {
                            type: "text",
                            text: "กรุณาตรวจสอบอีกครั้ง",
                            margin: "md",
                            size: "sm"
                        }
                    ]
                }
            },
            quickReply: quickReply(webhook.userId, 'Parent', true, false, true, [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "postback",
                        label: "ลงทะเบียนเพิ่ม",
                        displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                        inputOption: "openKeyboard",
                        data: "register_parent",
                        fillInText: "ลงทะเบียน "
                    }
                }
            ])
        }

        webhook.replyToline([flex])
        return webhook.ok
    }
    let parent_sheet = ss.getSheetByName('เก็บข้อมูลผู้ปกครอง')
    let uid = webhook.userId
    let { displayName, pictureUrl } = webhook.getProfile()
    let data = parent_sheet.getDataRange().getDisplayValues()
    if (data.length > 1) {
        for (let i = data.length - 1; i >= 0; i--) {
            let row = data[i]
            if (row[1] == std_id && row[3] == uid) {
                parent_sheet.deleteRow(i + 1) // delete row if already exists
            }
        }
    }
    parent_sheet.appendRow([new Date(), std_id, displayName, uid, pictureUrl])
    let flex = {
        type: "flex",
        altText: "ลงทะเบียนสำเร็จ",
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "ลงทะเบียนสำเร็จ",
                        weight: "bold",
                        size: "xl",
                        color: "#1565C0"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "md",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "รหัสนักเรียน:",
                                        size: "sm",
                                        color: "#555555",
                                        flex: 2
                                    },
                                    {
                                        type: "text",
                                        text: std_id,
                                        size: "sm",
                                        color: "#111111",
                                        align: "end",
                                        flex: 3
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "ชื่อ:",
                                        size: "sm",
                                        color: "#555555",
                                        flex: 2
                                    },
                                    {
                                        type: "text",
                                        text: std_row[1],
                                        size: "sm",
                                        color: "#111111",
                                        align: "end",
                                        flex: 3
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                contents: [
                                    {
                                        type: "text",
                                        text: "ห้อง:",
                                        size: "sm",
                                        color: "#555555",
                                        flex: 2
                                    },
                                    {
                                        type: "text",
                                        text: std_row[2],
                                        size: "sm",
                                        color: "#111111",
                                        align: "end",
                                        flex: 3
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "separator",
                        margin: "xxl"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "md",
                        contents: [
                            {
                                type: "text",
                                text: "เริ่มใช้งานระบบ",
                                weight: "bold",
                                size: "md",
                                color: "#1565C0"
                            },
                            {
                                type: "text",
                                text: "กดที่เมนูด้านล่างเพื่อใช้งานฟังก์ชันต่างๆ",
                                size: "sm",
                                wrap: true,
                                margin: "sm"
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                margin: "md",
                                contents: [
                                    {
                                        type: "text",
                                        text: "💰",
                                        flex: 1
                                    },
                                    {
                                        type: "text",
                                        text: "เช็คยอดเงินฝาก - ดูยอดเงินปัจจุบัน",
                                        size: "xs",
                                        flex: 9,
                                        wrap: true
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                margin: "sm",
                                contents: [
                                    {
                                        type: "text",
                                        text: "📋",
                                        flex: 1
                                    },
                                    {
                                        type: "text",
                                        text: "รายการฝากเงิน - ดูประวัติการฝาก",
                                        size: "xs",
                                        flex: 9,
                                        wrap: true
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "horizontal",
                                margin: "sm",
                                contents: [
                                    {
                                        type: "text",
                                        text: "👨‍👩‍👧‍👦",
                                        flex: 1
                                    },
                                    {
                                        type: "text",
                                        text: "จัดการรายการนักเรียน - เพิ่มหรือลบรายชื่อ",
                                        size: "xs",
                                        flex: 9,
                                        wrap: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
        quickReply: quickReply(uid, 'Parent', true, false, true, [
            {
                type: "action",
                imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                action: {
                    type: "postback",
                    label: "ลงทะเบียนเพิ่ม",
                    displayText: "พิมพ์ 'ลงทะเบียน <รหัสนักเรียน>'",
                    inputOption: "openKeyboard",
                    data: "register_parent",
                    fillInText: "ลงทะเบียน "
                }
            }
        ])
    }
    webhook.reply([flex])
}

function weeklySummaryNotify() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let parent_sheet = ss.getSheetByName('เก็บข้อมูลผู้ปกครอง');
    let data = parent_sheet.getDataRange().getValues().slice(1)
    data = Object.groupBy(data, row => row[3]); // Group by userId (4th column)
    Object.keys(data).forEach(uid => {
        let std_ids = data[uid].map(row => row[1]); // Get student IDs from grouped data
        let flex = getAccountBalance({ userId: uid, std_ids: std_ids }, true);
        if (flex) {
            let message = 'สรุปยอดเงินฝากประจำสัปดาห์'
            LineBotWebhook.push(uid, LINE_TOKEN, [message, flex]);

        }
    })

}

function quickReply(uid, role, includeManageChildren = true, includeRegister = false, includeDepositHistory = true, additionalItems = []) {
    const items = [];

    // Add check balance button
    items.push({
        type: "action",
        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
        action: {
            type: "postback",
            label: "เช็คยอดเงินฝาก",
            data: "action=check_balance&role=" + role,
            displayText: "เช็คยอดเงินฝาก"
        }
    });

    // Add deposit history button
    if (includeDepositHistory) {
        items.push({
            type: "action",
            imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
            action: {
                type: "uri",
                label: "รายการฝากเงิน",
                text: "รายการฝากเงิน",
                uri: 'https://script.google.com/macros/s/AKfycbxW7-T4o4aHgkhuKnvVd82IdhymtV8q7lijYcIKtiPwsAbnaIlCI2oy4GZLQFNxLGi-/exec' + '?action=deposit_history&uid=' + encodeURIComponent(uid)
            }
        });
    }

    // Add manage children button
    if (includeManageChildren) {
        items.push({
            type: "action",
            imageUrl: 'https://img.icons8.com/scribby/50/children.png',
            action: {
                type: "postback",
                label: "จัดการรายการนักเรียน",
                displayText: "จัดการรายการนักเรียน",
                data: "action=manage_children&role=" + role,
            }
        });
    }

    // Add register button
    if (includeRegister) {
        items.push({
            type: "action",
            imageUrl: 'https://img.icons8.com/color/48/add-user-male.png',
            action: {
                type: "postback",
                label: "ลงทะเบียน",
                data: "action=register",
                displayText: "ลงทะเบียน",
                inputOption: "openKeyboard",
                fillInText: "ลงทะเบียน "
            }
        });
    }

    // Add any additional items
    if (additionalItems && additionalItems.length > 0) {
        items.push(...additionalItems);
    }

    return {
        items: items
    };
}