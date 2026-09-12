const CONFIG = Object.freeze({
  MASTER_SHEET: 'Master',
  USERS_SHEET: 'Users',
  ASSIGNMENTS_SHEET: 'Assignments',
  SETTINGS_SHEET: 'Settings',
  UPLOAD_ROOT_FOLDER: 'FieldFlow Uploads',
  CACHE_KEY: 'FIELD_FLOW_BOOTSTRAP_V1',
  INITIAL_DATA_CACHE_KEY: 'MASTER_INITIAL_DATA_V1',
  INITIAL_DATA_CACHE_SECONDS: 21600,
  INITIAL_DATA_CACHE_MAX_BYTES: 95000,
  SESSION_CACHE_PREFIX: 'FIELD_FLOW_SESSION_',
  SESSION_SECONDS: 3600,
  CACHE_SECONDS: 300
});

const HEADERS = Object.freeze({
  Master: ['Supervisor','Site','Owner','Foreman','Area','Rank','Job'],
  Users: ['Username','Password','Name','Role','Active'],
  Assignments: ['AssignmentId','SupervisorUsername','SupervisorName','Company','Site','Area','Job','Rank','AssignDate','ForemanUsernames','ForemanNames','Status','BeforeFileId','AfterFileId','BeforeUrl','AfterUrl','CreatedAt','UpdatedAt','CancelledAt'],
  Settings: ['Key','Value']
});

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  template.initialDataJson = safeJsonForHtml_(getInitialData_());
  return template.evaluate().setTitle('FieldFlow · ระบบสั่งงานภาคสนาม').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** รวมไฟล์ client-side JavaScript จากไฟล์ app.js เข้าใน index.html */
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

/** รันครั้งเดียวจาก Apps Script Editor เพื่อสร้างชีต, header, ผู้ใช้เริ่มต้น และโฟลเดอร์อัปโหลด */
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const legacyUsers = ss.getSheetByName(CONFIG.USERS_SHEET);
  const hasLegacyEmailUsers = legacyUsers && legacyUsers.getLastColumn() > 0 && String(legacyUsers.getRange(1,1).getValue()) === 'Email';
  Object.keys(HEADERS).forEach(name => {
    const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    const headers = HEADERS[name];
    if (sheet.getLastRow() === 0 || !(name === CONFIG.USERS_SHEET && hasLegacyEmailUsers)) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#17211b').setFontColor('#ffffff');
    sheet.autoResizeColumns(1, headers.length);
  });
  const users = ss.getSheetByName(CONFIG.USERS_SHEET);
  const oldUserHeader = users.getLastColumn() > 0 ? String(users.getRange(1,1).getValue()) : '';
  if (oldUserHeader === 'Email') {
    const oldRows = users.getLastRow() > 1 ? users.getRange(2,1,users.getLastRow()-1,4).getValues() : [];
    users.clearContents();
    users.getRange(1,1,1,5).setValues([HEADERS.Users]);
    if (oldRows.length) users.getRange(2,1,oldRows.length,5).setValues(oldRows.map(r => [String(r[0]).split('@')[0],'12345678',r[1],r[2],r[3]]));
  }
  if (users.getLastRow() < 2) users.getRange(2, 1, 3, 5).setValues([
    ['supervisor','12345678','กิตติศักดิ์ ส.','Supervisor',true],
    ['foreman','12345678','ธนา วัฒนะ','Foreman',true],
    ['owner','12345678','เจ้าของกิจการ','Owner',true]
  ]);
  const master = ss.getSheetByName(CONFIG.MASTER_SHEET);
  // Master มีทั้งหมด 7 คอลัมน์ตาม HEADERS.Master (รวม Rank และ Job)
  if (master.getLastRow() < 2) master.getRange(2, 1, 4, HEADERS.Master.length).setValues([
    ['กิตติศักดิ์ ส.','คลังสินค้า ลาดกระบัง','บริษัท เอเพ็กซ์ เซอร์วิส จำกัด','ธนา วัฒนะ','อาคาร A','A','ตรวจเช็กระบบไฟฟ้า'],
    ['กิตติศักดิ์ ส.','คลังสินค้า ลาดกระบัง','บริษัท เอเพ็กซ์ เซอร์วิส จำกัด','สมชาย ใจดี','อาคาร B','B','บำรุงรักษาเครื่องจักร'],
    ['วราภรณ์ ท.','โรงงานบางปะอิน','บริษัท นอร์ธสตาร์ จำกัด','อนุชา พรหมมา','โซนผลิต','C','ทำความสะอาดพื้นที่'],
    ['วราภรณ์ ท.','โรงงานบางปะอิน','บริษัท นอร์ธสตาร์ จำกัด','ธนา วัฒนะ','โซนคลัง','Punch','ตรวจเช็กระบบไฟฟ้า']
  ]);
  const root = getOrCreateFolder_(CONFIG.UPLOAD_ROOT_FOLDER, null);
  PropertiesService.getScriptProperties().setProperty('FIELD_FLOW_ROOT_FOLDER_ID', root.getId());
  clearCache_();
  return {ok:true, message:'สร้างชีตและโฟลเดอร์ FieldFlow Uploads เรียบร้อยแล้ว', sheets:Object.keys(HEADERS), rootFolderId:root.getId()};
}

