// Solution Management Module
// File: solutionManagement.js

/**
 * Add solution to a complaint
 * @param {string} complainId - ID of the complaint
 * @param {Object} solutionData - Solution data object
 * @returns {string} JSON string with success status and solution
 */
function addSolution({complainId, solutionData}) {
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, complainId);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูล Complain ที่ต้องการเพิ่มแนวทางแก้ไข');
    }

    const actualRow = rowIndex + 2;
    
    // Get current solutions using helper
    const solutionsStr = sheet.getRange(actualRow, 13).getValue();
    const solutions = parseSolutionsJson(solutionsStr);
    
    // Create new solution with unique ID
    const newSolution = {
      id: getFollowUpId(),
      text: solutionData.text,
      team: solutionData.team,
      rep: solutionData.rep,
      date: solutionData.date,
      createAt: new Date().toISOString(),
      images: solutionData.images || []
    };
    
    solutions.push(newSolution);
    
    // Batch update: solutions and timestamp together
    const now = new Date();
    sheet.getRange(actualRow, 13).setValue(JSON.stringify(solutions));
    sheet.getRange(actualRow, 15).setValue(now);
    newSolution
    DriveApp.getFolderById(solutionData.folderId).setName(newSolution.id);

    return JSON.stringify({
      success: true,
      message: 'เพิ่มแนวทางแก้ไขสำเร็จ',
      solution: newSolution
    });

  } catch (error) {
    console.error('Error in addSolution:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Update solution in a complaint
 * @param {string} complainId - ID of the complaint
 * @param {string} solutionId - ID of the solution to update
 * @param {Object} solutionData - Updated solution data
 * @returns {string} JSON string with success status and updated solution
 */
function updateSolution({complainId, solutionId, solutionData}) {
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, complainId);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูล Complain ที่ต้องการแก้ไข');
    }

    const actualRow = rowIndex + 2;
    
    // Get current solutions using helper
    const solutionsStr = sheet.getRange(actualRow, 13).getValue();
    const solutions = parseSolutionsJson(solutionsStr);
    
    if (solutions.length === 0) {
      throw new Error('ไม่สามารถอ่านข้อมูลแนวทางแก้ไขได้');
    }
    
    // Find and update the solution
    const solutionIndex = solutions.findIndex(sol => sol.id === solutionId);
    
    if (solutionIndex === -1) {
      throw new Error('ไม่พบแนวทางแก้ไขที่ต้องการแก้ไข');
    }
    
    // Update solution keeping the original ID and createAt
    solutions[solutionIndex] = {
      id: solutionId,
      text: solutionData.text,
      team: solutionData.team,
      rep: solutionData.rep,
      date: solutionData.date,
      createAt: solutions[solutionIndex].createAt, // Keep original creation time
      updateAt: new Date().toISOString(), // Add update timestamp
      images: solutionData.images || []
    };
    
    // Save back to sheet
    const solutionsCell = sheet.getRange(actualRow, 13);
    solutionsCell.setValue(JSON.stringify(solutions));
    
    // Update timestamp in column 15
    sheet.getRange(actualRow, 15).setValue(new Date());

    return JSON.stringify({
      success: true,
      message: 'แก้ไขแนวทางแก้ไขสำเร็จ',
      solution: solutions[solutionIndex]
    });
  } catch (error) {
    console.error('Error in updateSolution:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Delete solution from a complaint
 * @param {string} complainId - ID of the complaint
 * @param {string} solutionId - ID of the solution to delete
 * @returns {string} JSON string with success status
 */
function deleteSolution({complainId, solutionId}) {
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, complainId);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูล Complain ที่ต้องการลบแนวทางแก้ไข');
    }

    const actualRow = rowIndex + 2;
    
    // Get current solutions using helper
    const solutionsStr = sheet.getRange(actualRow, 13).getValue();
    const solutions = parseSolutionsJson(solutionsStr);
    
    if (solutions.length === 0) {
      throw new Error('ไม่สามารถอ่านข้อมูลแนวทางแก้ไขได้');
    }
    
    // Find and remove the solution
    const solutionIndex = solutions.findIndex(sol => sol.id === solutionId);
    
    if (solutionIndex === -1) {
      throw new Error('ไม่พบแนวทางแก้ไขที่ต้องการลบ');
    }

    const folder = getOrCreateFolder(complainId, DriveApp.getFolderById(MAIN_FOLDER_ID));
    const solutionFolder = getOrCreateFolder(solutionId, folder);
    if (solutionFolder) {
      solutionFolder.setTrashed(true);
    }
    
    // Remove solution from array
    solutions.splice(solutionIndex, 1);
    
    // Save back to sheet
    const solutionsCell = sheet.getRange(actualRow, 13);
    solutionsCell.setValue(JSON.stringify(solutions));
    
    // Update timestamp in column 15
    sheet.getRange(actualRow, 15).setValue(new Date());

    return JSON.stringify({
      success: true,
      message: 'ลบแนวทางแก้ไขสำเร็จ'
    });

  } catch (error) {
    console.error('Error in deleteSolution:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}

/**
 * Get solutions for a specific complaint
 * @param {string} complainId - ID of the complaint
 * @returns {string} JSON string with success status and solutions array
 */
function getSolutions(complainId) {
  try {
    const sheet = getOrCreateSheet();
    const rowIndex = findRowIndexById(sheet, complainId);

    if (rowIndex === -1) {
      throw new Error('ไม่พบข้อมูล Complain');
    }

    const actualRow = rowIndex + 2;
    
    // Get solutions using helper
    const solutionsStr = sheet.getRange(actualRow, 13).getValue();
    const solutions = parseSolutionsJson(solutionsStr);

    return JSON.stringify({
      success: true,
      data: solutions
    });

  } catch (error) {
    console.error('Error in getSolutions:', error);
    return JSON.stringify({ success: false, error: error.toString() });
  }
}