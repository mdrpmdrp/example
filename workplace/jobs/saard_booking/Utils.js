// Utility Functions

/**
 * Get value from namedValues object
 */
function getVal(namedValues, key) {
  const v = namedValues[key];
  return Array.isArray(v) ? (v[0] || '') : (v || '');
}

/**
 * Parse date string (dd/MM/yyyy) and time string (HH:mm) into Date object
 */
function parseDateTime(dateStr, timeStr='00:00') {
  if (!dateStr || !timeStr) return null;
  const [day, month, year] = dateStr.split('/').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);

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