function authenticateUser(username, password) {
  const users = readRows_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET), HEADERS.Users);
  const user = users.find(u => String(u.Username).toLowerCase() === String(username || '').trim().toLowerCase() && String(u.Active).toLowerCase() !== 'false');
  if (!user || String(user.Password) !== String(password || '')) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const sessionToken = Utilities.getUuid();
  const sessionUser = {Username:user.Username,Name:user.Name,Role:user.Role};
  CacheService.getScriptCache().put(
    CONFIG.SESSION_CACHE_PREFIX + sessionToken,
    JSON.stringify(sessionUser),
    CONFIG.SESSION_SECONDS,
  );
  return {...sessionUser, sessionToken};
}
function getSession(sessionToken) {
  if (!sessionToken) return null;
  const cached = CacheService.getScriptCache().get(CONFIG.SESSION_CACHE_PREFIX + sessionToken);
  if (!cached) return null;
  try { return JSON.parse(cached); } catch (error) { return null; }
}
function touchSession(sessionToken) {
  const session = getSession(sessionToken);
  if (!session) return null;
  CacheService.getScriptCache().put(
    CONFIG.SESSION_CACHE_PREFIX + sessionToken,
    JSON.stringify(session),
    CONFIG.SESSION_SECONDS,
  );
  return session;
}
function logoutSession(sessionToken) {
  if (sessionToken) CacheService.getScriptCache().remove(CONFIG.SESSION_CACHE_PREFIX + sessionToken);
}
function getBootstrap() { return getBootstrap_(); }
function getUploadAuth() { return {accessToken:ScriptApp.getOAuthToken()}; }
function getJobFolder(jobId) {
  if (!jobId) throw new Error('ต้องมีรหัสงาน');
  const root = getOrCreateFolder_(CONFIG.UPLOAD_ROOT_FOLDER, null);
  return {folderId:getOrCreateFolder_(String(jobId), root).getId()};
}

function saveAssignment(payload) {
  assertPayload_(payload, ['site','area','job','rank','assignDate']);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ASSIGNMENTS_SHEET) || initSheet_().assignments;
  ensureAssignmentsSchema_(sheet);
  const id = payload.assignmentId || nextAssignmentId_(sheet);
  const now = new Date();
  const actor = requireRole_(payload.username, 'Supervisor');
  const foremanUsernames = (payload.foremanUsernames || []).join(', ');
  const foremanNames = (payload.foremanNames || []).join(', ');
  const values = Object.fromEntries([
    ['AssignmentId', id],
    ['SupervisorUsername', actor.Username],
    ['SupervisorName', actor.Name],
    ['Company', ''],
    ['Site', payload.site],
    ['Area', payload.area],
    ['Job', payload.job],
    ['Rank', payload.rank],
    ['AssignDate', new Date(payload.assignDate)],
    ['ForemanUsernames', foremanUsernames],
    ['ForemanNames', foremanNames],
    ['Status', 'In progress'],
    ['CreatedAt', now],
    ['UpdatedAt', now]
  ]);
  const row = HEADERS.Assignments.map(header => values[header] === undefined ? '' : values[header]);
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  clearCache_();
  return {ok:true, assignmentId:id};
}

