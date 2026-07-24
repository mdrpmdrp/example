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
      "Barcode",
      "ProductName",
      "Category",
      "Cost",
      "RetailPrice",
      "Stock",
      "MinStock",
      "MaxStock",
      "Status",
      "Created",
      "Updated"
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
      "Created"
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
      "Qty",
      "Price",
      "Cost",
      "Amount"
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
      "PROD001", "885100000001", "Classic Cotton T-Shirt", "เสื้อผ้า",
      180, 350, 120, 20, 500, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD002", "885100000002", "Slim Fit Jeans", "เสื้อผ้า",
      550, 990, 80, 10, 200, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD003", "885100000003", "Oversized Hoodie", "เสื้อผ้า",
      650, 1190, 60, 10, 150, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD004", "885100000004", "Floral Maxi Dress", "เสื้อผ้า",
      750, 1490, 45, 5, 100, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD005", "885100000005", "Leather Handbag", "กระเป๋า",
      980, 1890, 35, 5, 80, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD006", "885100000006", "Canvas Backpack", "กระเป๋า",
      720, 1390, 40, 5, 100, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD007", "885100000007", "Stainless Steel Watch", "นาฬิกา",
      1500, 2990, 30, 5, 60, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD008", "885100000008", "Silver Necklace", "เครื่องประดับ",
      420, 890, 100, 10, 300, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD009", "885100000009", "Pearl Earrings", "เครื่องประดับ",
      250, 590, 150, 20, 400, "ACTIVE", new Date(), new Date()
    ],
    [
      "PROD010", "885100000010", "Fashion Ring", "เครื่องประดับ",
      120, 290, 200, 20, 500, "ACTIVE", new Date(), new Date()

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
    [1, "AGT001", "PROD001", 1, 10, 175, new Date()],
    [2, "AGT001", "PROD001", 11, 999999, 165, new Date()],

    // PROD002
    [3, "AGT001", "PROD002", 1, 5, 1180, new Date()],
    [4, "AGT001", "PROD002", 6, 999999, 1120, new Date()],

    // PROD003
    [5, "AGT002", "PROD003", 1, 10, 830, new Date()],
    [6, "AGT002", "PROD003", 11, 999999, 790, new Date()],

    // PROD004
    [7, "AGT003", "PROD004", 1, 2, 34500, new Date()],
    [8, "AGT003", "PROD004", 3, 999999, 33000, new Date()],

    // PROD005
    [9, "AGT004", "PROD005", 1, 2, 31500, new Date()],
    [10, "AGT004", "PROD005", 3, 999999, 30000, new Date()],

    // PROD006
    [11, "AGT005", "PROD006", 1, 20, 820, new Date()],
    [12, "AGT005", "PROD006", 21, 999999, 780, new Date()]
  ]);

  // ==========================
  // ORDERS
  // ==========================
  const orders = ss.getSheetByName(SHEETS.ORDERS);
  orders.getRange(2, 1, 1, 10).setValues([
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
      new Date()
    ]
  ]);

  // ==========================
  // ORDER ITEMS
  // ==========================
  const items = ss.getSheetByName(SHEETS.ORDER_ITEMS);
  items.getRange(2, 1, 2, 7).setValues([
    [
      1,
      "ORD000001",
      "PROD001",
      5,
      180,
      120,
      900
    ],

    [
      2,
      "ORD000001",
      "PROD002",
      3,
      920,
      850,
      2760
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
