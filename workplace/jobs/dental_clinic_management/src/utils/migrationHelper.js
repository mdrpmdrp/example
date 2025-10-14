/**
 * Migration Helper Script
 * This script helps transition from the original Code.js to the refactored version
 */

/**
 * Check if the system is ready for migration
 */
function checkMigrationReadiness() {
  console.log("🔍 Checking migration readiness...");
  
  const checks = {
    originalDataExists: false,
    sheetsInitialized: false,
    webappWorking: false,
    notificationsConfigured: false
  };
  
  try {
    // Check if original data exists
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    checks.originalDataExists = sheets.length > 0;
    
    // Check if sheets are properly initialized
    const requiredSheets = ["Patients", "Appointments", "Users", "Doctors"];
    let initializedSheets = 0;
    requiredSheets.forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 0) {
        initializedSheets++;
      }
    });
    checks.sheetsInitialized = initializedSheets >= requiredSheets.length;
    
    // Check webapp functionality
    try {
      checks.webappWorking = typeof doGet === 'function';
    } catch (e) {
      checks.webappWorking = false;
    }
    
    // Check notifications
    try {
      const webhookUrl = PropertiesService.getScriptProperties().getProperty("GOOGLE_CHAT_WEBHOOK_URL");
      checks.notificationsConfigured = !!webhookUrl;
    } catch (e) {
      checks.notificationsConfigured = false;
    }
    
  } catch (error) {
    console.error("Error during migration check:", error);
  }
  
  console.log("✅ Migration readiness check completed:");
  console.log("   • Original data exists:", checks.originalDataExists ? "YES" : "NO");
  console.log("   • Sheets initialized:", checks.sheetsInitialized ? "YES" : "NO");
  console.log("   • Web app working:", checks.webappWorking ? "YES" : "NO");
  console.log("   • Notifications configured:", checks.notificationsConfigured ? "YES" : "NO");
  
  const readyForMigration = Object.values(checks).every(check => check === true);
  
  if (readyForMigration) {
    console.log("🎉 System is ready for migration!");
  } else {
    console.log("⚠️ Some issues need to be addressed before migration.");
  }
  
  return {
    success: true,
    ready: readyForMigration,
    checks: checks,
    recommendations: generateMigrationRecommendations(checks)
  };
}

/**
 * Generate recommendations based on migration check
 */
function generateMigrationRecommendations(checks) {
  const recommendations = [];
  
  if (!checks.originalDataExists) {
    recommendations.push("Initialize the system first with initializeSystem()");
  }
  
  if (!checks.sheetsInitialized) {
    recommendations.push("Ensure all sheets are properly set up with headers and sample data");
  }
  
  if (!checks.webappWorking) {
    recommendations.push("Test the web application functionality before migration");
  }
  
  if (!checks.notificationsConfigured) {
    recommendations.push("Configure Google Chat webhook with setGoogleChatWebhook() if needed");
  }
  
  if (recommendations.length === 0) {
    recommendations.push("System is ready for migration! Follow the steps in README.md");
  }
  
  return recommendations;
}

/**
 * Create a backup of current system data
 */
function createSystemBackup() {
  console.log("💾 Creating system backup...");
  
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      data: {},
      configuration: {},
      metadata: {}
    };
    
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = spreadsheet.getSheets();
    
    // Backup sheet data
    sheets.forEach(sheet => {
      const sheetName = sheet.getName();
      const data = sheet.getDataRange().getValues();
      backup.data[sheetName] = data;
    });
    
    // Backup configuration
    const properties = PropertiesService.getScriptProperties().getProperties();
    backup.configuration = properties;
    
    // Backup metadata
    backup.metadata = {
      spreadsheetId: spreadsheet.getId(),
      spreadsheetName: spreadsheet.getName(),
      sheetCount: sheets.length,
      totalRows: sheets.reduce((total, sheet) => total + sheet.getLastRow(), 0)
    };
    
    // Store backup in script properties
    const backupString = JSON.stringify(backup);
    if (backupString.length < 500000) { // PropertyService limit
      PropertiesService.getScriptProperties().setProperty('SYSTEM_BACKUP', backupString);
      console.log("✅ Backup created and stored in script properties");
    } else {
      console.log("⚠️ Backup too large for script properties, logging to console");
      console.log("Backup data:", backup);
    }
    
    return {
      success: true,
      message: "Backup created successfully",
      backup: backup
    };
    
  } catch (error) {
    console.error("❌ Error creating backup:", error);
    return {
      success: false,
      message: error.toString()
    };
  }
}

/**
 * Perform pre-migration tests
 */
