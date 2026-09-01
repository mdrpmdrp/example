// Global cache for spreadsheet instance
let _cachedSS = null;
function getCachedSpreadsheet() {
  if (!_cachedSS) {
    _cachedSS = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _cachedSS;
}

function doPost(e) {
  Logger = BetterLog.useSpreadsheet()
  try {
    let opt = e.parameter.opt
    if (opt == 'add') return add(e)
    if (opt == 'setHistory') return setHistory(e)
    if (opt == 'checkRegist') return checkRegist(e)
    if (opt == 'regist_telegram') return registTelegram(e)
    if (opt == 'savejobconsult') return createJobConsultTask(e)
    if (opt == 'gettelegram') return getTelegram()
  } catch (error) {
    Logger.log(error)
  }
}



function doGet() {
  let cache = CacheService.getScriptCache()
  let his = cache.get('history')

  if (his == null) {
    let histories = PropertiesService.getScriptProperties()
    his = histories.getProperty('history')

    if (his == null) {
      let ss = getCachedSpreadsheet()
      let sh = ss.getSheetByName('LAST LOCATION')
      let data = sh.getDataRange().getDisplayValues()
      let historyObj = {}
      data.forEach(r => {
        historyObj[r[0]] = {
          start: r[1],
          end: r[2]
        }
      })
      his = JSON.stringify(historyObj)
      histories.setProperty('history', his)
      // Cache for 6 hours
      cache.put('history', his, 21600)
    }

  }

  return ContentService.createTextOutput(his).setMimeType(ContentService.MimeType.JSON)
}

function checkRegist(e) {
  let ss = getCachedSpreadsheet()
  let sh = ss.getSheetByName('USERS')
  let data = sh.getRange('A1:E' + sh.getLastRow()).getDisplayValues()

  let searchIndex = e.parameter.telegram ? 1 : 0
  let foundRow = data.find(row => row[searchIndex] === e.parameter.uid)

  if (!foundRow) {
    return ContentService.createTextOutput(JSON.stringify(false)).setMimeType(ContentService.MimeType.JSON)
  }

  let res = {
    uid: foundRow[0],
    telegram_id: foundRow[1],
    line_name: foundRow[2],
    telegram_name: foundRow[3],
    name: foundRow[4]
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON)
}

function registTelegram(e) {
  let ss = getCachedSpreadsheet()
  let sh = ss.getSheetByName('USERS')
  let data = sh.getRange('A1:E' + sh.getLastRow()).getDisplayValues()

  let rowIndex = data.findIndex(row => row[4] === e.parameter.name)
  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON)
  }

  let actualRow = rowIndex + 1
  sh.getRange(actualRow, 2, 1, 2).setValues([[e.parameter.uid, e.parameter.telegram_name]])

  let res = {
    uid: e.parameter.uid,
    line_name: data[rowIndex][2],
    telegram_name: e.parameter.telegram_name,
    name: data[rowIndex][4]
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: res })).setMimeType(ContentService.MimeType.JSON)
}


function add(e) {
  let lock = LockService.getScriptLock()
  lock.tryLock(3000)
  if (lock.hasLock()) {
    let ss = getCachedSpreadsheet()
    let sh = ss.getSheetByName('temp')
    let end = new Date()
    let start = randomTime(end)
    let isBorrow = e?.parameter?.isBorrow
    let timestamp = new Date()
    let lastRow = sh.getLastRow()
    let newRow = [
      timestamp,
      timestamp.getFullYear(),
      (timestamp.getMonth() + 1).toString().padStart(2, '0'),
      e?.parameter?.uid,
      e?.parameter?.displayName,
      e.parameter?.name,
      e?.parameter?.code,
      e?.parameter?.e_name,
      e?.parameter?.start + (e.parameter["start-room"] ? " ห้อง" + e.parameter["start-room"] : ""),
      e?.parameter?.end + (e.parameter["end-room"] ? " ห้อง " + e.parameter["end-room"] : ""),
      start,
      end,
      isBorrow
    ]
    sh.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow])
    lock.releaseLock()
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', e_name: newRow[7], code: newRow[6], start: newRow[8], end: newRow[9], name: newRow[5] })).setMimeType(ContentService.MimeType.JSON)
  }
}

