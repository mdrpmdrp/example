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
        formData[3], // ห้อง/เลขที่
        formData[4], // จำนวนเงินที่ฝาก
        formData[5], // ชื่อเจ้าหน้าที่ที่รับฝาก
        formData[6]  // หมายเหตุ (ถ้ามี)
    ];
    // Insert the data into the next empty row
    sheet.getRange(lastRow, 1, 1, dataToInsert.length).setValues([dataToInsert]);
}


const LINE_TOKEN = "19tSHISQVfgi4VIJYKJyfPUla30PrXS/0vqkiJJ/lk97ksDjGc+Gi4b2edKhJz3pEahVJx3hmxinwMmVhi15Vq9Ni9T9u5zQvmB55WFTtPfnP9MXob85lm167SxPQ/28zffgDk+ZP1VbxzRKCDSkpAdB04t89/1O/w1cDnyilFU="
function doPost(e) {
    Logger = BetterLog.useSpreadsheet()
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

function handleEvent(webhook) {
    if (webhook.eventType === 'follow') {
        // Send a welcome Flex message when users follow the bot
        // return webhook.reply([
        //     {
        //         type: "flex",
        //         altText: "ยินดีต้อนรับสู่ Smart School Bank",
        //         contents: {
        //             type: "bubble",
        //             hero: {
        //                 type: "image",
        //                 url: "https://img.icons8.com/color/96/000000/bank-building.png",
        //                 size: "full",
        //                 aspectRatio: "20:13",
        //                 aspectMode: "cover"
        //             },
        //             body: {
        //                 type: "box",
        //                 layout: "vertical",
        //                 contents: [
        //                     {
        //                         type: "text",
        //                         text: "ยินดีต้อนรับ",
        //                         weight: "bold",
        //                         size: "xl",
        //                         color: "#1DB446"
        //                     },
        //                     {
        //                         type: "text",
        //                         text: "Smart School Bank",
        //                         weight: "bold",
        //                         size: "md",
        //                         margin: "md"
        //                     },
        //                     {
        //                         type: "separator",
        //                         margin: "xxl"
        //                     },
        //                     {
        //                         type: "box",
        //                         layout: "vertical",
        //                         margin: "xxl",
        //                         spacing: "sm",
        //                         contents: [
        //                             {
        //                                 type: "box",
        //                                 layout: "horizontal",
        //                                 contents: [
        //                                     {
        //                                         type: "text",
        //                                         text: "📝",
        //                                         flex: 1
        //                                     },
        //                                     {
        //                                         type: "text",
        //                                         text: "กรุณาลงทะเบียนด้วยการพิมพ์",
        //                                         flex: 9,
        //                                         wrap: true
        //                                     }
        //                                 ]
        //                             },
        //                             {
        //                                 type: "box",
        //                                 layout: "horizontal",
        //                                 margin: "md",
        //                                 contents: [
        //                                     {
        //                                         type: "text",
        //                                         text: "👉",
        //                                         flex: 1
        //                                     },
        //                                     {
        //                                         type: "text",
        //                                         text: "ลงทะเบียน <รหัสนักเรียน>",
        //                                         weight: "bold",
        //                                         color: "#1DB446",
        //                                         flex: 9
        //                                     }
        //                                 ]
        //                             },
        //                             {
        //                                 type: "box",
        //                                 layout: "horizontal",
        //                                 margin: "md",
        //                                 contents: [
        //                                     {
        //                                         type: "text",
        //                                         text: "💡",
        //                                         flex: 1
        //                                     },
        //                                     {
        //                                         type: "text",
        //                                         text: "ตัวอย่าง: ลงทะเบียน 123456",
        //                                         flex: 9
        //                                     }
        //                                 ]
        //                             }
        //                         ]
        //                     }
        //                 ]
        //             }
        //         }
        //     }
        // ])
        return checkRegister(webhook)
    } else if (webhook.eventType !== 'message' || webhook.messageType !== 'text') {
        return webhook.ok
    }
    webhook.showLoading()
    let message = webhook.message.toLowerCase().trim()
    if (message === 'เช็คยอดเงินฝาก') {
        return getAccountBalance(webhook)
    } else if (message === 'จัดการรายการบุตร') {
        return getChildrenList(webhook)
    } else if (message.toLowerCase().indexOf('#delete') === 0) {
        return deleteChild(webhook)
    }
    else {
        return registerParent(webhook)
    }
}

function checkRegister(webhook) {
    let uid = webhook.userId
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let parent_sheet = ss.getSheetByName('ลงทะเบียนผู้ใช้งาน')
    let data = parent_sheet.getDataRange().getDisplayValues()
    let index = data.findIndex(row => row[1] == uid)
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
                    backgroundColor: "#1DB446",
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
                                    text: "Smart School Bank",
                                    weight: "bold",
                                    size: "lg",
                                    color: "#1DB446",
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
                            type: "button",
                            style: "primary",
                            color: "#1DB446",
                            action: {
                                type: "uri",
                                label: "ลงทะเบียนผู้ปกครอง",
                                uri: ScriptApp.getService().getUrl() + '?action=register_parent&uid=' + encodeURIComponent(uid)
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#1DB446"
                    },
                    footer: {
                        separator: true
                    }
                }
            }
        }
        webhook.replyToline([flex])
        return webhook.ok
    } else {
        let parent_data = data[index];
        let displayName = parent_data[2] || webhook.getProfile().displayName

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
                    backgroundColor: "#1DB446",
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
                                    color: "#1DB446",
                                    align: "center"
                                },
                                {
                                    type: "text",
                                    text: "Smart School Bank",
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
                                    color: "#1DB446"
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
                                            text: "พิมพ์ \"จัดการรายการบุตร\" เพื่อดูรายการบุตรของท่าน",
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
                                            text: "พิมพ์ \"ลงทะเบียน <รหัสนักเรียน>\" เพื่อเพิ่มบุตรในระบบ",
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
                            color: "#1DB446",
                            action: {
                                type: "message",
                                label: "เช็คยอดเงินฝาก",
                                text: "เช็คยอดเงินฝาก"
                            },
                            height: "sm"
                        }
                    ],
                    paddingAll: "15px"
                },
                styles: {
                    header: {
                        backgroundColor: "#1DB446"
                    },
                    footer: {
                        separator: true
                    }
                }
            },
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    },
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
                ]
            }
        };
        webhook.replyToline([flex]);
        return webhook.ok;
    }

}

