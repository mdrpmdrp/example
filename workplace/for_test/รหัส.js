const ss = SpreadsheetApp.getActiveSpreadsheet()
const sheetid = '1xtncPPtCnAbEDoUSIw0Jovb2M5BuA2gSfCOTIJuZoAI'
const line_token = '8z0TzBgbHbodwtsxKXefY7GTht8q6xhr8eSxkBljr9SeMycM3lHf2VNKWi5+1YyJTmJ667Tq6sn+lQpDiPcOCkaxnUsKjpkdu8M0NIc9vyt+AzCTBzK00YcTYHoj9XCciIxbGLUbewzZ2L5J1+1tdgdB04t89/1O/w1cDnyilFU='
const fullname = {
  ['หมากรุก']: 'DARANPHOP YIMYAM',
  ['หม่อน']: 'CHATMANEE MONGKOLTANANON',
  ['กุ๊ก']: 'PANALEE UEASUNTHONNOP',
  ['ตั๊ก']: 'CHANCHAI SAE-LEE',
  ['นิ้ง']: 'SASIMAPORN KHANTHAHOME',
  ['เจ็ม']: 'ANUPHAB CHANTO',
  ['ต๋อง']: 'NARUECHA CHAIYAPHAN',
  ['ตั้ม']: 'SARAWUT MANCHETHUAN',
  ['อ๊อฟ']: 'ITTIPAT IEMDEE',
  ['เนตร']: 'SERMKEAT HADJANG',
  ['ดิว']: 'SARAN THAMMATHORN',
  ['ปู']: 'CHATVIPA KAEWPRESERT',
  ['ขนมตาล']: 'KANISTHA CHINRASRI',
  ['ต้น']: 'RATCHATA PIRIYAKITSAKUL',
  ['เพียส']: 'ILADA BUAPRALAT',
  ['เหมียว']: 'JIRASSAYA CHUENYOO',
  ['แบงค์']: 'CHALERMPORN SABUA'
}
function doPost(e) {
  // const webhook = LineBotWebhook.init(e, line_token, sheetid)
  // // let userMsg = '7455=icu'
  // let userMsg = webhook.message
  // let eventType = webhook.eventType
  // if (eventType == 'follow') return followEvent(webhook)
  // if (eventType == 'postback') return postbackMessage(webhook)
  // switch (true) {
  //   case userMsg.indexOf('register=') > -1: return register(webhook)
  //   case userMsg.indexOf('=') > -1 || userMsg.toLowerCase().indexOf('job') > -1: return savedata(webhook)
  //   case userMsg.indexOf('ได้ถูกย้ายจาก') > -1 : return webhook.replyToline(['บันทึกเรียบร้อย'])
  //   case userMsg.toLowerCase() == 'sum': return sumPoolWork(webhook)
  //   default: return webhook.reply(['คำสั่งไม่ถูกต้อง'])

  // }
  Logger = BetterLog.useSpreadsheet()
  if (e.parameter?.opt && e.parameter.opt == 'bennett840test') return saveBennett840(e)
  LineBotWebhook.init(e, line_token, true).forEach(webhook => {
    try {
      let userMsg = webhook.message
      let eventType = webhook.eventType
      if (eventType == 'follow') return followEvent(webhook)
      if (eventType == 'postback') return postbackMessage(webhook)
      switch (true) {
        case userMsg.indexOf('register=') > -1: return register(webhook)
        case userMsg.indexOf('=') > -1 || userMsg.toLowerCase().indexOf('job') > -1: return savedata(webhook)
        case userMsg.indexOf('ได้ถูกย้ายจาก') > -1: return webhook.replyToline(['บันทึกเรียบร้อย'])
        case userMsg.indexOf('verify') > -1: return webhook.replyToline(['บันทึกเรียบร้อย'])
        case userMsg.toLowerCase() == 'sum': return sumPoolWork(webhook)
        default: return webhook.reply(['คำสั่งไม่ถูกต้อง'])

      }
    } catch (e) {
      webhook.replyToline([e])
      e = (typeof e === 'string') ? new Error(e) : e;
      Logger.severe('%s: %s (line %s, file "%s"). Stack: "%s".', e.name || '',
        e.message || '', e.lineNumber || '', e.fileName || '', e.stack || '');
      return webhook.ok
    }
  })
}

