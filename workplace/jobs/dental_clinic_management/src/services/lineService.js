function processLineEvent(event) {
    if (event.eventType === 'follow') {
        event.replyToline([createWelcomeFlexMessage()]);
        return;
    }
    if (!event.eventType === "message" && !event.messageType === "text") {
        return; // Ignore non-message or non-text events
    }

    const userId = event.userId;
    const messageText = event.message.trim().toLowerCase();

    // Check for patient ID pattern
    let regex = /p\d{8}/;
    let match = messageText.match(regex);
    if (!match) {
        event.replyToline([createWelcomeFlexMessage()]);
        return; // Send welcome message for unrecognized input
    }

    let registerResult = registerPatientLineId(match[0].toUpperCase(), userId);
    event.replyToline([registerResult.message]);
}

function registerPatientLineId(patientId, lineUserId) {
    try {
        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const data = patientsSheet.getDataRange().getValues();

        if (data.length <= 1) {
            console.warn("No patients found in the sheet.");
            return { success: false, message: createPatientNotFoundFlexMessage(patientId) };
        }

        const idColumn = patientsSheet
            .getRange(1, 1, patientsSheet.getLastRow(), 1)
            .getValues()
            .flat();
        const rowIndex = idColumn.findIndex((id) => id === patientId);

        if (rowIndex === -1 || rowIndex === 0) {
            console.warn(`Patient ID ${patientId} not found.`);
            return { success: false, message: createPatientNotFoundFlexMessage(patientId) };
        }

        let existingLineId = data[rowIndex][17]; // Column R (index 18) for LINE User ID
        if (existingLineId && existingLineId.toString().trim() !== "") {
            console.warn(
                `Patient ID ${patientId} is already linked to LINE User ID ${existingLineId}.`
            );
            let patientName = data[rowIndex][1] + " " + data[rowIndex][2] + " " + data[rowIndex][3];
            let branch = data[rowIndex][11] || "สาขาหลัก";
            return {
                success: false,
                message: createPatientAlreadyRegisteredFlexMessage(patientId, patientName, branch),
            };
        }

        // Update LINE User ID in Column R (index 18)
        patientsSheet.getRange(rowIndex + 1, 18).setValue(lineUserId); // Convert to 1-indexed

        // Invalidate cache since data changed
        invalidateCache("patients");

        console.log(
            `Successfully linked LINE User ID ${lineUserId} to Patient ID ${patientId}.`
        );
        let patientName = data[rowIndex][1] + " " + data[rowIndex][2] + " " + data[rowIndex][3];
        let branch = data[rowIndex][11] || "สาขาหลัก";
        Logger.log(JSON.stringify(createPatientSuccessFlexMessage(patientId, patientName, branch)));

        return {
            success: true,
            message: createPatientSuccessFlexMessage(patientId, patientName, branch),
        };
    } catch (error) {
        console.error("Error registering LINE User ID:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลงทะเบียน LINE" };
    }
}

// Modern Flex Message Templates with Dental Clinic Theme
function createPatientNotFoundFlexMessage(patientId) {
    return {
        type: "flex",
        altText: "ไม่พบข้อมูลคนไข้",
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "image",
                                url: "https://img.icons8.com/fluency/48/search.png",
                                flex: 0,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "ค้นหาข้อมูลคนไข้",
                                weight: "bold",
                                color: "#2B5797",
                                size: "lg",
                                flex: 1,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                    },
                ],
                backgroundColor: "#F8FBFF",
                paddingAll: "15px",
                paddingBottom: "10px",
            },
            body: {
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
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/96/cancel.png",
                                        size: "xxl",
                                        aspectMode: "fit"
                                    },
                                ],
                                alignItems: "center",
                                flex: 0,
                                margin: "none",
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: "ไม่พบข้อมูลคนไข้",
                                        weight: "bold",
                                        size: "xl",
                                        color: "#E74C3C",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสคนไข้: ${patientId}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "sm",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "separator",
                                        margin: "md",
                                    },
                                    {
                                        type: "text",
                                        text: "กรุณาตรวจสอบรหัสคนไข้ให้ถูกต้อง หรือติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือ",
                                        size: "sm",
                                        color: "#34495E",
                                        wrap: true,
                                        margin: "md",
                                        scaling: true,
                                    },
                                ],
                                flex: 1,
                                margin: "md",
                            },
                        ],
                    },
                ],
                paddingAll: "15px",
            },
            styles: {
                header: {
                    backgroundColor: "#F8FBFF",
                },
                body: {
                    backgroundColor: "#FFFFFF",
                }
            },
        },
    };
}

