/**
 * User management functions
 * Handles CRUD operations for user accounts with role-based access control
 */

/**
 * Get all users with role-based filtering
 */
function getAllUsers(currentUser = null) {
  try {
    if (!currentUser) {
      return JSON.stringify({
        success: false,
        message: "กรุณาเข้าสู่ระบบก่อน",
      });
    }

    // Check permissions - only admin and super_admin can view users
    if (!checkPermission(currentUser.role, "canManageUsers")) {
      return JSON.stringify({
        success: false,
        message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้",
      });
    }

    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const data = usersSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, users: [] });
    }

    const headers = data[0];
    let users = data.slice(1).map((row) => {
      const user = {};
      headers.forEach((header, index) => {
        user[header.toLowerCase().replace(/\s+/g, "_")] = row[index];
      });
      return user;
    });

    // Filter users based on role permissions
    if (currentUser.role === "admin") {
      // Admin can only see users in same branch (and themselves)
      users = users.filter(
        (user) =>
          user.branch === currentUser.branch || user.id === currentUser.id
      );
    }
    // super_admin can see all users included other super_admins and own data

    return JSON.stringify({ success: true, users });
  } catch (error) {
    console.error("Error getting users:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Add new user
 */
function addUser(userData, currentUser = null) {
  try {
    if (!currentUser) {
      return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
    }

    // Check permissions
    if (!checkPermission(currentUser.role, "canManageUsers")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการผู้ใช้" };
    }

    // Validate role permissions
    if (currentUser.role === "admin") {
      // Admin can only create users in same branch and cannot create super_admin
      if (userData.branch !== currentUser.branch) {
        return { success: false, message: "คุณไม่สามารถสร้างผู้ใช้ในสาขาอื่นได้" };
      }
      if (userData.role === "super_admin") {
        return { success: false, message: "คุณไม่สามารถสร้างผู้ใช้ระดับ Super Admin ได้" };
      }
    }

    const usersSheet = getSheet(SHEET_NAMES.USERS);

    // Check if username already exists
    const data = usersSheet.getDataRange().getValues();
    const existingUser = data
      .slice(1)
      .find((row) => row[1] === userData.username);
    if (existingUser) {
      return { success: false, message: "ชื่อผู้ใช้นี้มีอยู่แล้ว" };
    }

    const lastRow = usersSheet.getLastRow();
    const newId = "U" + String(lastRow).padStart(3, "0");

    const newUser = [
      newId,
      userData.username,
      userData.password,
      userData.role || "user",
      userData.firstName,
      userData.lastName,
      userData.email || "",
      "'" + userData.phone || "",
      userData.branch,
      userData.role || "user",
      userData.status || "active",
      new Date(),
      new Date(),
      currentUser.username,
      currentUser.username,
    ];

    usersSheet.getRange(lastRow + 1, 1, 1, newUser.length).setValues([newUser]);

    return { success: true, message: "เพิ่มผู้ใช้เรียบร้อย", userId: newId };
  } catch (error) {
    console.error("Error adding user:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update user information
 */
function updateUser(username, userData, currentUser = null) {
  try {
    if (!currentUser) {
      return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
    }

    // Check permissions
    if (!checkPermission(currentUser.role, "canManageUsers")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการผู้ใช้" };
    }

    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const data = usersSheet.getDataRange().getValues();

    // Find user row
    let rowIndex = -1;
    let existingUser = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][USER_COLUMNS.USERNAME] === username) {
        rowIndex = i + 1; // Convert to 1-indexed for Google Sheets
        existingUser = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบผู้ใช้" };
    }

    // Validate permissions for editing specific user
    if (currentUser.role === "admin") {
      // Admin can only edit users in same branch
      if (existingUser[USER_COLUMNS.BRANCH] !== currentUser.branch && 
          existingUser[USER_COLUMNS.USERNAME] !== currentUser.username) {
        return { success: false, message: "คุณไม่สามารถแก้ไขผู้ใช้ในสาขาอื่นได้" };
      }
      // Admin cannot change role to super_admin
      if (userData.role === "super_admin") {
        return { success: false, message: "คุณไม่สามารถเปลี่ยนสิทธิ์เป็น Super Admin ได้" };
      }
      // Admin cannot edit super_admin users
      if (existingUser[USER_COLUMNS.ROLE] === "super_admin") {
        return { success: false, message: "คุณไม่สามารถแก้ไขข้อมูล Super Admin ได้" };
      }
    }

    const updatedUser = [
      existingUser[USER_COLUMNS.ID],
      username,
      userData.password || existingUser[USER_COLUMNS.PASSWORD_HASH],
      userData.role || existingUser[USER_COLUMNS.USER_TYPE],
      userData.firstName || existingUser[USER_COLUMNS.FIRST_NAME],
      userData.lastName || existingUser[USER_COLUMNS.LAST_NAME],
      userData.email || existingUser[USER_COLUMNS.EMAIL],
      "'" + (userData.phone || existingUser[USER_COLUMNS.PHONE]),
      userData.branch || existingUser[USER_COLUMNS.BRANCH],
      userData.role || existingUser[USER_COLUMNS.ROLE],
      userData.status || existingUser[USER_COLUMNS.STATUS],
      existingUser[USER_COLUMNS.CREATED_AT],
      new Date(),
      existingUser[USER_COLUMNS.CREATED_BY_USER] || "UNKNOWN",
      currentUser.username,
    ];

    usersSheet
      .getRange(rowIndex, 1, 1, updatedUser.length)
      .setValues([updatedUser]);

    return { success: true, message: "อัปเดตข้อมูลผู้ใช้เรียบร้อย" };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete user
 */
function deleteUser(username, currentUser = null) {
  try {
    if (!currentUser) {
      return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
    }

    // Check permissions
    if (!checkPermission(currentUser.role, "canManageUsers")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการผู้ใช้" };
    }

    // Prevent self-deletion
    if (username === currentUser.username) {
      return { success: false, message: "คุณไม่สามารถลบบัญชีของตัวเองได้" };
    }

    const usersSheet = getSheet(SHEET_NAMES.USERS);
    const data = usersSheet.getDataRange().getValues();

    // Find user row
    let rowIndex = -1;
    let existingUser = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][USER_COLUMNS.USERNAME] === username) {
        rowIndex = i + 1; // Convert to 1-indexed for Google Sheets
        existingUser = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบผู้ใช้" };
    }

    // Validate permissions for deleting specific user
    if (currentUser.role === "admin") {
      // Admin can only delete users in same branch and cannot delete super_admin
      if (existingUser[USER_COLUMNS.BRANCH] !== currentUser.branch) {
        return { success: false, message: "คุณไม่สามารถลบผู้ใช้ในสาขาอื่นได้" };
      }
      if (existingUser[USER_COLUMNS.ROLE] === "super_admin") {
        return { success: false, message: "คุณไม่สามารถลบ Super Admin ได้" };
      }
    } else if (currentUser.role === "super_admin") {
      // Super admin can delete anyone except themselves (already checked above)
      // No additional restrictions
    }

    usersSheet.deleteRow(rowIndex);

    return { success: true, message: "ลบผู้ใช้เรียบร้อย" };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, message: error.toString() };
  }
}