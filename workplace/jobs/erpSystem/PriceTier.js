function quoteTierPrice(sessionToken, agentId, productId, quantity, selectedUnit) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('Quantity must be at least 1');
  const product = getProductById(productId);
  if (!product) throw new Error('Product not found');

  selectedUnit = String(selectedUnit || '__base__').trim() || '__base__';
  var baseUnitPrice = Number(product.RetailPrice) || 0;
  var appliedTier = null;
  var pricingSource = 'RETAIL';

  var agent = getAgentById(agentId);
  var agentGroup = String(agent && agent.AgentGroup || '').trim();

  // ลำดับการหาราคา: รายตัวแทน -> รายกลุ่ม -> ราคาปกติสินค้า
  var agentTier = findMatchedTier_(getAgentRates(agentId), productId, qty);
  if (agentTier) {
    appliedTier = agentTier;
    pricingSource = 'AGENT_TIER';
  } else if (agentGroup) {
    var groupTier = findMatchedTier_(getAgentGroupRates(agentGroup), productId, qty);
    if (groupTier) {
      appliedTier = groupTier;
      pricingSource = 'GROUP_TIER';
    }
  }

  if (appliedTier) {
    baseUnitPrice = Number(appliedTier.SellPrice) || baseUnitPrice;
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
        pricingSource: pricingSource === 'RETAIL' ? 'PACK_PRICE' : pricingSource + '_PACK_PRICE'
      };
    }
    return {
      productId: productId,
      quantity: qty,
      selectedUnit: selectedUnit,
      baseUnitPrice: baseUnitPrice,
      unitPrice: baseUnitPrice * packSize,
      pricingSource: pricingSource === 'RETAIL' ? 'BASE_X_PACK' : pricingSource + '_BASE_X_PACK'
    };
  }

  return {
    productId: productId,
    quantity: qty,
    selectedUnit: selectedUnit,
    baseUnitPrice: baseUnitPrice,
    unitPrice: baseUnitPrice,
    pricingSource: pricingSource
  };
}