function createPatientAlreadyRegisteredFlexMessage(patientId, patientName, branch) {
    return {
        type: "flex",
        altText: "ลงทะเบียน LINE แล้ว",
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "image",
                                url: "https://img.icons8.com/fluency/48/info.png",
                                flex: 1,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "สถานะการลงทะเบียน",
                                weight: "bold",
                                color: "#2B5797",
                                size: "lg",
                                flex: 9,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                        justifyContent: "center",
                        alignItems: "center"
                    },
                ],
                backgroundColor: "#FFF9E6",
                paddingAll: "15px",
                paddingBottom: "10px",
            },
            body: {
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
                                        text: "ลงทะเบียนแล้ว",
                                        weight: "bold",
                                        size: "xl",
                                        color: "#F39C12",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `${patientName || 'คนไข้'}`,
                                        size: "md",
                                        color: "#2B5797",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสคนไข้: ${patientId}`,
                                        size: "sm",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `สาขา: ${branch || 'สาขาหลัก'}`,
                                        size: "sm",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "separator",
                                        margin: "xxl",
                                    },
                                    {
                                        type: "text",
                                        text: "รหัสคนไข้นี้ได้ลงทะเบียน LINE แล้ว หากมีปัญหาในการใช้งาน กรุณาติดต่อเจ้าหน้าที่",
                                        size: "xs",
                                        color: "#34495E",
                                        wrap: true,
                                        margin: "md",
                                        scaling: true,
                                    },
                                ],
                                flex: 1,
                                margin: "md",
                            },
                        ],
                    },
                ],
                paddingAll: "15px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "หากข้อมูลไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่เพื่อแก้ไข",
                        size: "xs",
                        color: "#7F8C8D",
                        scaling: true,
                        wrap: true,
                    },
                ],
                backgroundColor: "#F8F9FA",
                paddingAll: "10px",
            },
            styles: {
                header: {
                    backgroundColor: "#FFF9E6",
                },
                body: {
                    backgroundColor: "#FFFFFF",
                },
                footer: {
                    backgroundColor: "#F8F9FA",
                }
            },
        },
    };
}

function createPatientSuccessFlexMessage(patientId, patientName, branch) {
    return {
        type: "flex",
        altText: "ลงทะเบียน LINE สำเร็จ",
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "image",
                                url: "https://img.icons8.com/fluency/48/checkmark.png",
                                flex: 1,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "ลงทะเบียนสำเร็จ",
                                weight: "bold",
                                color: "#2B5797",
                                size: "lg",
                                flex: 9,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                        justifyContent: "center",
                        alignItems: "center"
                    },
                ],
                backgroundColor: "#E8F5E8",
                paddingAll: "15px",
                paddingBottom: "10px"
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: `${patientName || 'คนไข้'}`,
                                        size: "lg",
                                        color: "#2B5797",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสคนไข้: ${patientId}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `สาขา: ${branch || 'สาขาหลัก'}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "separator",
                                        margin: "xxl",
                                    },
                                    {
                                        type: "text",
                                        text: "🎉 ยินดีต้อนรับสู่ระบบนัดหมายออนไลน์! คุณสามารถติดตาม การนัดหมาย และรับข้อมูลข่าวสารจากทางคลินิกได้แล้ว",
                                        size: "sm",
                                        color: "#34495E",
                                        wrap: true,
                                        margin: "xs",
                                        scaling: true,
                                    },
                                ],
                                flex: 1,
                                margin: "md",
                            },
                        ],
                    },
                ],
                paddingAll: "15px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "หากข้อมูลไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่เพื่อแก้ไข",
                        size: "xs",
                        color: "#7F8C8D",
                        scaling: true,
                        wrap: true,
                    },
                ],
                backgroundColor: "#F8F9FA",
                paddingAll: "10px",
            },
            styles: {
                header: {
                    backgroundColor: "#E8F5E8",
                },
                body: {
                    backgroundColor: "#FFFFFF",
                },
                footer: {
                    backgroundColor: "#F8F9FA",
                }
            },
        },
    };
}

