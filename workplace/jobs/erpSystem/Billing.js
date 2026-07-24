/** Invoices are generated only from completed orders, preserving the order total. */
function createInvoice(sessionToken, orderId) {
  const user = requireRole(sessionToken, ['OWNER', 'ADMIN']);
  const order = getOrders().find(function(item) { return item.OrderID === orderId; });
  if (!order || order.Status !== 'COMPLETED') throw new Error('Completed order not found');
  const sheet = ensureBillingSheet_();
  const existing = getData(SHEETS.BILLING).find(function(row) { return row[2] === orderId; });
  if (existing) return invoiceFromRow_(existing);
  const invoiceId = generateId('INV', SHEETS.BILLING);
  const row = [invoiceId, new Date(), orderId, order.AgentID, Number(order.TotalAmount), 'ISSUED', user.username, new Date()];
  sheet.appendRow(row);
  return invoiceFromRow_(row);
}

function listInvoices(sessionToken) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  return getData(SHEETS.BILLING).map(invoiceFromRow_);
}

function ensureBillingSheet_() {
  let sheet = getSheet(SHEETS.BILLING);
  if (!sheet) sheet = createSheet(SHEETS.BILLING, ['InvoiceID', 'InvoiceDate', 'OrderID', 'AgentID', 'Amount', 'Status', 'CreatedBy', 'Created']);
  return sheet;
}

function invoiceFromRow_(row) {
  return { invoiceId: row[0], invoiceDate: row[1], orderId: row[2], agentId: row[3], amount: Number(row[4]), status: row[5], createdBy: row[6], created: row[7] };
}
