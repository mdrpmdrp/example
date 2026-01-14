function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Page')
    .setTitle('My custom sidebar');
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showSidebar(html);
}

function getVenderDetail(id = '7163') {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("contact");
  let data = sh.getDataRange().getValues();
  let vender = data.filter(function (item) {
    return item[0].toString().indexOf(id) > -1;
  });
  let obj = {}
  if (vender.length == 0) {
    obj.status = 'notfound'
  } else {
    obj.status = 'success'
    obj.contact = vender[0][1]
    obj.remark = vender[0][2]
    obj.waranty = vender[0][3]
  }
  return obj
}

function updateVenderDetail({ id, contact, remark, waranty }) {
  let lock = LockService.getScriptLock()
  lock.tryLock(30000)
  if (lock.hasLock()) {
    let ss = SpreadsheetApp.openById('1f7iTQCVai3Sa2inlC9ZIkLko0el3hhB9fK3osMSBUf4')
    let sh = ss.getSheetByName("รายชื่อติดต่อ");
    let data = sh.getDataRange().getValues();
    let index = data.findIndex(function (item) {
      lock.releaseLock()
      return item[0].toString().indexOf(id) > -1;
    });
    if (index == -1) {
      let lr = SuperScript.getRealLastRow('A', sh)
      sh.getRange(lr + 1, 1, 1, 4).setValues([[id, contact, remark, waranty]])
      SpreadsheetApp.flush()
    } else {
      sh.getRange(index + 1, 2, 1, 3).setValues([[contact, remark, waranty]])
    }
    lock.releaseLock()
    return { status: 'success' }
  }
}


