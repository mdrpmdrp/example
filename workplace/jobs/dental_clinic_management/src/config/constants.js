/**
 * Configuration constants and sheet definitions
 * Contains all the constant values used throughout the application
 */

// Sheet names
const SHEET_NAMES = {
  PATIENTS: "Patients",
  APPOINTMENTS: "Appointments",
  REVENUE: "Revenue",
  USERS: "Users",
  DOCTORS: "Doctors",
  OPTION_LIST: "Option List",
  TODAY_APPOINTMENTS: "Today Appointments",
  APPOINTMENT_REMINDERS: "Appointment Reminders",
};

// Users sheet column indices (0-based)
const USER_COLUMNS = {
  ID: 0,
  USERNAME: 1,
  PASSWORD_HASH: 2,
  USER_TYPE: 3,
  FIRST_NAME: 4,
  LAST_NAME: 5,
  EMAIL: 6,
  PHONE: 7,
  BRANCH: 8,
  ROLE: 9,
  STATUS: 10,
  CREATED_AT: 11,
  UPDATED_AT: 12,
  CREATED_BY_USER: 13,
  UPDATED_BY_USER: 14,
};

// Cache configuration
const CACHE_DURATION = 30000; // 30 seconds cache
const CACHE_WARMING_COOLDOWN = 10000; // 10 seconds cooldown between warming attempts
const CACHE_WARMING_TIMEOUT = 5000; // 5 seconds max for cache warming

const LINE_CHANNEL_ACCESS_TOKEN = "ecVNzBBPjFD49raGTWwnPF8OHJFXAEHZ1wnGM6Iq7sMRzJhDFeeg0SEzcbosvSMPTQkkQNtstPGbsJasKBz64VtHCIox8/5B9RpSeJNe2/UFNQqnGHKC+fDnG7WVgOTzoh1JIxyAeR8KZuRN+NW0EQdB04t89/1O/w1cDnyilFU="