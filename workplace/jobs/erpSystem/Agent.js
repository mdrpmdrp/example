/** Dealer / agent data access. */
function ensureAgentsSchema_() {
  var sheet = getSheet(SHEETS.AGENTS);
  if (!sheet) return;
  var headerRow = sheet.getLastRow() ? sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 7)).getValues()[0] : [];
  if (String(headerRow[2] || '').trim() !== 'AgentGroup') {
    migrateAgentsSchema();
  }
}

function getAgents() {
  ensureAgentsSchema_();
  return getData(SHEETS.AGENTS).map(function(row) {
    return {
      AgentID: row[0],
      AgentName: row[1],
      AgentGroup: String(row[2] || '').trim() || DEFAULT_AGENT_GROUP,
      Phone: row[3],
      Address: row[4],
      Status: row[5],
      Created: row[6]
    };
  }).filter(function(agent) { return agent.Status === 'ACTIVE'; });
}

function getAgentById(agentId) {
  return getAgents().find(function(agent) { return agent.AgentID === agentId; }) || null;
}

function addAgent(data) {
  ensureAgentsSchema_();
  var id = data.AgentID || generateId('AG', SHEETS.AGENTS, 3);
  appendObject(SHEETS.AGENTS, [
    id,
    data.AgentName,
    String(data.AgentGroup || '').trim() || DEFAULT_AGENT_GROUP,
    data.Phone || '',
    data.Address || '',
    'ACTIVE',
    new Date()
  ]);
  return true;
}

function getAgentRowById_(agentId) {
  var rowIndex = findRow(SHEETS.AGENTS, agentId);
  return rowIndex > 1 ? rowIndex : -1;
}

function createAgent(sessionToken, data) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  if (!data || !String(data.AgentName || '').trim()) throw new Error('Agent name is required');
  return addAgent({
    AgentID: data.AgentID,
    AgentName: String(data.AgentName).trim(),
    AgentGroup: String(data.AgentGroup || '').trim() || DEFAULT_AGENT_GROUP,
    Phone: String(data.Phone || '').trim(),
    Address: String(data.Address || '').trim()
  });
}

function updateAgent(sessionToken, data) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  ensureAgentsSchema_();
  if (!data || !String(data.AgentID || '').trim()) throw new Error('Agent ID is required');
  if (!String(data.AgentName || '').trim()) throw new Error('Agent name is required');

  var id = String(data.AgentID).trim();
  var rowIndex = getAgentRowById_(id);
  if (rowIndex < 2) throw new Error('Agent not found');

  var sheet = getSheet(SHEETS.AGENTS);
  var existing = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
  var createdValue = existing[6] || new Date();
  sheet.getRange(rowIndex, 1, 1, 7).setValues([[
    id,
    String(data.AgentName).trim(),
    String(data.AgentGroup || '').trim() || DEFAULT_AGENT_GROUP,
    String(data.Phone || '').trim(),
    String(data.Address || '').trim(),
    'ACTIVE',
    createdValue
  ]]);
  return true;
}

function deleteAgent(sessionToken, agentId) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  ensureAgentsSchema_();
  var id = String(agentId || '').trim();
  if (!id) throw new Error('Agent ID is required');

  var rowIndex = getAgentRowById_(id);
  if (rowIndex < 2) throw new Error('Agent not found');

  var sheet = getSheet(SHEETS.AGENTS);
  sheet.getRange(rowIndex, 6).setValue('INACTIVE');
  return { success: true, AgentID: id };
}

function listAgents(sessionToken) {
  requireRole(sessionToken, ['OWNER', 'ADMIN', 'SALES']);
  return getAgents();
}

function getAgentRates(agentId) {
  return getData(SHEETS.AGENT_RATES).filter(function(row) { return row[1] === agentId; }).map(function(row) {
    return { RateID: row[0], AgentID: row[1], ProductID: row[2], MinQty: row[3], MaxQty: row[4], SellPrice: row[5] };
  });
}