function getAccountBalance(webhook) {
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    let std_ids = parent_row.map(row => row[1])
    let std_sheet = ss.getSheetByName('คำนวณยอดสะสมล่าสุด')
    let std_data = std_sheet.getDataRange().getValues()
    std_ids = std_ids.map(id => {
        let std_row = std_data.find(row => row[0] == id)
        if (!std_row) return null
        return {
            id: id,
            name: std_row[1],
            class: std_row[2],
            balance: std_row[3],
            lastDeposit: std_row[4],
            depositCount: std_row[5],
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
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
                    backgroundColor: "#1DB446",
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
                                            align: "center"
                                        }
                                    ],
                                    width: "60px",
                                    height: "60px",
                                    backgroundColor: "#F5F5F5",
                                    cornerRadius: "100px"
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
                                    color: "#1DB446"
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
                        backgroundColor: "#1DB446"
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
        quickReply: {
            items: [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                    action: {
                        type: "message",
                        label: "เช็คยอดเงินฝาก",
                        text: "เช็คยอดเงินฝาก"
                    }
                },
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                    action: {
                        type: "message",
                        label: "รายการฝากเงิน",
                        text: "รายการฝากเงิน"
                    }
                },
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "message",
                        label: "จัดการรายการบุตร",
                        text: "จัดการรายการบุตร"
                    }
                }
            ]
        }
    }
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
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
                ]
            }
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
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
                ]
            }
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
    // Create a bubble with all children in a vertical list
    let flex = {
        type: "flex",
        altText: "รายการบุตรของท่าน",
        contents: {
            type: "bubble",
            size: "giga",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "รายการบุตรของท่าน",
                        weight: "bold",
                        color: "#FFFFFF",
                        size: "lg",
                        align: "center"
                    }
                ],
                backgroundColor: "#1DB446",
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
                                                    align: "center"
                                                }
                                            ],
                                            width: "24px",
                                            height: "24px",
                                            backgroundColor: "#1DB446",
                                            cornerRadius: "100px"
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
                                                    align: "center"
                                                }
                                            ],
                                            width: "20px",
                                            height: "20px",
                                            backgroundColor: "#E74C3C",
                                            cornerRadius: "100px",
                                            action: {
                                                type: "message",
                                                label: "Delete",
                                                text: `#delete ${std.id}`
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
                                color: "#1DB446",
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
                        text: `จำนวนบุตรที่ลงทะเบียน: ${std_ids.filter(id => id !== null).length} คน`,
                        size: "xs",
                        color: "#666666",
                        align: "center"
                    }
                ]
            },
            styles: {
                header: {
                    backgroundColor: "#1DB446"
                },
                footer: {
                    separator: true
                }
            }
        },
        quickReply: {
            items: [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                    action: {
                        type: "message",
                        label: "เช็คยอดเงินฝาก",
                        text: "เช็คยอดเงินฝาก"
                    }
                },
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                    action: {
                        type: "message",
                        label: "รายการฝากเงิน",
                        text: "รายการฝากเงิน"
                    }
                },
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
            ]
        }
    };
    webhook.replyToline([flex]);
    return webhook.ok;
}

