// Google Apps Script Code for Complain Management System
// File: Code.gs

// Cache for spreadsheet and sheet references
let cachedSpreadsheet = null;
let cachedSheets = {};
let cacheTimes = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function doGet(e) {
  // Return the HTML file for web app
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจัดการข้อมูล Complain')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
}

// Initialize spreadsheet and create sheet if not exists
function getOrCreateSheet(sheetName = 'ComplainData') {
  const now = Date.now();

  // Return cached sheet if still valid
  if (cachedSheets[sheetName] && cacheTimes[sheetName] && (now - cacheTimes[sheetName]) < CACHE_DURATION) {
    return cachedSheets[sheetName];
  }

  const ss = cachedSpreadsheet || SpreadsheetApp.getActiveSpreadsheet();
  cachedSpreadsheet = ss;

  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    if (sheetName !== 'ComplainData') {
      // Create new sheet with headers
      sheet = ss.insertSheet('ComplainData');
      const headers = [
        'ID', 'วันที่', 'สินค้า', 'จำนวน', 'หน่วย', 'ปัญหา', 'ร้านค้า',
        'ประเภท', 'ความรุนแรง', 'มูลค่าเคลม', 'ทีมรับผิดชอบ',
        'ชื่อตัวแทนทีม', 'Pipeline', 'แนวทางแก้ไข (JSON)', 'วันที่สร้าง'
      ];

      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

      // Format header row
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#374151');
      headerRange.setFontColor('white');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');

      // Set column widths
      sheet.setColumnWidth(1, 60);   // ID
      sheet.setColumnWidth(2, 100);  // วันที่
      sheet.setColumnWidth(3, 150);  // สินค้า
      sheet.setColumnWidth(4, 80);   // จำนวน
      sheet.setColumnWidth(5, 80);   // หน่วย
      sheet.setColumnWidth(6, 200);  // ปัญหา
      sheet.setColumnWidth(7, 120);  // ร้านค้า
      sheet.setColumnWidth(8, 100);  // ประเภท
      sheet.setColumnWidth(9, 100);  // ความรุนแรง
      sheet.setColumnWidth(10, 120); // มูลค่าเคลม
      sheet.setColumnWidth(11, 150); // ทีมรับผิดชอบ
      sheet.setColumnWidth(12, 150); // ชื่อตัวแทนทีม
      sheet.setColumnWidth(13, 100); // Pipeline
      sheet.setColumnWidth(14, 300); // แนวทางแก้ไข (JSON)
      sheet.setColumnWidth(15, 120); // วันที่สร้าง

      // Freeze header row
      sheet.setFrozenRows(1);
    }
    else if (sheetName === 'Dropdown list') {
      sheet = ss.insertSheet('Dropdown list');
    }
  }

  // Update cache
  cachedSheets[sheetName] = sheet;
  cacheTimes[sheetName] = Date.now();

  return sheet;
}

function getComplainId() {
  const prefix = 'C';
  const sheet = getOrCreateSheet('ComplainData');
  const lastId = sheet.getRange(2,1,sheet.getLastRow(),1).getValues().flat().filter(id => id !== "").pop();
  const nextIdNum = lastId ? parseInt(lastId.slice(1)) + 1 : 1;
  return prefix + String(nextIdNum).padStart(5, '0');
}

function getFollowUpId() {
  const sheet = getOrCreateSheet('FollowUpData');
  const lastId = sheet.getRange(2,1,sheet.getLastRow(),1).getValues().flat().filter(id => id !== "").pop();
  const nextIdNum = lastId ? parseInt(lastId) + 1 : 1;
  return String(nextIdNum).padStart(6, '0');
}