function updateAssignment(payload) {
  assertPayload_(payload, ['assignmentId','site','area','job','rank','assignDate','username']);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) throw new Error('ยังไม่มีชีต Assignments กรุณารัน initSheet()');
  ensureAssignmentsSchema_(sheet);
  const actor = requireRole_(payload.username, 'Supervisor');
  const values = sheet.getDataRange().getValues();
  const idCol = HEADERS.Assignments.indexOf('AssignmentId');
  const row = values.findIndex((r, i) => i > 0 && String(r[idCol]) === String(payload.assignmentId));
  if (row < 1) throw new Error('ไม่พบรหัสงาน ' + payload.assignmentId);
  const record = Object.fromEntries(HEADERS.Assignments.map((header, index) => [header, values[row][index]]));
  if (String(record.SupervisorUsername).toLowerCase() !== String(actor.Username).toLowerCase()) {
    throw new Error('คุณไม่มีสิทธิ์แก้ไขงานนี้');
  }
  if (String(record.Status) === 'Cancelled') throw new Error('งานนี้ถูกยกเลิกแล้ว');
  const h = Object.fromEntries(HEADERS.Assignments.map((header, index) => [header, index + 1]));
  sheet.getRange(row + 1, h.Site, 1, 6).setValues([[
    payload.site,
    payload.area,
    payload.job,
    payload.rank,
    new Date(payload.assignDate),
    (payload.foremanUsernames || []).join(', ')
  ]]);
  sheet.getRange(row + 1, h.ForemanNames).setValue((payload.foremanNames || []).join(', '));
  sheet.getRange(row + 1, h.UpdatedAt).setValue(new Date());
  clearCache_();
  return {ok:true, assignmentId:payload.assignmentId};
}

function saveSubmission(payload) {
  assertPayload_(payload, ['assignmentId','beforeFileId','afterFileId']);
  requireRole_(payload.username, 'Foreman');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) throw new Error('ยังไม่มีชีต Assignments กรุณารัน initSheet()');
  ensureAssignmentsSchema_(sheet);
  const values = sheet.getDataRange().getValues();
  const idCol = HEADERS.Assignments.indexOf('AssignmentId');
  const row = values.findIndex((r,i) => i > 0 && String(r[idCol]) === String(payload.assignmentId));
  if (row < 1) throw new Error('ไม่พบรหัสงาน ' + payload.assignmentId);
  const r = row + 1;
  const h = Object.fromEntries(HEADERS.Assignments.map((x,i)=>[x,i+1]));
  sheet.getRange(r,h.BeforeFileId,1,4).setValues([[payload.beforeFileId,payload.afterFileId,payload.beforeUrl || '',payload.afterUrl || '']]);
  sheet.getRange(r,h.Status).setValue('Success');
  sheet.getRange(r,h.UpdatedAt).setValue(new Date());
  clearCache_();
  return {ok:true, assignmentId:payload.assignmentId, status:'Success'};
}

function ensureAssignmentsSchema_(sheet) {
  const expected = HEADERS.Assignments;
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), expected.length)).getValues()[0]
    .map(value => String(value || '').trim());
  const isCorrect = expected.every((header, index) => current[index] === header);
  if (isCorrect) return;

  const oldJobIndex = current.indexOf('Job');
  const hasOldSchema = oldJobIndex === 5 && current.indexOf('Area') === -1;
  if (hasOldSchema) {
    sheet.insertColumnBefore(oldJobIndex + 1);
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
    return;
  }

  throw new Error('โครงสร้างชีท Assignments ไม่ตรงกับระบบ กรุณาตรวจสอบหัวตารางแถวที่ 1');
}

