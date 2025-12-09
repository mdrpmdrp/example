// Sheet Operations Module
// File: sheetOperations.js

/**
 * Initialize spreadsheet and create sheet if not exists
 * @param {string} sheetName - Name of the sheet to get or create
 * @returns {Sheet} The sheet object
 */
function getOrCreateSheet(sheetName = 'ComplainData') {
  // Check cache first
  const cachedSheet = getCachedSheet(sheetName);
  if (cachedSheet) {
    return cachedSheet;
  }

  const ss = getCachedSpreadsheet();
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
  setCachedSheet(sheetName, sheet);

  return sheet;
}

/**
 * Helper function to find row index by ID (reusable)
 * @param {Sheet} sheet - Sheet object
 * @param {string} targetId - ID to search for
 * @returns {number} Row index (0-based) or -1 if not found
 */
function findRowIndexById(sheet, targetId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  return ids.findIndex(id => id == targetId);
}

/**
 * Get dropdown list data from sheet
 * @returns {string} JSON string of dropdown list data
 */
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
  
  return JSON.stringify(dropdownlist);
}

/**
 * Migration function to add solutions column
 */
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
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 17);
  const data = dataRange.getValues();
  let idPrefix = 'F'
  
  for (let i = 0; i < data.length - 1; i++) {
    const row = data[i];
    const solutions = [];

    // Assuming old solution columns are at index 13 and 14
    if (row[13]) solutions.push({id: idPrefix + String(i + 1).padStart(5, '0'), team: row[10], rep: row[11], text: row[13], createAt: row[16]});
    if (row[14]) solutions.push({id: idPrefix + String(i + 1).padStart(5, '0'), team: row[10], rep: row[11], text: row[14], createAt: row[16]});

    // Set JSON string in new solutions column
    row[12] = JSON.stringify(solutions);
  }

  // Write back migrated data
  sheet.getRange(2, 1, lastRow - 1, 17).setValues(data);

  console.log('Migration completed successfully.');
}
