/**
 * Web application and main entry point functions
 * Contains functions for HTML service integration and main testing
 */

/**
 * Include HTML file content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Main doGet function for web app deployment (multi-user optimized)
 */
function doGet() {
  try {
    // Initialize system if needed
    const initResult = initializeSystem();
    if (!initResult.success) {
      Logger.log("System initialization failed:", initResult.message);
    }

    // Try to warm cache for better performance
    smartWarmCache();

    // Create and return the HTML output
    const htmlOutput = HtmlService.createTemplateFromFile("index");

    return htmlOutput
      .evaluate()
      .setTitle("ระบบจัดการคลินิคทันตกรรม")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    Logger.log("Error in doGet:", error);

    // Return error page
    const errorHtml = HtmlService.createHtmlOutput(
      `<h1>เกิดข้อผิดพลาด</h1><p>${error.toString()}</p>`
    );
    return errorHtml.setTitle("เกิดข้อผิดพลาด");
  }
}

/**
 * Handle POST requests - primarily for LINE webhook
 * @param {Object} e - Event object containing request data
 */
function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  try {
    LineBotWebhook.init(e, LINE_CHANNEL_ACCESS_TOKEN, true).forEach((event) => {
      processLineEvent(event);
    });
    return ContentService.createTextOutput("OK").setMimeType(
      ContentService.MimeType.TEXT
    );
  } catch (e) { //with stack tracing if your exceptions bubble up to here
    e = (typeof e === 'string') ? new Error(e) : e;
    Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s" .',e.name||'', 
               e.message||'', e.lineNumber||'', e.fileName||'', e.stack||'');
    throw e;
  }
}

/**
 * Search functions for cached data optimization
 */
function findPatientById(patientId) {
  // Use cached data if available
  if (dataCache.patients) {
    return dataCache.patients.find((patient) => patient.id === patientId);
  }

  // Fallback to direct sheet access
  return getPatientById(patientId);
}

function findDoctorById(doctorId) {
  // Use cached data if available
  if (dataCache.doctors) {
    return dataCache.doctors.find((doctor) => doctor.id === doctorId);
  }

  // Fallback to direct sheet access
  return getDoctorById(doctorId);
}

function findAppointmentsByPatient(patientId) {
  // Use cached data if available
  if (dataCache.appointments) {
    return dataCache.appointments.filter(
      (appointment) => appointment.patient_id === patientId
    );
  }

  // Fallback to existing function
  return getAppointmentsByPatient(patientId);
}

function findAppointmentsByDate(date) {
  // Use cached data if available
  if (dataCache.appointments) {
    return dataCache.appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.appointment_date);
      const targetDate = new Date(date);
      return appointmentDate.toDateString() === targetDate.toDateString();
    });
  }

  // Fallback to existing function
  return getAppointmentsByDateRange(date, date);
}

// 7-Day Appointment Reminder Functions

/**
 * Send appointment reminders to registered patients 7 days ahead
 * External access function for triggers and manual execution
 */
function doSendSevenDayAppointmentReminders() {
  return sendSevenDayAppointmentReminders();
}

/**
 * Test 7-day appointment reminder system
 */
function doTestSevenDayAppointmentReminders() {
  return testSevenDayAppointmentReminders();
}

/**
 * Create automated trigger for 7-day appointment reminders
 * Runs daily at 10:00 AM to send reminders for appointments 7 days ahead
 */
function createSevenDayAppointmentReminderTrigger() {
  try {
    // Delete existing 7-day reminder triggers
    const existingTriggers = ScriptApp.getProjectTriggers();
    existingTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'doSendSevenDayAppointmentReminders') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create daily trigger for 7-day reminders (runs at 10:00 AM)
    ScriptApp.newTrigger('doSendSevenDayAppointmentReminders')
      .timeBased()
      .everyDays(1)
      .atHour(10)
      .create();
    
    console.log("7-day appointment reminder trigger created successfully");
    
    return {
      success: true,
      message: "สร้างการแจ้งเตือน 7 วันล่วงหน้าอัตโนมัติเรียบร้อย",
      schedule: "Daily at 10:00 AM",
      description: "ส่งการแจ้งเตือนให้ผู้ป่วยที่ลงทะเบียน LINE สำหรับการนัดหมายที่จะมาถึงในอีก 7 วัน"
    };
    
  } catch (error) {
    console.error("Error creating 7-day appointment reminder trigger:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการสร้างการแจ้งเตือน 7 วันล่วงหน้าอัตโนมัติ",
      error: error.toString()
    };
  }
}

/**
 * Delete 7-day appointment reminder trigger
 */
function deleteSevenDayAppointmentReminderTrigger() {
  try {
    const existingTriggers = ScriptApp.getProjectTriggers();
    let deletedCount = 0;
    
    existingTriggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'doSendSevenDayAppointmentReminders') {
        ScriptApp.deleteTrigger(trigger);
        deletedCount++;
      }
    });
    
    console.log(`Deleted ${deletedCount} 7-day appointment reminder triggers`);
    
    return {
      success: true,
      message: `ลบการแจ้งเตือน 7 วันล่วงหน้าอัตโนมัติ ${deletedCount} รายการ`,
      deletedCount: deletedCount
    };
    
  } catch (error) {
    console.error("Error deleting 7-day appointment reminder trigger:", error);
    return {
      success: false,
      message: "เกิดข้อผิดพลาดในการลบการแจ้งเตือน 7 วันล่วงหน้าอัตโนมัติ",
      error: error.toString()
    };
  }
}