function sumPoolWork(webhook) {
  let sh = SpreadsheetApp.openById('1PfIQfd0oHAEQvQ2mOcPYf9OQrTAI0bTykvJvNopP_qA').getSheetByName('Sheet1')
  let sum = sh.getRange('L2').getValue()
  let message = `วันที่ ${Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy')} งานขนย้ายทั้งหมด ${sum} งาน`
  return webhook.replyToline([message])
}

function followEvent(webhook) {
  let flex = {
    "type": "bubble",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "กรุณาลงทะเบียนก่อนใช้งาน",
          "align": "center"
        },
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "Register",
            "data": "register",
            // "displayText": 'Register',
            "inputOption": "openKeyboard",
            "fillInText": "register="
          },
          "style": "primary"
        }
      ],
      "spacing": "lg"
    }
  }
  return webhook.reply([flex])
}

function postbackMessage(webhook) {
  let data = webhook.data.events[0].postback.data
  if (data == 'register') return webhook.reply(['กรุณาพิมพ์ "register=" ตามด้วยชื่อเล่นของคุณ'])
}

function register(webhook) {
  let lock = LockService.getScriptLock()
  lock.tryLock(2000)
  if (lock.hasLock()) {
    let res = false
    try {
      let sheet = ss.getSheetByName('register')
      let data = sheet.getDataRange().getDisplayValues()
      let index = data.findIndex(r => r[0] == webhook.userId)
      if (index <= -1) index = data.length
      sheet.getRange(index + 1, 1, 1, 2).setValues([[webhook.userId, webhook.message.replace('register=', '').trim()]])
      res = 'register success'
    } catch (error) {
      res = error
    } finally {
      lock.releaseLock()
      return webhook.replyToline([res])
    }
  }
}

function savedata(webhook) {
  let lock = LockService.getScriptLock()

  lock.tryLock(15000)
  if (lock.hasLock()) {
    let res = false
    let name, dept, datamsg = []
    try {
      let sheet = ss.getSheetByName('register')
      let data = sheet.getDataRange().getDisplayValues()
      let index = data.findIndex(r => r[0] == webhook.userId)
      // let index = data.findIndex(r => r[0] == 'Uc4e4aba9e69fe19d188a7d812d2f028c')
      if (index <= -1) res = 'ลงทะเบียนก่อนใช้งาน'
      else {
        // let msg = '000001,000002,000003,000004,7455=icu'
        let msg = webhook.message.toString()
        if (msg.indexOf('=') > -1) {
          dept = msg.split('=')[1].trim()
        }
        name = fullname[data[index][1]]
        if (msg.split('=')[0].indexOf(',') > -1) {
          datamsg = msg.split('=')[0].split(',').map(a => a.trim())
        }
        else if (msg.split('=')[0].indexOf('\n') > -1) {
          datamsg = msg.split('=')[0].split('\n').map(a => a.trim())
        }
        else if (msg.split('=')[0].indexOf(' ') > -1) {
          datamsg = msg.split('=')[0].split(' ').map(a => a.trim())
        }
        else {
          datamsg = [msg.split('=')[0].trim()]
        }

        if (datamsg[0].indexOf('-') == 0) {
          res = deleteData(datamsg)
        } else if (datamsg[0].toLowerCase().indexOf('job') == 0) {
          res = generateQr(datamsg[0])
          if (!res) res = ['ไม่พบรหัสนี้ในแผน PM']
          else {
            let image = {
              "type": "image",
              "originalContentUrl": 'https://chart.googleapis.com/chart?cht=qr&chl=' + encodeURIComponent(res.url) + '&chs=180x180&choe=UTF-8',
              "previewImageUrl": 'https://chart.googleapis.com/chart?cht=qr&chl=' + encodeURIComponent(res.url) + '&chs=180x180&choe=UTF-8'
            }
            res = [res.msg, image]
          }
          lock.releaseLock()
          return webhook.replyToline(res)
        }

        else {
          res = addData(datamsg, name, dept)
        }

      }

    } catch (error) {
      Logger.log(error)
      res = error
    } finally {
      lock.releaseLock()

      return webhook.replyToline([res])
    }
  }
}