function randomTime(time) {
  if (!time) time = new Date();

  // Generate a random total time in milliseconds between 15 and 20 minutes (inclusive)
  const minMilliseconds = 15 * 60000;
  const maxMilliseconds = 20 * 60000;
  // Use Math.floor to ensure we never exceed 20 minutes
  const randomMilliseconds = minMilliseconds + Math.floor(Math.random() * (maxMilliseconds - minMilliseconds + 1));

  // Create the new date
  const random_time = new Date(time.getTime() - randomMilliseconds);
  console.log("🚀 ~ random_time:", random_time.toLocaleString());

  return random_time;
}

function getTelegram() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', token: '7600446984:AAG9sMZ1TGpTdyrz4bArK2VVlMOnbo9jJMY', chatId: '-1002311428529' })).setMimeType(ContentService.MimeType.JSON)
}
function moveTempToSheet() {
  let ss = getCachedSpreadsheet()
  let sh = ss.getSheetByName('temp')
  let lastrow = sh.getLastRow()
  if (lastrow <= 0) return
  let data = sh.getRange(2, 1, lastrow, sh.getLastColumn()).getValues()
  let sh2 = ss.getSheetByName('Sheet1')
  let lastRow = sh2.getLastRow()
  sh2.getRange(lastRow + 1, 1, data.length, data[0].length).setValues(data)
  sh.getRange(2, 1, lastrow, sh.getLastColumn()).clearContent()
}


function moveToBackup() {
  let ss = getCachedSpreadsheet()
  let sh = ss.getSheetByName('Sheet1')
  let [header, ...data] = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues()
  let sh_backup = ss.getSheetByName('Backup')
  let isnew = false
  if (!sh_backup) {
    sh_backup = ss.insertSheet('Backup')
    isnew = true
  }
  let today = new Date()
  let lastday = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  // backup only data that older than 3 month from lastday of this month
  let last_3month = new Date(lastday.getFullYear(), lastday.getMonth() - 3, 1)
  let index = data.findLastIndex(r => new Date(r[0]) < last_3month)
  if (index == -1) return
  let backup_data = data.splice(0, index + 1)
  if (isnew) backup_data.unshift(header)
  sh.getRange(1, 1, backup_data.length, data[0].length).copyFormatToRange(sh_backup.getRange(sh_backup.getLastRow() + 1, 1, backup_data.length, header.length).getGridId(), 1, data[0].length, sh_backup.getLastRow() + 1, sh_backup.getLastRow() + backup_data.length)
  sh_backup.getRange(sh_backup.getLastRow() + 1, 1, backup_data.length, header.length).setValues(backup_data)
  sh.deleteRows(2, backup_data.length)
}

function setHistory(e) {
  let [code, start, end] = [e.parameter.code, e.parameter.start, e.parameter.end]
  let prop = PropertiesService.getScriptProperties()
  let histories = prop.getProperty('history')
  if (histories == null) histories = {}
  else {
    histories = JSON.parse(histories)
  }
  histories[code] = {
    start: start,
    end: end
  }
  let historyJson = JSON.stringify(histories)
  prop.setProperty('history', historyJson)

  // Update cache as well
  let cache = CacheService.getScriptCache()
  cache.put('history', historyJson, 21600)

  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON)
}

class TaskManager {
  constructor() {
    this.prop = PropertiesService.getScriptProperties();
  }

  getTasks() {
    let tasks = this.prop.getProperty('tasks');
    if (tasks == null) return [];
    return JSON.parse(tasks);
  }

  setTasks(tasks) {
    this.prop.setProperty('tasks', JSON.stringify(tasks));
  }

  addTask(task) {
    let tasks = this.getTasks();
    let index = tasks.findIndex(t => t.uuid === (task.uuid || "" ));
    if (index === -1) {
      tasks.push(task);
    } else {
      tasks[index] = task;
    }
    this.setTasks(tasks);
  }

