// ==========================================
// KYM & Call Log Management System - Backend (แก้ไขสมบูรณ์)
// Google Apps Script Code
// ==========================================

const SPREADSHEET_ID = '1YHHHuciHENivmlmaOPNjYXmVEzPKJKmFh-R_BHe4Vtc';

// ==========================================
// Helper Function - Hash Password
// ==========================================
function hashPassword(password) {
 return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + 'KYM_SALT_2024')
   .map(function(byte) {
     return ('0' + (byte & 0xFF).toString(16)).slice(-2);
   })
   .join('');
}

// ==========================================
// Setup Function - Run this first
// ==========================================
function setupSheets() {
 const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // Create Users Sheet
 let usersSheet = ss.getSheetByName('Users');
 if (!usersSheet) {
   usersSheet = ss.insertSheet('Users');
   usersSheet.getRange('A1:I1').setValues([[
     'ID', 'Username', 'Password', 'Full Name', 'Role', 'Email', 'Status', 'Created Date', 'Created By'
   ]]);
   usersSheet.getRange('A1:I1').setFontWeight('bold').setBackground('#FF6B35').setFontColor('#FFFFFF');
   usersSheet.setFrozenRows(1);
  
   // Add demo users (passwords are hashed)
   usersSheet.getRange('A2:I4').setValues([
     [1, 'admin', hashPassword('admin123'), 'ผู้ดูแลระบบ', 'Admin', 'admin@kym.com', 'Active', new Date(), 'system'],
     [2, 'supervisor', hashPassword('super123'), 'หัวหน้างาน', 'Supervisor', 'supervisor@kym.com', 'Active', new Date(), 'system'],
     [3, 'employee', hashPassword('emp123'), 'พนักงาน', 'Employee', 'employee@kym.com', 'Active', new Date(), 'system']
   ]);
 }
  // Create KYM Records Sheet
 let kymSheet = ss.getSheetByName('KYM_Records');
 if (!kymSheet) {
   kymSheet = ss.insertSheet('KYM_Records');
   kymSheet.getRange('A1:V1').setValues([[
     'Timestamp', 'ID', 'Truemoney_ID', 'Store_Name', 'Sales_Channel', 'Category', 'Sub_Category',
     'Assessment_Store_Photo', 'Assessment_Product_Service', 'Assessment_Store_Name',
     'Assessment_Business_Reg', 'Assessment_Professional_License',
     'Assessment_Prohibited_Store', 'Assessment_Repeat_Application',
     'Recommendation_Status', 'Final_Status', 'Reason', 'Notes',
     'Operator_Username', 'Operator_Name', 'Created_At', 'Updated_At'
   ]]);
   kymSheet.getRange('A1:V1').setFontWeight('bold').setBackground('#FF6B35').setFontColor('#FFFFFF');
   kymSheet.setFrozenRows(1);
 }
  // Create Call Logs Sheet
 let callSheet = ss.getSheetByName('Call_Logs');
 if (!callSheet) {
   callSheet = ss.insertSheet('Call_Logs');
   callSheet.getRange('A1:V1').setValues([[
     'Timestamp', 'ID', 'Truemoney_ID', 'Store_Name', 'Contact_Number', 'Contact_Name',
     'Call_Reason', 'Call_Result', 'Call_Details', 'Case_Status', 'Reschedule_DateTime',
     'Follow_Up_Date', 'Next_Call_Time_Slot', 'Retry_Call_Date', 'Retry_Time_Slot', 'Retry_Notes',
     'Activities_JSON', 'Last_Activity', 'Last_Operator', 'Closed_At',
     'Operator_Username', 'Operator_Name'
   ]]);
   callSheet.getRange('A1:V1').setFontWeight('bold').setBackground('#FF6B35').setFontColor('#FFFFFF');
   callSheet.setFrozenRows(1);
 }
  SpreadsheetApp.getUi().alert('Setup Complete! All sheets created successfully.\n\nDemo Accounts:\n- admin / admin123\n- supervisor / super123\n- employee / emp123');
  return { success: true, message: 'Setup complete' };
}

