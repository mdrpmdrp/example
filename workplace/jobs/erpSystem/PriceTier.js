/** Volume-based dealer pricing. Only owners and admins may change a tier. */
function listPriceTiers(sessionToken, agentId, productId) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  return getAgentRates(agentId).filter(function(rate) {
    return !productId || rate.ProductID === productId;
  });
}

function savePriceTiers(sessionToken, agentId, productId, tiers) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  if (!getAgentById(agentId)) throw new Error('Agent not found');
  if (!getProductById(productId)) throw new Error('Product not found');
  if (!Array.isArray(tiers) || !tiers.length) throw new Error('At least one price tier is required');

  const normalized = tiers.map(function(tier) {
    return { min: Number(tier.min), max: tier.max === '' || tier.max == null ? 999999 : Number(tier.max), price: Number(tier.price) };
  }).sort(function(a, b) { return a.min - b.min; });
  normalized.forEach(function(tier, index) {
    if (!Number.isInteger(tier.min) || !Number.isInteger(tier.max) || tier.min < 1 || tier.max < tier.min || !isFinite(tier.price) || tier.price < 0) throw new Error('Invalid price tier');
    if (index && tier.min <= normalized[index - 1].max) throw new Error('Price tiers must not overlap');
  });

  const sheet = getSheet(SHEETS.AGENT_RATES);
  const rows = getData(SHEETS.AGENT_RATES);
  for (let index = rows.length - 1; index >= 0; index--) {
    if (rows[index][1] === agentId && rows[index][2] === productId) sheet.deleteRow(index + 2);
  }
  normalized.forEach(function(tier) {
    appendObject(SHEETS.AGENT_RATES, [generateId('RATE', SHEETS.AGENT_RATES), agentId, productId, tier.min, tier.max, tier.price, new Date()]);
  });
  return getAgentRates(agentId).filter(function(rate) { return rate.ProductID === productId; });
}

function quoteTierPrice(sessionToken, agentId, productId, quantity) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be at least 1');
  const product = getProductById(productId);
  if (!product) throw new Error('Product not found');
  const tier = getAgentRates(agentId).filter(function(rate) {
    return rate.ProductID === productId && qty >= Number(rate.MinQty) && qty <= Number(rate.MaxQty);
  })[0];
  return { productId: productId, quantity: qty, unitPrice: tier ? Number(tier.SellPrice) : Number(product.RetailPrice) };
}