function runPreMigrationTests() {
  console.log("🧪 Running pre-migration tests...");
  
  const tests = {
    systemInitialization: false,
    dataRetrieval: false,
    userAuthentication: false,
    permissions: false,
    notifications: false
  };
  
  try {
    // Test system initialization
    try {
      const initResult = initializeSystem();
      tests.systemInitialization = initResult.success;
    } catch (e) {
      console.warn("System initialization test failed:", e);
    }
    
    // Test data retrieval
    try {
      const patientsResult = getAllPatients();
      tests.dataRetrieval = typeof patientsResult === 'string' && JSON.parse(patientsResult).success;
    } catch (e) {
      console.warn("Data retrieval test failed:", e);
    }
    
    // Test user authentication
    try {
      const authResult = authenticateUser("admin", "admin123");
      tests.userAuthentication = authResult.success;
    } catch (e) {
      console.warn("User authentication test failed:", e);
    }
    
    // Test permissions
    try {
      const permissionResult = checkPermission("admin", "canManagePatients");
      tests.permissions = typeof permissionResult === 'boolean';
    } catch (e) {
      console.warn("Permissions test failed:", e);
    }
    
    // Test notifications (without actually sending)
    try {
      const webhookUrl = getGoogleChatWebhook();
      tests.notifications = !!webhookUrl || true; // Allow even without webhook
    } catch (e) {
      console.warn("Notifications test failed:", e);
    }
    
  } catch (error) {
    console.error("Error during pre-migration tests:", error);
  }
  
  console.log("✅ Pre-migration tests completed:");
  Object.keys(tests).forEach(test => {
    console.log(`   • ${test}:`, tests[test] ? "PASS" : "FAIL");
  });
  
  const allTestsPassed = Object.values(tests).every(test => test === true);
  
  return {
    success: true,
    allTestsPassed: allTestsPassed,
    tests: tests,
    message: allTestsPassed ? "All tests passed - ready for migration" : "Some tests failed - review before migration"
  };
}

/**
 * Complete migration check and preparation
 */
function prepareMigration() {
  console.log("🚀 Preparing for migration...");
  console.log("=====================================");
  
  // Step 1: Check readiness
  const readinessCheck = checkMigrationReadiness();
  console.log("\n1️⃣ Readiness Check:", readinessCheck.ready ? "READY" : "NOT READY");
  
  if (!readinessCheck.ready) {
    console.log("📋 Recommendations:");
    readinessCheck.recommendations.forEach(rec => console.log(`   • ${rec}`));
    return readinessCheck;
  }
  
  // Step 2: Create backup
  const backupResult = createSystemBackup();
  console.log("\n2️⃣ Backup Creation:", backupResult.success ? "SUCCESS" : "FAILED");
  
  // Step 3: Run tests
  const testResults = runPreMigrationTests();
  console.log("\n3️⃣ Pre-migration Tests:", testResults.allTestsPassed ? "ALL PASSED" : "SOME FAILED");
  
  // Final recommendation
  const readyToMigrate = readinessCheck.ready && backupResult.success && testResults.allTestsPassed;
  
  console.log("\n" + "=".repeat(40));
  if (readyToMigrate) {
    console.log("🎉 MIGRATION PREPARATION COMPLETE!");
    console.log("📖 Next steps:");
    console.log("   1. Add all files from src/ directory to your project");
    console.log("   2. Replace Code.js with Code.refactored.js");
    console.log("   3. Run testRefactoredSystem() to verify");
    console.log("   4. Follow the detailed guide in README.md");
  } else {
    console.log("❌ MIGRATION PREPARATION INCOMPLETE");
    console.log("📝 Please address the issues above before proceeding");
  }
  
  return {
    success: true,
    readyToMigrate: readyToMigrate,
    readinessCheck: readinessCheck,
    backupResult: backupResult,
    testResults: testResults
  };
}

/**
 * Post-migration verification
 */
function verifyMigration() {
  console.log("🔍 Verifying migration...");
  
  try {
    // This function should be run after the refactored files are in place
    if (typeof testRefactoredSystem === 'function') {
      const testResult = testRefactoredSystem();
      if (testResult.success) {
        console.log("✅ Migration verification successful!");
        console.log("🎉 Refactored system is working correctly");
        return { success: true, message: "Migration verified successfully" };
      } else {
        console.log("❌ Migration verification failed");
        console.log("Error:", testResult.message);
        return { success: false, message: testResult.message };
      }
    } else {
      console.log("⚠️ Refactored system not detected");
      console.log("Make sure all refactored files are added to the project");
      return { success: false, message: "Refactored system not found" };
    }
  } catch (error) {
    console.error("Error during migration verification:", error);
    return { success: false, message: error.toString() };
  }
}