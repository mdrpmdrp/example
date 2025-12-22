// =================================================================
// --- CONFIGURATION ---
// =================================================================
const ss = SpreadsheetApp.getActiveSpreadsheet();

// const FOLDER_ID = '1xxuY4Wznv9AM1oyhfxbo_-QvBBpq8_Ah'; // Please replace with your actual Folder ID for reports/backups
const FOLDER_ID = '1CEWlvFURW0X6uRa_uAAPDjyczE5cr329';

const TELEGRAM_BOT_TOKEN = '8343157193:AAHPy65lVcRMTfoXF5fpduy81w1ogQb5fbw'; // Replace with your Bot Token if needed
const TELEGRAM_CHAT_ID = '7721419671'; // Replace with your Chat ID if needed

// Sheet References
const productsSheet = ss.getSheetByName("Products");
const transactionsSheet = ss.getSheetByName("Transactions");
const usersSheet = ss.getSheetByName("Users");
const projectsSheet = ss.getSheetByName("Projects");
const suppliersSheet = ss.getSheetByName("Suppliers");
const auditLogSheet = ss.getSheetByName("AuditLog");

const CACHE = CacheService.getScriptCache();


// =================================================================
// --- ROUTING & HTML SERVICE ---
// =================================================================
function doGet(e) {
  // // for testing purpose
  // return generateWithdrawalReportHTML()


  // Check if 'e' and 'e.parameter' exist before accessing 'page'
  const pageParameter = e && e.parameter ? e.parameter.page : null;

  if (pageParameter === 'app' && isUserAuthenticated()) {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('ระบบจัดการคลังสินค้า')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  }
  // Default to Login page if not authenticated or no specific page requested
  return HtmlService.createHtmlOutputFromFile('Login')
    .setTitle('เข้าสู่ระบบ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}


// =================================================================
// --- AUTHENTICATION & USER MANAGEMENT ---
// =================================================================
function isUserAuthenticated() {
  // Check if user property exists
  return !!PropertiesService.getUserProperties().getProperty('user');
}

function checkUserAccess() {
  Logger = BetterLog.useSpreadsheet()
  if (!usersSheet) {
    Logger.log("Sheet 'Users' not found during login check.");
    return { success: false, message: "Sheet 'Users' not found." };
  }

  const email = Session.getActiveUser().getEmail();
  Logger.log(`Login attempt by: ${email}`);
  const usersData = usersSheet.getDataRange().getValues();
  usersData.shift(); // remove header

  const userRowIndex = usersData.findIndex(row =>
    row[0] && typeof row[0] === 'string' && row[0].toLowerCase().trim() === email.toLowerCase().trim()
  );

  if (userRowIndex !== -1) {
    const userData = usersData[userRowIndex];
    const userStatus = userData[3]; // Assuming Status is in Column D (index 3)

    if (userStatus !== 'Active') {
      logUserAction('Login Failed', `Inactive user attempt by ${email}.`);
      return { success: false, message: "บัญชีของคุณถูกปิดการใช้งาน" };
    }

    // Assuming Email(A), Role(B), Name(C), Status(D), LastLogin(E), Settings(F)
    const user = {
      email: userData[0],
      role: userData[1],
      name: userData[2],
      dashboardSettings: parseDashboardSettings(userData[5]) // Get settings from Column F
    };
    PropertiesService.getUserProperties().setProperty('user', JSON.stringify(user));

    // Update Last Login - Assuming LastLogin is in Column E (index 4)
    usersSheet.getRange(userRowIndex + 2, 5).setValue(new Date()); // +2 because sheet is 1-indexed and header was removed
    logUserAction('User Login', `User ${email} logged in successfully.`);

    return { success: true, url: ScriptApp.getService().getUrl() + "?page=app" };
  }

  logUserAction('Login Failed', `Unauthorized access attempt by ${email}.`);
  return { success: false, message: "บัญชีของคุณไม่ได้รับอนุญาตให้เข้าถึงระบบนี้" };
}


function getUserInfo() {
  const userJson = PropertiesService.getUserProperties().getProperty('user');
  if (!userJson) return null;

  try {
    const user = JSON.parse(userJson);
    // Ensure dashboardSettings is always an object, even if null/undefined initially
    // Use parseDashboardSettings to apply defaults if needed
    user.dashboardSettings = parseDashboardSettings(user.dashboardSettings ? JSON.stringify(user.dashboardSettings) : null);
    return user;
  } catch (e) {
    Logger.log("Error parsing user info from properties: " + e);
    return null;
  }
}

// Helper to parse dashboard settings safely
// Define default components structure directly within this function
function parseDashboardSettings(settingsString) {
  // Define the default structure here, matching the keys used in Index.html
  const defaultOrder = ['metrics', 'stockTrend', 'topLists', 'lowStock', 'recentTx', 'projectCosts'];
  const defaultVisible = defaultOrder.reduce((acc, key) => ({ ...acc, [key]: true }), {});
  const defaultSettings = { order: defaultOrder, visible: defaultVisible };

  if (!settingsString || typeof settingsString !== 'string') {
    // Return default settings if nothing is stored or invalid
    return defaultSettings;
  }
  try {
    const settings = JSON.parse(settingsString);
    // Basic validation: Check if it has order (array) and visible (object)
    if (settings && Array.isArray(settings.order) && typeof settings.visible === 'object' && settings.visible !== null) {
      // Further validation: Ensure all default keys exist in the loaded settings to prevent errors
      defaultOrder.forEach(key => {
        if (!(key in settings.visible)) {
          settings.visible[key] = true; // Add missing keys as visible by default
        }
        if (!settings.order.includes(key)) {
          settings.order.push(key); // Add missing keys to the order
        }
      });
      // Remove keys from order/visible if they are no longer valid (optional cleanup)
      settings.order = settings.order.filter(key => defaultOrder.includes(key));
      settings.visible = Object.keys(settings.visible)
        .filter(key => defaultOrder.includes(key))
        .reduce((obj, key) => { obj[key] = settings.visible[key]; return obj; }, {});

      return settings;
    } else {
      Logger.log("Parsed dashboard settings lack required structure (order array or visible object). Returning default.");
      return defaultSettings;
    }
  } catch (e) {
    Logger.log("Error parsing dashboard settings JSON: " + e + ". Returning default.");
  }
  // Return default settings if parsing fails or validation fails
  return defaultSettings;
}


// Function called by the frontend to save settings
function saveUserDashboardSettings(settings) {
  const currentUser = getUserInfo();
  if (!currentUser || !currentUser.email) {
    return { success: false, message: "User not authenticated." };
  }
  // Basic validation of incoming settings
  if (!settings || !Array.isArray(settings.order) || typeof settings.visible !== 'object' || settings.visible === null) {
    return { success: false, message: "Invalid settings format." };
  }

  try {
    const usersData = usersSheet.getDataRange().getValues();
    // Find user row (index is 0-based here)
    const userRowIndex0Based = usersData.findIndex(row => row[0] && row[0].toLowerCase() === currentUser.email.toLowerCase());

    if (userRowIndex0Based !== -1) {
      // Convert to 1-based index for getRange
      const userRowIndex1Based = userRowIndex0Based + 1;
      // Assuming dashboard settings are stored in Column F (index 6)
      usersSheet.getRange(userRowIndex1Based, 6).setValue(JSON.stringify(settings));

      // Update user info in properties service immediately
      currentUser.dashboardSettings = settings;
      PropertiesService.getUserProperties().setProperty('user', JSON.stringify(currentUser));

      logUserAction('Update Dashboard Settings', `User ${currentUser.email} updated dashboard layout.`);
      return { success: true, message: "บันทึกการตั้งค่าแดชบอร์ดสำเร็จ" };
    } else {
      return { success: false, message: "User not found in sheet." };
    }
  } catch (e) {
    Logger.log("Error saving dashboard settings: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการบันทึก: " + e.message };
  }
}


function getUsers() {
  // Ensure only admins can get user list
  const currentUserInfo = getUserInfo();
  if (!currentUserInfo || currentUserInfo.role !== 'admin') return JSON.stringify([]);

  const sheet = ss.getSheetByName("Users");
  if (!sheet) {
    Logger.log("Users sheet not found in getUsers.");
    return JSON.stringify([]);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return JSON.stringify([]); // No data rows
  data.shift(); // Remove header

  const mappedData = data.map(row => ({
    email: row[0] || '', // Column A
    role: row[1] || 'staff', // Column B, default to 'staff' if empty
    name: row[2] || '', // Column C
    status: row[3] || 'Inactive', // Column D, default to 'Inactive'
    // Column E: LastLogin - Ensure it's treated as a date
    lastLogin: row[4] ? (row[4] instanceof Date ? row[4].toISOString() : (new Date(row[4]).toISOString() || null)) : null
    // Column F: Dashboard Settings are handled by getUserInfo
  })).filter(user => user.email); // Ensure email exists

  return JSON.stringify(mappedData);
}

function updateUser(userData) {
  // Ensure only admins can update/add users
  const currentUserInfo = getUserInfo();
  if (!usersSheet || !currentUserInfo || currentUserInfo.role !== 'admin') {
    return { success: false, message: "คุณไม่มีสิทธิ์แก้ไขข้อมูล" };
  }
  // Basic validation of incoming data
  if (!userData || !userData.email) {
    return { success: false, message: "Email is required." };
  }

  try {
    const usersData = usersSheet.getDataRange().getValues();
    // +1 for 1-based index
    let rowIndex = usersData.findIndex(row => row[0] && row[0].toLowerCase() === userData.email.toLowerCase()) + 1;

    const role = userData.role || 'staff'; // Default role
    const name = userData.name || '';
    const status = userData.status === 'Active' ? 'Active' : 'Inactive'; // Validate status

    if (rowIndex > 0) { // Update existing user
      logUserAction('Update User', `Email: ${userData.email}, Name: ${name}, Role: ${role}, Status: ${status}`);
      // Update Role (B), Name (C), Status (D)
      usersSheet.getRange(rowIndex, 2, 1, 3).setValues([[role, name, status]]);
    } else { // Add new user
      logUserAction('Create User', `Email: ${userData.email}, Name: ${name}, Role: ${role}, Status: ${status}`);
      // Append row A=Email, B=Role, C=Name, D=Status, E=LastLogin(empty), F=Settings(empty)
      const defaultSettings = parseDashboardSettings(null); // Get default settings
      usersSheet.appendRow([userData.email, role, name, status, '', JSON.stringify(defaultSettings)]); // Add default settings string
      SpreadsheetApp.getActiveSpreadsheet().addEditor(userData.email); // Grant access to the spreadsheet
    }
    // Users aren't typically cached server-side in this pattern, but clear if needed
    // clearCache();
    return { success: true, message: "อัปเดตข้อมูลผู้ใช้สำเร็จ" };
  } catch (e) {
    Logger.log("Error in updateUser: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

function deleteUser(email) {
  const currentUserInfo = getUserInfo();
  if (!usersSheet || !currentUserInfo || currentUserInfo.role !== 'admin') {
    return { success: false, message: "คุณไม่มีสิทธิ์ลบข้อมูล" };
  }
  if (currentUserInfo.email.toLowerCase() === email.toLowerCase()) {
    return { success: false, message: "คุณไม่สามารถลบบัญชีของตัวเองได้" };
  }
  try {
    const usersData = usersSheet.getDataRange().getValues();
    const rowIndex = usersData.findIndex(row => row[0] && row[0].toLowerCase() === email.toLowerCase()) + 1;
    if (rowIndex > 0) {
      const userName = usersSheet.getRange(rowIndex, 3).getValue(); // Get Name (Column C)
      logUserAction('Delete User', `Email: ${email}, Name: ${userName}`);
      usersSheet.deleteRow(rowIndex);
      ss.removeEditor(email); // Remove access from the spreadsheet
      // clearCache(); // Clear potentially dependent caches if necessary
      return { success: true, message: "ลบผู้ใช้สำเร็จ" };
    }
    return { success: false, message: "ไม่พบผู้ใช้ที่ต้องการลบ" };
  } catch (e) {
    Logger.log("Error in deleteUser: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

// =================================================================
// --- DATA RETRIEVAL & PROCESSING ---
// =================================================================

function getNextProductCode() {
  try {
    if (!productsSheet) return { success: false, code: null, message: "Sheet 'Products' not found." };

    const prefix = "RM-";
    const lastRow = productsSheet.getLastRow();

    if (lastRow < 2) {
      return { success: true, code: `${prefix}1` };
    }

    // Get only the Code column (Column B, index 1)
    const data = productsSheet.getRange(2, 2, lastRow - 1, 1).getValues();

    const existingNumbers = data
      .flat()
      .map(code => {
        if (typeof code === 'string' && code.startsWith(prefix)) {
          // Robust parsing: handle potential non-numeric parts after prefix
          const numPart = code.substring(prefix.length);
          const parsedNum = parseInt(numPart, 10);
          return isNaN(parsedNum) ? NaN : parsedNum; // Ensure it's a valid number
        }
        return NaN;
      })
      .filter(num => !isNaN(num));

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

    const newCode = `${prefix}${nextNumber}`;

    return { success: true, code: newCode };
  } catch (e) {
    Logger.log("Error in getNextProductCode: " + e);
    return { success: false, code: null, message: e.message };
  }
}


function getNextProjectCode() {
  try {
    if (!projectsSheet) return { success: false, code: null, message: "Sheet 'Projects' not found." };
    // Ensure getNextId returns a number
    const nextIdVal = getNextId(projectsSheet);
    if (typeof nextIdVal !== 'number' || isNaN(nextIdVal)) {
      throw new Error("getNextId did not return a valid number for Projects sheet.");
    }
    const nextId = nextIdVal;

    const year = new Date().getFullYear();
    // Ensure nextId is treated as a number before padding
    const paddedId = String(nextId).padStart(3, '0');
    const newCode = `PRJ-${year}-${paddedId}`;
    return { success: true, code: newCode };
  } catch (e) {
    Logger.log("Error in getNextProjectCode: " + e);
    return { success: false, code: null, message: e.message };
  }
}

function calculateLiveStock(products, transactions) {
  if (!Array.isArray(products) || !Array.isArray(transactions)) {
    Logger.log("Invalid input to calculateLiveStock: products or transactions is not an array.");
    return products || []; // Return original products array or empty array if null/undefined
  }
  products.forEach(p => {
    // Ensure product object is valid and has an ID
    if (!p || p.id === undefined || p.id === null) {
      Logger.log("Skipping invalid product object in calculateLiveStock.");
      return; // Skip this iteration if product is invalid
    }
    const initialStockDate = p.initialStockDate ? new Date(p.initialStockDate) : new Date(0); // Epoch start if no date
    // Filter transactions relevant to this product *after* the initial stock date
    const relevantTransactions = transactions.filter(t =>
      t && t.productId !== undefined && String(t.productId) === String(p.id) && // Safe ID comparison
      t.transactionDate && new Date(t.transactionDate) > initialStockDate
    );
    // Calculate stock changes
    const stockIn = relevantTransactions
      .filter(t => t.type === 'in' && typeof t.quantity === 'number') // Ensure quantity is number
      .reduce((sum, t) => sum + t.quantity, 0);
    const stockOut = relevantTransactions
      .filter(t => t.type === 'out' && typeof t.quantity === 'number') // Ensure quantity is number
      .reduce((sum, t) => sum + t.quantity, 0);
    // Calculate final stock, ensuring initialStock is treated as a number
    p.stock = (Number(p.initialStock) || 0) + stockIn - stockOut;
  });
  return products;
}

function getDashboardData() {
  try {
    let products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    const projects = getAllFromCache('projects', projectsSheet, parseProjects);
    const suppliers = getAllFromCache('suppliers', suppliersSheet, parseSuppliers);

    products = calculateLiveStock(products, transactions);

    const dataToReturn = {
      allProducts: products,
      allTransactions: transactions,
      allProjects: projects,
      allSuppliers: suppliers,
      categories: getProductCategories(products),
      dashboardStats: calculateDashboardStats(products, transactions, projects)
    };

    return JSON.stringify(dataToReturn);
  } catch (e) {
    Logger.log("Error in getDashboardData: " + e);
    // Return an empty object structure on error to prevent frontend crash
    return JSON.stringify({
      allProducts: [],
      allTransactions: [],
      allProjects: [],
      allSuppliers: [],
      categories: [],
      dashboardStats: {}
    });
  }
}

function forceRefreshData() {
  clearCache();
  return getDashboardData();
}

function getProducts(options) {
  try {
    let products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);

    products = calculateLiveStock(products, transactions);

    // Apply filters
    if (options.currentSearch) {
      const term = options.currentSearch.toLowerCase();
      products = products.filter(p =>
        (p.name || '').toString().toLowerCase().includes(term) ||
        (p.code || '').toString().toLowerCase().includes(term)
      );
    }
    if (options.currentCategory) {
      products = products.filter(p => p.category === options.currentCategory);
    }
    if (options.currentStockStatus) {
      products = products.filter(p => {
        if (options.currentStockStatus === 'ok') return p.stock > p.minStock;
        if (options.currentStockStatus === 'low') return p.stock <= p.minStock && p.stock > 0;
        if (options.currentStockStatus === 'out') return p.stock <= 0;
        return true; // Should not happen with dropdown, but default to true
      });
    }

    // Pagination
    const itemsPerPage = options.itemsPerPage || 10; // Default items per page
    const currentPage = options.currentPage || 1; // Default current page
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = products.slice(startIndex, startIndex + itemsPerPage);

    const dataToReturn = {
      products: paginatedProducts,
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        totalItems: totalItems,
        totalPages: totalPages
      }
    };

    return JSON.stringify(dataToReturn);
  } catch (e) {
    Logger.log("Error in getProducts: " + e);
    return JSON.stringify({ products: [], pagination: {} }); // Return empty on error
  }
}

function getProjectDetails(projectId) {
  try {
    const projects = getAllFromCache('projects', projectsSheet, parseProjects);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    let products = getAllFromCache('products', productsSheet, parseProducts);
    products = calculateLiveStock(products, transactions); // Ensure products have live stock for cost calculation

    const project = projects.find(p => String(p.id) === String(projectId)); // Safe comparison
    if (!project) {
      return JSON.stringify({ success: false, message: "ไม่พบโปรเจกต์" });
    }

    const projectTransactions = transactions
      .filter(t => t && String(t.projectId) === String(projectId)) // Safe comparison and check for valid 't'
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId)); // Safe comparison
        return { ...t, productName: product ? product.name : 'N/A' };
      })
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)); // Sort by date descending

    const totalCost = projectTransactions
      .filter(t => t.type === 'out')
      .reduce((sum, t) => {
        const product = products.find(p => p && String(p.id) === String(t.productId)); // Safe comparison
        // Ensure price and quantity are numbers
        const price = product && typeof product.price === 'number' ? product.price : 0;
        const quantity = typeof t.quantity === 'number' ? t.quantity : 0;
        const cost = price * quantity;
        return sum + cost;
      }, 0);

    const dataToReturn = {
      success: true,
      project: project,
      transactions: projectTransactions,
      totalCost: totalCost
    };

    return JSON.stringify(dataToReturn);
  } catch (e) {
    Logger.log("Error in getProjectDetails: " + e);
    return JSON.stringify({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + e.message });
  }
}

function calculateDashboardStats(products, transactions, projects) {
  if (!Array.isArray(products) || !Array.isArray(transactions) || !Array.isArray(projects)) {
    Logger.log("Invalid data passed to calculateDashboardStats");
    return {};
  }

  try {
    // Calculate total quantity safely
    const totalQuantity = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    // Calculate inventory value safely
    const inventoryValue = products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0);
    // Calculate reorder alerts safely
    const reorderAlerts = products.filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.minStock) || 0)).length;

    // Calculate top used products safely
    const usedProductCounts = transactions
      .filter(t => t && t.type === 'out' && t.productId !== undefined && (Number(t.quantity) || 0) > 0)
      .reduce((acc, t) => {
        acc[t.productId] = (acc[t.productId] || 0) + (Number(t.quantity) || 0);
        return acc;
      }, {});
    const topUsedProducts = Object.entries(usedProductCounts)
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
      .slice(0, 5)
      .map(([productId, totalQuantity]) => {
        const product = products.find(p => p && String(p.id) === String(productId));
        return { name: product ? product.name : 'Unknown Product', totalQuantity };
      });

    // Calculate top stock products safely
    const topStockProducts = [...products]
      .sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0))
      .slice(0, 5)
      .map(p => ({ name: p.name, stock: p.stock })); // Select only needed fields

    // Calculate low stock products safely
    const lowStockProducts = products
      .filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (Number(p.minStock) || 0))
      .sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));

    // Get recent transactions safely
    const recentTransactions = [...transactions]
      .sort((a, b) => (b.transactionDate ? new Date(b.transactionDate) : 0) - (a.transactionDate ? new Date(a.transactionDate) : 0))
      .slice(0, 5)
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId));
        return {
          type: t.type,
          productName: product ? product.name : 'N/A',
          quantity: t.quantity
        }; // Select only needed fields
      });

    // Calculate latest project costs safely
    const projectCosts = transactions
      .filter(t => t && t.type === 'out' && t.projectId)
      .reduce((acc, t) => {
        const product = products.find(p => p && String(p.id) === String(t.productId));
        const project = projects.find(p => p && String(p.id) === String(t.projectId));
        if (product && project) {
          const price = Number(product.price) || 0;
          const quantity = Number(t.quantity) || 0;
          const cost = price * quantity;
          const projectName = project.projectName;
          const transactionDate = t.transactionDate ? new Date(t.transactionDate) : new Date(0);

          if (!acc[projectName]) {
            acc[projectName] = { totalCost: 0, latestDate: new Date(0) };
          }
          acc[projectName].totalCost += cost;
          if (transactionDate > acc[projectName].latestDate) {
            acc[projectName].latestDate = transactionDate;
          }
        }
        return acc;
      }, {});
    const latestProjectCosts = Object.entries(projectCosts)
      .map(([projectName, data]) => ({ projectName, ...data }))
      .sort((a, b) => b.latestDate - a.latestDate)
      .slice(0, 5);


    const stats = {
      totalSKU: products.length,
      totalQuantity: totalQuantity,
      inventoryValue: inventoryValue,
      reorderAlerts: reorderAlerts,
      topUsedProducts: topUsedProducts,
      topStockProducts: topStockProducts,
      lowStockProducts: lowStockProducts,
      recentTransactions: recentTransactions,
      latestProjectCosts: latestProjectCosts
    };
    return stats;

  } catch (e) {
    Logger.log("Error calculating dashboard stats: " + e);
    return {}; // Return empty object on error
  }
}


