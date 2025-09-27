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

/**
 * Send daily patient brief to Google Chat
 * This function sends a summary of today's appointments grouped by branch
 */
function sendDailyPatientBrief() {
  try {
    if (!areNotificationsEnabled()) {
      return { success: false, message: "Notifications are disabled" };
    }

    const today = new Date();
    const dateFormatted = today.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dayOfWeek = today.toLocaleDateString("th-TH", { weekday: "long" });

    // Get today's appointments
    const todayString = today.toISOString().split("T")[0];
    const appointmentsResult = getTodayAppointments();

    if (!appointmentsResult.success) {
      return { success: false, message: "Cannot fetch today's appointments" };
    }

    const appointments = appointmentsResult.appointments;

    // Group appointments by branch
    const appointmentsByBranch = Object.groupBy(appointments,(a) => a.branch || "ไม่ระบุสาขา");

    // Send brief for each branch
    const branches = Object.keys(appointmentsByBranch);
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const branchAppointments = appointmentsByBranch[branch];

      const message = generateDailyBriefMessage(
        branch,
        branchAppointments,
        dateFormatted,
        dayOfWeek
      );
      const title = `📋 สรุปคนไข้ประจำวัน - ${branch}`;

      sendGoogleChatNotification(message, title);

      // Add delay between messages to avoid rate limiting
      if (i < branches.length - 1) {
        Utilities.sleep(2000); // Wait 2 seconds between branches
      }
    }

    return {
      success: true,
      message: `Daily brief sent for ${branches.length} branches`,
    };
  } catch (error) {
    console.error("Error sending daily patient brief:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get today's appointments from Today Appointments sheet
 */
function getTodayAppointments() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.TODAY_APPOINTMENTS);
  let [header, ...data] = sheet
    .getDataRange()
    .getValues()
    .filter((x) => x[0] != ""); // Remove empty rows

  if (data.length <= 1) {
    return { success: true, appointments: [] };
  }

  let appointments = data.map((row) => ({
    id: row[0],
    patientId: row[1],
    patientName: `${row[18]}${row[19]} ${row[20]}`,
    appointmentTime: row[4],
    caseType: row[5],
    caseDetails: row[6],
    status: row[9],
    branch: row[11],
    doctorName: `${row[16]} ${row[17]}`,
    doctorId: row[3],
  })).filter(a => a.status === 'scheduled'); // Only include scheduled appointments

  return { success: true, appointments };
}

/**
 * Generate daily brief message for a specific branch
 */
function generateDailyBriefMessage(
  branch,
  appointments,
  dateFormatted,
  dayOfWeek
) {
  let message = `🏥 ${branch}\n`;
  message += `📅 ${dayOfWeek} ${dateFormatted}\n\n`;

  if (appointments.length === 0) {
    message += `🎉 วันนี้ไม่มีการนัดหมาย\nได้พักผ่อนกันเถอะ! 😊\n`;
    return message;
  }

  // Group by status
  const appointmentsByStatus = {
    scheduled: appointments.filter((apt) => apt.status === "scheduled"),
    completed: appointments.filter((apt) => apt.status === "completed"),
    cancelled: appointments.filter((apt) => apt.status === "cancelled"),
  };

  // Summary statistics
  message += `📊 สรุปภาพรวม:\n`;
  message += `• รวมทั้งหมด: ${appointments.length} นัด\n\n`;

  // Show scheduled appointments details
  if (appointmentsByStatus.scheduled.length > 0) {
    message += `⏰ การนัดหมายที่กำหนดไว้: (${appointmentsByStatus.scheduled.length} นัด)\n`;
    appointmentsByStatus.scheduled
      .sort((a, b) => a.appointment_time?.localeCompare(b.appointment_time))
      .forEach((apt, index) => {
        message += `${index + 1}. ${apt.appointment_time} - `;
        message += `${apt.patient_name || `รหัส: ${apt.patient_id}`}\n`;
        message += `   📞 ${apt.patient_phone || "ไม่ระบุเบอร์"} | `;
        message += `👨‍⚕️ ${apt.doctor_name || "ไม่ระบุหมอ"}\n`;
        message += `   🦷 ${apt.case_type || "ไม่ระบุประเภท"}\n\n`;
      });
  }

  // Add encouragement message based on workload
  if (appointmentsByStatus.scheduled.length > 10) {
    message += `💪 วันนี้งานเยอะ แต่เราทำได้! สู้ๆ! 🌟`;
  } else if (appointmentsByStatus.scheduled.length > 5) {
    message += `👍 วันนี้งานพอดี ทำงานสนุกๆ นะ! 😊`;
  } else if (appointmentsByStatus.scheduled.length > 0) {
    message += `😌 วันนี้งานน้อย ได้พักผ่อนบ้าง! ☕`;
  }

  return message;
}
