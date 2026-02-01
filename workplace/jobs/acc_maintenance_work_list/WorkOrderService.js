/**
 * Work Order Service - Handles work order CRUD operations
 */

/**
 * Validate form data
 */
function validateWorkOrderData(formData) {
  const errors = [];

  if (!formData.supervisor?.userId) {
    errors.push('Supervisor User ID is required');
  }

  if (!formData.supervisor?.name) {
    errors.push('Supervisor name is required');
  }

  if (!formData.supervisor?.planDate) {
    errors.push('Plan date is required');
  }


  return errors;
}

/**
 * Submit new work order
 */
function submitWorkOrder(formData) {
  try {
    // Validate data
    const errors = validateWorkOrderData(formData);
    if (errors.length > 0) {
      return JSON.stringify({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    const ss = getSpreadsheet();
    const workOrderSheet = getSheet(CONFIG.SHEETS.WORK_ORDERS);
    if (!workOrderSheet) {
      return JSON.stringify({
        success: false,
        message: 'Work Orders sheet not found'
      });
    }
    // Prepare row data
    const newRow = [
      formData.workOrder?.workOrderID || '',
      formData.workOrder?.date || new Date().toLocaleDateString('en-CA'),
      formData.supervisor.userId,
      formData.supervisor.name,
      new Date(formData.supervisor.planDate),
      formData.supervisor.startTime || CONFIG.DEFAULT_TIMES.START,
      formData.supervisor.finishTime || CONFIG.DEFAULT_TIMES.FINISH,
      formData.workOrder?.details || '',
      formData.contractors ? JSON.stringify(formData.contractors) : '[]',
      formData.spareParts ? JSON.stringify(formData.spareParts) : '[]',
      formData.externalCost || 0,
      CONFIG.STATUS.IN_PROGRESS,
      new Date(),
      Utilities.getUuid()
    ];

    workOrderSheet.appendRow(newRow);
    if (!formData.workOrder?.workOrderID || formData.workOrder?.workOrderID === '') {
      // send Line to admin group to notify to create work order ID
      const message = `New Work Order Submitted:
Supervisor: ${formData.supervisor.name} (ID: ${formData.supervisor.userId})
Plan Date: ${formData.supervisor.planDate}
Work Time: ${formData.supervisor.startTime} - ${formData.supervisor.finishTime}

Work Details: ${formData.workOrder?.details || 'N/A'}

Materials: ${formData.spareParts && formData.spareParts.length > 0 ? formData.spareParts.map((part, i) => {
        return `\n${i + 1}. ${part.id} | Size: ${part.size} | Qty: ${part.quantity}`;
      }).join('') : 'No spare parts provided'}

External Cost: ${formData.externalCost || 0}

Contractors: ${formData.contractors && formData.contractors.length > 0 ? formData.contractors.map((contractor, i) => {
        return `\n${i + 1}. ${contractor.contractor === 'อื่นๆ (กรอกเอง)' ? contractor.customName : contractor.contractor} | Qty: ${contractor.quantity}`;
      }).join('') : 'No contractors provided'}`;
      sendNotification(message);
    }

    // Clear cache to refresh dashboard
    clearDataCache();

    return JSON.stringify({
      success: true,
      message: 'Work order saved successfully',
      recordId: newRow[12]
    });

  } catch (error) {
    Logger.log('Error in submitWorkOrder: ' + error);
    return JSON.stringify({
      success: false,
      message: 'Error saving work order: ' + error.toString(),
      error: error.toString()
    });
  }
}

/**
 * Update existing work order
 */
function updateWorkOrder(formData) {
  try {
    // Validate data
    const errors = validateWorkOrderData(formData);
    if (errors.length > 0) {
      return JSON.stringify({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    const ss = getSpreadsheet();
    const workOrderSheet = ss.getSheetByName(CONFIG.SHEETS.WORK_ORDERS);

    if (!workOrderSheet) {
      return JSON.stringify({
        success: false,
        message: 'Work Orders sheet not found'
      });
    }

    // Find work order by recordId
    const values = workOrderSheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < values.length; i++) {
      if (values[i][CONFIG.WORK_ORDER_COLUMNS.RECORD_ID] === formData.recordId) {
        rowIndex = i + 1; // Sheet rows are 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      return JSON.stringify({
        success: false,
        message: 'Work order not found'
      });
    }

    // Update row data (keep original recordId)
    const updateRow = [
      formData.workOrder?.workOrderID || '',
      formData.workOrder?.date.split('T')[0] || new Date().toLocaleDateString('en-CA'),
      formData.supervisor.userId,
      formData.supervisor.name,
      new Date(formData.supervisor.planDate),
      formData.supervisor.startTime || CONFIG.DEFAULT_TIMES.START,
      formData.supervisor.finishTime || CONFIG.DEFAULT_TIMES.FINISH,
      formData.workOrder?.details || '',
      formData.contractors ? JSON.stringify(formData.contractors) : '[]',
      formData.spareParts ? JSON.stringify(formData.spareParts) : '[]',
      formData.externalCost || 0,
      formData.status || CONFIG.STATUS.IN_PROGRESS,
      new Date(), // Update timestamp
      formData.recordId // Keep original recordId
    ];

    workOrderSheet.getRange(rowIndex, 1, 1, updateRow.length)
      .setValues([updateRow]);

    // Clear cache
    clearDataCache();

    return JSON.stringify({
      success: true,
      message: 'Work order updated successfully',
      recordId: formData.recordId,
      timestamp: new Date().toLocaleString('en-CA')
    });

  } catch (error) {
    Logger.log('Error in updateWorkOrder: ' + error);
    return JSON.stringify({
      success: false,
      message: 'Error updating work order: ' + error.toString()
    });
  }
}

/**
 * Delete work order by recordId
 */
function deleteWorkOrder(recordId) {
  try {
    const ss = getSpreadsheet();
    const workOrderSheet = ss.getSheetByName(CONFIG.SHEETS.WORK_ORDERS);

    if (!workOrderSheet) {
      return JSON.stringify({
        success: false,
        message: 'Work Orders sheet not found'
      });
    }

    const values = workOrderSheet.getDataRange().getValues();

    for (let i = values.length - 1; i >= 1; i--) {
      if (values[i][CONFIG.WORK_ORDER_COLUMNS.RECORD_ID] === recordId) {
        workOrderSheet.deleteRow(i + 1);
        clearDataCache();

        return JSON.stringify({
          success: true,
          message: 'Work order deleted successfully'
        });
      }
    }

    return JSON.stringify({
      success: false,
      message: 'Work order not found'
    });

  } catch (error) {
    Logger.log('Error in deleteWorkOrder: ' + error);
    return JSON.stringify({
      success: false,
      message: 'Error deleting work order: ' + error.toString()
    });
  }
}

