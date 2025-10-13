/**
 * Appointment management functions
 * Handles CRUD operations for appointment records with role-based access control
 */

/**
 * Get all appointments (optimized with caching and role-based access control)
 */
function getAllAppointments(currentUser = null) {
  try {
    // Check cache first
    if (isCacheValid("appointments") && dataCache.appointments) {
      let appointments = dataCache.appointments;

      // Apply role-based filtering
      if (currentUser && currentUser.role !== "super_admin") {
        appointments = filterDataByBranch(appointments, currentUser.branch, currentUser.role);
      }

      return JSON.stringify({ success: true, appointments: appointments });
    }

    const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
    const data = appointmentsSheet.getDataRange().getValues();

    if (data.length <= 1) {
      dataCache.appointments = [];
      dataCache.lastUpdated.appointments = Date.now();
      return JSON.stringify({ success: true, appointments: [] });
    }

    let appointments = convertSheetDataToObjects(data);

    // Apply role-based filtering
    if (currentUser && currentUser.role !== "super_admin") {
      appointments = filterDataByBranch(appointments, currentUser.branch, currentUser.role);
    }

    // Update cache with unfiltered data for performance
    dataCache.appointments = convertSheetDataToObjects(data);
    dataCache.lastUpdated.appointments = Date.now();

    return JSON.stringify({ success: true, appointments: appointments });
  } catch (error) {
    console.error("Error getting appointments:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Add new appointment (optimized with role-based access control)
 */
function addAppointment(appointmentData, currentUser = null) {
  try {
    // Check permissions
    if (
      currentUser &&
      !checkPermission(currentUser.role, "canManageAppointments")
    ) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการการนัดหมาย" };
    }

    const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
    const lastRow = appointmentsSheet.getLastRow();

    // Optimized ID generation
    const getNewAppointmentId = () => {
      let existingIds = appointmentsSheet
        .getRange(2, 1, Math.max(lastRow - 1, 1), 1)
        .getValues()
        .flat()
        .filter(id => id);

      let yearMonth_prefix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyMM");
      existingIds = existingIds.filter(id => id.startsWith("A" + yearMonth_prefix));
      let idPrefix = "A" + yearMonth_prefix;
      let counter = 1;
      let newId;
      do {
        newId = idPrefix + String(counter).padStart(4, "0");
        counter++;
      } while (existingIds.includes(newId));

      return newId;
    };

    // Validate patient exists and check branch access
    const patientResult = getPatientById(appointmentData.patientId);
    if (!patientResult.success) {
      return { success: false, message: "ไม่พบข้อมูลคนไข้" };
    }

    // Check if user has access to patient's branch
    if (currentUser && currentUser.role !== "super_admin") {
      const patientBranch = patientResult.patient.branch;
      if (patientBranch && patientBranch !== currentUser.branch) {
        return { success: false, message: "คุณไม่มีสิทธิ์จัดการคนไข้ในสาขาอื่น" };
      }
    }

    // Validate doctor exists if provided
    if (appointmentData.doctorId) {
      const doctorResult = getDoctorById(appointmentData.doctorId);
      if (!doctorResult.success) {
        return { success: false, message: "ไม่พบข้อมูลหมอ" };
      }
    }

    const newId = getNewAppointmentId();
    const timestamp = new Date();

    const newAppointment = [
      newId,
      appointmentData.patientId,
      appointmentData.doctorId || "",
      appointmentData.appointmentDate,
      appointmentData.appointmentTime,
      appointmentData.caseType || "",
      appointmentData.caseDetails || "",
      appointmentData.contactChannel || "",
      appointmentData.cost || 0,
      appointmentData.status || "scheduled",
      appointmentData.notes || "",
      appointmentData.branch ||
      (currentUser ? currentUser.branch : "BRANCH_01"),
      timestamp,
      timestamp,
      currentUser ? currentUser.username : "UNKNOWN",
      currentUser ? currentUser.username : "UNKNOWN",
    ];

    appointmentsSheet
      .getRange(lastRow + 1, 1, 1, newAppointment.length)
      .setValues([newAppointment]);

    // Invalidate cache since data changed
    invalidateCache("appointments");

    // Send notification to Google Chat
    try {
      // sendFormSubmissionNotification("appointment", newAppointment, "เพิ่ม");
      sendAppointmentConfirmation(appointmentData)
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return {
      success: true,
      message: "เพิ่มการนัดหมายเรียบร้อย",
      appointmentId: newId,
    };
  } catch (error) {
    console.error("Error adding appointment:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update appointment
 */
function updateAppointment(appointmentId, appointmentData, currentUser = null) {
  try {
    const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
    const data = appointmentsSheet.getDataRange().getValues();

    // Find appointment row
    let rowIndex = -1;
    let existingAppointment = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === appointmentId) {
        rowIndex = i + 1; // Convert to 1-indexed
        existingAppointment = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบการนัดหมาย" };
    }

    // Validate patient exists
    const patientResult = getPatientById(appointmentData.patientId);
    if (!patientResult.success) {
      return { success: false, message: "ไม่พบข้อมูลคนไข้" };
    }

    // Validate doctor exists if provided
    if (appointmentData.doctorId) {
      const doctorResult = getDoctorById(appointmentData.doctorId);
      if (!doctorResult.success) {
        return { success: false, message: "ไม่พบข้อมูลหมอ" };
      }
    }

    const updatedAppointment = [
      appointmentId,
      appointmentData.patientId,
      appointmentData.doctorId || "",
      appointmentData.appointmentDate,
      appointmentData.appointmentTime,
      appointmentData.caseType || "",
      appointmentData.caseDetails || "",
      appointmentData.contactChannel || "",
      appointmentData.cost || 0,
      appointmentData.status || "scheduled",
      appointmentData.notes || "",
      appointmentData.branch || existingAppointment[11],
      existingAppointment[12], // Keep original created at
      new Date(), // Update modified at
      existingAppointment[14] || "UNKNOWN", // Keep original created by
      currentUser ? currentUser.username : "UNKNOWN", // Update modified by
    ];

    appointmentsSheet
      .getRange(rowIndex, 1, 1, updatedAppointment.length)
      .setValues([updatedAppointment]);

    // Send notification to Google Chat
    try {
      sendFormSubmissionNotification("appointment", updatedAppointment, "แก้ไข");
      if(appointmentData.status === 'scheduled') {
        sendAppointmentEdit(appointmentData);
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return { success: true, message: "อัปเดตการนัดหมายเรียบร้อย" };
  } catch (error) {
    console.error("Error updating appointment:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete appointment
 */
function deleteAppointment(appointmentId) {
  try {
    const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
    const data = appointmentsSheet.getDataRange().getValues();

    // Find appointment row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === appointmentId) {
        rowIndex = i + 1; // Convert to 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบการนัดหมาย" };
    }

    appointmentsSheet.deleteRow(rowIndex);

    return { success: true, message: "ลบการนัดหมายเรียบร้อย" };
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get appointments by patient ID
 */
function getAppointmentsByPatient(patientId) {
  try {
    const allAppointments = getAllAppointments();
    if (!allAppointments.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลการนัดหมายได้" };
    }

    const patientAppointments = allAppointments.appointments.filter(
      (appointment) => appointment.patientId === patientId
    );

    return { success: true, appointments: patientAppointments };
  } catch (error) {
    console.error("Error getting appointments by patient:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get appointments by doctor
 */
function getAppointmentsByDoctor(doctorId) {
  try {
    const allAppointments = getAllAppointments();
    if (!allAppointments.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลการนัดหมายได้" };
    }

    const doctorAppointments = allAppointments.appointments.filter(
      (appointment) => appointment.doctor_id === doctorId
    );

    return { success: true, appointments: doctorAppointments };
  } catch (error) {
    console.error("Error getting appointments by doctor:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get appointments by date range
 */
function getAppointmentsByDateRange(startDate, endDate) {
  try {
    const allAppointments = getAllAppointments();
    if (!allAppointments.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลการนัดหมายได้" };
    }

    const filteredAppointments = allAppointments.appointments.filter(
      (appointment) => {
        const appointmentDate = new Date(appointment.appointment_date);
        return appointmentDate >= new Date(startDate) &&
          appointmentDate <= new Date(endDate);
      }
    );

    return { success: true, appointments: filteredAppointments };
  } catch (error) {
    console.error("Error getting appointments by date range:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get today's appointments from Today Appointments sheet
 */
function getTodayAppointments() {
  let sheet = getSheet(SHEET_NAMES.TODAY_APPOINTMENTS);
  let [header, ...data] = sheet
    .getDataRange()
    .getValues()
    .filter((x) => x[0] != ""); // Remove empty rows

  if (data.length < 1) {
    return { success: true, appointments: [] };
  }

  let appointments = data.map((row) => ({
    id: row[0],
    patientId: row[1],
    patientName: `${row[18]}${row[19]} ${row[20]}`,
    appointmentTime: row[4],
    caseType: row[5],
    caseDetails: row[6],
    status: row[9],
    branch: row[11],
    doctorName: `${row[16]} ${row[17]}`,
    doctorId: row[3],
  })).filter(a => a.status === 'scheduled'); // Only include scheduled appointments

  return { success: true, appointments };
}

function getSevenDaysAheadAppointments() {
  let sheet = getSheet(SHEET_NAMES.SEVEN_DAYS_AHEAD_APPOINTMENTS);
  let [header, ...data] = sheet
    .getDataRange()
    .getValues()
    .filter((x) => x[0] != ""); // Remove empty rows
  if (data.length <= 1) {
    return { success: true, appointments: [] };
  }
  let appointments = data.map((row) => ({
    id: row[0],
    patientId: row[1],
    patientName: `${row[18]}${row[19]} ${row[20]}`,
    appointmentDate: row[3],
    appointmentTime: row[4],
    caseType: row[5],
    caseDetails: row[6],
    status: row[9],
    branch: row[11],
    doctorName: `${row[16]} ${row[17]}`,
    doctorId: row[3],
  })).filter(a => a.status === 'scheduled'); // Only include scheduled appointments

  return { success: true, appointments };
}

function sendAppointmentConfirmation(appointmentData) {
  try {
    // Get patient details
    const patientResult = getPatientById(appointmentData.patientId);
    if (!patientResult.success) {
      console.error("Patient not found for appointment confirmation");
      return;
    }
    const doctorResult = appointmentData.doctorId ? getDoctorById(appointmentData.doctorId) : null;

    const patient = patientResult.patient
    const doctor = doctorResult && doctorResult.success ? doctorResult.doctor : null;
    if (!patient.userid || patient.userid.trim() === "") {
      console.log(`Patient ${patient.patient_id} not registered with LINE, skipping confirmation...`);
      return;
    }
    const lineUserId = patient.userid.trim();
    appointmentData.appointmentDate = formatDateThai(appointmentData.appointmentDate);
    LineBotWebhook.push(lineUserId, LINE_CHANNEL_ACCESS_TOKEN, [createAppointmentConfirmationFlexMessage(appointmentData, patient, doctor)]);
  } catch (error) {
    console.error("Error sending appointment confirmation:", error);
  }
}

function sendAppointmentEdit(appointmentData) {
  try {
    // Get patient details
    const patientResult = getPatientById(appointmentData.patientId);
    if (!patientResult.success) {
      console.error("Patient not found for appointment edit notification");
      return;
    }
    const doctorResult = appointmentData.doctorId ? getDoctorById(appointmentData.doctorId) : null;

    const patient = patientResult.patient
    const doctor = doctorResult && doctorResult.success ? doctorResult.doctor : null; 
    if (!patient.userid || patient.userid.trim() === "") {
      console.log(`Patient ${patient.patient_id} not registered with LINE, skipping edit notification...`);
      return;
    }
    const lineUserId = patient.userid.trim();
    appointmentData.appointmentDate = formatDateThai(appointmentData.appointmentDate);
    LineBotWebhook.push(lineUserId, LINE_CHANNEL_ACCESS_TOKEN, [createAppointmentEditFlexMessage(appointmentData, patient, doctor)]);
  } catch (error) {
    console.error("Error sending appointment edit notification:", error);
  }
}