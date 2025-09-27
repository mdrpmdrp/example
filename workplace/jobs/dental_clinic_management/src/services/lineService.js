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
        altText: "ไม่พบข้อมูลผู้ป่วย",
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
                                text: "ค้นหาข้อมูลผู้ป่วย",
                                weight: "bold",
                                color: "#2B5797",
                                size: "lg",
                                flex: 1,
                                margin: "sm",
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
                                        text: "ไม่พบข้อมูลผู้ป่วย",
                                        weight: "bold",
                                        size: "xl",
                                        color: "#E74C3C",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสผู้ป่วย: ${patientId}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "sm",
                                        wrap: true,
                                    },
                                    {
                                        type: "separator",
                                        margin: "md",
                                    },
                                    {
                                        type: "text",
                                        text: "กรุณาตรวจสอบรหัสผู้ป่วยให้ถูกต้อง หรือติดต่อเจ้าหน้าที่เพื่อขอความช่วยเหลือ",
                                        size: "sm",
                                        color: "#34495E",
                                        wrap: true,
                                        margin: "md",
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
                                    },
                                    {
                                        type: "text",
                                        text: `${patientName || 'ผู้ป่วย'}`,
                                        size: "md",
                                        color: "#2B5797",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสผู้ป่วย: ${patientId}`,
                                        size: "sm",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `สาขา: ${branch || 'สาขาหลัก'}`,
                                        size: "sm",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                    },
                                    {
                                        type: "separator",
                                        margin: "xxl",
                                    },
                                    {
                                        type: "text",
                                        text: "รหัสผู้ป่วยนี้ได้ลงทะเบียน LINE แล้ว หากมีปัญหาในการใช้งาน กรุณาติดต่อเจ้าหน้าที่",
                                        size: "xs",
                                        color: "#34495E",
                                        wrap: true,
                                        margin: "md",
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
                        wrap: true,
                        align: "center",
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
                                        text: `${patientName || 'ผู้ป่วย'}`,
                                        size: "lg",
                                        color: "#2B5797",
                                        weight: "bold",
                                        margin: "sm",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `รหัสผู้ป่วย: ${patientId}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `สาขา: ${branch || 'สาขาหลัก'}`,
                                        size: "md",
                                        color: "#7F8C8D",
                                        margin: "xs",
                                        wrap: true,
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
                        wrap: true,
                        align: "center",
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

// Additional Flex Message Templates for Dental Clinic System
function createAppointmentReminderFlexMessage(appointmentData) {
    const {
        patientName,
        doctorName,
        appointmentDate,
        appointmentTime,
        treatmentType,
        location,
    } = appointmentData;

    return {
        type: "flex",
        altText: `การนัดหมาย ${appointmentDate} ${appointmentTime}`,
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
                                url: "https://img.icons8.com/fluency/48/calendar.png",
                                size: "sm",
                            },
                            {
                                type: "text",
                                text: "การนัดหมายของคุณ",
                                weight: "bold",
                                color: "#FFFFFF",
                                size: "lg",
                                flex: 1,
                                margin: "sm",
                            },
                        ],
                    },
                ],
                backgroundColor: "#2B5797",
                paddingAll: "15px",
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
                                        url: "https://img.icons8.com/fluency/96/tooth.png",
                                        size: "xxl", aspectMode: "fit",
                                    },
                                ],
                                alignItems: "center",
                                flex: 0,
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: treatmentType || "การตรวจทั่วไป",
                                        weight: "bold",
                                        size: "xl",
                                        color: "#2B5797",
                                        wrap: true,
                                    },
                                    {
                                        type: "text",
                                        text: `คุณ ${patientName}`,
                                        size: "sm",
                                        color: "#7F8C8D",
                                        margin: "xs",
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
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/calendar.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "วันที่",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm",
                                    },
                                    {
                                        type: "text",
                                        text: appointmentDate,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                    },
                                ],
                                spacing: "sm",
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/clock.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "เวลา",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm",
                                    },
                                    {
                                        type: "text",
                                        text: appointmentTime,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
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
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/doctor-male.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "แพทย์",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm",
                                    },
                                    {
                                        type: "text",
                                        text: doctorName,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
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
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/map-pin.png",
                                        size: "sm",
                                    },
                                    {
                                        type: "text",
                                        text: "สถานที่",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm",
                                    },
                                    {
                                        type: "text",
                                        text: location || "คลินิกทันตกรรม",
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end",
                                    },
                                ],
                                spacing: "sm",
                                margin: "sm",
                            },
                        ],
                        margin: "lg",
                    },
                ],
                paddingAll: "15px",
            }
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
                    },
                ].concat(branch ? [{
                    type: "text",
                    text: `สาขา: ${branch}`,
                    weight: "bold",
                    color: "#FFFFFF",
                    size: "md",
                    align: "center",
                    margin: "xs",
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
                            },
                            {
                                type: "text",
                                text: "1️⃣ พิมพ์รหัสผู้ป่วยของคุณ (เช่น P12345678)\n2️⃣ ลงทะเบียน LINE เพื่อใช้บริการ\n3️⃣ รับการแจ้งเตือนและข้อมูลการนัดหมาย",
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

// 7-Day Appointment Reminder Functions
/**
 * Send appointment reminders to registered patients 7 days ahead
 * @returns {Object} Result object with success status and message details
 */
function sendSevenDayAppointmentReminders() {
    try {
        console.log("Starting 7-day appointment reminder process...");
        
        // Calculate target date (7 days from today)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7);
        const targetDateString = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD format
        
        console.log(`Checking appointments for ${targetDateString} (7 days ahead)`);
        
        // Get appointments for the target date
        const appointmentsResult = getAppointmentsByDateRange(targetDateString, targetDateString);
        
        if (!appointmentsResult.success) {
            console.error("Failed to retrieve appointments:", appointmentsResult.message);
            return {
                success: false,
                message: "ไม่สามารถดึงข้อมูลการนัดหมายได้",
                details: appointmentsResult.message
            };
        }
        
        const appointments = appointmentsResult.appointments;
        console.log(`Found ${appointments.length} appointments for ${targetDateString}`);
        
        if (appointments.length === 0) {
            return {
                success: true,
                message: "ไม่มีการนัดหมายในวันที่ 7 วันข้างหน้า",
                sentCount: 0,
                totalCount: 0,
                targetDate: targetDateString
            };
        }
        
        // Get all patients to match LINE User IDs
        const patientsResult = JSON.parse(getAllPatients());
        if (!patientsResult.success) {
            console.error("Failed to retrieve patients:", patientsResult.message);
            return {
                success: false,
                message: "ไม่สามารถดึงข้อมูลผู้ป่วยได้"
            };
        }
        
        const patients = patientsResult.patients;
        const patientMap = {};
        
        // Create patient lookup map
        patients.forEach(patient => {
            if (patient.line_user_id && patient.line_user_id.trim() !== "") {
                patientMap[patient.patient_id] = {
                    lineUserId: patient.line_user_id.trim(),
                    patientName: `${patient.title_name || ''} ${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
                    branch: patient.branch || 'สาขาหลัก',
                    phone: patient.phone || ''
                };
            }
        });
        
        let sentCount = 0;
        let failedCount = 0;
        const results = [];
        
        // Process each appointment
        for (const appointment of appointments) {
            const patientId = appointment.patient_id;
            const patientInfo = patientMap[patientId];
            
            if (!patientInfo) {
                console.log(`Patient ${patientId} not registered with LINE, skipping...`);
                results.push({
                    patientId: patientId,
                    status: 'skipped',
                    reason: 'ผู้ป่วยไม่ได้ลงทะเบียน LINE'
                });
                continue;
            }
            
            // Prepare appointment data for 7-day reminder Flex Message
            const appointmentData = {
                patientName: patientInfo.patientName,
                doctorName: appointment.doctor_name || 'แพทย์ประจำ',
                appointmentDate: formatDateThai(appointment.appointment_date),
                appointmentTime: formatTimeThai(appointment.appointment_time),
                treatmentType: appointment.treatment_detail || 'การตรวจทั่วไป',
                location: `คลินิกทันตกรรม - ${patientInfo.branch}`,
                appointmentId: appointment.appointment_id,
                daysAhead: 7
            };
            
            try {
                // Create 7-day reminder Flex Message
                const reminderMessage = createSevenDayReminderFlexMessage(appointmentData);
                const sendResult = sendFlexMessage(patientInfo.lineUserId, reminderMessage);
                
                if (sendResult) {
                    sentCount++;
                    results.push({
                        patientId: patientId,
                        patientName: patientInfo.patientName,
                        status: 'sent',
                        appointmentDate: appointmentData.appointmentDate,
                        appointmentTime: appointmentData.appointmentTime
                    });
                    console.log(`7-day reminder sent to ${patientInfo.patientName} (${patientId})`);
                } else {
                    failedCount++;
                    results.push({
                        patientId: patientId,
                        patientName: patientInfo.patientName,
                        status: 'failed',
                        reason: 'LINE API Error'
                    });
                    console.error(`Failed to send 7-day reminder to ${patientInfo.patientName} (${patientId})`);
                }
                
                // Add delay between messages to avoid rate limiting
                Utilities.sleep(500);
                
            } catch (error) {
                failedCount++;
                results.push({
                    patientId: patientId,
                    patientName: patientInfo.patientName,
                    status: 'error',
                    reason: error.toString()
                });
                console.error(`Error sending 7-day reminder to ${patientId}:`, error);
            }
        }
        
        // Send summary notification to Google Chat
        const summaryMessage = createSevenDayReminderSummary(sentCount, failedCount, appointments.length, targetDateString, results);
        sendGoogleChatNotification(summaryMessage, "📅 การแจ้งเตือนการนัดหมาย (7 วันล่วงหน้า)");
        
        console.log(`7-day appointment reminder process completed. Sent: ${sentCount}, Failed: ${failedCount}, Total: ${appointments.length}`);
        
        return {
            success: true,
            message: "ส่งการแจ้งเตือน 7 วันล่วงหน้าเรียบร้อย",
            sentCount: sentCount,
            failedCount: failedCount,
            totalCount: appointments.length,
            results: results,
            targetDate: targetDateString,
            daysAhead: 7
        };
        
    } catch (error) {
        console.error("Error in sendSevenDayAppointmentReminders:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาดในการส่งการแจ้งเตือน 7 วันล่วงหน้า",
            error: error.toString()
        };
    }
}

/**
 * Create specialized Flex Message for 7-day appointment reminder
 */
function createSevenDayReminderFlexMessage(appointmentData) {
    const { patientName, doctorName, appointmentDate, appointmentTime, treatmentType, location } = appointmentData;
    
    return {
        type: "flex",
        altText: `การนัดหมาย ${appointmentDate} ${appointmentTime} (อีก 7 วัน)`,
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
                                url: "https://img.icons8.com/fluency/48/bell.png",
                                flex: 0,
                                margin: "sm",
                                size: "sm"
                            },
                            {
                                type: "text",
                                text: "แจ้งเตือนการนัดหมาย",
                                weight: "bold",
                                color: "#FFFFFF",
                                size: "lg",
                                flex: 1,
                                margin: "sm"
                            }
                        ]
                    },
                    {
                        type: "text",
                        text: "อีก 7 วันข้างหน้า",
                        color: "#FFFFFF",
                        size: "sm",
                        align: "center",
                        margin: "xs"
                    }
                ],
                backgroundColor: "#FF6B35",
                paddingAll: "15px"
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
                                        url: "https://img.icons8.com/fluency/96/tooth.png",
                                        size: "xxl",
                                        aspectMode: "fit"
                                    }
                                ],
                                alignItems: "center",
                                flex: 0
                            },
                            {
                                type: "box",
                                layout: "vertical",
                                contents: [
                                    {
                                        type: "text",
                                        text: treatmentType || "การตรวจทั่วไป",
                                        weight: "bold",
                                        size: "xl",
                                        color: "#FF6B35",
                                        wrap: true
                                    },
                                    {
                                        type: "text",
                                        text: `คุณ ${patientName}`,
                                        size: "md",
                                        color: "#2B5797",
                                        weight: "bold",
                                        margin: "xs"
                                    }
                                ],
                                flex: 1,
                                margin: "md"
                            }
                        ]
                    },
                    {
                        type: "separator",
                        margin: "lg"
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
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/calendar.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "วันที่",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: appointmentDate,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end"
                                    }
                                ],
                                spacing: "sm"
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/clock.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "เวลา",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: appointmentTime,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end"
                                    }
                                ],
                                spacing: "sm",
                                margin: "sm"
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/doctor-male.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "แพทย์",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: doctorName,
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end"
                                    }
                                ],
                                spacing: "sm",
                                margin: "sm"
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                contents: [
                                    {
                                        type: "image",
                                        url: "https://img.icons8.com/fluency/24/map-pin.png",
                                        flex: 0,
                                        margin: "none",
                                        size: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: "สถานที่",
                                        size: "sm",
                                        color: "#7F8C8D",
                                        flex: 1,
                                        margin: "sm"
                                    },
                                    {
                                        type: "text",
                                        text: location || "คลินิกทันตกรรม",
                                        size: "sm",
                                        color: "#2C3E50",
                                        weight: "bold",
                                        flex: 2,
                                        align: "end"
                                    }
                                ],
                                spacing: "sm",
                                margin: "sm"
                            }
                        ],
                        margin: "lg"
                    },
                    {
                        type: "separator",
                        margin: "lg"
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        contents: [
                            {
                                type: "text",
                                text: "📝 เตรียมตัวก่อนมาตรวจ:",
                                weight: "bold",
                                size: "sm",
                                color: "#2B5797",
                                margin: "md"
                            },
                            {
                                type: "text",
                                text: "• แปรงฟันให้สะอาด\n• งดอาหารก่อนการรักษา 1 ชั่วโมง\n• นำบัตรประชาชนมาด้วย\n• หากไม่สะดวกมา กรุณาแจ้งล่วงหน้า",
                                size: "xs",
                                color: "#7F8C8D",
                                wrap: true,
                                margin: "sm"
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
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "button",
                                action: {
                                    type: "message",
                                    text: "ยกเลิกนัด"
                                },
                                style: "secondary",
                                color: "#E74C3C",
                                height: "sm",
                                flex: 1
                            },
                            {
                                type: "button",
                                action: {
                                    type: "message",
                                    text: "เลื่อนนัด"
                                },
                                style: "secondary",
                                color: "#F39C12",
                                height: "sm",
                                flex: 1,
                                margin: "sm"
                            },
                            {
                                type: "button",
                                action: {
                                    type: "message",
                                    text: "ยืนยันนัด"
                                },
                                style: "primary",
                                color: "#27AE60",
                                height: "sm",
                                flex: 1,
                                margin: "sm"
                            }
                        ],
                        spacing: "sm"
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: "💡 แจ้งเตือนนี้ส่งล่วงหน้า 7 วัน เพื่อให้คุณได้เตรียมตัว",
                                size: "xs",
                                color: "#95A5A6",
                                align: "center",
                                wrap: true
                            }
                        ],
                        margin: "md"
                    }
                ],
                paddingAll: "15px"
            }
        }
    };
}

/**
 * Create summary message for 7-day reminders
 */
function createSevenDayReminderSummary(sentCount, failedCount, totalCount, targetDate, results) {
    let message = `*🔔 การแจ้งเตือนการนัดหมาย (7 วันล่วงหน้า)*\n`;
    message += `*วันที่นัดหมาย:* ${formatDateThai(targetDate)}\n\n`;
    message += `📊 *สรุปผลการส่ง:*\n`;
    message += `✅ ส่งสำเร็จ: ${sentCount} ราย\n`;
    message += `❌ ส่งไม่สำเร็จ: ${failedCount} ราย\n`;
    message += `📋 การนัดหมายทั้งหมด: ${totalCount} ราย\n`;
    message += `📱 ผู้ป่วยที่ลงทะเบียน LINE: ${sentCount + failedCount} ราย\n\n`;
    
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
function testSevenDayAppointmentReminders() {
    console.log("Testing 7-day appointment reminder system...");
    
    const result = sendSevenDayAppointmentReminders();
    console.log("7-day reminders test result:", JSON.stringify(result, null, 2));
    
    return result;
}