function createWelcomeFlexMessage(clinicName = "Smile Focus", branch = null) {
    return {
        type: "flex",
        altText: `ยินดีต้อนรับสู่ ${clinicName}`,
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: `ยินดีต้อนรับ`,
                                weight: "bold",
                                color: "#FFFFFF",
                                size: "xl",
                                flex: 1,
                                align: "center",
                                scaling: true,
                            },
                        ],
                    },
                    {
                        type: "text",
                        text: clinicName,
                        weight: "bold",
                        color: "#FFFFFF",
                        size: "lg",
                        align: "center",
                        margin: "sm",
                        scaling: true,
                    },
                ].concat(branch ? [{
                    type: "text",
                    text: `สาขา: ${branch}`,
                    weight: "bold",
                    color: "#FFFFFF",
                    size: "md",
                    align: "center",
                    margin: "xs",
                    scaling: true,
                }] : []),
                backgroundColor: "#2B5797",
                paddingAll: "20px",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "สวัสดีครับ/ค่ะ! ขอบคุณที่ใช้บริการคลินิกทันตกรรมของเรา\n\nคุณสามารถลงทะเบียนเพื่อรับการแจ้งเตือนการนัดหมาย และข้อมูลข่าวสารต่างๆ ได้ง่ายๆ เพียงไม่กี่ขั้นตอน",
                        size: "sm",
                        color: "#34495E",
                        wrap: true,
                        margin: "sm",
                        scaling: true,
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "📋 วิธีการใช้งาน:",
                                weight: "bold",
                                size: "md",
                                color: "#2B5797",
                                margin: "lg",
                                scaling: true,
                            },
                            {
                                type: "text",
                                text: "1️⃣ พิมพ์รหัสคนไข้ของคุณ (เช่น P12345678)\n2️⃣ ลงทะเบียน LINE เพื่อใช้บริการ\n3️⃣ รับการแจ้งเตือนและข้อมูลการนัดหมาย",
                                size: "sm",
                                color: "#34495E",
                                wrap: true,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                    },
                ],
                paddingAll: "20px",
            }
        },
    };
}



/**
 * Create specialized Flex Message for 7-day appointment reminder
 */