function saveBennett840(e) {
  let lock = LockService.getScriptLock()
  if (!lock.tryLock(10000)) return ContentService.createTextOutput(JSON.stringify({ status: false, text: 'lock' })).setMimeType(ContentService.MimeType.JSON)
  let res = false
  let name
  try {
    let { code, working_hours, last_sst, do_est, last_est, uid } = e.parameter

    let sheet = ss.getSheetByName('register')
    let data = sheet.getDataRange().getDisplayValues()
    let index = data.findIndex(r => r[0] == uid)
    // let code = '2023'
    // let index = data.findIndex(r => r[0] == 'Uc4e4aba9e69fe19d188a7d812d2f028c')
    if (index <= -1) res = 'ลงทะเบียนก่อนใช้งาน'
    else {
      name = fullname[data[index][1]]
      res = addDataBennett840(code, name, working_hours, last_sst, do_est, last_est)
    }

  } catch (error) {
    Logger.log(error)
    res = error
  } finally {
    lock.releaseLock()
    return ContentService.createTextOutput(JSON.stringify({ status: true, text: res })).setMimeType(ContentService.MimeType.JSON)
  }
}

function addData(datamsg, name, dept) {
  sheet = ss.getSheetByName('baxter')
  let sheetSNData = ss.getSheetByName('SN').getDataRange().getDisplayValues().filter(r => r[0] != '')
  let url = 'https://docs.google.com/forms/d/e/1FAIpQLScea_AITay-MjAey7B2KJrYtMWp2SfHZLR5hw8TVjR04IPN8w/formResponse?'
  let dataarr = [...datamsg]
  dataarr = dataarr.map((m, i) => {
    let detail = getDetail(m, sheetSNData)
    if (!detail.sn) return false
    let data = {
      name: 'Infusion+pump',
      code: detail.code,
      sn: detail.sn,
      receive: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
      check: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
      dept: dept.toUpperCase(),
      clean: 'YES',
      battery: 'YES',
      keypad: 'YES',
      switch: 'YES',
      cord: 'YES',
      sound: 'YES',
      bright: 'YES',
      cover: 'YES',
      cordstore: 'NO',
      charger: 'YES',
      test1: 'YES',
      test2: 'YES',
      test3: 'YES',
      test4: 'YES',
      test5: 'YES',
      test6: 'YES',
      sticker: 'YES',
      processor: 'YES',
      remark: '',
      perform: name.replace(' ', '+'),
      approved: 'ITTIPAT+IEMDEE',
    }
    Object.keys(data).forEach(k => {
      data[k] = encodeURIComponent(data[k]).replace(/%2B/g, '+')
    })
    data.checkresult = '%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%93%E0%B9%8C+(Complete)'



    let prefil = `${url}entry.834653595=Infusion+pump&entry.1707380228=${data.code}&entry.1707668999=${data.sn}&entry.700436956=${data.receive}&entry.915962501=${data.check}&entry.305193549=${data.dept}&entry.1895887679=${data.clean}&entry.259744882=${data.battery}&entry.417873991=${data.keypad}&entry.1895363362=${data.switch}&entry.1353477614=${data.cord}&entry.429943245=${data.sound}&entry.1894286831=${data.bright}&entry.1918554053=${data.cover}&entry.880941082=${data.cordstore}&entry.1288823110=${data.charger}&entry.1649940636=${data.test1}&entry.1187764432=${data.test2}&entry.1852281764=${data.test3}&entry.1085685004=${data.test4}&entry.293284534=${data.test5}&entry.2080375104=${data.test6}&entry.971649327=${data.sticker}&entry.169941144=${data.processor}&entry.1162966716=${data.checkresult}&entry.512526377=${data.remark}&entry.43478023=${data.perform}&entry.292809647=${data.approved}`
    return { method: "POST", url: prefil, muteHttpExceptions: true }
  })
  let res = UrlFetchApp.fetchAll(dataarr.filter(r => r))
  if (dataarr.filter(a => a).length == datamsg.length) {
    if (datamsg.length < 2) res = 'ok'
    else res = "ok " + datamsg.length + ' item(s)'
    return res
  } else {
    let found = ''
    let notfound = ''
    dataarr.forEach((d, i) => {
      if (d) {
        found += ('\n' + datamsg[i])
      } else {
        notfound += ('\n' + datamsg[i])
      }
    })
    let msg = ''
    if (found != '') msg += ('บันทึก' + found)
    if (notfound != '') msg += ('\nไม่พบรหัส' + notfound)
    return msg
  }
}
function addDataBennett840(code, name, working_hours, last_sst, do_est, last_est) {
  let sheetSNData = ss.getSheetByName('SN').getDataRange().getDisplayValues().filter(r => r[0] != '')
  let url = 'https://docs.google.com/forms/d/e/1FAIpQLSdN_zjcdWjPQkDOpFRwLDKOVOT68CiIUSqv8N7Xg3_8IvgGzA/formResponse?'
  let detail = getDetail(code, sheetSNData)
  if (!detail) return 'ไม่พบรหัสนี้'
  if (!detail.sn) detail.sn = ''
  let data = {
    name: 'VENTILATORS,+INTENSIVE+CARE',
    code: detail.code || '',
    sn: detail.sn || '',
    receive: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    check: Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    dept: detail.dept?.toUpperCase(),
    working_hours: working_hours || '',
    last_sst: last_sst || '',
    last_est: (do_est && do_est == 'false') ? '' : last_est,
    monitor: 'YES',
    cover: 'YES',
    switch: 'YES',
    cord: 'YES',
    cordstore: 'YES',
    oxygen: 'YES',
    air: 'YES',
    charger: 'YES',
    est: (do_est && do_est == 'false') ? 'NO' : 'YES',
    sst: 'YES',
    humidifier: 'YES',
    UPS: 'YES',
    wheel: 'YES',
    sticker: 'YES',
    status: 'YES',
    remark: '',
    perform: name.replace(' ', '+'),
    approved: 'ITTIPAT+IEMDEE',
  }
  Object.keys(data).forEach(k => {
    data[k] = encodeURIComponent(data[k]).replace(/%2B/g, '+')
  })
  data.checkresult = '%E0%B8%AA%E0%B8%A1%E0%B8%9A%E0%B8%B9%E0%B8%A3%E0%B8%93%E0%B9%8C+(Complete)'
  let prefill = `${url}entry.834653595=${data.name}&entry.1707380228=${data.code}&entry.1707668999=${data.sn}&entry.700436956=${data.receive}&entry.915962501=${data.check}&entry.305193549=${data.dept}&entry.88520604=${data.working_hours}&entry.1864701538=${data.last_est}&entry.1044728139=${data.last_sst}&entry.1894286831=${data.monitor}&entry.1918554053=${data.cover}&entry.880941082=${data.switch}&entry.1288823110=${data.cord}&entry.1649940636=${data.cordstore}&entry.1187764432=${data.oxygen}&entry.1852281764=${data.air}&entry.1085685004=${data.charger}&entry.293284534=${data.est}&entry.2080375104=${data.sst}&entry.971649327=${data.humidifier}&entry.169941144=${data.UPS}&entry.419752088=${data.wheel}&entry.330982978=${data.sticker}&entry.201281942=${data.status}&entry.1162966716=${data.checkresult}&entry.512526377=${data.remark}&entry.43478023=${data.perform}&entry.292809647=${data.approved}`
  Logger.log(prefill)

  UrlFetchApp.fetch(prefill, { method: "POST", muteHttpExceptions: true })
  return 'ok'
}

