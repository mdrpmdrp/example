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
  createOrders();
  createOrderItems();
  createStockMovement();
  createUsers();
  createConfig();
  createBilling();

  insertDemoData();

  SpreadsheetApp.getUi().alert("Database Created Successfully");

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
  createSheet(
    SHEETS.AGENTS,
    [
      "AgentID",
      "AgentName",
      "Phone",
      "Address",
      "Status",
      "Created"
    ]
  );
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
      "NetAmount"
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

function createBilling() {
  createSheet(
    SHEETS.BILLING,
    ["InvoiceID", "InvoiceDate", "OrderID", "AgentID", "Amount", "Status", "CreatedBy", "Created"]
  );
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
    ["AGENT_PREFIX", "AGT"],
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
  agents.getRange(2, 1, 5, 6).setValues([
    [
      "AGT001", "Agent Bangkok",
      "0811111111",
      "Bangkok",
      "ACTIVE",
      new Date()
    ],
    [
      "AGT002", "Agent Chiang Mai",
      "0822222222",
      "Chiang Mai",
      "ACTIVE",
      new Date()
    ],
    [
      "AGT003", "Agent Khon Kaen",
      "0833333333",
      "Khon Kaen",
      "ACTIVE",
      new Date()
    ],
    [
      "AGT004", "Agent Phuket",
      "0844444444",
      "Phuket",
      "ACTIVE",
      new Date()
    ],
    [
      "AGT005", "Agent Hat Yai",
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
    [1, "AGT001", "PROD001", 1, 5, 4200, new Date()],
    [2, "AGT001", "PROD001", 6, 999999, 3950, new Date()],

    // PROD002
    [3, "AGT001", "PROD002", 1, 5, 3650, new Date()],
    [4, "AGT001", "PROD002", 6, 999999, 3400, new Date()],

    // PROD003
    [5, "AGT002", "PROD003", 1, 5, 5300, new Date()],
    [6, "AGT002", "PROD003", 6, 999999, 5000, new Date()],

    // PROD004
    [7, "AGT003", "PROD004", 1, 10, 1150, new Date()],
    [8, "AGT003", "PROD004", 11, 999999, 1100, new Date()],

    // PROD005
    [9, "AGT004", "PROD005", 1, 10, 1500, new Date()],
    [10, "AGT004", "PROD005", 11, 999999, 1400, new Date()],

    // PROD006
    [11, "AGT005", "PROD006", 1, 20, 3000, new Date()],
    [12, "AGT005", "PROD006", 21, 999999, 2800, new Date()]
  ]);

  // ==========================
  // ORDERS
  // ==========================
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  orders.getRange(2, 1, 1, 18).setValues([
    [
      "ORD000001",
      new Date(),
      "AGT001",
      8,
      3660,
      2700,
      960,
      "COMPLETED",
      "owner",
      new Date(),
      "",
      "",
      "",
      "NONE",
      0,
      0,
      3660,
      3660
    ]
  ]);

  // ==========================
  // ORDER ITEMS
  // ==========================
  const items = ss.getSheetByName(SHEETS.ORDER_ITEMS);
  items.getRange(2, 1, 2, 9).setValues([
    [
      1,
      "ORD000001",
      "PROD001",
      "__base__",
      2,
      2,
      4500,
      2800,
      9000
    ],

    [
      2,
      "ORD000001",
      "PROD004",
      "__base__",
      4,
      4,
      1200,
      650,
      4800
    ]
  ]);


  // ==========================
  // STOCK MOVEMENT
  // ==========================
  const stock = ss.getSheetByName(SHEETS.STOCK_MOVEMENT);
  stock.getRange(2, 1, 2, 8).setValues([
    [
      1,
      new Date(),
      "PROD001",
      "OUT",
      5,
      95,
      "ORD000001",
      "Demo Order"
    ],

    [
      2,
      new Date(),
      "PROD002",
      "OUT",
      3,
      42,
      "ORD000001",
      "Demo Order"
    ]
  ]);
  SpreadsheetApp.flush();
}
