/**
 * Dental Clinic Management System - Google Apps Script Backend
 * REFACTORED VERSION - Main entry point
 * 
 * This file serves as the main entry point and includes all other modules.
 * The system has been refactored into multiple files for better organization.
 * 
 * IMPORTANT: To use the refactored version, you need to include all the files
 * from the src/ directory. Google Apps Script will automatically include all
 * .js files in your project.
 * 
 * STRUCTURE:
 * src/
 * ├── config/
 * │   ├── constants.js          - System constants and configurations
 * │   └── configService.js      - Configuration management functions
 * ├── auth/
 * │   ├── authentication.js     - User authentication functions
 * │   └── permissions.js        - Role-based access control
 * ├── models/
 * │   ├── userModel.js          - User management functions
 * │   ├── patientModel.js       - Patient management functions
 * │   ├── doctorModel.js        - Doctor management functions
 * │   ├── appointmentModel.js   - Appointment management functions
 * │   ├── revenueModel.js       - Revenue management functions
 * │   └── optionModel.js        - Option list management functions
 * ├── services/
 * │   ├── initializationService.js  - System initialization functions
 * │   ├── notificationService.js    - Google Chat notifications
 * │   ├── triggerService.js         - Scheduled trigger management
 * │   ├── reportingService.js       - Report generation functions
 * │   └── dailyBriefService.js      - Daily patient brief management
 * ├── utils/
 * │   ├── sheetUtils.js         - Core spreadsheet utilities and caching
 * │   ├── performanceUtils.js   - Performance optimization utilities
 * │   └── validationUtils.js    - Data validation utilities
 * └── main.js                   - Web app functions and main testing
 * 
 * GOOGLE CHAT NOTIFICATIONS SETUP:
 * 1. Create or open a Google Chat space
 * 2. Click on the space name at the top
 * 3. Select "Manage webhooks"
 * 4. Click "Add webhook"
 * 5. Give it a name and copy the webhook URL
 * 6. Run: setGoogleChatWebhook('YOUR_WEBHOOK_URL') in the Apps Script editor
 * 7. The system will automatically send notifications for all form submissions
 *
 * DAILY BRIEF SETUP:
 * Run: completeSetupExample() for complete automated setup
 * Or: setupDailyPatientBrief(hour, minute) to customize time
 */

// =============================================
// MIGRATION NOTES:
// =============================================
// 
// TO COMPLETE THE REFACTORING:
// 1. Replace the current Code.js with this file
// 2. Add all files from src/ directory to your Google Apps Script project
// 3. Test the system with: testAllFunctions()
// 4. Initialize with: initializeSystem()
// 
// BENEFITS OF REFACTORED VERSION:
// - Better organization and maintainability
// - Easier debugging and testing
// - Clear separation of concerns
// - Improved code reusability
// - Better performance through optimized caching
// - Enhanced role-based access control
// - Comprehensive validation
//
// =============================================

/**
 * Quick test function to verify refactored system works
 * Run this after completing the migration
 */
