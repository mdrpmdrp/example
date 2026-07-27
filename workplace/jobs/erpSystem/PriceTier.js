function quoteTierPrice(sessionToken, agentId, productId, quantity, selectedUnit) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be at least 1');
  const product = getProductById(productId);
  if (!product) throw new Error('Product not found');

  selectedUnit = String(selectedUnit || '__base__').trim() || '__base__';
  var baseUnitPrice = Number(product.RetailPrice) || 0;

  // ค้นหา Tier ตามจำนวนชิ้นฐาน (qty) แล้วใช้เป็นราคาต่อหน่วยฐาน
  const tier = getAgentRates(agentId).filter(function(rate) {
    return rate.ProductID === productId && qty >= Number(rate.MinQty) && qty <= Number(rate.MaxQty);
  })[0];

  if (tier) {
    baseUnitPrice = Number(tier.SellPrice) || baseUnitPrice;
  }

  var packUnits = Array.isArray(product.PackUnits) ? product.PackUnits : [];
  var matchedPack = packUnits.find(function(item) {
    return String(item && item.unit || '').trim() === selectedUnit;
  });

  if (selectedUnit !== '__base__' && matchedPack) {
    var packSize = Number(matchedPack.packSize) || 1;
    var packPrice = Number(matchedPack.price);
    if (Number.isFinite(packPrice) && packPrice >= 0) {
      return {
        productId: productId,
        quantity: qty,
        selectedUnit: selectedUnit,
        baseUnitPrice: baseUnitPrice,
        unitPrice: packPrice,
        pricingSource: 'PACK_PRICE'
      };
    }
    return {
      productId: productId,
      quantity: qty,
      selectedUnit: selectedUnit,
      baseUnitPrice: baseUnitPrice,
      unitPrice: baseUnitPrice * packSize,
      pricingSource: 'BASE_X_PACK'
    };
  }

  return {
    productId: productId,
    quantity: qty,
    selectedUnit: selectedUnit,
    baseUnitPrice: baseUnitPrice,
    unitPrice: baseUnitPrice,
    pricingSource: tier ? 'TIER' : 'RETAIL'
  };
}

function normalizePriceTierInput_(tier) {
  var min = Number(tier && tier.min);
  var maxRaw = tier && tier.max;
  var max = maxRaw === '' || maxRaw == null ? 99999 : Number(maxRaw);
  var price = Number(tier && tier.price);

  if (!Number.isInteger(min) || min < 1) throw new Error('Invalid price tier');
  if (!Number.isInteger(max) || max < min) throw new Error('Invalid price tier');
  if (!Number.isFinite(price) || price < 0) throw new Error('Invalid price tier');

  return { min: min, max: max, price: price };
}

function resolveAgentIdOrName_(value) {
  var raw = String(value || '').trim();
  if (!raw) return '';
  var agents = getAgents();
  var byId = agents.find(function (agent) {
    return String(agent.AgentID || '').trim() === raw;
  });
  if (byId) return String(byId.AgentID || '').trim();
  var byName = agents.find(function (agent) {
    return String(agent.AgentName || '').trim() === raw;
  });
  return byName ? String(byName.AgentID || '').trim() : raw;
}

function savePriceTiers(sessionToken, agentId, productId, tiers) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);

  var normalizedAgentId = resolveAgentIdOrName_(agentId);
  var normalizedProductId = String(productId || '').trim();
  if (!normalizedAgentId || !normalizedProductId) throw new Error('Agent and product are required');
  if (!getAgentById(normalizedAgentId)) throw new Error('Agent not found');
  if (!getProductById(normalizedProductId)) throw new Error('Product not found');

  var normalized = Array.isArray(tiers) ? tiers.map(normalizePriceTierInput_) : [];
  normalized.sort(function (a, b) { return a.min - b.min; });
  for (var index = 1; index < normalized.length; index++) {
    if (normalized[index].min <= normalized[index - 1].max) {
      throw new Error('Price tiers must not overlap');
    }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet(SHEETS.AGENT_RATES);
    var rows = getData(SHEETS.AGENT_RATES);
    for (var rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
      if (rows[rowIndex][1] === normalizedAgentId && rows[rowIndex][2] === normalizedProductId) {
        sheet.deleteRow(rowIndex + 2);
      }
    }

    normalized.forEach(function (tier) {
      appendObject(SHEETS.AGENT_RATES, [
        generateId('RATE', SHEETS.AGENT_RATES),
        normalizedAgentId,
        normalizedProductId,
        tier.min,
        tier.max,
        tier.price,
        new Date()
      ]);
    });

    return getAgentRates(normalizedAgentId).filter(function (rate) {
      return rate.ProductID === normalizedProductId;
    });
  } finally {
    lock.releaseLock();
  }
}

function listPriceTiers(sessionToken, agentId, productId) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var normalizedAgentId = resolveAgentIdOrName_(agentId);
  var normalizedProductId = String(productId || '').trim();
  return getAgentRates(normalizedAgentId).filter(function (rate) {
    return !normalizedProductId || rate.ProductID === normalizedProductId;
  });
}