function getcode(code) {
  if (code.length >= 6) {
    code = "DEMO_" + (('000000' + code).slice(-6))
  } else {
    code = "PYT3_" + (('00000' + code).slice(-5))
  }
  return code
}

function getDetail(code, data) {
  if (code.length >= 6) code = ('000000' + code).slice(-6)
  let regex = '.*' + code
  // code = getcode(code)
  let index = data.findIndex(row => row[0].match(regex))
  if (index > -1) return {
    code: data[index][0],
    sn: data[index][4],
    dept: data[index][5]
  }
  else return false
}

function deleteData(datamsg) {
  sheet = ss.getSheetByName('data')
  let data = sheet.getDataRange().getDisplayValues()
  let msg = ''
  datamsg.map(r => r.replace('-', '')).forEach((id, d) => {
    let isdelete = false
    id = (id.length >= 6 ? ('000000' + id) : ('0000' + id)).slice(-4)
    for (let i = data.length - 1; i >= 0; i--) {

      if (data[i][1] == id) {
        sheet.deleteRow(i + 1)
        data.splice(i, 1)
        isdelete = true
        break;
      }
    }
    if (d > 0) msg += '\n'
    if (isdelete) msg += 'ลบ ' + id
    else msg += 'ไม่พบ ' + id
  })

  return msg
}