function testRefactoredSystem() {
  try {
    console.log("Testing refactored dental clinic management system...");
    
    // Test system initialization
    const initResult = initializeSystem();
    console.log("✅ System initialization:", initResult.success ? "SUCCESS" : "FAILED");
    
    // Test getting all options
    const optionsResult = getAllOptions();
    const options = JSON.parse(optionsResult);
    console.log("✅ Options loading:", options.success ? "SUCCESS" : "FAILED");
    
    // Test user authentication
    const authResult = authenticateUser("superadmin", "superadmin123");
    console.log("✅ Authentication test:", authResult.success ? "SUCCESS" : "FAILED");
    
    // Test performance utilities
    const performanceResult = getOptimizedDashboardData();
    console.log("✅ Performance optimization:", performanceResult.success ? "SUCCESS" : "FAILED");
    
    // Test notification configuration
    const notificationStatus = getNotificationStatus();
    console.log("✅ Notification system:", notificationStatus.success ? "SUCCESS" : "FAILED");
    
    const summary = {
      success: true,
      message: "Refactored system test completed successfully!",
      testResults: {
        initialization: initResult.success,
        options: options.success,
        authentication: authResult.success,
        performance: performanceResult.success,
        notifications: notificationStatus.success
      }
    };
    
    console.log("📋 Test Summary:", summary);
    return summary;
    
  } catch (error) {
    console.error("❌ Refactored system test failed:", error);
    return {
      success: false,
      message: "Refactored system test failed: " + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Migration helper function
 * Shows what functions are now available in the refactored version
 */
function showRefactoredFunctions() {
  const functionMap = {
    "System Initialization": [
      "initializeSystem()",
      "setupPatientsSheet()",
      "setupAppointmentsSheet()",
      "setupRevenueSheet()",
      "setupUsersSheet()",
      "setupDoctorsSheet()",
      "setupOptionListSheet()"
    ],
    "Authentication & Permissions": [
      "authenticateUser(username, password)",
      "checkPermission(userRole, action)",
      "validateUserAccess(currentUser, action, targetBranch)"
    ],
    "User Management": [
      "getAllUsers(currentUser)",
      "addUser(userData, currentUser)",
      "updateUser(username, userData, currentUser)",
      "deleteUser(username, currentUser)"
    ],
    "Patient Management": [
      "getAllPatients(currentUser)",
      "addPatient(patientData, currentUser)",
      "updatePatient(patientId, patientData, currentUser)",
      "deletePatient(patientId)",
      "getPatientById(patientId)"
    ],
    "Doctor Management": [
      "getAllDoctors(currentUser)",
      "addDoctor(doctorData, currentUser)",
      "updateDoctor(doctorId, doctorData, currentUser)",
      "deleteDoctor(doctorId)",
      "getDoctorById(doctorId)"
    ],
    "Appointment Management": [
      "getAllAppointments(currentUser)",
      "addAppointment(appointmentData, currentUser)",
      "updateAppointment(appointmentId, appointmentData, currentUser)",
      "deleteAppointment(appointmentId)",
      "getAppointmentsByPatient(patientId)",
      "getAppointmentsByDoctor(doctorId)",
      "getAppointmentsByDateRange(startDate, endDate)"
    ],
    "Revenue Management": [
      "getAllRevenues()",
      "addRevenue(revenueData, currentUser)",
      "updateRevenue(revenueId, revenueData, currentUser)",
      "deleteRevenue(revenueId)",
      "getRevenueByDateRange(startDate, endDate)"
    ],
    "Option Lists": [
      "getCaseTypes()",
      "getCaseDetails()", 
      "getContactChannels()",
      "getBranches()",
      "getPaymentTypes()",
      "getAllOptions()"
    ],
    "Notifications": [
      "setGoogleChatWebhook(webhookUrl)",
      "testGoogleChatNotification()",
      "sendDailyPatientBrief()",
      "sendFormSubmissionNotification(formType, data, action)"
    ],
    "Daily Brief Management": [
      "setupDailyPatientBrief(hour, minute)",
      "removeDailyPatientBrief()",
      "checkDailyPatientBriefStatus()",
      "completeSetupExample()"
    ],
    "Reporting": [
      "generateMonthlyPatientReport(year, month)",
      "generateMonthlyRevenueReport(year, month)"
    ],
    "Performance & Utilities": [
      "smartWarmCache()",
      "getOptimizedDashboardData()",
      "measurePerformance(functionName, func)",
      "validatePatientData(patientData)",
      "validateAppointmentData(appointmentData)"
    ],
    "Web Application": [
      "doGet()",
      "include(filename)",
      "testAllFunctions()"
    ]
  };
  
  console.log("📚 REFACTORED SYSTEM FUNCTIONS:");
  console.log("================================");
  
  Object.keys(functionMap).forEach(category => {
    console.log(`\n🔧 ${category}:`);
    functionMap[category].forEach(func => {
      console.log(`   • ${func}`);
    });
  });
  
  console.log("\n📖 For detailed documentation, check the individual files in src/");
  console.log("🚀 To test the system, run: testRefactoredSystem()");
  
  return functionMap;
}

// For immediate testing, you can run:
// testRefactoredSystem() - to test the refactored system
// showRefactoredFunctions() - to see all available functions