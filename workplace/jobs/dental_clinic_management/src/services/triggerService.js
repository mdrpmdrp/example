/**
 * Trigger management functions
 * Handles the creation and management of scheduled triggers for daily reports
 */

/**
 * Create daily patient brief trigger
 * This will send patient brief every morning at specified time
 */
function createDailyPatientBriefTrigger(hour = 8, minute = 0) {
  try {
    // Delete existing daily patient brief triggers first
    deleteDailyPatientBriefTriggers();

    // Validate hour and minute
    if (hour < 0 || hour > 23) {
      return { success: false, message: "ชั่วโมงต้องอยู่ระหว่าง 0-23" };
    }
    if (minute < 0 || minute > 59) {
      return { success: false, message: "นาทีต้องอยู่ระหว่าง 0-59" };
    }

    // Create new trigger
    const trigger = ScriptApp.newTrigger("triggerDailyPatientBrief")
      .timeBased()
      .everyDays(1)
      .atHour(hour)
      .nearMinute(minute)
      .inTimezone("Asia/Bangkok")
      .create();

    // Store trigger info for management
    PropertiesService.getScriptProperties().setProperties({
      DAILY_BRIEF_TRIGGER_ID: trigger.getUniqueId(),
      DAILY_BRIEF_HOUR: hour.toString(),
      DAILY_BRIEF_MINUTE: minute.toString(),
      DAILY_BRIEF_CREATED: new Date().toISOString(),
    });

    return {
      success: true,
      message: `ตั้งเวลาส่งรายงานรายวันเวลา ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} น. เรียบร้อย`,
      triggerId: trigger.getUniqueId(),
    };
  } catch (error) {
    console.error("Error creating daily patient brief trigger:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete all daily patient brief triggers
 */
function deleteDailyPatientBriefTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;

    triggers.forEach((trigger) => {
      const handlerFunction = trigger.getHandlerFunction();
      if (
        handlerFunction === "triggerDailyPatientBrief" ||
        handlerFunction === "sendDailyPatientBrief"
      ) {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });

    // Clear stored trigger info
    const properties = PropertiesService.getScriptProperties();
    properties.deleteProperty("DAILY_BRIEF_TRIGGER_ID");
    properties.deleteProperty("DAILY_BRIEF_HOUR");
    properties.deleteProperty("DAILY_BRIEF_MINUTE");
    properties.deleteProperty("DAILY_BRIEF_CREATED");

    return {
      success: true,
      message: `ลบ trigger จำนวน ${deletedCount} ตัว`,
      deletedCount: deletedCount,
    };
  } catch (error) {
    console.error("Error deleting daily patient brief triggers:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get daily patient brief trigger status
 */
function getDailyPatientBriefTriggerStatus() {
  try {
    const properties = PropertiesService.getScriptProperties();
    const triggerId = properties.getProperty("DAILY_BRIEF_TRIGGER_ID");
    const hour = properties.getProperty("DAILY_BRIEF_HOUR");
    const minute = properties.getProperty("DAILY_BRIEF_MINUTE");
    const created = properties.getProperty("DAILY_BRIEF_CREATED");

    if (!triggerId) {
      return {
        success: true,
        status: {
          hasActiveTrigger: false,
          message: "ไม่มี trigger ที่ทำงานอยู่",
        },
      };
    }

    // Check if trigger still exists
    const triggers = ScriptApp.getProjectTriggers();
    const activeTrigger = triggers.find((t) => t.getUniqueId() === triggerId);

    if (!activeTrigger) {
      // Trigger was deleted externally, clean up properties
      properties.deleteProperty("DAILY_BRIEF_TRIGGER_ID");
      properties.deleteProperty("DAILY_BRIEF_HOUR");
      properties.deleteProperty("DAILY_BRIEF_MINUTE");
      properties.deleteProperty("DAILY_BRIEF_CREATED");

      return {
        success: true,
        status: {
          hasActiveTrigger: false,
          message: "trigger ถูกลบไปแล้ว",
        },
      };
    }

    return {
      success: true,
      status: {
        hasActiveTrigger: true,
        triggerId: triggerId,
        scheduledTime: `${hour?.padStart(2, "0")}:${minute?.padStart(2, "0")} น.`,
        hour: parseInt(hour || "8"),
        minute: parseInt(minute || "0"),
        created: created ? new Date(created).toLocaleDateString("th-TH") : "ไม่ทราบ",
        message: `กำหนดเวลาส่งรายงานรายวันเวลา ${hour?.padStart(2, "0")}:${minute?.padStart(2, "0")} น. ทุกวัน`,
      },
    };
  } catch (error) {
    console.error("Error getting daily patient brief trigger status:", error);
    return {
      success: false,
      message: error.toString(),
    };
  }
}

/**
 * Update daily patient brief trigger time
 */
function updateDailyPatientBriefTrigger(hour = 8, minute = 0) {
  try {
    return createDailyPatientBriefTrigger(hour, minute);
  } catch (error) {
    console.error("Error updating daily patient brief trigger:", error);
    return { success: false, message: error.toString() };
  }
}