function cancelAssignment(assignmentId, username) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  const values = sheet.getDataRange().getValues(); const idCol = HEADERS.Assignments.indexOf('AssignmentId');
  const row = values.findIndex((r,i)=>i>0 && String(r[idCol])===String(assignmentId));
  if (row < 1) throw new Error('ไม่พบงาน');
  const actor = requireRole_(username, 'Supervisor');
  const ownerCol = HEADERS.Assignments.indexOf('SupervisorUsername');
  if (String(values[row][ownerCol]).toLowerCase() !== String(actor.Username).toLowerCase()) throw new Error('คุณไม่มีสิทธิ์ยกเลิกงานนี้');
  const statusCol = HEADERS.Assignments.indexOf('Status') + 1;
  if (String(values[row][statusCol - 1]) === 'Cancelled') throw new Error('งานนี้ถูกยกเลิกแล้ว');
  const cancelledCol = HEADERS.Assignments.indexOf('CancelledAt') + 1;
  sheet.getRange(row+1,statusCol).setValue('Cancelled'); sheet.getRange(row+1,cancelledCol).setValue(new Date()); clearCache_(); return {ok:true};
}

function exportReportCsv(fromDate, toDate) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (!sheet) throw new Error('ยังไม่มีชีต Assignments');
  const rows = sheet.getDataRange().getDisplayValues();
  return rows.map(row => row.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\n');
}

function getBootstrap_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const initialData = getInitialData_();
  const users = readRows_(ss.getSheetByName(CONFIG.USERS_SHEET), HEADERS.Users);
  const assignmentSheet = ss.getSheetByName(CONFIG.ASSIGNMENTS_SHEET);
  if (assignmentSheet) ensureAssignmentsSchema_(assignmentSheet);
  const assignments = readRows_(assignmentSheet, HEADERS.Assignments);
  const foremen = users
    .filter(u =>
      String(u.Role || '').trim().toLowerCase() === 'foreman' &&
      String(u.Active).trim().toLowerCase() !== 'false'
    )
    // ห้ามส่ง Password หรือคอลัมน์อื่นจาก Users ไปฝั่ง client
    .map(u => ({Username: u.Username, Name: u.Name}));
  return JSON.stringify({master: initialData.master, dropdowns: initialData.dropdowns, foremen, assignments});
}

function getInitialData_() {
  const cache = CacheService.getScriptCache();
  const cachedJson = cache.get(CONFIG.INITIAL_DATA_CACHE_KEY);
  if (cachedJson) {
    try {
      const cached = JSON.parse(cachedJson);
      if (cached && cached.master && Array.isArray(cached.master.supervisors)) return cached;
      cache.remove(CONFIG.INITIAL_DATA_CACHE_KEY);
    } catch (error) {
      cache.remove(CONFIG.INITIAL_DATA_CACHE_KEY);
    }
  }

  const initialData = buildInitialDataFromMaster_();
  const json = JSON.stringify(initialData);
  if (json.length <= CONFIG.INITIAL_DATA_CACHE_MAX_BYTES) {
    cache.put(CONFIG.INITIAL_DATA_CACHE_KEY, json, CONFIG.INITIAL_DATA_CACHE_SECONDS);
  }
  return initialData;
}

// Master columns: A=Supervisor, B=Site, C=Owner, D=Foreman, E=Area, F=Rank, G=Job
function buildInitialDataFromMaster_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.MASTER_SHEET);
  if (!sheet) throw new Error('ไม่พบชีตชื่อ "' + CONFIG.MASTER_SHEET + '"');

  const result = createEmptyInitialData_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return result;

  const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const supervisorMap = new Map();
  const siteMap = new Map();
  const areaSetBySite = new Map();
  const rankSet = new Set();
  const jobSet = new Set();
  const rankJobSet = new Set();
  let currentSupervisor = '';
  let currentSite = '';
  let currentOwner = '';
  let currentForeman = '';

  rows.forEach(row => {
    const supervisor = normalizeText_(row[0]);
    const site = normalizeText_(row[1]);
    const owner = normalizeText_(row[2]);
    const foreman = normalizeText_(row[3]);
    const area = normalizeText_(row[4]);
    const rank = normalizeText_(row[5]);
    const job = normalizeText_(row[6]);

    if (rank && !rankSet.has(rank)) { rankSet.add(rank); result.dropdowns.ranks.push(rank); }
    if (job && !jobSet.has(job)) { jobSet.add(job); result.dropdowns.jobs.push(job); }
    if (rank && job) {
      const rankJobKey = rank + '\u0000' + job;
      if (!rankJobSet.has(rankJobKey)) {
        rankJobSet.add(rankJobKey);
        result.dropdowns.rankJobs.push({rank, job});
      }
    }

    if (supervisor) currentSupervisor = supervisor;
    if (site) currentSite = site;
    if (owner) currentOwner = owner;
    if (foreman) currentForeman = foreman;
    if (!currentSite) return;

    const supervisorName = currentSupervisor || 'ไม่ระบุ Supervisor';
    let supervisorObj = supervisorMap.get(supervisorName);
    if (!supervisorObj) {
      supervisorObj = {supervisor: supervisorName, sites: []};
      supervisorMap.set(supervisorName, supervisorObj);
      result.master.supervisors.push(supervisorObj);
    }

    const siteKey = supervisorName + '\u0000' + currentSite;
    let siteObj = siteMap.get(siteKey);
    if (!siteObj) {
      siteObj = {site: currentSite, owner: currentOwner, foreman: currentForeman, areas: []};
      siteMap.set(siteKey, siteObj);
      areaSetBySite.set(siteKey, new Set());
      supervisorObj.sites.push(siteObj);
    } else {
      if (owner) siteObj.owner = currentOwner;
      if (foreman) siteObj.foreman = currentForeman;
    }

    if (area) {
      const areaSet = areaSetBySite.get(siteKey);
      if (!areaSet.has(area)) { areaSet.add(area); siteObj.areas.push(area); }
    }
  });
  return result;
}

