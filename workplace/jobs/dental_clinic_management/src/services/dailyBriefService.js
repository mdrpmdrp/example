/**
 * Daily brief management functions
 * Contains all functions for managing automated daily patient briefs
 */

/**
 * Setup daily patient brief - Run this once to set up automatic daily reports
 * Default time: 8:00 AM Thailand time
 *
 * Example usage:
 * setupDailyPatientBrief() // Sets up daily brief at 8:00 AM
 * setupDailyPatientBrief(9, 30) // Sets up daily brief at 9:30 AM
 */
function setupDailyPatientBrief(hour = 8, minute = 0) {
  Logger.log("Setting up daily patient brief...");

  // First check if Google Chat is configured
  const webhookUrl = getGoogleChatWebhook();
  if (!webhookUrl) {
    const message = "กรุณาตั้งค่า Google Chat Webhook ก่อนใช้งานระบบแจ้งเตือนรายวัน\n" +
                   "โดยเรียกใช้ฟังก์ชัน: setGoogleChatWebhook('YOUR_WEBHOOK_URL')";
    Logger.log(message);
    return { success: false, message: message };
  }

  // Create the trigger
  const result = createDailyPatientBriefTrigger(hour, minute);

  if (result.success) {
    const message = `ตั้งค่าการส่งรายงานรายวันเรียบร้อย - จะส่งทุกวันเวลา ${hour}:${minute.toString().padStart(2, "0")} น.`;
    Logger.log(message);
    return { success: true, message: message };
  } else {
    Logger.log("Error setting up daily brief:", result.message);
    return result;
  }

  return result;
}

/**
 * Remove daily patient brief trigger
 */
function removeDailyPatientBrief() {
  Logger.log("Removing daily patient brief...");
  const result = deleteDailyPatientBriefTriggers();

  if (result.success) {
    Logger.log("Daily patient brief removed successfully");
  } else {
    Logger.log("Error removing daily brief:", result.message);
  }

  return result;
}

/**
 * Check daily patient brief status
 */
function checkDailyPatientBriefStatus() {
  const status = getDailyPatientBriefTriggerStatus();

  if (status.success) {
    if (status.status.hasActiveTrigger) {
      Logger.log(`Daily brief is active: ${status.status.message}`);
    } else {
      Logger.log("Daily brief is not active");
    }
  } else {
    Logger.log("Error checking status:", status.message);
  }

  return status;
}

/**
 * Send immediate patient brief (for testing)
 */
function sendImmediatePatientBrief() {
  Logger.log("Sending immediate patient brief for testing...");
  const result = sendDailyPatientBrief();

  if (result.success) {
    Logger.log("Test brief sent successfully");
  } else {
    Logger.log("Error sending test brief:", result.message);
  }

  return result;
}

/**
 * Manual trigger function for daily patient brief
 * Can be called manually or scheduled
 */
function triggerDailyPatientBrief() {
  const result = sendDailyPatientBrief();
  Logger.log("Daily patient brief result:", result);
  return result;
}

/**
 * Test function for daily patient brief
 */
function testDailyPatientBrief() {
  Logger.log("Testing daily patient brief...");
  return sendDailyPatientBrief();
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