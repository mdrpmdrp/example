function getDashboard() {
  return withConsoleTiming_('server:getDashboard', function () {
    var orders = getOrders().filter(function(order) { return order.Status !== 'CANCELLED'; });
    var totals = orders.reduce(function(result, order) {
      var discountAmount = Number(order.DiscountAmount) || 0;
      var subtotalAmount = Number(order.SubtotalAmount);
      if (!Number.isFinite(subtotalAmount)) {
        subtotalAmount = (Number(order.TotalAmount) || 0) - (Number(order.ShippingAmount) || 0) + discountAmount;
      }
      result.sales += Number(order.TotalAmount) || 0;
      result.cost += Number(order.TotalCost) || 0;
      result.profit += calculateOrderProfitAmount_(subtotalAmount, Number(order.TotalCost) || 0, discountAmount);
      result.quantity += Number(order.TotalQty) || 0;
      return result;
    }, { sales: 0, cost: 0, profit: 0, quantity: 0 });
    totals.orderCount = orders.length;
    totals.lowStockCount = getLowStockProducts().length;
    return totals;
  });
}

function getDashboardData(sessionToken) {
  return withConsoleTiming_('server:getDashboardData', function () {
    var user = requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
    var dashboard = getDashboard();
    if (user.role !== 'OWNER') { dashboard.cost = null; dashboard.profit = null; }
    return dashboard;
  });
}
