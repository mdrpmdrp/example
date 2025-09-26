/**
 * Option list functions
 * Handles CRUD operations for option lists (case types, branches, etc.)
 */

/**
 * Get case types from Option List sheet (Column A)
 */
function getCaseTypes() {
  try {
    const optionSheet = getSheet(SHEET_NAMES.OPTION_LIST);
    const data = optionSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, caseTypes: [] });
    }

    const caseTypes = [];
    for (let i = 1; i < data.length; i++) {
      const caseType = data[i][0]; // Column A
      if (caseType && caseType.toString().trim() !== "") {
        caseTypes.push(caseType.toString().trim());
      }
    }

    // Remove duplicates
    const uniqueCaseTypes = [...new Set(caseTypes)];
    return JSON.stringify({ success: true, caseTypes: uniqueCaseTypes });
  } catch (error) {
    console.error("Error getting case types:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Get case details from Option List sheet (Column B)
 */
function getCaseDetails() {
  try {
    const optionSheet = getSheet(SHEET_NAMES.OPTION_LIST);
    const data = optionSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, caseDetails: [] });
    }

    const caseDetails = [];
    for (let i = 1; i < data.length; i++) {
      const caseDetail = data[i][1]; // Column B
      if (caseDetail && caseDetail.toString().trim() !== "") {
        caseDetails.push(caseDetail.toString().trim());
      }
    }

    // Remove duplicates
    const uniqueCaseDetails = [...new Set(caseDetails)];
    return JSON.stringify({ success: true, caseDetails: uniqueCaseDetails });
  } catch (error) {
    console.error("Error getting case details:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Get contact channels from Option List sheet (Column C)
 */
function getContactChannels() {
  try {
    const optionSheet = getSheet(SHEET_NAMES.OPTION_LIST);
    const data = optionSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, contactChannels: [] });
    }

    const contactChannels = [];
    for (let i = 1; i < data.length; i++) {
      const contactChannel = data[i][2]; // Column C
      if (contactChannel && contactChannel.toString().trim() !== "") {
        contactChannels.push(contactChannel.toString().trim());
      }
    }

    // Remove duplicates
    const uniqueContactChannels = [...new Set(contactChannels)];
    return JSON.stringify({ success: true, contactChannels: uniqueContactChannels });
  } catch (error) {
    console.error("Error getting contact channels:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Get branches from Option List sheet (Column D)
 */
function getBranches() {
  try {
    const optionSheet = getSheet(SHEET_NAMES.OPTION_LIST);
    const data = optionSheet.getDataRange().getValues();

    if (data.length <= 1) {
      // Return default branches if sheet is empty
      const defaultBranches = [
        "HEAD_OFFICE",
        "BRANCH_01",
        "BRANCH_02",
        "BRANCH_03",
        "BRANCH_04",
        "BRANCH_05",
      ];
      return { success: true, branches: defaultBranches };
    }

    const branches = [];
    for (let i = 1; i < data.length; i++) {
      const branch = data[i][3]; // Column D
      if (branch && branch.toString().trim() !== "") {
        branches.push(branch.toString().trim());
      }
    }

    // Remove duplicates and filter out empty values
    let uniqueBranches = [...new Set(branches)].filter(b => b && b.trim() !== "");
    
    // If no branches found, return default branches
    if (uniqueBranches.length === 0) {
      uniqueBranches = [
        "HEAD_OFFICE",
        "BRANCH_01", 
        "BRANCH_02",
        "BRANCH_03",
        "BRANCH_04",
        "BRANCH_05",
      ];
    }

    return { success: true, branches: uniqueBranches };
  } catch (error) {
    console.error("Error getting branches:", error);
    // Return default branches on error
    const defaultBranches = [
      "HEAD_OFFICE",
      "BRANCH_01",
      "BRANCH_02", 
      "BRANCH_03",
      "BRANCH_04",
      "BRANCH_05",
    ];
    return { success: false, message: error.toString(), branches: defaultBranches };
  }
}

/**
 * Get payment types from Option List sheet (Column E)
 */
function getPaymentTypes() {
  try {
    const optionSheet = getSheet(SHEET_NAMES.OPTION_LIST);
    const data = optionSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, paymentTypes: [] });
    }

    const paymentTypes = [];
    for (let i = 1; i < data.length; i++) {
      const paymentType = data[i][4]; // Column E
      if (paymentType && paymentType.toString().trim() !== "") {
        paymentTypes.push(paymentType.toString().trim());
      }
    }

    // Remove duplicates
    const uniquePaymentTypes = [...new Set(paymentTypes)];
    return JSON.stringify({ success: true, paymentTypes: uniquePaymentTypes });
  } catch (error) {
    console.error("Error getting payment types:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Get all options from Option List sheet
 */
function getAllOptions() {
  try {
    const caseTypes = JSON.parse(getCaseTypes());
    const caseDetails = JSON.parse(getCaseDetails());
    const contactChannels = JSON.parse(getContactChannels());
    const branches = getBranches(); // This returns object directly
    const paymentTypes = JSON.parse(getPaymentTypes());

    return JSON.stringify({
      success: true,
      options: {
        caseTypes: caseTypes.success ? caseTypes.caseTypes : [],
        caseDetails: caseDetails.success ? caseDetails.caseDetails : [],
        contactChannels: contactChannels.success ? contactChannels.contactChannels : [],
        branches: branches.success ? branches.branches : [],
        paymentTypes: paymentTypes.success ? paymentTypes.paymentTypes : [],
      },
    });
  } catch (error) {
    console.error("Error getting all options:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Get branch list (for compatibility with existing code)
 */
function getBranchList() {
  try {
    const result = getBranches();
    if (result.success) {
      return result.branches;
    }
    return ["HEAD_OFFICE", "BRANCH_01", "BRANCH_02", "BRANCH_03"];
  } catch (error) {
    console.error("Error getting branch list:", error);
    return ["HEAD_OFFICE", "BRANCH_01", "BRANCH_02", "BRANCH_03"];
  }
}