  removeTask(code) {
    let tasks = this.getTasks();
    let index = tasks.findIndex(t => t.code === code);
    if (index == -1) return;
    tasks.splice(index, 1);
    this.setTasks(tasks);
  }
}

function createJobConsultTask(e) {
  let taskManager = new TaskManager();
  taskManager.addTask(e.parameter);

  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() == 'saveJobConsult')) {
    ScriptApp.newTrigger('saveJobConsult').timeBased().after(10000).create();
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}

function saveJobConsult() {
  let taskManager = new TaskManager();
  let tasks = taskManager.getTasks();
  if (tasks.length == 0) return;
  let ss = getCachedSpreadsheet();
  let sh = ss.getSheetByName('ชีต2');
  let codes_data = sh.getRange('A2:B' + sh.getLastRow()).getValues();

  // Build code lookup map for faster access
  let codeMap = {};
  codes_data.forEach(row => {
    if (row[0]) codeMap[row[0]] = row[1];
  });

  let cache = CacheService.getScriptCache()
  let count = 1;
  const non_200_retry_delay = 120000; // 2 minutes
  const exception_retry_delay = 600000; // 10 minutes
  let retry_delay = null;
  try {
    while (tasks.length > 0) {
      console.log('saving ' + count + ' of ' + tasks.length);
      let endpoint = 'https://bursting-fox-mostly.ngrok-free.app/';
      let { code, start, end, name } = tasks[0];
      let e_name = cache.get(code);
      if (e_name == null) {
        e_name = codeMap[code] || code;
        if (codeMap[code]) cache.put(code, e_name);
      }
      text = `ย้ายเครื่อง ${e_name} \nจาก ${start}\nไป ${end}\n\nโดย ${name}`;
      console.log(text)
      let url = `${endpoint}?mode=savejobconsult&code=${code}&dept=${encodeURIComponent(end)}&text=${encodeURIComponent(text)}`;
      let res = UrlFetchApp.fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': true
        },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() == 200) {
        taskManager.removeTask(code)
        Utilities.sleep(1000);
        tasks = taskManager.getTasks();
        count++;
      } else {
        retry_delay = non_200_retry_delay;
        break;
      }

    }
  } catch (e) { //with stack tracing if your exceptions bubble up to here

    retry_delay = exception_retry_delay;
    sendTelegramError(e);
  } finally {
    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() == 'saveJobConsult') ScriptApp.deleteTrigger(t);
    });
    if (tasks.length > 0) {
      taskManager.setTasks(tasks);
      let trigger_time = retry_delay || non_200_retry_delay;
      ScriptApp.newTrigger('saveJobConsult').timeBased().after(trigger_time).create();
    } else {
      taskManager.setTasks([]);
    }
  }
}

function testSaveJobConsult() {
    let taskManager = new TaskManager();
    taskManager.addTask({
      code: 'PYT3_04920',
      start: '2024-01-01 09:00',
      end: '2024-01-01 17:00',
      name: 'Test User',
    });

    saveJobConsult();

}

function scheduleSaveJobConsult() {
  saveJobConsult()
}

function manualCreteTask(start = 2111, end = 2297) {
  let taskManager = new TaskManager();
  let ss = getCachedSpreadsheet();
  let sh = ss.getSheetByName('Sheet1');
  let tasks = sh.getRange(start, 1, end - start + 1, sh.getLastColumn()).getValues().map(r => {
    return {
      code: r[6],
      start: r[8],
      end: r[9],
      name: r[5],
      opt: 'savejobconsult',
    }
  })
  taskManager.setTasks(tasks)
  console.log(taskManager.getTasks().length);
}

function sendTelegramError(e) {
  e = (typeof e === 'string') ? new Error(e) : e;
  let message = `Error: ${e.name}
Message: ${e.message}
Stack: ${e.stack}

Script URL: https://script.google.com/home/projects/${ScriptApp.getScriptId()}/edit`;
const prop = PropertiesService.getScriptProperties();
  let token = prop.getProperty('telegram_token')
  let chatId = prop.getProperty('telegram_chat_id')
  TelegramApp.sendMessage(token, chatId, message, { parse_mode: 'HTML', link_preview_options: JSON.stringify({ is_disabled: true }) });
}
