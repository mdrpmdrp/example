function buildProductsPayload_(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var canViewCost = user.role === 'OWNER';
  return getProducts().map(function(product) {
    var baseUnit = String(product.BaseUnit || product.UnitName || '').trim() || 'ขวด';
    var packUnits = Array.isArray(product.PackUnits) ? product.PackUnits : [];
    return {
      id: product.ProductID,
      name: product.ProductName,
      category: String(product.Category || '').trim(),
      cost: canViewCost ? Number(product.Cost) : null,
      defaultPrice: Number(product.RetailPrice),
      stock: Number(product.Stock),
      min: Number(product.MinStock),
      max: null,
      baseUnit: baseUnit,
      unitName: baseUnit,
      packUnits: packUnits,
      packSize: packUnits.length ? Number(packUnits[0].packSize) || 1 : 1
    };
  });
}

function buildAgentsPayload_(sessionToken) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var agents = getAgents();
  var agentNames = agents.map(function(agent) { return agent.AgentName; });
  var agentIdsByName = agents.reduce(function(map, agent) {
    map[agent.AgentName] = agent.AgentID;
    return map;
  }, {});
  var agentRates = {};
  agents.forEach(function(agent) {
    agentRates[agent.AgentName] = {};
    getAgentRates(agent.AgentID).forEach(function(rate) {
      (agentRates[agent.AgentName][rate.ProductID] || (agentRates[agent.AgentName][rate.ProductID] = [])).push({ min: Number(rate.MinQty), max: Number(rate.MaxQty), price: Number(rate.SellPrice) });
    });
  });
  return { agents: agentNames, agentIdsByName: agentIdsByName, agentRates: agentRates };
}

function buildOrdersPayload_(sessionToken, monthKey) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var canViewCost = user.role === 'OWNER';
  var rows = getOrderRowsForMonth_(monthKey);
  rows.items = rows.items.filter(function (item) {
    return rows.orders.some(function (order) { return order[0] === item[1]; });
  });
  return buildOrderPayloadFromRows_(rows, canViewCost).map(function(order) {
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
        var product = getProductById(item.productId);
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
}

function buildDashboardPayload_(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var dashboard = getDashboard();
  if (user.role !== 'OWNER') {
    dashboard.cost = null;
    dashboard.profit = null;
  }
  return dashboard;
}

function api(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var agentsBundle = buildAgentsPayload_(sessionToken);
  return {
    products: buildProductsPayload_(sessionToken),
    agents: agentsBundle.agents,
    agentIdsByName: agentsBundle.agentIdsByName,
    agentRates: agentsBundle.agentRates,
    orders: buildOrdersPayload_(sessionToken, getMonthKeyFromDate(new Date())),
    dashboard: buildDashboardPayload_(sessionToken),
    user: user
  };
}

function listProducts(sessionToken) {
  return buildProductsPayload_(sessionToken);
}

function getAgentsBundle(sessionToken) {
  return buildAgentsPayload_(sessionToken);
}

function listOrders(sessionToken, monthKey) {
  return buildOrdersPayload_(sessionToken, monthKey);
}
