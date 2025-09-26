/**
 * Patient management functions
 * Handles CRUD operations for patient records with role-based access control
 */

/**
 * Get all patients (optimized with caching and role-based access control)
 */
function getAllPatients(currentUser = null) {
  try {
    // Check cache first
    if (isCacheValid("patients") && dataCache.patients) {
      let patients = dataCache.patients;

      // Apply role-based filtering
      if (currentUser && currentUser.role !== "super_admin") {
        patients = filterDataByBranch(patients, currentUser.branch, currentUser.role);
      }

      return JSON.stringify({ success: true, patients: patients });
    }

    const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
    const data = patientsSheet.getDataRange().getValues();

    if (data.length <= 1) {
      dataCache.patients = [];
      dataCache.lastUpdated.patients = Date.now();
      return JSON.stringify({ success: true, patients: [] });
    }

    let patients = convertSheetDataToObjects(data);

    // Apply role-based filtering
    if (currentUser && currentUser.role !== "super_admin") {
      patients = filterDataByBranch(patients, currentUser.branch, currentUser.role);
    }

    // Update cache with unfiltered data for performance
    dataCache.patients = convertSheetDataToObjects(data);
    dataCache.lastUpdated.patients = Date.now();

    return JSON.stringify({ success: true, patients: patients });
  } catch (error) {
    console.error("Error getting patients:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Add new patient (optimized with role-based access control)
 */
function addPatient(patientData, currentUser = null) {
  try {
    // Check permissions
    if (
      currentUser &&
      !checkPermission(currentUser.role, "canManagePatients")
    ) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลคนไข้" };
    }

    const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
    const lastRow = patientsSheet.getLastRow();

    // Optimized ID generation
    const getNewPatientId = () => {
      const existingIds = patientsSheet
        .getRange(2, 1, Math.max(lastRow - 1, 1), 1)
        .getValues()
        .flat()
        .filter(id => id);

      let counter = 1;
      let newId;
      do {
        newId = "P" + String(counter).padStart(3, "0");
        counter++;
      } while (existingIds.includes(newId));

      return newId;
    };

    const newId = getNewPatientId();
    const timestamp = new Date();

    const newPatient = [
      newId,
      patientData.titlePrefix || "",
      patientData.firstName,
      patientData.lastName,
      "'" + patientData.phone,
      patientData.birthDate,
      patientData.gender || "",
      patientData.address || "",
      patientData.allergies || "",
      patientData.medicalHistory || "",
      patientData.notes || "",
      patientData.branch || (currentUser ? currentUser.branch : "BRANCH_01"),
      timestamp,
      timestamp,
      timestamp,
      currentUser ? currentUser.username : "UNKNOWN",
      currentUser ? currentUser.username : "UNKNOWN",
    ];

    patientsSheet
      .getRange(lastRow + 1, 1, 1, newPatient.length)
      .setValues([newPatient]);

    // Invalidate cache since data changed
    invalidateCache("patients");

    // Send notification to Google Chat
    try {
      sendFormSubmissionNotification("patient", newPatient, "เพิ่ม");
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return { success: true, message: "เพิ่มคนไข้เรียบร้อย", patientId: newId };
  } catch (error) {
    console.error("Error adding patient:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update patient information (optimized with role-based access control)
 */
function updatePatient(patientId, patientData, currentUser = null) {
  try {
    // Check permissions
    if (
      currentUser &&
      !checkPermission(currentUser.role, "canManagePatients")
    ) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลคนไข้" };
    }

    const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
    const data = patientsSheet.getDataRange().getValues();

    // Find patient row more efficiently
    let rowIndex = -1;
    let existingPatient = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === patientId) {
        rowIndex = i + 1; // Convert to 1-indexed
        existingPatient = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบข้อมูลคนไข้" };
    }

    // Check branch access - patient's branch should be in column 11 (0-indexed)
    const patientBranch = existingPatient[11];
    if (
      currentUser &&
      currentUser.role !== "super_admin" &&
      patientBranch &&
      patientBranch !== currentUser.branch
    ) {
      return {
        success: false,
        message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลคนไข้ในสาขาอื่น",
      };
    }

    // Prepare updated patient data
    const updatedPatient = [
      patientId,
      patientData.titlePrefix || "",
      patientData.firstName,
      patientData.lastName,
      "'" + patientData.phone,
      patientData.birthDate,
      patientData.gender || "",
      patientData.address || "",
      patientData.allergies || "",
      patientData.medicalHistory || "",
      patientData.notes || "",
      patientData.branch || (currentUser ? currentUser.branch : "BRANCH_01"),
      existingPatient[12], // Keep original registration date
      existingPatient[13], // Keep original created at
      new Date(), // Update modified at
      existingPatient[15] || "UNKNOWN", // Keep original created by
      currentUser ? currentUser.username : "UNKNOWN", // Update modified by
    ];

    patientsSheet
      .getRange(rowIndex, 1, 1, updatedPatient.length)
      .setValues([updatedPatient]);

    // Invalidate cache since data changed
    invalidateCache("patients");

    // Send notification to Google Chat
    try {
      sendFormSubmissionNotification("patient", updatedPatient, "แก้ไข");
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return { success: true, message: "อัปเดตข้อมูลคนไข้เรียบร้อย" };
  } catch (error) {
    console.error("Error updating patient:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete patient (optimized)
 */
function deletePatient(patientId) {
  try {
    const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);

    // Use more efficient method to find row
    const idColumn = patientsSheet
      .getRange(1, 1, patientsSheet.getLastRow(), 1)
      .getValues()
      .flat();
    const rowIndex = idColumn.findIndex((id) => id === patientId);

    if (rowIndex === -1 || rowIndex === 0) {
      return { success: false, message: "ไม่พบข้อมูลคนไข้" };
    }

    // Check if patient has appointments (use cache if available)
    const appointmentsResult = getAppointmentsByPatient(patientId);
    if (
      appointmentsResult.success &&
      appointmentsResult.appointments.length > 0
    ) {
      return {
        success: false,
        message: "ไม่สามารถลบคนไข้ที่มีการนัดหมายอยู่ได้",
      };
    }

    patientsSheet.deleteRow(rowIndex + 1); // Convert to 1-indexed

    // Invalidate cache since data changed
    invalidateCache("patients");

    return { success: true, message: "ลบข้อมูลคนไข้เรียบร้อย" };
  } catch (error) {
    console.error("Error deleting patient:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get patient by ID
 */
function getPatientById(patientId) {
  try {
    const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
    const data = patientsSheet.getDataRange().getValues();

    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === patientId) {
        const patient = {};
        headers.forEach((header, index) => {
          patient[header.toLowerCase().replace(/\s+/g, "_")] = data[i][index];
        });
        return { success: true, patient };
      }
    }

    return { success: false, message: "ไม่พบข้อมูลคนไข้" };
  } catch (error) {
    console.error("Error getting patient by ID:", error);
    return { success: false, message: error.toString() };
  }
}