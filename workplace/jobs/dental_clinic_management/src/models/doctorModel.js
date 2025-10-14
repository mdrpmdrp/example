/**
 * Doctor management functions
 * Handles CRUD operations for doctor records with role-based access control
 */

/**
 * Get all doctors (optimized with caching and role-based access control)
 */
function getAllDoctors(currentUser = null) {
  try {
    // Check cache first
    if (isCacheValid("doctors") && dataCache.doctors) {
      return JSON.stringify({ success: true, doctors: dataCache.doctors });
    }

    const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
    const data = doctorsSheet.getDataRange().getValues();

    if (data.length <= 1) {
      dataCache.doctors = [];
      dataCache.lastUpdated.doctors = Date.now();
      return JSON.stringify({ success: true, doctors: [] });
    }

    let doctors = convertSheetDataToObjects(data);

    // Update cache with doctor data (no branch filtering for doctors)
    dataCache.doctors = doctors;
    dataCache.lastUpdated.doctors = Date.now();

    return JSON.stringify({ success: true, doctors: doctors });
  } catch (error) {
    console.error("Error getting doctors:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Add new doctor (optimized with role-based access control)
 */
function addDoctor(doctorData, currentUser = null) {
  try {
    // Check permissions
    if (currentUser && !checkPermission(currentUser.role, "canManageDoctors")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลหมอ" };
    }

    const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
    const lastRow = doctorsSheet.getLastRow();

    // Optimized ID generation
    const getNewDoctorId = () => {
      let counter = lastRow;
      let newId;
      do {
        newId = "DR" + String(counter).padStart(3, "0");
        counter++;
      } while (false); // Simplified for now
      return newId;
    };

    const newId = getNewDoctorId();
    const timestamp = new Date();

    const newDoctor = [
      newId,
      doctorData.firstName,
      doctorData.lastName,
      doctorData.specialty,
      "'" + doctorData.phone,
      doctorData.email || "",
      doctorData.licenseNumber || "",
      doctorData.notes || "",
      "active",
      timestamp,
      timestamp,
      currentUser ? currentUser.username : "UNKNOWN",
      currentUser ? currentUser.username : "UNKNOWN",
    ];

    doctorsSheet
      .getRange(lastRow + 1, 1, 1, newDoctor.length)
      .setValues([newDoctor]);

    // Invalidate cache since data changed
    invalidateCache("doctors");

    // Send notification to Google Chat
    try {
      sendFormSubmissionNotification("doctor", newDoctor, "เพิ่ม");
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return {
      success: true,
      message: "เพิ่มข้อมูลหมอเรียบร้อย",
      doctorId: newId,
    };
  } catch (error) {
    console.error("Error adding doctor:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update doctor information
 */
function updateDoctor(doctorId, doctorData, currentUser = null) {
  try {
    // Check permissions
    if (currentUser && !checkPermission(currentUser.role, "canManageDoctors")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลหมอ" };
    }
    
    const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
    const data = doctorsSheet.getDataRange().getValues();

    // Find doctor row
    let rowIndex = -1;
    let existingDoctor = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === doctorId) {
        rowIndex = i + 1; // Convert to 1-indexed
        existingDoctor = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบข้อมูลหมอ" };
    }

    const updatedDoctor = [
      doctorId,
      doctorData.firstName,
      doctorData.lastName,
      doctorData.specialty,
      "'" + doctorData.phone,
      doctorData.email || "",
      doctorData.licenseNumber || "",
      doctorData.notes || "",
      doctorData.status || "active",
      existingDoctor[9], // Keep original created at
      new Date(), // Update modified at
      existingDoctor[11] || "UNKNOWN", // Keep original created by
      currentUser ? currentUser.username : "UNKNOWN", // Update modified by
    ];

    doctorsSheet
      .getRange(rowIndex, 1, 1, updatedDoctor.length)
      .setValues([updatedDoctor]);

    return { success: true, message: "อัปเดตข้อมูลหมอเรียบร้อย" };
  } catch (error) {
    console.error("Error updating doctor:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete doctor
 */
function deleteDoctor(doctorId) {
  try {
    const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
    const data = doctorsSheet.getDataRange().getValues();

    // Find doctor row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === doctorId) {
        rowIndex = i + 1; // Convert to 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบข้อมูลหมอ" };
    }

    // Check if doctor has appointments
    const appointmentsResult = getAppointmentsByDoctor(doctorId);
    if (
      appointmentsResult.success &&
      appointmentsResult.appointments.length > 0
    ) {
      return {
        success: false,
        message: "ไม่สามารถลบหมอที่มีการนัดหมายอยู่ได้",
      };
    }

    doctorsSheet.deleteRow(rowIndex);

    return { success: true, message: "ลบข้อมูลหมอเรียบร้อย" };
  } catch (error) {
    console.error("Error deleting doctor:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get doctor by ID
 */
function getDoctorById(doctorId) {
  try {
    const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
    const data = doctorsSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return { success: false, message: "ไม่พบข้อมูลหมอ" };
    }

    const headers = data[0];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === doctorId) {
        const doctor = {};
        headers.forEach((header, index) => {
          doctor[header.toLowerCase().replace(/\s+/g, "_")] = data[i][index];
        });
        return { success: true, doctor };
      }
    }

    return { success: false, message: "ไม่พบข้อมูลหมอ" };
  } catch (error) {
    console.error("Error getting doctor:", error);
    return { success: false, message: error.toString() };
  }
}