// ==========================================
// Web App Entry Point
// ==========================================
function doGet() {
 return HtmlService.createHtmlOutputFromFile('Index')
   .setTitle('KYM & Call Log System')
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// Authentication
// ==========================================
function authenticateUser(username, hashedPassword) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return JSON.stringify({ success: false, error: 'Users sheet not found. Please run setupSheets() first.' });
   }
  
   const data = usersSheet.getDataRange().getValues();
  
   for (let i = 1; i < data.length; i++) {
     if (data[i][1] === username && data[i][2] === hashedPassword && data[i][6] === 'Active') {
       return JSON.stringify({
         success: true,
         user: {
           id: data[i][0],
           username: data[i][1],
           name: data[i][3],
           role: data[i][4],
           email: data[i][5]
         }
       });
     }
   }
  
   return JSON.stringify({ success: false, error: 'Invalid credentials or account inactive' });
 } catch (e) {
   Logger.log('Authentication error: ' + e.toString());
   return JSON.stringify({ success: false, error: 'Authentication failed: ' + e.toString() });
 }
}

// ==========================================
// User Management Functions
// ==========================================
function getAllUsers() {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return { success: false, error: 'Users sheet not found' };
   }
  
   const data = usersSheet.getDataRange().getValues();
   const users = [];
  
   for (let i = 1; i < data.length; i++) {
     users.push({
       id: data[i][0],
       username: data[i][1],
       password: data[i][2], // Include for local sync
       name: data[i][3],
       role: data[i][4],
       email: data[i][5],
       status: data[i][6],
       createdAt: data[i][7],
       createdBy: data[i][8]
     });
   }
  
   return { success: true, data: users };
 } catch (e) {
   Logger.log('Get users error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

function addUser(userData) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return { success: false, error: 'Users sheet not found. Please run setupSheets() first.' };
   }
  
   // Get all data
   const data = usersSheet.getDataRange().getValues();
  
   // Check if username already exists (skip header row)
   for (let i = 1; i < data.length; i++) {
     if (data[i][1] === userData.username) {
       return { success: false, error: 'Username already exists' };
     }
   }
  
   // Calculate new ID safely
   let newId = 1;
   if (data.length > 1) {
     // Get the last row's ID and increment
     const lastId = data[data.length - 1][0];
     newId = (typeof lastId === 'number' && lastId > 0) ? lastId + 1 : data.length;
   }
  
   // Use provided ID if valid, otherwise use calculated newId
   const userId = (userData.id && typeof userData.id === 'number') ? userData.id : newId;
  
   // Add new user
   usersSheet.appendRow([
     userId,
     userData.username,
     userData.password,
     userData.name,
     userData.role,
     userData.email || '',
     userData.status || 'Active',
     new Date(userData.createdAt || new Date()),
     userData.createdBy || 'system'
   ]);
  
   Logger.log('User added successfully: ' + userData.username + ' (ID: ' + userId + ')');
   return { success: true, message: 'User added successfully', id: userId };
  
 } catch (e) {
   Logger.log('Add user error: ' + e.toString());
   Logger.log('Error stack: ' + e.stack);
   return { success: false, error: 'Failed to add user: ' + e.toString() };
 }
}