function generateQr(data = '1564') {
  let url = 'https://nsmart.nhealth-asia.com/mtdqrcode/asset_mast_show.php?login=1&code='
  sheet = ss.getSheetByName('Report (1)')
  let sheetdata = sheet.getDataRange().getDisplayValues()
  data = data.toLowerCase().replace('job', '')
  if (data.length >= 6) data = 'DEMO_' + ('000000' + data).slice(-6)
  else data = 'PYT3_' + ('00000' + data).slice(-5)
  let row = sheetdata.find(r => r[3] == data)
  if (row) {
    let msg = `Name: ${row[10]}
Brand/Model: ${row[11]}/${row[12]}
SN: ${row[13]}
${url}${row[19]}&openExternalBrowser=1`
    let res = { msg: msg, url: url + row[19] }
    return res
  } else {
    return false
  }
}


function pushToTeam() {
  let msg = `แจ้ง Team PM ครับ ขออนุญาตแจ้งวิธีการในการ "ลบข้อมูล" การ PM/CAL กรณีกรอกข้อมูลผิดครับ
  
  👉ให้พิมพ์เครื่องหมายลบ ตามด้วยไอดีที่ต้องการลบ เช่น -1234
  👉หากมีหลายไอดีให้พิมพ์เครื่องหมายลบ ตามด้วยไอดีที่ต้องการลบคั่นด้วยคอมม่า เช่น -1234,1235,1236
  
  ขอบคุณมากครับ`

  msg = {
    type: 'text',
    text: msg
  }
  LineBotWebhook.broadcast(line_token, [msg])
}

// function test() {
//   let form = FormApp.openById('1JMKlmjHdyxIzoxK-WjogkGFn7OqG0TYTymrG0yJ2ivw')
//   let qts = form.getItems()
//   let arr = [
//     qts[0].asMultipleChoiceItem().createResponse('Infusion pump'),
//     qts[1].asTextItem().createResponse('aaaaa'),
//     qts[2].asTextItem().createResponse(''),
//     qts[3].asDateItem().createResponse(new Date(2022, 5, 4)),
//     qts[4].asDateItem().createResponse(new Date(2022, 11, 4)),
//     qts[5].asTextItem().createResponse('aaaaaaa'),
//     // qts[6].asPageBreakItem(),
//     qts[7].asGridItem().createResponse(['YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES',
//       'YES']),

//     qts[8].asMultipleChoiceItem().createResponse('สมบูรณ์ (Complete)'),
//     qts[9].asTextItem().createResponse(''),
//     qts[10].asMultipleChoiceItem().createResponse('ANUPHAB CHANTO'),
//     qts[11].asMultipleChoiceItem().createResponse('PANALEE UEASUNTHONNOP'),
//   ]
//   let formResponse = form.createResponse()
//   arr.forEach(a => {
//     formResponse.withItemResponse(a)
//   })
//   formResponse.submit()

//   // response.withItemResponse(qts)
// }
