/**
 * Revenue management functions
 * Handles CRUD operations for revenue records with role-based access control
 */

/**
 * Get all revenue records
 */
function getAllRevenues() {
  try {
    const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
    const data = revenueSheet.getDataRange().getValues();

    if (data.length <= 1) {
      return JSON.stringify({ success: true, revenues: [] });
    }

    const revenues = [];
    const headers = data[0];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const revenue = {
        id: row[0],
        date: row[1],
        patientId: row[2],
        doctorId: row[3],
        caseType: row[4],
        caseDetails: row[5],
        paymentType: row[6],
        cashAmount: row[7] || 0,
        transferClinicAmount: row[8] || 0,
        transferDoctorAmount: row[9] || 0,
        socialSecurityAmount: row[10] || 0,
        visaAmount: row[11] || 0,
        xrayFee: row[12] || 0,
        medicineFee: row[13] || 0,
        otherProductFee: row[14] || 0,
        discount: row[15] || 0,
        labFee: row[16] || 0,
        notes: row[17] || "",
        branch: row[18] || "",
        status: row[19] || "",
        createdAt: row[20],
        updatedAt: row[21],
        createdByUser: row[22] || "",
        updatedByUser: row[23] || "",
        // totalAmount: function() {
        //   return (
        //     (this.cashAmount || 0) +
        //     (this.transferAmount || 0) +
        //     (this.socialSecurityAmount || 0) +
        //     (this.visaAmount || 0) +
        //     (this.xrayFee || 0) +
        //     (this.medicineFee || 0) +
        //     (this.otherProductFee || 0) -
        //     (this.discount || 0) -
        //     (this.labFee || 0)
        //   );
        // }
      };
      revenues.push(revenue);
    }

    return JSON.stringify({ success: true, revenues: revenues });
  } catch (error) {
    console.error("Error getting revenues:", error);
    return JSON.stringify({ success: false, message: error.toString() });
  }
}

/**
 * Add new revenue record (with role-based access control)
 */
