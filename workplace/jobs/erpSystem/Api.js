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

function buildOrdersPayload_(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var canViewCost = user.role === 'OWNER';
  var agentById = getAgents().reduce(function(map, agent) {
    map[agent.AgentID] = agent.AgentName;
    return map;
  }, {});
  return getOrders().filter(function(order) {
    return String(order.Status).toUpperCase() !== 'CANCELLED';
  }).map(function(order) {
    var orderDate = order.OrderDate || order.Created || new Date();
    var tz = Session.getScriptTimeZone();
    return {
      orderId: order.OrderID,
      orderDateKey: Utilities.formatDate(orderDate, tz, 'yyyy-MM-dd'),
      orderDateLabel: Utilities.formatDate(orderDate, tz, 'dd/MM/yyyy'),
      orderTimeLabel: Utilities.formatDate(orderDate, tz, 'HH:mm'),
      agent: agentById[order.AgentID] || order.AgentID,
      totalQty: Number(order.TotalQty),
      subtotalAmount: Number(order.SubtotalAmount || order.TotalAmount),
      shippingType: String(order.ShippingType || 'NONE'),
      shippingAmount: Number(order.ShippingAmount || 0),
      discountAmount: Number(order.DiscountAmount || 0),
      totalAmount: Number(order.TotalAmount),
      customerName: String(order.CustomerName || ''),
      customerAddress: String(order.CustomerAddress || ''),
      customerPhone: String(order.CustomerPhone || ''),
      totalCost: canViewCost ? Number(order.TotalCost) : null,
      items: order.Items.map(function(item) {
        var product = getProductById(item.ProductID);
        return {
          isNonStock: !product,
          productId: item.ProductID,
          productName: item.ProductName,
          selectedUnit: String(item.SelectedUnit || '__base__'),
          qty: Number(item.Qty),
          unitPrice: Number(item.UnitPrice || item.Price),
          cost: canViewCost ? Number(item.Cost) : null,
          total: Number(item.TotalPrice || item.Amount)
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
    orders: buildOrdersPayload_(sessionToken),
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

function listOrders(sessionToken) {
  return buildOrdersPayload_(sessionToken);
}
