/**
 * Dental Clinic Management System - Google Apps Script Backend
 * This file contains all the backend functions for managing patients, appointments, and revenue
 * using Google Sheets as the database
 * 
 * GOOGLE CHAT NOTIFICATIONS SETUP:
 * 1. Create or open a Google Chat space
 * 2. Click on the space name at the top
 * 3. Select "Manage webhooks"
 * 4. Click "Add webhook"
 * 5. Give it a name and copy the webhook URL
 * 6. Run: setGoogleChatWebhook('YOUR_WEBHOOK_URL') in the Apps Script editor
 * 7. The system will automatically send notifications for all form submissions
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

// Users sheet column indices (0-based)
const USER_COLUMNS = {
    ID: 0,
    USERNAME: 1,
    PASSWORD_HASH: 2,
    USER_TYPE: 3,
    FIRST_NAME: 4,
    LAST_NAME: 5,
    EMAIL: 6,
    PHONE: 7,
    BRANCH: 8,
    ROLE: 9,
    STATUS: 10,
    CREATED_AT: 11,
    UPDATED_AT: 12,
    CREATED_BY_USER: 13,
    UPDATED_BY_USER: 14
};

// Cache for spreadsheet and sheets to avoid repeated API calls
let spreadsheetCache = null;
let sheetCache = {};

/**
 * Get cached spreadsheet instance
 */
function getCachedSpreadsheet() {
    if (!spreadsheetCache) {
        spreadsheetCache = SpreadsheetApp.getActiveSpreadsheet();
    }
    return spreadsheetCache;
}

/**
 * Get cached sheet instance
 */
function getCachedSheet(sheetName) {
    if (!sheetCache[sheetName]) {
        const spreadsheet = getCachedSpreadsheet();
        sheetCache[sheetName] = spreadsheet.getSheetByName(sheetName);
        
        if (!sheetCache[sheetName]) {
            throw new Error(`Sheet '${sheetName}' not found. Please run initializeSystem() first.`);
        }
    }
    return sheetCache[sheetName];
}

/**
 * Clear cache when sheets are modified
 */
function clearCache() {
    spreadsheetCache = null;
    sheetCache = {};
}

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
        
        sheetNames.forEach(sheetName => {
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
            // Update cache with new sheet
            sheetCache[sheetName] = sheet;
        }

        return sheet;
    } catch (error) {
        console.error(`Error getting/creating sheet ${sheetName}:`, error);
        throw error;
    }
}

/**
 * Get a specific sheet from the main spreadsheet (optimized with cache)
 */
function getSheet(sheetName) {
    try {
        return getCachedSheet(sheetName);
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
            'ID', 'Title Prefix', 'First Name', 'Last Name', 'Phone', 'Birth Date', 'Gender',
            'Address', 'Allergies', 'Medical History', 'Notes', 'Branch', 'Registration Date', 
            'Created At', 'Updated At', 'Created By User', 'Updated By User'
        ];
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');
    }
}

/**
 * Setup Appointments sheet with headers
 */
function setupAppointmentsSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Patient ID', 'Doctor ID', 'Appointment Date', 'Appointment Time',
            'Case Type', 'Case Details', 'Contact Channel', 'Cost', 'Status', 'Notes', 'Branch', 
            'Created At', 'Updated At', 'Created By User', 'Updated By User'
        ];
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');
    }
}

/**
 * Setup Revenue sheet with headers
 */
function setupRevenueSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Date', 'Patient ID', 'Doctor ID', 'Case Type', 'Case Details', 'Payment Type', 
            'Cash Amount', 'Transfer Amount', 'Social Security Amount', 'Visa Amount',
            'X-ray Fee', 'Medicine Fee', 'Other Product Fee', 'Discount', 
            'Notes', 'Branch', 'Created At', 'Updated At', 'Created By User', 'Updated By User'
        ];
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');
    }
}

/**
 * Setup Users sheet with headers
 */
function setupUsersSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'Username', 'Password Hash', 'User Type', 'First Name', 'Last Name', 'Email',
            'Phone', 'Branch', 'Role', 'Status', 'Created At', 'Updated At', 'Created By User', 'Updated By User'
        ];
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');

        // Add default users in batch with branch and role information
        const defaultUsers = [
            ['U001', 'superadmin', 'superadmin123', 'super_admin', 'ผู้ดูแลระบบ', 'หลัก', 'superadmin@clinic.com',
             '081-000-0000', 'HEAD_OFFICE', 'super_admin', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM'],
            ['U002', 'admin', 'admin123', 'admin', 'ผู้ดูแลระบบ', 'สาขา', 'admin@clinic.com',
             '081-234-5678', 'BRANCH_01', 'admin', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM'],
            ['U003', 'user', 'user123', 'user', 'ผู้ใช้', 'ทั่วไป', 'user@clinic.com',
             '082-345-6789', 'BRANCH_01', 'user', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM']
        ];
        
        if (defaultUsers.length > 0) {
            sheet.getRange(2, 1, defaultUsers.length, defaultUsers[0].length).setValues(defaultUsers);
        }
    }
}

/**
 * Setup Doctors sheet with headers
 */
function setupDoctorsSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        const headers = [
            'ID', 'First Name', 'Last Name', 'Specialty', 'Phone', 'Email',
            'License Number', 'Notes', 'Status', 'Created At', 'Updated At', 'Created By User', 'Updated By User'
        ];
        const range = sheet.getRange(1, 1, 1, headers.length);
        range.setValues([headers]);
        range.setFontWeight('bold');

        // Add sample doctors data in batch (shared across all branches)
        const sampleDoctors = [
            ['DR001', 'สมชาย', 'ใจดี', 'จัดฟัน', '081-234-5678', 'somchai@clinic.com', 'D12345', 'ชำนาญการจัดฟันเด็กและผู้ใหญ่', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM'],
            ['DR002', 'สุดา', 'ปรีชา', 'ทันตกรรมทั่วไป', '082-345-6789', 'suda@clinic.com', 'D23456', 'เชี่ยวชาญด้านการรักษาฟันผุและถอนฟัน', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM'],
            ['DR003', 'วิชัย', 'สุขใส', 'ทันตกรรมเด็ก', '083-456-7890', 'wichai@clinic.com', 'D34567', 'ผู้เชี่ยวชาญด้านทันตกรรมเด็กและการป้องกัน', 'active', new Date(), new Date(), 'SYSTEM', 'SYSTEM']
        ];
        
        if (sampleDoctors.length > 0) {
            sheet.getRange(2, 1, sampleDoctors.length, sampleDoctors[0].length).setValues(sampleDoctors);
        }
    }
}

/**
 * Setup Option List sheet with headers and default options
 */
function setupOptionListSheet(sheet) {
    if (sheet.getLastRow() === 0) {
        // Five-column structure: Case Type, Case Details, Contact Channel, Branch, Payment Method
        const headers = ['Case Type', 'Case Details', 'Contact Channel', 'Branch', 'Payment Method'];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');

        // Add default case types in column A
        const caseTypes = [
            'จัดฟัน',
            'GP1', 
            'GP2',
            'GP3',
            'รักษาราก',
            'ซื้อผลิตภัณฑ์'
        ];

        // Add default case details in column B
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

        // Add default contact channels in column C
        const contactChannels = [
            'โทรศัพท์',
            'Facebook',
            'Line',
            'Walk in',
            'นัดต่อเนื่อง'
        ];

        // Add default branches in column D
        const branches = [
            'HEAD_OFFICE',
            'BRANCH_01',
            'BRANCH_02',
            'BRANCH_03',
            'BRANCH_04',
            'BRANCH_05'
        ];

        // Add default payment methods in column E
        const paymentMethods = [
            'เงินสด',
            'โอน',
            'บัตรเครดิต',
            'QR Code',
            'เช็ค',
            'ประกันสังคม',
            'Visa'
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
        sheet.getRange(1, 1, 1, headers.length).setBackground('#30308b').setFontColor('white');
        sheet.setFrozenRows(1);
        sheet.autoResizeColumns(1, headers.length);
    }
}

// ===========================================
// USER AUTHENTICATION FUNCTIONS
// ===========================================

// ===========================================
// ROLE-BASED ACCESS CONTROL FUNCTIONS
// ===========================================

/**
 * Check if user has permission to access a function
 */
function checkPermission(userRole, action) {
    const permissions = {
        'super_admin': {
            canManageUsers: true,
            canManageBranches: true,
            canViewAllBranches: true,
            canAccessSettings: true,
            canAccessReports: true,
            canManagePatients: true,
            canManageAppointments: true,
            canManageDoctors: true,
            canManageRevenue: true
        },
        'admin': {
            canManageUsers: true, // Only for same branch
            canManageBranches: false,
            canViewAllBranches: false,
            canAccessSettings: false,
            canAccessReports: true,
            canManagePatients: true,
            canManageAppointments: true,
            canManageDoctors: true,
            canManageRevenue: true
        },
        'user': {
            canManageUsers: false,
            canManageBranches: false,
            canViewAllBranches: false,
            canAccessSettings: false,
            canAccessReports: false,
            canManagePatients: true,
            canManageAppointments: true,
            canManageDoctors: false,
            canManageRevenue: true
        }
    };

    return permissions[userRole] && permissions[userRole][action] === true;
}

/**
 * Filter data based on user's branch access
 */
function filterDataByBranch(data, userBranch, userRole) {
    // Super admin can see all data
    if (userRole === 'super_admin') {
        return data;
    }
    
    // Admin and User can only see data from their branch
    return data.filter(item => {
        return item.branch === userBranch || !item.branch; // Include items without branch for backward compatibility
    });
}

/**
 * Check if user can access specific branch data
 */
function canAccessBranch(userBranch, userRole, targetBranch) {
    if (userRole === 'super_admin') {
        return true; // Super admin can access all branches
    }
    
    return userBranch === targetBranch; // Others can only access their own branch
}

/**
 * Get user's accessible branches
 */
function getUserAccessibleBranches(userBranch, userRole) {
    if (userRole === 'super_admin') {
        try {
            // Get all available branches from Option List sheet
            const branchesResult = JSON.parse(getBranches());
            if (branchesResult.success) {
                return branchesResult.options.map(branch => branch.value);
            }
        } catch (error) {
            console.warn('Error getting branches from sheet, using defaults:', error);
        }
        
        // Fallback to default branches if there's an error
        return ['HEAD_OFFICE', 'BRANCH_01', 'BRANCH_02', 'BRANCH_03'];
    }
    
    return [userBranch]; // Return only user's branch
}

/**
 * Validate user permissions for specific action
 */
function validateUserAccess(currentUser, action, targetBranch = null) {
    if (!currentUser) {
        return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
    }

    // Check role permission
    if (!checkPermission(currentUser.role, action)) {
        return { success: false, message: 'คุณไม่มีสิทธิ์ในการเข้าถึงฟังก์ชันนี้' };
    }

    // Check branch access if target branch is specified
    if (targetBranch && !canAccessBranch(currentUser.branch, currentUser.role, targetBranch)) {
        return { success: false, message: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลสาขานี้' };
    }

    return { success: true, message: 'มีสิทธิ์เข้าถึง' };
}

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
            // Updated destructuring to match new column structure with First Name and Last Name
            const [id, dbUsername, dbPassword, dbUserType, firstName, lastName, email, phone, branch, role, status] = row;

            if (dbUsername === username && dbPassword == password && status === 'active') {
                return {
                    success: true,
                    message: 'เข้าสู่ระบบสำเร็จ',
                    user: {
                        id: id,
                        username: dbUsername,
                        userType: dbUserType,
                        firstName: firstName,
                        lastName: lastName,
                        fullName: firstName + ' ' + lastName, // Combine for compatibility
                        email: email,
                        phone: phone,
                        branch: branch || (dbUserType === 'super_admin' ? 'ทุกสาขา' : 'ไม่ระบุ'), // Default branch if missing
                        role: role || dbUserType // Use role if available, otherwise fall back to userType
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
            userData.firstName,
            userData.lastName,
            userData.email,
            userData.phone,
            userData.branch || 'BRANCH_01', // Default branch
            userData.role || userData.userType, // Default role to userType if not specified
            'active',
            new Date(),
            new Date(),
            'SYSTEM', // Created By User
            'SYSTEM'  // Updated By User
        ];

        usersSheet.getRange(lastRow + 1, 1, 1, newUser.length).setValues([newUser]);

        return { success: true, message: 'สร้างบัญชีผู้ใช้เรียบร้อย', userId: newId };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// OPTIMIZED DATA RETRIEVAL FUNCTIONS
// ===========================================

// Data cache for improved performance - optimized for multi-user environment
let dataCache = {
    patients: null,
    appointments: null,
    doctors: null,
    revenues: null,
    users: null,
    lastUpdated: {
        patients: 0,
        appointments: 0,
        doctors: 0,
        revenues: 0,
        users: 0
    },
    // Multi-user optimization flags
    isWarming: false,
    warmingStartTime: 0,
    lastWarmingUser: null
};

const CACHE_DURATION = 30000; // 30 seconds cache
const CACHE_WARMING_COOLDOWN = 10000; // 10 seconds cooldown between warming attempts
const CACHE_WARMING_TIMEOUT = 5000; // 5 seconds max for cache warming

/**
 * Check if cached data is still valid
 */
function isCacheValid(dataType) {
    return dataCache.lastUpdated[dataType] && 
           (Date.now() - dataCache.lastUpdated[dataType]) < CACHE_DURATION;
}

/**
 * Check if cache warming is needed and safe to perform
 */
function shouldWarmCache() {
    const now = Date.now();
    
    // Don't warm if already warming
    if (dataCache.isWarming) {
        // Check if warming has been stuck for too long
        if (now - dataCache.warmingStartTime > CACHE_WARMING_TIMEOUT) {
            console.warn('Cache warming timeout detected, resetting warming state');
            dataCache.isWarming = false;
            return true;
        }
        return false;
    }
    
    // Don't warm if recently warmed by another user
    if (dataCache.warmingStartTime && 
        (now - dataCache.warmingStartTime) < CACHE_WARMING_COOLDOWN) {
        return false;
    }
    
    // Check if any cache is invalid
    const cacheTypes = ['patients', 'appointments', 'doctors', 'revenues', 'users'];
    return cacheTypes.some(type => !isCacheValid(type));
}

/**
 * Invalidate specific cache - thread-safe
 */
function invalidateCache(dataType) {
    if (dataType) {
        dataCache[dataType] = null;
        dataCache.lastUpdated[dataType] = 0;
    } else {
        // Clear all cache
        Object.keys(dataCache.lastUpdated).forEach(key => {
            dataCache[key] = null;
            dataCache.lastUpdated[key] = 0;
        });
    }
    
    // Reset warming state when cache is invalidated
    dataCache.isWarming = false;
    dataCache.warmingStartTime = 0;
}

/**
 * Convert sheet data to objects efficiently
 */
function convertSheetDataToObjects(data, skipEmptyRows = true) {
    if (!data || data.length <= 1) {
        return [];
    }

    const headers = data[0];
    const objects = [];
    
    // Pre-process headers for performance
    const processedHeaders = headers.map(header => 
        header.toString().replace(/\s+/g, '_').toLowerCase()
    );

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Skip empty rows if requested
        if (skipEmptyRows && row.every(cell => !cell)) {
            continue;
        }

        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[processedHeaders[j]] = row[j];
        }
        objects.push(obj);
    }

    return objects;
}

// ===========================================
// USER MANAGEMENT FUNCTIONS  
// ===========================================

/**
 * Get all users with role-based filtering
 */
function getAllUsers(currentUser = null) {
    try {
        if (!currentUser) {
            return JSON.stringify({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' });
        }

        // Check permissions - only admin and super_admin can view users
        if (!checkPermission(currentUser.role, 'canManageUsers')) {
            return JSON.stringify({ success: false, message: 'คุณไม่มีสิทธิ์ในการจัดการผู้ใช้' });
        }

        const usersSheet = getSheet(SHEET_NAMES.USERS);
        const data = usersSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return JSON.stringify({ success: true, users: [] });
        }

        const headers = data[0];
        let users = data.slice(1).map(row => {
            const user = {};
            headers.forEach((header, index) => {
                const key = header.toLowerCase().replace(/\s+/g, '_');
                user[key] = row[index];
            });
            return user;
        });

        // Filter users based on role permissions
        if (currentUser.role === 'admin') {
            // Admin can only see users in their own branch and only 'user' role
            users = users.filter(user => 
                user.branch === currentUser.branch && 
                user.role === 'user'
            );
        } 

        // super_admin can see all users included other super_admins and own data

        return JSON.stringify({ success: true, users });
    } catch (error) {
        console.error('Error getting users:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new user
 */
function addUser(userData, currentUser = null) {
    try {
        if (!currentUser) {
            return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        // Check permissions
        if (!checkPermission(currentUser.role, 'canManageUsers')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มผู้ใช้' };
        }

        // Validate role permissions
        if (currentUser.role === 'admin') {
            // Admin can only create 'user' role in their branch
            if (userData.role !== 'user') {
                return { success: false, message: 'ผู้ดูแลระบบสามารถสร้างผู้ใช้ทั่วไปเท่านั้น' };
            }
            if (userData.branch !== currentUser.branch) {
                return { success: false, message: 'คุณสามารถสร้างผู้ใช้ในสาขาของคุณเท่านั้น' };
            }
        }

        const usersSheet = getSheet(SHEET_NAMES.USERS);
        
        // Check if username already exists
        const data = usersSheet.getDataRange().getValues();
        const existingUser = data.slice(1).find(row => row[1] === userData.username);
        if (existingUser) {
            return { success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' };
        }

        const lastRow = usersSheet.getLastRow();
        const newId = 'U' + String(lastRow).padStart(3, '0');

        const newUser = [
            newId,
            userData.username,
            userData.password,
            userData.role || 'user', // userType for compatibility
            userData.firstName,
            userData.lastName,
            userData.email || '',
            "'" + userData.phone || '',
            userData.branch,
            userData.role || 'user',
            userData.status || 'active',
            new Date(),
            new Date(),
            currentUser.username, // Created By User
            currentUser.username  // Updated By User
        ];

        usersSheet.getRange(lastRow + 1, 1, 1, newUser.length).setValues([newUser]);

        return { success: true, message: 'เพิ่มผู้ใช้เรียบร้อย', userId: newId };
    } catch (error) {
        console.error('Error adding user:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update user information
 */
function updateUser(username, userData, currentUser = null) {
    try {
        if (!currentUser) {
            return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        // Check permissions
        if (!checkPermission(currentUser.role, 'canManageUsers')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการแก้ไขผู้ใช้' };
        }

        const usersSheet = getSheet(SHEET_NAMES.USERS);
        const data = usersSheet.getDataRange().getValues();

        // Find user row
        let rowIndex = -1;
        let existingUser = null;
        for (let i = 1; i < data.length; i++) {
            if (data[i][1] === username) {
                rowIndex = i + 1; // Sheets are 1-indexed
                existingUser = data[i];
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' };
        }

        // Validate permissions for editing specific user
        if (currentUser.role === 'admin') {
            // Admin can only edit 'user' role in their branch
            if (existingUser[USER_COLUMNS.ROLE] !== 'user') {
                return { success: false, message: 'คุณไม่สามารถแก้ไขข้อมูลผู้ดูแลระบบได้' };
            }
            if (existingUser[USER_COLUMNS.BRANCH] !== currentUser.branch) {
                return { success: false, message: 'คุณสามารถแก้ไขผู้ใช้ในสาขาของคุณเท่านั้น' };
            }
            if (userData.role !== 'user') {
                return { success: false, message: 'คุณไม่สามารถเปลี่ยนระดับผู้ใช้ได้' };
            }
        }

        const updatedUser = [
            existingUser[USER_COLUMNS.ID], // Keep original ID
            username, // Keep original username
            userData.password || existingUser[USER_COLUMNS.PASSWORD_HASH], // Keep old password if not provided
            userData.role || existingUser[USER_COLUMNS.USER_TYPE],
            userData.firstName || existingUser[USER_COLUMNS.FIRST_NAME], // First Name
            userData.lastName || existingUser[USER_COLUMNS.LAST_NAME], // Last Name
            userData.email || existingUser[USER_COLUMNS.EMAIL],
            "'"+(userData.phone || existingUser[USER_COLUMNS.PHONE]),
            userData.branch || existingUser[USER_COLUMNS.BRANCH],
            userData.role || existingUser[USER_COLUMNS.ROLE],
            userData.status || existingUser[USER_COLUMNS.STATUS],
            existingUser[USER_COLUMNS.CREATED_AT], // Keep original created_at
            new Date(), // Update updated_at
            existingUser[USER_COLUMNS.CREATED_BY_USER] || 'UNKNOWN', // Keep original created by user
            currentUser.username // Updated By User
        ];

        usersSheet.getRange(rowIndex, 1, 1, updatedUser.length).setValues([updatedUser]);

        return { success: true, message: 'อัปเดตข้อมูलผู้ใช้เรียบร้อย' };
    } catch (error) {
        console.error('Error updating user:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Delete user
 */
function deleteUser(username, currentUser = null) {
    try {
        if (!currentUser) {
            return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' };
        }

        // Check permissions
        if (!checkPermission(currentUser.role, 'canManageUsers')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการลบผู้ใช้' };
        }

        // Prevent self-deletion
        if (username === currentUser.username) {
            return { success: false, message: 'คุณไม่สามารถลบบัญชีของตัวเองได้' };
        }

        const usersSheet = getSheet(SHEET_NAMES.USERS);
        const data = usersSheet.getDataRange().getValues();

        // Find user row
        let rowIndex = -1;
        let existingUser = null;
        for (let i = 1; i < data.length; i++) {
            if (data[i][1] === username) {
                rowIndex = i + 1; // Sheets are 1-indexed
                existingUser = data[i];
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' };
        }

        // Validate permissions for deleting specific user
        if (currentUser.role === 'admin') {
            // Admin can only delete 'user' role in their branch
            if (existingUser[8] !== 'user') {
                return { success: false, message: 'คุณไม่สามารถลบผู้ดูแลระบบได้' };
            }
            if (existingUser[7] !== currentUser.branch) {
                return { success: false, message: 'คุณสามารถลบผู้ใช้ในสาขาของคุณเท่านั้น' };
            }
        } else if (currentUser.role === 'super_admin') {
            // Super admin cannot delete other super admins
            if (existingUser[8] === 'super_admin') {
                return { success: false, message: 'ไม่สามารถลบผู้ดูแลระบบสูงสุดได้' };
            }
        }

        usersSheet.deleteRow(rowIndex);

        return { success: true, message: 'ลบผู้ใช้เรียบร้อย' };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// PATIENT MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Get all patients (optimized with caching and role-based access control)
 */
function getAllPatients(currentUser = null) {
    try {
        // Check cache first
        if (isCacheValid('patients') && dataCache.patients) {
            let patients = dataCache.patients;
            
            // Apply role-based filtering
            if (currentUser && currentUser.role !== 'super_admin') {
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
        if (currentUser && currentUser.role !== 'super_admin') {
            patients = filterDataByBranch(patients, currentUser.branch, currentUser.role);
        }
        
        // Update cache with unfiltered data for performance
        dataCache.patients = convertSheetDataToObjects(data);
        dataCache.lastUpdated.patients = Date.now();

        return JSON.stringify({ success: true, patients: patients });
    } catch (error) {
        console.error('Error getting patients:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new patient (optimized with role-based access control)
 */
function addPatient(patientData, currentUser = null) {
    try {
        // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManagePatients')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มข้อมูลคนไข้' };
        }

        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const lastRow = patientsSheet.getLastRow();
        
        // Optimized ID generation
        const getNewPatientId = () => {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = String(today.getFullYear() < 2400 ? today.getFullYear() + 543 : today.getFullYear()).slice(-2);
            
            if (lastRow === 1) {
                return 'P' + year + month + '0001';
            }

            // Get last patient ID more efficiently
            const lastId = patientsSheet.getRange(lastRow, 1).getValue();
            if (lastId && lastId.toString().startsWith('P' + year + month)) {
                const lastNumber = parseInt(lastId.toString().slice(-4));
                return 'P' + year + month + String(lastNumber + 1).padStart(4, '0');
            } else {
                return 'P' + year + month + '0001';
            }
        };

        const newId = getNewPatientId();
        const timestamp = new Date();

        const newPatient = [
            newId,
            patientData.titlePrefix || '',
            patientData.firstName,
            patientData.lastName,
            "'" + patientData.phone,
            patientData.birthDate,
            patientData.gender || '',
            patientData.address || '',
            patientData.allergies || '',
            patientData.medicalHistory || '',
            patientData.notes || '',
            patientData.branch || (currentUser ? currentUser.branch : 'BRANCH_01'), // Default to user's branch
            timestamp, // Registration Date
            timestamp, // Created At
            timestamp, // Updated At
            currentUser ? currentUser.username : 'UNKNOWN', // Created By User
            currentUser ? currentUser.username : 'UNKNOWN'  // Updated By User
        ];

        patientsSheet.getRange(lastRow + 1, 1, 1, newPatient.length).setValues([newPatient]);
        
        // Invalidate cache since data changed
        invalidateCache('patients');

        // Send notification to Google Chat
        try {
            sendFormSubmissionNotification('คนไข้', patientData, 'เพิ่ม');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

        return { success: true, message: 'เพิ่มคนไข้เรียบร้อย', patientId: newId };
    } catch (error) {
        console.error('Error adding patient:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update patient information (optimized with role-based access control)
 */
function updatePatient(patientId, patientData, currentUser = null) {
    try {
        // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManagePatients')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลคนไข้' };
        }

        const patientsSheet = getSheet(SHEET_NAMES.PATIENTS);
        const data = patientsSheet.getDataRange().getValues();

        // Find patient row more efficiently
        let rowIndex = -1;
        let existingPatient = null;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === patientId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                existingPatient = data[i];
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Check branch access - patient's branch should be in column 11 (0-indexed)
        const patientBranch = existingPatient[11];
        if (currentUser && currentUser.role !== 'super_admin' && patientBranch && patientBranch !== currentUser.branch) {
            return { success: false, message: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลคนไข้ของสาขาอื่น' };
        }

        // Prepare updated patient data
        const updatedPatient = [
            patientId,
            patientData.titlePrefix || '',
            patientData.firstName,
            patientData.lastName,
            "'" + patientData.phone,
            patientData.birthDate,
            patientData.gender || '',
            patientData.address || '',
            patientData.allergies || '',
            patientData.medicalHistory || '',
            patientData.notes || '',
            patientData.branch || (currentUser ? currentUser.branch : 'BRANCH_01'), // Keep original or update branch
            existingPatient[12], // Keep original registration date
            existingPatient[13], // Keep original created date
            new Date(), // Update modified date
            existingPatient[15] || 'UNKNOWN', // Keep original created by user
            currentUser ? currentUser.username : 'UNKNOWN'  // Update "Updated By User"
        ];

        patientsSheet.getRange(rowIndex, 1, 1, updatedPatient.length).setValues([updatedPatient]);
        
        // Invalidate cache since data changed
        invalidateCache('patients');

        // Send notification to Google Chat
        try {
            sendFormSubmissionNotification('คนไข้', patientData, 'อัปเดต');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

        return { success: true, message: 'อัปเดตข้อมูลคนไข้เรียบร้อย' };
    } catch (error) {
        console.error('Error updating patient:', error);
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
        const idColumn = patientsSheet.getRange(1, 1, patientsSheet.getLastRow(), 1).getValues().flat();
        const rowIndex = idColumn.findIndex(id => id === patientId);

        if (rowIndex === -1 || rowIndex === 0) { // 0 is header row
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Check if patient has appointments (use cache if available)
        const appointmentsResult = getAppointmentsByPatient(patientId);
        if (appointmentsResult.success && appointmentsResult.appointments.length > 0) {
            return { success: false, message: 'ไม่สามารถลบคนไข้ที่มีการนัดหมาย กรุณาลบการนัดหมายก่อน' };
        }

        patientsSheet.deleteRow(rowIndex + 1); // Convert to 1-indexed
        
        // Invalidate cache since data changed
        invalidateCache('patients');

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
 * Get all doctors (optimized with caching and role-based access control)
 */
function getAllDoctors(currentUser = null) {
    try {
        // Check cache first
        if (isCacheValid('doctors') && dataCache.doctors) {
            // Return all doctors since they are shared across branches
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
        console.error('Error getting doctors:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new doctor (optimized with role-based access control)
 */
function addDoctor(doctorData, currentUser = null) {
    try {
        // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManageDoctors')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มข้อมูลหมอ' };
        }

        const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
        const lastRow = doctorsSheet.getLastRow();
        
        // Optimized ID generation
        const getNewDoctorId = () => {
            if (lastRow === 1) {
                return 'DR001';
            }
            const lastId = doctorsSheet.getRange(lastRow, 1).getValue();
            const lastIdNum = parseInt(lastId.toString().slice(2));
            const newIdNum = String(lastIdNum + 1).padStart(3, '0');
            return 'DR' + newIdNum;
        };
        
        const newId = getNewDoctorId();
        const timestamp = new Date();

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
            timestamp, // Created At
            timestamp, // Updated At
            currentUser ? currentUser.username : 'UNKNOWN', // Created By User
            currentUser ? currentUser.username : 'UNKNOWN'  // Updated By User
        ];

        doctorsSheet.getRange(lastRow + 1, 1, 1, newDoctor.length).setValues([newDoctor]);
        
        // Invalidate cache since data changed
        invalidateCache('doctors');

        // Send notification to Google Chat
        try {
            sendFormSubmissionNotification('หมอ', doctorData, 'เพิ่ม');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

        return { success: true, message: 'เพิ่มข้อมูลหมอเรียบร้อย', doctorId: newId };
    } catch (error) {
        console.error('Error adding doctor:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update doctor information
 */
function updateDoctor(doctorId, doctorData, currentUser = null) {
    try {

         // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManageDoctors')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มข้อมูลหมอ' };
        }
        const doctorsSheet = getSheet(SHEET_NAMES.DOCTORS);
        const data = doctorsSheet.getDataRange().getValues();

        // Find doctor row
        let rowIndex = -1;
        let existingDoctor = null;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === doctorId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                existingDoctor = data[i];
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
            existingDoctor[9], // Keep original created_at
            new Date(), // Update updated_at
            existingDoctor[11] || 'UNKNOWN', // Keep original created by user
            currentUser ? currentUser.username : 'UNKNOWN'  // Update "Updated By User"
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
 * Get all appointments (optimized with caching and role-based access control)
 */
function getAllAppointments(currentUser = null) {
    try {
        // Check cache first
        if (isCacheValid('appointments') && dataCache.appointments) {
            let appointments = dataCache.appointments;
            
            // Apply role-based filtering
            if (currentUser && currentUser.role !== 'super_admin') {
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
        if (currentUser && currentUser.role !== 'super_admin') {
            appointments = filterDataByBranch(appointments, currentUser.branch, currentUser.role);
        }
        
        // Update cache with unfiltered data for performance
        dataCache.appointments = convertSheetDataToObjects(data);
        dataCache.lastUpdated.appointments = Date.now();

        return JSON.stringify({ success: true, appointments: appointments });
    } catch (error) {
        console.error('Error getting appointments:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new appointment (optimized with role-based access control)
 */
function addAppointment(appointmentData, currentUser = null) {
    try {
        // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManageAppointments')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มการนัดหมาย' };
        }

        const appointmentsSheet = getSheet(SHEET_NAMES.APPOINTMENTS);
        const lastRow = appointmentsSheet.getLastRow();
        
        // Optimized ID generation
        const getNewAppointmentId = () => {
            const today = new Date();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const year = String(today.getFullYear() < 2400 ? today.getFullYear() + 543 : today.getFullYear()).slice(-2);
            
            if (lastRow === 1) {
                return 'A' + year + month + '0001';
            }

            const lastId = appointmentsSheet.getRange(lastRow, 1).getValue();
            if (lastId && lastId.toString().startsWith('A' + year + month)) {
                const lastNumber = parseInt(lastId.toString().slice(-4));
                return 'A' + year + month + String(lastNumber + 1).padStart(4, '0');
            } else {
                return 'A' + year + month + '0001';
            }
        };

        // Validate patient exists and check branch access
        const patientResult = getPatientById(appointmentData.patientId);
        if (!patientResult.success) {
            return { success: false, message: 'ไม่พบข้อมูลคนไข้' };
        }

        // Check if user has access to patient's branch
        if (currentUser && currentUser.role !== 'super_admin') {
            const patientBranch = patientResult.patient.branch;
            if (patientBranch && patientBranch !== currentUser.branch) {
                return { success: false, message: 'คุณไม่สามารถนัดหมายให้คนไข้ของสาขาอื่นได้' };
            }
        }

        // Validate doctor exists if provided
        if (appointmentData.doctorId) {
            const doctorResult = getDoctorById(appointmentData.doctorId);
            if (!doctorResult.success) {
                return { success: false, message: 'ไม่พบข้อมูลหมอ' };
            }
            // Doctors are shared across branches, no branch access check needed
        }

        const newId = getNewAppointmentId();
        const timestamp = new Date();

        const newAppointment = [
            newId,
            appointmentData.patientId,
            appointmentData.doctorId || '',
            appointmentData.appointmentDate,
            appointmentData.appointmentTime,
            appointmentData.caseType || '',
            appointmentData.caseDetails || '',
            appointmentData.contactChannel || '',
            appointmentData.cost || 0,
            appointmentData.status || 'scheduled',
            appointmentData.notes || '',
            appointmentData.branch || (currentUser ? currentUser.branch : 'BRANCH_01'), // Default to user's branch
            timestamp, // Created At
            timestamp, // Updated At
            currentUser ? currentUser.username : 'UNKNOWN',  // Created By User
            currentUser ? currentUser.username : 'UNKNOWN'   // Updated By User
        ];

        appointmentsSheet.getRange(lastRow + 1, 1, 1, newAppointment.length).setValues([newAppointment]);
        
        // Invalidate cache since data changed
        invalidateCache('appointments');

        // Send notification to Google Chat
        try {
            sendFormSubmissionNotification('การนัดหมาย', appointmentData, 'เพิ่ม');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

        return { success: true, message: 'เพิ่มการนัดหมายเรียบร้อย', appointmentId: newId };
    } catch (error) {
        console.error('Error adding appointment:', error);
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
                rowIndex = i + 1; // Sheets are 1-indexed
                existingAppointment = data[i];
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
            appointmentData.contactChannel || '',
            appointmentData.cost || 0,
            appointmentData.status || 'scheduled',
            appointmentData.notes || '',
            appointmentData.branch || existingAppointment[11], // Keep original or update branch
            existingAppointment[12], // Keep original created date
            new Date(), // Update modified date
            existingAppointment[14] || 'UNKNOWN', // Keep original created by user
            currentUser ? currentUser.username : 'UNKNOWN'   // Updated By User
        ];

        appointmentsSheet.getRange(rowIndex, 1, 1, updatedAppointment.length).setValues([updatedAppointment]);

        // Send notification to Google Chat
        try {
            sendFormSubmissionNotification('การนัดหมาย', appointmentData, 'อัปเดต');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

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
            return JSON.stringify({ success: true, revenues: [] });
        }

        const revenues = [];
        const headers = data[0];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const revenue = {};

            headers.forEach((header, index) => {
                const key = header.replace(/\s+/g, '_').toLowerCase();
                revenue[key] = row[index];
            });

            // Parse JSON fields (for backward compatibility with old data)
            if (revenue.payment_amounts && typeof revenue.payment_amounts === 'string') {
                try {
                    revenue.paymentAmounts = JSON.parse(revenue.payment_amounts);
                } catch (e) {
                    revenue.paymentAmounts = {};
                }
            }

            // Convert field names to match frontend expectations
            revenue.patientId = revenue.patient_id || '';
            revenue.doctorId = revenue.doctor_id || '';
            revenue.caseType = revenue.case_type || '';
            revenue.caseDetails = revenue.case_details || '';
            revenue.paymentType = revenue.payment_type || '';
            
            // Handle individual payment amounts (new format)
            revenue.cashAmount = parseFloat(revenue.cash_amount) || 0;
            revenue.transferAmount = parseFloat(revenue.transfer_amount) || 0;
            revenue.socialSecurityAmount = parseFloat(revenue.social_security_amount) || 0;
            revenue.visaAmount = parseFloat(revenue.visa_amount) || 0;
            
            revenue.xrayFee = parseFloat(revenue.x_ray_fee) || 0;
            revenue.medicineFee = parseFloat(revenue.medicine_fee) || 0;
            revenue.otherProductFee = parseFloat(revenue.other_product_fee) || 0;
            revenue.discount = parseFloat(revenue.discount) || 0;

            // Calculate total amount using individual payment columns
            let totalAmount = revenue.cashAmount + revenue.transferAmount + revenue.socialSecurityAmount + 
                            revenue.visaAmount;
            
            // For backward compatibility, if individual amounts are all 0, try to use old format
            if (totalAmount === 0 && revenue.paymentAmounts && typeof revenue.paymentAmounts === 'object') {
                totalAmount = Object.values(revenue.paymentAmounts).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
            }
            
            totalAmount += revenue.xrayFee + revenue.medicineFee + revenue.otherProductFee - revenue.discount;
            
            // Store calculated amount for backward compatibility
            revenue.amount = totalAmount;

            revenues.push(revenue);
        }

        return JSON.stringify({ success: true, revenues: revenues });
    } catch (error) {
        console.error('Error getting revenues:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Add new revenue record (with role-based access control)
 */
function addRevenue(revenueData, currentUser = null) {
    try {
        // Check permissions
        if (currentUser && !checkPermission(currentUser.role, 'canManageRevenue')) {
            return { success: false, message: 'คุณไม่มีสิทธิ์ในการเพิ่มรายได้' };
        }

        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const lastRow = revenueSheet.getLastRow();
        const newId = 'R' + String(lastRow).padStart(3, '0');

        // Handle the new detailed revenue structure with individual payment columns
        const newRevenue = [
            newId,
            revenueData.date,
            revenueData.patientId || '',
            revenueData.doctorId || '',
            revenueData.caseType || '',
            revenueData.caseDetails || '',
            revenueData.paymentType || '',
            revenueData.cashAmount || 0,
            revenueData.transferAmount || 0,
            revenueData.socialSecurityAmount || 0,
            revenueData.visaAmount || 0,
            revenueData.xrayFee || 0,
            revenueData.medicineFee || 0,
            revenueData.otherProductFee || 0,
            revenueData.discount || 0,
            revenueData.notes || '',
            revenueData.branch || (currentUser ? currentUser.branch : 'BRANCH_01'), // Default to user's branch
            new Date(), // Created At
            new Date(), // Updated At
            currentUser ? currentUser.username : 'UNKNOWN',  // Created By User
            currentUser ? currentUser.username : 'UNKNOWN'   // Updated By User
        ];

        revenueSheet.getRange(lastRow + 1, 1, 1, newRevenue.length).setValues([newRevenue]);

        // Send notification to Google Chat with more detailed information
        try {
            const notificationData = {
                ...revenueData,
                // Calculate total amount for notification using individual payment columns
                totalAmount: ((parseFloat(revenueData.cashAmount) || 0) +
                            (parseFloat(revenueData.transferAmount) || 0) +
                            (parseFloat(revenueData.socialSecurityAmount) || 0) +
                            (parseFloat(revenueData.visaAmount) || 0) +
                            (parseFloat(revenueData.xrayFee) || 0) +
                            (parseFloat(revenueData.medicineFee) || 0) +
                            (parseFloat(revenueData.otherProductFee) || 0) -
                            (parseFloat(revenueData.discount) || 0))
            };
            sendFormSubmissionNotification('รายได้', notificationData, 'เพิ่ม');
        } catch (notificationError) {
            console.warn('Failed to send notification:', notificationError);
        }

        return { success: true, message: 'เพิ่มรายได้เรียบร้อย', revenueId: newId };
    } catch (error) {
        console.error('Error adding revenue:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update revenue record
 */
function updateRevenue(revenueId, revenueData, currentUser = null) {
    try {
        const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
        const data = revenueSheet.getDataRange().getValues();

        // Find revenue row
        let rowIndex = -1;
        let existingRevenue = null;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === revenueId) {
                rowIndex = i + 1; // Sheets are 1-indexed
                existingRevenue = data[i];
                break;
            }
        }

        if (rowIndex === -1) {
            return { success: false, message: 'ไม่พบข้อมูลรายได้' };
        }

        // Handle the new detailed revenue structure with individual payment columns
        const updatedRevenue = [
            revenueId,
            revenueData.date,
            revenueData.patientId || '',
            revenueData.doctorId || '',
            revenueData.caseType || '',
            revenueData.caseDetails || '',
            revenueData.paymentType || '',
            revenueData.cashAmount || 0,
            revenueData.transferAmount || 0,
            revenueData.socialSecurityAmount || 0,
            revenueData.visaAmount || 0,
            revenueData.xrayFee || 0,
            revenueData.medicineFee || 0,
            revenueData.otherProductFee || 0,
            revenueData.discount || 0,
            revenueData.notes || '',
            revenueData.branch || existingRevenue[16], // Keep original or update branch
            existingRevenue[17], // Keep original created date
            new Date(), // Update modified date
            existingRevenue[19] || 'UNKNOWN', // Keep original created by user
            currentUser ? currentUser.username : 'UNKNOWN'   // Updated By User
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
// OPTIMIZED BATCH DATA OPERATIONS
// ===========================================

/**
 * Load all data in batch for better performance - multi-user optimized
 */
function loadAllDataBatch() {
    try {
        const startTime = Date.now();
        
        // Check if another process is already loading
        if (dataCache.isWarming) {
            console.log('Cache warming already in progress, skipping...');
            return {
                success: true,
                message: 'Cache warming already in progress',
                loadTime: 0,
                fromCache: true
            };
        }
        
        // Set warming state
        dataCache.isWarming = true;
        dataCache.warmingStartTime = startTime;
        
        try {
            // Load all sheets data in parallel using batch operations
            const spreadsheet = getCachedSpreadsheet();
            const sheets = {
                patients: spreadsheet.getSheetByName(SHEET_NAMES.PATIENTS),
                appointments: spreadsheet.getSheetByName(SHEET_NAMES.APPOINTMENTS),
                doctors: spreadsheet.getSheetByName(SHEET_NAMES.DOCTORS),
                revenues: spreadsheet.getSheetByName(SHEET_NAMES.REVENUE),
                users: spreadsheet.getSheetByName(SHEET_NAMES.USERS)
            };

            // Get all data ranges at once
            const batchData = {};
            Object.keys(sheets).forEach(key => {
                if (sheets[key] && sheets[key].getLastRow() > 1) {
                    batchData[key] = sheets[key].getDataRange().getValues();
                } else {
                    batchData[key] = [];
                }
            });

            // Convert to objects and cache
            const timestamp = Date.now();
            Object.keys(batchData).forEach(key => {
                if (batchData[key].length > 0) {
                    dataCache[key] = convertSheetDataToObjects(batchData[key]);
                } else {
                    dataCache[key] = [];
                }
                dataCache.lastUpdated[key] = timestamp;
            });

            const endTime = Date.now();
            console.log(`Batch data load completed in ${endTime - startTime}ms`);

            return {
                success: true,
                message: 'All data loaded successfully',
                loadTime: endTime - startTime,
                cachedData: {
                    patients: dataCache.patients.length,
                    appointments: dataCache.appointments.length,
                    doctors: dataCache.doctors.length,
                    revenues: dataCache.revenues.length,
                    users: dataCache.users.length
                }
            };
        } finally {
            // Always reset warming state
            dataCache.isWarming = false;
        }
    } catch (error) {
        // Reset warming state on error
        dataCache.isWarming = false;
        console.error('Error in batch data load:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Optimized search functions using cached data
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
        return dataCache.appointments.filter(apt => apt.patient_id === patientId);
    }
    
    // Fallback to existing function
    return getAppointmentsByPatient(patientId);
}

function findAppointmentsByDate(date) {
    // Use cached data if available
    if (dataCache.appointments) {
        return dataCache.appointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date);
            const searchDate = new Date(date);
            return aptDate.toDateString() === searchDate.toDateString();
        });
    }
    
    // Fallback to existing function
    return getAppointmentsByDateRange(date, date);
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
 * Send notification to Google Chat
 * Requires Google Chat webhook URL to be set
 */
function sendGoogleChatNotification(message, title = 'ระบบจัดการคลินิคทันตกรรม') {
    try {
        // Get webhook URL from script properties
        let WEBHOOK_URL = getGoogleChatWebhook();
        
        if (!WEBHOOK_URL) {
            console.warn('Google Chat webhook URL not configured. Call setGoogleChatWebhook() first.');
            return { success: false, message: 'Google Chat webhook URL ยังไม่ได้ตั้งค่า กรุณาเรียก setGoogleChatWebhook() ก่อน' };
        }
        
        const timestamp = new Date().toLocaleString('th-TH', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        // For testing, log the message and return success
        Logger.log(`🏥 *${title}*\n\n${message}\n\n⏰ เวลา: ${timestamp}`);
        
        // For testing purposes, return success without actually sending
        // Uncomment the code below when ready to send real notifications
        /*
        const payload = {
            text: `🏥 *${title}*\n\n${message}\n\n⏰ เวลา: ${timestamp}`
        };
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify(payload)
        };
        
        const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
        
        if (response.getResponseCode() === 200) {
            return { success: true, message: 'ส่งการแจ้งเตือนไปยัง Google Chat เรียบร้อย' };
        } else {
            console.error('Google Chat notification failed:', response.getContentText());
            return { success: false, message: 'ไม่สามารถส่งการแจ้งเตือนไปยัง Google Chat ได้' };
        }
        */
        
        return { success: true, message: 'ส่งการแจ้งเตือนสำเร็จ (โหมดทดสอบ)' };
        
    } catch (error) {
        console.error('Error sending Google Chat notification:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Send form submission notification to Google Chat
 */
function sendFormSubmissionNotification(formType, data, action = 'เพิ่ม') {
    try {
        // Check if notifications are enabled
        if (!areNotificationsEnabled()) {
            return { success: false, message: 'การแจ้งเตือนถูกปิดใช้งาน' };
        }
        
        let message = '';
        let title = `📋 ${action}${formType}ใหม่`;
        
        switch (formType) {
            case 'คนไข้':
                message = `👤 ชื่อ: ${data.titlePrefix || ''} ${data.firstName} ${data.lastName}\n` +
                         `📞 เบอร์โทร: ${data.phone}\n` +
                         `🎂 วันเกิด: ${data.birthDate}\n` +
                         `👥 เพศ: ${data.gender || 'ไม่ระบุ'}`;
                if (data.address) message += `\n🏠 ที่อยู่: ${data.address}`;
                break;
                
            case 'การนัดหมาย':
                // Get patient and doctor names
                const patient = findPatientById(data.patientId);
                const doctor = findDoctorById(data.doctorId);
                const patientName = patient ? `${patient.title_prefix || ''} ${patient.first_name} ${patient.last_name}`.trim() : 'ไม่ระบุ';
                const doctorName = doctor ? `${doctor.first_name} ${doctor.last_name}` : 'ไม่ระบุ';

                message = `👤 คนไข้: ${patientName}\n` +
                         `👨‍⚕️ หมอ: ${doctorName}\n` +
                         `📅 วันนัด: ${data.appointmentDate}\n` +
                         `⏰ เวลา: ${data.appointmentTime}`;
                if (data.caseType) message += `\n🏥 ประเภทเคส: ${data.caseType}`;
                if (data.contactChannel) message += `\n📞 ช่องทางติดต่อ: ${data.contactChannel}`;
                if (data.cost) message += `\n💰 ค่าใช้จ่าย: ${parseFloat(data.cost).toLocaleString()} บาท`;
                if (data.status) message += `\n📋 สถานะ: ${getStatusTextThai(data.status)}`;
                break;
                
            case 'หมอ':
                message = `👨‍⚕️ ชื่อ: ${data.firstName} ${data.lastName}\n` +
                         `🏥 ความเชี่ยวชาญ: ${data.specialty}\n` +
                         `📞 เบอร์โทร: ${data.phone}`;
                if (data.email) message += `\n✉️ อีเมล: ${data.email}`;
                if (data.licenseNumber) message += `\n📄 เลขใบอนุญาต: ${data.licenseNumber}`;
                break;
                
            case 'รายได้':
                // Get patient and doctor names for revenue notification
                const revenuePatient = findPatientById(data.patientId);
                const revenueDoctor = findDoctorById(data.doctorId);
                const revenuePatientName = revenuePatient ? `${revenuePatient.title_prefix || ''} ${revenuePatient.first_name} ${revenuePatient.last_name}`.trim() : 'ไม่ระบุ';
                const revenueDoctorName = revenueDoctor ? `${revenueDoctor.first_name} ${revenueDoctor.last_name}` : 'ไม่ระบุ';

                message = `💰 ยอดรวม: ${parseFloat(data.totalAmount || 0).toLocaleString()} บาท\n` +
                         `� คนไข้: ${revenuePatientName}\n` +
                         `👨‍⚕️ หมอ: ${revenueDoctorName}\n` +
                         `📅 วันที่: ${data.date}`;
                if (data.caseType) message += `\n🏥 ประเภทเคส: ${data.caseType}`;
                if (data.paymentType) message += `\n� ประเภทการชำระ: ${data.paymentType}`;
                if (data.xrayFee > 0) message += `\n📸 ค่าเอ็กซเรย์: ${parseFloat(data.xrayFee).toLocaleString()} บาท`;
                if (data.medicineFee > 0) message += `\n💊 ค่ายา: ${parseFloat(data.medicineFee).toLocaleString()} บาท`;
                if (data.otherProductFee > 0) message += `\n🛒 ค่าผลิตภัณฑ์อื่น: ${parseFloat(data.otherProductFee).toLocaleString()} บาท`;
                if (data.discount > 0) message += `\n🏷️ ส่วนลด: ${parseFloat(data.discount).toLocaleString()} บาท`;
                break;
                
            default:
                message = `ข้อมูลใหม่ถูก${action}เรียบร้อย`;
        }
        
        return sendGoogleChatNotification(message, title);
        
    } catch (error) {
        console.error('Error sending form submission notification:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Helper function to get Thai status text
 */
function getStatusTextThai(status) {
    const statusMap = {
        'scheduled': 'นัดหมาย',
        'completed': 'เสร็จสิ้น',
        'cancelled': 'ยกเลิก'
    };
    return statusMap[status] || status;
}

/**
 * Send daily patient brief to Google Chat
 * This function sends a summary of today's appointments grouped by branch
 */
function sendDailyPatientBrief() {
    try {
        // Check if notifications are enabled
        if (!areNotificationsEnabled()) {
            Logger.log('Notifications are disabled. Skipping daily patient brief.');
            return { success: false, message: 'การแจ้งเตือนถูกปิดใช้งาน' };
        }

        // Get today's date in Thailand timezone
        const today = new Date();
        const todayString = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyy-MM-dd');
        const todayFormatted = Utilities.formatDate(today, 'Asia/Bangkok', 'dd/MM/yyyy');
        const dayOfWeek = Utilities.formatDate(today, 'Asia/Bangkok', 'EEEE', 'th');

        Logger.log(`Generating daily patient brief for ${todayString}`);

        // Get today's appointments
        const appointmentsResult = getAppointmentsByDateRange(todayString, todayString);
        if (!appointmentsResult.success) {
            Logger.error('Failed to get appointments:', appointmentsResult.message);
            return { success: false, message: 'ไม่สามารถโหลดข้อมูลการนัดหมายได้' };
        }

        const todayAppointments = appointmentsResult.appointments || [];
        Logger.log(`Found ${todayAppointments.length} appointments for today`);

        // Get all branches
        const branches = getBranchList();
        
        // Group appointments by branch
        const appointmentsByBranch = {};
        branches.forEach(branch => {
            appointmentsByBranch[branch] = todayAppointments.filter(apt => apt.branch === branch);
        });

        // Send message for each branch that has appointments
        let messagesSent = 0;
        const results = [];

        for (const branch of branches) {
            const branchAppointments = appointmentsByBranch[branch];
            
            if (branchAppointments.length > 0) {
                const message = generateDailyBriefMessage(branch, branchAppointments, todayFormatted, dayOfWeek);
                const result = sendGoogleChatNotification(
                    message, 
                    `📅 สรุปการนัดหมายวันนี้ - สาขา${branch}`
                );
                
                results.push({ branch, success: result.success, message: result.message });
                
                if (result.success) {
                    messagesSent++;
                }
                
                // Add delay between messages to avoid rate limiting
                Utilities.sleep(2000); // 2 seconds delay
            } else {
                // Send "no appointments" message for branches with no appointments
                const noAppointmentMessage = generateNoAppointmentMessage(branch, todayFormatted, dayOfWeek);
                const result = sendGoogleChatNotification(
                    noAppointmentMessage, 
                    `📅 สรุปการนัดหมายวันนี้ - สาขา${branch}`
                );
                
                results.push({ branch, success: result.success, message: result.message });
                
                if (result.success) {
                    messagesSent++;
                }
                
                // Add delay between messages
                Utilities.sleep(2000);
            }
        }

        Logger.log(`Daily patient brief completed. Messages sent: ${messagesSent}/${branches.length}`);
        
        return { 
            success: true, 
            message: `ส่งรายงานรายวันสำเร็จ ${messagesSent}/${branches.length} สาขา`,
            details: results
        };
        
    } catch (error) {
        Logger.error('Error in sendDailyPatientBrief:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Generate daily brief message for a specific branch
 */
function generateDailyBriefMessage(branch, appointments, dateFormatted, dayOfWeek) {
    let message = `🏥 **สาขา${branch}**\n`;
    message += `📅 **${dayOfWeek}ที่ ${dateFormatted}**\n\n`;
    
    if (appointments.length === 0) {
        message += `✨ **ไม่มีการนัดหมายในวันนี้**\n`;
        message += `พนักงานสามารถใช้เวลาจัดระเบียบและเตรียมความพร้อมได้`;
        return message;
    }

    // Group by status
    const appointmentsByStatus = {
        'scheduled': appointments.filter(apt => apt.status === 'scheduled'),
        'completed': appointments.filter(apt => apt.status === 'completed'),
        'cancelled': appointments.filter(apt => apt.status === 'cancelled')
    };

    // Summary statistics
    message += `📊 **สรุปภาพรวม:**\n`;
    message += `• รวมทั้งหมด: **${appointments.length}** นัด\n`;
    message += `• นัดหมาย: **${appointmentsByStatus.scheduled.length}** นัด\n`;
    message += `• เสร็จสิ้น: **${appointmentsByStatus.completed.length}** นัด\n`;
    message += `• ยกเลิก: **${appointmentsByStatus.cancelled.length}** นัด\n\n`;

    // Show scheduled appointments details
    if (appointmentsByStatus.scheduled.length > 0) {
        message += `⏰ **การนัดหมายที่รอดำเนินการ (${appointmentsByStatus.scheduled.length} นัด):**\n`;
        
        // Sort by time
        const sortedScheduled = appointmentsByStatus.scheduled.sort((a, b) => {
            return a.appointmentTime.localeCompare(b.appointmentTime);
        });

        sortedScheduled.forEach((apt, index) => {
            message += `${index + 1}. **${apt.appointmentTime}** - ${apt.patientName}\n`;
            message += `   📱 ${apt.patientPhone || 'ไม่มีเบอร์โทร'}\n`;
            message += `   🏥 หมอ: ${apt.doctorName || 'ไม่ระบุ'}\n`;
            if (apt.caseType && apt.caseType.length > 0) {
                message += `   🔍 ประเภท: ${apt.caseType.join(', ')}\n`;
            }
            message += `\n`;
        });
    }

    // Show completed appointments summary
    if (appointmentsByStatus.completed.length > 0) {
        message += `✅ **การนัดหมายที่เสร็จสิ้น (${appointmentsByStatus.completed.length} นัด):**\n`;
        const completedSummary = appointmentsByStatus.completed
            .map(apt => `• ${apt.appointmentTime} - ${apt.patientName}`)
            .join('\n');
        message += completedSummary + '\n\n';
    }

    // Show cancelled appointments summary
    if (appointmentsByStatus.cancelled.length > 0) {
        message += `❌ **การนัดหมายที่ยกเลิก (${appointmentsByStatus.cancelled.length} นัด):**\n`;
        const cancelledSummary = appointmentsByStatus.cancelled
            .map(apt => `• ${apt.appointmentTime} - ${apt.patientName}`)
            .join('\n');
        message += cancelledSummary + '\n\n';
    }

    // Add encouragement message based on workload
    if (appointmentsByStatus.scheduled.length > 10) {
        message += `💪 **วันนี้มีงานเยอะ ทีมงานสู้ๆ นะครับ!**`;
    } else if (appointmentsByStatus.scheduled.length > 5) {
        message += `😊 **วันนี้มีงานพอดี ขอให้ทำงานเก่งๆ นะครับ!**`;
    } else if (appointmentsByStatus.scheduled.length > 0) {
        message += `🌟 **วันนี้งานน้อย มีเวลาดูแลคนไข้อย่างดีได้เลยครับ!**`;
    } else {
        message += `🎯 **วันนี้เป็นวันพักผ่อน มีเวลาเตรียมตัวสำหรับวันถัดไป!**`;
    }

    return message;
}

/**
 * Generate no appointment message for a specific branch
 */
function generateNoAppointmentMessage(branch, dateFormatted, dayOfWeek) {
    let message = `🏥 **สาขา${branch}**\n`;
    message += `📅 **${dayOfWeek}ที่ ${dateFormatted}**\n\n`;
    message += `✨ **ไม่มีการนัดหมายในวันนี้**\n\n`;
    message += `🎯 **แนะนำกิจกรรมสำหรับวันนี้:**\n`;
    message += `• 🧹 จัดระเบียบเครื่องมือและอุปกรณ์\n`;
    message += `• 📚 ทบทวนความรู้และเทคนิคใหม่ๆ\n`;
    message += `• 📞 ติดตามลูกค้าเก่าและทำการตลาด\n`;
    message += `• 🏥 เตรียมความพร้อมสำหรับวันถัดไป\n\n`;
    message += `😊 **ขอให้มีวันที่ดีและผ่อนคลายครับ!**`;

    return message;
}

/**
 * Get list of all branches
 */
function getBranchList() {
    try {
        const branchesData = getBranches();
        const branchesResult = JSON.parse(branchesData);
        
        if (branchesResult.success && branchesResult.options) {
            return branchesResult.options.filter(branch => branch && branch.trim() !== '');
        }
        
        // Fallback to default branches
        return ['หลัก', 'สาขา 2', 'สาขา 3'];
        
    } catch (error) {
        Logger.error('Error getting branch list:', error);
        // Return default branches as fallback
        return ['หลัก', 'สาขา 2', 'สาขา 3'];
    }
}

/**
 * Test function for daily patient brief
 */
function testDailyPatientBrief() {
    Logger.log('Testing daily patient brief...');
    return sendDailyPatientBrief();
}

/**
 * Manual trigger function for daily patient brief
 * Can be called manually or scheduled
 */
function triggerDailyPatientBrief() {
    const result = sendDailyPatientBrief();
    Logger.log('Daily patient brief result:', result);
    return result;
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
// CONFIGURATION FUNCTIONS
// ===========================================

/**
 * Set Google Chat webhook URL configuration
 * Call this function once to configure your Google Chat integration
 */
function setGoogleChatWebhook(webhookUrl) {
    try {
        // Store webhook URL in script properties for security
        PropertiesService.getScriptProperties().setProperty('GOOGLE_CHAT_WEBHOOK_URL', webhookUrl);
        
        // Test the webhook
        const testResult = sendGoogleChatNotification(
            '🎉 การตั้งค่า Google Chat สำเร็จ!\nระบบพร้อมส่งการแจ้งเตือนแล้ว',
            '✅ การทดสอบระบบการแจ้งเตือน'
        );
        
        if (testResult.success) {
            return { success: true, message: 'ตั้งค่า Google Chat webhook เรียบร้อย และทดสอบการส่งข้อความสำเร็จ' };
        } else {
            return { success: false, message: `ตั้งค่า webhook เรียบร้อย แต่ทดสอบการส่งไม่สำเร็จ: ${testResult.message}` };
        }
    } catch (error) {
        console.error('Error setting Google Chat webhook:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Get stored Google Chat webhook URL
 */
function getGoogleChatWebhook() {
    try {
        const webhookUrl = PropertiesService.getScriptProperties().getProperty('GOOGLE_CHAT_WEBHOOK_URL');
        return webhookUrl || null;
    } catch (error) {
        console.error('Error getting Google Chat webhook:', error);
        return null;
    }
}

/**
 * Test Google Chat notification
 */
function testGoogleChatNotification() {
    return sendGoogleChatNotification(
        '🔧 นี่คือข้อความทดสอบจากระบบจัดการคลินิคทันตกรรม\n✨ ระบบการแจ้งเตือนทำงานได้ปกติ',
        '🧪 การทดสอบระบบการแจ้งเตือน'
    );
}

// ===========================================
// TRIGGER MANAGEMENT FUNCTIONS
// ===========================================

/**
 * Create daily patient brief trigger
 * This will send patient brief every morning at specified time
 */
function createDailyPatientBriefTrigger(hour = 8, minute = 0) {
    try {
        // Delete existing daily brief triggers first
        deleteDailyPatientBriefTriggers();
        
        // Create new trigger
        const trigger = ScriptApp.newTrigger('triggerDailyPatientBrief')
            .timeBased()
            .everyDays(1)
            .atHour(hour)
            .atMinute(minute)
            .inTimezone('Asia/Bangkok')
            .create();

        // Store trigger info
        PropertiesService.getScriptProperties().setProperties({
            'DAILY_BRIEF_TRIGGER_ID': trigger.getUniqueId(),
            'DAILY_BRIEF_HOUR': hour.toString(),
            'DAILY_BRIEF_MINUTE': minute.toString(),
            'DAILY_BRIEF_CREATED': new Date().toISOString()
        });

        Logger.log(`Daily patient brief trigger created: ${hour}:${minute.toString().padStart(2, '0')} (Thailand time)`);
        
        return { 
            success: true, 
            message: `ตั้งค่าการส่งรายงานรายวันเวลา ${hour}:${minute.toString().padStart(2, '0')} น. เรียบร้อย`,
            triggerId: trigger.getUniqueId()
        };
        
    } catch (error) {
        Logger.error('Error creating daily patient brief trigger:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Delete all daily patient brief triggers
 */
function deleteDailyPatientBriefTriggers() {
    try {
        const triggers = ScriptApp.getProjectTriggers();
        let deletedCount = 0;
        
        triggers.forEach(trigger => {
            if (trigger.getHandlerFunction() === 'triggerDailyPatientBrief') {
                ScriptApp.deleteTrigger(trigger);
                deletedCount++;
            }
        });

        // Clear stored trigger info
        PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_TRIGGER_ID');
        PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_HOUR');
        PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_MINUTE');
        PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_CREATED');

        Logger.log(`Deleted ${deletedCount} daily patient brief triggers`);
        
        return { 
            success: true, 
            message: `ลบ trigger การส่งรายงานรายวัน ${deletedCount} ตัวเรียบร้อย`,
            deletedCount: deletedCount
        };
        
    } catch (error) {
        Logger.error('Error deleting daily patient brief triggers:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Get daily patient brief trigger status
 */
function getDailyPatientBriefTriggerStatus() {
    try {
        const properties = PropertiesService.getScriptProperties();
        const triggerId = properties.getProperty('DAILY_BRIEF_TRIGGER_ID');
        const hour = properties.getProperty('DAILY_BRIEF_HOUR');
        const minute = properties.getProperty('DAILY_BRIEF_MINUTE');
        const created = properties.getProperty('DAILY_BRIEF_CREATED');

        if (!triggerId) {
            return {
                success: true,
                isActive: false,
                message: 'ยังไม่มี trigger การส่งรายงานรายวัน'
            };
        }

        // Check if trigger still exists
        const triggers = ScriptApp.getProjectTriggers();
        const existingTrigger = triggers.find(t => t.getUniqueId() === triggerId);

        if (!existingTrigger) {
            // Trigger was deleted externally, clean up properties
            PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_TRIGGER_ID');
            PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_HOUR');
            PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_MINUTE');
            PropertiesService.getScriptProperties().deleteProperty('DAILY_BRIEF_CREATED');
            
            return {
                success: true,
                isActive: false,
                message: 'Trigger ถูกลบไปแล้ว'
            };
        }

        return {
            success: true,
            isActive: true,
            triggerId: triggerId,
            schedule: `${hour}:${minute.toString().padStart(2, '0')} น. ทุกวัน`,
            hour: parseInt(hour),
            minute: parseInt(minute),
            created: created,
            message: `ส่งรายงานรายวันเวลา ${hour}:${minute.toString().padStart(2, '0')} น. ทุกวัน`
        };
        
    } catch (error) {
        Logger.error('Error getting daily patient brief trigger status:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Update daily patient brief trigger time
 */
function updateDailyPatientBriefTrigger(hour = 8, minute = 0) {
    try {
        // Delete existing trigger and create new one
        return createDailyPatientBriefTrigger(hour, minute);
    } catch (error) {
        Logger.error('Error updating daily patient brief trigger:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Configure Google Chat webhook from web interface
 */
function configureGoogleChatWebhook(webhookUrl) {
    return setGoogleChatWebhook(webhookUrl);
}

/**
 * Get notification configuration status
 */
function getNotificationStatus() {
    try {
        const webhookUrl = getGoogleChatWebhook();
        const isConfigured = !!webhookUrl;
        
        return {
            success: true,
            isConfigured: isConfigured,
            webhookConfigured: isConfigured,
            message: isConfigured ? 'Google Chat แจ้งเตือนพร้อมใช้งาน' : 'ยังไม่ได้ตั้งค่า Google Chat webhook'
        };
    } catch (error) {
        return {
            success: false,
            isConfigured: false,
            message: error.toString()
        };
    }
}

/**
 * Enable/Disable notifications (for future use)
 */
function toggleNotifications(enabled) {
    try {
        PropertiesService.getScriptProperties().setProperty('NOTIFICATIONS_ENABLED', enabled.toString());
        return {
            success: true,
            message: enabled ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว'
        };
    } catch (error) {
        return {
            success: false,
            message: error.toString()
        };
    }
}

/**
 * Check if notifications are enabled
 */
function areNotificationsEnabled() {
    try {
        const enabled = PropertiesService.getScriptProperties().getProperty('NOTIFICATIONS_ENABLED');
        return enabled !== 'false'; // Default to true if not set
    } catch (error) {
        console.error('Error checking notification status:', error);
        return true; // Default to enabled
    }
}


/**
 * Check user permissions (for web interface)
 */
function checkUserPermission(userInfo, action) {
    return checkPermission(userInfo.role, action);
}

/**
 * Get branch list accessible to user (for web interface)
 */
function getUserBranches(userInfo) {
    return getUserAccessibleBranches(userInfo.branch, userInfo.role);
}

// ===========================================
// UTILITY FUNCTIONS
// ==========================================

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
// DAILY BRIEF MANAGEMENT FUNCTIONS (For Manual Use)
// ===========================================

/**
 * Setup daily patient brief - Run this once to set up automatic daily reports
 * Default time: 8:00 AM Thailand time
 * 
 * Example usage:
 * setupDailyPatientBrief() // Sets up daily brief at 8:00 AM
 * setupDailyPatientBrief(9, 30) // Sets up daily brief at 9:30 AM
 */
function setupDailyPatientBrief(hour = 8, minute = 0) {
    Logger.log('Setting up daily patient brief...');
    
    // First check if Google Chat is configured
    const webhookUrl = getGoogleChatWebhook();
    if (!webhookUrl) {
        Logger.error('Google Chat webhook not configured. Please set up webhook first.');
        return { 
            success: false, 
            message: 'กรุณาตั้งค่า Google Chat webhook ก่อนใช้งานการส่งรายงานรายวัน' 
        };
    }

    // Create the trigger
    const result = createDailyPatientBriefTrigger(hour, minute);
    
    if (result.success) {
        Logger.log(`Daily patient brief setup completed successfully at ${hour}:${minute.toString().padStart(2, '0')}`);
    } else {
        Logger.error('Failed to setup daily patient brief:', result.message);
    }
    
    return result;
}

/**
 * Remove daily patient brief trigger
 */
function removeDailyPatientBrief() {
    Logger.log('Removing daily patient brief...');
    const result = deleteDailyPatientBriefTriggers();
    
    if (result.success) {
        Logger.log('Daily patient brief removed successfully');
    } else {
        Logger.error('Failed to remove daily patient brief:', result.message);
    }
    
    return result;
}

/**
 * Check daily patient brief status
 */
function checkDailyPatientBriefStatus() {
    const status = getDailyPatientBriefTriggerStatus();
    
    if (status.success) {
        Logger.log('Daily brief status:', status);
        if (status.isActive) {
            Logger.log(`Daily patient brief is active: ${status.schedule}`);
        } else {
            Logger.log('Daily patient brief is not active');
        }
    } else {
        Logger.error('Error checking daily brief status:', status.message);
    }
    
    return status;
}

/**
 * Send immediate patient brief (for testing)
 */
function sendImmediatePatientBrief() {
    Logger.log('Sending immediate patient brief for testing...');
    const result = sendDailyPatientBrief();
    
    if (result.success) {
        Logger.log('Immediate patient brief sent successfully');
    } else {
        Logger.error('Failed to send immediate patient brief:', result.message);
    }
    
    return result;
}

/**
 * Complete setup example function
 * This shows how to set up everything from scratch
 */
function completeSetupExample() {
    Logger.log('=== Complete Setup Example ===');
    
    // Step 1: Check Google Chat webhook
    Logger.log('Step 1: Checking Google Chat webhook...');
    const webhookUrl = getGoogleChatWebhook();
    if (!webhookUrl) {
        Logger.log('❌ Google Chat webhook not configured');
        Logger.log('Please run: setGoogleChatWebhook("YOUR_WEBHOOK_URL")');
        return { success: false, message: 'Google Chat webhook not configured' };
    }
    Logger.log('✅ Google Chat webhook is configured');
    
    // Step 2: Test notification
    Logger.log('Step 2: Testing Google Chat notification...');
    const testResult = testGoogleChatNotification();
    if (!testResult.success) {
        Logger.log('❌ Google Chat test failed:', testResult.message);
        return { success: false, message: 'Google Chat test failed' };
    }
    Logger.log('✅ Google Chat test successful');
    
    // Step 3: Set up daily brief trigger
    Logger.log('Step 3: Setting up daily patient brief trigger...');
    const setupResult = setupDailyPatientBrief(8, 0); // 8:00 AM
    if (!setupResult.success) {
        Logger.log('❌ Daily brief setup failed:', setupResult.message);
        return { success: false, message: 'Daily brief setup failed' };
    }
    Logger.log('✅ Daily brief trigger set up successfully');
    
    // Step 4: Send test brief
    Logger.log('Step 4: Sending test daily brief...');
    const briefResult = sendImmediatePatientBrief();
    if (!briefResult.success) {
        Logger.log('❌ Test brief failed:', briefResult.message);
        return { success: false, message: 'Test brief failed' };
    }
    Logger.log('✅ Test brief sent successfully');
    
    Logger.log('=== Setup Complete! ===');
    Logger.log('Daily patient brief will be sent every day at 8:00 AM Thailand time');
    
    return { 
        success: true, 
        message: 'การตั้งค่าสำเร็จ - ระบบจะส่งรายงานรายวันเวลา 8:00 น. ทุกวัน' 
    };
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
 * Get contact channels from Option List sheet (Column C)
 */
function getContactChannels() {
    try {
        const optionListSheet = getSheet(SHEET_NAMES.OPTION_LIST);
        const data = optionListSheet.getDataRange().getValues();

        if (data.length <= 1) {
            return JSON.stringify({ success: true, options: [] });
        }

        const contactChannels = [];
        for (let i = 1; i < data.length; i++) {
            const contactChannel = data[i][2]; // Column C (Contact Channel)
            if (contactChannel && contactChannel.toString().trim() !== '') {
                contactChannels.push({
                    value: contactChannel.toString().trim(),
                    displayOrder: i,
                    description: contactChannel.toString().trim()
                });
            }
        }

        return JSON.stringify({ success: true, options: contactChannels });
    } catch (error) {
        console.error('Error getting contact channels:', error);
        return JSON.stringify({ success: false, message: error.toString() });
    }
}

/**
 * Get branches from Option List sheet (Column D)
 */
function getBranches() {
    try {
        const optionListSheet = getSheet(SHEET_NAMES.OPTION_LIST);
        const data = optionListSheet.getDataRange().getValues();

        if (data.length <= 1) {
            // Return default branches if sheet is empty
            const defaultBranches = [
                { value: 'HEAD_OFFICE', displayName: 'สำนักงานใหญ่', description: 'Head Office' },
                { value: 'BRANCH_01', displayName: 'สาขาที่ 1', description: 'Branch 01' }
            ];
            return JSON.stringify({ success: true, options: defaultBranches });
        }

        const branches = [];
        const seenBranches = new Set();
        
        for (let i = 1; i < data.length; i++) {
            const branchValue = data[i][3]; // Column D (Branch)
            if (branchValue && branchValue.toString().trim() !== '' && !seenBranches.has(branchValue.toString().trim())) {
                const branchCode = branchValue.toString().trim();
                seenBranches.add(branchCode);
                
                // Generate display name based on branch code
                let displayName = branchCode;
                if (branchCode === 'HEAD_OFFICE') {
                    displayName = 'สำนักงานใหญ่';
                } else if (branchCode.startsWith('BRANCH_')) {
                    const branchNumber = branchCode.replace('BRANCH_', '');
                    displayName = `สาขาที่ ${branchNumber}`;
                }
                
                branches.push({
                    value: branchCode,
                    displayName: displayName,
                    description: branchCode,
                    displayOrder: i
                });
            }
        }

        // Ensure we have at least default branches
        if (branches.length === 0) {
            const defaultBranches = [
                { value: 'HEAD_OFFICE', displayName: 'สำนักงานใหญ่', description: 'Head Office' },
                { value: 'BRANCH_01', displayName: 'สาขาที่ 1', description: 'Branch 01' }
            ];
            return JSON.stringify({ success: true, options: defaultBranches });
        }

        return JSON.stringify({ success: true, options: branches });
    } catch (error) {
        console.error('Error getting branches:', error);
        // Return default branches on error
        const defaultBranches = [
            { value: 'HEAD_OFFICE', displayName: 'สำนักงานใหญ่', description: 'Head Office' },
            { value: 'BRANCH_01', displayName: 'สาขาที่ 1', description: 'Branch 01' }
        ];
        return JSON.stringify({ success: true, options: defaultBranches });
    }
}

function getpaymentTypes() {
    try {
        // Hardcoded payment types - no longer reading from sheet
        const paymentTypes = [
            {
                value: 'เงินสด',
                displayOrder: 1,
                description: 'เงินสด'
            },
            {
                value: 'เงินโอน',
                displayOrder: 2,
                description: 'เงินโอน'
            },
            {
                value: 'ประกันสังคม',
                displayOrder: 3,
                description: 'ประกันสังคม'
            },
            {
                value: 'Visa',
                displayOrder: 4,
                description: 'Visa'
            }
        ];

        return JSON.stringify({ success: true, options: paymentTypes });
    } catch (error) {
        console.error('Error getting payment methods:', error);
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
        const contactChannelsResult = JSON.parse(getContactChannels());
        const branchesResult = JSON.parse(getBranches());
        const paymentTypesResult = JSON.parse(getpaymentTypes());

        if (!caseTypesResult.success || !caseDetailsResult.success || !contactChannelsResult.success || !branchesResult.success || !paymentTypesResult.success) {
            return JSON.stringify({
                success: false,
                message: 'Error retrieving options'
            });
        }

        return JSON.stringify({
            success: true,
            caseTypes: caseTypesResult.options,
            caseDetails: caseDetailsResult.options,
            contactChannels: contactChannelsResult.options,
            branches: branchesResult.options,
            paymentTypes: paymentTypesResult.options
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
// PERFORMANCE OPTIMIZATION UTILITIES
// ===========================================

/**
 * Debounce function to prevent too frequent calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Batch update operations to reduce API calls
 */
function batchUpdateRows(sheet, updates) {
    try {
        if (!updates || updates.length === 0) {
            return { success: true, message: 'No updates to process' };
        }

        // Sort updates by row index for efficiency
        updates.sort((a, b) => a.row - b.row);

        // Process updates in batches
        updates.forEach(update => {
            sheet.getRange(update.row, 1, 1, update.values.length).setValues([update.values]);
        });

        // Force execution
        SpreadsheetApp.flush();

        return { success: true, message: `Updated ${updates.length} rows successfully` };
    } catch (error) {
        console.error('Error in batch update:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Memory-efficient data processing for large datasets
 */
function processLargeDataset(data, processingFunction, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const batchResults = batch.map(processingFunction);
        results.push(...batchResults);
        
        // Allow other operations to run
        if (i % (batchSize * 10) === 0) {
            Utilities.sleep(1);
        }
    }
    
    return results;
}

/**
 * Intelligent cache warming - multi-user optimized
 */
function warmCache(forceWarm = false) {
    try {
        // Check if warming is needed and safe
        if (!forceWarm && !shouldWarmCache()) {
            return { 
                success: true, 
                message: 'Cache warming skipped - recently warmed or in progress',
                loadTime: 0,
                skipped: true
            };
        }
        
        const startTime = Date.now();
        
        // Load critical data first
        const batchResult = loadAllDataBatch();
        
        if (!batchResult.success) {
            return batchResult;
        }
        
        // Precompute common statistics only if data is available
        let todayAppointmentsCount = 0;
        if (dataCache.appointments && dataCache.patients) {
            try {
                // Pre-calculate today's appointments
                const today = new Date().toISOString().split('T')[0];
                const todayAppointments = findAppointmentsByDate(today);
                todayAppointmentsCount = todayAppointments ? todayAppointments.length : 0;
            } catch (error) {
                console.warn('Error precomputing today\'s appointments:', error);
            }
        }
        
        const endTime = Date.now();
        console.log(`Cache warming completed in ${endTime - startTime}ms with ${todayAppointmentsCount} today's appointments`);
        
        return { 
            success: true, 
            loadTime: endTime - startTime,
            todayAppointments: todayAppointmentsCount,
            cachedData: batchResult.cachedData
        };
    } catch (error) {
        // Ensure warming state is reset on error
        dataCache.isWarming = false;
        console.error('Error warming cache:', error);
        return { success: false, message: error.toString() };
    }
}

/**
 * Smart cache warming that only warms if needed
 */
function smartWarmCache() {
    return warmCache(false);
}

/**
 * Performance monitoring function
 */
function measurePerformance(functionName, func) {
    return function(...args) {
        const startTime = Date.now();
        const result = func.apply(this, args);
        const endTime = Date.now();
        
        console.log(`${functionName} executed in ${endTime - startTime}ms`);
        
        // Log slow operations
        if (endTime - startTime > 1000) {
            console.warn(`Slow operation detected: ${functionName} took ${endTime - startTime}ms`);
        }
        
        return result;
    };
}

// ===========================================
// ENHANCED DATA VALIDATION
// ===========================================

/**
 * Validate data before processing to prevent errors
 */
function validatePatientData(patientData) {
    const errors = [];
    
    if (!patientData.firstName || patientData.firstName.trim() === '') {
        errors.push('First name is required');
    }
    
    if (!patientData.lastName || patientData.lastName.trim() === '') {
        errors.push('Last name is required');
    }
    
    if (!patientData.phone || patientData.phone.trim() === '') {
        errors.push('Phone number is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function validateAppointmentData(appointmentData) {
    const errors = [];
    
    if (!appointmentData.patientId) {
        errors.push('Patient ID is required');
    }
    
    if (!appointmentData.appointmentDate) {
        errors.push('Appointment date is required');
    }
    
    if (!appointmentData.appointmentTime) {
        errors.push('Appointment time is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
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
 * Main doGet function for web app deployment (multi-user optimized)
 */
function doGet() {
    try {
        // Smart cache warming - only if needed and safe
        smartWarmCache();
        
        const template = HtmlService.createTemplateFromFile('index');
        
        // Add performance optimizations to template
        template.cacheEnabled = true;
        template.loadTime = new Date().toISOString();
        
        return template
            .evaluate()
            .addMetaTag('viewport', 'width=device-width, initial-scale=1')
            .setTitle('ระบบจัดการคลินิคทันตกรรม - Multi-User Optimized')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
            .setSandboxMode(HtmlService.SandboxMode.IFRAME)
            .setFaviconUrl('https://img2.pic.in.th/pic/Screenshot-2025-09-22-215301.png');
    } catch (error) {
        console.error('Error in doGet:', error);
        return HtmlService.createHtmlOutput(`
            <h1>System Error</h1>
            <p>Failed to load application: ${error.toString()}</p>
            <p>Please try again later or contact support.</p>
        `);
    }
}

/**
 * Enhanced initialization with performance monitoring - multi-user safe
 */
function initializeSystemWithPerformance() {
    const performanceMonitor = measurePerformance('initializeSystem', initializeSystem);
    const result = performanceMonitor();
    
    if (result.success) {
        // Smart warm up the cache after initialization
        smartWarmCache();
    }
    
    return result;
}

/**
 * Performance-optimized data retrieval for frontend - multi-user safe
 */
function getOptimizedDashboardData() {
    try {
        const startTime = Date.now();
        
        // Ensure cache is loaded, but don't force if another user is warming
        if (!dataCache.patients || !dataCache.appointments || !dataCache.doctors) {
            const warmResult = smartWarmCache();
            if (!warmResult.success && !warmResult.skipped) {
                console.warn('Cache warming failed, proceeding with individual queries');
            }
        }
        
        const today = new Date().toISOString().split('T')[0];
        let todayAppointments = [];
        
        try {
            todayAppointments = findAppointmentsByDate(today) || [];
        } catch (error) {
            console.warn('Error getting today\'s appointments:', error);
        }
        
        const dashboardData = {
            totalPatients: dataCache.patients ? dataCache.patients.length : 0,
            totalDoctors: dataCache.doctors ? dataCache.doctors.length : 0,
            todayAppointments: todayAppointments.length,
            totalRevenue: dataCache.revenues ? 
                dataCache.revenues.reduce((sum, rev) => sum + (parseFloat(rev.amount) || 0), 0) : 0,
            lastUpdated: Math.min(...Object.values(dataCache.lastUpdated).filter(t => t > 0)) || 0,
            loadTime: Date.now() - startTime,
            cacheStatus: {
                isWarming: dataCache.isWarming,
                lastWarmingTime: dataCache.warmingStartTime
            }
        };
        
        return {
            success: true,
            data: dashboardData
        };
    } catch (error) {
        console.error('Error getting optimized dashboard data:', error);
        return { success: false, message: error.toString() };
    }
}

// ===========================================
// DAILY PATIENT BRIEF - SETUP INSTRUCTIONS
// ===========================================

/*
📋 DAILY PATIENT BRIEF SETUP GUIDE
==================================

🎯 PURPOSE:
This system automatically sends daily patient appointment summaries to Google Chat every morning.
Each branch gets a separate message with detailed appointment information.

📝 SETUP STEPS:

1. SET UP GOOGLE CHAT WEBHOOK:
   - Go to your Google Chat space
   - Click on space name → "Manage webhooks" → "Add webhook"
   - Copy the webhook URL
   - Run: setGoogleChatWebhook('YOUR_WEBHOOK_URL')

2. TEST THE SYSTEM:
   - Run: testGoogleChatNotification()
   - Run: sendImmediatePatientBrief()

3. SET UP AUTOMATIC DAILY REPORTS:
   - Run: setupDailyPatientBrief()        // Default: 8:00 AM
   - Or: setupDailyPatientBrief(9, 30)    // Custom: 9:30 AM

4. CHECK STATUS:
   - Run: checkDailyPatientBriefStatus()

5. MODIFY SCHEDULE:
   - Run: setupDailyPatientBrief(7, 0)    // Change to 7:00 AM

6. REMOVE DAILY REPORTS:
   - Run: removeDailyPatientBrief()

🔧 QUICK SETUP (All-in-one):
   - Run: completeSetupExample()

📊 WHAT GETS SENT:
- Daily summary for each branch
- Scheduled appointments with patient details
- Completed appointments summary
- Cancelled appointments summary
- Motivational messages based on workload

⏰ TRIGGER INFORMATION:
- Timezone: Asia/Bangkok (Thailand time)
- Frequency: Daily
- Default time: 8:00 AM
- Customizable time via setupDailyPatientBrief(hour, minute)

🛠️ MANUAL FUNCTIONS:
- triggerDailyPatientBrief()         // Manual trigger for testing
- sendDailyPatientBrief()           // Direct send function
- testDailyPatientBrief()           // Test with current data

📧 MESSAGE FORMAT:
Each branch receives a message with:
- Branch name and date
- Summary statistics (total, scheduled, completed, cancelled)
- Detailed scheduled appointments with:
  * Time and patient name
  * Phone number
  * Doctor name
  * Case type
- Brief summary of completed/cancelled appointments
- Encouragement message based on workload

🔄 AUTOMATIC FEATURES:
- Skips empty branches (or sends special "no appointments" message)
- Sorts appointments by time
- Adds delay between messages to avoid rate limiting
- Thai language support with proper formatting
- Timezone-aware (Thailand time)

⚠️ IMPORTANT NOTES:
- Google Chat webhook must be configured first
- System respects notification enable/disable settings
- Trigger uses Thailand timezone (Asia/Bangkok)
- Messages are sent with 2-second delays between branches
- System will fall back to default branch list if unable to load from sheets

🚀 EXAMPLE USAGE:
```javascript
// Complete setup
completeSetupExample();

// Custom time setup (7:30 AM)
setupDailyPatientBrief(7, 30);

// Check current status
checkDailyPatientBriefStatus();

// Send test message now
sendImmediatePatientBrief();

// Remove all triggers
removeDailyPatientBrief();
```

💡 TROUBLESHOOTING:
- If messages don't send: Check Google Chat webhook URL
- If no appointments show: Verify date format and data in sheets
- If trigger doesn't work: Check timezone and permissions
- If branch data missing: System uses fallback branch list
*/