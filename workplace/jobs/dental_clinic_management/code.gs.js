/**
 * Dental Clinic Management System - Google Apps Script Backend
 * This file contains all the backend functions for managing patients, appointments, and revenue
 * using Google Sheets as the database
 */

// Sheet names
const SHEET_NAMES = {
    PATIENTS: 'Patients',
    APPOINTMENTS: 'Appointments',
    REVENUE: 'Revenue',
    USERS: 'Users',
    DOCTORS: 'Doctors',
    OPTION_LIST: 'Option List'
};

/**
 * Initialize the system by creating necessary sheets and headers
 */
function initializeSystem() {
    try {
        // Get the main spreadsheet
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

        // Create or get sheets
        const patientsSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.PATIENTS);
        const appointmentsSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.APPOINTMENTS);
        const revenueSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.REVENUE);
        const usersSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.USERS);
        const doctorsSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.DOCTORS);
        const optionListSheet = getOrCreateSheetInSpreadsheet(spreadsheet, SHEET_NAMES.OPTION_LIST);

        // Setup headers if sheets are empty
        setupPatientsSheet(patientsSheet);
        setupAppointmentsSheet(appointmentsSheet);
        setupRevenueSheet(revenueSheet);
        setupUsersSheet(usersSheet);
        setupDoctorsSheet(doctorsSheet);
        setupOptionListSheet(optionListSheet);

        return { success: true, message: 'System initialized successfully' };
    } catch (error) {
        console.error('Error initializing system:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Get or create a sheet within the main spreadsheet
 */
function getOrCreateSheetInSpreadsheet(spreadsheet, sheetName) {
    try {
        let sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            sheet = spreadsheet.insertSheet(sheetName);
        }

        return sheet;
    } catch (error) {
        console.error(`Error getting/creating sheet ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Get a specific sheet from the main spreadsheet
 */
function getSheet(sheetName) {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName(sheetName);

        if (!sheet) {
            throw new Error(`Sheet '${sheetName}' not found. Please run initializeSystem() first.`);
        }

        return sheet;
    } catch (error) {
        console.error(`Error getting sheet ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Setup Patients sheet with headers
 */
function setupPatientsSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Title Prefix', 'First Name', 'Last Name', 'Phone', 'Birth Date',
            'Address', 'Allergies', 'Medical History', 'Notes', 'Registration Date', 'Created At', 'Updated At'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
}

/**
 * Setup Appointments sheet with headers
 */
function setupAppointmentsSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Patient ID', 'Doctor ID', 'Appointment Date', 'Appointment Time',
            'Case Type', 'Case Details', 'Cost', 'Status', 'Notes', 'Created At', 'Updated At'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
}

/**
 * Setup Revenue sheet with headers
 */
function setupRevenueSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Date', 'Description', 'Amount', 'Type', 'Notes', 'Created At', 'Updated At'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
}

/**
 * Setup Users sheet with headers
 */
function setupUsersSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Username', 'Password Hash', 'User Type', 'Full Name', 'Email',
            'Phone', 'Status', 'Created At', 'Updated At'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

        // Add default admin user
        const defaultAdmin = [
            'U001', 'admin', 'admin123', 'admin', 'ผู้ดูแลระบบ', 'admin@clinic.com',
            '081-234-5678', 'active', new Date(), new Date()
        ];
        sheet.getRange(2, 1, 1, defaultAdmin.length).setValues([defaultAdmin]);

        // Add default user
        const defaultUser = [
            'U002', 'user', 'user123', 'user', 'ผู้ใช้ทั่วไป', 'user@clinic.com',
            '082-345-6789', 'active', new Date(), new Date()
        ];
        sheet.getRange(3, 1, 1, defaultUser.length).setValues([defaultUser]);
    }
}

/**
 * Setup Doctors sheet with headers
 */
function setupDoctorsSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'First Name', 'Last Name', 'Specialty', 'Phone', 'Email',
            'License Number', 'Notes', 'Status', 'Created At', 'Updated At'
        ];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

        // Add sample doctors data
        const sampleDoctors = [
            ['DR001', 'สมชาย', 'ใจดี', 'จัดฟัน', '081-234-5678', 'somchai@clinic.com', 'D12345', 'ชำนาญการจัดฟันเด็กและผู้ใหญ่', 'active', new Date(), new Date()],
            ['DR002', 'สุดา', 'ปรีชา', 'ทันตกรรมทั่วไป', '082-345-6789', 'suda@clinic.com', 'D23456', 'เชี่ยวชาญด้านการรักษาฟันผุและถอนฟัน', 'active', new Date(), new Date()],
            ['DR003', 'วิชัย', 'สุขใส', 'ทันตกรรมเด็ก', '083-456-7890', 'wichai@clinic.com', 'D34567', 'ผู้เชี่ยวชาญด้านทันตกรรมเด็กและการป้องกัน', 'active', new Date(), new Date()]
        ];
        sheet.getRange(2, 1, sampleDoctors.length, sampleDoctors[0].length).setValues(sampleDoctors);
    }
}

/**
 * Setup Option List sheet with headers and default options
 */
function setupOptionListSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        // Simple two-column structure
        const headers = ['Case Type', 'Case Details'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

        // Add default case types in column A and case details in column B
        const caseTypes = [
            'จัดฟัน',
            'GP1', 
            'GP2',
            'GP3',
            'รักษาราก',
            'ซื้อผลิตภัณฑ์'
        ];

        const caseDetails = [
            'จัดฟัน',
            'ปรับลวด',
            'ถอดเครื่องมือ',
            'ทำรีเทนเนอร์',
            'อุดฟัน',
            'ถอนฟัน',
            'ถอนฟันน้ำนม',
            'ขูดหินปูน',
            'ผ่าฟันคุด',
            'รักษารากฟัน',
            'เกลารากฟัน',
            'ทำครอบฟัน',
            'เคลือบฟลูออไรด์',
            'ตรวจและปรึกษา'
        ];

        // Add case types to column A (starting from A2)
        for (let i = 0; i < caseTypes.length; i++) {
            sheet.getRange(i + 2, 1).setValue(caseTypes[i]);
        }

        // Add case details to column B (starting from B2)
        for (let i = 0; i < caseDetails.length; i++) {
            sheet.getRange(i + 2, 2).setValue(caseDetails[i]);
        }
        
        // Format the sheet
        sheet.getRange(1, 1, 1, headers.length).setBackground('#30308b').setFontColor('white');
        sheet.setFrozenRows(1);
        sheet.autoResizeColumns(1, headers.length);
    }
}

// ===========================================
// USER AUTHENTICATION FUNCTIONS
// ===========================================

/**
 * Authenticate user login
 */
