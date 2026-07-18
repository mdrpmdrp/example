const TELEGRAM_BOT_TOKEN = '8099419803:AAE9aWn5qJAoFg9gybTFXg2quQPcUgAb-v0';
const TELEGRAM_CHAT_ID = '-5209851491';
const PARSE_MODE = 'HTML';


function fireExtinguisherData(barcode, location, floor, coords, count, install_date, exp_date, image, e_type, warranty, size, properties, department, recorder) {
  let message = `<b>🧯เพิ่ม ถังดับเพลิง</b>\n\n
<b>Barcode</b> : ${barcode.split("?data=")[1].split('&')[0]}\n
<b>สถานที่</b> : ${location}\n
<b>ชั้น</b> : ${floor}\n
<b>Location</b> : <a href="https://www.google.com/maps/search/?api=1&query=${coords.replace(/ /g, '')}">คลิกเพื่อดูแผนที่</a>\n
<b>จำนวน</b> : ${count} ถัง\n
<b>วันติดตั้ง</b> : ${Utilities.formatDate(new Date(install_date), Session.getScriptTimeZone(), "dd/MM/yyyy")}\n
<b>วันหมดอายุ</b> : ${Utilities.formatDate(new Date(exp_date), Session.getScriptTimeZone(), "dd/MM/yyyy")}\n
<b>ประเภท</b> : ${e_type}\n
<b>การรับประกัน</b> : ${warranty}\n
<b>ขนาด</b> : ${size}\n
<b>คุณสมบัติ</b> : ${properties}\n
<b>แผนก</b> : ${department}\n
<b>ผู้บันทึก</b> : ${recorder}`;

  if (image) {
    sendPhotoToTelegram(image, message);
  } else {
    sendMessageToTelegram(message);
  }
}

function fireExtinguisherCheck(checkDate, qrCode, image, tank, pressureGuage, pipe, bolt, handle, expire_date, keepClear, found, checker, remarks, refId) {
  let [fmt_tank, fmt_pressureGuage, fmt_pipe, fmt_bolt, fmt_handle, fmt_expire_date, fmt_keepClear, fmt_found] = [tank, pressureGuage, pipe, bolt, handle, expire_date, keepClear, found].map(item => {
    let [result, text, img] = item.split("|").map(i => i.trim());
    return {
      pass: result === "Y",
      result: result === "Y" ? "✅ปกติ" : "❌ไม่ปกติ",
      text: text || "",
      img: (img || "").endsWith("fileName=") ? "" : img || ""
    }
  });
  let pdfFile = findPdfFileByRefId(refId);
  console.log("PDF File URL:", pdfFile);
  let message = `<b>🧯ตรวจสอบ ถังดับเพลิง</b>\n\n
<b>วันที่ตรวจสอบ</b> : ${Utilities.formatDate(new Date(checkDate), Session.getScriptTimeZone(), "dd/MM/yyyy")}\n
<b>QR Code</b> : ${qrCode}\n
<b>สภาพถัง : </b> ${fmt_tank.result}
${fmt_tank.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_tank.text} ${fmt_tank.img ? `<a href="${fmt_tank.img}">ดูรูป</a>` : ""}\n`  }
<b>มาตรวัดความดัน : </b> ${fmt_pressureGuage.result}
${fmt_pressureGuage.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_pressureGuage.text} ${fmt_pressureGuage.img ? `<a href="${fmt_pressureGuage.img}">ดูรูป</a>` : ""}\n`  }
<b>สายฉีด,หัวฉีด : </b> ${fmt_pipe.result}
${fmt_pipe.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_pipe.text} ${fmt_pipe.img ? `<a href="${fmt_pipe.img}">ดูรูป</a>` : ""}\n`  }
<b>สลักและซีล : </b> ${fmt_bolt.result}
${fmt_bolt.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_bolt.text} ${fmt_bolt.img ? `<a href="${fmt_bolt.img}">ดูรูป</a>` : ""}\n`  }
<b>คันบีบ : </b> ${fmt_handle.result}
${fmt_handle.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_handle.text} ${fmt_handle.img ? `<a href="${fmt_handle.img}">ดูรูป</a>` : ""}\n`  }
<b>วันหมดอายุ</b> : <b> ${fmt_expire_date.result}</b>
${fmt_expire_date.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_expire_date.text} ${fmt_expire_date.img ? `<a href="${fmt_expire_date.img}">ดูรูป</a>` : ""}\n`  }
<b>ไม่มีสิ่งกีดขวาง : </b> ${fmt_keepClear.result}
${fmt_keepClear.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_keepClear.text} ${fmt_keepClear.img ? `<a href="${fmt_keepClear.img}">ดูรูป</a>` : ""}\n`  }
<b>อยู่ตรงกับป้าย</b> : ${fmt_found.result}
${fmt_found.pass ? "" : `<b>ความพบพร่องที่พบ</b> : ${fmt_found.text} ${fmt_found.img ? `<a href="${fmt_found.img}">ดูรูป</a>` : ""}\n`  }
<b>ผู้ตรวจสอบ</b> : ${checker}\n
<b>หมายเหตุ</b> : ${remarks || ""}`;
if(pdfFile) {
  message += `\n<b>รายงาน PDF</b> : <a href="${pdfFile}">คลิกเพื่อดูรายงาน</a>`;
}
  if (image) {
    sendPhotoToTelegram(image, message);
  } else {
    sendMessageToTelegram(message);
  }
}

function sendMessageToTelegram(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: PARSE_MODE
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

function sendPhotoToTelegram(image, caption) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    photo: image,
    caption: caption,
    parse_mode: PARSE_MODE,
    show_caption_above_media: true
  };
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}

function maintenamceDueAlert(){
  let alertBeforeDays = 30;
  let ss = SpreadsheetApp.openById('10wYYbm6VBwq7itarxg6w0SPS7lnb5Apj-vfP_XprTak')
  let sheet = ss.getSheetByName("ข้อมูลการ Maintenance");
  let data = sheet.getDataRange().getValues();
  let headers = data.shift();
  let today = new Date();
  let dueDateIndex = 5;
  let statusIndex = 7; // สถานะการดำเนินการ
  data = data.filter(row => row[statusIndex] !== "OK" && row[dueDateIndex] instanceof Date && !isNaN(row[dueDateIndex].getTime()));
  let timezone = Session.getScriptTimeZone();
  let alertDate = new Date(today.getTime() + (alertBeforeDays * 24 * 60 * 60 * 1000));
  let alertDateFormatted = Utilities.formatDate(alertDate, timezone, "yyyyMMdd");
  data.forEach(row => {
    let dueDate = Utilities.formatDate(new Date(row[dueDateIndex]), timezone, "yyyyMMdd");
    if(dueDate === alertDateFormatted) {
      let message = `<b>🧯แจ้งเตือน การเปลี่ยนอุปกรณ์</b>\n
