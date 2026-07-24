function api(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var canViewCost = user.role === 'OWNER';
  var agents = getAgents();
  var products = getProducts().map(function(product) {
    return { id: product.ProductID, name: product.ProductName, cost: canViewCost ? Number(product.Cost) : null, defaultPrice: Number(product.RetailPrice), stock: Number(product.Stock), min: Number(product.MinStock), max: Number(product.MaxStock) };
  });
  var agentNames = agents.map(function(agent) { return agent.AgentName; });
  var agentIdsByName = agents.reduce(function(map, agent) {
    map[agent.AgentName] = agent.AgentID;
    return map;
  }, {});
  var agentById = agents.reduce(function(map, agent) { map[agent.AgentID] = agent.AgentName; return map; }, {});
  var agentRates = {};
  agents.forEach(function(agent) {
    agentRates[agent.AgentName] = {};
    getAgentRates(agent.AgentID).forEach(function(rate) {
      (agentRates[agent.AgentName][rate.ProductID] || (agentRates[agent.AgentName][rate.ProductID] = [])).push({ min: Number(rate.MinQty), max: Number(rate.MaxQty), price: Number(rate.SellPrice) });
    });
  });
  var orders = getOrders().filter(function(order) {
    return String(order.Status).toUpperCase() !== 'CANCELLED';
  }).map(function(order) {
    return { orderId: order.OrderID, agent: agentById[order.AgentID] || order.AgentID, totalQty: Number(order.TotalQty), totalAmount: Number(order.TotalAmount), totalCost: canViewCost ? Number(order.TotalCost) : null, items: order.Items.map(function(item) { return { isNonStock: false, productId: item.ProductID, productName: item.ProductName, qty: Number(item.Qty), unitPrice: Number(item.Price), cost: canViewCost ? Number(item.Cost) : null, total: Number(item.Amount) }; }) };
  });
  var dashboard = getDashboard();
  if (!canViewCost) {
    dashboard.cost = null;
    dashboard.profit = null;
  }
  return { products: products, agents: agentNames, agentIdsByName: agentIdsByName, agentRates: agentRates, orders: orders, dashboard: dashboard, user: user };
}
