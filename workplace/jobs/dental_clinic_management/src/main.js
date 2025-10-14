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
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .setFaviconUrl("https://img2.pic.in.th/pic/Screenshot-2025-09-22-215301.png");
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

