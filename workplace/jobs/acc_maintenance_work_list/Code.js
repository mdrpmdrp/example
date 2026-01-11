/**
 * Serve the HTML form
 */
function doGet() {
  const html = HtmlService.createTemplateFromFile('index').evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setTitle('ACC Maintenance Work List')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

/**
 * Handle form submission
 */
function submitWorkOrder(formData) {
  try {
    // Get the active spreadsheet and sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get or create the sheets
    let workOrderSheet = ss.getSheetByName('Work Orders');
    if (!workOrderSheet) {
      workOrderSheet = ss.insertSheet('Work Orders');
      createWorkOrderHeaders(workOrderSheet);
    }

    let contractorSheet = ss.getSheetByName('Contractors');
    if (!contractorSheet) {
      contractorSheet = ss.insertSheet('Contractors');
      createContractorHeaders(contractorSheet);
    }

    let sparePartsSheet = ss.getSheetByName('Spare Parts');
    if (!sparePartsSheet) {
      sparePartsSheet = ss.insertSheet('Spare Parts');
      createSparePartsHeaders(sparePartsSheet);
    }

    // Generate Work Order ID if not provided
    const workOrderId = formData.workOrder.workOrderID || generateWorkOrderId();
    
    // Add Work Order record
    const workOrderRow = [
      workOrderId,
      formData.workOrder.date || new Date().toLocaleDateString('en-CA'),
      formData.supervisor.userId || '',
      formData.supervisor.name || '',
      formData.supervisor.planDate || '',
      formData.supervisor.startTime || '',
      formData.supervisor.finishTime || '',
      formData.workOrder.details || '',
      new Date().toLocaleString('en-CA'),
      Utilities.getUuid()
    ];
    workOrderSheet.appendRow(workOrderRow);
    const workOrderRowId = workOrderSheet.getLastRow();

    // Add Contractor records
    if (formData.contractors && formData.contractors.length > 0) {
      formData.contractors.forEach((contractor, index) => {
        const contractorRow = [
          workOrderId,
          contractor.type || '',
          contractor.contractor || '',
          contractor.quantity || 0,
          contractor.planDate || '',
          contractor.startTime || '',
          contractor.finishTime || '',
          index + 1,
          new Date().toLocaleString('en-CA')
        ];
        contractorSheet.appendRow(contractorRow);
      });
    }

    // Add Spare Parts records
    if (formData.spareParts && formData.spareParts.length > 0) {
      formData.spareParts.forEach((part, index) => {
        const partRow = [
          workOrderId,
          part.id || '',
          part.size || '',
          part.unit || '',
          part.quantity || 0,
          index + 1,
          new Date().toLocaleString('en-CA')
        ];
        sparePartsSheet.appendRow(partRow);
      });
    }

    return {
      success: true,
      message: 'Work order saved successfully',
      workOrderId: workOrderId,
      timestamp: new Date().toLocaleString('en-CA')
    };

  } catch (error) {
    Logger.log('Error in submitWorkOrder: ' + error);
    return {
      success: false,
      message: 'Error saving work order: ' + error.toString(),
      error: error.toString()
    };
  }
}

/**
 * Create headers for Work Orders sheet
 */
function createWorkOrderHeaders(sheet) {
  const headers = [
    'Work Order ID',
    'Date',
    'Supervisor User ID',
    'Supervisor Name',
    'Supervisor Plan Date',
    'Supervisor Start Time',
    'Supervisor Finish Time',
    'Work Order Details',
    'Created At',
    'Record ID'
  ];
  sheet.appendRow(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#DC2626');
  headerRange.setFontColor('white');
  
  // Set column widths
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 200);
  sheet.setColumnWidth(9, 150);
  sheet.setColumnWidth(10, 200);
}

/**
 * Create headers for Contractors sheet
 */
function createContractorHeaders(sheet) {
  const headers = [
    'Work Order ID',
    'Contractor Type',
    'Contractor Name',
    'Quantity',
    'Plan Date',
    'Start Time',
    'Finish Time',
    'Item Number',
    'Created At'
  ];
  sheet.appendRow(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#DC2626');
  headerRange.setFontColor('white');
  
  // Set column widths
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 120);
  sheet.setColumnWidth(6, 120);
  sheet.setColumnWidth(7, 120);
  sheet.setColumnWidth(8, 100);
  sheet.setColumnWidth(9, 150);
}

/**
 * Create headers for Spare Parts sheet
 */
function createSparePartsHeaders(sheet) {
  const headers = [
    'Work Order ID',
    'Part ID',
    'Size',
    'Unit',
    'Quantity',
    'Item Number',
    'Created At'
  ];
  sheet.appendRow(headers);
  
  // Format header row
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#6B7280');
  headerRange.setFontColor('white');
  
  // Set column widths
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 150);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 150);
}