function findMatchedTier_(rates, productId, qty) {
  return (Array.isArray(rates) ? rates : []).filter(function(rate) {
    return rate.ProductID === productId && qty >= Number(rate.MinQty) && qty <= Number(rate.MaxQty);
  })[0] || null;
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

function ensureAgentGroupRatesSheet_() {
  return ensureSheetWithHeaders(SHEETS.AGENT_GROUP_RATES, [
    'RateID',
    'AgentGroup',
    'ProductID',
    'MinQty',
    'MaxQty',
    'SellPrice',
    'Created'
  ]);
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

function buildNextPriceTierId_(sheetName, prefix, prefixLength) {
  var sheet = sheetName === SHEETS.AGENT_GROUP_RATES ? ensureAgentGroupRatesSheet_() : getSheet(sheetName);
  var lastRow = sheet ? sheet.getLastRow() : 0;
  if (lastRow < 2) return 1;

  var lastId = sheet.getRange(lastRow, 1).getValue();
  var number = parseInt(String(lastId).replace(prefix, ''), 10);
  if (!Number.isFinite(number) || number < 1) return 1;
  return number + 1;
}

function buildPriceTierRows_(sheetName, prefix, agentValue, productId, tiers) {
  var nextId = buildNextPriceTierId_(sheetName, prefix, 6);
  var now = new Date();
  return tiers.map(function (tier, index) {
    return [
      prefix + String(nextId + index).padStart(6, '0'),
      agentValue,
      productId,
      tier.min,
      tier.max,
      tier.price,
      now
    ];
  });
}

function syncPriceTierRows_(sheetName, matchRow, prefix, agentValue, productId, tiers) {
  var sheet = sheetName === SHEETS.AGENT_GROUP_RATES ? ensureAgentGroupRatesSheet_() : getSheet(sheetName);
  var rows = getData(sheetName);
  var existingMatches = [];
  var existingByKey = {};
  var rowsToDelete = [];
  var rowsToUpdate = [];
  var rowsToAppend = [];
  var seenKeys = {};

  rows.forEach(function (row, index) {
    if (!matchRow(row)) return;
    var key = String(row[3]) + '|' + String(row[4]);
    var entry = { rowIndex: index + 2, row: row, key: key };
    existingMatches.push(entry);
    existingByKey[key] = entry;
  });

  tiers.forEach(function (tier) {
    var key = String(tier.min) + '|' + String(tier.max);
    var existing = existingByKey[key];

    if (existing) {
      seenKeys[key] = true;
      if (Number(existing.row[5]) !== tier.price) {
        rowsToUpdate.push({
          rowIndex: existing.rowIndex,
          row: [
            existing.row[0],
            agentValue,
            productId,
            tier.min,
            tier.max,
            tier.price,
            existing.row[6]
          ]
        });
      }
      return;
    }

    rowsToAppend.push(tier);
  });

  existingMatches.forEach(function (entry) {
    if (!seenKeys[entry.key]) {
      rowsToDelete.push(entry.rowIndex);
    }
  });

  rowsToUpdate.forEach(function (item) {
    sheet.getRange(item.rowIndex, 1, 1, 7).setValues([item.row]);
  });

  deleteRowsByIndexes_(sheet, rowsToDelete);

  if (rowsToAppend.length) {
    appendRows_(sheetName, buildPriceTierRows_(sheetName, prefix, agentValue, productId, rowsToAppend));
  }
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
    syncPriceTierRows_(SHEETS.AGENT_RATES, function (row) {
      return row[1] === normalizedAgentId && row[2] === normalizedProductId;
    }, 'RATE', normalizedAgentId, normalizedProductId, normalized);

    if (typeof AGENT_RATES_CACHE_ !== 'undefined') {
      delete AGENT_RATES_CACHE_[normalizedAgentId];
    }
    return getAgentRates(normalizedAgentId).filter(function (rate) {
      return rate.ProductID === normalizedProductId;
    });
  } finally {
    lock.releaseLock();
  }
}

function saveGroupPriceTiers(sessionToken, agentGroup, productId, tiers) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);

  var normalizedGroup = String(agentGroup || '').trim();
  var normalizedProductId = String(productId || '').trim();
  if (!normalizedGroup || !normalizedProductId) throw new Error('Agent group and product are required');
  if (AGENT_GROUP_OPTIONS.indexOf(normalizedGroup) === -1) throw new Error('Agent group not found');
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
    syncPriceTierRows_(SHEETS.AGENT_GROUP_RATES, function (row) {
      return String(row[1] || '').trim() === normalizedGroup && row[2] === normalizedProductId;
    }, 'GRATE', normalizedGroup, normalizedProductId, normalized);

    if (typeof AGENT_GROUP_RATES_CACHE_ !== 'undefined') {
      delete AGENT_GROUP_RATES_CACHE_[normalizedGroup];
    }
    return getAgentGroupRates(normalizedGroup).filter(function (rate) {
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

function listGroupPriceTiers(sessionToken, agentGroup, productId) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  var normalizedGroup = String(agentGroup || '').trim();
  var normalizedProductId = String(productId || '').trim();
  return getAgentGroupRates(normalizedGroup).filter(function (rate) {
    return !normalizedProductId || rate.ProductID === normalizedProductId;
  });
}

var AGENT_GROUP_RATES_CACHE_ = {};

function getAgentGroupRates(agentGroup) {
  var normalizedGroup = String(agentGroup || '').trim();
  if (!normalizedGroup) return [];
  if (!AGENT_GROUP_RATES_CACHE_[normalizedGroup]) {
    AGENT_GROUP_RATES_CACHE_[normalizedGroup] = getData(SHEETS.AGENT_GROUP_RATES).filter(function (row) {
      return String(row[1] || '').trim() === normalizedGroup;
    }).map(function (row) {
      return { RateID: row[0], AgentGroup: row[1], ProductID: row[2], MinQty: row[3], MaxQty: row[4], SellPrice: row[5] };
    }).sort(function (a, b) {
      return Number(a.MinQty) - Number(b.MinQty) || Number(a.MaxQty) - Number(b.MaxQty) || String(a.ProductID).localeCompare(String(b.ProductID));
    });
  }
  return AGENT_GROUP_RATES_CACHE_[normalizedGroup];
}