// =================================================================
// --- CRUD OPERATIONS ---
// =================================================================

function addProduct(productData) {
  if (!productsSheet) return { success: false, message: "Sheet 'Products' not found." };
  try {
    const nextIdResult = getNextId(productsSheet);
    if (typeof nextIdResult !== 'number' || isNaN(nextIdResult)) {
      throw new Error("Failed to get next ID for Products sheet.");
    }
    const newId = nextIdResult;

    const nextCodeResult = getNextProductCode();
    if (!nextCodeResult.success || !nextCodeResult.code) {
      throw new Error(nextCodeResult.message || "Failed to generate product code.");
    }
    const autoCode = nextCodeResult.code;
    const now = new Date();

    // Ensure numeric fields are numbers or default to 0/null
    const price = Number(productData.price) || 0;
    const minStock = Number(productData.minStock) || 0;
    const initialStock = Number(productData.initialStock) || 0;
    const initialStockDate = productData.initialStockDate ? new Date(productData.initialStockDate) : now;

    // Append row with corrected data types
    // Assuming structure: A=ID, B=Code, C=Name, D=Category, E=Unit, F=Price, G=Stock(ignored), H=MinStock, I=Location, J=InitialStock, K=InitialStockDate, L=LastUpdate
    productsSheet.appendRow([
      newId,          // A
      autoCode,       // B
      productData.name || '', // C
      productData.category || '', // D
      productData.unit || '',   // E
      price,          // F
      '',             // G (Placeholder for Stock if column exists)
      minStock,       // H
      productData.location || '', // I
      initialStock,   // J
      initialStockDate,// K
      now,             // L (LastUpdate)
      productData.subcategory || '', // M (SubCategory if column exists)
      productData.supplierId || '', // N (SupplierID if column exists)
      productData.note || '' // O (Note if column exists)

    ]);

    logUserAction('Create Product', `Code: ${autoCode}, Name: ${productData.name}`);
    clearCache(); // Clear cache as data has changed
    return { success: true, message: "เพิ่มสินค้าสำเร็จ" };
  } catch (e) {
    Logger.log("Error in addProduct: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

function addTransaction(tData) {
  if (!transactionsSheet) return { success: false, message: "Sheet 'Transactions' not found." };
  try {
    // --- Data Validation ---
    if (!tData.productId || !tData.type || tData.quantity === undefined || tData.quantity === null) {
      throw new Error("ข้อมูลธุรกรรมไม่ครบถ้วน (ProductID, Type, Quantity จำเป็นต้องมี)");
    }
    const quantity = Number(tData.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      throw new Error("จำนวนต้องเป็นตัวเลขที่มากกว่า 0");
    }
    const transactionDate = tData.transactionDate ? new Date(tData.transactionDate) : new Date();
    // --- End Validation ---

    // Fetch products (potentially from cache) to get name and check stock if 'out'
    const allProducts = getAllFromCache('products', productsSheet, parseProducts); // Live stock not needed here
    const product = allProducts.find(p => String(p.id) === String(tData.productId));
    const productName = product ? product.name : `Unknown (ID: ${tData.productId})`;

    // Check stock level only if it's an 'out' transaction
    if (tData.type === 'out') {
      // Need live stock for this check
      const productsWithLiveStock = calculateLiveStock(allProducts, getAllFromCache('transactions', transactionsSheet, parseTransactions));
      const currentProductState = productsWithLiveStock.find(p => String(p.id) === String(tData.productId));
      if (!currentProductState) {
        throw new Error(`Product with ID ${tData.productId} not found for stock check.`);
      }
      if (currentProductState.stock < quantity) {
        throw new Error(`จำนวนเบิกจ่าย (${quantity}) มากกว่าจำนวนคงเหลือ (${currentProductState.stock}) ของ ${productName}`);
      }
    }


    const logDetails = `Type: ${tData.type}, Product: ${productName}, Qty: ${quantity}`;

    const nextIdResult = getNextId(transactionsSheet);
    if (typeof nextIdResult !== 'number' || isNaN(nextIdResult)) {
      throw new Error("Failed to get next ID for Transactions sheet.");
    }
    const newId = nextIdResult;

    // Assuming structure: A=ID, B=TransactionDate, C=Timestamp, D=Type, E=ProductID, F=Quantity, G=ProjectID, H=SupplierID, I=Note, J=User
    transactionsSheet.appendRow([
      newId,            // A
      transactionDate,  // B - Use validated/defaulted date
      new Date(),       // C - Timestamp of recording
      tData.type,       // D
      tData.productId,  // E
      quantity,         // F - Use validated number
      tData.projectId || '', // G
      tData.supplierId || '', // H
      tData.note || '',   // I
      tData.email || getUserInfo().email || '', // J
      Utilities.getUuid() // K - Unique Transaction Code
    ]);

    // Update LastUpdate in Products sheet
    if (productsSheet && product) { // Ensure sheet and product exist
      const rowIndex = findRowById(productsSheet, tData.productId);
      if (rowIndex > 0) {
        // Assuming LastUpdate is Column L (index 11 + 1 = 12)
        productsSheet.getRange(rowIndex, 12).setValue(new Date());
      }
    }

    logUserAction('New Transaction', logDetails);
    clearCache(); // IMPORTANT: Clear cache as both transactions and product stock (implicitly) have changed

    // Send Telegram Notification & Backup
    if (tData.type === 'out' && product) {
      const paymentObject = { Product: product.name, Quantity: quantity, Member: getUserInfo().email, Date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') };
      sendTelegramNotification('Payments', [paymentObject]);
      createBackupFile('Transactions'); // Consider backing up Products too if LastUpdate is critical
    }

    return { success: true, message: "บันทึกธุรกรรมสำเร็จ" };
  } catch (e) {
    Logger.log("Error in addTransaction: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

function updateProduct(productData) {
  if (!productsSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์แก้ไขข้อมูล" };
  try {
    const rowIndex = findRowById(productsSheet, productData.id);
    if (rowIndex <= 0) { // Check if product was found
      return { success: false, message: "ไม่พบสินค้าที่ต้องการแก้ไข" };
    }

    const now = new Date();
    // Ensure numeric fields are numbers or default to 0/null
    const price = Number(productData.price) || 0;
    const minStock = Number(productData.minStock) || 0;
    const initialStock = Number(productData.initialStock) || 0;
    // Keep old date if new one not provided or invalid
    const existingInitialDate = productsSheet.getRange(rowIndex, 11).getValue(); // K column
    const initialStockDate = productData.initialStockDate && !isNaN(new Date(productData.initialStockDate).getTime())
      ? new Date(productData.initialStockDate)
      : (existingInitialDate instanceof Date ? existingInitialDate : now);


    // Update range B to K (10 columns), assuming structure ID(A), Code(B)...InitialStockDate(K), LastUpdate(L)
    productsSheet.getRange(rowIndex, 2, 1, 13).setValues([[
      productData.code || '',         // Code B
      productData.name || '',         // Name C
      productData.category || '',     // Category D
      productData.unit || '',         // Unit E
      price,                          // Price F
      '',                             // G (Placeholder)
      minStock,                       // MinStock H
      productData.location || '',     // Location I
      initialStock,                   // InitialStock J
      initialStockDate,                // InitialStockDate K
      productData.subcategory || '',   // SubCategory L
      productData.supplierId || '',    // SupplierID M
      productData.note || ''          // Note N
    ]]);
    // Update LastUpdate in Column L (index 12)
    productsSheet.getRange(rowIndex, 12).setValue(now);

    logUserAction('Update Product', `ID: ${productData.id}, Name: ${productData.name}`);
    clearCache(); // Clear cache as product data has changed
    return { success: true, message: "อัปเดตข้อมูลสินค้าสำเร็จ" };
  } catch (e) {
    Logger.log("Error in updateProduct: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}


function deleteProduct(productId) {
  if (!productsSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์ลบข้อมูล" };
  try {
    const rowIndex = findRowById(productsSheet, productId);
    if (rowIndex > 0) {
      const productName = productsSheet.getRange(rowIndex, 3).getValue(); // Get name (Column C) before deleting
      logUserAction('Delete Product', `ID: ${productId}, Name: ${productName}`);
      productsSheet.deleteRow(rowIndex);
      clearCache(); // Clear cache as product is removed
      return { success: true, message: "ลบสินค้าสำเร็จ" };
    }
    return { success: false, message: "ไม่พบสินค้าที่ต้องการลบ" };
  } catch (e) {
    Logger.log("Error in deleteProduct: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}


function addProject(projectData) {
  if (!projectsSheet) return { success: false, message: "Sheet 'Projects' not found." };
  try {
    const nextIdResult = getNextId(projectsSheet);
    if (typeof nextIdResult !== 'number' || isNaN(nextIdResult)) {
      throw new Error("Failed to get next ID for Projects sheet.");
    }
    const newId = nextIdResult;

    const nextCodeResult = getNextProjectCode();
    if (!nextCodeResult.success || !nextCodeResult.code) {
      throw new Error(nextCodeResult.message || "Failed to generate project code.");
    }
    const autoCode = nextCodeResult.code;
    const now = new Date();

    // Validate and format dates, default to null if invalid
    const startDate = projectData.startDate && !isNaN(new Date(projectData.startDate).getTime()) ? new Date(projectData.startDate) : null;
    const endDate = projectData.endDate && !isNaN(new Date(projectData.endDate).getTime()) ? new Date(projectData.endDate) : null;

    // Append row according to the structure: A=ID to J=LastUpdate
    projectsSheet.appendRow([
      newId,                      // A: ID
      autoCode,                   // B: ProjectCode
      projectData.projectName || '', // C: ProjectName
      projectData.status || 'In Progress', // D: Status
      projectData.description || '', // E: Description
      startDate,                  // F: StartDate
      endDate,                    // G: EndDate
      projectData.customer || '',    // H: Customer
      projectData.notes || '',       // I: Notes
      now                          // J: LastUpdate
    ]);

    logUserAction('Create Project', `Code: ${autoCode}, Name: ${projectData.projectName}`);
    clearCache(); // Clear project cache

    // Create the object to return based on the appended data, use parseProjects for consistency
    const newProjectDataRow = [
      newId, autoCode, projectData.projectName || '', projectData.status || 'In Progress',
      projectData.description || '', startDate, endDate,
      projectData.customer || '', projectData.notes || '', now
    ];
    const newProject = parseProjects([newProjectDataRow])[0]; // Wrap in array for parser


    return { success: true, message: "เพิ่มโปรเจกต์สำเร็จ", newData: newProject };
  } catch (e) {
    Logger.log("Error in addProject: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

function updateProject(projectData) {
  if (!projectsSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์แก้ไขข้อมูล" };
  try {
    const rowIndex = findRowById(projectsSheet, projectData.id);
    if (rowIndex <= 0) {
      return { success: false, message: "ไม่พบโปรเจกต์ที่ต้องการแก้ไข" };
    }

    // Validate and format dates, default to null if invalid or not provided
    const startDate = projectData.startDate && !isNaN(new Date(projectData.startDate).getTime()) ? new Date(projectData.startDate) : null;
    const endDate = projectData.endDate && !isNaN(new Date(projectData.endDate).getTime()) ? new Date(projectData.endDate) : null;


    // Update range B to I (8 columns): ProjectCode to Notes
    projectsSheet.getRange(rowIndex, 2, 1, 8).setValues([[
      projectData.projectCode,          // B: ProjectCode (usually readonly from frontend)
      projectData.projectName || '',      // C: ProjectName
      projectData.status || 'In Progress',// D: Status
      projectData.description || '',    // E: Description
      startDate,                        // F: StartDate
      endDate,                          // G: EndDate
      projectData.customer || '',       // H: Customer
      projectData.notes || ''           // I: Notes
    ]]);
    // Update LastUpdate in Column J (index 10)
    projectsSheet.getRange(rowIndex, 10).setValue(new Date());

    logUserAction('Update Project', `ID: ${projectData.id}, Name: ${projectData.projectName}`);
    clearCache(); // Clear project cache
    return { success: true, message: "อัปเดตโปรเจกต์สำเร็จ" };
  } catch (e) {
    Logger.log("Error in updateProject: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}


function deleteProject(projectId) {
  if (!projectsSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์ลบข้อมูล" };
  try {
    const rowIndex = findRowById(projectsSheet, projectId);
    if (rowIndex > 0) {
      const projectName = projectsSheet.getRange(rowIndex, 3).getValue(); // Get name (Column C) before delete
      logUserAction('Delete Project', `ID: ${projectId}, Name: ${projectName}`);
      projectsSheet.deleteRow(rowIndex);
      clearCache(); // Clear project cache
      return { success: true, message: "ลบโปรเจกต์สำเร็จ" };
    }
    return { success: false, message: "ไม่พบโปรเจกต์ที่ต้องการลบ" };
  } catch (e) {
    Logger.log("Error in deleteProject: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}


function addOrUpdateSupplier(supplierData) {
  if (!suppliersSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์แก้ไขข้อมูล" };
  try {
    if (supplierData.id) { // Update
      const rowIndex = findRowById(suppliersSheet, supplierData.id);
      if (rowIndex > 0) {
        // Update columns B to G (Name to Notes) - 6 columns
        // Assuming structure: A=ID, B=Name, C=Contact, D=Email, E=Phone, F=Address, G=Notes
        suppliersSheet.getRange(rowIndex, 2, 1, 6).setValues([[
          supplierData.name || '',
          supplierData.contact || '',
          supplierData.email || '',
          supplierData.phone || '',
          supplierData.address || '',
          supplierData.notes || ''
        ]]);
        logUserAction('Update Supplier', `ID: ${supplierData.id}, Name: ${supplierData.name}`);
        clearCache();
        // Return the updated data structure matching parseSuppliers by re-parsing
        const updatedDataRow = [supplierData.id, supplierData.name, supplierData.contact, supplierData.email, supplierData.phone, supplierData.address, supplierData.notes];
        const updatedData = parseSuppliers([updatedDataRow])[0]; // Wrap in array for parser
        return { success: true, message: "บันทึกข้อมูลซัพพลายเออร์สำเร็จ", newData: updatedData };
      } else {
        return { success: false, message: "ไม่พบซัพพลายเออร์ที่ต้องการแก้ไข" };
      }
    } else { // Add
      const nextIdResult = getNextId(suppliersSheet);
      if (typeof nextIdResult !== 'number' || isNaN(nextIdResult)) {
        throw new Error("Failed to get next ID for Suppliers sheet.");
      }
      const newId = nextIdResult;

      suppliersSheet.appendRow([
        newId,                      // A: ID
        supplierData.name || '',    // B: Name
        supplierData.contact || '', // C: Contact
        supplierData.email || '',   // D: Email
        supplierData.phone || '',   // E: Phone
        supplierData.address || '', // F: Address
        supplierData.notes || ''    // G: Notes
      ]);
      logUserAction('Create Supplier', `Name: ${supplierData.name}`);
      clearCache();
      // Return the new data structure matching parseSuppliers by parsing the new row data
      const newDataRow = [newId, supplierData.name, supplierData.contact, supplierData.email, supplierData.phone, supplierData.address, supplierData.notes];
      const newData = parseSuppliers([newDataRow])[0]; // Wrap in array for parser
      return { success: true, message: "บันทึกข้อมูลซัพพลายเออร์สำเร็จ", newData: newData };
    }
  } catch (e) {
    Logger.log("Error in addOrUpdateSupplier: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}

function deleteSupplier(supplierId) {
  if (!suppliersSheet || getUserInfo().role !== 'admin') return { success: false, message: "คุณไม่มีสิทธิ์ลบข้อมูล" };
  try {
    const rowIndex = findRowById(suppliersSheet, supplierId);
    if (rowIndex > 0) {
      const supplierName = suppliersSheet.getRange(rowIndex, 2).getValue(); // Get name (Column B) before deleting
      logUserAction('Delete Supplier', `ID: ${supplierId}, Name: ${supplierName}`);
      suppliersSheet.deleteRow(rowIndex);
      clearCache(); // Clear supplier cache
      return { success: true, message: "ลบซัพพลายเออร์สำเร็จ" };
    }
    return { success: false, message: "ไม่พบซัพพลายเออร์ที่ต้องการลบ" };
  } catch (e) {
    Logger.log("Error in deleteSupplier: " + e);
    return { success: false, message: "เกิดข้อผิดพลาด: " + e.message };
  }
}


// =================================================================
// --- REPORTING & EXPORT ---
// =================================================================
function getBase64Image(imageUrl) {
  try {
    const response = UrlFetchApp.fetch(imageUrl);
    const contentType = response.getHeaders()['Content-Type'] || 'image/png';
    const imageBlob = response.getBlob();
    const base64Data = Utilities.base64Encode(imageBlob.getBytes());
    return `data:${contentType};base64,${base64Data}`;
  } catch (e) {
    Logger.log("Error fetching image for base64 conversion: " + e);
    return ''; // Return empty string on error
  }
}
function generateInventoryReportPDF(data) {
  // data = {
  //   "category": "",
  //   "subcategory": "",
  //   "startDate": "2025-10-03",
  //   "endDate": "2025-12-31"
  // }; // For testing purposes
  try {
    // Validate dates
    if (!data || !data.startDate || !data.endDate) {
      return { success: false, message: "กรุณาเลือกช่วงวันที่สำหรับรายงาน" };
    }

    if (!data.category) data.category = 'All';
    if (!data.subcategory) data.subcategory = 'All';

    let products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    products = calculateLiveStock(products, transactions); // Ensure live stock

    const startDate = new Date(data.startDate); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.endDate); endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, message: "วันที่ที่ป้อนไม่ถูกต้อง" };
    }

    let filtered = products.filter(p => {
      // Apply category and subcategory filters
      if (data.category && data.category !== 'All' && p.category !== data.category) {
        return false;
      }
      if (data.subcategory && data.subcategory !== 'All' && p.subcategory !== data.subcategory) {
        return false;
      }
      // apply date filter based on update date
      const lastUpdate = p.lastUpdate ? new Date(p.lastUpdate) : null;
      if (lastUpdate) {
        if (lastUpdate < startDate || lastUpdate > endDate) {
          return false;
        }
      } else {
        return false; // Exclude products with no last update date when date filter is applied
      }
      return true;
    });
    if (!Array.isArray(filtered) || filtered.length === 0) return { success: false, message: "ไม่มีข้อมูลสินค้าสำหรับสร้างรายงาน" };

    filtered = filtered.map(p => ({
      ...p,
      price: Number(p.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00',
      stock: Number(p.stock || 0).toLocaleString() || '0',
      totalValue: ((Number(p.stock || 0)) * (Number(p.price || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'
    }));

    // Use the HTML template
    const template = HtmlService.createTemplateFromFile('InventoryReportTemplate');

    const logoBase64 = getBase64Image('https://img2.pic.in.th/pic/be503e88-1d81-4a83-bc3b-a75e914247da.jpg'); // Helper function to get base64 image
    template.inventories = filtered.sort((a, b) => a.code.localeCompare(b.code)); // Sort by code
    template.startDate = startDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
    template.endDate = endDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
    template.generatedDate = new Date().toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' }) + '  , ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    template.categoryFilter = (data.category === 'All' ? 'ทุกหมวด' : data.category) + ' / ' + (data.subcategory === 'All' ? 'ทุกประเภท' : data.subcategory);
    template.totalSKU = filtered.length;
    template.totalRemaining = filtered.reduce((sum, p) => sum + (Number(p.stock) || 0), 0).toLocaleString();
    template.totalCost = filtered.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.price) || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


    let htmlContent = template.evaluate().getContent().replace(/\[\[LOGO_IMAGE\]\]/g, logoBase64);

    // Use MimeType constants for clarity
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, `Inventory_Report_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd")}.pdf`).getAs(MimeType.PDF);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);

    logUserAction('Generate Report', 'Inventory Report (PDF)');
    return { success: true, url: file.getUrl() };
  } catch (e) {
    Logger.log("Error generating Inventory PDF: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้าง PDF: " + e.message };
  }
}

function generateWithdrawalReportPDF(data) {
  const response = generateWithdrawalReportHTML(data); // Get HTML content
  if (!response.success) return response;

  try {
    const blob = Utilities.newBlob(response.html, MimeType.HTML, `Withdrawal_Report_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd")}.pdf`).getAs(MimeType.PDF);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const file = folder.createFile(blob);
    logUserAction('Generate Report', `Withdrawal Report (PDF) Dates: ${data.startDate} to ${data.endDate}`);
    return { success: true, url: file.getUrl() };
  } catch (e) {
    Logger.log("Error generating Withdrawal PDF: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้าง PDF: " + e.message };
  }
}

function generateWithdrawalReportPrint(data) {
  // This function now just returns the HTML generated by the helper
  logUserAction('Generate Report', `Withdrawal Report (Print) Dates: ${data.startDate} to ${data.endDate}`);
  let htmlContent = generateWithdrawalReportHTML(data).html;
  return { success: true, htmlContent };
}

function generateWithdrawalReportHTML(data = {}) {
  // data = {
  //   "category": "All",
  //   "subcategory": "All",
  //   "startDate": "2025-10-01",
  //   "endDate": "2025-12-31"
  // }
  try {
    // Validate dates
    if (!data || !data.startDate || !data.endDate) {
      return { success: false, message: "กรุณาเลือกช่วงวันที่สำหรับรายงาน" };
    }

    if (!data.category) data.category = 'All';
    if (!data.subcategory) data.subcategory = 'All';

    const startDate = new Date(data.startDate); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.endDate); endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, message: "วันที่ที่ป้อนไม่ถูกต้อง" };
    }

    const products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    const projects = getAllFromCache('projects', projectsSheet, parseProjects); // Needed for project name

    const filtered = transactions.filter(t => {
      if (!t || !t.transactionDate) return false; // Skip invalid transactions
      const tDate = new Date(t.transactionDate);
      const prod = products.find(p => p && String(p.id) === String(t.productId));
      if (data.category && data.category !== 'All') {
        if (!prod || prod.category !== data.category) return false;
      }
      if (data.subcategory && data.subcategory !== 'All') {
        if (!prod || prod.subcategory !== data.subcategory) return false;
      }
      return t.type === 'out' && tDate >= startDate && tDate <= endDate;
    });

    if (filtered.length === 0) return { success: false, message: "ไม่มีข้อมูลการเบิกจ่ายในช่วงวันที่เลือก" };

    let totalValue = 0;
    const transactionDataForTemplate = filtered
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)) // Sort by date ascending for report
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId));
        const project = projects.find(p => p && String(p.id) === String(t.projectId));
        const price = (product && typeof product.price === 'number') ? product.price : 0;
        const quantity = (typeof t.quantity === 'number') ? t.quantity : 0;
        const cost = price * quantity;
        totalValue += cost;

        let note = t.note || '';
        if (project) {
          note = note ? `${note} [ ${project.projectName}]` : `[${project.projectName}]`;
        }

        return {
          date: new Date(t.transactionDate).toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' }),
          time: new Date(t.transactionDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          productName: product ? product.name : 'N/A',
          quantity: quantity.toLocaleString(),
          unitPrice: price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          totalCost: cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          note: note
        };
      });

    const logoBase64 = getBase64Image('https://img2.pic.in.th/pic/be503e88-1d81-4a83-bc3b-a75e914247da.jpg'); // Helper function to get base64 image

    // Use the HTML template
    const template = HtmlService.createTemplateFromFile('WithdrawalReportTemplate');
    template.transactions = transactionDataForTemplate;
    template.startDate = startDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
    template.endDate = endDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' });
    template.generatedDate = new Date().toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric' }) + '  , ' + new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    template.categoryFilter = (data.category === 'All' ? 'ทุกหมวด' : data.category) + ' / ' + (data.subcategory === 'All' ? 'ทุกประเภท' : data.subcategory);
    template.totalValue = totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    template.totalSKU = [...new Set(filtered.map(t => t.productId))].length;
    template.totalRemaining = [...new Set(filtered.map(t => t.productId))].reduce((sum, pid) => {
      const prod = products.find(p => String(p.id) === String(pid));
      if (prod) {
        const liveStock = calculateLiveStock([prod], transactions)[0];
        return sum + (liveStock ? (Number(liveStock.stock) || 0) : 0);
      }
      return sum;
    }, 0).toLocaleString();
    template.totalCost = totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const html = template.evaluate().getContent().replace(/\[\[LOGO_IMAGE\]\]/g, logoBase64);
    return { success: true, html: html };
  } catch (e) {
    Logger.log("Error generating Withdrawal HTML: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรายงาน: " + e.message };
  }
}

function generateProjectReportPrint(projectId) {
  try {
    const projects = getAllFromCache('projects', projectsSheet, parseProjects);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    const products = getAllFromCache('products', productsSheet, parseProducts);

    const project = projects.find(p => String(p.id) === String(projectId)); // Safe comparison
    if (!project) {
      return { success: false, message: "ไม่พบข้อมูลโปรเจกต์" };
    }

    let totalCost = 0;
    const projectTransactions = transactions
      .filter(t => t && String(t.projectId) === String(projectId) && t.type === 'out') // Filter relevant 'out' transactions
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)) // Sort by date ascending
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId)); // Find product
        const price = (product && typeof product.price === 'number') ? product.price : 0;
        const quantity = (typeof t.quantity === 'number') ? t.quantity : 0;
        const cost = price * quantity;
        totalCost += cost;
        return { // Data structure for the template
          date: t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('th-TH') : 'N/A',
          productName: product ? product.name : 'N/A',
          quantity: quantity.toLocaleString(),
          pricePerUnit: price.toLocaleString('en-US', { minimumFractionDigits: 2 }),
          totalPrice: cost.toLocaleString('en-US', { minimumFractionDigits: 2 })
        };
      });

    const generatedDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    const vat = totalCost * 0.07;
    const grandTotal = totalCost + vat;
    const logoBase64 = getBase64Image('https://img2.pic.in.th/pic/be503e88-1d81-4a83-bc3b-a75e914247da.jpg'); // Helper function to get base64 image

    // Use the HTML template
    const template = HtmlService.createTemplateFromFile('ProjectReportTemplate');
    // Pass data to the template
    template.project = project; // Pass the whole project object
    template.transactions = projectTransactions;
    template.totalCost = totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 });
    template.vat = vat.toLocaleString('en-US', { minimumFractionDigits: 2 });
    template.grandTotal = grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 });
    template.generatedDate = generatedDate;

    const htmlContent = template.evaluate().getContent().replace(/\[\[LOGO_IMAGE\]\]/g, logoBase64);

    logUserAction('Generate Report', `Project Report (Print) ID: ${projectId}`);
    return { success: true, htmlContent: htmlContent };
  } catch (e) {
    Logger.log("Error generating Project Print Report: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการสร้างรายงาน: " + e.message };
  }
}


function exportTransactionsToSheet(data) {
  try {
    // Validate dates
    if (!data || !data.startDate || !data.endDate) {
      throw new Error("กรุณาระบุช่วงวันที่ให้ครบถ้วน");
    }
    const startDate = new Date(data.startDate); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.endDate); endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
    }

    const products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    const projects = getAllFromCache('projects', projectsSheet, parseProjects); // Needed for project name
    const suppliers = getAllFromCache('suppliers', suppliersSheet, parseSuppliers); // Needed for supplier name

    const filtered = transactions.filter(t => {
      if (!t || !t.transactionDate) return false;
      const tDate = new Date(t.transactionDate);
      return tDate >= startDate && tDate <= endDate;
    });

    if (filtered.length === 0) return { success: false, message: "ไม่มีข้อมูลธุรกรรมในช่วงวันที่เลือก" };

    const headers = ['Transaction ID', 'Transaction Date', 'Record Timestamp', 'Type', 'Product ID', 'Product Code', 'Product Name', 'Quantity', 'Project ID', 'Project Name', 'Supplier ID', 'Supplier Name', 'Note', 'User Email'];
    const dataRows = filtered
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)) // Sort by date
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId));
        const project = projects.find(p => p && String(p.id) === String(t.projectId));
        const supplier = suppliers.find(s => s && String(s.id) === String(t.supplierId));
        return [
          t.id,
          t.transactionDate ? new Date(t.transactionDate) : null,
          t.timestamp ? new Date(t.timestamp) : null,
          t.type === 'in' ? 'รับเข้า' : 'เบิกออก',
          t.productId,
          product ? product.code : 'N/A',
          product ? product.name : 'N/A',
          Number(t.quantity) || 0,
          t.projectId || '',
          project ? project.projectName : '',
          t.supplierId || '',
          supplier ? supplier.name : '',
          t.note || '',
          t.user || ''
        ];
      });

    const newSpreadsheet = SpreadsheetApp.create(`Export_Transactions_${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd")}`);
    const sheet = newSpreadsheet.getSheets()[0]; // Get the first sheet

    // Write data
    sheet.appendRow(headers);
    sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);

    // Formatting (Optional but recommended)
    sheet.getRange("B:C").setNumberFormat("yyyy-mm-dd hh:mm:ss"); // Format date columns
    sheet.getRange("H:H").setNumberFormat("#,##0"); // Format quantity
    sheet.setFrozenRows(1); // Freeze header row
    sheet.autoResizeColumns(1, headers.length); // Adjust column widths

    // Move to specified folder
    DriveApp.getFileById(newSpreadsheet.getId()).moveTo(DriveApp.getFolderById(FOLDER_ID));

    logUserAction('Export Data', `Transactions to Google Sheet Dates: ${data.startDate} to ${data.endDate}`);
    return { success: true, url: newSpreadsheet.getUrl() };
  } catch (e) {
    Logger.log("Error exporting Transactions to Sheet: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการส่งออก: " + e.message };
  }
}

function exportTransactionsToCSV(data) {
  try {
    // Validate dates
    if (!data || !data.startDate || !data.endDate) {
      throw new Error("กรุณาระบุช่วงวันที่ให้ครบถ้วน");
    }
    const startDate = new Date(data.startDate); startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(data.endDate); endDate.setHours(23, 59, 59, 999);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
    }

    const products = getAllFromCache('products', productsSheet, parseProducts);
    const transactions = getAllFromCache('transactions', transactionsSheet, parseTransactions);
    const projects = getAllFromCache('projects', projectsSheet, parseProjects); // Needed for project name
    const suppliers = getAllFromCache('suppliers', suppliersSheet, parseSuppliers); // Needed for supplier name

    const filtered = transactions.filter(t => {
      if (!t || !t.transactionDate) return false;
      const tDate = new Date(t.transactionDate);
      return tDate >= startDate && tDate <= endDate;
    });

    if (filtered.length === 0) return { success: false, message: "ไม่มีข้อมูลธุรกรรมในช่วงวันที่เลือก" };

    // Function to safely quote CSV fields
    const quote = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

    const headers = ['Transaction ID', 'Transaction Date', 'Record Timestamp', 'Type', 'Product ID', 'Product Code', 'Product Name', 'Quantity', 'Project ID', 'Project Name', 'Supplier ID', 'Supplier Name', 'Note', 'User Email'];
    const dataRows = filtered
      .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate)) // Sort by date
      .map(t => {
        const product = products.find(p => p && String(p.id) === String(t.productId));
        const project = projects.find(p => p && String(p.id) === String(t.projectId));
        const supplier = suppliers.find(s => s && String(s.id) === String(t.supplierId));
        return [
          quote(t.id),
          quote(t.transactionDate ? Utilities.formatDate(new Date(t.transactionDate), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : ''),
          quote(t.timestamp ? Utilities.formatDate(new Date(t.timestamp), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss") : ''),
          quote(t.type === 'in' ? 'รับเข้า' : 'เบิกออก'),
          quote(t.productId),
          quote(product ? product.code : 'N/A'),
          quote(product ? product.name : 'N/A'),
          Number(t.quantity) || 0, // Keep quantity as number for CSV
          quote(t.projectId || ''),
          quote(project ? project.projectName : ''),
          quote(t.supplierId || ''),
          quote(supplier ? supplier.name : ''),
          quote(t.note || ''),
          quote(t.user || '')
        ].join(','); // Join fields with comma
      });

    let csvContent = headers.join(',') + '\n'; // Add header row
    csvContent += dataRows.join('\n'); // Join data rows

    logUserAction('Export Data', `Transactions to CSV Dates: ${data.startDate} to ${data.endDate}`);
    // Add BOM for Excel UTF-8 compatibility
    return { success: true, csvContent: '\uFEFF' + csvContent };
  } catch (e) {
    Logger.log("Error exporting Transactions to CSV: " + e);
    return { success: false, message: "เกิดข้อผิดพลาดในการส่งออก CSV: " + e.message };
  }
}


// =================================================================
// --- UTILITIES & HELPERS ---
// =================================================================

function sendTelegramNotification(type, data) {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      Logger.log("Telegram Token or Chat ID not configured. Skipping notification.");
      return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    let message = '';

    if (type === 'Products' && Array.isArray(data)) {
      message = `📦 *เพิ่มวัสดุใหม่* 📦\n\nวันที่: ${timestamp}\n\n`;
      data.forEach(item => {
        message += `• ${item.Name || 'N/A'} (${item.Quantity || 0} ชิ้น)\n`;
      });
    } else if (type === 'Payments' && Array.isArray(data)) {
      message = `📤 *เบิกจ่ายวัสดุ* 📤\n\nวันที่: ${timestamp}\n\n`;
      data.forEach(item => {
        message += `• ${item.Product || 'N/A'} (${item.Quantity || 0} ชิ้น)\n  โดย: ${item.Member || 'N/A'}\n`;
      });
    }

    if (message === '') {
      Logger.log("No message content generated for Telegram notification.");
      return; // Don't send empty message
    }

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true // Prevents script failure on Telegram error
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Telegram notification sent successfully for ${type}.`);
    } else {
      Logger.log(`Telegram notification failed for ${type}. Code: ${responseCode}, Body: ${responseBody}`);
    }

  } catch (error) {
    Logger.log(`Error sending Telegram notification for ${type}: ${error.message}`);
  }
}

function createBackupFile(sheetName) {
  try {
    if (!FOLDER_ID) {
      Logger.log("Backup Folder ID not configured. Skipping backup.");
      return;
    }
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `${sheetName}_Backup_${timestamp}.csv`;
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log(`Sheet '${sheetName}' not found for backup.`);
      return; // Exit if sheet doesn't exist
    }

    const data = sheet.getDataRange().getValues();
    if (data.length === 0) {
      Logger.log(`Sheet '${sheetName}' is empty. Skipping backup.`);
      return; // Don't create empty backup files
    }

    // Safely quote CSV data
    const csvContent = data.map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    folder.createFile(fileName, '\uFEFF' + csvContent, MimeType.CSV); // Add BOM for Excel
    Logger.log(`Backup created successfully: ${fileName}`);

  } catch (error) {
    Logger.log(`Backup failed for sheet '${sheetName}': ${error.message}`);
    // Optional: Send an error notification if backup fails
    // sendTelegramNotification('Backup Error', [{Sheet: sheetName, Error: error.message}]);
  }
}


function getAllFromCache(cacheKey, sheet, parser) {
  if (!sheet) { Logger.log(`Warning: Sheet for cache key '${cacheKey}' not found.`); return []; }

  try {
    let cached = CACHE.get(cacheKey);
    if (cached) {
      // Attempt to parse cached data, return empty array if fails
      try {
        return JSON.parse(cached);
      } catch (parseError) {
        Logger.log(`Error parsing cached data for key '${cacheKey}'. Refetching. Error: ${parseError}`);
        CACHE.remove(cacheKey); // Remove corrupted cache entry
      }
    }
  } catch (cacheError) {
    Logger.log(`Error accessing cache for key '${cacheKey}'. Refetching. Error: ${cacheError}`);
  }


  // Fetch from sheet if cache miss or error
  try {
    if (sheet.getLastRow() < 2) return []; // No data rows
    // Get data range safely
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    const parsedData = parser(data);

    // Put data in cache, handle potential errors
    try {
      CACHE.put(cacheKey, JSON.stringify(parsedData), 3600); // Cache for 1 hour
    } catch (cachePutError) {
      Logger.log(`Error putting data into cache for key '${cacheKey}'. Error: ${cachePutError}`);
    }
    return parsedData;

  } catch (sheetError) {
    Logger.log(`Error reading sheet data for key '${cacheKey}'. Returning empty array. Error: ${sheetError}`);
    return []; // Return empty array on sheet reading error
  }
}

function clearCache() {
  try {
    // Specify keys to remove, more robust than removeAll if other caches exist
    CACHE.removeAll(['products', 'transactions', 'projects', 'suppliers']);
    Logger.log("Cleared specified app caches.");
  } catch (e) {
    Logger.log("Error clearing cache: " + e);
  }
}

// =================================================================
// --- PARSING FUNCTIONS ---
// =================================================================

function parseProducts(data) {
  if (!Array.isArray(data)) return [];
  const products = data.map((row, index) => {
    try {
      if (!row || row[0] === undefined || row[0] === null || row[0] === '') return null; // Check ID validity
      // Assuming structure: A=ID, B=Code, C=Name, D=Category, E=Unit, F=Price, G=Stock(ignored), H=MinStock, I=Location, J=InitialStock, K=InitialStockDate, L=LastUpdate
      return {
        id: row[0],
        code: row[1] || '',
        name: row[2] || '',
        category: row[3] || '',
        unit: row[4] || '',
        price: parseFloat(row[5]) || 0, // Column F
        minStock: parseInt(row[7]) || 0, // Column H
        location: row[8] || '', // Column I
        initialStock: parseInt(row[9]) || 0, // Column J
        initialStockDate: row[10] && !isNaN(new Date(row[10]).getTime()) ? new Date(row[10]).toISOString() : null, // Column K
        lastUpdate: row[11] && !isNaN(new Date(row[11]).getTime()) ? new Date(row[11]).toISOString() : null, // Column L
        stock: 0, // Will be calculated later
        subcategory: row[12] || '', // Column M
        supplierId: row[13] || '', // Column N
        note: row[14] || '' // Column O
      };
    } catch (e) {
      Logger.log(`Error parsing product row index ${index + 2}: ${e.message}. Data: ${JSON.stringify(row)}`);
      return null;
    }
  });
  return products.filter(p => p !== null); // Filter out null results
}

function parseTransactions(data) {
  if (!Array.isArray(data)) return [];
  const transactions = data.map((row, index) => {
    try {
      if (!row || row[0] === undefined || row[0] === null || row[0] === '') return null; // Check ID validity
      // Assuming structure: A=ID, B=TransactionDate, C=Timestamp, D=Type, E=ProductID, F=Quantity, G=ProjectID, H=SupplierID, I=Note, J=User
      const quantity = parseInt(row[5]);
      return {
        id: row[0],
        transactionDate: row[1] && !isNaN(new Date(row[1]).getTime()) ? new Date(row[1]).toISOString() : null, // Column B
        timestamp: row[2] && !isNaN(new Date(row[2]).getTime()) ? new Date(row[2]).toISOString() : null, // Column C
        type: String(row[3] || '').toLowerCase() === 'in' ? 'in' : (String(row[3] || '').toLowerCase() === 'out' ? 'out' : null), // Column D
        productId: row[4], // Column E
        quantity: isNaN(quantity) ? 0 : quantity, // Column F
        projectId: row[6], // Column G
        supplierId: row[7], // Column H
        note: row[8] || '', // Column I
        user: row[9] || '' // Column J
      };
    } catch (e) {
      Logger.log(`Error parsing transaction row index ${index + 2}: ${e.message}. Data: ${JSON.stringify(row)}`);
      return null;
    }
  });
  // Filter out null results and transactions with invalid types or quantities <= 0
  return transactions.filter(t => t !== null && t.type !== null && t.quantity > 0);
}


function parseSuppliers(data) {
  if (!Array.isArray(data)) return [];
  return data.map((row, index) => {
    try {
      if (!row || row[0] === undefined || row[0] === null || row[0] === '') return null; // Check ID validity
      // Assuming structure: A=ID, B=Name, C=Contact, D=Email, E=Phone, F=Address, G=Notes
      return {
        id: row[0], // Column A
        name: row[1] || '', // Column B
        contact: row[2] || '', // Column C
        email: row[3] || '', // Column D
        phone: row[4] || '', // Column E
        address: row[5] || '', // Column F
        notes: row[6] || '' // Column G
      };
    } catch (e) {
      Logger.log(`Error parsing supplier row index ${index + 2}: ${e.message}. Data: ${JSON.stringify(row)}`);
      return null;
    }
  }).filter(s => s !== null); // Filter out null results
}


function parseProjects(data) {
  if (!Array.isArray(data)) return [];
  const projects = data.map((row, index) => {
    try {
      if (!row || row[0] === undefined || row[0] === null || row[0] === '') return null; // Check ID validity
      // Assuming structure: A=ID, B=Code, C=Name, D=Status, E=Desc, F=Start, G=End, H=Customer, I=Notes, J=LastUpdate
      // Helper function to format date as YYYY-MM-DD or return null
      const formatDate = (dateValue) => {
        if (dateValue && !isNaN(new Date(dateValue).getTime())) {
          // Adjust for timezone offset before formatting
          const dt = new Date(dateValue);
          dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
          return dt.toISOString().split('T')[0];
        }
        return null;
      };

      return {
        id: row[0], // Column A
        projectCode: row[1] || '', // Column B
        projectName: row[2] || '', // Column C
        status: row[3] || 'In Progress', // Column D
        description: row[4] || '', // Column E
        startDate: formatDate(row[5]), // Column F
        endDate: formatDate(row[6]), // Column G
        customer: row[7] || '', // Column H
        notes: row[8] || '', // Column I
        lastUpdate: row[9] && !isNaN(new Date(row[9]).getTime()) ? new Date(row[9]).toISOString() : null // Column J
      };
    } catch (e) {
      Logger.log(`Error parsing project row index ${index + 2}: ${e.message}. Data: ${JSON.stringify(row)}`);
      return null;
    }
  });
  return projects.filter(p => p !== null); // Filter out null results
}


function getNextId(sheet) {
  if (!sheet) {
    Logger.log("getNextId called with invalid sheet object.");
    return NaN; // Return NaN to indicate failure
  }
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return 1; // Start with 1 if sheet is empty (no header assumed here, adjust if header always exists)

    // If sheet might only have a header, lastRow could be 1.
    if (lastRow === 1 && sheet.getRange(1, 1).getValue() !== "") { // Check if row 1 seems like a header
      // If it seems like a header and it's the only row, the next ID is 1.
      // If it doesn't seem like a header, proceed to read it.
      // This logic is tricky without knowing if a header is guaranteed. Assuming header is row 1.
      if (sheet.getName() === "Products" || sheet.getName() === "Transactions" || sheet.getName() === "Projects" || sheet.getName() === "Suppliers" || sheet.getName() === "Users") {
        // These sheets likely have headers
        if (lastRow === 1) return 1;
      }
    }


    // Get value from the first column of the last row
    const lastIdRaw = sheet.getRange(lastRow, 1).getValue();
    const lastId = Number(lastIdRaw); // Attempt to convert to number

    // If lastId is not a number OR it's <= 0, use lastRow as a fallback (less reliable but better than NaN)
    // This handles cases where ID column might have text or is empty in the last row.
    if (isNaN(lastId) || lastId <= 0) {
      Logger.log(`getNextId for sheet '${sheet.getName()}': Last value in column A ('${lastIdRaw}') is not a valid positive ID. Falling back to using lastRow (${lastRow}).`);
      // If lastRow is 1 (likely header), return 1. Otherwise return lastRow.
      return lastRow <= 1 ? 1 : lastRow; // Potentially problematic if rows were deleted.
      // A more robust approach might be to scan downwards from row 2 to find the max ID.
    }
    // Otherwise, increment the last valid numeric ID
    return lastId + 1;
  } catch (e) {
    Logger.log(`Error in getNextId for sheet '${sheet.getName()}': ${e.message}`);
    return NaN; // Return NaN on error
  }
}


function findRowById(sheet, id) {
  if (!sheet || id === undefined || id === null) return -1; // Basic validation
  try {
    const ids = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues().flat();
    // Convert both sheet ID and target ID to strings for robust comparison
    const targetIdStr = String(id).trim();
    const rowIndex = ids.findIndex(rowId => String(rowId).trim() === targetIdStr);
    // findIndex returns -1 if not found, otherwise 0-based index. Convert to 1-based row number.
    return rowIndex !== -1 ? rowIndex + 1 : -1;
  } catch (e) {
    Logger.log(`Error in findRowById for sheet '${sheet.getName()}', ID '${id}': ${e.message}`);
    return -1; // Return -1 on error
  }
}


function getProductCategories(products) {
  if (!Array.isArray(products)) return [];
  // Use Set for efficient unique values, filter out falsy values (empty strings, null), then sort
  const categories = [...new Set(products.map(p => p.category))].filter(Boolean).sort();
  return categories;
}

// =================================================================
// --- LOGGING ---
// =================================================================
function logUserAction(action, details) {
  try {
    if (!auditLogSheet) {
      Logger.log("AuditLog sheet not found. Action was not logged.");
      return;
    }
    const user = getUserInfo(); // Get current user info
    const userEmail = user ? user.email : (Session.getActiveUser() ? Session.getActiveUser().getEmail() : 'System/Unknown'); // Fallback email
    // Assuming structure: Action(A), Details(B), User(C), Timestamp(D)
    auditLogSheet.appendRow([action || 'Unknown Action', details || '', userEmail, new Date()]);
  } catch (e) {
    Logger.log(`Failed to log action: ${action}. Error: ${e.message}`);
  }
}


function getAuditLogs() {
  // Only allow admins to view audit logs
  const currentUser = getUserInfo();
  if (!currentUser || currentUser.role !== 'admin') {
    Logger.log(`Unauthorized attempt to access audit logs by ${currentUser ? currentUser.email : 'unknown user'}.`);
    return JSON.stringify([]); // Return empty array if not admin
  }

  try {
    if (!auditLogSheet || auditLogSheet.getLastRow() < 2) {
      return JSON.stringify([]); // No logs or only header
    }
    // Get all log data excluding the header row
    const data = auditLogSheet.getRange(2, 1, auditLogSheet.getLastRow() - 1, 4).getValues();
    // Reverse array to show newest logs first on the frontend
    const reversedData = data.reverse();
    // Map data to structured objects
    const logs = reversedData.map(row => ({
      action: row[0] || '', // Column A
      details: row[1] || '', // Column B
      user: row[2] || '', // Column C
      timestamp: row[3] && !isNaN(new Date(row[3]).getTime()) ? new Date(row[3]).toISOString() : null // Column D
    }));
    return JSON.stringify(logs);
  } catch (e) {
    Logger.log(`Error fetching audit logs: ${e.message}`);
    return JSON.stringify([]); // Return empty array on error
  }
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Inventory System')
    .addItem('Allow Access', 'allowAccess')
    .addToUi();
}

function allowAccess() {
  let users = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  let emails = users.getRange(2, 1, users.getLastRow() - 1, 1).getValues().flat();
  DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).addEditors(emails);
  SpreadsheetApp.getUi().alert('Access granted to all users in the Users sheet.');
}