/**
 * Generate a unique Work Order ID
 */
function generateWorkOrderId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `WO-${year}${month}${day}-${random}`;
}

/**
 * Get all work orders
 */
function getWorkOrders(limit = 100) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Work Orders');
    
    if (!sheet) {
      return { success: false, message: 'Work Orders sheet not found' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1, Math.min(data.length, limit + 1));

    const workOrders = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return {
      success: true,
      count: workOrders.length,
      data: workOrders
    };

  } catch (error) {
    Logger.log('Error in getWorkOrders: ' + error);
    return {
      success: false,
      message: 'Error retrieving work orders: ' + error.toString()
    };
  }
}

/**
 * Get work order details by ID
 */
function getWorkOrderDetails(workOrderId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const workOrderSheet = ss.getSheetByName('Work Orders');
    const contractorSheet = ss.getSheetByName('Contractors');
    const sparePartsSheet = ss.getSheetByName('Spare Parts');

    if (!workOrderSheet) {
      return { success: false, message: 'Work Orders sheet not found' };
    }

    // Get work order
    const woData = workOrderSheet.getDataRange().getValues();
    const woHeaders = woData[0];
    let workOrder = null;

    for (let i = 1; i < woData.length; i++) {
      if (woData[i][0] === workOrderId) {
        workOrder = {};
        woHeaders.forEach((header, index) => {
          workOrder[header] = woData[i][index];
        });
        break;
      }
    }

    if (!workOrder) {
      return { success: false, message: 'Work order not found' };
    }

    // Get contractors
    let contractors = [];
    if (contractorSheet) {
      const ctData = contractorSheet.getDataRange().getValues();
      const ctHeaders = ctData[0];
      for (let i = 1; i < ctData.length; i++) {
        if (ctData[i][0] === workOrderId) {
          const contractor = {};
          ctHeaders.forEach((header, index) => {
            contractor[header] = ctData[i][index];
          });
          contractors.push(contractor);
        }
      }
    }

    // Get spare parts
    let spareParts = [];
    if (sparePartsSheet) {
      const spData = sparePartsSheet.getDataRange().getValues();
      const spHeaders = spData[0];
      for (let i = 1; i < spData.length; i++) {
        if (spData[i][0] === workOrderId) {
          const part = {};
          spHeaders.forEach((header, index) => {
            part[header] = spData[i][index];
          });
          spareParts.push(part);
        }
      }
    }

    return {
      success: true,
      workOrder: workOrder,
      contractors: contractors,
      spareParts: spareParts
    };

  } catch (error) {
    Logger.log('Error in getWorkOrderDetails: ' + error);
    return {
      success: false,
      message: 'Error retrieving work order details: ' + error.toString()
    };
  }
}

/**
 * Update work order
 */
