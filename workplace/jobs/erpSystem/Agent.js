/** Dealer / agent data access. */
function getAgents() {
  return getData(SHEETS.AGENTS).map(function(row) {
    return {
      AgentID: row[0], AgentName: row[1], Phone: row[2], Address: row[3],
      Status: row[4], Created: row[5]
    };
  }).filter(function(agent) { return agent.Status === 'ACTIVE'; });
}

function getAgentById(agentId) {
  return getAgents().find(function(agent) { return agent.AgentID === agentId; }) || null;
}

function addAgent(data) {
  var id = data.AgentID || generateId('AGT', SHEETS.AGENTS);
  appendObject(SHEETS.AGENTS, [id, data.AgentName, data.Phone || '', data.Address || '', 'ACTIVE', new Date()]);
  return getAgentById(id);
}

function createAgent(sessionToken, data) {
  requireRole(sessionToken, ['OWNER', 'ADMIN']);
  if (!data || !String(data.AgentName || '').trim()) throw new Error('Agent name is required');
  return addAgent({
    AgentID: data.AgentID,
    AgentName: String(data.AgentName).trim(),
    Phone: String(data.Phone || '').trim(),
    Address: String(data.Address || '').trim()
  });
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
