/**
 * Validation utilities
 * Contains functions for validating data before processing
 */

/**
 * Validate data before processing to prevent errors
 */
function validatePatientData(patientData) {
  const errors = [];

  if (!patientData.firstName || patientData.firstName.trim() === "") {
    errors.push("กรุณาระบุชื่อจริง");
  }

  if (!patientData.lastName || patientData.lastName.trim() === "") {
    errors.push("กรุณาระบุนามสกุล");
  }

  if (!patientData.phone || patientData.phone.trim() === "") {
    errors.push("กรุณาระบุเบอร์โทรศัพท์");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

function validateAppointmentData(appointmentData) {
  const errors = [];

  if (!appointmentData.patientId) {
    errors.push("กรุณาระบุรหัสคนไข้");
  }

  if (!appointmentData.appointmentDate) {
    errors.push("กรุณาระบุวันที่นัด");
  }

  if (!appointmentData.appointmentTime) {
    errors.push("กรุณาระบุเวลานัด");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Validate doctor data
 */
function validateDoctorData(doctorData) {
  const errors = [];

  if (!doctorData.firstName || doctorData.firstName.trim() === "") {
    errors.push("กรุณาระบุชื่อจริง");
  }

  if (!doctorData.lastName || doctorData.lastName.trim() === "") {
    errors.push("กรุณาระบุนามสกุล");
  }

  if (!doctorData.specialty || doctorData.specialty.trim() === "") {
    errors.push("กรุณาระบุความเชี่ยวชาญ");
  }

  if (!doctorData.phone || doctorData.phone.trim() === "") {
    errors.push("กรุณาระบุเบอร์โทรศัพท์");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Validate revenue data
 */
function validateRevenueData(revenueData) {
  const errors = [];

  if (!revenueData.date) {
    errors.push("กรุณาระบุวันที่");
  }

  const totalAmount = (
    (revenueData.cashAmount || 0) +
    (revenueData.transferAmount || 0) +
    (revenueData.socialSecurityAmount || 0) +
    (revenueData.visaAmount || 0) +
    (revenueData.xrayFee || 0) +
    (revenueData.medicineFee || 0) +
    (revenueData.otherProductFee || 0)
  );

  if (totalAmount <= 0) {
    errors.push("จำนวนเงินต้องมากกว่า 0");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Validate user data
 */
function validateUserData(userData) {
  const errors = [];

  if (!userData.username || userData.username.trim() === "") {
    errors.push("กรุณาระบุชื่อผู้ใช้");
  }

  if (!userData.password || userData.password.trim() === "") {
    errors.push("กรุณาระบุรหัสผ่าน");
  }

  if (!userData.firstName || userData.firstName.trim() === "") {
    errors.push("กรุณาระบุชื่อจริง");
  }

  if (!userData.lastName || userData.lastName.trim() === "") {
    errors.push("กรุณาระบุนามสกุล");
  }

  if (!userData.role || userData.role.trim() === "") {
    errors.push("กรุณาระบุบทบาท");
  }

  if (!userData.branch || userData.branch.trim() === "") {
    errors.push("กรุณาระบุสาขา");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

/**
 * Generate unique ID
 */
function generateId(prefix, existingIds) {
  let counter = 1;
  let newId;

  do {
    newId = prefix + String(counter).padStart(3, "0");
    counter++;
  } while (existingIds.includes(newId));

  return newId;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(timeString) {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}

/**
 * Format currency (Thai Baht)
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
  }).format(amount);
}