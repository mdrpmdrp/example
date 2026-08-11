function buildProductsPayload_(sessionToken) {
  return withConsoleTiming_('server:buildProductsPayload', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var canViewCost = user.role === 'OWNER';
    return getProducts().map(function(product) {
      var baseUnit = String(product.BaseUnit || product.UnitName || '').trim() || 'à¸‚à¸§à¸”';
      var packUnits = Array.isArray(product.PackUnits) ? product.PackUnits : [];
      return {
        id: product.ProductID,
        name: product.ProductName,
        category: String(product.Category || '').trim(),
        cost: canViewCost ? Number(product.Cost) : null,
        defaultPrice: Number(product.RetailPrice),
        stock: Number(product.Stock),
        min: Number(product.MinStock),
        status: String(product.Status || 'ACTIVE').trim() || 'ACTIVE',
        max: null,
        baseUnit: baseUnit,
        unitName: baseUnit,
        packUnits: packUnits,
        packSize: packUnits.length ? Number(packUnits[0].packSize) || 1 : 1
      };
    });
  });
}

function buildAgentsPayload_(sessionToken) {
  return withConsoleTiming_('server:buildAgentsPayload', function () {
    requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var agents = getAgents();
    var timeZone = Session.getScriptTimeZone();
    var agentRateRows = getData(SHEETS.AGENT_RATES);
    var agentGroupRateRows = getData(SHEETS.AGENT_GROUP_RATES);
    var agentById = {};
    agents.forEach(function (agent) {
      agentById[String(agent.AgentID || '').trim()] = agent;
    });
    var clientAgentRecords = agents.map(function (agent) {
      var created = agent && agent.Created;
      var createdText = '';
      if (created instanceof Date && !isNaN(created.getTime())) {
        createdText = Utilities.formatDate(created, timeZone, "yyyy-MM-dd'T'HH:mm:ssXXX");
      } else {
        createdText = String(created || '').trim();
      }
      return {
        AgentID: String(agent && agent.AgentID || '').trim(),
        AgentName: String(agent && agent.AgentName || '').trim(),
        AgentGroup: String(agent && agent.AgentGroup || DEFAULT_AGENT_GROUP).trim() || DEFAULT_AGENT_GROUP,
        Phone: String(agent && agent.Phone || '').trim(),
        Address: String(agent && agent.Address || '').trim(),
        Status: String(agent && agent.Status || 'ACTIVE').trim() || 'ACTIVE',
        Created: createdText
      };
    });
    var agentNames = agents.map(function(agent) { return agent.AgentName; });
    var agentIdsByName = agents.reduce(function(map, agent) {
      map[agent.AgentName] = agent.AgentID;
      return map;
    }, {});
    var agentGroupsByName = agents.reduce(function(map, agent) {
      map[agent.AgentName] = agent.AgentGroup || DEFAULT_AGENT_GROUP;
      return map;
    }, {});
    var agentRates = {};
    agentRateRows.forEach(function (row) {
      var agent = agentById[String(row[1] || '').trim()];
      if (!agent) return;
      var agentName = String(agent.AgentName || '').trim();
      if (!agentName) return;
      var productKey = String(row[2] || '').trim();
      (agentRates[agentName] || (agentRates[agentName] = {}));
      (agentRates[agentName][productKey] || (agentRates[agentName][productKey] = [])).push({
        min: Number(row[3]),
        max: Number(row[4]),
        price: Number(row[5])
      });
    });
    var agentGroupRates = {};
    AGENT_GROUP_OPTIONS.forEach(function (groupName) {
      agentGroupRates[groupName] = {};
    });
    agentGroupRateRows.forEach(function (row) {
      var groupName = String(row[1] || '').trim();
      var productKey = String(row[2] || '').trim();
      if (!groupName || !productKey) return;
      (agentGroupRates[groupName] || (agentGroupRates[groupName] = {}));
      (agentGroupRates[groupName][productKey] || (agentGroupRates[groupName][productKey] = [])).push({
        min: Number(row[3]),
        max: Number(row[4]),
        price: Number(row[5])
      });
    });
    return {
      agents: agentNames,
      agentRecords: clientAgentRecords,
      agentIdsByName: agentIdsByName,
      agentGroupsByName: agentGroupsByName,
      agentGroupOptions: AGENT_GROUP_OPTIONS.slice(),
      defaultAgentGroup: DEFAULT_AGENT_GROUP,
      agentGroupRates: agentGroupRates,
      agentRates: agentRates
    };
  });
}

