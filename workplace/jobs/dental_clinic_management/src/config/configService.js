/**
 * Configuration management functions
 * Handles system configuration including Google Chat webhooks and notification settings
 */

/**
 * Set Google Chat webhook URL configuration
 * Call this function once to configure your Google Chat integration
 */
function setGoogleChatWebhook(webhookUrl) {
  try {
    if (!webhookUrl || webhookUrl.trim() === "") {
      return {
        success: false,
        message: "กรุณาระบุ Google Chat Webhook URL",
      };
    }

    // Validate webhook URL format
    if (!webhookUrl.includes("chat.googleapis.com")) {
      return {
        success: false,
        message: "Google Chat Webhook URL ไม่ถูกต้อง",
      };
    }

    // Store webhook URL in script properties
    PropertiesService.getScriptProperties().setProperty(
      "GOOGLE_CHAT_WEBHOOK_URL",
      webhookUrl
    );

    return {
      success: true,
      message: "ตั้งค่า Google Chat Webhook เรียบร้อย",
    };
  } catch (error) {
    console.error("Error setting Google Chat webhook:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get stored Google Chat webhook URL
 */
function getGoogleChatWebhook() {
  try {
    return PropertiesService.getScriptProperties().getProperty(
      "GOOGLE_CHAT_WEBHOOK_URL"
    );
  } catch (error) {
    console.error("Error getting Google Chat webhook:", error);
    return null;
  }
}

/**
 * Test Google Chat notification with card format
 */
function testGoogleChatNotification() {
  return testGoogleChatCardNotification();
}

/**
 * Test all notification formats (legacy function for backward compatibility)
 */
function testGoogleChatNotificationLegacy() {
  return sendGoogleChatNotification(
    "🔧 นี่คือข้อความทดสอบจากระบบจัดการคลินิคทันตกรรม\n✨ ระบบการแจ้งเตือนทำงานได้ปกติ",
    "🧪 การทดสอบระบบการแจ้งเตือน"
  );
}

/**
 * Configure Google Chat webhook from web interface
 */
function configureGoogleChatWebhook(webhookUrl) {
  return setGoogleChatWebhook(webhookUrl);
}

/**
 * Get notification configuration status
 */
function getNotificationStatus() {
  try {
    const webhookUrl = getGoogleChatWebhook();
    const notificationsEnabled = areNotificationsEnabled();
    
    return {
      success: true,
      status: {
        webhookConfigured: !!webhookUrl,
        notificationsEnabled: notificationsEnabled,
        webhookUrl: webhookUrl ? webhookUrl.substring(0, 50) + "..." : null,
      },
    };
  } catch (error) {
    console.error("Error getting notification status:", error);
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Enable/Disable notifications (for future use)
 */
function toggleNotifications(enabled) {
  try {
    PropertiesService.getScriptProperties().setProperty(
      "NOTIFICATIONS_ENABLED",
      enabled.toString()
    );
    
    return {
      success: true,
      message: enabled ? "เปิดการแจ้งเตือนแล้ว" : "ปิดการแจ้งเตือนแล้ว",
    };
  } catch (error) {
    console.error("Error toggling notifications:", error);
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Check if notifications are enabled
 */
function areNotificationsEnabled() {
  try {
    const enabled = PropertiesService.getScriptProperties().getProperty(
      "NOTIFICATIONS_ENABLED"
    );
    return enabled !== "false"; // Default to true if not set
  } catch (error) {
    console.error("Error checking notifications status:", error);
    return true; // Default to enabled
  }
}