// Get all data from sheet - Called by google.script.run.getData()
function getData() {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    // Read columns including solutions (exclude timestamp)
    const range = sheet.getRange(2, 1, lastRow - 1, 14);
    const values = range.getValues();

    // Pre-allocate array for better performance
    const data = new Array(values.length);

    // Use for loop instead of map for better performance with large datasets
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      
      // Parse solutions JSON
      let solutions = [];
      try {
        if (row[12] && typeof row[12] === 'string') {
          solutions = JSON.parse(row[12]);
        }
      } catch (e) {
        console.warn('Failed to parse solutions for row', i, e);
      }
      
      data[i] = {
        id: row[0],
        date: formatDateFast(row[1]),
        product: row[2],
        quantity: row[3],
        unit: row[4],
        problem: row[5],
        store: row[6],
        type: row[7],
        severity: row[8],
        claimValue: row[9],
        responsibleTeam: row[10],
        teamRepresentative: row[11],
        solutions: solutions,
        pipeline: row[13]
      };
    }

    return { success: true, data: data };

  } catch (error) {
    console.error('Error in getData:', error);
    return { success: false, error: error.toString() };
  }
}

// Add new data to sheet - Called by google.script.run.addData(formData)
function addData(formData) {
  try {
    const sheet = getOrCreateSheet('ComplainData');
    const timestamp = new Date();

    const nextId = getComplainId();
    
    // Convert solutions array to JSON string
    const solutionsJson = formData.solutions ? JSON.stringify(formData.solutions) : '';
    
    const rowData = [
      nextId,
      formData.date,
      formData.product,
      formData.quantity,
      formData.unit,
      formData.problem,
      formData.store,
      formData.type,
      String(formData.severity),
      formData.claimValue,
      formData.responsibleTeam,
      formData.teamRepresentative,
      solutionsJson,
      formData.pipeline,
      timestamp
    ];

    sheet.appendRow(rowData);

    const newRowNum = sheet.getLastRow();

    // Batch formatting operations for better performance
    const formatOps = [];

    // Alternate row colors
    if (newRowNum % 2 === 0) {
      const newRowRange = sheet.getRange(newRowNum, 1, 1, 15);
      newRowRange.setBackground('#f9fafb');
    }

    // Format currency column
    sheet.getRange(newRowNum, 10).setNumberFormat('#,##0.00');

    // // Send notification asynchronously (non-blocking)
    // try {
    //   sendChatText(formData.date, formData.product, formData.problem, formData.pipeline, 
    //                formData.responsibleTeam, formData.teamRepresentative, 'add', formData.store);
    // } catch (notifError) {
    //   console.warn('Notification failed but data saved:', notifError);
    // }

    return {
      success: true,
      message: 'เพิ่มข้อมูลสำเร็จ',
      id: nextId
    };

  } catch (error) {
    console.error('Error in addData:', error);
    return { success: false, error: error.toString() };
  }
}

// Update existing data in sheet - Called by google.script.run.updateData(formData)
function updateData(formData) {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      throw new Error('ไม่พบข้อมูลที่จะแก้ไข');
    }

    // Find the row with matching ID
    const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
    const ids = idRange.getValues().flat();
    const rowIndex = ids.findIndex(id => id == formData.id);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูลที่ต้องการแก้ไข');
    }

    const actualRow = rowIndex + 2; // +2 because array is 0-indexed and we start from row 2
    const timestamp = new Date();

    // Convert solutions array to JSON string
    const solutionsJson = formData.solutions ? JSON.stringify(formData.solutions) : '';

    const rowData = [
      formData.id,
      formData.date,
      formData.product,
      formData.quantity,
      formData.unit,
      formData.problem,
      formData.store,
      formData.type,
      String(formData.severity),
      formData.claimValue,
      formData.responsibleTeam,
      formData.teamRepresentative,
      solutionsJson,
      formData.pipeline,
      timestamp
    ];

    sheet.getRange(actualRow, 1, 1, 15).setValues([rowData]);

    // // Send notification asynchronously (non-blocking)
    // try {
    //   sendChatText(formData.date, formData.product, formData.problem, formData.pipeline,
    //                formData.responsibleTeam, formData.teamRepresentative, 'update', formData.store);
    // } catch (notifError) {
    //   console.warn('Notification failed but data updated:', notifError);
    // }

    return {
      success: true,
      message: 'แก้ไขข้อมูลสำเร็จ'
    };

  } catch (error) {
    console.error('Error in updateData:', error);
    return { success: false, error: error.toString() };
  }
}

