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
 * Complete setup example function
 * This shows how to set up everything from scratch
 */
function completeSetupExample() {
  Logger.log("=== Complete Setup Example ===");

  // Step 1: Check Google Chat webhook
  Logger.log("Step 1: Checking Google Chat webhook...");
  const webhookUrl = getGoogleChatWebhook();
  if (!webhookUrl) {
    Logger.log("❌ Google Chat webhook not configured");
    return { success: false, message: "กรุณาตั้งค่า Google Chat Webhook ก่อน" };
  }
  Logger.log("✅ Google Chat webhook is configured");

  // Step 2: Test notification
  Logger.log("Step 2: Testing Google Chat notification...");
  const testResult = testGoogleChatNotification();
  if (!testResult.success) {
    Logger.log("❌ Google Chat test failed:", testResult.message);
    return testResult;
  }
  Logger.log("✅ Google Chat test successful");

  // Step 3: Set up daily brief trigger
  Logger.log("Step 3: Setting up daily patient brief trigger...");
  const setupResult = setupDailyPatientBrief(8, 0); // 8:00 AM
  if (!setupResult.success) {
    Logger.log("❌ Daily brief setup failed:", setupResult.message);
    return setupResult;
  }
  Logger.log("✅ Daily brief trigger set up successfully");

  // Step 4: Send test brief
  Logger.log("Step 4: Sending test daily brief...");
  const briefResult = sendImmediatePatientBrief();
  if (!briefResult.success) {
    Logger.log("❌ Test brief failed:", briefResult.message);
    return briefResult;
  }
  Logger.log("✅ Test brief sent successfully");

  Logger.log("=== Setup Complete! ===");
  Logger.log(
    "Daily patient brief will be sent every day at 8:00 AM Thailand time"
  );

  return {
    success: true,
    message: "การตั้งค่าสำเร็จ - ระบบจะส่งรายงานรายวันเวลา 8:00 น. ทุกวัน",
  };
}