function buildOrdersPayload_(sessionToken, monthKey) {
  return withConsoleTiming_('server:buildOrdersPayload', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var canViewCost = user.role === 'OWNER';
    var rows = getOrderRowsForMonth_(monthKey);
    var indexes = buildOrderIndexes_(rows);
    var productsById = indexes.productsById || {};
    return buildOrderPayloadFromRows_(rows, canViewCost, indexes).map(function(order) {
      return {
        orderId: order.orderId,
        createdAt: order.createdAt,
        orderDateKey: order.orderDateKey,
        orderDateLabel: order.orderDateLabel,
        orderTimeLabel: order.orderTimeLabel,
        status: order.status,
        cancelledAt: order.cancelledAt,
        cancelledBy: order.cancelledBy,
        agent: order.agent,
        totalQty: Number(order.totalQty),
        subtotalAmount: Number(order.subtotalAmount),
        shippingType: String(order.shippingType || 'NONE'),
        shippingAmount: Number(order.shippingAmount || 0),
        discountAmount: Number(order.discountAmount || 0),
        totalAmount: Number(order.totalAmount),
        customerName: String(order.customerName || ''),
        customerAddress: String(order.customerAddress || ''),
        customerPhone: String(order.customerPhone || ''),
        totalCost: canViewCost ? Number(order.totalCost) : null,
        items: order.items.map(function(item) {
          var product = productsById[item.productId];
          return {
            isNonStock: !product,
            productId: item.productId,
            productName: item.productName,
            selectedUnit: String(item.selectedUnit || '__base__'),
            qty: Number(item.qty),
            unitPrice: Number(item.unitPrice || 0),
            cost: canViewCost ? Number(item.cost) : null,
            total: Number(item.total)
          };
        })
      };
    });
  });
}

function buildDashboardPayload_(sessionToken) {
  return withConsoleTiming_('server:buildDashboardPayload', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var dashboard = getDashboard();
    if (user.role !== 'OWNER') {
      dashboard.cost = null;
      dashboard.profit = null;
    }
    return dashboard;
  });
}

function api(sessionToken) {
  return withConsoleTiming_('server:api', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var agentsBundle = buildAgentsPayload_(sessionToken);
    return {
      products: buildProductsPayload_(sessionToken),
      agents: agentsBundle.agents,
      agentRecords: agentsBundle.agentRecords,
      agentIdsByName: agentsBundle.agentIdsByName,
      agentGroupsByName: agentsBundle.agentGroupsByName,
      agentGroupOptions: agentsBundle.agentGroupOptions,
      defaultAgentGroup: agentsBundle.defaultAgentGroup,
      agentGroupRates: agentsBundle.agentGroupRates,
      agentRates: agentsBundle.agentRates,
      orders: buildOrdersPayload_(sessionToken, getMonthKeyFromDate(new Date())),
      dashboard: buildDashboardPayload_(sessionToken),
      user: user
    };
  });
}

function listProducts(sessionToken) {
  return withConsoleTiming_('server:listProducts', function () {
    return buildProductsPayload_(sessionToken);
  });
}

function getAgentsBundle(sessionToken) {
  return withConsoleTiming_('server:getAgentsBundle', function () {
    return buildAgentsPayload_(sessionToken);
  });
}

function listOrders(sessionToken, monthKey) {
  return withConsoleTiming_('server:listOrders', function () {
    return buildOrdersPayload_(sessionToken, monthKey);
  });
}

function bootstrap(sessionToken, monthKey) {
  return withConsoleTiming_('server:bootstrap', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var agentsBundle = buildAgentsPayload_(sessionToken);
    var normalizedMonthKey = String(monthKey || getMonthKeyFromDate(new Date())).trim() || getMonthKeyFromDate(new Date());
    return {
      products: buildProductsPayload_(sessionToken),
      agents: agentsBundle.agents,
      agentRecords: agentsBundle.agentRecords,
      agentIdsByName: agentsBundle.agentIdsByName,
      agentGroupsByName: agentsBundle.agentGroupsByName,
      agentGroupOptions: agentsBundle.agentGroupOptions,
      defaultAgentGroup: agentsBundle.defaultAgentGroup,
      agentGroupRates: agentsBundle.agentGroupRates,
      agentRates: agentsBundle.agentRates,
      orders: buildOrdersPayload_(sessionToken, normalizedMonthKey),
      user: user
    };
  });
}
