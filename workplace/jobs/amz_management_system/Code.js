const ss = SpreadsheetApp.getActiveSpreadsheet();

// **สำคัญ:** ให้นำ Folder ID ของโฟลเดอร์ "Cancelled Bills Photos" ใน Google Drive มาใส่ตรงนี้
const CANCELLED_BILLS_FOLDER_ID = "1LKY6h0jsZmdVBD1Hm7rnTec7xaxqbCAo";
// === CACHE SYSTEM ===
const CACHE_DURATION = {
  SUPPLIERS: 3600,      // 1 ชั่วโมง
  PRODUCTS: 1800,       // 30 นาที
  BRANCHES: 3600,       // 1 ชั่วโมง
  EMPLOYEES: 1800,      // 30 นาที
  PAYMENT_TYPES: 3600,  // 1 ชั่วโมง
  DISCOUNT_TYPES: 3600  // 1 ชั่วโมง
};

const cache = CacheService.getScriptCache();

function getCachedData(key, fetchFunction, duration) {
  let cached = cache.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const freshData = fetchFunction();
  cache.put(key, JSON.stringify(freshData), duration);
  return freshData;
}

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('WebApp')
    .setTitle('Cafe Management System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// === VALIDATION SYSTEM ===
function validateReportData(data) {
  const errors = [];

  // ตรวจสอบข้อมูลพื้นฐาน
  if (!data.timeSlot || !['เช้า', 'บ่าย'].includes(data.timeSlot)) {
    errors.push('รอบเวลาไม่ถูกต้อง');
  }

  // ตรวจสอบรายการสินค้า
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach((item, index) => {
      // ตรวจสอบตัวเลขต้องไม่ติดลบ
      ['salesQuantity', 'receivedQuantity', 'expiredQuantity', 'currentStock', 'transferredQuantity'].forEach(field => {
        if (item[field] && parseFloat(item[field]) < 0) {
          errors.push(`รายการที่ ${index + 1}: ${field} ต้องไม่ติดลบ`);
        }
      });

      // ถ้ามีการย้ายสินค้า ต้องระบุสาขาปลายทาง
      if (parseFloat(item.transferredQuantity) > 0 && !item.toBranchId) {
        errors.push(`รายการที่ ${index + 1}: ต้องระบุสาขาปลายทางเมื่อมีการย้ายสินค้า`);
      }
    });
  }

  // ตรวจสอบยอดเงิน
  const amountFields = ['payments', 'discounts', 'addOns'];
  amountFields.forEach(field => {
    if (data[field] && Array.isArray(data[field])) {
      data[field].forEach(item => {
        if (item.amount && parseFloat(item.amount) < 0) {
          errors.push(`${field}: จำนวนเงินต้องไม่ติดลบ`);
        }
      });
    }
  });

  return errors;
}


/**
 * ฟังก์ชันใหม่: ดึงข้อมูลสินค้าทั้งหมดโดยจัดกลุ่มตามซัพพลายเออร์
 */
function getProductsGroupedBySupplier() {
  const productsSheet = ss.getSheetByName('Products');
  if (!productsSheet) return {};
  const productsData = productsSheet.getDataRange().getValues();
  const groupedProducts = {};

  for (let i = 1; i < productsData.length; i++) {
    const row = productsData[i];
    const status = row[7];
    const supplierId = row[6];

    if (status === 'Active' && supplierId && supplierId !== 'S0019') {
      if (!groupedProducts[supplierId]) {
        groupedProducts[supplierId] = [];
      }
      groupedProducts[supplierId].push({
        id: row[0],
        name: `${row[0]} ${row[1]}`,
        price: parseFloat(row[4]) || 0  // เพิ่มราคาจากคอลัมน์ที่ 5
      });
    }
  }
  return groupedProducts;
}

/**
 * แก้ไข getInitialDataForUser
 * ให้ดึงข้อมูลสินค้าที่จัดกลุ่มแล้วมาด้วย
 */
function getInitialDataForUser() {
  const userDetails = getUserDetails();
  const allBranches = getBranches();
  const otherBranches = allBranches.filter(branch => branch.id !== userDetails.branchIdAssigned);

  return {
    userDetails: userDetails,
    suppliers: getSuppliers(),
    paymentTypes: getPaymentTypes(),
    discountTypes: getDiscountTypes(),
    branches: otherBranches,
    allBranches: allBranches,
    branchEmployees: getBranchEmployees(userDetails.branchIdAssigned),
    // ของเดิม (keyed by supplierId) — ใช้ในหน้าตรวจสอบ/verification
    productsBySupplier: getProductsGroupedBySupplier(),
    // ใหม่: แบบ keyed by supplierName — ใช้ใน Quick Add (frontend คาดว่าจะมีแบบนี้)
    productsBySupplierByName: getAllProductsGroupedBySupplier(),
    branchColors: getBranchColors()
  };
}


function getBranchEmployees(branchId) {
  if (!branchId) return [];
  const employeesSheet = ss.getSheetByName('Employees');
  if (!employeesSheet) return [];
  const data = employeesSheet.getDataRange().getValues();
  const employees = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[3] == branchId && row[2] === 'หน้าร้าน') {
      employees.push({ id: row[0], name: row[1] });
    }
  }
  return employees;
}

function getUserDetails() {
  const email = Session.getActiveUser().getEmail();
  try {
    const dbSheet = ss.getSheetByName('_database');
    const employeesSheet = ss.getSheetByName('Employees');

    // ใส่ email ลง F5
    dbSheet.getRange("F5").setValue(email);

    // อ่านค่า rowIndex ที่สูตรเขียนไว้ใน G5
    const rowIndex = parseInt(dbSheet.getRange("G5").getValue(), 10);
    const branchName = dbSheet.getRange("H5").getValue();

    if (rowIndex && rowIndex > 1) {
      const rowValues = employeesSheet.getRange(rowIndex, 1, 1, 6).getValues()[0];
      const userObj = {
        employeeId: rowValues[0],
        name: rowValues[1],
        role: rowValues[2],
        branchIdAssigned: rowValues[3],
        branchName: branchName || "Unknown Branch",
        email: rowValues[5],
        branchesManaged: rowValues[4]
          ? rowValues[4].toString().split(",").map(item => item.trim())
          : []
      };
      return userObj;
    }

    return { name: 'Guest', role: 'Guest', email: email, branchesManaged: [] };

  } catch (e) {
    console.error("getUserDetails Error: " + e.toString());
    return { name: 'Error', role: 'Error', email: email, branchesManaged: [] };
  }
}



function getBranches() {
  return getCachedData('branches', () => {
    const branchesSheet = ss.getSheetByName('Branches');
    if (!branchesSheet) return [];
    const data = branchesSheet.getRange(2, 1, branchesSheet.getLastRow() - 1, 2).getValues();
    return data.filter(row => row[0] && row[1]).map(row => ({ id: row[0], name: `${row[0]} ${row[1]}` }));
  }, CACHE_DURATION.BRANCHES);
}

function getSuppliers() {
  return getCachedData('suppliers', () => {
    const suppliersSheet = ss.getSheetByName('Suppliers');
    if (!suppliersSheet) return [];
    const data = suppliersSheet.getRange(2, 1, suppliersSheet.getLastRow() - 1, 2).getValues();
    return data.map(row => ({ id: row[0], name: row[1] })).filter(s => s.id && s.name);
  }, CACHE_DURATION.SUPPLIERS);
}

function getProductsBySupplier(supplierId) {
  const productsSheet = ss.getSheetByName('Products');
  if (!productsSheet) return [];
  const data = productsSheet.getDataRange().getValues();
  const products = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[6] == supplierId && row[7] === 'Active') { products.push({ id: row[0], name: `${row[0]} ${row[1]}` }); }
  }
  return products;
}

function getPaymentTypes() {
  return getCachedData('payment_types', () => {
    const sheet = ss.getSheetByName('PaymentTypes');
    if (!sheet) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    return data.map(row => ({ id: row[0], name: row[1] })).filter(p => p.id && p.name);
  }, CACHE_DURATION.PAYMENT_TYPES);
}

function getDiscountTypes() {
  return getCachedData('discount_types', () => {
    const sheet = ss.getSheetByName('DiscountTypes');
    if (!sheet) return [];
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
    return data.map(row => ({ id: row[0], name: row[1] })).filter(d => d.id && d.name);
  }, CACHE_DURATION.DISCOUNT_TYPES);
}

function getUnverifiedReports() {
  const userDetails = getUserDetails();
  if (userDetails.role !== 'ออฟฟิศ') return [];

  const managedBranches = userDetails.branchesManaged;
  if (!managedBranches || managedBranches.length === 0) return [];

  const dbSheet = ss.getSheetByName('_database');

  // เขียน user ที่ล็อกอินลง A3 (สำหรับสูตรในชีทใช้)
  dbSheet.getRange("A3").setValue(userDetails.email || userDetails.username || "unknown_user");

  // อ่านจำนวนแถวจาก E3
  const rowCount = dbSheet.getRange("E3").getValue();
  if (!rowCount || rowCount <= 0) return [];

  // อ่านค่าที่สูตรใน _database สร้างไว้แล้ว (A5:E)
  const values = dbSheet.getRange(5, 1, rowCount, 5).getDisplayValues();

  // ถ้ามีค่า #N/A แปลว่าไม่มีข้อมูล
  const hasNA = values.some(row => row.includes('#N/A'));
  if (hasNA) return [];

  // สร้าง object array
  const unverifiedReports = values
    .filter(row => row[0]) // กันแถวว่าง
    .map(row => ({
      reportId: row[0],    // คอลัมน์ A
      reportDate: row[1],  // คอลัมน์ B
      branchName: row[2],  // คอลัมน์ C
      timeSlot: row[3],    // คอลัมน์ D
      status: row[4]       // คอลัมน์ E
    }));

  return unverifiedReports.length > 0 ? unverifiedReports : [];
}



