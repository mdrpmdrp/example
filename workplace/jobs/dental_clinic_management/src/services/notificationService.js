/**
 * Notification service functions
 * Handles Google Chat notifications and daily patient briefs
 */

/**
 * Get upcoming appointments for notifications
 */
function getUpcomingAppointments(days = 1) {
  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + days);

    const targetDateString = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD format
    const appointmentsResult = getAppointmentsByDateRange(
      targetDateString,
      targetDateString
    );

    if (appointmentsResult.success) {
      return { success: true, appointments: appointmentsResult.appointments };
    }

    return { success: false, message: appointmentsResult.message };
  } catch (error) {
    console.error("Error getting upcoming appointments:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Send notification to Google Chat
 * Requires Google Chat webhook URL to be set
 */
function sendGoogleChatNotification(
  message,
  title = "ระบบจัดการคลินิคทันตกรรม"
) {
  try {
    const webhookUrl = getGoogleChatWebhook();
    if (!webhookUrl) {
      console.log("Google Chat webhook not configured");
      return { success: false, message: "Google Chat webhook not configured" };
    }

    const payload = {
      text: `${title}\n${message}`,
    };

    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
    };

    // Split long messages to avoid hitting limits
    const MAX_MESSAGE_LENGTH = 4000;
    let remainingMessage = message;

    while (remainingMessage.length > 0) {
      let currentMessage = remainingMessage;
      if (currentMessage.length > MAX_MESSAGE_LENGTH) {
        // Find a good break point (newline or space)
        let breakPoint = currentMessage.lastIndexOf("\n", MAX_MESSAGE_LENGTH);
        if (breakPoint === -1) {
          breakPoint = currentMessage.lastIndexOf(" ", MAX_MESSAGE_LENGTH);
        }
        if (breakPoint === -1) {
          breakPoint = MAX_MESSAGE_LENGTH;
        }
        currentMessage = currentMessage.substring(0, breakPoint);
      }

      const currentPayload = {
        text:
          currentMessage === message
            ? `${title}\n${currentMessage}`
            : currentMessage,
      };

      const currentOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        payload: JSON.stringify(currentPayload),
      };

      UrlFetchApp.fetch(webhookUrl, currentOptions);

      remainingMessage = remainingMessage.substring(currentMessage.length);
      if (remainingMessage.length > 0) {
        Utilities.sleep(1000); // Wait 1 second between messages
      }
    }

    return { success: true, message: "Notification sent successfully" };
  } catch (error) {
    console.error("Error sending Google Chat notification:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Send form submission notification to Google Chat
 */
function sendFormSubmissionNotification(formType, data, action = "เพิ่ม") {
  try {
    if (!areNotificationsEnabled()) {
      return { success: false, message: "Notifications are disabled" };
    }

    let message = "";
    let title = `📋 ${action}ข้อมูลเรียบร้อย`;

    switch (formType) {
      case "patient":
        message = `👤 คนไข้ใหม่\n\n`;
        message += `• สาขา: ${data[11] || "ไม่ระบุ"}\n\n`;
        message += `• ชื่อ: ${data[2]} ${data[3]}\n`;
        message += `• โทรศัพท์: ${data[4]}\n`;
        message += `• วันที่ลงทะเบียน: ${new Date(data[12]).toLocaleDateString(
          "th-TH"
        )}\n`;
        break;

      case "appointment":
        message = `📅 การนัดหมาย${action === "เพิ่ม" ? "ใหม่" : ""}\n\n`;
        message += `• สาขา: ${data[11] || "ไม่ระบุ"}\n\n`;
        message += `• รหัสคนไข้: ${data[1]}\n`;
        message += `• วันที่นัด: ${new Date(data[3]).toLocaleDateString(
          "th-TH"
        )}\n`;
        message += `• เวลา: ${data[4]}\n`;
        message += `• ประเภทการรักษา: ${data[5] || "ไม่ระบุ"}\n`;
        message += `• รายละเอียด: ${data[6] || "ไม่ระบุ"}\n`;
        break;

      case "doctor":
        message = `👨‍⚕️ หมอ${action === "เพิ่ม" ? "ใหม่" : ""}\n`;
        message += `• ชื่อ: ${data[1]} ${data[2]}\n`;
        message += `• ความเชี่ยวชาญ: ${data[3] || "ไม่ระบุ"}\n`;
        message += `• โทรศัพท์: ${data[4]}\n`;
        message += `• อีเมล: ${data[5] || "ไม่ระบุ"}\n`;
        break;

      case "revenue":
        message = `💰 รายได้${action === "เพิ่ม" ? "ใหม่" : ""}\n\n`;
        message += `• สาขา: ${data[16] || "ไม่ระบุ"}\n\n`;
        message += `• วันที่: ${new Date(data[1]).toLocaleDateString(
          "th-TH"
        )}\n`;
        message += `• รหัสคนไข้: ${data[2] || "ไม่ระบุ"}\n`;
        message += `• ประเภทการรักษา: ${data[4] || "ไม่ระบุ"}\n`;
        message += `• จำนวนเงิน: ${formatCurrency(data[7] || 0)}\n`;
        break;

      default:
        message = `📝 มีการ${action}ข้อมูลในระบบ`;
        break;
    }

    return sendGoogleChatNotification(message, title);
  } catch (error) {
    console.error("Error sending form submission notification:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Helper function to get Thai status text
 */
function getStatusTextThai(status) {
  const statusMap = {
    scheduled: "นัดหมาย",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  };
  return statusMap[status] || status;
}

// 7-Day Appointment Reminder Functions
/**
 * Send appointment reminders to registered patients 7 days ahead
 * @returns {Object} Result object with success status and message details
 */
function sendSevenDayAppointmentReminders() {
  try {
    console.log("Starting 7-day appointment reminder process...");

    // Get appointments for the target date
    const appointmentsResult = getSevenDaysAheadAppointments();

    if (!appointmentsResult.success) {
      console.error("Failed to retrieve appointments:", appointmentsResult.message);
      return {
        success: false,
        message: "ไม่สามารถดึงข้อมูลการนัดหมายได้",
        details: appointmentsResult.message
      };
    }

    const appointments = appointmentsResult.appointments;
    console.log(`Found ${appointments.length} appointments`);

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
      if (patient.userid && patient.userid.trim() !== "") {
        patientMap[patient.patient_id] = {
          lineUserId: patient.userid.trim(),
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
        doctorName: appointment.doctorName || 'แพทย์ประจำ',
        appointmentDate: formatDateThai(appointment.appointmentDate),
        appointmentTime: formatTimeThai(appointment.appointmentTime),
        caseDetails: appointment.caseDetails || 'ทั่วไป',
        branch: patientInfo.branch,
        daysAhead: 7
      };

      try {
        // Create 7-day reminder Flex Message
        const reminderMessage = createSevenDayReminderFlexMessage(appointmentData);
        Logger.log(JSON.stringify(reminderMessage));
        const sendResult = LineBotWebhook.push(patientInfo.lineUserId, LINE_CHANNEL_ACCESS_TOKEN, [reminderMessage]);
        // Add delay between messages to avoid rate limiting
        Utilities.sleep(500);
      } catch (error) {
        results.push({
          patientId: patientId,
          patientName: patientInfo.patientName,
          status: 'error',
          reason: error.toString()
        });
        console.error(`Error sending 7-day reminder to ${patientId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in sendSevenDayAppointmentReminders:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการส่งการแจ้งเตือน 7 วันล่วงหน้า",
      error: error.toString()
    };
  }
}