// Delete data from sheet - Called by google.script.run.deleteData(id)
function deleteData(id) {
  try {
    const sheet = getOrCreateSheet();
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      throw new Error('ไม่พบข้อมูลที่จะลบ');
    }

    // Find the row with matching ID
    const idRange = sheet.getRange(2, 1, lastRow - 1, 1);
    const ids = idRange.getValues().flat();
    const rowIndex = ids.findIndex(rowId => rowId == id);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูลที่ต้องการลบ');
    }

    const actualRow = rowIndex + 2; // +2 because array is 0-indexed and we start from row 2
    sheet.deleteRow(actualRow);

    return {
      success: true,
      message: 'ลบข้อมูลสำเร็จ'
    };

  } catch (error) {
    console.error('Error in deleteData:', error);
    return { success: false, error: error.toString() };
  }
}

// Get list 
function getDropdownList() {
  const sheet = getOrCreateSheet('Dropdown list');
  const data = sheet.getDataRange().getValues();
  
  if (data.length === 0) return {};
  
  const [header, ...rows] = data;
  const dropdownlist = {};
  const numCols = header.length;
  
  // Pre-initialize arrays for each column
  for (let i = 0; i < numCols; i++) {
    dropdownlist[header[i]] = [];
  }
  
  // Use Sets for O(1) lookup instead of array.includes()
  const uniqueSets = Array.from({ length: numCols }, () => new Set());
  
  // Single pass through data
  for (let j = 0; j < rows.length; j++) {
    for (let i = 0; i < numCols; i++) {
      const cellValue = rows[j][i];
      if (cellValue && !uniqueSets[i].has(cellValue)) {
        uniqueSets[i].add(cellValue);
        dropdownlist[header[i]].push(cellValue);
      }
    }
  }
  
  return dropdownlist;
}

// Helper function to format date
function formatDate(date) {
  if (!date) return '';

  if (typeof date === 'string') {
    return date;
  }

  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return date.toString();
}

// Optimized date formatting for bulk operations
function formatDateFast(date) {
  if (!date) return '';

  if (typeof date === 'string') {
    return date;
  }

  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return date.toString();
}

// Test function to verify setup
function testSetup() {
  try {
    const sheet = getOrCreateSheet();
    console.log('Sheet created/found successfully:', sheet.getName());

    const testData = getData();
    console.log('Data retrieval test:', testData);

    return 'Setup completed successfully!';

  } catch (error) {
    console.error('Setup error:', error);
    return 'Setup failed: ' + error.toString();
  }
}

function migrateAddSolutionsColumn() {
  const sheet = getOrCreateSheet('ComplainData');
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    console.log('No data to migrate.');
    return;
  }

  // Insert new column for solutions at column 14
  sheet.insertColumnAfter(12);
  sheet.getRange(1, 13).setValue('แนวทางแก้ไข');

  // Migrate existing solution columns into JSON array
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 17); // Including old solution columns
  const data = dataRange.getValues();
  let idPrefix = 'F'
  for (let i = 0; i < data.length-1; i++) {
    const row = data[i];
    const solutions = [];

    // Assuming old solution columns are at index 13 and 14
    if (row[13]) solutions.push({id: idPrefix + String(i + 1).padStart(5, '0'), text: row[13], createAt: row[16]});
    if (row[14]) solutions.push({id: idPrefix + String(i + 1).padStart(5, '0'), text: row[14], createAt: row[16]});

    // Set JSON string in new solutions column
    row[12] = JSON.stringify(solutions);
    // Clear old solution columns
    // row[14] = '';
  }

  // Write back migrated data
  sheet.getRange(2, 1, lastRow - 1, 17).setValues(data);

  console.log('Migration completed successfully.');
}