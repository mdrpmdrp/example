// Utility Functions

/**
 * Get value from namedValues object
 */
function getVal(namedValues, key) {
  const v = namedValues[key];
  let val = Array.isArray(v) ? (v[0] || '') : (v || '');
  if(val instanceof Date){
    if(key === 'วันที่ให้บริการ'){
      val = Utilities.formatDate(val, TIMEZONE, 'dd/MM/yyyy');
    } else {
      val = Utilities.formatDate(val, TIMEZONE, 'HH:mm');
    }
  }
  return val;
}

/**
 * Parse date string (dd/MM/yyyy) and time string (HH:mm) into Date object
 */
function parseDateTime(dateStr, timeStr = '00:00') {
  if (!dateStr || !timeStr) return null;
  if(dateStr.getTime && timeStr.getTime){ // already a Date object
    return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate(), timeStr.getHours(), timeStr.getMinutes()); 
  }
  if (dateStr.includes('-')) {
    var [year, month, day] = dateStr.split('-').map(Number);
    var [hh, mm] = timeStr.split(':').map(Number);
  } else {
    var [day, month, year] = dateStr.split('/').map(Number);
    var [hh, mm] = timeStr.split(':').map(Number);
  }

  if (!day || !month || !year) return null;

  const dt = new Date(year, month - 1, day, hh || 0, mm || 0, 0);
  const iso = Utilities.formatDate(dt, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  return new Date(iso);
}

/**
 * Format date with Thai timezone
 */
function formatDate(date, format) {
  return Utilities.formatDate(date, TIMEZONE, format);
}

/**
 * Format time with Thai timezone
 */
function formatTime(date, format) {
  return Utilities.formatDate(date, TIMEZONE, format);
}