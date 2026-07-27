function getDashboard() {
  var orders = getOrders().filter(function(order) { return order.Status !== 'CANCELLED'; });
  var totals = orders.reduce(function(result, order) {
    result.sales += Number(order.TotalAmount) || 0;
    result.cost += Number(order.TotalCost) || 0;
    result.quantity += Number(order.TotalQty) || 0;
    return result;
  }, { sales: 0, cost: 0, quantity: 0 });
  totals.profit = totals.sales - totals.cost;
  totals.orderCount = orders.length;
  totals.lowStockCount = getLowStockProducts().length;
  return totals;
}

function getDashboardData(sessionToken) {
  var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var dashboard = getDashboard();
  if (user.role !== 'OWNER') { dashboard.cost = null; dashboard.profit = null; }
  return dashboard;
}