function getReportDetails(reportId) {
  try {
    const reportsSheet = ss.getSheetByName('DailyReports');
    const itemsSheet = ss.getSheetByName('DailyReportItems');
    const summariesSheet = ss.getSheetByName('DailyReportSummaries');
    const productsSheet = ss.getSheetByName('Products');
    const drinkSalesSheet = ss.getSheetByName('DrinkCategorySales');
    const cancelledBillsSheet = ss.getSheetByName('CancelledBills');
    const addOnSalesSheet = ss.getSheetByName('AddOnSales');




    const branchesSheet = ss.getSheetByName('Branches');

    if (!reportsSheet || !itemsSheet || !summariesSheet || !productsSheet || !drinkSalesSheet || !cancelledBillsSheet || !branchesSheet) {
      throw new Error("ไม่พบชีทที่จำเป็น");
    }

    const allReportsData = reportsSheet.getDataRange().getValues();
    const reportDataRow = allReportsData.find(row => row[0] == reportId);
    if (!reportDataRow) { throw new Error(`ไม่พบรายงานที่มี ID "${reportId}"`); }

    const currentBranchId = reportDataRow[1];
    const currentReportDate = new Date(reportDataRow[3]);

    let previousReportId = null;
    let previousReportDate = new Date(0);

    for (let i = 1; i < allReportsData.length; i++) {
      const r = allReportsData[i];
      const reportDate = new Date(r[3]);
      if (r[1] == currentBranchId && r[7] === 'Verified' && reportDate < currentReportDate) {
        if (reportDate > previousReportDate) {
          previousReportDate = reportDate;
          previousReportId = r[0];
        }
      }
    }

    const allItemsData = itemsSheet.getDataRange().getValues();
    const previousItemsMap = {};
    if (previousReportId) {
      allItemsData.filter(item => item[1] == previousReportId).forEach(item => {
        previousItemsMap[item[2]] = {
          salesQuantity: item[3], receivedQuantity: item[4], expiredQuantity: item[5],
          currentStock: item[6], transferredQuantity: item[8], toBranchId: item[9],
          reportDate: previousReportDate
        };
      });
    }

    const productsData = productsSheet.getDataRange().getValues();
    const productMap = productsData.slice(1).reduce((map, row) => { map[row[0]] = { name: row[1], supplierId: row[6] }; return map; }, {});

    const branchData = branchesSheet.getDataRange().getValues();
    const branchMapForNames = branchData.slice(1).reduce((map, row) => { map[row[0]] = row[1]; return map; }, {});

    const itemsData = allItemsData.filter(row => row[1] == reportId);
    const summariesData = summariesSheet.getDataRange().getValues().filter(row => row[1] == reportId);
    const drinkSalesData = drinkSalesSheet.getDataRange().getValues().filter(row => row[1] == reportId);
    const cancelledBillsData = cancelledBillsSheet.getDataRange().getValues().filter(row => row[1] == reportId);
    const addOnSalesData = addOnSalesSheet ? addOnSalesSheet.getDataRange().getValues().filter(row => row[1] == reportId) : [];


    const reportDetails = {
      reportId: reportDataRow[0],
      branchId: reportDataRow[1],
      employeeId: reportDataRow[2],
      reportDate: new Date(reportDataRow[3]).toLocaleDateString('th-TH'),
      rawReportDate: reportDataRow[3],
      timeSlot: reportDataRow[4],
      note: reportDataRow[8] || '',
      items: itemsData.map(item => {
        const productId = item[2];
        const productInfo = productMap[productId] || { name: 'Unknown', supplierId: null };
        const previousData = previousItemsMap[productId];
        let previousDataWithBranchName = null;
        if (previousData) {
          previousDataWithBranchName = {
            ...previousData,
            toBranchName: previousData.toBranchId ? branchMapForNames[previousData.toBranchId] || 'N/A' : null
          };
        }
        return {
          itemId: item[0], productId: productId, supplierId: productInfo.supplierId,
          salesQuantity: item[3], receivedQuantity: item[4], expiredQuantity: item[5],
          currentStock: item[6], transferredQuantity: item[8], toBranchId: item[9],
          previousData: previousDataWithBranchName
        }
      }),
      drinkCategories: drinkSalesData.map(d => ({ categoryName: d[2], salesAmount: d[3], cupQuantity: d[4] })),
      cancelledBills: cancelledBillsData.map(b => ({ billNumber: b[2], reason: b[3], amount: b[4],cancelledBy: b[5] || '' })),
      payments: summariesData.filter(s => s[2]).map(s => ({ typeId: s[2], amount: s[4] })),
      addOns: addOnSalesData.map(a => ({ type: a[2], amount: a[3], quantity: a[4] || null,unitPrice: a[5] || null})),
      discounts: summariesData.filter(s => s[3]).map(s => ({ typeId: s[3], amount: s[4] }))

    };
    return JSON.stringify({ status: 'success', data: reportDetails });
  } catch (e) {
    console.error("getReportDetails Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getPreviousItemData(productId, branchId, reportDateStr) {
  try {
    const reportsSheet = ss.getSheetByName('DailyReports');
    const itemsSheet = ss.getSheetByName('DailyReportItems');
    const branchesSheet = ss.getSheetByName('Branches');

    const allReportsData = reportsSheet.getDataRange().getValues();
    const currentReportDate = new Date(reportDateStr);

    let previousReportId = null;
    let previousReportDate = new Date(0);

    for (let i = 1; i < allReportsData.length; i++) {
      const r = allReportsData[i];
      const reportDate = new Date(r[3]);
      if (r[1] == branchId && r[7] === 'Verified' && reportDate < currentReportDate) {
        if (reportDate > previousReportDate) {
          previousReportDate = reportDate;
          previousReportId = r[0];
        }
      }
    }

    if (!previousReportId) {
      return JSON.stringify({ status: 'success', data: null });
    }

    const allItemsData = itemsSheet.getDataRange().getValues();
    const foundItem = allItemsData.find(item => item[1] == previousReportId && item[2] == productId);

    if (!foundItem) {
      return JSON.stringify({ status: 'success', data: null });
    }

    const branchData = branchesSheet.getDataRange().getValues();
    const branchMapForNames = branchData.slice(1).reduce((map, row) => { map[row[0]] = row[1]; return map; }, {});
    const toBranchId = foundItem[9];

    const result = {
      salesQuantity: foundItem[3], receivedQuantity: foundItem[4], expiredQuantity: foundItem[5],
      currentStock: foundItem[6], transferredQuantity: foundItem[8], toBranchId: toBranchId,
      toBranchName: toBranchId ? branchMapForNames[toBranchId] || 'N/A' : null,
      reportDate: previousReportDate
    };

    return JSON.stringify({ status: 'success', data: result });

  } catch (e) {
    console.error("getPreviousItemData Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getSalesSummary(branchId, startDateStr, endDateStr) {
  try {
    const userDetails = getUserDetails();
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const reports = ss.getSheetByName('DailyReports').getDataRange().getValues().slice(1);
    const reportItems = ss.getSheetByName('DailyReportItems').getDataRange().getValues().slice(1);
    const drinkSales = ss.getSheetByName('DrinkCategorySales').getDataRange().getValues().slice(1);
    const summaries = ss.getSheetByName('DailyReportSummaries').getDataRange().getValues().slice(1);
    const products = ss.getSheetByName('Products').getDataRange().getValues().slice(1);
    const paymentTypes = getPaymentTypes();
    const bankTransfers = ss.getSheetByName('BankTransfers').getDataRange().getValues().slice(1);
    const productMap = products.reduce((map, p) => {
      map[p[0]] = { typeId: p[2], salePrice: parseFloat(p[4]) || 0 };
      return map;
    }, {});

    const transferMap = bankTransfers.reduce((map, t) => {
      if (t[1] && t[2]) {
        const key = `${t[1]}_${new Date(t[2]).toISOString().split('T')[0]}`;
        map[key] = {
          amount: t[4],
          transferDate: new Date(t[3]).toISOString().split('T')[0],
          note: t[6] || ''
        };
      }
      return map;
    }, {});

    const summaryData = [];
    for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
      const currentDateStr = d.toISOString().split('T')[0];
      const morningReportId = findBestReport(reports, branchId, currentDateStr, 'เช้า');
      const afternoonReportId = findBestReport(reports, branchId, currentDateStr, 'บ่าย');
      if (!morningReportId && !afternoonReportId) {
        continue;
      }
      const dayData = {
        date: d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
        isoDate: currentDateStr,
        morning: createEmptySlotData(paymentTypes),
        afternoon: createEmptySlotData(paymentTypes),
        total: createEmptySlotData(paymentTypes)
      };
      if (morningReportId) processSlotData(dayData.morning, morningReportId, reportItems, drinkSales, summaries, productMap);
      if (afternoonReportId) processSlotData(dayData.afternoon, afternoonReportId, reportItems, drinkSales, summaries, productMap);
      calculateTotals(dayData, paymentTypes);
      const transferKey = `${branchId}_${currentDateStr}`;
      dayData.total.bankTransfer = transferMap[transferKey] || { amount: '', transferDate: '', note: '' };


      // Additional Withdrawals data - เพิ่มส่วนนี้
dayData.total.additionalWithdrawal = null;

// ตรวจสอบว่ามีชีท AdditionalWithdrawals หรือไม่
const withdrawalSheet = ss.getSheetByName('AdditionalWithdrawals');
if (withdrawalSheet && withdrawalSheet.getLastRow() > 1) {
  const withdrawalData = withdrawalSheet.getDataRange().getValues();
  const dayWithdrawals = [];

  
  for (let i = 1; i < withdrawalData.length; i++) {
    if (withdrawalData[i][1] == branchId && 
        withdrawalData[i][2] && 
        new Date(withdrawalData[i][2]).toISOString().split('T')[0] === currentDateStr) {
      dayWithdrawals.push({
        expenseType: withdrawalData[i][4],
        amount: withdrawalData[i][5] || 0
      });
    }
  }
  
if (dayWithdrawals.length > 0) {
  const totalAmount = dayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
  
  // Group items by withdrawal date
  const itemsByDate = {};
  for (let i = 1; i < withdrawalData.length; i++) {
    if (withdrawalData[i][1] == branchId && 
        withdrawalData[i][2] && 
        new Date(withdrawalData[i][2]).toISOString().split('T')[0] === currentDateStr) {
      
      const wDate = withdrawalData[i][3] ? 
        new Date(withdrawalData[i][3]).toISOString().split('T')[0] : currentDateStr;
      
      if (!itemsByDate[wDate]) {
        itemsByDate[wDate] = [];
      }
      
      itemsByDate[wDate].push({
        expenseType: withdrawalData[i][4],
        amount: withdrawalData[i][5] || 0
      });
    }
  }
  
  dayData.total.additionalWithdrawal = {
    items: dayWithdrawals,
    itemsByDate: itemsByDate,
    totalAmount: totalAmount
  };
}


}


      summaryData.push(dayData);
    }
    return JSON.stringify({
      status: 'success',
      headers: paymentTypes,
      data: summaryData,
      isManager: userDetails.branchesManaged.includes(String(branchId))
    });
  } catch (e) {
    console.error("getSalesSummary Error: %s, Stack: %s", e.toString(), e.stack);
    return JSON.stringify({ status: 'error', message: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลสรุป: " + e.message });
  }
}




function findBestReport(reports, branchId, dateStr, timeSlot) {
  const relevantReports = reports.filter(r =>
    r[1] == branchId &&
    r[3] && new Date(r[3]).toISOString().startsWith(dateStr) &&
    r[4] === timeSlot
  );

  // ตรวจสอบ Verified reports
  const verified = relevantReports.filter(r => r[7] === 'Verified');
  if (verified.length > 0) {
    verified.sort((a, b) => new Date(b[3]) - new Date(a[3]));
    return verified[0][0];
  }

  // ตรวจสอบ Pending reports  
  const pending = relevantReports.filter(r => r[7] === 'Pending');
  if (pending.length > 0) {
    pending.sort((a, b) => new Date(b[3]) - new Date(a[3]));
    return pending[0][0];
  }

  return null;
}

function processSlotData(slotData, reportId, allReportItems, allDrinkSales, allSummaries, productMap) {
  // เพิ่มส่วนลดเข้าไปใน slotData
  slotData.totalDiscounts = 0;

  allDrinkSales.filter(ds => ds[1] === reportId).forEach(ds => {
    slotData.drinkUnits += parseFloat(ds[4]) || 0;
    slotData.drinkAmount += parseFloat(ds[3]) || 0;
  });

  allReportItems.filter(ri => ri[1] === reportId).forEach(ri => {
    const product = productMap[ri[2]];
    if (product) {
      const salesQty = parseFloat(ri[3]) || 0;
      const saleAmount = salesQty * product.salePrice;
      if (product.typeId === 'PT0007' || product.typeId === 'PT0005') {
        slotData.freshBakeryUnits += salesQty;
        slotData.freshBakeryAmount += saleAmount;
      } else if (product.typeId === 'PT0006') {
        slotData.dryBakeryUnits += salesQty;
        slotData.dryBakeryAmount += saleAmount;
      }
    }
  });

  // Process payments และ discounts
  allSummaries.filter(s => s[1] === reportId).forEach(s => {
    if (s[2]) { // Payment
      const paymentTypeId = s[2];
      const amount = parseFloat(s[4]) || 0;
      slotData.payments[paymentTypeId] = (slotData.payments[paymentTypeId] || 0) + amount;
      slotData.totalPayments += amount;
    } else if (s[3]) { // Discount
      const amount = parseFloat(s[4]) || 0;
      slotData.totalDiscounts += amount;
    }
  });
}

function calculateTotals(dayData, paymentTypes) {
  dayData.total.drinkUnits = dayData.morning.drinkUnits + dayData.afternoon.drinkUnits;
  dayData.total.drinkAmount = dayData.morning.drinkAmount + dayData.afternoon.drinkAmount;
  dayData.total.freshBakeryUnits = dayData.morning.freshBakeryUnits + dayData.afternoon.freshBakeryUnits;
  dayData.total.freshBakeryAmount = dayData.morning.freshBakeryAmount + dayData.afternoon.freshBakeryAmount;
  dayData.total.dryBakeryUnits = dayData.morning.dryBakeryUnits + dayData.afternoon.dryBakeryUnits;
  dayData.total.dryBakeryAmount = dayData.morning.dryBakeryAmount + dayData.afternoon.dryBakeryAmount;

  // เพิ่มการคำนวณส่วนลดรวม
  dayData.total.totalDiscounts = dayData.morning.totalDiscounts + dayData.afternoon.totalDiscounts;

  // ปรับการคำนวณ totalPayments ให้รวมส่วนลดด้วย
  dayData.total.totalPayments = dayData.morning.totalPayments + dayData.afternoon.totalPayments +
    dayData.morning.totalDiscounts + dayData.afternoon.totalDiscounts;

  paymentTypes.forEach(pt => {
    dayData.total.payments[pt.id] = (dayData.morning.payments[pt.id] || 0) + (dayData.afternoon.payments[pt.id] || 0);
  });
}

function createEmptySlotData(paymentTypes) {
  const payments = {};
  paymentTypes.forEach(pt => payments[pt.id] = 0);
  return {
    drinkUnits: 0, drinkAmount: 0,
    freshBakeryUnits: 0, freshBakeryAmount: 0,
    dryBakeryUnits: 0, dryBakeryAmount: 0,
    totalPayments: 0,
    totalDiscounts: 0, // เพิ่ม field ส่วนลด
    payments: payments
  };
}

function submitDailyReport(data) {
  try {
    const reportData = JSON.parse(data);


    const validationErrors = validateReportData(reportData);
    if (validationErrors.length > 0) {
      return JSON.stringify({
        status: 'error',
        message: 'ข้อมูลไม่ถูกต้อง:\n' + validationErrors.join('\n')
      });
    }

    const loggedInUserDetails = getUserDetails();
    const reportDate = new Date();

    let finalEmployeeId = loggedInUserDetails.employeeId;
    let finalNote = reportData.note;

    if (reportData.reporterInfo && reportData.reporterInfo.id) {
      finalEmployeeId = reportData.reporterInfo.id;
    } else if (reportData.reporterInfo && reportData.reporterInfo.name) {
      finalNote = `${finalNote} [ผู้บันทึก: ${reportData.reporterInfo.name}]`.trim();
    }

    const dailyReportsSheet = ss.getSheetByName('DailyReports');
    const dailyReportItemsSheet = ss.getSheetByName('DailyReportItems');
    const dailyReportSummariesSheet = ss.getSheetByName('DailyReportSummaries');
    const drinkCategorySalesSheet = ss.getSheetByName('DrinkCategorySales');
    const cancelledBillsSheet = ss.getSheetByName('CancelledBills');
    const addOnSalesSheet = ss.getSheetByName('AddOnSales');


    const newReportId = `REP-${Date.now()}`;
    dailyReportsSheet.appendRow([newReportId, loggedInUserDetails.branchIdAssigned, finalEmployeeId, reportDate, reportData.timeSlot, null, null, 'Pending', finalNote, null, null]);

    if (reportData.items && reportData.items.length > 0) {
      // 1) อ่านเลขล่าสุดจาก _database!D3
      const dbSheet = ss.getSheetByName('_database');
      let lastItemNo = dbSheet.getRange("D3").getValue() || 0;
      
      // 2) สร้างข้อมูลใหม่พร้อมเลขรันนิ่ง
      const newData = reportData.items.map(item => {
        lastItemNo++; // เพิ่มเลขทีละ 1
        const itemId = "ITEM-" + String(lastItemNo).padStart(8, "0"); 
        return [
          itemId,
          newReportId,
          item.productId,
          item.salesQuantity,
          item.receivedQuantity,
          item.expiredQuantity,
          item.currentStock,
          null,
          item.transferredQuantity,
          item.toBranchId
        ];
      });
      
      // 3) เขียนข้อมูลทั้งหมดทีเดียว
      const lastRow = dailyReportItemsSheet.getLastRow();
      dailyReportItemsSheet
        .getRange(lastRow + 1, 1, newData.length, newData[0].length)
        .setValues(newData);

      // 4) อัปเดตค่า D3 ใน _database ให้เป็นเลขล่าสุด
      dbSheet.getRange("D3").setValue(lastItemNo);
    }


    if (reportData.drinkCategories && drinkCategorySalesSheet) {
      reportData.drinkCategories.forEach(category => {
        if ((parseFloat(category.salesAmount) > 0) || (parseFloat(category.cupQuantity) > 0)) {
          drinkCategorySalesSheet.appendRow([`DCS-${Date.now()}-${Math.random()}`, newReportId, category.name, category.salesAmount, category.cupQuantity]);
        }
      });
    }



    if (reportData.cancelledBills && cancelledBillsSheet) {
      reportData.cancelledBills.forEach(bill => {
        cancelledBillsSheet.appendRow([
          `CB-${Date.now()}-${Math.random()}`,
          newReportId,
          bill.billNumber,
          bill.reason,
          bill.amount,
          bill.cancelledBy || ''
        ]);
      });
    }


    if (reportData.addOns && addOnSalesSheet) {
      reportData.addOns.forEach(addon => {
        addOnSalesSheet.appendRow([
          `ADD-${Date.now()}-${Math.random()}`,
          newReportId,
          addon.type,
          addon.amount,
          addon.quantity || '',  // คอลัมน์ E
          addon.unitPrice || ''  // คอลัมน์ F
        ]);
      });
    }


    const processSummary = (summaryItem, paymentTypeId, discountTypeId) => { dailyReportSummariesSheet.appendRow([`SUM-${Date.now()}-${Math.random()}`, newReportId, paymentTypeId, discountTypeId, summaryItem.amount]); };
    reportData.payments.forEach(p => processSummary(p, p.typeId, null));
    reportData.discounts.forEach(d => processSummary(d, null, d.typeId));

    return JSON.stringify({ status: 'success', message: 'รายงานถูกบันทึกเรียบร้อยแล้ว' });
  } catch (e) {
    console.error("submitDailyReport Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: 'เกิดข้อผิดพลาดในการบันทึก: ' + e.toString() });
  }
}

function updateAndVerifyReport(data) {
  try {
    const reportData = JSON.parse(data);

    const userDetails = getUserDetails();

    // ลบข้อมูลเก่า
    deleteChildRecords(reportData.reportId);

    // เตรียมข้อมูลทั้งหมด
    const itemRows = [];
    const summaryRows = [];
    const drinkRows = [];
    const cancelRows = [];
    const addOnRows = [];
    const dbSheet = ss.getSheetByName('_database');
    let lastItemNo = dbSheet.getRange("D3").getValue() || 0;
    reportData.items.forEach(item => {
      lastItemNo++; // เพิ่มเลขทีละ 1
      itemRows.push([
        `ITEM-${String(lastItemNo).padStart(8, "0")}`,
        reportData.reportId,
        item.productId,
        item.salesQuantity,
        item.receivedQuantity,
        item.expiredQuantity,
        item.currentStock,
        null,
        item.transferredQuantity,
        item.toBranchId
      ]);
    });
    
    dbSheet.getRange("D3").setValue(lastItemNo);

    if (reportData.payments) {
      reportData.payments.forEach(p => {
        if (parseFloat(p.amount) > 0) {
          summaryRows.push([
            `SUM-${Date.now()}-${Math.random()}`,
            reportData.reportId,
            p.typeId,
            null,
            p.amount
          ]);
        }
      });
    }

    if (reportData.discounts) {
      reportData.discounts.forEach(d => {
        if (parseFloat(d.amount) > 0) {
          summaryRows.push([
            `SUM-${Date.now()}-${Math.random()}`,
            reportData.reportId,
            null,
            d.typeId,
            d.amount
          ]);
        }
      });
    }

    if (reportData.drinkCategories) {
      reportData.drinkCategories.forEach(category => {
        if (parseFloat(category.salesAmount) > 0 || parseFloat(category.cupQuantity) > 0) {
          drinkRows.push([
            `DCS-${Date.now()}-${Math.random()}`,
            reportData.reportId,
            category.name,
            category.salesAmount,
            category.cupQuantity
          ]);
        }
      });
    }

    if (reportData.cancelledBills) {
      reportData.cancelledBills.forEach(bill => {
        if (bill.billNumber || bill.reason || bill.amount > 0) {
          cancelRows.push([
            `CB-${Date.now()}-${Math.random()}`,
            reportData.reportId,
            bill.billNumber,
            bill.reason,
            bill.amount,
            bill.cancelledBy || userDetails.name
          ]);
        }
      });
    }

    if (reportData.addOns) {
      reportData.addOns.forEach(addon => {
        if (addon.amount > 0) {
          addOnRows.push([
            `ADD-${Date.now()}-${Math.random()}`,
            reportData.reportId,
            addon.type,
            addon.amount,
            addon.quantity || '',
            addon.unitPrice || ''
          ]);
        }
      });
    }

    // บันทึกข้อมูลแบบ batch
    try {
      if (itemRows.length > 0) {
        const itemsSheet = ss.getSheetByName('DailyReportItems');
        itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, itemRows.length, itemRows[0].length).setValues(itemRows);
      }
      if (summaryRows.length > 0) {
        const summariesSheet = ss.getSheetByName('DailyReportSummaries');
        summariesSheet.getRange(summariesSheet.getLastRow() + 1, 1, summaryRows.length, summaryRows[0].length).setValues(summaryRows);
      }
      if (drinkRows.length > 0) {
        const drinkSheet = ss.getSheetByName('DrinkCategorySales');
        drinkSheet.getRange(drinkSheet.getLastRow() + 1, 1, drinkRows.length, drinkRows[0].length).setValues(drinkRows);
      }
      if (cancelRows.length > 0) {
        const cancelSheet = ss.getSheetByName('CancelledBills');
        cancelSheet.getRange(cancelSheet.getLastRow() + 1, 1, cancelRows.length, cancelRows[0].length).setValues(cancelRows);
      }
      if (addOnRows.length > 0) {
        const addOnSheet = ss.getSheetByName('AddOnSales');
        addOnSheet.getRange(addOnSheet.getLastRow() + 1, 1, addOnRows.length, addOnRows[0].length).setValues(addOnRows);
      }
    } catch (e) {
      throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + e.message);
    }

    // อัพเดต status
    const reportsSheet = ss.getSheetByName('DailyReports');
    const reports = reportsSheet.getDataRange().getValues();
    let reportRowIndex = -1;
    let reportDate = null;
    let branchId = null;

    for (let i = 1; i < reports.length; i++) {
      if (reports[i][0] == reportData.reportId) {
        reportRowIndex = i;
        reportDate = reports[i][3];
        branchId = reports[i][1];

        reportsSheet.getRange(i + 1, 5, 1, 5).setValues([[
          reportData.timeSlot,
          userDetails.employeeId,
          new Date(),
          'Verified',
          reportData.note
        ]]);
        break;
      }
    }

    // สรุป summary
    if (reportRowIndex > 0 && reportDate && branchId) {
      const timeSlot = reportData.timeSlot;
      updateDailySalesSummary(reportData.reportId, branchId, reportDate, timeSlot);
    }

    return JSON.stringify({
      status: 'success',
      message: `ยืนยันและอัปเดต Report ID: ${reportData.reportId} เรียบร้อยแล้ว`
    });

  } catch (e) {
    const dbSheet = ss.getSheetByName('_database');
    dbSheet.getRange("K4").setValue("Error: " + e.toString());
    return JSON.stringify({
      status: 'error',
      message: 'เกิดข้อผิดพลาด: ' + e.toString()
    });
  }
}



/**
 * Daily process สำหรับ backup - รันทุกวันเวลา 2:00
 * ตรวจสอบและคำนวณ summary ที่อาจหายไป
 */
function runDailySummaryProcess() {
  try {
    
    // ดึงรายการ branches
    const branchesSheet = ss.getSheetByName('Branches');
    const branches = branchesSheet.getDataRange().getValues();
    
    // ดึง verified reports ทั้งหมด
    const reportsSheet = ss.getSheetByName('DailyReports');
    const reports = reportsSheet.getDataRange().getValues();
    
    let processCount = 0;
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // หา verified reports ในช่วง 7 วันที่ผ่านมา
    for (let i = 1; i < reports.length; i++) {
      const report = reports[i];
      const reportDate = new Date(report[3]);
      
      // ตรวจสอบว่าเป็น verified และอยู่ในช่วง 7 วัน
      if (report[7] === 'Verified' && 
          reportDate >= sevenDaysAgo && 
          reportDate <= today) {
        
        const reportId = report[0];
        const branchId = report[1];
        const dateStr = reportDate.toISOString().split('T')[0];
        const timeSlot = report[4];  // ดึง timeSlot
        
        // ตรวจสอบว่ามี summary แล้วหรือยัง
        if (!checkExistingSummary(branchId, dateStr, timeSlot)) {          
          const summary = calculateDailySummary(branchId, dateStr, timeSlot);
          saveDailySummary(reportId, branchId, dateStr, timeSlot, summary);
          processCount++;
        }
      }
    }
    
    
  } catch (e) {
    console.error('runDailySummaryProcess Error:', e);
    console.error('Stack trace:', e.stack);
  }
}

/**
 * ตรวจสอบว่ามี verified reports หรือไม่
 */
function hasVerifiedReports(branchId, dateStr) {
  const sheet = ss.getSheetByName('DailyReports');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == branchId &&
      data[i][7] === 'Verified' &&
      new Date(data[i][3]).toISOString().split('T')[0] === dateStr) {
      return true;
    }
  }

  return false;
}


function markReportAsDeleted(reportId) {
  try {
    const userDetails = getUserDetails();
    const reportsSheet = ss.getSheetByName('DailyReports');
    const reports = reportsSheet.getDataRange().getValues();
    for (let i = 1; i < reports.length; i++) {
      if (reports[i][0] == reportId) {
        reportsSheet.getRange(i + 1, 6).setValue(userDetails.employeeId);
        reportsSheet.getRange(i + 1, 7).setValue(new Date());
        reportsSheet.getRange(i + 1, 8).setValue('Deleted');
        break;
      }
    }
    return JSON.stringify({ status: 'success', message: `ยกเลิก Report ID: ${reportId} เรียบร้อย` });
  } catch (e) {
    console.error('markReportAsDeleted Error: ' + e.toString());
    return JSON.stringify({ status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.toString() });
  }
}

function deleteChildRecords(reportId) {
  const dbSheet = ss.getSheetByName('_database');

  // แทนค่า ReportID ลงใน G2
  dbSheet.getRange("G2").setValue(reportId);

  const sheetsToDeleteFrom = [
    'DailyReportItems',
    'DailyReportSummaries',
    'DrinkCategorySales',
    'CancelledBills',
    'AddOnSales'
  ];

  sheetsToDeleteFrom.forEach(sheetName => {
    // แทนค่าชื่อชีทลงไปใน F2
    dbSheet.getRange("F2").setValue(sheetName);

    // ให้สูตรใน _database คำนวณ I2 และ J2 เสร็จก่อน
    Utilities.sleep(200); // รอ 0.2 วิ

    const startRow = parseInt(dbSheet.getRange("I2").getValue(), 10);
    const endRow = parseInt(dbSheet.getRange("J2").getValue(), 10);

    if (startRow && endRow && endRow >= startRow) {
      const targetSheet = ss.getSheetByName(sheetName);
      if (targetSheet) {
        const numRows = endRow - startRow + 1;
        targetSheet.deleteRows(startRow, numRows);
      }
    }
  });
}





function logBankTransfer(logData) {
  try {
    const { branchId, dateOfSale, transferDate, amount, note } = JSON.parse(logData);
    const userDetails = getUserDetails();
    const transferSheet = ss.getSheetByName('BankTransfers');
    const data = transferSheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == branchId && new Date(data[i][2]).toISOString().startsWith(dateOfSale)) {
        existingRow = i + 1;
        break;
      }
    }
    if (existingRow > -1) {
      transferSheet.getRange(existingRow, 4).setValue(new Date(transferDate));
      transferSheet.getRange(existingRow, 5).setValue(amount);
      transferSheet.getRange(existingRow, 6).setValue(userDetails.employeeId);
      transferSheet.getRange(existingRow, 7).setValue(note);
    } else {
      transferSheet.appendRow([`TR-${Date.now()}`, branchId, new Date(dateOfSale), new Date(transferDate), amount, userDetails.employeeId, note]);
    }
    return JSON.stringify({ status: 'success', message: 'บันทึกข้อมูลการโอนเงินเรียบร้อย' });
  } catch (e) {
    console.error("logBankTransfer Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getSmartOrderData(branchId) {
  try {
    const reportsData = ss.getSheetByName('DailyReports').getDataRange().getValues();
    const reportItemsData = ss.getSheetByName('DailyReportItems').getDataRange().getValues();
    const productsData = ss.getSheetByName('Products').getDataRange().getValues();
    const claimsData = ss.getSheetByName('Claims').getDataRange().getValues();
    const suppliersData = ss.getSheetByName('Suppliers').getDataRange().getValues();

    const supplierMap = suppliersData.slice(1).reduce((map, s) => {
      map[s[0]] = s[1];
      return map;
    }, {});

    const productMap = productsData.slice(1).reduce((map, p) => {
      map[p[0]] = { name: p[1], supplierId: p[6] };
      return map;
    }, {});

    const reportMap = reportsData.slice(1).reduce((map, r) => {
      map[r[0]] = { branchId: r[1], status: r[7], date: new Date(r[3]) };
      return map;
    }, {});

    const verifiedReportIds = new Set(reportsData.slice(1)
      .filter(r => r[1] == branchId && r[7] === 'Verified')
      .map(r => r[0]));

    if (verifiedReportIds.size === 0) {
      return JSON.stringify({ status: 'success', data: [] });
    }

    const verifiedItems = reportItemsData.slice(1).filter(item => 
      verifiedReportIds.has(item[1]));

    // **ส่วนใหม่: คำนวณยอดเคลมทั้งหมด (รวม Pending และ Received)**
    const totalClaimedMap = claimsData.slice(1).filter(c => c[2] == branchId).reduce((map, c) => {
      const productId = c[4];
      // รวมทั้ง ReportedExpiredQuantity (คอลัมน์ 5) ของทุก status
      map[productId] = (map[productId] || 0) + (parseFloat(c[5]) || 0);
      return map;
    }, {});

    const productData = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    verifiedItems.forEach(item => {
      const productId = item[2];
      if (!productMap[productId]) return;

      if (!productData[productId]) {
        productData[productId] = {
          productId: productId,
          name: productMap[productId].name,
          supplierId: productMap[productId].supplierId,
          supplierName: supplierMap[productMap[productId].supplierId] || 'N/A',
          totalExpired: 0,
          latestStock: 0,
          salesLast7Days: 0,
          latestReportDate: new Date(0)
        };
      }

      const report = reportMap[item[1]];
      if (!report) return;

      productData[productId].totalExpired += parseFloat(item[5]) || 0;

      if (report.date > productData[productId].latestReportDate) {
        productData[productId].latestStock = parseFloat(item[6]) || 0;
        productData[productId].latestReportDate = report.date;
      }

      if (report.date >= sevenDaysAgo) {
        productData[productId].salesLast7Days += parseFloat(item[3]) || 0;
      }
    });

    const result = Object.values(productData).map(p => {
      const totalClaimed = totalClaimedMap[p.productId] || 0;
      p.unclaimedExpired = Math.max(0, p.totalExpired - totalClaimed); // ป้องกันค่าลบ
      return p;
    }).filter(p => p.unclaimedExpired > 0 || p.latestStock > 0 || p.salesLast7Days > 0);

    return JSON.stringify({ status: 'success', data: result });

  } catch (e) {
    console.error("getSmartOrderData Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getSingleProductData(productId, branchId) {
  try {
    const reportsData = ss.getSheetByName('DailyReports').getDataRange().getValues();
    const reportItemsData = ss.getSheetByName('DailyReportItems').getDataRange().getValues();
    const productsData = ss.getSheetByName('Products').getDataRange().getValues();
    const claimsData = ss.getSheetByName('Claims').getDataRange().getValues();
    const suppliersData = ss.getSheetByName('Suppliers').getDataRange().getValues();

    const supplierMap = suppliersData.slice(1).reduce((map, s) => { map[s[0]] = s[1]; return map; }, {});
    const productInfo = productsData.find(p => p[0] == productId);
    if (!productInfo) { throw new Error("ไม่พบรหัสสินค้านี้ในระบบ"); }

    const reportMap = reportsData.slice(1).reduce((map, r) => {
      map[r[0]] = { branchId: r[1], status: r[7], date: new Date(r[3]) };
      return map;
    }, {});

    const verifiedItemsForProduct = reportItemsData.slice(1).filter(item => {
      const report = reportMap[item[1]];
      return report && report.branchId == branchId && report.status === 'Verified' && item[2] == productId;
    });

    let totalExpired = 0;
    let latestStock = 0;
    let salesLast7Days = 0;
    let latestReportDate = new Date(0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    verifiedItemsForProduct.forEach(item => {
      const reportDate = reportMap[item[1]].date;
      totalExpired += parseFloat(item[5]) || 0;
      if (reportDate > latestReportDate) {
        latestStock = parseFloat(item[6]) || 0;
        latestReportDate = reportDate;
      }
      if (reportDate >= sevenDaysAgo) {
        salesLast7Days += parseFloat(item[3]) || 0;
      }
    });

    const totalClaimed = claimsData.slice(1)
      .filter(c => c[2] == branchId && c[4] == productId)
      .reduce((sum, c) => sum + (parseFloat(c[5]) || 0), 0);

    const result = {
      productId: productId,
      name: productInfo[1],
      supplierId: productInfo[6],
      supplierName: supplierMap[productInfo[6]] || 'N/A',
      salesLast7Days: salesLast7Days,
      latestStock: latestStock,
      unclaimedExpired: totalExpired - totalClaimed
    };

    return JSON.stringify({ status: 'success', data: result });
  } catch (e) {
    console.error("getSingleProductData Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function processSmartOrderAndClaim(dataString) {
  try {
    const { branchId, items } = JSON.parse(dataString);
    const userDetails = getUserDetails();
    const orderDate = new Date();
    const poSheet = ss.getSheetByName('PurchaseOrders');
    const poItemsSheet = ss.getSheetByName('PurchaseOrderItems');
    const claimsSheet = ss.getSheetByName('Claims');
    const itemsToOrder = items.filter(item => (parseFloat(item.orderQty) || 0) > 0);
    const itemsToClaim = items.filter(item => (parseFloat(item.claimQty) || 0) > 0);
    const ordersBySupplier = itemsToOrder.reduce((acc, item) => {
      (acc[item.supplierId] = acc[item.supplierId] || []).push(item);
      return acc;
    }, {});
    let poCount = 0;
    for (const supplierId in ordersBySupplier) {
      const supplierItems = ordersBySupplier[supplierId];
      const newOrderId = `PO-${branchId}-${Date.now()}`;
      poSheet.appendRow([newOrderId, orderDate, branchId, userDetails.employeeId, 'Approved', 'Auto-generated from Smart Order', '', '']);
      poCount++;
      supplierItems.forEach(item => {
        poItemsSheet.appendRow(['', newOrderId, item.productId, item.orderQty, item.orderQty]);
      });
      itemsToClaim.filter(claimItem => claimItem.supplierId === supplierId).forEach(claimItem => {
        const writeOff = claimItem.unclaimedExpired - claimItem.claimQty;
        claimsSheet.appendRow([
          `CLM-${Date.now()}-${Math.random()}`,
          orderDate,
          branchId,
          userDetails.employeeId,
          claimItem.productId,
          claimItem.claimQty,
          writeOff,
          'Claimed from Smart Order',
          'Completed',
          newOrderId
        ]);
      });
    }
    return JSON.stringify({ status: 'success', message: `สร้างใบสั่งซื้อ ${poCount} ฉบับ และบันทึกรายการเคลม ${itemsToClaim.length} รายการเรียบร้อยแล้ว` });
  } catch (e) {
    console.error("processSmartOrderAndClaim Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getStockOverview(branchId) {
  try {
    const reportsSheet = ss.getSheetByName('DailyReports');
    const itemsSheet = ss.getSheetByName('DailyReportItems');
    const productsSheet = ss.getSheetByName('Products');
    const suppliersSheet = ss.getSheetByName('Suppliers');

    const reportsData = reportsSheet.getDataRange().getValues();
    const itemsData = itemsSheet.getDataRange().getValues();
    const productsData = productsSheet.getDataRange().getValues();
    const suppliersData = suppliersSheet.getDataRange().getValues();

    const supplierMap = suppliersData.slice(1).reduce((map, row) => {
      map[row[0]] = row[1];
      return map;
    }, {});

    const productMap = productsData.slice(1).reduce((map, row) => {
      map[row[0]] = { name: row[1], supplierId: row[6] };
      return map;
    }, {});

    const verifiedReportIds = new Set();
    const reportDateMap = {};
    const reportTimeSlotMap = {};


    for (let i = 1; i < reportsData.length; i++) {
      const row = reportsData[i];
      if (row[1] == branchId && row[7] === 'Verified') {
        const reportId = row[0];
        verifiedReportIds.add(reportId);
        reportDateMap[reportId] = new Date(row[3]);
        reportTimeSlotMap[reportId] = row[4];
      }
    }

    if (verifiedReportIds.size === 0) {
      return JSON.stringify({ status: 'success', data: [] });
    }

const latestStockMap = {};
for (let i = 1; i < itemsData.length; i++) {
  const itemRow = itemsData[i];
  const reportId = itemRow[1];
  if (verifiedReportIds.has(reportId)) {
    const productId = itemRow[2];
    const currentStock = itemRow[6];
    const reportDate = reportDateMap[reportId];
    const timeSlot = reportTimeSlotMap[reportId];
    
    if (!latestStockMap[productId]) {
      latestStockMap[productId] = {
        stock: currentStock,
        date: reportDate,
        timeSlot: timeSlot
      };
    } else {
      // เปรียบเทียบวันที่ก่อน
      if (reportDate > latestStockMap[productId].date) {
        latestStockMap[productId] = {
          stock: currentStock,
          date: reportDate,
          timeSlot: timeSlot
        };
      } else if (reportDate.getTime() === latestStockMap[productId].date.getTime()) {
        // ถ้าวันที่เท่ากัน ให้เอารอบบ่าย
        if (timeSlot === 'บ่าย' && latestStockMap[productId].timeSlot === 'เช้า') {
          latestStockMap[productId] = {
            stock: currentStock,
            date: reportDate,
            timeSlot: timeSlot
          };
        }
      }
    }
  }
}

    const overviewData = Object.keys(latestStockMap).map(productId => {
      const productInfo = productMap[productId] || { name: 'Unknown Product', supplierId: null };
      const supplierId = productInfo.supplierId;
      const supplierName = supplierId ? supplierMap[supplierId] : 'ไม่มีซัพพลายเออร์';

      return {
        productId: productId,
        productName: productInfo.name,
        supplierName: supplierName,
        currentStock: latestStockMap[productId].stock,
        lastUpdate: latestStockMap[productId].date.toLocaleDateString('th-TH')+ ' (' + latestStockMap[productId].timeSlot + ')'
      };
    });

    return JSON.stringify({ status: 'success', data: overviewData });

  } catch (e) {
    console.error("getStockOverview Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function getOnlinePaymentChannels() {
  try {
    const sheet = ss.getSheetByName('OnlinePaymentChannels');
    if (!sheet) {
      throw new Error("หาชีท 'OnlinePaymentChannels' ไม่เจอ! กรุณาตรวจสอบการสะกดชื่อชีทให้ถูกต้อง");
    }
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
    return data.map(row => ({
      id: row[0],
      name: row[1],
      feeRate: parseFloat(row[2]) || 0,
      isVatOnFee: row[3] === true,
      paymentTypeIds: row[4].toString().split(',').map(id => id.trim())
    })).filter(c => c.id && c.name);
  } catch (e) {
    console.error("getOnlinePaymentChannels Error: " + e.toString());
    throw e;
  }
}

function getReconciliationData(startDateStr, endDateStr) {
  try {
    const userDetails = getUserDetails();
    const managedBranches = new Set(userDetails.branchesManaged.map(String));

    const reportsSheet = ss.getSheetByName('DailyReports');
    if (!reportsSheet) throw new Error("หาชีท 'DailyReports' ไม่เจอ!");

    const summariesSheet = ss.getSheetByName('DailyReportSummaries');
    if (!summariesSheet) throw new Error("หาชีท 'DailyReportSummaries' ไม่เจอ!");

    const reconSheet = ss.getSheetByName('OnlineReconciliations');
    if (!reconSheet) throw new Error("หาชีท 'OnlineReconciliations' ไม่เจอ!");

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    const channels = getOnlinePaymentChannels();
    const reportsData = reportsSheet.getDataRange().getValues();
    const summariesData = summariesSheet.getDataRange().getValues();
    const reconciliationsData = reconSheet.getDataRange().getValues();

    const paymentTypeToChannelMap = {};
    channels.forEach(ch => { ch.paymentTypeIds.forEach(ptId => { paymentTypeToChannelMap[ptId] = ch; }); });
    const reconMap = reconciliationsData.slice(1).reduce((map, row) => {
      const key = `${new Date(row[1]).toISOString().split('T')[0]}_${row[2]}_${row[3]}`;
      map[key] = { depositDate: row[4] ? new Date(row[4]).toISOString().split('T')[0] : '', actualDeposit: row[5], note: row[6], fee: row[9] };
      return map;
    }, {});
    const verifiedReports = {};
    for (let i = 1; i < reportsData.length; i++) {
      const row = reportsData[i];
      const reportDate = new Date(row[3]);
      const branchId = String(row[1]);
      if (row[7] === 'Verified' && reportDate >= startDate && reportDate <= endDate && managedBranches.has(branchId)) {
        verifiedReports[row[0]] = { date: reportDate.toISOString().split('T')[0], branchId: row[1] };
      }
    }
    const salesMap = {};
    for (let i = 1; i < summariesData.length; i++) {
      const summaryRow = summariesData[i];
      const reportId = summaryRow[1];
      const paymentTypeId = summaryRow[2];
      if (verifiedReports[reportId] && paymentTypeToChannelMap[paymentTypeId]) {
        const reportInfo = verifiedReports[reportId];
        const channelInfo = paymentTypeToChannelMap[paymentTypeId];
        const salesKey = `${reportInfo.date}_${reportInfo.branchId}_${channelInfo.id}`;
        salesMap[salesKey] = (salesMap[salesKey] || 0) + parseFloat(summaryRow[4] || 0);
      }
    }
    const result = Object.keys(salesMap).map(key => {
      const [date, branchId, channelId] = key.split('_');
      const grossSales = salesMap[key];
      const channelInfo = channels.find(c => c.id === channelId);
      const reconKey = `${date}_${channelId}_${branchId}`;
      const existingRecon = reconMap[reconKey] || {};
      return { dateOfSale: date, branchId: branchId, channelId: channelId, channelName: channelInfo.name, isVatOnFee: channelInfo.isVatOnFee, grossSales: grossSales, depositDate: existingRecon.depositDate || '', actualDeposit: existingRecon.actualDeposit || '', note: existingRecon.note || '', fee: existingRecon.fee || '' };
    });
    return JSON.stringify({ status: 'success', data: result });
  } catch (e) {
    console.error("getReconciliationData Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: e.message });
  }
}

function saveReconciliationData(itemString) {
  try {
    const item = JSON.parse(itemString);
    const userDetails = getUserDetails();
    const sheet = ss.getSheetByName('OnlineReconciliations');
    if (!sheet) {
      throw new Error("หาชีท 'OnlineReconciliations' ไม่เจอ! ไม่สามารถบันทึกข้อมูลได้");
    }
    const existingData = sheet.getDataRange().getValues();

    const dateOfSale = new Date(item.dateOfSale);

    let foundRowIndex = -1;
    for (let i = 1; i < existingData.length; i++) {
      const row = existingData[i];
      if (new Date(row[1]).getTime() === dateOfSale.getTime() && row[2] === item.channelId && row[3] === item.branchId) {
        foundRowIndex = i + 1;
        break;
      }
    }

    const valuesToSet = [[
      item.depositDate ? new Date(item.depositDate) : null,
      item.actualDeposit,
      item.note,
      userDetails.employeeId,
      new Date(),
      item.fee
    ]];

    if (foundRowIndex > -1) {
      sheet.getRange(foundRowIndex, 5, 1, 6).setValues(valuesToSet);
    } else {
      sheet.appendRow([
        `REC-${Date.now()}-${Math.random()}`,
        dateOfSale,
        item.channelId,
        item.branchId,
        item.depositDate ? new Date(item.depositDate) : null,
        item.actualDeposit,
        item.note,
        userDetails.employeeId,
        new Date(),
        item.fee
      ]);
    }

    return JSON.stringify({ status: 'success', message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
  } catch (e) {
    console.error("saveReconciliationData Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.message });
  }
}



/**
 * ฟังก์ชันใหม่: ดึงข้อมูลสินค้าทั้งหมดที่ Active และจัดกลุ่มตามชื่อ Supplier
 * @returns {Object} Object ที่มี key เป็น Supplier Name และ value เป็น Array ของ Product
 */
function getAllProductsGroupedBySupplier() {
  try {
    const productsSheet = ss.getSheetByName('Products');
    const suppliersSheet = ss.getSheetByName('Suppliers');
    if (!productsSheet || !suppliersSheet) {
      throw new Error("ไม่พบชีท Products หรือ Suppliers");
    }

    const suppliersData = suppliersSheet.getRange(2, 1, suppliersSheet.getLastRow() - 1, 2).getValues();
    const supplierMap = suppliersData.reduce((map, row) => {
      map[row[0]] = row[1]; // id -> name
      return map;
    }, {});

    const productsData = productsSheet.getDataRange().getValues();
    const groupedProducts = {};

    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      const status = row[7];
      const supplierId = row[6];
      const supplierName = supplierMap[supplierId] || 'ไม่มีซัพพลายเออร์';

      if (status === 'Active' && supplierId && supplierId !== 'S0019') {
        if (!groupedProducts[supplierName]) {
          groupedProducts[supplierName] = [];
        }
        // ส่งข้อมูลที่จำเป็นทั้งหมดไปให้ Front-end
        groupedProducts[supplierName].push({
          id: row[0],
          name: row[1],
          supplierId: supplierId,
          supplierName: supplierName,
          price: parseFloat(row[4]) || 0  // เพิ่มราคา
        });
      }
    }
    return groupedProducts;
  } catch (e) {
    console.error("getAllProductsGroupedBySupplier Error: " + e.toString());
    return {};
  }
}


// === AUTO BACKUP SYSTEM ===
function createDailyBackup() {
  try {
    const backupFolderId = PropertiesService.getScriptProperties().getProperty('BACKUP_FOLDER_ID');
    if (!backupFolderId) {
      return;
    }

    const today = new Date();
    const backupName = `AMZ_Backup_${today.toISOString().split('T')[0]}`;

    // สร้าง copy ของ spreadsheet
    const file = DriveApp.getFileById(ss.getId());
    const backupFile = file.makeCopy(backupName, DriveApp.getFolderById(backupFolderId));

    // ลบ backup เก่าที่เกิน 30 วัน
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const backupFolder = DriveApp.getFolderById(backupFolderId);
    const files = backupFolder.getFiles();

    while (files.hasNext()) {
      const oldFile = files.next();
      if (oldFile.getDateCreated() < thirtyDaysAgo) {
        oldFile.setTrashed(true);
      }
    }

  } catch (e) {
    console.error('Backup failed:', e);
  }
}

// ==================== DAILY SALES SUMMARY SYSTEM ====================

/**
 * ฟังก์ชันหลักสำหรับอัพเดท Daily Sales Summary
 * จะถูกเรียกหลังจาก verify report เสร็จ
 */
function updateDailySalesSummary(reportId, branchId, reportDate, timeSlot) {
  try {
    // รอให้ verify เสร็จสมบูรณ์ก่อน
    Utilities.sleep(200);
    
    // แปลงวันที่เป็น date object
    const date = new Date(reportDate);
    const dateStr = date.toISOString().split('T')[0];
    
    // ตรวจสอบว่ามี summary ของวันนี้และรอบนี้แล้วหรือยัง
    const existingSummary = checkExistingSummary(branchId, dateStr, timeSlot);
    
    if (existingSummary) {
      return;
    }
    
    // คำนวณยอดขายของรอบนั้น
    const summary = calculateDailySummary(branchId, dateStr, timeSlot);
    
    // บันทึกลง DailySalesSummary
    saveDailySummary(reportId, branchId, dateStr, timeSlot, summary);
    
    
  } catch (e) {
    console.error('updateDailySalesSummary Error:', e);
    // ไม่ throw error เพื่อไม่ให้กระทบการ verify
  }
}

/**
 * ตรวจสอบว่ามี summary อยู่แล้วหรือไม่
 */
function checkExistingSummary(branchId, dateStr, timeSlot) {
  const sheet = ss.getSheetByName('DailySalesSummary');
  if (!sheet) return false;
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] == branchId && 
        new Date(data[i][3]).toISOString().split('T')[0] === dateStr &&
        data[i][4] === timeSlot) {
      return true;
    }
  }
  
  return false;
}

/**
 * คำนวณยอดขายรายวัน
 */
function calculateDailySummary(branchId, dateStr, timeSlot) {
  const reportsSheet = ss.getSheetByName('DailyReports');
  const itemsSheet = ss.getSheetByName('DailyReportItems');
  const productsSheet = ss.getSheetByName('Products');
  const drinkCategorySheet = ss.getSheetByName('DrinkCategorySales');
  
  // หา report IDs ที่ verified ของวันและรอบนั้น
  const reportIds = [];
  const reportsData = reportsSheet.getDataRange().getValues();
  
  for (let i = 1; i < reportsData.length; i++) {
    const row = reportsData[i];
    if (row[1] == branchId && 
        row[7] === 'Verified' &&
        new Date(row[3]).toISOString().split('T')[0] === dateStr &&
        row[4] === timeSlot) {  // เช็ค timeSlot ด้วย
      reportIds.push(row[0]);
    }
  }
  
  if (reportIds.length === 0) {
    return {
      drinkUnits: 0,
      freshBakeryUnits: 0,
      dryBakeryUnits: 0,
      totalRevenue: 0
    };
  }
  
  // ดึงข้อมูลสินค้า
  const productsData = productsSheet.getDataRange().getValues();
  const productMap = {};
  for (let i = 1; i < productsData.length; i++) {
    productMap[productsData[i][0]] = {
      typeId: productsData[i][2],
      salePrice: parseFloat(productsData[i][4]) || 0
    };
  }
  
  // คำนวณจากรายการสินค้า
  let freshBakeryUnits = 0;
  let dryBakeryUnits = 0;
  
  const itemsData = itemsSheet.getDataRange().getValues();
  
  for (let i = 1; i < itemsData.length; i++) {
    const item = itemsData[i];
    if (reportIds.includes(item[1])) {
      const productId = item[2];
      const quantity = parseFloat(item[3]) || 0;
      const product = productMap[productId];
      
      if (product) {
        
        // นับจำนวนชิ้น
        if (product.typeId === 'PT0005' || product.typeId === 'PT0007') {
          freshBakeryUnits += quantity;
        } else if (product.typeId === 'PT0006') {
          dryBakeryUnits += quantity;
        }
      }
    }
  }
  
  // คำนวณจำนวนแก้วเครื่องดื่ม
  let drinkUnits = 0;
  const drinkData = drinkCategorySheet.getDataRange().getValues();
  
  for (let i = 1; i < drinkData.length; i++) {
    if (reportIds.includes(drinkData[i][1])) {
      drinkUnits += parseFloat(drinkData[i][4]) || 0;
    }
  }
  
  // คำนวณ totalRevenue จาก DailyReportSummaries
let totalRevenue = 0;
const summariesSheet = ss.getSheetByName('DailyReportSummaries');
const summariesData = summariesSheet.getDataRange().getValues();

for (let i = 1; i < summariesData.length; i++) {
  if (reportIds.includes(summariesData[i][1])) {
    // รวมทั้ง payment และ discount
    totalRevenue += parseFloat(summariesData[i][4]) || 0;
  }
}

return {
  drinkUnits: drinkUnits,
  freshBakeryUnits: freshBakeryUnits,
  dryBakeryUnits: dryBakeryUnits,
  totalRevenue: totalRevenue
};

  
  return {
    drinkUnits: drinkUnits,
    freshBakeryUnits: freshBakeryUnits,
    dryBakeryUnits: dryBakeryUnits,
    totalRevenue: totalRevenue
  };
}

/**
 * บันทึก summary ลงตาราง
 */
function saveDailySummary(reportId, branchId, dateStr, timeSlot, summary) {
  const sheet = ss.getSheetByName('DailySalesSummary');
  if (!sheet) {
    throw new Error('ไม่พบชีท DailySalesSummary');
  }
  
  const summaryId = `SUM-${Date.now()}`;
  const now = new Date();
  
  sheet.appendRow([
    summaryId,
    branchId,
    reportId,  // เพิ่ม reportId
    new Date(dateStr),
    timeSlot,  // เพิ่ม timeSlot
    summary.drinkUnits,
    summary.freshBakeryUnits,
    summary.dryBakeryUnits,
    summary.totalRevenue,
    now
  ]);
}

// ==================== DASHBOARD DATA FUNCTIONS ====================

/**
 * ดึงข้อมูลสำหรับ Dashboard Analytics
 */

function getDashboardData_2(branchId, startDate, endDate, viewType, lastStartDate, lastEndDate) {
  try {
    // ตรวจสอบสิทธิ์
    const userDetails = getUserDetails();
    if (userDetails.role === 'หน้าร้าน' && branchId !== userDetails.branchIdAssigned) {
      throw new Error('ไม่มีสิทธิ์ดูข้อมูลสาขาอื่น');
    }

    const summarySheet = ss.getSheetByName('DailySalesSummary');
    if (!summarySheet) {
      throw new Error('ไม่พบข้อมูล Summary');
    }

    const dbSheet = ss.getSheetByName('_database');

    // ---------------- current period ----------------
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    dbSheet.getRange('K3:M3').setValues([[branchId, startDateObj, endDateObj]]);

    let current = { status: 'success', data: [], summary: {} };
    const lastRow = dbSheet.getRange("N3").getValue();
    if (lastRow && lastRow >= 6) {
      const dataTempo = dbSheet.getRange(6, 11, lastRow - 5, 5).getValues(); // K..O
      current = processRange(dataTempo, viewType);
    }

    // ---------------- lastMonth period ----------------
    let lastMonth = { status: 'success', data: [], summary: {} };
    if (lastStartDate && lastEndDate) {
      const lastStartDateObj = new Date(lastStartDate);
      const lastEndDateObj = new Date(lastEndDate);
      dbSheet.getRange('O3:P3').setValues([[lastStartDateObj, lastEndDateObj]]);

      const lastRowLastMonth = dbSheet.getRange("Q3").getValue();
      if (lastRowLastMonth && lastRowLastMonth >= 6) {
        const dataTempoLast = dbSheet.getRange(6, 17, lastRowLastMonth - 5, 5).getValues(); // Q..U
        lastMonth = processRange(dataTempoLast, viewType);
      }
    }

    // ✅ คืนค่าทั้ง current และ lastMonth
    return JSON.stringify({
      status: 'success',
      current: current,
      lastMonth: lastMonth
    });

  } catch (e) {
    console.error('getDashboardData Error:', e);
    return JSON.stringify({
      status: 'error',
      current: { status: 'error', message: e.toString() },
      lastMonth: { status: 'error', message: e.toString() }
    });
  }
}

function getDashboardData(branchId, startDate, endDate, viewType) {
  try {
    // ตรวจสอบสิทธิ์
    const userDetails = getUserDetails();
    if (userDetails.role === 'หน้าร้าน' && branchId !== userDetails.branchIdAssigned) {
      throw new Error('ไม่มีสิทธิ์ดูข้อมูลสาขาอื่น');
    }

    const summarySheet = ss.getSheetByName('DailySalesSummary');
    if (!summarySheet) {
      throw new Error('ไม่พบข้อมูล Summary');
    }

    const data = summarySheet.getDataRange().getValues();
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    // กรองข้อมูลตาม branch และช่วงวันที่
// กรองและรวมข้อมูลตาม branch และช่วงวันที่
const dailyData = {};
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const rowDate = new Date(row[3]);  // เปลี่ยน index เพราะมี column เพิ่ม
  const dateStr = rowDate.toISOString().split('T')[0];
  
  if (row[1] == branchId && 
      rowDate >= startDateObj && 
      rowDate <= endDateObj) {
    
    // ถ้ายังไม่มีข้อมูลวันนี้ ให้สร้างใหม่
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = {
        date: row[3],
        drinkUnits: 0,
        freshBakeryUnits: 0,
        dryBakeryUnits: 0,
        totalRevenue: 0
      };
    }
    
    // บวกเพิ่มข้อมูล (รวมเช้า+บ่าย)
    dailyData[dateStr].drinkUnits += row[5] || 0;
    dailyData[dateStr].freshBakeryUnits += row[6] || 0;
    dailyData[dateStr].dryBakeryUnits += row[7] || 0;
    dailyData[dateStr].totalRevenue += row[8] || 0;
  }
}

// แปลง object เป็น array
const filteredData = Object.values(dailyData);

    // จัดเรียงตามวันที่
    filteredData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // จัดกลุ่มตาม viewType
    let processedData = [];
    if (viewType === 'daily') {
      processedData = filteredData;
    } else if (viewType === 'weekly') {
      processedData = groupByWeek(filteredData);
    } else if (viewType === 'monthly') {
      processedData = groupByMonth(filteredData);
    }

    // คำนวณค่าเฉลี่ยและสรุป
    const summary = calculateSummaryStats(processedData);


    return JSON.stringify({
      status: 'success',
      data: processedData,
      summary: summary,
    });

  } catch (e) {
    console.error('getDashboardData Error:', e);
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}

/**
 * ฟังก์ชันย่อยสำหรับประมวลผลข้อมูลรายวัน
 */
function processRange(dataTempo, viewType) {
  const dailyData = {};
  for (let i = 0; i < dataTempo.length; i++) {
    const row = dataTempo[i];
    if (!row[0]) continue;

    const rowDate = new Date(row[0]);
    const dateStr = rowDate.toISOString().split('T')[0];

    dailyData[dateStr] = {
      date: rowDate,
      drinkUnits: row[1] || 0,
      freshBakeryUnits: row[2] || 0,
      dryBakeryUnits: row[3] || 0,
      totalRevenue: row[4] || 0
    };
  }

  // แปลง object → array และเรียงวัน
  const filteredData = Object.values(dailyData).sort((a, b) => a.date - b.date);

  // จัดกลุ่มตาม viewType
  let processedData;
  if (viewType === 'daily') {
    processedData = filteredData;
  } else if (viewType === 'weekly') {
    processedData = groupByWeek(filteredData);
  } else if (viewType === 'monthly') {
    processedData = groupByMonth(filteredData);
  } else {
    processedData = filteredData;
  }

  // คำนวณสรุป
  const summary = calculateSummaryStats(processedData);

  // แปลง date → string (เพื่อให้สอดคล้องกับ format เดิม)
  processedData = processedData.map(d => ({
    ...d,
    date: Utilities.formatDate(new Date(d.date), "GMT+7", "EEE MMM dd HH:mm:ss 'GMT+07:00' yyyy")
  }));

  return {
    status: 'success',
    data: processedData,
    summary: summary
  };
}





/**
 * จัดกลุ่มข้อมูลรายสัปดาห์
 */
function groupByWeek(data) {
  const weeks = {};

  data.forEach(item => {
    const date = new Date(item.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // วันอาทิตย์
    const weekKey = weekStart.toISOString().split('T')[0];

    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        date: weekKey,
        drinkUnits: 0,
        freshBakeryUnits: 0,
        dryBakeryUnits: 0,
        totalRevenue: 0,
        days: 0
      };
    }

    weeks[weekKey].drinkUnits += item.drinkUnits;
    weeks[weekKey].freshBakeryUnits += item.freshBakeryUnits;
    weeks[weekKey].dryBakeryUnits += item.dryBakeryUnits;
    weeks[weekKey].totalRevenue += item.totalRevenue;
    weeks[weekKey].days += 1;
  });

  return Object.values(weeks);
}

/**
 * จัดกลุ่มข้อมูลรายเดือน
 */
function groupByMonth(data) {
  const months = {};

  data.forEach(item => {
    const date = new Date(item.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!months[monthKey]) {
      months[monthKey] = {
        date: monthKey + '-01',
        drinkUnits: 0,
        freshBakeryUnits: 0,
        dryBakeryUnits: 0,
        totalRevenue: 0,
        days: 0
      };
    }

    months[monthKey].drinkUnits += item.drinkUnits;
    months[monthKey].freshBakeryUnits += item.freshBakeryUnits;
    months[monthKey].dryBakeryUnits += item.dryBakeryUnits;
    months[monthKey].totalRevenue += item.totalRevenue;
    months[monthKey].days += 1;
  });

  return Object.values(months);
}

/**
 * คำนวณสถิติสรุป
 */
function calculateSummaryStats(data) {
  if (data.length === 0) {
    return {
      avgDrinkUnits: 0,
      avgFreshBakeryUnits: 0,
      avgDryBakeryUnits: 0,
      avgTotalRevenue: 0,  // ต้องมีบรรทัดนี้
      totalDrinkUnits: 0,
      totalFreshBakeryUnits: 0,
      totalDryBakeryUnits: 0,
      totalRevenue: 0,
      daysCount: 0
    };
  }

  const totals = data.reduce((acc, item) => {
    acc.drinkUnits += item.drinkUnits;
    acc.freshBakeryUnits += item.freshBakeryUnits;
    acc.dryBakeryUnits += item.dryBakeryUnits;
    acc.totalRevenue += item.totalRevenue;
    return acc;
  }, {
    drinkUnits: 0,
    freshBakeryUnits: 0,
    dryBakeryUnits: 0,
    totalRevenue: 0
  });

  const daysCount = data.length;

  return {
  avgDrinkUnits: Math.round(totals.drinkUnits / daysCount),
  avgFreshBakeryUnits: Math.round(totals.freshBakeryUnits / daysCount),
  avgDryBakeryUnits: Math.round(totals.dryBakeryUnits / daysCount),
  avgTotalRevenue: Math.round(totals.totalRevenue / daysCount), // เพิ่มบรรทัดนี้
  totalDrinkUnits: totals.drinkUnits,
  totalFreshBakeryUnits: totals.freshBakeryUnits,
  totalDryBakeryUnits: totals.dryBakeryUnits,
  totalRevenue: totals.totalRevenue,
  daysCount: daysCount
};
}

/**
 * ดึงข้อมูลสินค้าขายดี
 */
function getTopProducts(branchId, startDate, endDate, productType, limit = 10) {
  return getCachedData(
    `top_products_${branchId}_${startDate}_${endDate}_${productType}`,
    () => {
      try {
        const reportsSheet = ss.getSheetByName('DailyReports');
        const itemsSheet = ss.getSheetByName('DailyReportItems');
        const productsSheet = ss.getSheetByName('Products');

        // หา report IDs ที่ verified
        const reportIds = [];
        const reportsData = reportsSheet.getDataRange().getValues();
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(endDate);

        for (let i = 1; i < reportsData.length; i++) {
          const row = reportsData[i];
          const reportDate = new Date(row[3]);

          if (row[1] == branchId &&
            row[7] === 'Verified' &&
            reportDate >= startDateObj &&
            reportDate <= endDateObj) {
            reportIds.push(row[0]);
          }
        }

        // ดึงข้อมูลสินค้า
        const productsData = productsSheet.getDataRange().getValues();
        const productMap = {};
        for (let i = 1; i < productsData.length; i++) {
          const typeId = productsData[i][2];
          // เบเกอรี่สด = PT0005, PT0007 / เบเกอรี่แห้ง = PT0006
          if ((productType === 'fresh' && (typeId === 'PT0005' || typeId === 'PT0007')) ||
            (productType === 'dry' && typeId === 'PT0006')) {
            productMap[productsData[i][0]] = {
              name: productsData[i][1],
              salePrice: parseFloat(productsData[i][4]) || 0
            };
          }
        }

        // นับยอดขาย
        const salesCount = {};
        const itemsData = itemsSheet.getDataRange().getValues();

        for (let i = 1; i < itemsData.length; i++) {
          if (reportIds.includes(itemsData[i][1])) {
            const productId = itemsData[i][2];
            const quantity = parseFloat(itemsData[i][3]) || 0;

            if (productMap[productId]) {
              if (!salesCount[productId]) {
                salesCount[productId] = {
                  productId: productId,
                  productName: productMap[productId].name,
                  units: 0,
                  revenue: 0
                };
              }

              salesCount[productId].units += quantity;
              salesCount[productId].revenue += quantity * productMap[productId].salePrice;
            }
          }
        }

        // จัดเรียงและตัด top N
        const sortedProducts = Object.values(salesCount)
          .sort((a, b) => b.units - a.units)
          .slice(0, limit);

        return sortedProducts;

      } catch (e) {
        console.error('getTopProducts Error:', e);
        return [];
      }
    },
    3600 // cache 1 ชั่วโมง
  );
}

//--------------------------------------------------------

function testGetDashboardData() {
  // ดูข้อมูลที่มีใน DailySalesSummary ก่อน
  const summarySheet = ss.getSheetByName('DailySalesSummary');
  const data = summarySheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  // ใช้ข้อมูลแถวแรกเป็นตัวอย่าง
  const firstRow = data[1];
  const testBranchId = firstRow[1];
  const testDate = new Date(firstRow[2]);

  // กำหนดช่วงวันที่ทดสอบ
  const startDate = new Date(testDate);
  startDate.setDate(startDate.getDate() - 7); // 7 วันก่อนหน้า
  const endDate = new Date(testDate);
  endDate.setDate(endDate.getDate() + 7); // 7 วันถัดไป


  // ทดสอบแบบรายวัน
  const dailyResult = getDashboardData(
    testBranchId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'daily'
  );


  // ทดสอบแบบรายสัปดาห์
  const weeklyResult = getDashboardData(
    testBranchId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'weekly'
  );

}


function testGetTopProducts() {
  // ใช้ข้อมูลจาก DailySalesSummary
  const summarySheet = ss.getSheetByName('DailySalesSummary');
  const data = summarySheet.getDataRange().getValues();

  if (data.length < 2) {
    return;
  }

  const firstRow = data[1];
  const testBranchId = firstRow[1];
  const testDate = new Date(firstRow[2]);

  // ทดสอบ 30 วันย้อนหลัง
  const endDate = new Date(testDate);
  const startDate = new Date(testDate);
  startDate.setDate(startDate.getDate() - 30);


  // ทดสอบเบเกอรี่สด
  const freshProducts = getTopProducts(
    testBranchId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'fresh',
    10
  );


  // ทดสอบเบเกอรี่แห้ง
  const dryProducts = getTopProducts(
    testBranchId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0],
    'dry',
    10
  );

}

function testSecurityCheck() {
  // จำลองว่าเป็นพนักงานหน้าร้าน
  const userEmail = Session.getActiveUser().getEmail();

  const userDetails = getUserDetails();

  // ถ้าเป็นหน้าร้าน ลองเข้าถึงข้อมูลสาขาอื่น
  if (userDetails.role === 'หน้าร้าน') {
    const ownBranchResult = getDashboardData(
      userDetails.branchIdAssigned,
      '2025-01-01',
      '2025-01-31',
      'daily'
    );

    // ลองเข้าถึงสาขาอื่น (ควรได้ error)
    const otherBranchResult = getDashboardData(
      'B001', // สาขาอื่น
      '2025-01-01',
      '2025-01-31',
      'daily'
    );
  } else {
    console.log('User is not front-of-house staff');
  }

}


// ==================== BRANCH COMPARISON MODULE ====================

/**
 * ระบบจัดการสีประจำสาขา
 */
const BRANCH_COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green  
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16'  // Lime
];

function getBranchColors() {
  const props = PropertiesService.getScriptProperties();
  let colorMap = props.getProperty('BRANCH_COLOR_MAP');
  
  if (!colorMap) {
    colorMap = {};
    const branches = ss.getSheetByName('Branches').getDataRange().getValues();
    
    branches.slice(1).forEach((branch, index) => {
      if (branch[0]) { // ถ้ามี Branch ID
        colorMap[branch[0]] = BRANCH_COLOR_PALETTE[index % BRANCH_COLOR_PALETTE.length];
      }
    });
    
    props.setProperty('BRANCH_COLOR_MAP', JSON.stringify(colorMap));
    return colorMap;
  }
  
  return JSON.parse(colorMap);
}

/**
 * ดึงข้อมูลเปรียบเทียบระหว่างสาขา
 */
function getComparisonData(branchIds, startDate, endDate) {
  try {
    // ตรวจสอบสิทธิ์
    const userDetails = getUserDetails();
    const allowedBranches = [];
    
    if (userDetails.role === 'ออฟฟิศ') {
      // ออฟฟิศดูได้เฉพาะสาขาที่ดูแล
      branchIds.forEach(id => {
        if (userDetails.branchesManaged.includes(String(id))) {
          allowedBranches.push(id);
        }
      });
    } else if (userDetails.role === 'หน้าร้าน') {
      // หน้าร้านดูได้แค่สาขาตัวเอง
      if (branchIds.includes(userDetails.branchIdAssigned)) {
        allowedBranches.push(userDetails.branchIdAssigned);
      }
    }
    
    if (allowedBranches.length === 0) {
      return JSON.stringify({
        status: 'error',
        message: 'คุณไม่มีสิทธิ์ดูข้อมูลสาขาที่เลือก'
      });
    }
    
    // ดึงข้อมูลจาก DailySalesSummary
    const summarySheet = ss.getSheetByName('DailySalesSummary');
    const data = summarySheet.getDataRange().getValues();
    
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // กรองข้อมูลตามสาขาและวันที่
    const filteredData = {};
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const branchId = row[1];
      const date = new Date(row[3]);
      
      if (allowedBranches.includes(branchId) && 
          date >= startDateObj && 
          date <= endDateObj) {
        
        const dateStr = date.toISOString().split('T')[0];
        
        if (!filteredData[branchId]) {
          filteredData[branchId] = {};
        }
        
        if (!filteredData[branchId][dateStr]) {
          filteredData[branchId][dateStr] = {
            drinkUnits: 0,
            freshBakeryUnits: 0,
            dryBakeryUnits: 0,
            totalRevenue: 0
          };
        }
        
        // รวมข้อมูลเช้า+บ่าย
        filteredData[branchId][dateStr].drinkUnits += row[5] || 0;
        filteredData[branchId][dateStr].freshBakeryUnits += row[6] || 0;
        filteredData[branchId][dateStr].dryBakeryUnits += row[7] || 0;
        filteredData[branchId][dateStr].totalRevenue += row[8] || 0;
      }
    }
    
    // จัดรูปแบบข้อมูลสำหรับ frontend
    const result = {
      branchColors: getBranchColors(),
      data: filteredData,
      branches: getBranchNames(allowedBranches),
      dateRange: getDatesInRange(startDateObj, endDateObj),
      summary: calculateComparisonSummary(filteredData)
    };
    
    // คำนวณ growth rates
    const previousPeriod = getPreviousPeriodData(allowedBranches, startDateObj, endDateObj);
    result.growthRates = calculateGrowthRates(result.summary, previousPeriod);
    
    return JSON.stringify({
      status: 'success',
      data: result
    });
    
  } catch (e) {
    console.error('getComparisonData Error:', e);
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}

/**
 * Helper functions สำหรับ Comparison
 */
function getBranchNames(branchIds) {
  const branchesSheet = ss.getSheetByName('Branches');
  const branchData = branchesSheet.getDataRange().getValues();
  const branchMap = {};
  
  branchData.slice(1).forEach(row => {
    if (branchIds.includes(row[0])) {
      branchMap[row[0]] = row[1];
    }
  });
  
  return branchMap;
}

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

function calculateComparisonSummary(data) {
  const summary = {};
  
  Object.keys(data).forEach(branchId => {
    summary[branchId] = {
      drinkUnits: 0,
      freshBakeryUnits: 0,
      dryBakeryUnits: 0,
      totalRevenue: 0
    };
    
    Object.values(data[branchId]).forEach(dayData => {
      summary[branchId].drinkUnits += dayData.drinkUnits;
      summary[branchId].freshBakeryUnits += dayData.freshBakeryUnits;
      summary[branchId].dryBakeryUnits += dayData.dryBakeryUnits;
      summary[branchId].totalRevenue += dayData.totalRevenue;
    });
  });
  
  return summary;
}

function getPreviousPeriodData(branchIds, startDate, endDate) {
  const periodLength = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const previousStart = new Date(startDate);
  previousStart.setDate(previousStart.getDate() - periodLength);
  const previousEnd = new Date(startDate);
  previousEnd.setDate(previousEnd.getDate() - 1);
  
  const summarySheet = ss.getSheetByName('DailySalesSummary');
  const data = summarySheet.getDataRange().getValues();
  
  const previousData = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const branchId = row[1];
    const date = new Date(row[3]);
    
    if (branchIds.includes(branchId) && 
        date >= previousStart && 
        date <= previousEnd) {
      
      if (!previousData[branchId]) {
        previousData[branchId] = {
          drinkUnits: 0,
          freshBakeryUnits: 0,
          dryBakeryUnits: 0,
          totalRevenue: 0
        };
      }
      
      previousData[branchId].drinkUnits += row[5] || 0;
      previousData[branchId].freshBakeryUnits += row[6] || 0;
      previousData[branchId].dryBakeryUnits += row[7] || 0;
      previousData[branchId].totalRevenue += row[8] || 0;
    }
  }
  
  return previousData;
}

function calculateGrowthRates(currentSummary, previousSummary) {
  const growthRates = {};
  
  Object.keys(currentSummary).forEach(branchId => {
    const current = currentSummary[branchId];
    const previous = previousSummary[branchId] || {
      drinkUnits: 0,
      freshBakeryUnits: 0,
      dryBakeryUnits: 0,
      totalRevenue: 0
    };
    
    growthRates[branchId] = {
      drinkUnits: calculateGrowthPercent(current.drinkUnits, previous.drinkUnits),
      freshBakeryUnits: calculateGrowthPercent(current.freshBakeryUnits, previous.freshBakeryUnits),
      dryBakeryUnits: calculateGrowthPercent(current.dryBakeryUnits, previous.dryBakeryUnits),
      totalRevenue: calculateGrowthPercent(current.totalRevenue, previous.totalRevenue)
    };
  });
  
  return growthRates;
}

function calculateGrowthPercent(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/**
 * Export comparison data (placeholder)
 */
function exportComparisonData(dataString, format) {
  try {
    // จะ implement ภายหลัง
    return JSON.stringify({
      status: 'success',
      message: 'ฟีเจอร์ Export อยู่ระหว่างพัฒนา'
    });
    
  } catch (e) {
    console.error('exportComparisonData Error:', e);
    return JSON.stringify({
      status: 'error', 
      message: e.toString()
    });
  }
}

// ==================== TARGET MANAGEMENT SYSTEM ====================

/**
 * ดึงข้อมูลเป้าหมายของสาขา
 */
function getBranchTarget(branchId) {
  try {
    const targetSheet = ss.getSheetByName('BranchTargets');
    if (!targetSheet) {
      // ถ้ายังไม่มีชีท ให้สร้างเป้า default 5%
      return {
        bakeryTarget: 5,
        hasCustomTarget: false
      };
    }
    
    const data = targetSheet.getDataRange().getValues();
    let latestTarget = null;
    
    // หาเป้าหมายล่าสุดของสาขา
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === branchId && data[i][2] === 'bakery_total') {
        if (!latestTarget || new Date(data[i][4]) > new Date(latestTarget.effectiveDate)) {
          latestTarget = {
            percent: data[i][3],
            effectiveDate: data[i][4]
          };
        }
      }
    }
    
    return {
      bakeryTarget: latestTarget ? latestTarget.percent : 5,
      hasCustomTarget: !!latestTarget
    };
    
  } catch (e) {
    console.error('getBranchTarget Error:', e);
    return { bakeryTarget: 5, hasCustomTarget: false };
  }
}

/**
 * บันทึกเป้าหมายใหม่
 */
function saveBranchTarget(branchId, targetPercent) {
  try {
    const userDetails = getUserDetails();
    
    // ตรวจสอบสิทธิ์ - เฉพาะออฟฟิศที่ดูแลสาขานั้น
    if (userDetails.role !== 'ออฟฟิศ' || !userDetails.branchesManaged.includes(String(branchId))) {
      return JSON.stringify({
        status: 'error',
        message: 'คุณไม่มีสิทธิ์ตั้งเป้าหมายสำหรับสาขานี้'
      });
    }
    
    let targetSheet = ss.getSheetByName('BranchTargets');
    if (!targetSheet) {
      // สร้างชีทถ้ายังไม่มี
      targetSheet = ss.insertSheet('BranchTargets');
      targetSheet.getRange(1, 1, 1, 7).setValues([[
        'TargetID', 'BranchID', 'TargetType', 'TargetPercent', 
        'EffectiveDate', 'CreatedBy', 'CreatedAt'
      ]]);
    }
    
    const targetId = `TGT-${Date.now()}`;
    const now = new Date();
    
    targetSheet.appendRow([
      targetId,
      branchId,
      'bakery_total',
      parseFloat(targetPercent),
      now,
      userDetails.employeeId,
      now
    ]);
    
    return JSON.stringify({
      status: 'success',
      message: `ตั้งเป้าหมายเบเกอรี่ +${targetPercent}% สำเร็จ`
    });
    
  } catch (e) {
    console.error('saveBranchTarget Error:', e);
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}

/**
 * คำนวณข้อมูลเป้าหมายและผลงาน
 */
function calculateTargetProgress(branchId, startDate, endDate) {
  try {
    // ดึงเป้าหมาย
    const target = getBranchTarget(branchId);
    
    // คำนวณข้อมูลเดือนก่อน (baseline)
    const currentDate = new Date(startDate);
    const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    
    // ดึงข้อมูลจาก DailySalesSummary
    const summarySheet = ss.getSheetByName('DailySalesSummary');
    const data = summarySheet.getDataRange().getValues();
    
    // คำนวณ baseline จากเดือนก่อน
    let baselineDays = 0;
    let baselineTotal = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const date = new Date(row[3]);
      
      if (row[1] === branchId && date >= lastMonthStart && date <= lastMonthEnd) {
        baselineTotal += (row[6] || 0) + (row[7] || 0); // fresh + dry
        baselineDays++;
      }
    }
    
    const baselineDaily = baselineDays > 0 ? baselineTotal / baselineDays : 100; // default 100
    const targetDaily = Math.ceil(baselineDaily * (1 + target.bakeryTarget / 100));
    
    // คำนวณผลงานปัจจุบัน
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    let currentTotal = 0;
    let currentDays = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const date = new Date(row[3]);
      
      if (row[1] === branchId && date >= startDateObj && date <= endDateObj) {
        currentTotal += (row[6] || 0) + (row[7] || 0);
        currentDays++;
      }
    }
    
    const currentAverage = currentDays > 0 ? currentTotal / currentDays : 0;
    const totalDaysInPeriod = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;
    const remainingDays = totalDaysInPeriod - currentDays;
    
    // คำนวณเป้าหมายพรุ่งนี้
    let tomorrowTarget = targetDaily;
    if (remainingDays > 0) {
      const totalTarget = targetDaily * totalDaysInPeriod;
      const remainingTarget = totalTarget - currentTotal;
      tomorrowTarget = Math.ceil(remainingTarget / remainingDays);
    }
    
    // คำนวณ % achievement
    const achievementPercent = targetDaily > 0 ? (currentAverage / targetDaily) * 100 : 0;
    
    return {
      targetPercent: target.bakeryTarget,
      baselineDaily: baselineDaily,
      targetDaily: targetDaily,
      currentAverage: currentAverage,
      currentTotal: currentTotal,
      daysElapsed: currentDays,
      totalDays: totalDaysInPeriod,
      achievementPercent: achievementPercent,
      tomorrowTarget: tomorrowTarget,
      remainingDays: remainingDays,
      status: achievementPercent >= 100 ? 'achieved' : achievementPercent >= 90 ? 'near' : 'below'
    };
    
  } catch (e) {
    console.error('calculateTargetProgress Error:', e);
    return null;
  }
}

// ==================== TARGET MONITORING DASHBOARD ====================

function getTargetMonitoringData() {
  try {
    const userDetails = getUserDetails();

    if (userDetails.role !== 'ออฟฟิศ') {
      return JSON.stringify({
        status: 'error',
        message: 'เฉพาะพนักงานออฟฟิศเท่านั้นที่ดูหน้านี้ได้'
      });
    }

    const managedBranches = userDetails.branchesManaged;
    if (!managedBranches || managedBranches.length === 0) {
      return JSON.stringify({
        status: 'error',
        message: 'คุณไม่มีสาขาในความดูแล'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    const todayStr = Utilities.formatDate(today, 'GMT+7', 'yyyy-MM-dd');
    const firstDayStr = Utilities.formatDate(firstDay, 'GMT+7', 'yyyy-MM-dd');

    const branchesData = [];
    const branchesSheet = ss.getSheetByName('Branches');
    const branchData = branchesSheet.getDataRange().getValues();

    managedBranches.forEach(branchId => {

      // ---------------- หาชื่อสาขา ----------------
      const branchInfo = branchData.find(row => row[0] === branchId);
      if (!branchInfo) return;

      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      const branchName = branchInfo[1];

      // ---------------- Dashboard ปัจจุบัน + เดือนก่อน ----------------
      const dashCombined = JSON.parse(getDashboardData_2(
        branchId,
        firstDayStr,
        todayStr,
        'daily',
        lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      ));
      //const dbSheet = ss.getSheetByName("_database");
      //dbSheet.getRange("G8").setValue("XXXXXXXXXX");
      if (dashCombined.current.status !== 'success') return;
      const summary = dashCombined.current.summary;
      const lastMonthResult = dashCombined.lastMonth;

      // ---------------- คำนวณข้อมูลหลัก ----------------
      const monthTotal = summary.totalFreshBakeryUnits + summary.totalDryBakeryUnits;
      const currentAverage = summary.daysCount > 0 ? monthTotal / summary.daysCount : 0;

      // ---------------- Target ----------------
      const target = getBranchTarget(branchId);

      // ---------------- Baseline & Calculation ----------------
      let baselineDaily = 100;
      if (lastMonthResult.status === 'success' && lastMonthResult.summary.daysCount > 0) {
        const lastMonthTotal = lastMonthResult.summary.totalFreshBakeryUnits +
          lastMonthResult.summary.totalDryBakeryUnits;
        baselineDaily = lastMonthTotal / lastMonthResult.summary.daysCount;
      }

      const targetDaily = Math.ceil(baselineDaily * (1 + target.bakeryTarget / 100));

      const totalDaysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysElapsed = summary.daysCount || 0;
      const remainingDays = totalDaysInMonth - daysElapsed;

      let tomorrowTarget = targetDaily;
      if (remainingDays > 0) {
        const totalTarget = targetDaily * totalDaysInMonth;
        const remainingTarget = totalTarget - monthTotal;
        tomorrowTarget = Math.ceil(remainingTarget / remainingDays);
      }
      const achievementPercent = targetDaily > 0 ? (currentAverage / targetDaily) * 100 : 0;
      const status = achievementPercent >= 100 ? 'achieved' :
        achievementPercent >= 90 ? 'near' : 'below';

      // ---------------- Push data ----------------
      const tPush = new Date();
      branchesData.push({
        branchId: branchId,
        branchName: branchName,
        monthTotal: monthTotal,
        currentAverage: currentAverage,
        targetDaily: targetDaily,
        achievementPercent: achievementPercent,
        tomorrowTarget: tomorrowTarget,
        status: status,
        targetPercent: target.bakeryTarget,
        daysElapsed: daysElapsed,
        totalDays: totalDaysInMonth
      });

    });

    // ---------------- Sort ----------------
    branchesData.sort((a, b) => a.achievementPercent - b.achievementPercent);

    return JSON.stringify({
      status: 'success',
      data: branchesData
    });

  } catch (e) {
    console.error('getTargetMonitoringData Error:', e);
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}




/**
 * ดึงยอดขายเบเกอรี่วันนี้
 */
function getTodayBakeryData(branchId) {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const summarySheet = ss.getSheetByName('DailySalesSummary');
    const data = summarySheet.getDataRange().getValues();
    
    let todayTotal = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const date = new Date(row[3]);
      
      if (row[1] === branchId && 
          date.toISOString().split('T')[0] === todayStr) {
        todayTotal += (row[6] || 0) + (row[7] || 0); // fresh + dry
      }
    }
    
    return { total: todayTotal };
    
  } catch (e) {
    console.error('getTodayBakeryData Error:', e);
    return { total: 0 };
  }
}

// ==================== ADDITIONAL WITHDRAWALS FUNCTIONS ====================

function getAdditionalWithdrawals(branchId, dateOfSale) {
  try {
    const sheet = ss.getSheetByName('AdditionalWithdrawals');
    if (!sheet) return JSON.stringify({ status: 'success', data: null });
    
    const data = sheet.getDataRange().getValues();
    const withdrawals = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == branchId && 
          new Date(data[i][2]).toISOString().split('T')[0] === dateOfSale) {
        withdrawals.push({
          id: data[i][0],
          expenseType: data[i][4],
          amount: data[i][5],
          withdrawalDate: data[i][3] ? new Date(data[i][3]).toISOString().split('T')[0] : null,
          note: data[i][6]
        });
      }
    }
    
    if (withdrawals.length === 0) return JSON.stringify({ status: 'success', data: null });
    
    // Calculate totals
    const totalAmount = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);
    const latestDate = withdrawals.reduce((latest, w) => {
      const wDate = new Date(w.withdrawalDate);
      return wDate > latest ? wDate : latest;
    }, new Date(withdrawals[0].withdrawalDate));
    
    return JSON.stringify({
      status: 'success',
      data: {
        items: withdrawals,
        totalAmount: totalAmount,
        withdrawalDate: latestDate.toISOString().split('T')[0]
      }
    });
    
  } catch (e) {
    console.error("getAdditionalWithdrawals Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

function saveAdditionalWithdrawals(dataString) {
  try {
    const data = JSON.parse(dataString);
    const userDetails = getUserDetails();
    const sheet = ss.getSheetByName('AdditionalWithdrawals');
    
    if (!sheet) {
      throw new Error("ไม่พบชีท AdditionalWithdrawals");
    }
    

    
    // Save each item
    const timestamp = new Date();
    data.items.forEach(item => {
      if (item.amount > 0) {
        const withdrawalId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sheet.appendRow([
          withdrawalId,
          data.branchId,
          new Date(data.dateOfSale),
          new Date(data.withdrawalDate),
          item.expenseType,
          parseFloat(item.amount),
          item.note || '',
          userDetails.employeeId,
          timestamp,
          data.transferLogId || ''
        ]);
      }
    });
    
    return JSON.stringify({ 
      status: 'success', 
      message: 'บันทึกรายการเบิกเพิ่มเติมสำเร็จ' 
    });
    
  } catch (e) {
    console.error("saveAdditionalWithdrawals Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

// เพิ่มประเภทค่าใช้จ่ายที่ใช้บ่อย
function getExpenseTypes() {
  return [
    'ค่าธรรมเนียมฝากเงิน',
    'ค่าธรรมเนียมฝากเงินแลกทอน',
    'ค่าน้ำมัน พนง.',
    'เปย์เงินขาย',
    'ค่าโซดา',
    'ค่าขยะ',
    'ค่ามะนาว',
    'โอนเข้าบริษัท'
  ];
}

function testGetSalesSummary() {
  // ใส่ค่าทดสอบ
  const result = getSalesSummary('B001', '2025-01-01', '2025-01-31');
  console.log(result);
}

/**
 * บันทึกการเคลมสินค้า
 */
function saveClaim(claimData) {
  try {
    const data = JSON.parse(claimData);
    const userDetails = getUserDetails();
    const claimsSheet = ss.getSheetByName('Claims');
    
    if (!claimsSheet) {
      throw new Error("ไม่พบชีท Claims");
    }

    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const claimDate = new Date();
    
    // บันทึกลงตาราง Claims
    claimsSheet.appendRow([
      claimId,
      claimDate,
      data.branchId,
      userDetails.employeeId,
      data.productId,
      data.claimableQuantity,
      0, // ClaimableQuantity - เริ่มต้นที่ 0
      'Claimed', // ClaimStatus
      0, // ReceivedQuantity - เริ่มต้นที่ 0
      '', // ReceivedDate - ว่างไว้ก่อน
      'Pending' // ReceiptStatus
    ]);

    return JSON.stringify({
      status: 'success',
      message: `บันทึกการเคลมสินค้า ${data.claimableQuantity} ชิ้น สำเร็จ`,
      claimId: claimId
    });

  } catch (e) {
    console.error("saveClaim Error: " + e.toString());
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}

/**
 * บันทึกการรับของเคลม
 */
function saveClaimReceipt(receiptData) {
  try {
    const data = JSON.parse(receiptData);
    const userDetails = getUserDetails();
    const claimsSheet = ss.getSheetByName('Claims');
    
    if (!claimsSheet) {
      throw new Error("ไม่พบชีท Claims");
    }

    const claimsData = claimsSheet.getDataRange().getValues();
    let foundRowIndex = -1;

    // หาแถวที่ตรงกับ productId, branchId และ status = 'Claimed'
    for (let i = 1; i < claimsData.length; i++) {
      if (claimsData[i][4] === data.productId && 
          claimsData[i][2] === data.branchId && 
          claimsData[i][7] === 'Claimed' &&
          claimsData[i][10] === 'Pending') {
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex === -1) {
      throw new Error("ไม่พบรายการเคลมที่ตรงกัน");
    }

    // อัพเดทข้อมูลการรับของ
    const receivedDate = new Date(data.receivedDate);
    claimsSheet.getRange(foundRowIndex, 9).setValue(data.receivedQuantity); // ReceivedQuantity
    claimsSheet.getRange(foundRowIndex, 10).setValue(receivedDate); // ReceivedDate
    claimsSheet.getRange(foundRowIndex, 11).setValue('Received'); // ReceiptStatus

    // เช็คและแจ้งเตือนความแตกต่าง
    const claimedQuantity = claimsData[foundRowIndex - 1][5];
    let message = `บันทึกการรับของ ${data.receivedQuantity} ชิ้น สำเร็จ`;
    
    if (data.receivedQuantity !== claimedQuantity) {
      if (data.receivedQuantity > claimedQuantity) {
        message += `\n⚠️ ของเข้ามากกว่าที่เคลม (+${data.receivedQuantity - claimedQuantity} ชิ้น) กรุณาติดต่อ Supplier เพื่อจัดการส่งคืน`;
      } else {
        message += `\n⚠️ ของเข้าน้อยกว่าที่เคลม (-${claimedQuantity - data.receivedQuantity} ชิ้น) กรุณาติดต่อ Supplier เพื่อรอของเข้าเพิ่ม`;
      }
    }

    return JSON.stringify({
      status: 'success',
      message: message
    });

  } catch (e) {
    console.error("saveClaimReceipt Error: " + e.toString());
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}

/**
 * ดึงประวัติการเคลมของสินค้า
 */
function getClaimHistory(branchId, productId) {
  try {
    const claimsSheet = ss.getSheetByName('Claims');
    if (!claimsSheet) {
      return JSON.stringify({ status: 'success', data: [] });
    }

    const claimsData = claimsSheet.getDataRange().getValues();
    const history = [];

    for (let i = 1; i < claimsData.length; i++) {
      if (claimsData[i][2] == branchId && claimsData[i][4] === productId) {
        history.push({
          claimId: claimsData[i][0],
          claimDate: new Date(claimsData[i][1]).toLocaleDateString('th-TH'),
          reportedExpired: claimsData[i][5],
          claimableQuantity: claimsData[i][6],
          claimStatus: claimsData[i][7],
          receivedQuantity: claimsData[i][8],
          receivedDate: claimsData[i][9] ? new Date(claimsData[i][9]).toLocaleDateString('th-TH') : '',
          receiptStatus: claimsData[i][10]
        });
      }
    }

    return JSON.stringify({ status: 'success', data: history });

  } catch (e) {
    console.error("getClaimHistory Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}


/**
 * ดึงข้อมูล ReportItems ที่สามารถเคลมได้ + รายการเคลมแล้วแต่ของเข้าไม่ครบ
 */
function getClaimableReportItems(branchId) {
  try {
    const reportsSheet = ss.getSheetByName('DailyReports');
    const itemsSheet = ss.getSheetByName('DailyReportItems');
    const productsSheet = ss.getSheetByName('Products');
    const claimsSheet = ss.getSheetByName('Claims');
    const suppliersSheet = ss.getSheetByName('Suppliers');

    // ดึงข้อมูลทั้งหมด
    const reportsData = reportsSheet.getDataRange().getValues();
    const itemsData = itemsSheet.getDataRange().getValues();
    const productsData = productsSheet.getDataRange().getValues();
    const claimsData = claimsSheet.getDataRange().getValues();
    const suppliersData = suppliersSheet.getDataRange().getValues();

    // สร้าง Maps สำหรับ lookup
    const productMap = productsData.slice(1).reduce((map, p) => {
      map[p[0]] = {
        name: p[1],
        supplierId: p[6],
        typeId: p[2]
      };
      return map;
    }, {});

    const supplierMap = suppliersData.slice(1).reduce((map, s) => {
      map[s[0]] = s[1];
      return map;
    }, {});

    // หา ReportItems ที่ถูกเคลมแล้ว
    const claimedReportItemIds = new Set();
    const claimStatusMap = {}; // เก็บสถานะการเคลม

    claimsData.slice(1).forEach(claim => {
      if (claim[11]) { // ReportItemID column
        claimedReportItemIds.add(claim[11]);
        claimStatusMap[claim[11]] = {
          claimId: claim[0],
          claimedQuantity: parseFloat(claim[6]) || 0,
          receivedQuantity: parseFloat(claim[8]) || 0,
          claimStatus: claim[7],
          receiptStatus: claim[10],
          receivedDate: claim[9] ? new Date(claim[9]).toISOString().split('T')[0] : ''
        };
      }
    });

    const result = [];

    // ดึงข้อมูล verified reports ของสาขานี้
    const verifiedReports = reportsData.slice(1)
      .filter(r => r[1] == branchId && r[7] === 'Verified')
      .reduce((map, r) => {
        map[r[0]] = {
          reportDate: r[3],
          branchId: r[1]
        };
        return map;
      }, {});

    // ดึง ReportItems ที่มีเงื่อนไข
    itemsData.slice(1).forEach(item => {
      const reportId = item[1];
      const productId = item[2];
      const expiredQuantity = parseFloat(item[5]) || 0;
      const currentStock = parseFloat(item[6]) || 0;
      const reportItemId = item[0];

      if (verifiedReports[reportId] && productMap[productId]) {
        const product = productMap[productId];
        const supplierName = supplierMap[product.supplierId] || 'N/A';
        const claimInfo = claimStatusMap[reportItemId];

        // กรณี 1: สินค้าหมดอายุที่ยังไม่ได้เคลม
        if (expiredQuantity > 0 && !claimedReportItemIds.has(reportItemId)) {
          result.push({
            reportItemId: reportItemId,
            reportDate: verifiedReports[reportId].reportDate,
            productId: productId,
            productName: product.name,
            supplierName: supplierName,
            expiredQuantity: expiredQuantity,
            claimStatus: 'ยังไม่เคลม',
            claimedQuantity: 0,
            receivedQuantity: 0,
            remainingClaim: 0,
            receivedDate: '',
            itemType: 'unclaimed'
          });
        }
        
        // กรณี 2: รายการที่เคลมแล้วแต่ของเข้าไม่ครบ (claimedQuantity > receivedQuantity)
        else if (claimInfo && claimInfo.claimedQuantity > claimInfo.receivedQuantity) {
          const remainingClaim = claimInfo.claimedQuantity - claimInfo.receivedQuantity;
          
          result.push({
            reportItemId: reportItemId,
            reportDate: verifiedReports[reportId].reportDate,
            productId: productId,
            productName: product.name,
            supplierName: supplierName,
            expiredQuantity: expiredQuantity,
            claimStatus: claimInfo.claimStatus,
            claimedQuantity: claimInfo.claimedQuantity,
            receivedQuantity: claimInfo.receivedQuantity,
            remainingClaim: remainingClaim,
            receivedDate: claimInfo.receivedDate,
            itemType: 'partial_received'
          });
        }
      }
    });

    // เรียงตาม reportDate และประเภท
    result.sort((a, b) => {
      // เรียงตามประเภทก่อน (unclaimed ก่อน, partial_received ตาม)
      if (a.itemType !== b.itemType) {
        return a.itemType === 'unclaimed' ? -1 : 1;
      }
      // แล้วเรียงตามวันที่
      return new Date(a.reportDate) - new Date(b.reportDate);
    });

    return JSON.stringify({ status: 'success', data: result });

  } catch (e) {
    console.error("getClaimableReportItems Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}


/**
 * บันทึกการเคลมสินค้า (Phase 2)
 */
function saveClaimItem(claimDataString) {
  try {
    const data = JSON.parse(claimDataString);
    const userDetails = getUserDetails();
    const claimsSheet = ss.getSheetByName('Claims');
    
    if (!claimsSheet) {
      throw new Error("ไม่พบชีท Claims");
    }

    const claimId = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const claimDate = new Date();
    
    // บันทึกลงตาราง Claims
    claimsSheet.appendRow([
      claimId,                          // ClaimID
      claimDate,                        // ClaimDate
      data.branchId,                    // BranchID
      userDetails.employeeId,           // EmployeeID
      data.productId,                   // ProductID
      data.reportedExpiredQuantity,     // ReportedExpiredQuantity
      data.claimableQuantity,           // ClaimableQuantity
      'Claimed',                        // ClaimStatus
      0,                                // ReceivedQuantity
      '',                               // ReceivedDate
      'Pending',                        // ReceiptStatus
      data.reportItemId                 // ReportItemID (คอลัมน์ใหม่)
    ]);

    return JSON.stringify({
      status: 'success',
      message: `บันทึกการเคลมสินค้า ${data.claimableQuantity} ชิ้น สำเร็จ`,
      claimId: claimId
    });

  } catch (e) {
    console.error("saveClaimItem Error: " + e.toString());
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}


/**
 * บันทึกของเข้าเพิ่มเติมสำหรับรายการเคลมที่ของเข้าไม่ครบ
 */
function saveAdditionalClaimReceipt(receiptDataString) {
  try {
    const data = JSON.parse(receiptDataString);
    const claimsSheet = ss.getSheetByName('Claims');

    if (!claimsSheet) {
      throw new Error("ไม่พบชีท Claims");
    }

    const claimsData = claimsSheet.getDataRange().getValues();
    let foundRowIndex = -1;

    // หาแถวที่ตรงกับ ReportItemID
    for (let i = 1; i < claimsData.length; i++) {
      if (claimsData[i][11] === data.reportItemId && // ReportItemID
          (claimsData[i][7] === 'Claimed' || claimsData[i][7] === 'Completed')) { // ClaimStatus
        foundRowIndex = i + 1;
        break;
      }
    }

    if (foundRowIndex === -1) {
      throw new Error("ไม่พบรายการเคลมที่ตรงกัน");
    }

    // ดึงข้อมูลปัจจุบัน
    const currentReceivedQty = parseFloat(claimsData[foundRowIndex - 1][8]) || 0;
    const claimedQuantity = parseFloat(claimsData[foundRowIndex - 1][6]) || 0;
    const newReceivedQty = currentReceivedQty + data.additionalQuantity;

    // อัพเดทข้อมูลการรับของ
    const receivedDate = new Date(data.receivedDate);
    
    claimsSheet.getRange(foundRowIndex, 9).setValue(newReceivedQty); // ReceivedQuantity
    claimsSheet.getRange(foundRowIndex, 10).setValue(receivedDate); // ReceivedDate
    
    // อัพเดท status ถ้าได้ครบแล้ว
    if (newReceivedQty >= claimedQuantity) {
      claimsSheet.getRange(foundRowIndex, 8).setValue('Completed'); // ClaimStatus
      claimsSheet.getRange(foundRowIndex, 11).setValue('Received'); // ReceiptStatus
    }

    // สร้างข้อความแจ้งผลลัพธ์
    let message = `บันทึกของเข้าเพิ่มเติม ${data.additionalQuantity} ชิ้น สำเร็จ`;
    message += `\n📊 สถานะ: ของเข้าแล้ว ${newReceivedQty}/${claimedQuantity} ชิ้น`;
    
    if (newReceivedQty >= claimedQuantity) {
      message += `\n✅ รับของครบแล้ว! รายการนี้เสร็จสมบูรณ์`;
    } else {
      const remaining = claimedQuantity - newReceivedQty;
      message += `\n⏳ ยังรอของเข้าอีก ${remaining} ชิ้น`;
    }

    return JSON.stringify({
      status: 'success',
      message: message,
      isComplete: newReceivedQty >= claimedQuantity
    });

  } catch (e) {
    console.error("saveAdditionalClaimReceipt Error: " + e.toString());
    return JSON.stringify({
      status: 'error',
      message: e.toString()
    });
  }
}


// ==================== RAW MATERIAL ORDERING SYSTEM ====================

/**
 * ดึงข้อมูลสินค้าวัตถุดิบ (S0019) ทั้งหมด โดยจัดกลุ่มตามประเภทสินค้า
 */
function getRawMaterialProducts() {
  try {
    const productsSheet = ss.getSheetByName('Products');
    const productTypesSheet = ss.getSheetByName('ProductTypes');
    if (!productsSheet || !productTypesSheet) {
      throw new Error("ไม่พบชีท Products หรือ ProductTypes");
    }

    // สร้าง Map สำหรับชื่อ Product Type
    const productTypesData = productTypesSheet.getRange(2, 1, productTypesSheet.getLastRow() - 1, 2).getValues();
    const productTypeMap = productTypesData.reduce((map, row) => {
      map[row[0]] = row[1]; // id -> name
      return map;
    }, {});

    const productsData = productsSheet.getDataRange().getValues();
    const groupedProducts = {};

    for (let i = 1; i < productsData.length; i++) {
      const row = productsData[i];
      const supplierId = row[6];
      const status = row[7];
      const productTypeId = row[2];

      // กรองเฉพาะสินค้าของ Supplier S0019 และ Active
      if (supplierId === 'S0019' && status === 'Active') {
        const typeName = productTypeMap[productTypeId] || 'Uncategorized';
        if (!groupedProducts[typeName]) {
          groupedProducts[typeName] = [];
        }
        groupedProducts[typeName].push({
          id: row[0],
          name: row[1],
          unitMain: row[9] || 'หน่วย',  // คอลัมน์ J
          unitSub: row[10] || 'หน่วยย่อย' // คอลัมน์ K
        });
      }
    }
    return JSON.stringify({ status: 'success', data: groupedProducts });
  } catch (e) {
    console.error("getRawMaterialProducts Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}


/**
 * บันทึกฉบับร่างของใบสั่งซื้อวัตถุดิบ (ปรับปรุงใหม่ใช้เลขรันจากชีท Config)
 */
function saveRawMaterialOrderDraft(dataString) {
  try {
    const data = JSON.parse(dataString);
    const userDetails = getUserDetails();
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const itemsSheet = ss.getSheetByName('RawMaterialOrderItems');
    const configSheet = ss.getSheetByName('Config'); // <-- เปลี่ยนเป็นชีท Config
    
    let orderId = data.orderId;

    // --- ส่วนสร้าง OrderID ใหม่ ---
    if (!orderId) {
      const lastOrderIdNum = configSheet.getRange("B1").getValue(); // <-- อ่านจาก B1
      const newOrderIdNum = lastOrderIdNum + 1;
      orderId = `RMO-${String(newOrderIdNum).padStart(6, "0")}`;
      
      ordersSheet.appendRow([
        orderId, userDetails.branchIdAssigned, 'Draft',
        new Date(), userDetails.employeeId,
        null, null, ''
      ]);
      configSheet.getRange("B1").setValue(newOrderIdNum); // <-- อัปเดตกลับไปที่ B1
    }

    // --- ส่วนจัดการ Items ---
    // 1. ลบรายการเก่าของ OrderID นี้ทั้งหมด
    const itemValues = itemsSheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (let i = itemValues.length - 1; i >= 1; i--) {
      if (itemValues[i][1] == orderId) {
        rowsToDelete.push(i + 1);
      }
    }
    rowsToDelete.forEach(rowIndex => itemsSheet.deleteRow(rowIndex));

    // 2. เพิ่มรายการใหม่ทั้งหมดพร้อม ItemID แบบรันเลข
    let lastItemIdNum = configSheet.getRange("B2").getValue(); // <-- อ่านจาก B2
    const newItemRows = data.items.map(item => {
      lastItemIdNum++; // เพิ่มเลขทีละ 1
      const newItemId = `ITM-${String(lastItemIdNum).padStart(6, "0")}`;
      return [
        newItemId, orderId, item.productId,
        item.currentStock_Main || 0, item.currentStock_Sub || 0,
        item.requestedQuantity_Main || 0, item.requestedQuantity_Sub || 0,
        null, null
      ];
    });

    if (newItemRows.length > 0) {
        itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, newItemRows.length, newItemRows[0].length).setValues(newItemRows);
        configSheet.getRange("B2").setValue(lastItemIdNum); // <-- อัปเดตกลับไปที่ B2
    }

    return JSON.stringify({ status: 'success', message: 'บันทึกฉบับร่างแล้ว', orderId: orderId });
  } catch (e) {
    console.error("saveRawMaterialOrderDraft Error: " + e.toString() + " Stack: " + e.stack);
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}


/**
 * บันทึกและส่งใบสั่งซื้อในขั้นตอนเดียว (แก้ไขปัญหาข้อมูลซ้ำซ้อน)
 */
function submitFinalRawMaterialOrder(dataString) {
  try {
    // ขั้นตอนที่ 1: บันทึกข้อมูลเหมือนฟังก์ชัน saveRawMaterialOrderDraft ทุกอย่าง
    const data = JSON.parse(dataString);
    const userDetails = getUserDetails();
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const itemsSheet = ss.getSheetByName('RawMaterialOrderItems');
    const configSheet = ss.getSheetByName('Config');
    
    let orderId = data.orderId;

    if (!orderId) {
      const lastOrderIdNum = configSheet.getRange("B1").getValue();
      const newOrderIdNum = lastOrderIdNum + 1;
      orderId = `RMO-${String(newOrderIdNum).padStart(6, "0")}`;
      
      ordersSheet.appendRow([
        orderId, userDetails.branchIdAssigned, 'Draft', // เริ่มต้นเป็น Draft ก่อน
        new Date(), userDetails.employeeId,
        null, null, ''
      ]);
      configSheet.getRange("B1").setValue(newOrderIdNum);
    }

    const itemValues = itemsSheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (let i = itemValues.length - 1; i >= 1; i--) {
      if (itemValues[i][1] == orderId) {
        rowsToDelete.push(i + 1);
      }
    }
    rowsToDelete.forEach(rowIndex => itemsSheet.deleteRow(rowIndex));

    let lastItemIdNum = configSheet.getRange("B2").getValue();
    const newItemRows = data.items.map(item => {
      lastItemIdNum++;
      const newItemId = `ITM-${String(lastItemIdNum).padStart(6, "0")}`;
      return [
        newItemId, orderId, item.productId,
        item.currentStock_Main || 0, item.currentStock_Sub || 0,
        item.requestedQuantity_Main || 0, item.requestedQuantity_Sub || 0,
        null, null
      ];
    });

    if (newItemRows.length > 0) {
        itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, newItemRows.length, newItemRows[0].length).setValues(newItemRows);
        configSheet.getRange("B2").setValue(lastItemIdNum);
    }

    // ขั้นตอนที่ 2: อัปเดตสถานะเป็น "Pending" ทันที
    const allOrders = ordersSheet.getDataRange().getValues();
    for (let i = 1; i < allOrders.length; i++) {
      if (allOrders[i][0] == orderId) {
        ordersSheet.getRange(i + 1, 3).setValue('Pending'); // Update Status
        ordersSheet.getRange(i + 1, 4).setValue(new Date()); // Update RequestedAt
        break;
      }
    }

    return JSON.stringify({ status: 'success', message: 'ส่งใบสั่งซื้อเรียบร้อย' });
  } catch (e) {
    console.error("submitFinalRawMaterialOrder Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

/**
 * ดึงรายการใบสั่งซื้อที่รออนุมัติสำหรับ Office
 */
function getPendingRawMaterialOrders() {
  try {
    const userDetails = getUserDetails();
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const branchesSheet = ss.getSheetByName('Branches');

    const branchMap = branchesSheet.getRange(2, 1, branchesSheet.getLastRow() - 1, 2).getValues()
      .reduce((map, row) => { map[row[0]] = row[1]; return map; }, {});

    const pendingOrders = [];
    const data = ordersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const status = row[2];
      const branchId = row[1];
      if (status === 'Pending' && userDetails.branchesManaged.includes(String(branchId))) {
        pendingOrders.push({
          orderId: row[0],
          branchId: branchId,
          branchName: branchMap[branchId] || 'Unknown',
          requestedAt: new Date(row[3]).toLocaleDateString('th-TH')
        });
      }
    }
    return JSON.stringify({ status: 'success', data: pendingOrders });
  } catch (e) {
    console.error("getPendingRawMaterialOrders Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

/**
 * ดึงข้อมูลใบสั่งซื้อ 1 ใบ พร้อมประวัติ 4 ครั้งล่าสุด
 */
function getRawMaterialOrderWithHistory(orderId) {
  // ฟังก์ชันนี้จะค่อนข้างซับซ้อน ขอวางโครงสร้างหลักๆ ไว้ก่อน
  // และจะทำการดึงข้อมูลตามที่ออกแบบไว้
  try {
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const itemsSheet = ss.getSheetByName('RawMaterialOrderItems');
    const productsSheet = ss.getSheetByName('Products');
    const productMap = productsSheet.getDataRange().getValues().slice(1)
      .reduce((map, row) => {
        map[row[0]] = { name: row[1], unitMain: row[9], unitSub: row[10] };
        return map;
      }, {});

    // 1. ดึงข้อมูลใบปัจจุบัน
    const allOrders = ordersSheet.getDataRange().getValues();
    let currentOrderData = null;
    for (let i = 1; i < allOrders.length; i++) {
      if (allOrders[i][0] == orderId) {
        currentOrderData = {
          orderId: allOrders[i][0],
          branchId: allOrders[i][1],
          status: allOrders[i][2],
          requestedAt: allOrders[i][3],
          items: []
        };
        break;
      }
    }
    if (!currentOrderData) throw new Error("ไม่พบใบสั่งซื้อ");

    const allItems = itemsSheet.getDataRange().getValues();
    allItems.forEach(itemRow => {
      if (itemRow[1] == orderId) {
        const productInfo = productMap[itemRow[2]] || { name: 'N/A', unitMain: '', unitSub: '' };
        currentOrderData.items.push({
          productId: itemRow[2],
          productName: productInfo.name,
          unitMain: productInfo.unitMain,
          unitSub: productInfo.unitSub,
          currentStock_Main: itemRow[3],
          currentStock_Sub: itemRow[4],
          requestedQuantity_Main: itemRow[5],
          requestedQuantity_Sub: itemRow[6]
        });
      }
    });

    // 2. ดึงประวัติ 4 ครั้งล่าสุด
    const history = [];
    const approvedOrdersForBranch = allOrders
      .filter(row => row[1] == currentOrderData.branchId && row[2] === 'Approved')
      .sort((a, b) => new Date(b[3]) - new Date(a[3])); // เรียงจากใหม่ไปเก่า

    const lastFourOrders = approvedOrdersForBranch.slice(0, 4);

    lastFourOrders.forEach(orderRow => {
      const historyOrder = {
        orderId: orderRow[0],
        requestedAt: new Date(orderRow[3]).toLocaleDateString('th-TH'),
        items: {}
      };
      allItems.forEach(itemRow => {
        if (itemRow[1] == historyOrder.orderId) {
          historyOrder.items[itemRow[2]] = { // key by productId
            currentStock_Main: itemRow[3],
            currentStock_Sub: itemRow[4],
            approvedQuantity_Main: itemRow[7],
            approvedQuantity_Sub: itemRow[8]
          };
        }
      });
      history.push(historyOrder);
    });

    // 3. คำนวณ 'จำนวนใช้ล่าสุด' สำหรับใบปัจจุบัน
    if (approvedOrdersForBranch.length > 0) {
        const lastApprovedOrder = { items: {} };
        const lastApprovedOrderId = approvedOrdersForBranch[0][0];
        allItems.forEach(itemRow => {
            if (itemRow[1] == lastApprovedOrderId) {
                lastApprovedOrder.items[itemRow[2]] = {
                    currentStock_Main: itemRow[3], currentStock_Sub: itemRow[4],
                    approvedQuantity_Main: itemRow[7], approvedQuantity_Sub: itemRow[8]
                };
            }
        });

        currentOrderData.items.forEach(currentItem => {
            const lastItem = lastApprovedOrder.items[currentItem.productId];
            if (lastItem) {
                const lastTotal = (parseFloat(lastItem.currentStock_Main) || 0) + (parseFloat(lastItem.approvedQuantity_Main) || 0);
                const currentTotal = (parseFloat(currentItem.currentStock_Main) || 0);
                currentItem.usedLastTime_Main = lastTotal - currentTotal;
                // สามารถเพิ่ม Logic สำหรับหน่วยย่อยได้ในลักษณะเดียวกัน
            }
        });
    }


    return JSON.stringify({ status: 'success', data: { current: currentOrderData, history: history } });
  } catch (e) {
    console.error("getRawMaterialOrderWithHistory Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

/**
 * อนุมัติใบสั่งซื้อวัตถุดิบ
 */
function approveRawMaterialOrder(dataString) {
  try {
    const data = JSON.parse(dataString);
    const userDetails = getUserDetails();
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const itemsSheet = ss.getSheetByName('RawMaterialOrderItems');
    const allOrders = ordersSheet.getDataRange().getValues();
    const allItems = itemsSheet.getDataRange().getValues();

    // Update main order status
    for (let i = 1; i < allOrders.length; i++) {
      if (allOrders[i][0] == data.orderId) {
        ordersSheet.getRange(i + 1, 3).setValue('Approved');
        ordersSheet.getRange(i + 1, 6).setValue(new Date()); // ApprovedAt
        ordersSheet.getRange(i + 1, 7).setValue(userDetails.employeeId); // ApprovedBy
        break;
      }
    }

    // Update approved quantities for each item
    data.items.forEach(updatedItem => {
      for (let i = 1; i < allItems.length; i++) {
        if (allItems[i][1] == data.orderId && allItems[i][2] == updatedItem.productId) {
          itemsSheet.getRange(i + 1, 8).setValue(updatedItem.approvedQuantity_Main);
          itemsSheet.getRange(i + 1, 9).setValue(updatedItem.approvedQuantity_Sub);
          break;
        }
      }
    });

    return JSON.stringify({ status: 'success', message: 'อนุมัติใบสั่งซื้อเรียบร้อย' });
  } catch (e) {
    console.error("approveRawMaterialOrder Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}

/**
 * ปฏิเสธใบสั่งซื้อวัตถุดิบ
 */
function rejectRawMaterialOrder(orderId) {
  try {
    const ordersSheet = ss.getSheetByName('RawMaterialOrders');
    const data = ordersSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == orderId) {
        ordersSheet.getRange(i + 1, 3).setValue('Rejected');
        break;
      }
    }
    return JSON.stringify({ status: 'success', message: 'ปฏิเสธใบสั่งซื้อเรียบร้อย' });
  } catch (e) {
    console.error("rejectRawMaterialOrder Error: " + e.toString());
    return JSON.stringify({ status: 'error', message: e.toString() });
  }
}