function deleteChild(webhook) {
    let std_id = webhook.message.toLowerCase().replace('#delete', '').trim()
    if (!std_id) {
        return webhook.ok
    }
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
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
                            color: "#1DB446"
                        },
                        {
                            type: "text",
                            text: `รหัส ${std_id} ถูกลบออกจากรายการบุตรของท่าน`,
                            margin: "md",
                            wrap: true
                        }
                    ]
                }
            },
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "message",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
        }
        webhook.replyToline([flex])
        return webhook.ok
    }
}

function registerParent(webhook) {
    let message = webhook.message.toLowerCase().trim()
    // let regex = /ลงทะเบียน\s+(\d{1,10})/i
    let regex = /ลงทะเบียน\s+/gm
    if (!regex.test(message)) {
        return webhook.ok
    }
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
            quickReply: {
                items: [
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                        action: {
                            type: "message",
                            label: "เช็คยอดเงินฝาก",
                            text: "เช็คยอดเงินฝาก"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                        action: {
                            type: "message",
                            label: "รายการฝากเงิน",
                            text: "รายการฝากเงิน"
                        }
                    },
                    {
                        type: "action",
                        imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                        action: {
                            type: "text",
                            label: "จัดการรายการบุตร",
                            text: "จัดการรายการบุตร"
                        }
                    }
                ]
            }
        }
        Logger.log(JSON.stringify(flex))
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
                        color: "#1DB446"
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
                                color: "#1DB446"
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
                                        text: "จัดการรายการบุตร - เพิ่มหรือลบรายชื่อ",
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
        quickReply: {
            items: [
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/external-flat-land-kalash/64/external-saving-finance-and-banking-flat-land-kalash.png',
                    action: {
                        type: "message",
                        label: "เช็คยอดเงินฝาก",
                        text: "เช็คยอดเงินฝาก"
                    }
                },
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/color/48/refund-2--v1.png',
                    action: {
                        type: "message",
                        label: "รายการฝากเงิน",
                        text: "รายการฝากเงิน"
                    }
                },
                {
                    type: "action",
                    imageUrl: 'https://img.icons8.com/scribby/50/children.png',
                    action: {
                        type: "message",
                        label: "จัดการรายการบุตร",
                        text: "จัดการรายการบุตร"
                    }
                }
            ]
        }
    }
    webhook.reply([flex])
}
