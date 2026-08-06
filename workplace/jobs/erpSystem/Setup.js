function createSheet(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(name);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#1565C0")
    .setFontColor("white");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function setupDatabase() {

  createProducts();
  createAgents();
  createAgentRates();
  createAgentGroupRates();
  createOrders();
  createOrderItems();
  createBackupOrders();
  createBackupOrderItems();
  createStockMovement();
  createUsers();
  createConfig();

  insertDemoData();
  installMonthlyOrderBackupTrigger();

  SpreadsheetApp.getUi().alert("Database Created Successfully");

}

function applyAgentGroupDropdown_(sheet) {
  if (!sheet) return;
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(AGENT_GROUP_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 3, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
}

function createProducts() {
  createSheet(
    SHEETS.PRODUCTS,
    [
      "ProductID",
      "ProductName",
      "Category",
      "Cost",
      "RetailPrice",
      "Stock",
      "MinStock",
      "Status",
      "Created",
      "Updated",
      "BaseUnit",
      "PackUnits"
    ]
  );
}

function createAgents() {
  var sheet = createSheet(
    SHEETS.AGENTS,
    [
      "AgentID",
      "AgentName",
      "AgentGroup",
      "Phone",
      "Address",
      "Status",
      "Created"
    ]
  );
  applyAgentGroupDropdown_(sheet);
}

function createAgentRates() {

  createSheet(
    SHEETS.AGENT_RATES,
    [
      "RateID",
      "AgentID",
      "ProductID",
      "MinQty",
      "MaxQty",
      "SellPrice",
      "Created"
    ]
  );

}

function createAgentGroupRates() {

  createSheet(
    SHEETS.AGENT_GROUP_RATES,
    [
      "RateID",
      "AgentGroup",
      "ProductID",
      "MinQty",
      "MaxQty",
      "SellPrice",
      "Created"
    ]
  );

}

function createOrders() {

  createSheet(
    SHEETS.ORDERS,
    [
      "OrderID",
      "OrderDate",
      "AgentID",
      "TotalQty",
      "TotalAmount",
      "TotalCost",
      "Profit",
      "Status",
      "CreatedBy",
      "Created",
      "CustomerName",
      "CustomerAddress",
      "CustomerPhone",
      "ShippingType",
      "ShippingAmount",
      "DiscountAmount",
      "SubtotalAmount",
      "NetAmount",
      "CancelledAt",
      "CancelledBy"
    ]
  );

}

function createOrderItems() {

  createSheet(
    SHEETS.ORDER_ITEMS,
    [
      "ItemID",
      "OrderID",
      "ProductID",
      "Unit",
      "Qty",
      "BaseUnitQty",
      "UnitPrice",
      "Cost",
      "TotalPrice"
    ]
  );

}

function createBackupOrders() {
  createSheet(
    SHEETS.BACKUP_ORDERS,
    [
      "OrderID",
      "OrderDate",
      "AgentID",
      "TotalQty",
      "TotalAmount",
      "TotalCost",
      "Profit",
      "Status",
      "CreatedBy",
      "Created",
      "CustomerName",
      "CustomerAddress",
      "CustomerPhone",
      "ShippingType",
      "ShippingAmount",
      "DiscountAmount",
      "SubtotalAmount",
      "NetAmount",
      "CancelledAt",
      "CancelledBy"
    ]
  );
}

function createBackupOrderItems() {
  createSheet(
    SHEETS.BACKUP_ORDER_ITEMS,
    [
      "ItemID",
      "OrderID",
      "ProductID",
      "Unit",
      "Qty",
      "BaseUnitQty",
      "UnitPrice",
      "Cost",
      "TotalPrice"
    ]
  );
}

function createStockMovement() {

  createSheet(
    SHEETS.STOCK_MOVEMENT,
    [
      "TransactionID",
      "Date",
      "ProductID",
      "Type",
      "Qty",
      "Balance",
      "Reference",
      "Remark"
    ]
  );

}

function createUsers() {

  createSheet(
    SHEETS.USERS,
    [
      "UserID",
      "Username",
      "Password",
      "FullName",
      "Role",
      "Status",
      "Created"
    ]
  );

}

function createConfig() {

  createSheet(
    SHEETS.CONFIG,
    [
      "Key",
      "Value"
    ]
  );

}

function migrateAgentsSchema() {
  var sheet = getSheet(SHEETS.AGENTS);
  if (!sheet) throw new Error('AGENTS sheet not found');

  var headers = [
    "AgentID",
    "AgentName",
    "AgentGroup",
    "Phone",
    "Address",
    "Status",
    "Created"
  ];
  var lastRow = sheet.getLastRow();
  var dataRows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, Math.max(sheet.getLastColumn(), 6)).getValues() : [];
  var migratedRows = dataRows.map(function (row) {
    return [
      row[0],
      row[1],
      String(row[2] || '').trim() || DEFAULT_AGENT_GROUP,
      row[3],
      row[4],
      row[5],
      row[6] || new Date()
    ];
  });

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight("bold")
    .setBackground("#1565C0")
    .setFontColor("white");

  if (migratedRows.length) {
    sheet.getRange(2, 1, migratedRows.length, headers.length).setValues(migratedRows);
  }

  applyAgentGroupDropdown_(sheet);
  return {
    migratedRows: migratedRows.length,
    defaultGroup: DEFAULT_AGENT_GROUP
  };
}

function insertDemoData() {
  const ss = SpreadsheetApp.getActive();

  // ==========================
  // CONFIG
  // ==========================
  const config = ss.getSheetByName(SHEETS.CONFIG);
  config.getRange(2, 1, 6, 2).setValues([
    ["COMPANY_NAME", "My ERP System"],
    ["ORDER_PREFIX", "ORD"],
    ["PRODUCT_PREFIX", "PROD"],
    ["AGENT_PREFIX", "AG"],
    ["DEFAULT_CURRENCY", "THB"],
    ["VERSION", "1.0.0"]
  ]);


  // ==========================
  // USERS
  // ==========================
  const users = ss.getSheetByName(SHEETS.USERS);
  users.getRange(2, 1, 3, 7).setValues([
    [
      1,
      "owner",
      "1234",
      "System Owner",
      "OWNER",
      "ACTIVE",
      new Date()
    ],
    [
      2,
      "admin",
      "1234",
      "Administrator",
      "ADMIN",
      "ACTIVE",
      new Date()
    ],
    [
      3,
      "sales",
      "1234",
      "Sales Representative",
      "SALES",
      "ACTIVE",
      new Date()
    ]
  ]);

  // ==========================
  // PRODUCTS
  // ==========================
  const products = ss.getSheetByName(SHEETS.PRODUCTS);
  products.getRange(2, 1, 10, 12).setValues([
    [
      "PROD001", "Botox A", "botox",
      2800, 4500, 40, 5, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "กล่อง", packSize: 6 }, { unit: "แพคคู่", packSize: 2 }])
    ],
    [
      "PROD002", "Botox B", "botox",
      2400, 3900, 35, 5, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "กล่อง", packSize: 12 }])
    ],
    [
      "PROD003", "Filler HA 1cc", "filler",
      3200, 5500, 28, 4, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "กล่องเล็ก", packSize: 6 }, { unit: "กล่องใหญ่", packSize: 12 }])
    ],
    [
      "PROD004", "Vitamin Glow Shot", "วิตามินผิว",
      650, 1200, 90, 10, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "แพค", packSize: 10 }])
    ],
    [
      "PROD005", "Skin Booster C", "หน้าใส",
      900, 1600, 60, 8, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "แพคคู่", packSize: 2 }, { unit: "กล่อง", packSize: 12 }])
    ],
    [
      "PROD006", "PDO Thread 4D", "ร้อยไหม",
      1800, 3200, 150, 20, "ACTIVE", new Date(), new Date(), "เส้น", JSON.stringify([{ unit: "มัด", packSize: 10 }])
    ],
    [
      "PROD007", "Fat Burner Mix", "fat",
      2200, 3800, 50, 5, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "กล่อง", packSize: 6 }])
    ],
    [
      "PROD008", "White Glow Pack", "หน้าใส",
      1200, 2200, 45, 5, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "แพค", packSize: 4 }, { unit: "กล่องเล็ก", packSize: 8 }])
    ],
    [
      "PROD009", "Vit C Duo", "วิตามินผิว",
      700, 1300, 75, 10, "ACTIVE", new Date(), new Date(), "ขวด", JSON.stringify([{ unit: "คู่", packSize: 2 }])
    ],
    [
      "PROD010", "Clinic Support Kit", "อื่นๆ",
      400, 800, 25, 3, "ACTIVE", new Date(), new Date(), "ชิ้น", JSON.stringify([{ unit: "แพค", packSize: 5 }])

    ]
  ]);

  // ==========================
  // AGENTS
  // ==========================
  const agents = ss.getSheetByName(SHEETS.AGENTS);
  agents.getRange(2, 1, 5, 7).setValues([
    [
      "AG001", "Agent Bangkok", "VIP รวมส่ง",
      "0811111111",
      "Bangkok",
      "ACTIVE",
      new Date()
    ],
    [
      "AG002", "Agent Chiang Mai", "VIP รวมส่ง",
      "0822222222",
      "Chiang Mai",
      "ACTIVE",
      new Date()
    ],
    [
      "AG003", "Agent Khon Kaen", "VIP รวมส่ง",
      "0833333333",
      "Khon Kaen",
      "ACTIVE",
      new Date()
    ],
    [
      "AG004", "Agent Phuket", "VIP รวมส่ง",
      "0844444444",
      "Phuket",
      "ACTIVE",
      new Date()
    ],
    [
      "AG005", "Agent Hat Yai", "VIP รวมส่ง",
      "0855555555",
      "Songkhla",
      "ACTIVE",
      new Date()
    ]
  ]);

  // ==========================
  // AGENT RATES
  // ==========================
  const rates = ss.getSheetByName(SHEETS.AGENT_RATES);
  rates.getRange(2, 1, 12, 7).setValues([
    // PROD001
    [1, "AG001", "PROD001", 1, 5, 4200, new Date()],
    [2, "AG001", "PROD001", 6, 999999, 3950, new Date()],

    // PROD002
    [3, "AG001", "PROD002", 1, 5, 3650, new Date()],
    [4, "AG001", "PROD002", 6, 999999, 3400, new Date()],

    // PROD003
    [5, "AG002", "PROD003", 1, 5, 5300, new Date()],
    [6, "AG002", "PROD003", 6, 999999, 5000, new Date()],

    // PROD004
    [7, "AG003", "PROD004", 1, 10, 1150, new Date()],
    [8, "AG003", "PROD004", 11, 999999, 1100, new Date()],

    // PROD005
    [9, "AG004", "PROD005", 1, 10, 1500, new Date()],
    [10, "AG004", "PROD005", 11, 999999, 1400, new Date()],

    // PROD006
    [11, "AG005", "PROD006", 1, 20, 3000, new Date()],
    [12, "AG005", "PROD006", 21, 999999, 2800, new Date()]
  ]);

  // ==========================
  // AGENT GROUP RATES
  // ==========================
  const groupRates = ss.getSheetByName(SHEETS.AGENT_GROUP_RATES);
  groupRates.getRange(2, 1, 6, 7).setValues([
    ["GRATE001", "VIP รวมส่ง", "PROD001", 1, 5, 4300, new Date()],
    ["GRATE002", "VIP รวมส่ง", "PROD001", 6, 999999, 4050, new Date()],
    ["GRATE003", "VIP", "PROD004", 1, 10, 1180, new Date()],
    ["GRATE004", "VIP", "PROD004", 11, 999999, 1120, new Date()],
    ["GRATE005", "เรทคลินิก", "PROD003", 1, 5, 5200, new Date()],
    ["GRATE006", "เรทคลินิก", "PROD003", 6, 999999, 4950, new Date()]
  ]);

  // ==========================
  // ORDERS
  // ==========================
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  orders.getRange(2, 1, 3, 18).setValues([
    [
      "ORD26072801",
      new Date(2026, 6, 28, 10, 15, 0),
      "AG001",
      3,
      10200,
      6250,
      3950,
      "COMPLETED",
      "owner",
      new Date(2026, 6, 28, 10, 15, 0),
      "คลินิก A",
      "กรุงเทพฯ",
      "0810000001",
      "NONE",
      0,
      0,
      10200,
      10200
    ],
    [
      "ORD26072701",
      new Date(2026, 6, 27, 14, 20, 0),
      "AG002",
      3,
      8700,
      5000,
      3700,
      "COMPLETED",
      "admin",
      new Date(2026, 6, 27, 14, 20, 0),
      "คลินิก B",
      "เชียงใหม่",
      "0820000002",
      "PARCEL",
      60,
      0,
      8640,
      8700
    ],
    [
      "ORD26071801",
      new Date(2026, 6, 18, 9, 45, 0),
      "AG003",
      5,
      11200,
      6200,
      5000,
      "COMPLETED",
      "sales",
      new Date(2026, 6, 18, 9, 45, 0),
      "คลินิก C",
      "ขอนแก่น",
      "0830000003",
      "VAN",
      350,
      0,
      10850,
      11200
    ]
  ]);

  // ==========================
  // ORDER ITEMS
  // ==========================
  const items = ss.getSheetByName(SHEETS.ORDER_ITEMS);
  items.getRange(2, 1, 6, 9).setValues([
    [1, "ORD26072801", "PROD001", "__base__", 2, 2, 4500, 5600, 9000],
    [2, "ORD26072801", "PROD004", "__base__", 1, 1, 1200, 650, 1200],
    [3, "ORD26072701", "PROD003", "__base__", 1, 1, 5500, 3200, 5500],
    [4, "ORD26072701", "PROD005", "__base__", 2, 2, 1600, 1800, 3200],
    [5, "ORD26071801", "PROD006", "__base__", 3, 3, 3200, 5400, 9600],
    [6, "ORD26071801", "PROD009", "__base__", 0, 0, 0, 0, 0]
  ]);

  // ==========================
  // BACKUP ORDERS
  // ==========================
  const backupOrders = ss.getSheetByName(SHEETS.BACKUP_ORDERS);
  backupOrders.getRange(2, 1, 3, 18).setValues([
    [
      "ORD26062101",
      new Date(2026, 5, 21, 11, 5, 0),
      "AG004",
      3,
      6400,
      3600,
      2800,
      "COMPLETED",
      "owner",
      new Date(2026, 5, 21, 11, 5, 0),
      "คลินิก D",
      "ภูเก็ต",
      "0840000004",
      "MESSENGER",
      120,
      0,
      6280,
      6400
    ],
    [
      "ORD26031201",
      new Date(2026, 2, 12, 13, 30, 0),
      "AG005",
      3,
      8600,
      5200,
      3400,
      "COMPLETED",
      "admin",
      new Date(2026, 2, 12, 13, 30, 0),
      "คลินิก E",
      "สงขลา",
      "0850000005",
      "CHILLED",
      150,
      0,
      8450,
      8600
    ],
    [
      "ORD25110501",
      new Date(2025, 10, 5, 16, 10, 0),
      "AG001",
      6,
      8200,
      4450,
      3750,
      "COMPLETED",
      "sales",
      new Date(2025, 10, 5, 16, 10, 0),
      "คลินิก F",
      "กรุงเทพฯ",
      "0810000006",
      "NONE",
      0,
      0,
      8200,
      8200
    ]
  ]);

  // ==========================
  // BACKUP ORDER ITEMS
  // ==========================
  const backupItems = ss.getSheetByName(SHEETS.BACKUP_ORDER_ITEMS);
  backupItems.getRange(2, 1, 6, 9).setValues([
    [101, "ORD26062101", "PROD007", "__base__", 1, 1, 3800, 2200, 3800],
    [102, "ORD26062101", "PROD009", "__base__", 2, 2, 1300, 1400, 2600],
    [103, "ORD26031201", "PROD002", "__base__", 2, 2, 3900, 4800, 7800],
    [104, "ORD26031201", "PROD010", "__base__", 1, 1, 800, 400, 800],
    [105, "ORD25110501", "PROD008", "__base__", 1, 1, 2200, 1200, 2200],
    [106, "ORD25110501", "PROD004", "__base__", 5, 5, 1200, 3250, 6000]
  ]);


  // ==========================
  // STOCK MOVEMENT
  // ==========================
  const stock = ss.getSheetByName(SHEETS.STOCK_MOVEMENT);
  stock.getRange(2, 1, 6, 8).setValues([
    [1, new Date(2026, 6, 28, 10, 15, 0), "PROD001", "OUT", 2, 38, "ORD26072801", "Demo Order"],
    [2, new Date(2026, 6, 28, 10, 15, 0), "PROD004", "OUT", 1, 89, "ORD26072801", "Demo Order"],
    [3, new Date(2026, 6, 27, 14, 20, 0), "PROD003", "OUT", 1, 27, "ORD26072701", "Demo Order"],
    [4, new Date(2026, 6, 27, 14, 20, 0), "PROD005", "OUT", 2, 58, "ORD26072701", "Demo Order"],
    [5, new Date(2026, 6, 18, 9, 45, 0), "PROD006", "OUT", 3, 147, "ORD26071801", "Demo Order"],
    [6, new Date(2026, 6, 18, 9, 45, 0), "PROD010", "OUT", 2, 23, "ORD26071801", "Demo Order"]
  ]);
  SpreadsheetApp.flush();
}