function updateUser(userData) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return { success: false, error: 'Users sheet not found' };
   }
  
   const data = usersSheet.getDataRange().getValues();
  
   for (let i = 1; i < data.length; i++) {
     if (data[i][0] == userData.id) {
       usersSheet.getRange(i + 1, 4).setValue(userData.name);
       usersSheet.getRange(i + 1, 5).setValue(userData.role);
       usersSheet.getRange(i + 1, 6).setValue(userData.email || '');
       usersSheet.getRange(i + 1, 7).setValue(userData.status);
      
       Logger.log('User updated successfully: ' + userData.id);
       return { success: true, message: 'User updated successfully' };
     }
   }
  
   return { success: false, error: 'User not found' };
 } catch (e) {
   Logger.log('Update user error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

function toggleUserStatus(userId) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return { success: false, error: 'Users sheet not found' };
   }
  
   const data = usersSheet.getDataRange().getValues();
  
   for (let i = 1; i < data.length; i++) {
     if (data[i][0] == userId) {
       const currentStatus = data[i][6];
       const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
       usersSheet.getRange(i + 1, 7).setValue(newStatus);
      
       Logger.log('User status toggled: ' + userId + ' to ' + newStatus);
       return { success: true, message: 'User status updated', newStatus: newStatus };
     }
   }
  
   return { success: false, error: 'User not found' };
 } catch (e) {
   Logger.log('Toggle user status error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

function deleteUser(userId) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const usersSheet = ss.getSheetByName('Users');
  
   if (!usersSheet) {
     return { success: false, error: 'Users sheet not found' };
   }
  
   const data = usersSheet.getDataRange().getValues();
  
   for (let i = 1; i < data.length; i++) {
     if (data[i][0] == userId) {
       usersSheet.deleteRow(i + 1);
       Logger.log('User deleted successfully: ' + userId);
       return { success: true, message: 'User deleted successfully' };
     }
   }
  
   return { success: false, error: 'User not found' };
 } catch (e) {
   Logger.log('Delete user error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

// ==========================================
// KYM Functions - แก้ไขให้ตรงกับ Header ที่มีอยู่จริง
// ==========================================
function saveKYMRecord(record) {
 try {
   // ***** เพิ่ม Debug Logging *****
   Logger.log('=== saveKYMRecord START ===');
   Logger.log('📥 Received record: ' + JSON.stringify(record));
  
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const kymSheet = ss.getSheetByName('KYM_Records');
  
   if (!kymSheet) {
     Logger.log('❌ Sheet not found');
     return { success: false, error: 'KYM_Records sheet not found' };
   }
  
   // ***** ปรับปรุงการ Validate - แสดง Error ละเอียด *****
   const missingFields = [];
  
   // ตรวจสอบ truemoneyId
   if (!record.truemoneyId || record.truemoneyId.trim() === '') {
     missingFields.push('truemoneyId (หมายเลขทรูมันนี่)');
     Logger.log('❌ Missing: truemoneyId');
   } else {
     Logger.log('✅ truemoneyId: ' + record.truemoneyId);
   }
  
   // ตรวจสอบ storeName
   if (!record.storeName || record.storeName.trim() === '') {
     missingFields.push('storeName (ชื่อร้านค้า)');
     Logger.log('❌ Missing: storeName');
   } else {
     Logger.log('✅ storeName: ' + record.storeName);
   }
  
   // ตรวจสอบ status
   if (!record.status || record.status.trim() === '') {
     missingFields.push('status (สถานะ: Approved/Revised/Rejected)');
     Logger.log('❌ Missing: status');
   } else {
     Logger.log('✅ status: ' + record.status);
   }
  
   // ถ้ามี field ที่ขาด - return error พร้อมรายละเอียด
   if (missingFields.length > 0) {
     const errorMsg = 'ข้อมูลไม่ครบถ้วน: ' + missingFields.join(', ');
     Logger.log('❌ Validation Failed: ' + errorMsg);
     Logger.log('❌ Full record received: ' + JSON.stringify(record));
    
     return {
       success: false,
       error: errorMsg,
       details: {
         received: {
           truemoneyId: record.truemoneyId || '(ว่าง)',
           storeName: record.storeName || '(ว่าง)',
           status: record.status || '(ว่าง)'
         },
         missingFields: missingFields
       }
     };
   }
  
   Logger.log('✅ Validation passed - all required fields present');
  
   const id = record.id || Date.now();
   const timestamp = record.timestamp ? new Date(record.timestamp) : new Date();
  
   // Ensure assessment object exists
   const assessment = record.assessment || {};
  
   // คำนวณ Recommendation Status จากการประเมิน
   let recommendationStatus = 'N/A';
   const prohibitedStore = assessment.prohibitedStore || false;
   const repeatApplication = assessment.repeatApplication || false;
   const storePhoto = assessment.storePhoto || false;
   const productService = assessment.productService || false;
   const storeNameCheck = assessment.storeNameCheck || false;
   const professionalLicense = assessment.professionalLicense || false;
  
   // ตรวจสอบเงื่อนไข Reject
   if (prohibitedStore || repeatApplication) {
     recommendationStatus = 'Rejected';
   } else {
     // ตรวจสอบข้อจำเป็น
     const requiredItems = [storePhoto, productService, storeNameCheck];
    
     // เช็คว่าต้องมีใบประกอบวิชาชีพหรือไม่
     const licenseRequired = record.subCategory && (
       record.subCategory.includes('คลินิก') ||
       record.subCategory.includes('ทันตกรรม') ||
       record.subCategory.includes('นวด') ||
       record.subCategory.includes('สถาบันเสริมความงาม') ||
       record.subCategory.includes('ทัศนมาตร') ||
       record.subCategory.includes('ขายยา') ||
       record.subCategory.includes('สัตวแพทย์')
     );
    
     if (licenseRequired) {
       requiredItems.push(professionalLicense);
     }
    
     const missingRequired = requiredItems.filter(item => !item);
     recommendationStatus = missingRequired.length > 0 ? 'Revised' : 'Approved';
   }
  
   Logger.log('📊 Calculated recommendationStatus: ' + recommendationStatus);
  
   // บันทึกตามลำดับคอลัมน์ที่ถูกต้อง
   kymSheet.appendRow([
     timestamp,                              // A: Timestamp
     id,                                     // B: ID
     record.truemoneyId || '',              // C: Truemoney_ID
     record.storeName || '',                // D: Store_Name
     record.salesChannel || '',             // E: Sales_Channel
     record.category || '',                 // F: Category
     record.subCategory || '',              // G: Sub_Category
     storePhoto ? 'Yes' : 'No',            // H: Assessment_Store_Photo
     productService ? 'Yes' : 'No',        // I: Assessment_Product_Service
     storeNameCheck ? 'Yes' : 'No',        // J: Assessment_Store_Name
     assessment.businessReg ? 'Yes' : 'No', // K: Assessment_Business_Reg
     professionalLicense ? 'Yes' : 'No',    // L: Assessment_Professional_License
     prohibitedStore ? 'Yes' : 'No',        // M: Assessment_Prohibited_Store
     repeatApplication ? 'Yes' : 'No',      // N: Assessment_Repeat_Application
     recommendationStatus,                   // O: Recommendation_Status
     record.status || '',                   // P: Final_Status
     record.reason || '',                   // Q: Reason
     record.notes || '',                    // R: Notes
     record.operator || '',                 // S: Operator_Username
     record.operatorName || '',             // T: Operator_Name
     timestamp,                              // U: Created_At
     ''                                     // V: Updated_At
   ]);
  
   Logger.log('✅ KYM Record saved successfully with ID: ' + id);
   Logger.log('=== saveKYMRecord END ===');
  
   return {
     success: true,
     message: 'บันทึกข้อมูล KYM สำเร็จ',
     id: id
   };
  
 } catch (e) {
   Logger.log('❌ ERROR in saveKYMRecord: ' + e.toString());
   Logger.log('❌ Error stack: ' + e.stack);
   return {
     success: false,
     error: 'เกิดข้อผิดพลาดในการบันทึก: ' + e.toString()
   };
 }
}

function getKYMRecords(startDate, endDate) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const kymSheet = ss.getSheetByName('KYM_Records');
  
   if (!kymSheet) {
     return { success: false, error: 'KYM_Records sheet not found' };
   }
  
   const data = kymSheet.getDataRange().getValues();
   const records = [];
  
   // กำหนด date range ถ้าไม่มี ให้ดึงทั้งหมด
   const start = startDate ? new Date(startDate) : new Date(0);
   const end = endDate ? new Date(endDate) : new Date(2100, 0, 1);
  
   // ข้าม header row (row 0)
   for (let i = 1; i < data.length; i++) {
     const recordDate = new Date(data[i][0]); // Timestamp ใน column A
    
     // Filter by date if provided
     if (recordDate >= start && recordDate <= end) {
       records.push({
         timestamp: data[i][0],
         id: data[i][1],
         truemoneyId: data[i][2],
         storeName: data[i][3],
         salesChannel: data[i][4],
         category: data[i][5],
         subCategory: data[i][6],
         assessment: {
           storePhoto: data[i][7] === 'Yes',
           productService: data[i][8] === 'Yes',
           storeNameCheck: data[i][9] === 'Yes',
           businessReg: data[i][10] === 'Yes',
           professionalLicense: data[i][11] === 'Yes',
           prohibitedStore: data[i][12] === 'Yes',
           repeatApplication: data[i][13] === 'Yes'
         },
         recommendationStatus: data[i][14],
         status: data[i][15],
         reason: data[i][16],
         notes: data[i][17],
         operator: data[i][18],
         operatorName: data[i][19]
       });
     }
   }
  
   Logger.log('Get KYM records success: ' + records.length + ' records');
   return { success: true, data: records };
 } catch (e) {
   Logger.log('Get KYM records error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

// ==========================================
// Call Log Functions - แก้ไขให้ตรงกับ Header ที่มีอยู่จริง
// ==========================================
function saveCallLog(record) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const callSheet = ss.getSheetByName('Call_Logs');
  
   if (!callSheet) {
     return { success: false, error: 'Call_Logs sheet not found' };
   }
  
   // Validate required fields
   if (!record.truemoneyId || !record.callResult || !record.callDetails) {
     return { success: false, error: 'Missing required fields: truemoneyId, callResult, or callDetails' };
   }
  
   const id = record.id || Date.now();
   const timestamp = record.timestamp ? new Date(record.timestamp) : new Date();
  
   // บันทึกตามลำดับคอลัมน์ที่ถูกต้อง
   callSheet.appendRow([
     timestamp,                              // A: Timestamp
     id,                                     // B: ID
     record.truemoneyId || '',              // C: Truemoney_ID
     record.storeName || '',                // D: Store_Name
     record.contactNumber || '',            // E: Contact_Number
     record.contactName || '',              // F: Contact_Name
     record.callReason || '',               // G: Call_Reason
     record.callResult || '',               // H: Call_Result
     record.callDetails || '',              // I: Call_Details
     record.caseStatus || 'Pending',        // J: Case_Status
     record.rescheduleDateTime || '',       // K: Reschedule_DateTime
     record.followUpDate || '',             // L: Follow_Up_Date
     record.nextCallTimeSlot || '',         // M: Next_Call_Time_Slot
     record.retryCallDate || '',            // N: Retry_Call_Date
     record.retryTimeSlot || '',            // O: Retry_Time_Slot
     record.retryNotes || '',               // P: Retry_Notes
     JSON.stringify(record.activities || []), // Q: Activities_JSON
     record.lastActivity || '',             // R: Last_Activity
     record.lastOperator || '',             // S: Last_Operator
     record.closedAt || '',                 // T: Closed_At
     record.operator || '',                 // U: Operator_Username
     record.operatorName || ''              // V: Operator_Name
   ]);
  
   Logger.log('Call log saved: ' + id);
   return { success: true, message: 'Call log saved successfully', id: id };
 } catch (e) {
   Logger.log('Save call log error: ' + e.toString());
   return { success: false, error: 'Failed to save call log: ' + e.toString() };
 }
}

function updateCallLog(callData) {
 try {
   Logger.log('=== updateCallLog START ===');
   Logger.log('📥 Received data: ' + JSON.stringify(callData));
  
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const callSheet = ss.getSheetByName('Call_Logs');
  
   if (!callSheet) {
     return { success: false, error: 'Call_Logs sheet not found' };
   }
  
   const data = callSheet.getDataRange().getValues();
  
   for (let i = 1; i < data.length; i++) {
     if (data[i][1] == callData.id) { // ID อยู่ใน column B
       Logger.log('✅ Found call log at row: ' + (i + 1));
      
       // Update all fields ตามลำดับคอลัมน์
       callSheet.getRange(i + 1, 4).setValue(callData.storeName || data[i][3]);          // D: Store_Name
       callSheet.getRange(i + 1, 10).setValue(callData.caseStatus || data[i][9]);         // J: Case_Status
       callSheet.getRange(i + 1, 11).setValue(callData.rescheduleDateTime || data[i][10]); // K: Reschedule_DateTime
       callSheet.getRange(i + 1, 12).setValue(callData.followUpDate || data[i][11]);       // L: Follow_Up_Date
       callSheet.getRange(i + 1, 13).setValue(callData.nextCallTimeSlot || data[i][12]);   // M: Next_Call_Time_Slot
       callSheet.getRange(i + 1, 14).setValue(callData.retryCallDate || data[i][13]);      // N: Retry_Call_Date
       callSheet.getRange(i + 1, 15).setValue(callData.retryTimeSlot || data[i][14]);      // O: Retry_Time_Slot
       callSheet.getRange(i + 1, 16).setValue(callData.retryNotes || data[i][15]);         // P: Retry_Notes
       callSheet.getRange(i + 1, 17).setValue(JSON.stringify(callData.activities || []));  // Q: Activities_JSON
       callSheet.getRange(i + 1, 18).setValue(callData.lastActivity || data[i][17]);       // R: Last_Activity
       callSheet.getRange(i + 1, 19).setValue(callData.lastOperator || data[i][18]);       // S: Last_Operator
       callSheet.getRange(i + 1, 20).setValue(callData.closedAt || data[i][19]);           // T: Closed_At
      
       Logger.log('✅ Call log updated successfully');
       Logger.log('=== updateCallLog END ===');
       return { success: true, message: 'Call log updated successfully' };
     }
   }
  
   Logger.log('❌ Call log not found with ID: ' + callData.id);
   return { success: false, error: 'Call log not found with ID: ' + callData.id };
 } catch (e) {
   Logger.log('❌ Update call log error: ' + e.toString());
   Logger.log('❌ Error stack: ' + e.stack);
   return { success: false, error: 'Failed to update call log: ' + e.toString() };
 }
}

function getCallLogs(startDate, endDate) {
 try {
   const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
   const callSheet = ss.getSheetByName('Call_Logs');
  
   if (!callSheet) {
     return { success: false, error: 'Call_Logs sheet not found' };
   }
  
   const data = callSheet.getDataRange().getValues();
   const logs = [];
  
   // กำหนด date range ถ้าไม่มี ให้ดึงทั้งหมด
   const start = startDate ? new Date(startDate) : new Date(0);
   const end = endDate ? new Date(endDate) : new Date(2100, 0, 1);
  
   // ข้าม header row (row 0)
   for (let i = 1; i < data.length; i++) {
     const recordDate = new Date(data[i][0]); // Timestamp ใน column A
    
     // Filter by date if provided
     if (recordDate >= start && recordDate <= end) {
       let activities = [];
       try {
         activities = JSON.parse(data[i][16] || '[]'); // Activities_JSON ใน column Q
       } catch (e) {
         activities = [];
       }
      
       logs.push({
         timestamp: data[i][0],
         id: data[i][1],
         truemoneyId: data[i][2],
         storeName: data[i][3],
         contactNumber: data[i][4],
         contactName: data[i][5],
         callReason: data[i][6],
         callResult: data[i][7],
         callDetails: data[i][8],
         caseStatus: data[i][9],
         rescheduleDateTime: data[i][10],
         followUpDate: data[i][11],
         nextCallTimeSlot: data[i][12],
         retryCallDate: data[i][13],
         retryTimeSlot: data[i][14],
         retryNotes: data[i][15],
         activities: activities,
         lastActivity: data[i][17],
         lastOperator: data[i][18],
         closedAt: data[i][19],
         operator: data[i][20],
         operatorName: data[i][21]
       });
     }
   }
  
   Logger.log('Get call logs success: ' + logs.length + ' logs');
   return { success: true, data: logs };
 } catch (e) {
   Logger.log('Get call logs error: ' + e.toString());
   return { success: false, error: e.toString() };
 }
}

// ==========================================
// Get All Data - สำหรับ sync
// ==========================================
function getAllData() {
 try {
   const users = getAllUsers();
   const kym = getKYMRecords();
   const calls = getCallLogs();

   return JSON.stringify({
     success: true,
     data: {
       users: users.success ? users.data : [],
       kym: kym.success ? kym.data : [],
       calls: calls.success ? calls.data : []
     }
   });
 } catch (e) {
   Logger.log('Get all data error: ' + e.toString());
   return JSON.stringify({ success: false, error: e.toString() });
 }
}

// ==========================================
// Test Function - ทดสอบการบันทึก (อัปเดตให้ตรงกับโครงสร้างใหม่)
// ==========================================
function testSaveKYM() {
 const testRecord = {
   id: Date.now(),
   truemoneyId: '0812345678',
   storeName: 'ร้านทดสอบระบบ',
   salesChannel: 'มีหน้าร้าน',
   category: 'อาหารและเครื่องดื่ม',
   subCategory: 'ร้านอาหาร',
   assessment: {
     storePhoto: true,
     productService: true,
     storeNameCheck: true,
     businessReg: false,
     professionalLicense: false,
     prohibitedStore: false,
     repeatApplication: false
   },
   status: 'Approved',
   reason: '',
   notes: 'ทดสอบระบบ - บันทึกข้อมูล KYM',
   operator: 'admin',
   operatorName: 'ผู้ดูแลระบบ',
   timestamp: new Date()
 };
  const result = saveKYMRecord(testRecord);
 Logger.log('Test KYM result: ' + JSON.stringify(result));
  // แสดงข้อความแจ้งเตือน
 if (result.success) {
   SpreadsheetApp.getUi().alert('✅ ทดสอบบันทึก KYM สำเร็จ!\n\nID: ' + result.id + '\n\nกรุณาตรวจสอบ Sheet "KYM_Records"');
 } else {
   SpreadsheetApp.getUi().alert('❌ ทดสอบล้มเหลว!\n\nError: ' + result.error);
 }
  return result;
}

function testSaveCall() {
 const testRecord = {
   id: Date.now(),
   truemoneyId: '0812345678',
   storeName: 'ร้านทดสอบระบบ',
   contactNumber: '0812345678',
   contactName: 'คุณทดสอบ',
   callReason: 'ต้องการข้อมูลเพิ่มเติม',
   callResult: 'ติดต่อได้',
   callDetails: 'ทดสอบการบันทึกการโทรออก - ระบบทำงานปกติ',
   caseStatus: 'Pending',
   followUpDate: new Date(Date.now() + 86400000).toISOString(), // พรุ่งนี้
   nextCallTimeSlot: 'เช้า (09:00-12:00)',
   activities: [],
   operator: 'admin',
   operatorName: 'ผู้ดูแลระบบ',
   timestamp: new Date()
 };
  const result = saveCallLog(testRecord);
 Logger.log('Test Call result: ' + JSON.stringify(result));
  // แสดงข้อความแจ้งเตือน
 if (result.success) {
   SpreadsheetApp.getUi().alert('✅ ทดสอบบันทึกการโทรสำเร็จ!\n\nID: ' + result.id + '\n\nกรุณาตรวจสอบ Sheet "Call_Logs"');
 } else {
   SpreadsheetApp.getUi().alert('❌ ทดสอบล้มเหลว!\n\nError: ' + result.error);
 }
  return result;
}

// ==========================================
// Verify Headers - ตรวจสอบว่า Header ถูกต้อง
// ==========================================
function verifySheetHeaders() {
 const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
 let report = '📋 รายงานการตรวจสอบ Headers\n\n';
  // Check KYM_Records
 const kymSheet = ss.getSheetByName('KYM_Records');
 if (kymSheet) {
   const kymHeaders = kymSheet.getRange(1, 1, 1, kymSheet.getLastColumn()).getValues()[0];
   report += '✅ KYM_Records (' + kymHeaders.length + ' columns):\n';
   kymHeaders.forEach((header, index) => {
     report += '  ' + String.fromCharCode(65 + index) + ': ' + header + '\n';
   });
 } else {
   report += '❌ KYM_Records sheet not found\n';
 }
  report += '\n';
  // Check Call_Logs
 const callSheet = ss.getSheetByName('Call_Logs');
 if (callSheet) {
   const callHeaders = callSheet.getRange(1, 1, 1, callSheet.getLastColumn()).getValues()[0];
   report += '✅ Call_Logs (' + callHeaders.length + ' columns):\n';
   callHeaders.forEach((header, index) => {
     report += '  ' + String.fromCharCode(65 + index) + ': ' + header + '\n';
   });
 } else {
   report += '❌ Call_Logs sheet not found\n';
 }
  Logger.log(report);
 SpreadsheetApp.getUi().alert(report);
  return report;
}