function createAppointmentReminderFlexMessage(appointmentData) {
    const { patientName, doctorName, appointmentDate, appointmentTime, caseDetails, branch } = appointmentData;
    return {
        type: "flex",
        altText: `การนัดหมาย ${appointmentDate} ${appointmentTime} (วันพรุ่งนี้)`,
        contents: {
            "type": "bubble",
            "size": "kilo",
            "header": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "image",
                                "url": "https://img.icons8.com/fluency/48/bell.png",
                                "flex": 1,
                                "margin": "sm",
                                "size": "sm"
                            },
                            {
                                "type": "text",
                                "text": "แจ้งเตือนการนัดหมาย",
                                "weight": "bold",
                                "color": "#FFFFFF",
                                "size": "lg",
                                "flex": 9,
                                "margin": "sm",
                                "scaling": true
                            }
                        ]
                    },
                    {
                        "type": "text",
                        "text": "วันพรุ่งนี้",
                        "color": "#FFFFFF",
                        "size": "sm",
                        "align": "center",
                        "margin": "xs",
                        "scaling": true
                    }
                ],
                "backgroundColor": "#FF6B35",
                "paddingAll": "15px"
            },
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "box",
                        "layout": "horizontal",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [],
                                "alignItems": "center",
                                "flex": 0
                            },
                            {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": patientName || "คุณคนไข้",
                                        "size": "md",
                                        "color": "#2B5797",
                                        "weight": "bold",
                                        "margin": "xs",
                                        "scaling": true
                                    },
                                    {
                                        "type": "text",
                                        "text": caseDetails || "การตรวจทั่วไป",
                                        "size": "sm",
                                        "color": "#2B579755",
                                        "wrap": true,
                                        "scaling": true
                                    },
                                ],
                                "flex": 1,
                                "margin": "md"
                            }
                        ]
                    },
                    {
                        "type": "separator",
                        "margin": "lg"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "วันที่",
                                        "size": "sm",
                                        "color": "#7F8C8D",
                                        "flex": 1,
                                        "margin": "sm",
                                        "scaling": true
                                    },
                                    {
                                        "type": "text",
                                        "text": appointmentDate || "ไม่ระบุวันที่",
                                        "size": "sm",
                                        "color": "#2C3E50",
                                        "weight": "bold",
                                        "flex": 2,
                                        "align": "end",
                                        "scaling": true
                                    }
                                ],
                                "spacing": "sm"
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "เวลา",
                                        "size": "sm",
                                        "color": "#7F8C8D",
                                        "flex": 1,
                                        "margin": "sm",
                                        "scaling": true
                                    },
                                    {
                                        "type": "text",
                                        "text": appointmentTime || "ไม่ระบุเวลา",
                                        "size": "sm",
                                        "color": "#2C3E50",
                                        "weight": "bold",
                                        "flex": 2,
                                        "align": "end",
                                        "scaling": true
                                    }
                                ],
                                "spacing": "sm",
                                "margin": "sm"
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "แพทย์",
                                        "size": "sm",
                                        "color": "#7F8C8D",
                                        "flex": 1,
                                        "margin": "sm",
                                        "scaling": true
                                    },
                                    {
                                        "type": "text",
                                        "text": doctorName || "แพทย์ประจำ",
                                        "size": "sm",
                                        "color": "#2C3E50",
                                        "weight": "bold",
                                        "flex": 2,
                                        "align": "end",
                                        "scaling": true
                                    }
                                ],
                                "spacing": "sm",
                                "margin": "sm"
                            },
                            {
                                "type": "box",
                                "layout": "horizontal",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "สถานที่",
                                        "size": "sm",
                                        "color": "#7F8C8D",
                                        "flex": 1,
                                        "margin": "sm",
                                        "scaling": true
                                    },
                                    {
                                        "type": "text",
                                        "text": branch ? ("สาขา" + branch) : "คลินิกทันตกรรม",
                                        "size": "sm",
                                        "color": "#2C3E50",
                                        "weight": "bold",
                                        "flex": 2,
                                        "align": "end",
                                        "scaling": true
                                    }
                                ],
                                "spacing": "sm",
                                "margin": "sm"
                            }
                        ],
                        "margin": "lg"
                    },
                    {
                        "type": "separator",
                        "margin": "xxl"
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {
                                "type": "text",
                                "text": "📝 เตรียมตัวก่อนมาตรวจ:",
                                "weight": "bold",
                                "size": "sm",
                                "color": "#2B5797",
                                "margin": "md",
                                "scaling": true
                            },
                            {
                                "type": "text",
                                "text": "• แปรงฟันให้สะอาด\n• งดอาหารก่อนการรักษา 1 ชั่วโมง\n• นำบัตรประชาชนมาด้วย",
                                "size": "xs",
                                "color": "#7F8C8D",
                                "wrap": true,
                                "margin": "sm",
                                "scaling": true
                            }
                        ]
                    }
                ],
                "paddingAll": "15px"
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": "หากต้องการเลื่อนวันนัดหมายกรุณาติดต่อเจ้าหน้าที่",
                        "size": "xs",
                        "color": "#7F8C8D",
                        "scaling": true,
                        "adjustMode": "shrink-to-fit"
                    }
                ],
                "backgroundColor": "#F8F9FA",
                "paddingAll": "10px"
            }
        }
    };
}

/**
 * Create summary message for 7-day reminders
 */
