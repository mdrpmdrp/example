// /**
//  * DEPRECATED: This file has been refactored into multiple files for better organization
//  * 
//  * New structure:
//  * - Main.js: Entry point and request handling
//  * - Config.js: Configuration and constants
//  * - DataService.js: Data retrieval and caching
//  * - WorkOrderService.js: Work order CRUD operations
//  * - Utils.js: Utility functions
//  * 
//  * Please use the new files instead.
//  * This file is kept for backwards compatibility only.
//  */

// /**
//  * Serve the HTML form
//  * @deprecated Use Main.js instead
//  */
// function doGet() {
//   try {
//     const html = HtmlService.createTemplateFromFile('index');
//     const ss = getSpreadsheet();
    
//     html.contractorList = getContractorList(ss);
//     html.supervisorList = getSupervisorList(ss);
    
//     return html.evaluate()
//       .setSandboxMode(HtmlService.SandboxMode.IFRAME)
//       .setTitle('ACC Maintenance Work List')
//       .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      
//   } catch (error) {
//     Logger.log('Error in doGet: ' + error);
//     return HtmlService.createHtmlOutput(
//       '<h1>Error loading application</h1><p>' + error.toString() + '</p>'
//     );
//   }
// }

// /**
//  * @deprecated Use DataService.js functions instead
//  */
// function getContractorList(ss) {
//   // Redirect to new implementation
//   return getContractorList(ss);
// }

// /**
//  * @deprecated Use DataService.js functions instead
//  */
// function getSupervisorList(ss) {
//   // Redirect to new implementation
//   return getSupervisorList(ss);
// }

// /**
//  * Handle form submission
//  */
// function submitWorkOrder(formData) {
//   formData = {
//     "supervisor": {
//         "userId": "10125",
//         "name": "อภิลักษณ์",
//         "planDate": "2026-01-14",
//         "startTime": "08:00",
//         "finishTime": "17:00"
//     },
//     "workOrder": {
//         "date": "14/01/2026",
//         "workOrderID": "",
//    @deprecated Use WorkOrderService.js instead
//  */
// function submitWorkOrder(formData) {
//   // Redirect to new implementation in WorkOrderService.js
//   return submitWorkOrder(formData); if (!workOrderSheet) {
//       return { success: false, message: 'Work Orders sheet not found' };
//     }

//     // Find and update work order row
//     const woData = workOrderSheet.getDataRange().getValues();
//     const woHeaders = woData[0];
//     let workOrderRowIndex = -1;

//     for (let i = 1; i < woData.length; i++) {
//       if (woData[i][0] === workOrderId) {
//         workOrderRowIndex = i + 1;
//         break;
//       }
//     }

//     if (workOrderRowIndex === -1) {
//       return { success: false, message: 'Work order not found' };
//     }

//     // Update work order row
//     const workOrderRow = [
//       workOrderId,
//       formData.workOrder.date || new Date().toLocaleDateString('en-CA'),
//       formData.supervisor.userId || '',
//       formData.supervisor.name || '',
//       formData.supervisor.planDate || '',
//       formData.supervisor.startTime || '',
//       formData.supervisor.finishTime || '',
//       formData.workOrder.details || '',
//       new Date().toLocaleString('en-CA'),
//       woData[workOrderRowIndex - 1][9] // Keep original record ID
//     ];

//     workOrderSheet.getRange(workOrderRowIndex, 1, 1, workOrderRow.length).setValues([workOrderRow]);

//     // Delete existing contractors and spare parts for this work order
//     if (contractorSheet) {
//       const ctData = contractorSheet.getDataRange().getValues();
//       for (let i = ctData.length - 1; i > 0; i--) {
//         if (ctData[i][0] === workOrderId) {
//           contractorSheet.deleteRow(i + 1);
//         }
//       }
//     }

//     if (sparePartsSheet) {
//       const spData = sparePartsSheet.getDataRange().getValues();
//       for (let i = spData.length - 1; i > 0; i--) {
//         if (spData[i][0] === workOrderId) {
//           sparePartsSheet.deleteRow(i + 1);
//         }
//       }
//     }

//     // Add new contractors
//     if (formData.contractors && formData.contractors.length > 0) {
//       formData.contractors.forEach((contractor, index) => {
//         const contractorRow = [
//           workOrderId,
//           contractor.type || '',
//    @deprecated Use WorkOrderService.js instead
//  */
// function updateWorkOrder(recordId, formData) {
//   // Redirect to new implementation in WorkOrderService.js
//   return updateWorkOrder(recordId, formData);onst lower = details.toLowerCase();
//   if (lower.includes('crusher') || lower.includes('raw mill') || lower.includes('coal mill')) {
//     return 'Crusher & Raw mill & Coal mill';
//   }
//   if (lower.includes('cement mill')) {
//     return 'Cement mill';
//   }
//   if (lower.includes('kiln')) {
//     return 'Kiln';
//   }

//   return 'General';
// }

// /**
//  * Get contractor capacity
//  */
// function getContractorCapacity(contractorName) {
//   const capacities = {
//     'Bank': 16,
//     'External': 0,
//     'Chanchai': 10,
//     'LM': 8
//   };

//   return capacities[contractorName] || 0;
// }

// /**
//  * Determine work order status based on dates and times
//  */
// function determineWorkOrderStatus(planDate, startTime, finishTime) {
//   if (!planDate) return 'pending';

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const planned = new Date(planDate);
//   planned.setHours(0, 0, 0, 0);

//   if (planned < today) {
//     return 'completed';
//   } else if (planned.getTime() === today.getTime()) {
//     return 'in progress';
//   } else {
//     return 'pending';
//   }
// }
// /**
//  * @deprecated Sample data function removed for production
//  * Use the UI to create work orders instead
//  */