function addRevenue(revenueData, currentUser = null) {
  let lock = LockService.getScriptLock();
  if(!lock.tryLock(30000)) {
    return { success: false, message: "ไม่สามารถเพิ่มข้อมูลรายได้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
  }
  try {
    // Check permissions
    if (currentUser && !checkPermission(currentUser.role, "canManageRevenue")) {
      lock.releaseLock();
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลรายได้" };
    }

    const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
    const lastRow = revenueSheet.getLastRow();

    const getNewRevenueId = () => {
        let existingIds = revenueSheet
        .getRange(2, 1, Math.max(lastRow - 1, 1), 1)
        .getValues()
        .flat()
        .filter(id => id);

        let yearMonth_prefix = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyMM");
        existingIds = existingIds.filter(id => id.startsWith("R" + yearMonth_prefix));
        let idPrefix = "R" + yearMonth_prefix;
        let counter = 1;
        let newId;
        do {
            newId = idPrefix + String(counter).padStart(4, "0");
            counter++;
        } while (existingIds.includes(newId));

        return newId;
    }

    const newId = getNewRevenueId();

    // Handle the new detailed revenue structure with individual payment columns
    const newRevenue = [
      newId,
      revenueData.date,
      revenueData.patientId || "",
      revenueData.doctorId || "",
      revenueData.caseType || "",
      revenueData.caseDetails || "",
      revenueData.paymentType || "",
      revenueData.cashAmount || 0,
      revenueData.transferClinicAmount || 0,
      revenueData.transferDoctorAmount || 0,
      revenueData.socialSecurityAmount || 0,
      revenueData.visaAmount || 0,
      revenueData.xrayFee || 0,
      revenueData.medicineFee || 0,
      revenueData.otherProductFee || 0,
      revenueData.discount || 0,
      revenueData.labFee || 0,
      revenueData.notes || "",
      revenueData.branch || (currentUser ? currentUser.branch : "BRANCH_01"),
      "รอจ่ายหมอ", // Default status
      new Date(),
      new Date(),
      currentUser ? currentUser.username : "UNKNOWN",
      currentUser ? currentUser.username : "UNKNOWN",
    ];

    revenueSheet
      .getRange(lastRow + 1, 1, 1, newRevenue.length)
      .setValues([newRevenue]);

    lock.releaseLock();
    return {
      success: true,
      message: "เพิ่มข้อมูลรายได้เรียบร้อย",
      revenueId: newId,
    };
  } catch (error) {
    lock.releaseLock();
    console.error("Error adding revenue:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Update revenue record
 */
function updateRevenue(revenueId, revenueData, currentUser = null) {
  try {
    // Check permissions
    if (currentUser && !checkPermission(currentUser.role, "canManageRevenue")) {
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลรายได้" };
    }

    const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
    const data = revenueSheet.getDataRange().getValues();

    // Find revenue row
    let rowIndex = -1;
    let existingRevenue = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === revenueId) {
        rowIndex = i + 1; // Convert to 1-indexed
        existingRevenue = data[i];
        break;
      }
    }

    if (rowIndex === -1) {
      return { success: false, message: "ไม่พบข้อมูลรายได้" };
    }

    const updatedRevenue = [
      revenueId,
      revenueData.date,
      revenueData.patientId || "",
      revenueData.doctorId || "",
      revenueData.caseType || "",
      revenueData.caseDetails || "",
      revenueData.paymentType || "",
      revenueData.cashAmount || 0,
      revenueData.transferClinicAmount || 0,
      revenueData.transferDoctorAmount || 0,
      revenueData.socialSecurityAmount || 0,
      revenueData.visaAmount || 0,
      revenueData.xrayFee || 0,
      revenueData.medicineFee || 0,
      revenueData.otherProductFee || 0,
      revenueData.discount || 0,
      revenueData.labFee || 0,
      revenueData.notes || "",
      revenueData.branch || existingRevenue[18],
      revenueData.status || existingRevenue[19],
      existingRevenue[20], // Keep original created at
      new Date(), // Update modified at
      existingRevenue[22] || "UNKNOWN", // Keep original created by
      currentUser ? currentUser.username : "UNKNOWN", // Update modified by
    ];

    revenueSheet
      .getRange(rowIndex, 1, 1, updatedRevenue.length)
      .setValues([updatedRevenue]);

    return { success: true, message: "อัปเดตข้อมูลรายได้เรียบร้อย" };
  } catch (error) {
    console.error("Error updating revenue:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Delete revenue record
 */
function deleteRevenue(revenueId) {
  let lock = LockService.getScriptLock();
  if(!lock.tryLock(30000)) {
    return { success: false, message: "ไม่สามารถลบข้อมูลรายได้ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
  }
  try {
    const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
    const data = revenueSheet.getDataRange().getValues();

    // Find revenue row
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === revenueId) {
        rowIndex = i + 1; // Convert to 1-indexed
        break;
      }
    }

    if (rowIndex === -1) {
      lock.releaseLock();
      return { success: false, message: "ไม่พบข้อมูลรายได้" };
    }

    revenueSheet.deleteRow(rowIndex);
    lock.releaseLock();
    return { success: true, message: "ลบข้อมูลรายได้เรียบร้อย" };
  } catch (error) {
    lock.releaseLock();
    console.error("Error deleting revenue:", error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Get revenue by date range
 */
function getRevenueByDateRange(startDate, endDate) {
  try {
    const allRevenues = getAllRevenues();
    if (!allRevenues.success) {
      return { success: false, message: "ไม่สามารถดึงข้อมูลรายได้ได้" };
    }

    const filteredRevenues = allRevenues.revenues.filter((revenue) => {
      const revenueDate = new Date(revenue.date);
      return revenueDate >= new Date(startDate) && 
             revenueDate <= new Date(endDate);
    });

    return { success: true, revenues: filteredRevenues };
  } catch (error) {
    console.error("Error getting revenue by date range:", error);
    return { success: false, message: error.toString() };
  }
}

function updateRevenuePaidStatus(revenueIds, currentUser = null) {
  let lock = LockService.getScriptLock();
  if(!lock.tryLock(30000)) {
    return { success: false, message: "ไม่สามารถอัปเดตสถานะการชำระเงินได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง" };
  }
  try {
    // Check permissions
    if (currentUser && !checkPermission(currentUser.role, "canManageRevenue")) {
      lock.releaseLock();
      return { success: false, message: "คุณไม่มีสิทธิ์จัดการข้อมูลรายได้" };
    }

    const revenueSheet = getSheet(SHEET_NAMES.REVENUE);
    const data = revenueSheet.getDataRange().getValues();

    // Find revenue rows
    for (let i = 1; i < data.length; i++) {
      if (revenueIds.includes(data[i][0])) {
        data[i][19] = "จ่ายหมอแล้ว"; // Update status to "จ่ายหมอแล้ว"
        data[i][21] = new Date(); // Update modified at
        data[i][23] = currentUser ? currentUser.username : "UNKNOWN"; // Update modified by
      }
    }
    // Write back updated data
    revenueSheet.getRange(1, 1, data.length, data[0].length).setValues(data);

    lock.releaseLock();
    return { success: true, message: "อัปเดตสถานะการชำระเงินเรียบร้อย" };
  } catch (error) {
    lock.releaseLock();
    console.error("Error updating revenue paid status:", error);
    return { success: false, message: error.toString() };
  }
}
