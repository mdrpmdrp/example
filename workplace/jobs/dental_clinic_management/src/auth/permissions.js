/**
 * Role-based access control functions
 * Handles user permissions and access control throughout the application
 */

/**
 * Check if user has permission to access a function
 */
function checkPermission(userRole, action) {
  const permissions = {
    super_admin: {
      canManageUsers: true,
      canManageBranches: true,
      canViewAllBranches: true,
      canAccessSettings: true,
      canAccessReports: true,
      canManagePatients: true,
      canManageAppointments: true,
      canManageDoctors: true,
      canManageRevenue: true,
    },
    admin: {
      canManageUsers: true, // Only for same branch
      canManageBranches: false,
      canViewAllBranches: false,
      canAccessSettings: false,
      canAccessReports: true,
      canManagePatients: true,
      canManageAppointments: true,
      canManageDoctors: true,
      canManageRevenue: true,
    },
    user: {
      canManageUsers: false,
      canManageBranches: false,
      canViewAllBranches: false,
      canAccessSettings: false,
      canAccessReports: false,
      canManagePatients: true,
      canManageAppointments: true,
      canManageDoctors: false,
      canManageRevenue: true,
    },
  };

  return permissions[userRole] && permissions[userRole][action] === true;
}

/**
 * Filter data based on user's branch access
 */
function filterDataByBranch(data, userBranch, userRole) {
  // Super admin can see all data
  if (userRole === "super_admin") {
    return data;
  }

  // Admin and User can only see data from their branch
  return data.filter((item) => {
    return item.branch === userBranch || !item.branch; // Include items without branch for backward compatibility
  });
}

/**
 * Check if user can access specific branch data
 */
function canAccessBranch(userBranch, userRole, targetBranch) {
  if (userRole === "super_admin") {
    return true; // Super admin can access all branches
  }

  return userBranch === targetBranch; // Others can only access their own branch
}

/**
 * Get user's accessible branches
 */
function getUserAccessibleBranches(userBranch, userRole) {
  if (userRole === "super_admin") {
    try {
      const result = getBranches();
      if (result.success && result.branches) {
        return result.branches;
      }
    } catch (error) {
      console.error("Error getting branches:", error);
    }

    // Fallback to default branches if there's an error
    return ["HEAD_OFFICE", "BRANCH_01", "BRANCH_02", "BRANCH_03"];
  }

  return [userBranch]; // Return only user's branch
}

/**
 * Validate user permissions for specific action
 */
function validateUserAccess(currentUser, action, targetBranch = null) {
  if (!currentUser) {
    return { success: false, message: "กรุณาเข้าสู่ระบบก่อน" };
  }

  // Check role permission
  if (!checkPermission(currentUser.role, action)) {
    return { success: false, message: "คุณไม่มีสิทธิ์ในการเข้าถึงฟังก์ชันนี้" };
  }

  // Check branch access if target branch is specified
  if (
    targetBranch &&
    !canAccessBranch(currentUser.branch, currentUser.role, targetBranch)
  ) {
    return { success: false, message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลสาขานี้" };
  }

  return { success: true, message: "มีสิทธิ์เข้าถึง" };
}

/**
 * Check user permissions (for web interface)
 */
function checkUserPermission(userInfo, action) {
  return checkPermission(userInfo.role, action);
}

/**
 * Get branch list accessible to user (for web interface)
 */
function getUserBranches(userInfo) {
  return getUserAccessibleBranches(userInfo.branch, userInfo.role);
}