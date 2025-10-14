/**
 * Sheet initialization functions
 * Handles the setup and creation of all necessary sheets with headers
 */

/**
 * Initialize the system by creating necessary sheets and headers
 */
function initializeSystem() {
  try {
    // Clear cache to ensure fresh data
    clearCache();

    // Get the main spreadsheet
    const spreadsheet = getCachedSpreadsheet();

    // Create or get sheets in batch
    const sheetNames = Object.values(SHEET_NAMES);
    const sheets = {};

    sheetNames.forEach((sheetName) => {
      sheets[sheetName] = getOrCreateSheetInSpreadsheet(spreadsheet, sheetName);
    });

    // Setup headers if sheets are empty - batch operations
    setupPatientsSheet(sheets[SHEET_NAMES.PATIENTS]);
    setupAppointmentsSheet(sheets[SHEET_NAMES.APPOINTMENTS]);
    setupRevenueSheet(sheets[SHEET_NAMES.REVENUE]);
    setupUsersSheet(sheets[SHEET_NAMES.USERS]);
    setupDoctorsSheet(sheets[SHEET_NAMES.DOCTORS]);
    setupOptionListSheet(sheets[SHEET_NAMES.OPTION_LIST]);

    // Force execution of all pending operations
    SpreadsheetApp.flush();

    return { success: true, message: "System initialized successfully" };
  } catch (error) {
    console.error("Error initializing system:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Setup Patients sheet with headers
 */
function setupPatientsSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID",
      "Title Prefix",
      "First Name",
      "Last Name",
      "Phone",
      "Birth Date",
      "Gender",
      "Address",
      "Allergies",
      "Medical History",
      "Notes",
      "Branch",
      "Registration Date",
      "Created At",
      "Updated At",
      "Created By User",
      "Updated By User",
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");
  }
}

/**
 * Setup Appointments sheet with headers
 */
function setupAppointmentsSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID",
      "Patient ID",
      "Doctor ID",
      "Appointment Date",
      "Appointment Time",
      "Case Type",
      "Case Details",
      "Contact Channel",
      "Cost",
      "Status",
      "Notes",
      "Branch",
      "Created At",
      "Updated At",
      "Created By User",
      "Updated By User",
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");
  }
}

/**
 * Setup Revenue sheet with headers
 */
function setupRevenueSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID",
      "Date",
      "Patient ID",
      "Doctor ID",
      "Case Type",
      "Case Details",
      "Payment Type",
      "Cash Amount",
      "Transfer Amount",
      "Social Security Amount",
      "Visa Amount",
      "X-ray Fee",
      "Medicine Fee",
      "Other Product Fee",
      "Discount",
      "Notes",
      "Branch",
      "Created At",
      "Updated At",
      "Created By User",
      "Updated By User",
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");
  }
}

/**
 * Setup Users sheet with headers
 */
function setupUsersSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID",
      "Username",
      "Password Hash",
      "User Type",
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Branch",
      "Role",
      "Status",
      "Created At",
      "Updated At",
      "Created By User",
      "Updated By User",
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");

    // Add default users in batch with branch and role information
    const defaultUsers = [
      [
        "U001",
        "superadmin",
        "superadmin123",
        "super_admin",
        "ผู้ดูแลระบบ",
        "หลัก",
        "superadmin@clinic.com",
        "081-000-0000",
        "HEAD_OFFICE",
        "super_admin",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
      [
        "U002",
        "admin",
        "admin123",
        "admin",
        "ผู้ดูแลระบบ",
        "สาขา",
        "admin@clinic.com",
        "081-234-5678",
        "BRANCH_01",
        "admin",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
      [
        "U003",
        "user",
        "user123",
        "user",
        "ผู้ใช้",
        "ทั่วไป",
        "user@clinic.com",
        "082-345-6789",
        "BRANCH_01",
        "user",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
    ];

    if (defaultUsers.length > 0) {
      const userRange = sheet.getRange(2, 1, defaultUsers.length, defaultUsers[0].length);
      userRange.setValues(defaultUsers);
    }
  }
}

/**
 * Setup Doctors sheet with headers
 */
function setupDoctorsSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      "ID",
      "First Name",
      "Last Name",
      "Specialty",
      "Phone",
      "Email",
      "License Number",
      "Notes",
      "Status",
      "Created At",
      "Updated At",
      "Created By User",
      "Updated By User",
    ];
    const range = sheet.getRange(1, 1, 1, headers.length);
    range.setValues([headers]);
    range.setFontWeight("bold");

    // Add sample doctors data in batch (shared across all branches)
    const sampleDoctors = [
      [
        "DR001",
        "สมชาย",
        "ใจดี",
        "จัดฟัน",
        "081-234-5678",
        "somchai@clinic.com",
        "D12345",
        "ชำนาญการจัดฟันเด็กและผู้ใหญ่",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
      [
        "DR002",
        "สุดา",
        "ปรีชา",
        "ทันตกรรมทั่วไป",
        "082-345-6789",
        "suda@clinic.com",
        "D23456",
        "เชี่ยวชาญด้านการรักษาฟันผุและถอนฟัน",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
      [
        "DR003",
        "วิชัย",
        "สุขใส",
        "ทันตกรรมเด็ก",
        "083-456-7890",
        "wichai@clinic.com",
        "D34567",
        "ผู้เชี่ยวชาญด้านทันตกรรมเด็กและการป้องกัน",
        "active",
        new Date(),
        new Date(),
        "SYSTEM",
        "SYSTEM",
      ],
    ];

    if (sampleDoctors.length > 0) {
      const doctorRange = sheet.getRange(2, 1, sampleDoctors.length, sampleDoctors[0].length);
      doctorRange.setValues(sampleDoctors);
    }
  }
}

/**
 * Setup Option List sheet with headers and default options
 */
function setupOptionListSheet(sheet) {
  if (sheet.getLastRow() === 0) {
    // Five-column structure: Case Type, Case Details, Contact Channel, Branch, Payment Method
    const headers = [
      "Case Type",
      "Case Details",
      "Contact Channel",
      "Branch",
      "Payment Method",
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

    // Add default case types in column A
    const caseTypes = [
      "จัดฟัน",
      "GP1",
      "GP2",
      "GP3",
      "รักษาราก",
      "ซื้อผลิตภัณฑ์",
    ];

    // Add default case details in column B
    const caseDetails = [
      "จัดฟัน",
      "ปรับลวด",
      "ถอดเครื่องมือ",
      "ทำรีเทนเนอร์",
      "อุดฟัน",
      "ถอนฟัน",
      "ถอนฟันน้ำนม",
      "ขูดหินปูน",
      "ผ่าฟันคุด",
      "รักษารากฟัน",
      "เกลารากฟัน",
      "ทำครอบฟัน",
      "เคลือบฟลูออไรด์",
      "ตรวจและปรึกษา",
    ];

    // Add default contact channels in column C
    const contactChannels = [
      "โทรศัพท์",
      "Facebook",
      "Line",
      "Walk in",
      "นัดต่อเนื่อง",
    ];

    // Add default branches in column D
    const branches = [
      "HEAD_OFFICE",
      "BRANCH_01",
      "BRANCH_02",
      "BRANCH_03",
      "BRANCH_04",
      "BRANCH_05",
    ];

    // Add default payment methods in column E
    const paymentMethods = [
      "เงินสด",
      "โอน",
      "บัตรเครดิต",
      "QR Code",
      "เช็ค",
      "ประกันสังคม",
      "Visa",
    ];

    // Add case types to column A (starting from A2)
    for (let i = 0; i < caseTypes.length; i++) {
      sheet.getRange(i + 2, 1).setValue(caseTypes[i]);
    }

    // Add case details to column B (starting from B2)
    for (let i = 0; i < caseDetails.length; i++) {
      sheet.getRange(i + 2, 2).setValue(caseDetails[i]);
    }

    // Add contact channels to column C (starting from C2)
    for (let i = 0; i < contactChannels.length; i++) {
      sheet.getRange(i + 2, 3).setValue(contactChannels[i]);
    }

    // Add branches to column D (starting from D2)
    for (let i = 0; i < branches.length; i++) {
      sheet.getRange(i + 2, 4).setValue(branches[i]);
    }

    // Add payment methods to column E (starting from E2)
    for (let i = 0; i < paymentMethods.length; i++) {
      sheet.getRange(i + 2, 5).setValue(paymentMethods[i]);
    }

    // Format the sheet
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground("#30308b")
      .setFontColor("white");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
}