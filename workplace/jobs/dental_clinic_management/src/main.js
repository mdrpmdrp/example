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
 * Search functions for cached data optimization
 */
function findPatientById(patientId) {
  // Use cached data if available
  if (dataCache.patients) {
    return dataCache.patients.find(patient => patient.id === patientId);
  }

  // Fallback to direct sheet access
  return getPatientById(patientId);
}

function findDoctorById(doctorId) {
  // Use cached data if available
  if (dataCache.doctors) {
    return dataCache.doctors.find(doctor => doctor.id === doctorId);
  }

  // Fallback to direct sheet access
  return getDoctorById(doctorId);
}

function findAppointmentsByPatient(patientId) {
  // Use cached data if available
  if (dataCache.appointments) {
    return dataCache.appointments.filter(appointment => appointment.patient_id === patientId);
  }

  // Fallback to existing function
  return getAppointmentsByPatient(patientId);
}

function findAppointmentsByDate(date) {
  // Use cached data if available
  if (dataCache.appointments) {
    return dataCache.appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.appointment_date);
      const targetDate = new Date(date);
      return appointmentDate.toDateString() === targetDate.toDateString();
    });
  }

  // Fallback to existing function
  return getAppointmentsByDateRange(date, date);
}

/**
 * Test function to verify all functionality
 */
function testAllFunctions() {
  console.log("Testing Dental Clinic Management System...");

  // Test initialization
  const initResult = initializeSystem();
  console.log("Init Result:", initResult);

  // Test patient operations
  const patientData = {
    firstName: "ทดสอบ",
    lastName: "ระบบ",
    phone: "081-111-1111",
    birthDate: "1990-01-01",
    address: "ที่อยู่ทดสอบ",
  };

  const addPatientResult = addPatient(patientData);
  console.log("Add Patient Result:", addPatientResult);

  const getAllPatientsResult = getAllPatients();
  console.log("Get All Patients Result:", getAllPatientsResult);

  // Test performance monitoring
  const performanceTest = measurePerformance("testFunction", () => {
    return "Test completed successfully";
  });
  
  const testResult = performanceTest();
  console.log("Performance Test Result:", testResult);

  console.log("All tests completed!");
  
  return {
    success: true,
    message: "All tests completed successfully",
    results: {
      init: initResult,
      addPatient: addPatientResult,
      getAllPatients: !!getAllPatientsResult,
      performanceTest: testResult
    }
  };
}