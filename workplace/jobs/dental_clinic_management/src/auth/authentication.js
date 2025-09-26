/**
 * User authentication functions
 * Handles user login, authentication, and basic user operations
 */

/**
 * Authenticate user login
 */
function authenticateUser(username, password) {
  try {
    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const data = usersSheet.getDataRange().getValues();

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (
        row[USER_COLUMNS.USERNAME] === username &&
        row[USER_COLUMNS.PASSWORD_HASH] === password &&
        row[USER_COLUMNS.STATUS] === "active"
      ) {
        return {
          success: true,
          message: "เข้าสู่ระบบสำเร็จ",
          user: {
            id: row[USER_COLUMNS.ID],
            username: row[USER_COLUMNS.USERNAME],
            userType: row[USER_COLUMNS.USER_TYPE],
            firstName: row[USER_COLUMNS.FIRST_NAME],
            lastName: row[USER_COLUMNS.LAST_NAME],
            email: row[USER_COLUMNS.EMAIL],
            phone: row[USER_COLUMNS.PHONE],
            branch: row[USER_COLUMNS.BRANCH],
            role: row[USER_COLUMNS.ROLE],
            status: row[USER_COLUMNS.STATUS],
          },
        };
      }
    }

    return {
      success: false,
      message: "ชื่อผู้ใช้ รหัสผ่าน หรือประเภทผู้ใช้ไม่ถูกต้อง",
    };
  } catch (error) {
    console.error("Error authenticating user:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Create new user account
 */
function createUser(userData) {
  try {
    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const lastRow = usersSheet.getLastRow();
    const newId = "U" + String(lastRow).padStart(3, "0");

    const newUser = [
      newId,
      userData.username,
      userData.password,
      userData.userType,
      userData.firstName,
      userData.lastName,
      userData.email,
      userData.phone,
      userData.branch || "BRANCH_01",
      userData.role || userData.userType,
      "active",
      new Date(),
      new Date(),
      "SYSTEM",
      "SYSTEM",
    ];

    usersSheet.getRange(lastRow + 1, 1, 1, newUser.length).setValues([newUser]);

    return {
      success: true,
      message: "สร้างบัญชีผู้ใช้เรียบร้อย",
      userId: newId,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: error.toString() };
  }
}