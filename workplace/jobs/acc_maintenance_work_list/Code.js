/**
 * Serve the HTML form
 */
function doGet() {
  let html = HtmlService.createTemplateFromFile('index')
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  html.contractorList = getContractorList(ss);
  html.supervisorList = getSupervisorList(ss);
  html = html.evaluate()
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setTitle('ACC Maintenance Work List')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return html;
}

function getContractorList(ss) {
  let sheet = ss.getSheetByName('Contractors');
  let [header, ...data] = sheet.getDataRange().getValues()
  data = data.filter(row => row[0]).map(row => {
    return {
      type: row[0].toLowerCase(),
      contractor: row[1],
      me: row[2],
      capacity: row[3]
    }
  });
  return data;
}

function getSupervisorList(ss) {
  let sheet = ss.getSheetByName('Supervisors');
  let [header, ...data] = sheet.getDataRange().getValues()
  data = data.filter(row => row[0]).map(row => {
    return {
      userId: row[1],
      name: row[2],
      me: row[3],
      mainDuty: row[4],
      contractors: [row[5], row[6], row[7]]
    }
  });
  return data;
}

/**
 * Handle form submission
 */
function submitWorkOrder(formData) {
  formData = {
    "supervisor": {
        "userId": "10125",
        "name": "อภิลักษณ์",
        "planDate": "2026-01-14",
        "startTime": "08:00",
        "finishTime": "17:00"
    },
    "workOrder": {
        "date": "14/01/2026",
        "workOrderID": "",
        "details": ""
    },
    "contractors": [
        {
            "type": "internal",
            "contractor": "EME",
            "quantity": "4",
            "planDate": "2026-01-14",
            "startTime": "08:00",
            "finishTime": "17:00"
        }
    ],
    "spareParts": [
        {
            "id": "sdcsfc",
            "size": "1000",
            "unit": "asd",
            "quantity": "20"
        }
    ]
}
  try {
    // Get the active spreadsheet and sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create the sheets
    let workOrderSheet = ss.getSheetByName('Work Orders');
    if (!workOrderSheet) {
      workOrderSheet = ss.insertSheet('Work Orders');
      createWorkOrderHeaders(workOrderSheet);
    }

    let newRow = [
      formData.workOrder?.workOrderID,
      formData.workOrder?.date || new Date().toLocaleDateString('en-CA'),
      formData.supervisor?.userId || '',
      formData.supervisor?.name || '',
      formData.supervisor?.planDate || '',
      formData.supervisor?.startTime || '',
      formData.supervisor?.finishTime || '',
      formData.workOrder?.details || '',
      formData.contractors ? JSON.stringify(formData.contractors) : '',
      formData.spareParts ? JSON.stringify(formData.spareParts) : '',
      'in progress',
      new Date(),
      Utilities.getUuid()
    ]
    workOrderSheet.appendRow(newRow);
    return JSON.stringify({
      success: true,
      message: 'Work order saved successfully',
    });

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
 * Get dashboard data
 */
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const workOrderSheet = ss.getSheetByName('Work Orders');
    if (!workOrderSheet) {
      return JSON.stringify({
        success: false,
        message: 'Work Orders sheet not found',
      });
    }
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    let woData = workOrderSheet.getDataRange().getValues()
    .slice(1) // Skip header
    .filter(row => {
      let planDate = new Date(row[4]);
      planDate.setHours(0, 0, 0, 0);
      return planDate >= today;
    });
    woData = woData.map(row => {
      return {
        supervisor: {
          userId: row[2],
          name: row[3],
          planDate: row[4],
          startTime: row[5],
          finishTime: row[6]
        },
        workOrder: {
          date: row[1],
          workOrderID: row[0],
          details: row[7]
        },
        contractors: row[8] ? JSON.parse(row[8]) : [],
        spareParts: row[9] ? JSON.parse(row[9]) : [],
        status: row[10],
        timestamp: row[11],
        recordId: row[12]
      };
    });
    return JSON.stringify({
      success: true,
      message: 'Dashboard data retrieved successfully',
      data: woData
    });
  } catch (error) {
    Logger.log('Error in getDashboardData: ' + error);
    return JSON.stringify({
      success: false,
      message: 'Error getting dashboard data: ' + error.toString(),
      data: {
        departments: []
      }
    });
  }
}

/**
 * Extract section from work order details
 */
function extractSection(details) {
  if (!details) return 'General';

  const lower = details.toLowerCase();
  if (lower.includes('crusher') || lower.includes('raw mill') || lower.includes('coal mill')) {
    return 'Crusher & Raw mill & Coal mill';
  }
  if (lower.includes('cement mill')) {
    return 'Cement mill';
  }
  if (lower.includes('kiln')) {
    return 'Kiln';
  }

  return 'General';
}

/**
 * Get contractor capacity
 */
function getContractorCapacity(contractorName) {
  const capacities = {
    'Bank': 16,
    'External': 0,
    'Chanchai': 10,
    'LM': 8
  };

  return capacities[contractorName] || 0;
}

/**
 * Determine work order status based on dates and times
 */
function determineWorkOrderStatus(planDate, startTime, finishTime) {
  if (!planDate) return 'pending';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const planned = new Date(planDate);
  planned.setHours(0, 0, 0, 0);

  if (planned < today) {
    return 'completed';
  } else if (planned.getTime() === today.getTime()) {
    return 'in progress';
  } else {
    return 'pending';
  }
}
/**
 * Populate sample data for demo (run this once to add test data)
 */
function populateSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get or create sheets
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

  // Sample data matching the image
  const sampleWorkOrders = [

  ];

  const today = new Date().toLocaleDateString('en-CA');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('en-CA');

  // Add sample work orders
  sampleWorkOrders.forEach((wo, index) => {
    const planDate = wo.status === 'completed' ? yesterdayStr : today;
    const workOrderRow = [
      wo.id,
      today,
      wo.supervisorId,
      wo.supervisorName,
      planDate,
      '08:00',
      '17:00',
      wo.details,
      new Date().toLocaleString('en-CA'),
      Utilities.getUuid()
    ];
    workOrderSheet.appendRow(workOrderRow);

    // Add contractors
    wo.contractors.forEach((contractor, idx) => {
      const times = contractor.time.split(' - ');
      const contractorRow = [
        wo.id,
        contractor.type,
        contractor.name,
        contractor.quantity,
        planDate,
        times[0],
        times[1],
        idx + 1,
        new Date().toLocaleString('en-CA')
      ];
      contractorSheet.appendRow(contractorRow);
    });
  });

  Logger.log('Sample data populated successfully');
  return { success: true, message: 'Sample data added successfully' };
}