function createEmptyInitialData_() {
  return {master: {supervisors: []}, dropdowns: {sites: [], areas: [], ranks: [], jobs: [], rankJobs: []}};
}

function normalizeText_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function initSheet_() { initSheet(); return {assignments:SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.ASSIGNMENTS_SHEET)}; }
function readRows_(sheet, headers) { if (!sheet || sheet.getLastRow() < 2) return []; return sheet.getRange(2,1,sheet.getLastRow()-1,headers.length).getValues().map(row => Object.fromEntries(headers.map((h,i)=>[h,row[i]]))); }
function nextAssignmentId_(sheet) { const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMM'); const count = Math.max(0,sheet.getLastRow()-1)+1; return 'FF-' + year + String(count).padStart(3,'0'); }
function requireRole_(username, role) { const users = readRows_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET), HEADERS.Users); const user = users.find(u => String(u.Username).toLowerCase() === String(username || '').trim().toLowerCase() && String(u.Active).toLowerCase() !== 'false'); if (!user || user.Role !== role) throw new Error('ไม่มีสิทธิ์ดำเนินการสำหรับ role นี้'); return user; }
function assertPayload_(payload, fields) { if (!payload) throw new Error('ข้อมูลไม่ครบ'); fields.forEach(f=>{if (payload[f] === undefined || payload[f] === null || payload[f] === '') throw new Error('ข้อมูลไม่ครบ: ' + f);}); }
function getOrCreateFolder_(name, parent) { const it = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name); return it.hasNext() ? it.next() : (parent ? parent.createFolder(name) : DriveApp.createFolder(name)); }
function clearInitialDataCache() {
  CacheService.getScriptCache().remove(CONFIG.INITIAL_DATA_CACHE_KEY);
}
function onMasterSheetEdit(e) {
  if (!e || !e.range) return;
  const range = e.range;
  const sheet = range.getSheet();
  const lastRow = range.getRow() + range.getNumRows() - 1;
  const lastColumn = range.getColumn() + range.getNumColumns() - 1;
  const touchesMasterData =
    sheet.getName() === CONFIG.MASTER_SHEET &&
    lastRow >= 2 &&
    range.getColumn() <= 7 &&
    lastColumn >= 1;
  if (touchesMasterData) clearInitialDataCache();
}
function createMasterEditTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const exists = ScriptApp.getProjectTriggers().some(trigger =>
    trigger.getHandlerFunction() === 'onMasterSheetEdit' &&
    trigger.getEventType() === ScriptApp.EventType.ON_EDIT
  );
  if (!exists) {
    ScriptApp.newTrigger('onMasterSheetEdit')
      .forSpreadsheet(spreadsheet)
      .onEdit()
      .create();
  }
}
function clearCache_() {
  const cache = CacheService.getScriptCache();
  cache.remove(CONFIG.CACHE_KEY);
  cache.remove(CONFIG.INITIAL_DATA_CACHE_KEY);
}
function safeJsonForHtml_(data) { return JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'); }
