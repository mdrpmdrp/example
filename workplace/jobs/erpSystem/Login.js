const AUTH = {
  SESSION_PREFIX: 'ERP_SESSION_',
  SESSION_TTL_MS: 8 * 60 * 60 * 1000,
  ROLES: ['OWNER', 'ADMIN', 'SALES']
};

function login(username, password) {
  return withConsoleTiming_('server:login', function () {
    const normalizedUsername = String(username || '').trim().toLowerCase();
    const normalizedPassword = String(password || '');
    const user = getData(SHEETS.USERS).find(function (row) {
      return String(row[1]).trim().toLowerCase() === normalizedUsername;
    });
    if (!user || String(user[5]).toUpperCase() !== 'ACTIVE') {
      return { success: false, message: 'à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' };
    }
    if (String(user[2] || '') !== normalizedPassword) {
      return { success: false, message: 'à¸Šà¸·à¹ˆà¸­à¸œà¸¹à¹‰à¹ƒà¸Šà¹‰à¸«à¸£à¸·à¸­à¸£à¸«à¸±à¸ªà¸œà¹ˆà¸²à¸™à¹„à¸¡à¹ˆà¸–à¸¹à¸à¸•à¹‰à¸­à¸‡' };
    }
    const role = String(user[4]).toUpperCase();
    if (AUTH.ROLES.indexOf(role) === -1) {
      return { success: false, message: 'à¸šà¸±à¸à¸Šà¸µà¸™à¸µà¹‰à¹„à¸¡à¹ˆà¸¡à¸µà¸ªà¸´à¸—à¸˜à¸´à¹Œà¹€à¸‚à¹‰à¸²à¹ƒà¸Šà¹‰à¸‡à¸²à¸™à¸£à¸°à¸šà¸š' };
    }
    return { success: true, session: createSession_({ id: user[0], username: user[1], fullname: user[3], role: role }) };
  });
}

function getSession(token) {
  return withConsoleTiming_('server:getSession', function () {
    const session = readSession_(token);
    return session ? { success: true, session: session } : { success: false, message: 'à¹€à¸‹à¸ªà¸Šà¸±à¸™à¸«à¸¡à¸”à¸­à¸²à¸¢à¸¸ à¸à¸£à¸¸à¸“à¸²à¹€à¸‚à¹‰à¸²à¸ªà¸¹à¹ˆà¸£à¸°à¸šà¸šà¸­à¸µà¸à¸„à¸£à¸±à¹‰à¸‡' };
  });
}

function logout(token) {
  return withConsoleTiming_('server:logout', function () {
    if (token) PropertiesService.getScriptProperties().deleteProperty(AUTH.SESSION_PREFIX + token);
    return true;
  });
}

function requireRole(token, allowedRoles) {
  const session = readSession_(token);
  if (!session) throw new Error('UNAUTHENTICATED');
  if (allowedRoles && allowedRoles.indexOf(session.user.role) === -1) throw new Error('FORBIDDEN');
  return session.user;
}

function createSession_(user) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const session = { token: token, user: user, expiresAt: Date.now() + AUTH.SESSION_TTL_MS };
  PropertiesService.getScriptProperties().setProperty(AUTH.SESSION_PREFIX + token, JSON.stringify(session));
  return session;
}

function readSession_(token) {
  if (!token) return null;
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(AUTH.SESSION_PREFIX + token);
  if (!raw) return null;
  const session = JSON.parse(raw);
  if (!session.expiresAt || Date.now() >= session.expiresAt) {
    properties.deleteProperty(AUTH.SESSION_PREFIX + token);
    return null;
  }
  return session;
}