function updateWorkOrder(workOrderId, formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const workOrderSheet = ss.getSheetByName('Work Orders');
    const contractorSheet = ss.getSheetByName('Contractors');
    const sparePartsSheet = ss.getSheetByName('Spare Parts');

    if (!workOrderSheet) {
      return { success: false, message: 'Work Orders sheet not found' };
    }

    // Find and update work order row
    const woData = workOrderSheet.getDataRange().getValues();
    const woHeaders = woData[0];
    let workOrderRowIndex = -1;

    for (let i = 1; i < woData.length; i++) {
      if (woData[i][0] === workOrderId) {
        workOrderRowIndex = i + 1;
        break;
      }
    }

    if (workOrderRowIndex === -1) {
      return { success: false, message: 'Work order not found' };
    }

    // Update work order row
    const workOrderRow = [
      workOrderId,
      formData.workOrder.date || new Date().toLocaleDateString('en-CA'),
      formData.supervisor.userId || '',
      formData.supervisor.name || '',
      formData.supervisor.planDate || '',
      formData.supervisor.startTime || '',
      formData.supervisor.finishTime || '',
      formData.workOrder.details || '',
      new Date().toLocaleString('en-CA'),
      woData[workOrderRowIndex - 1][9] // Keep original record ID
    ];

    workOrderSheet.getRange(workOrderRowIndex, 1, 1, workOrderRow.length).setValues([workOrderRow]);

    // Delete existing contractors and spare parts for this work order
    if (contractorSheet) {
      const ctData = contractorSheet.getDataRange().getValues();
      for (let i = ctData.length - 1; i > 0; i--) {
        if (ctData[i][0] === workOrderId) {
          contractorSheet.deleteRow(i + 1);
        }
      }
    }

    if (sparePartsSheet) {
      const spData = sparePartsSheet.getDataRange().getValues();
      for (let i = spData.length - 1; i > 0; i--) {
        if (spData[i][0] === workOrderId) {
          sparePartsSheet.deleteRow(i + 1);
        }
      }
    }

    // Add new contractors
    if (formData.contractors && formData.contractors.length > 0) {
      formData.contractors.forEach((contractor, index) => {
        const contractorRow = [
          workOrderId,
          contractor.type || '',
          contractor.contractor || '',
          contractor.quantity || 0,
          contractor.planDate || '',
          contractor.startTime || '',
          contractor.finishTime || '',
          index + 1,
          new Date().toLocaleString('en-CA')
        ];
        contractorSheet.appendRow(contractorRow);
      });
    }

    // Add new spare parts
    if (formData.spareParts && formData.spareParts.length > 0) {
      formData.spareParts.forEach((part, index) => {
        const partRow = [
          workOrderId,
          part.id || '',
          part.size || '',
          part.unit || '',
          part.quantity || 0,
          index + 1,
          new Date().toLocaleString('en-CA')
        ];
        sparePartsSheet.appendRow(partRow);
      });
    }

    return {
      success: true,
      message: 'Work order updated successfully',
      workOrderId: workOrderId,
      timestamp: new Date().toLocaleString('en-CA')
    };

  } catch (error) {
    Logger.log('Error in updateWorkOrder: ' + error);
    return {
      success: false,
      message: 'Error updating work order: ' + error.toString()
    };
  }
}

/**
 * Delete work order
 */
function deleteWorkOrder(workOrderId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const workOrderSheet = ss.getSheetByName('Work Orders');
    const contractorSheet = ss.getSheetByName('Contractors');
    const sparePartsSheet = ss.getSheetByName('Spare Parts');

    if (!workOrderSheet) {
      return { success: false, message: 'Work Orders sheet not found' };
    }

    // Delete work order row
    const woData = workOrderSheet.getDataRange().getValues();
    for (let i = woData.length - 1; i > 0; i--) {
      if (woData[i][0] === workOrderId) {
        workOrderSheet.deleteRow(i + 1);
      }
    }

    // Delete related contractors
    if (contractorSheet) {
      const ctData = contractorSheet.getDataRange().getValues();
      for (let i = ctData.length - 1; i > 0; i--) {
        if (ctData[i][0] === workOrderId) {
          contractorSheet.deleteRow(i + 1);
        }
      }
    }

    // Delete related spare parts
    if (sparePartsSheet) {
      const spData = sparePartsSheet.getDataRange().getValues();
      for (let i = spData.length - 1; i > 0; i--) {
        if (spData[i][0] === workOrderId) {
          sparePartsSheet.deleteRow(i + 1);
        }
      }
    }

    return {
      success: true,
      message: 'Work order deleted successfully',
      workOrderId: workOrderId
    };

  } catch (error) {
    Logger.log('Error in deleteWorkOrder: ' + error);
    return {
      success: false,
      message: 'Error deleting work order: ' + error.toString()
    };
  }
}
