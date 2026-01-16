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