function authenticateUser(username, password) {
    try {
        const usersSheet = getSheet(SHEET_NAMES.USERS);
        const data = usersSheet.getDataRange().getValues();

        // Skip header row
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const [id, dbUsername, dbPassword, dbUserType, fullName, email, phone, status] = row;

            if (dbUsername === username && dbPassword === password && status === 'active') {
                return {
                    success: true,
                    user: {
                        id: id,
                        username: dbUsername,
                        userType: dbUserType,
                        fullName: fullName,
                        email: email,
                        phone: phone
                    }
                };
            }
        }

        return { success: false, message: 'ชื่อผู้ใช้ รหัสผ่าน หรือประเภทผู้ใช้ไม่ถูกต้อง' };
    } catch (error) {
        console.error('Error authenticating user:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Create new user account
 */
function createUser(userData) {
    try {
        const usersSheet = getSheet(SHEET_NAMES.USERS);
        const lastRow = usersSheet.getLastRow();
        const newId = 'U' + String(lastRow).padStart(3, '0');

        const newUser = [
            newId,
            userData.username,
            userData.password, // In production, this should be hashed
            userData.userType,
            userData.fullName,
            userData.email,
            userData.phone,
            'active',
            new Date(),
            new Date()
        ];

        usersSheet.getRange(lastRow + 1, 1, 1, newUser.length).setValues([newUser]);

        return { success: true, message: 'สร้างบัญชีผู้ใช้เรียบร้อย', userId: newId };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// PATIENT MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Get all patients
 */
function getAllPatients() {
    try {
        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const data = patientsSheet.getDataRange().getValues();
        SpreadsheetApp.flush()

        if (data.length <= 1) {
            return JSON.stringify({ success: true, patients: [] });
        }

        const patients = [];
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const patient = {};

            headers.forEach((header, index) => {
                patient[header.replace(/\s+/g, '_').toLowerCase()] = row[index];
            });

            patients.push(patient);
        }

        return JSON.stringify({ success: true, patients: patients });
    } catch (error) {
        console.error('Error getting patients:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new patient
 */
function addPatient(patientData) {
    try {
        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const lastRow = patientsSheet.getLastRow();
        const getNewPatientId = () => {
            let today = new Date();
            let month = String(today.getMonth() + 1).padStart(2, '0');
            let year = String(today.getFullYear() < 2400 ? today.getFullYear() + 543 : today.getFullYear()).slice(-2);
            if (lastRow === 1) {
                return 'P' + year + month + '0001';
            }
            let last_id = patientsSheet.getRange(lastRow, 1).getValue();
            let last_id_num = parseInt(last_id.slice(5))
            let last_id_prefix = last_id.slice(0, 5);
            let new_id_num = String(last_id_num + 1).padStart(4, '0');
            let new_id = last_id_prefix + new_id_num;
            let current_prefix = 'P' + year + month;
            if (new_id.startsWith(current_prefix)) {
                return new_id;
            }
            return current_prefix + '0001';
        }
        const newId = getNewPatientId();

        const newPatient = [
            newId,
            patientData.titlePrefix || '',
            patientData.firstName,
            patientData.lastName,
            "'" + patientData.phone,
            patientData.birthDate,
            patientData.address || '',
            patientData.allergies || '',
            patientData.medicalHistory || '',
            patientData.notes || '',
            new Date(),
            new Date(),
            new Date()
        ];

        patientsSheet.getRange(lastRow + 1, 1, 1, newPatient.length).setValues([newPatient]);

        return { success: true, message: 'เพิ่มคนไข้เรียบร้อย', patientId: newId };
    } catch (error) {
        console.error('Error adding patient:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update patient information
 */
function updatePatient(patientId, patientData) {
    try {
        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const data = patientsSheet.getDataRange().getValues();

        // Find patient row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === patientId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Update patient data
        const updatedPatient = [
            patientId,
            patientData.titlePrefix || '',
            patientData.firstName,
            patientData.lastName,
            "'"+ patientData.phone,
            patientData.birthDate,
            patientData.address || '',
            patientData.allergies || '',
            patientData.medicalHistory || '',
            patientData.notes || '',
            data[rowIndex - 1][10], // Keep original registration date (index adjusted for titlePrefix)
            data[rowIndex - 1][11], // Keep original created date (index adjusted for titlePrefix)
            new Date() // Update modified date
        ];

        patientsSheet.getRange(rowIndex, 1, 1, updatedPatient.length).setValues([updatedPatient]);

        return { success: true, message: 'อัปเดตข้อมูลคนไข้เรียบร้อย' };
    } catch (error) {
        console.error('Error updating patient:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Delete patient
 */
function deletePatient(patientId) {
    try {
        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const data = patientsSheet.getDataRange().getValues();

        // Find patient row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === patientId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Check if patient has appointments
        const appointmentsResult = getAppointmentsByPatient(patientId);
        if (appointmentsResult.success && appointmentsResult.appointments.length > 0) {
            return { success: false, message: 'ไม่สามารถลบคนไข้ที่มีการนัดหมาย กรุณาลบการนัดหมายก่อน' };
        }

        patientsSheet.deleteRow(rowIndex);

        return { success: true, message: 'ลบข้อมูลคนไข้เรียบร้อย' };
    } catch (error) {
        console.error('Error deleting patient:', error);
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
                    patient[header.replace(/\s+/g, '_').toLowerCase()] = data[i][index];
                });
                return { success: true, patient: patient };
            }
        }

        return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
    } catch (error) {
        console.error('Error getting patient by ID:', error);
        return { success: false, message: error.toString() };
    }
}

// DOCTOR MANAGEMENT FUNCTIONS

/**
 * Get all doctors
 */
function getAllDoctors() {
    try {
        const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
        const data = doctorsSheet.getDataRange().getValues();
        SpreadsheetApp.flush()

        if (data.length <= 1) {
            return JSON.stringify({ success: true, doctors: [] });
        }

        const doctors = [];
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const doctor = {};

            headers.forEach((header, index) => {
                doctor[header.replace(/\s+/g, '_').toLowerCase()] = row[index];
            });

            doctors.push(doctor);
        }

        return JSON.stringify({ success: true, doctors: doctors });
    } catch (error) {
        console.error('Error getting doctors:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new doctor
 */
function addDoctor(doctorData) {
    try {
        const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
        const lastRow = doctorsSheet.getLastRow();
        const getNewDoctorId = () => {
            if (lastRow === 1) {
                return 'DR001';
            }
            let last_id = doctorsSheet.getRange(lastRow, 1).getValue();
            let last_id_num = parseInt(last_id.slice(2));
            let new_id_num = String(last_id_num + 1).padStart(3, '0');
            return 'DR' + new_id_num;
        }
        const newId = getNewDoctorId();

        const newDoctor = [
            newId,
            doctorData.firstName,
            doctorData.lastName,
            doctorData.specialty,
            "'" + doctorData.phone,
            doctorData.email || '',
            doctorData.licenseNumber || '',
            doctorData.notes || '',
            'active',
            new Date(),
            new Date()
        ];

        doctorsSheet.getRange(lastRow + 1, 1, 1, newDoctor.length).setValues([newDoctor]);

        return { success: true, message: 'เพิ่มข้อมูลหมอเรียบร้อย', doctorId: newId };
    } catch (error) {
        console.error('Error adding doctor:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update doctor information
 */
function updateDoctor(doctorId, doctorData) {
    try {
        const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
        const data = doctorsSheet.getDataRange().getValues();

        // Find doctor row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === doctorId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลหมอ' };
        }

        const updatedDoctor = [
            doctorId,
            doctorData.firstName,
            doctorData.lastName,
            doctorData.specialty,
            "'" + doctorData.phone,
            doctorData.email || '',
            doctorData.licenseNumber || '',
            doctorData.notes || '',
            doctorData.status || 'active',
            data[rowIndex - 1][9], // Keep original created_at
            new Date() // Update updated_at
        ];

        doctorsSheet.getRange(rowIndex, 1, 1, updatedDoctor.length).setValues([updatedDoctor]);

        return { success: true, message: 'อัปเดตข้อมูลหมอเรียบร้อย' };
    } catch (error) {
        console.error('Error updating doctor:', error);
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
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลหมอ' };
        }

        // Check if doctor has appointments
        const appointmentsResult = getAppointmentsByDoctor(doctorId);
        if (appointmentsResult.success && appointmentsResult.appointments.length > 0) {
            return { success: false, message: 'ไม่สามารถลบหมอที่มีการนัดหมาย กรุณาอัปเดตการนัดหมายก่อน' };
        }

        doctorsSheet.deleteRow(rowIndex);

        return { success: true, message: 'ลบข้อมูลหมอเรียบร้อย' };
    } catch (error) {
        console.error('Error deleting doctor:', error);
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
            return { success: false, message: 'ไม่พบข้อมูลหมอ' };
        }

        const headers = data[0];
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === doctorId) {
                const doctor = {};
                headers.forEach((header, index) => {
                    doctor[header.replace(/\s+/g, '_').toLowerCase()] = data[i][index];
                });
                return { success: true, doctor: doctor };
            }
        }

        return { success: false, message: 'ไม่พบข้อมูลหมอ' };
    } catch (error) {
        console.error('Error getting doctor:', error);
        return { success: false, message: error.toString() };
    }
}

// APPOINTMENT MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Get all appointments
 */
function getAllAppointments() {
    try {
        const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
        const data = appointmentsSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return JSON.stringify({ success: true, appointments: [] });
        }

        const appointments = [];
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const appointment = {};

            headers.forEach((header, index) => {
                appointment[header.replace(/\s+/g, '_').toLowerCase()] = row[index];
            });

            appointments.push(appointment);
        }

        return JSON.stringify({ success: true, appointments: appointments });
    } catch (error) {
        console.error('Error getting appointments:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new appointment
 */
function addAppointment(appointmentData) {
    try {
        const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
        const lastRow = appointmentsSheet.getLastRow();
        const getNewAppointmentId = () => {
            let today = new Date();
            let month = String(today.getMonth() + 1).padStart(2, '0');
            let year = String(today.getFullYear() < 2400 ? today.getFullYear() + 543 : today.getFullYear()).slice(-2);
            if (lastRow === 1) {
                return 'A' + year + month + '0001';
            }
            let last_id = appointmentsSheet.getRange(lastRow, 1).getValue();
            let last_id_num = parseInt(last_id.slice(5))
            let last_id_prefix = last_id.slice(0, 5);
            let new_id_num = String(last_id_num + 1).padStart(4, '0');
            let new_id = last_id_prefix + new_id_num;
            let current_prefix = 'A' + year + month;
            if (new_id.startsWith(current_prefix)) {
                return new_id;
            }
            return current_prefix + '0001';
        }

        // Validate patient exists
        const patientResult = getPatientById(appointmentData.patientId);
        if (!patientResult.success) {
            return JSON.stringify({ success: false, message: 'ไม่พบข้อมูลคนไข้' });
        }

        // Validate doctor exists if provided
        if (appointmentData.doctorId) {
            const doctorResult = getDoctorById(appointmentData.doctorId);
            if (!doctorResult.success) {
                return JSON.stringify({ success: false, message: 'ไม่พบข้อมูลหมอ' });
            }
        }

        const newId = getNewAppointmentId()

        const newAppointment = [
            newId,
            appointmentData.patientId,
            appointmentData.doctorId || '',
            appointmentData.appointmentDate,
            appointmentData.appointmentTime,
            appointmentData.caseType || '',
            appointmentData.caseDetails || '',
            appointmentData.cost || 0,
            appointmentData.status || 'scheduled',
            appointmentData.notes || '',
            new Date(),
            new Date()
        ];

        appointmentsSheet.getRange(lastRow + 1, 1, 1, newAppointment.length).setValues([newAppointment]);

        return { success: true, message: 'เพิ่มการนัดหมายเรียบร้อย', appointmentId: newId };
    } catch (error) {
        console.error('Error adding appointment:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update appointment
 */
function updateAppointment(appointmentId, appointmentData) {
    try {
        const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
        const data = appointmentsSheet.getDataRange().getValues();

        // Find appointment row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === appointmentId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลการนัดหมาย' };
        }

        // Validate patient exists
        const patientResult = getPatientById(appointmentData.patientId);
        if (!patientResult.success) {
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Validate doctor exists if provided
        if (appointmentData.doctorId) {
            const doctorResult = getDoctorById(appointmentData.doctorId);
            if (!doctorResult.success) {
                return { success: false, message: 'ไม่พบข้อมูลหมอ' };
            }
        }

        const updatedAppointment = [
            appointmentId,
            appointmentData.patientId,
            appointmentData.doctorId || '',
            appointmentData.appointmentDate,
            appointmentData.appointmentTime,
            appointmentData.caseType || '',
            appointmentData.caseDetails || '',
            appointmentData.cost || 0,
            appointmentData.status || 'scheduled',
            appointmentData.notes || '',
            data[rowIndex - 1][10], // Keep original created date (index adjusted for removed treatment column)
            new Date() // Update modified date
        ];

        appointmentsSheet.getRange(rowIndex, 1, 1, updatedAppointment.length).setValues([updatedAppointment]);

        return { success: true, message: 'อัปเดตการนัดหมายเรียบร้อย' };
    } catch (error) {
        console.error('Error updating appointment:', error);
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
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลการนัดหมาย' };
        }

        appointmentsSheet.deleteRow(rowIndex);

        return { success: true, message: 'ลบการนัดหมายเรียบร้อย' };
    } catch (error) {
        console.error('Error deleting appointment:', error);
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
            return allAppointments;
        }

        const patientAppointments = allAppointments.appointments.filter(
            appointment => appointment.patientId === patientId
        );

        return { success: true, appointments: patientAppointments };
    } catch (error) {
        console.error('Error getting appointments by patient:', error);
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
            return allAppointments;
        }

        const doctorAppointments = allAppointments.appointments.filter(
            appointment => appointment.doctor_id === doctorId
        );

        return { success: true, appointments: doctorAppointments };
    } catch (error) {
        console.error('Error getting appointments by doctor:', error);
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
            return allAppointments;
        }

        const filteredAppointments = allAppointments.appointments.filter(appointment => {
            const appointmentDate = new Date(appointment.appointmentDate);
            const start = new Date(startDate);
            const end = new Date(endDate);

            return appointmentDate >= start && appointmentDate <= end;
        });

        return { success: true, appointments: filteredAppointments };
    } catch (error) {
        console.error('Error getting appointments by date range:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// REVENUE MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Get all revenue records
 */
function getAllRevenues() {
    try {
        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const data = revenueSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return { success: true, revenues: [] };
        }

        const revenues = [];
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const revenue = {};

            headers.forEach((header, index) => {
                revenue[header.replace(/\s+/g, '_').toLowerCase()] = row[index];
            });

            revenues.push(revenue);
        }

        return { success: true, revenues: revenues };
    } catch (error) {
        console.error('Error getting revenues:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Add new revenue record
 */
function addRevenue(revenueData) {
    try {
        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const lastRow = revenueSheet.getLastRow();
        const newId = 'R' + String(lastRow).padStart(3, '0');

        const newRevenue = [
            newId,
            revenueData.date,
            revenueData.description,
            revenueData.amount,
            revenueData.type || 'treatment',
            revenueData.notes || '',
            new Date(),
            new Date()
        ];

        revenueSheet.getRange(lastRow + 1, 1, 1, newRevenue.length).setValues([newRevenue]);

        return { success: true, message: 'เพิ่มรายได้เรียบร้อย', revenueId: newId };
    } catch (error) {
        console.error('Error adding revenue:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update revenue record
 */
function updateRevenue(revenueId, revenueData) {
    try {
        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const data = revenueSheet.getDataRange().getValues();

        // Find revenue row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === revenueId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลรายได้' };
        }

        const updatedRevenue = [
            revenueId,
            revenueData.date,
            revenueData.description,
            revenueData.amount,
            revenueData.type || 'treatment',
            revenueData.notes || '',
            data[rowIndex - 1][6], // Keep original created date
            new Date() // Update modified date
        ];

        revenueSheet.getRange(rowIndex, 1, 1, updatedRevenue.length).setValues([updatedRevenue]);

        return { success: true, message: 'อัปเดตรายได้เรียบร้อย' };
    } catch (error) {
        console.error('Error updating revenue:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Delete revenue record
 */
function deleteRevenue(revenueId) {
    try {
        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const data = revenueSheet.getDataRange().getValues();

        // Find revenue row
        let rowIndex = -1;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === revenueId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลรายได้' };
        }

        revenueSheet.deleteRow(rowIndex);

        return { success: true, message: 'ลบรายได้เรียบร้อย' };
    } catch (error) {
        console.error('Error deleting revenue:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Get revenue by date range
 */
function getRevenueByDateRange(startDate, endDate) {
    try {
        const allRevenues = getAllRevenues();
        if (!allRevenues.success) {
            return allRevenues;
        }

        const filteredRevenues = allRevenues.revenues.filter(revenue => {
            const revenueDate = new Date(revenue.date);
            const start = new Date(startDate);
            const end = new Date(endDate);

            return revenueDate >= start && revenueDate <= end;
        });

        return { success: true, revenues: filteredRevenues };
    } catch (error) {
        console.error('Error getting revenue by date range:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// NOTIFICATION FUNCTIONS
// ===========================================

/**
 * Get upcoming appointments for notifications
 */
function getUpcomingAppointments(days = 1) {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        const appointments = getAppointmentsByDateRange(
            today.toISOString().split('T')[0],
            futureDate.toISOString().split('T')[0]
        );

        if (!appointments.success) {
            return appointments;
        }

        // Get patient details for each appointment
        const appointmentsWithPatients = [];

        for (const appointment of appointments.appointments) {
            const patient = getPatientById(appointment.patientId);
            if (patient.success) {
                appointmentsWithPatients.push({
                    ...appointment,
                    patient: patient.patient
                });
            }
        }

        return { success: true, appointments: appointmentsWithPatients };
    } catch (error) {
        console.error('Error getting upcoming appointments:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Send email notifications (requires Gmail API setup)
 */
function sendEmailNotification(to, subject, body) {
    try {
        // This requires Gmail API to be enabled in Google Apps Script
        GmailApp.sendEmail(to, subject, body);
        return { success: true, message: 'อีเมลส่งเรียบร้อย' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// REPORTING FUNCTIONS  
// ===========================================

/**
 * Generate monthly patient report
 */
function generateMonthlyPatientReport(year, month) {
    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const allPatients = getAllPatients();
        if (!allPatients.success) {
            return allPatients;
        }

        const monthlyPatients = allPatients.patients.filter(patient => {
            const regDate = new Date(patient.registrationDate);
            return regDate >= startDate && regDate <= endDate;
        });

        return {
            success: true,
            report: {
                month: month,
                year: year,
                totalNewPatients: monthlyPatients.length,
                patients: monthlyPatients
            }
        };
    } catch (error) {
        console.error('Error generating monthly patient report:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Generate monthly revenue report
 */
function generateMonthlyRevenueReport(year, month) {
    try {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const monthlyRevenues = getRevenueByDateRange(startDate, endDate);
        if (!monthlyRevenues.success) {
            return monthlyRevenues;
        }

        const totalRevenue = monthlyRevenues.revenues.reduce((sum, revenue) => sum + revenue.amount, 0);

        // Group by type
        const revenueByType = {};
        monthlyRevenues.revenues.forEach(revenue => {
            if (!revenueByType[revenue.type]) {
                revenueByType[revenue.type] = 0;
            }
            revenueByType[revenue.type] += revenue.amount;
        });

        return {
            success: true,
            report: {
                month: month,
                year: year,
                totalRevenue: totalRevenue,
                revenueByType: revenueByType,
                revenues: monthlyRevenues.revenues
            }
        };
    } catch (error) {
        console.error('Error generating monthly revenue report:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Generate unique ID
 */
function generateId(prefix, existingIds) {
    let counter = 1;
    let newId;

    do {
        newId = prefix + String(counter).padStart(3, '0');
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
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
}

// ===========================================
// OPTION LIST FUNCTIONS
// ===========================================

/**
 * Get case types from Option List sheet (Column A)
 */
function getCaseTypes() {
    try {
        const optionListSheet = getSheet(SHEET_NAMES.OPTION_LIST);
        const data = optionListSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return JSON.stringify({ success: true, options: [] });
        }

        const caseTypes = [];
        for (let i = 1; i < data.length; i++) {
            const caseType = data[i][0]; // Column A (Case Type)
            if (caseType && caseType.toString().trim() !== '') {
                caseTypes.push({
                    value: caseType.toString().trim(),
                    displayOrder: i,
                    description: caseType.toString().trim()
                });
            }
        }

        return JSON.stringify({ success: true, options: caseTypes });
    } catch (error) {
        console.error('Error getting case types:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Get case details from Option List sheet (Column B)
 */
function getCaseDetails() {
    try {
        const optionListSheet = getSheet(SHEET_NAMES.OPTION_LIST);
        const data = optionListSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return JSON.stringify({ success: true, options: [] });
        }

        const caseDetails = [];
        for (let i = 1; i < data.length; i++) {
            const caseDetail = data[i][1]; // Column B (Case Details)
            if (caseDetail && caseDetail.toString().trim() !== '') {
                caseDetails.push({
                    value: caseDetail.toString().trim(),
                    displayOrder: i,
                    description: caseDetail.toString().trim()
                });
            }
        }

        return JSON.stringify({ success: true, options: caseDetails });
    } catch (error) {
        console.error('Error getting case details:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Get all options from Option List sheet
 */
function getAllOptions() {
    try {
        const caseTypesResult = JSON.parse(getCaseTypes());
        const caseDetailsResult = JSON.parse(getCaseDetails());

        if (!caseTypesResult.success || !caseDetailsResult.success) {
            return JSON.stringify({ 
                success: false, 
                message: 'Error retrieving options' 
            });
        }

        return JSON.stringify({
            success: true,
            caseTypes: caseTypesResult.options,
            caseDetails: caseDetailsResult.options
        });
    } catch (error) {
        console.error('Error getting all options:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Test function to verify all functionality
 */
function testAllFunctions() {
    console.log('Testing Dental Clinic Management System...');

    // Test initialization
    const initResult = initializeSystem();
    console.log('Init Result:', initResult);

    // Test patient operations
    const patientData = {
        firstName: 'ทดสอบ',
        lastName: 'ระบบ',
        phone: '081-111-1111',
        birthDate: '1990-01-01',
        address: 'ที่อยู่ทดสอบ'
    };

    const addPatientResult = addPatient(patientData);
    console.log('Add Patient Result:', addPatientResult);

    const getAllPatientsResult = getAllPatients();
    console.log('Get All Patients Result:', getAllPatientsResult);

    console.log('All tests completed!');
}

// ===========================================
// WEB APP FUNCTIONS (for HTML service)
// ===========================================

/**
 * Include HTML file content
 */
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Migration function to remove treatment column from existing appointments sheet
 * Run this once if you have existing data with treatment column
 */
function migrateTreatmentColumn() {
    try {
        const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
        const data = appointmentsSheet.getDataRange().getValues();
        
        if (data.length === 0) {
            return { success: true, message: 'No data to migrate' };
        }
        
        const headers = data[0];
        const treatmentIndex = headers.indexOf('Treatment');
        
        if (treatmentIndex === -1) {
            return { success: true, message: 'Treatment column not found, no migration needed' };
        }
        
        // Remove treatment column from all rows
        const migratedData = data.map(row => {
            const newRow = [...row];
            newRow.splice(treatmentIndex, 1);
            return newRow;
        });
        
        // Clear the sheet and write migrated data
        appointmentsSheet.clear();
        appointmentsSheet.getRange(1, 1, migratedData.length, migratedData[0].length).setValues(migratedData);
        appointmentsSheet.getRange(1, 1, 1, migratedData[0].length).setFontWeight('bold');
        
        return { success: true, message: `Migrated ${data.length - 1} appointments, removed treatment column` };
    } catch (error) {
        console.error('Error migrating treatment column:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Main doGet function for web app deployment
 */
function doGet() {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setTitle('ระบบจัดการคลินิคทันตกรรม')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .setSandboxMode(HtmlService.SandboxMode.IFRAME)
        .setFaviconUrl('https://img2.pic.in.th/pic/Screenshot-2025-09-22-215301.png'); // Replace with actual favicon URL
}