function createAppointmentReminderSummary(sentCount, failedCount, totalCount, targetDate, results) {
    let message = `*🔔 การแจ้งเตือนการนัดหมาย (7 วันล่วงหน้า)*\n`;
    message += `*วันที่นัดหมาย:* ${formatDateThai(targetDate)}\n\n`;
    message += `📊 *สรุปผลการส่ง:*\n`;
    message += `✅ ส่งสำเร็จ: ${sentCount} ราย\n`;
    message += `❌ ส่งไม่สำเร็จ: ${failedCount} ราย\n`;
    message += `📋 การนัดหมายทั้งหมด: ${totalCount} ราย\n`;
    message += `📱 คนไข้ที่ลงทะเบียน LINE: ${sentCount + failedCount} ราย\n\n`;

    // Add successful sends
    if (sentCount > 0) {
        message += `✅ *ส่งสำเร็จ:*\n`;
        results.filter(r => r.status === 'sent').forEach(result => {
            message += `• ${result.patientName} (${result.patientId}) - ${result.appointmentTime}\n`;
        });
        message += '\n';
    }

    // Add failures if any
    if (failedCount > 0) {
        message += `❌ *ส่งไม่สำเร็จ:*\n`;
        results.filter(r => r.status === 'failed' || r.status === 'error').forEach(result => {
            message += `• ${result.patientName || result.patientId} - ${result.reason}\n`;
        });
        message += '\n';
    }

    // Add skipped patients
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    if (skippedCount > 0) {
        message += `⏭️ *ไม่ได้ลงทะเบียน LINE:* ${skippedCount} ราย\n`;
    }

    message += `\n⏰ *การแจ้งเตือนถัดไป:* วันพรุ่งนิ้ (1 วันล่วงหน้า)`;

    return message;
}

/**
 * Create appointment confirmation Flex Message
 */
function createAppointmentConfirmationFlexMessage(appointmentData, patient, doctor) {
    const { patientName, doctorName, appointmentDate, appointmentTime, caseDetails, branch } = appointmentData;
    return {
        type: "flex",
        altText: `ยืนยันการนัดหมาย ${appointmentDate} ${appointmentTime}`,
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "image",
                                url: "https://img.icons8.com/fluency/24/calendar.png",
                                flex: 1,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "ยืนยันการนัดหมาย",
                                weight: "bold",
                                color: "#FFFFFF",
                                size: "lg",
                                flex: 9,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                        justifyContent: "center",
                        alignItems: "center"
                    },
                ],
                paddingAll: "15px",
                paddingBottom: "10px",
            },
            body: {
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
                                        text: patient ? (patient.title_prefix + patient.first_name + " " + patient.last_name) : "คุณคนไข้",
                                        size: "md",
                                        color: "#20a4e6",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `${caseDetails || 'การตรวจทั่วไป'}`,
                                        size: "sm",
                                        color: "#666666",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                ],
                                flex: 1,
                                margin: "md",
                            },
                        ],
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "วันที่",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: appointmentDate,
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "เวลา",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: appointmentTime,
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "แพทย์",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: doctor ? (doctor.first_name + " " + doctor.last_name) : "แพทย์ประจำ",
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "สถานที่",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: branch ? `สาขา${branch}` : "คลินิกทันตกรรม",
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                        ],
                        margin: "lg",
                    },
                    {
                        type: "separator",
                        margin: "xxl",
                    },
                    {
                        type: "text",
                        text: "🎉 การนัดหมายของคุณได้รับการยืนยันเรียบร้อยแล้ว กรุณามาตามวันและเวลาที่กำหนด หากมีปัญหากรุณาติดต่อเจ้าหน้าที่",
                        size: "sm",
                        color: "#333333",
                        wrap: true,
                        margin: "md",
                        scaling: true,
                    },
                ],
                paddingAll: "15px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "หากต้องการเลื่อนวันนัดหมายกรุณาติดต่อเจ้าหน้าที่ล่วงหน้า",
                        size: "xs",
                        color: "#666666",
                        scaling: true,
                        wrap: true,
                    },
                ],
                backgroundColor: "#F8F9FA",
                paddingAll: "10px",
            },
            styles: {
                header: {
                    backgroundColor: "#20a4e6",
                },
                body: {
                    backgroundColor: "#FFFFFF",
                },
                footer: {
                    backgroundColor: "#F8F9FA",
                }
            },
        },
    };
}