<b>วันที่</b> : ${Utilities.formatDate(new Date(row[dueDateIndex]), timezone, "dd/MM/yyyy")}\n
<b>อุปกรณ์</b> : ${row[2]}\n
<b>รหัสอุปกรณ์</b> : ${row[1]}\n
<b>วันเริ่มใช้งาน</b> : ${Utilities.formatDate(new Date(row[0]), timezone, "dd/MM/yyyy")}\n
<b>อายุอุปกรณ์</b> : ${formatDay(row[3])}\n
<b>อายุการใช้งาน</b> : ${formatDay(row[4])}\n
<b>วันที่ควรเปลี่ยนอุปกรณ์</b> : ${Utilities.formatDate(new Date(row[dueDateIndex]), timezone, "dd/MM/yyyy")}\n
<b>เกินกำหนด</b> : ${formatDay(row[4]- row[3])}\n`
      sendMessageToTelegram(message);
    }

  })   
}

function formatDay(days) {
  // format to ปี เดือน วัน
  let years = Math.floor(days / 365);
  let months = Math.floor((days % 365) / 30);
  let remainingDays = days - (years * 365) - (months * 30);
  let result = "";
  if (years > 0) {
    result += `${years} ปี `;
  }
  if (months > 0) {
    result += `${months} เดือน `;
  }
  if (remainingDays > 0) {
    result += `${remainingDays} วัน`;
  }
  return result;
}

function findPdfFileByRefId(refId) {
  const FOLDER_ID = '1yJP0pvEGwmwwbrdZJKW7JuVg3_-IwQGm';
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const searchString = `title contains '${refId}' and mimeType = 'application/pdf' and trashed = false`;
  const files = folder.searchFiles(searchString);
  if (files.hasNext()) {
    return files.next().getUrl();
  } else {
    return undefined;
  }
}