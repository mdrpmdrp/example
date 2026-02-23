/**
 * Utility functions
 */

/**
 * Extract section from work order details
 */
function extractSection(details) {
  if (!details) return 'General';
  
  const lower = details.toLowerCase();
  
  const sectionMapping = [
    { keywords: ['crusher', 'raw mill', 'coal mill'], section: 'Crusher & Raw mill & Coal mill' },
    { keywords: ['cement mill'], section: 'Cement mill' },
    { keywords: ['kiln'], section: 'Kiln' }
  ];
  
  for (const mapping of sectionMapping) {
    if (mapping.keywords.some(keyword => lower.includes(keyword))) {
      return mapping.section;
    }
  }
  
  return 'General';
}


/**
 * Format date to Thai locale
 */
function formatDateThai(date) {
  if (!date) return '';
  
  const d = new Date(date);
  const options = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  };
  
  return d.toLocaleDateString('th-TH', options);
}

/**
 * Validate time format (HH:mm)
 */
function isValidTime(time) {
  if (!time) return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate date format
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Safe JSON parse with fallback
 */
function safeJsonParse(jsonString, fallback = null) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    Logger.log('JSON parse error: ' + e);
    return fallback;
  }
}

/**
 *  Send notification via messaging API
 */
function sendNotification( message) {
  try {
    const lineEndpoint = CONFIG.MESSAGING_API.URL.PUSH_MESSAGE;
    const payload = {
      to: CONFIG.MESSAGING_API.ADMIN_GROUP,
      messages: [
        {
          type: 'text',
          text: message
        }
      ],
      notificationDisabled: false
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + CONFIG.MESSAGING_API.ACCESS_TOKEN
      },
      payload: JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(lineEndpoint, options);
  } catch (error) {
    Logger.log('Error sending notification: ' + error);
  }
}

function sendEmailDailySummary() {
  let today = new Date();
  let yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  const ss = getSpreadsheet();
  const workOrderSheet = ss.getSheetByName(CONFIG.SHEETS.WORK_ORDERS);
  
  if (!workOrderSheet) {
    Logger.log('Work Orders sheet not found for daily summary');
    return;
  }
  
  const values = workOrderSheet.getDataRange().getValues();
  const headers = values[0];
  
  let summary = 'Daily Work Order Summary for ' + formatDateThai(yesterday) + '\n\n';
  let hasEntries = false;
  let bodyHtml = '<h2>Daily Work Order Summary for ' + formatDateThai(yesterday) + '</h2><table border="1" cellpadding="5" cellspacing="0"><tr><th>Supervisor ID</th><th>Supervisor Name</th><th>Work Order ID</th><th>Start Time</th><th>Finish Time</th><th>Work Hours</th><th>Details</th><th>Contractors</th><th>Q\'ty Contractor</th></tr>';
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const dateCell = row[CONFIG.WORK_ORDER_COLUMNS.DATE];
    
    if (dateCell instanceof Date && dateCell.toDateString() === yesterday.toDateString()) {
      hasEntries = true;
      const supervisorID = row[CONFIG.WORK_ORDER_COLUMNS.SUPERVISOR_ID];
      const supervisorName = row[CONFIG.WORK_ORDER_COLUMNS.SUPERVISOR_NAME];
      const workOrderID = row[CONFIG.WORK_ORDER_COLUMNS.ID];
      const supervisorPlanDate = row[CONFIG.WORK_ORDER_COLUMNS.PLAN_DATE];
      const supervisorStartTime = row[CONFIG.WORK_ORDER_COLUMNS.START_TIME];
      const supervisorFinishTime = row[CONFIG.WORK_ORDER_COLUMNS.FINISH_TIME];
      const workHours = supervisorFinishTime && supervisorStartTime ? Math.floor((supervisorFinishTime - supervisorStartTime) / (1000 * 60 * 60)) : 'N/A';
      const details = row[CONFIG.WORK_ORDER_COLUMNS.DETAILS];
      const contractors = safeJsonParse(row[CONFIG.WORK_ORDER_COLUMNS.CONTRACTORS_JSON], [])
      const contractorNames = contractors.map(c => (c.customName || c.contractor)).join(', ') || 'No contractors';
      const contractorQuantities = contractors.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
      const rowColor = i % 2 === 0 ? '#ffffff' : '#f5f5f5';
      bodyHtml += `<tr style="background-color: ${rowColor}"><td>${supervisorID}</td><td>${supervisorName}</td><td>${workOrderID}</td><td>${Utilities.formatDate(supervisorStartTime, Session.getScriptTimeZone(), 'HH:mm')}</td><td>${Utilities.formatDate(supervisorFinishTime, Session.getScriptTimeZone(), 'HH:mm')}</td><td>${workHours}</td><td>${details}</td><td>${contractorNames}</td><td>${contractorQuantities}</td></tr>`;
    }
  }
  
  if (!hasEntries) {
    summary += 'No work orders created or updated yesterday.';
  }
  
  bodyHtml += '</table>';
  
  // Send email
  const subject = 'Daily Work Order Summary - ' + formatDateThai(yesterday);
  const emails = ss.getSheetByName(CONFIG.SHEETS.EMAILS).getDataRange().getValues().slice(1).map(row => row[1]).filter(email => email);
  if (emails.length > 0) {
    MailApp.sendEmail({
      to: emails.join(','),
      subject: subject,
      htmlBody: bodyHtml
    });
  } else {
    Logger.log('No email recipients found in Emails sheet');
  }
}