function createAppointmentEditFlexMessage(appointmentData, patient, doctor) {
    const { patientName, doctorName, appointmentDate, appointmentTime, caseDetails, branch } = appointmentData;
    return {
        type: "flex",
        altText: `แก้ไขการนัดหมาย ${appointmentDate} ${appointmentTime}`,
        contents: {
            type: "bubble",
            size: "kilo",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "image",
                                url: "https://img.icons8.com/fluency/24/calendar.png",
                                flex: 1,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "แก้ไขการนัดหมาย",
                                weight: "bold",
                                color: "#FFFFFF",
                                size: "lg",
                                flex: 9,
                                margin: "sm",
                                scaling: true,
                            },
                        ],
                        justifyContent: "center",
                        alignItems: "center"
                    },
                ],
                paddingAll: "15px",
                paddingBottom: "10px",
            },
            body: {
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
                                        text: patient ? (patient.title_prefix + patient.first_name + " " + patient.last_name) : "คุณคนไข้",
                                        size: "md",
                                        color: "#20a4e6",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: `${caseDetails || 'การตรวจทั่วไป'}`,
                                        size: "sm",
                                        color: "#666666",
                                        margin: "xs",
                                        wrap: true,
                                        scaling: true,
                                    },
                                ],
                                flex: 1,
                                margin: "md",
                            },
                        ],
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "วันที่",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: appointmentDate,
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "เวลา",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: appointmentTime,
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "แพทย์",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: doctor ? (doctor.first_name + " " + doctor.last_name) : "แพทย์ประจำ",
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "text",
                                        text: "สถานที่",
                                        size: "sm",
                                        color: "#666666",
                                        flex: 1,
                                        margin: "sm",
                                        scaling: true,
                                    },
                                    {
                                        type: "text",
                                        text: branch ? `สาขา${branch}` : "คลินิกทันตกรรม",
                                        size: "sm",
                                        color: "#333333",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                        scaling: true,
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                        ],
                        margin: "lg",
                    },
                    {
                        type: "separator",
                        margin: "xxl",
                    },
                    {
                        type: "text",
                        text: "🎉 การนัดหมายของคุณได้รับการแก้ไขเรียบร้อยแล้ว กรุณามาตามวันและเวลาที่กำหนด หากมีปัญหากรุณาติดต่อเจ้าหน้าที่",
                        size: "sm",
                        color: "#333333",
                        wrap: true,
                        margin: "md",
                        scaling: true,
                    },
                ],
                paddingAll: "15px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "หากต้องการเลื่อนวันนัดหมายกรุณาติดต่อเจ้าหน้าที่ล่วงหน้า",
                        size: "xs",
                        color: "#666666",
                        scaling: true,
                        wrap: true,
                    },
                ],
                backgroundColor: "#F8F9FA",
                paddingAll: "10px",
            },
            styles: {
                header: {
                    backgroundColor: "#20a4e6",
                },
                body: {
                    backgroundColor: "#FFFFFF",
                },
                footer: {
                    backgroundColor: "#F8F9FA",
                }
            },
        },
    }
}

/**
 * Format date to Thai format for 7-day reminders
 */
function formatDateThai(dateString) {
    try {
        const date = new Date(dateString);
        const thaiMonths = [
            'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
            'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
        ];

        const day = date.getDate();
        const month = thaiMonths[date.getMonth()];
        const year = date.getFullYear() + 543; // Convert to Buddhist Era

        return `${day} ${month} ${year}`;
    } catch (error) {
        console.error("Error formatting date:", error);
        return dateString;
    }
}

/**
 * Format time to Thai format for 7-day reminders
 */
function formatTimeThai(timeString) {
    try {
        if (!timeString) return '09:00 น.';

        // Handle various time formats
        let time = timeString;
        if (timeString.includes('T')) {
            time = timeString.split('T')[1].split(':').slice(0, 2).join(':');
        }

        return `${time} น.`;
    } catch (error) {
        console.error("Error formatting time:", error);
        return '09:00 น.';
    }
}

/**
 * Test 7-day appointment reminder system
 */
function testAppointmentReminders() {
    console.log("Testing 7-day appointment reminder system...");

    const result = sendAppointmentReminders();
    console.log("7-day reminders test result:", JSON.stringify(result, null, 2));

    return result;
}