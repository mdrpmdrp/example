// 03/04/2026 23:38.

// Setting
let sheetName = 'Data'
let header = 'A2:CF2' // --------------แก้ 1
let database = 'A5:CF' // -------------แก้ 2

function getData() {
  let jsData = MyIMCLibrary.createMyJSONdata(sheetName, header, database)
  return JSON.stringify(jsData)
}

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ws = ss.getSheetByName("Data");
  var list_jobno = ws.getRange(5, 19, ws.getRange("S5").getDataRegion().getLastRow(), 1).getValues();
  var htmlList_jobnoArray = list_jobno.map(function (r) { return '<option>' + r[0] + '</option>'; }).join('');

  var template = HtmlService.createTemplateFromFile('index');

  template.list_jobno = htmlList_jobnoArray;

  // Build and return HTML in IFRAME sandbox mode.
  return template.evaluate()
    .setTitle('ข้อมูลของผู้สมัคร')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);   //responsive
}

//เพิ่มข้อมูล
function addRecord(obj, myFiles) {
  var currentUser = Session.getActiveUser().getEmail();  //Email User
  var emailAdmin = "supinya@ku.th, jariya.ph@ku.th"      //Email Address

  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const data = ws.getRange(5, 65, ws.getLastRow(), 1).getValues()

  var maxNum = 0
  data.forEach(r => {
    maxNum = r[0] > maxNum ? r[0] : maxNum
  })
  var jobnewId = maxNum + 1
  if (jobnewId < 10) {
    jobno = "Job.00" + jobnewId
  }
  else if (jobnewId >= 10 && jobnewId < 100) {
    jobno = "Job.0" + jobnewId
  }
  else {
    jobno = "Job." + jobnewId
  }

  const newId = Utilities.getUuid();
  myFiles = upLoadFile(myFiles)
  ws.appendRow([
    newId,
    new Date(),
    obj.colC,
    obj.colD,
    obj.colE,
    obj.colF,
    obj.colG,
    "'" + obj.colH,
    obj.colI,
    obj.colJ, // -------------แก้ 3
    obj.colK,
    obj.colL,
    obj.colM,
    obj.colN,
    obj.colO,
    obj.colP,
    obj.colQ,
    obj.colR,
    obj.colS,
    obj.colT,
    obj.colU,
    obj.colV,
    obj.colW,
    "'" + obj.colX,
    obj.colY,
    obj.colZ,
    obj.colAA,
    obj.colAB,
    obj.colAC,
    obj.colAD,
    obj.colAE,
    obj.colAF,
    obj.colAG,
    obj.colAH,
    obj.colAI,
    obj.colAJ,
    obj.colAK,
    obj.colAL,
    obj.colAM,
    obj.colAN,
    obj.colAO,
    obj.colAP,
    obj.colAQ,
    obj.colAR,
    obj.colAS,
    obj.colAT,
    obj.colAU,
    obj.colAV,
    obj.colAW,
    obj.colAX,
    obj.colAY,
    obj.colAZ,
    obj.colBA,
    obj.colBB,
    obj.colBC,
    obj.colBD,
    obj.colBE,
    obj.colBF,
    obj.colBG,
    obj.colBH,
    obj.colBI,
    obj.colBJ,
    '',
    '',
    jobnewId,
    jobno,
    '66',
    currentUser,
    emailAdmin,
    ...myFiles

  ])
  return { newId: newId, fileUrl: myFiles }
}

//แก้ไขข้อมูล
function editRecord(obj, id) {
  var currentUser = Session.getActiveUser().getEmail();  //Email User
  var emailAdmin = "supinya@ku.th, jariya.ph@ku.th"      //Email Address

  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  let col = ws.getLastColumn()
  const custIds = ws.getRange(5, 1, ws.getLastRow() - 4, 1).getDisplayValues().map(r => r[0].toString().toLowerCase());
  const posIndex = custIds.indexOf(id.toString().toLowerCase());
  const rowNumber = posIndex === -1 ? 0 : posIndex + 5
  let myFile = replaceFile(obj.myFiles.myFile_edit, ws.getRange(rowNumber, col - 2).getValue())
  let myFile2 = replaceFile(obj.myFiles.myFile_edit_2, ws.getRange(rowNumber, col - 1).getValue())
  let myFile3 = replaceFile(obj.myFiles.myFile_edit_3, ws.getRange(rowNumber, col).getValue())

  if (obj.colQ == "" || obj.colQ == null) { var colQ = "-" } else { var colQ = obj.colQ }
  if (obj.colR == "" || obj.colR == null) { var colR = "-" } else { var colR = obj.colR }
  if (obj.colS == "" || obj.colS == null) { var colS = "-" } else { var colS = obj.colS }
  if (obj.colZ == "" || obj.colZ == null) { var colZ = "-" } else { var colZ = obj.colZ }
  if (obj.colAA == "" || obj.colAA == null) { var colAA = "-" } else { var colAA = obj.colAA }
  if (obj.colAB == "" || obj.colAB == null) { var colAB = "-" } else { var colAB = obj.colAB }
  if (obj.colAC == "" || obj.colAC == null) { var colAC = "-" } else { var colAC = obj.colAC }
  if (obj.colAY == "" || obj.colAY == null) { var colAY = "-" } else { var colAY = obj.colAY }
  if (obj.colAZ == "" || obj.colAZ == null) { var colAZ = "-" } else { var colAZ = obj.colAZ }
  if (obj.colBA == "" || obj.colBA == null) { var colBA = "-" } else { var colBA = obj.colBA }
  if (obj.colBB == "" || obj.colBB == null) { var colBB = "-" } else { var colBB = obj.colBB }
  if (obj.colBC == "" || obj.colBC == null) { var colBC = "-" } else { var colBC = obj.colBC }
  if (obj.colBD == "" || obj.colBD == null) { var colBD = "-" } else { var colBD = obj.colBD }
  if (obj.colBE == "" || obj.colBE == null) { var colBE = "-" } else { var colBE = obj.colBE }
  if (obj.colBG == "" || obj.colBG == null) { var colBG = "-" } else { var colBG = obj.colBG }
  if (obj.colBH == "" || obj.colBH == null) { var colBH = "-" } else { var colBH = obj.colBH }
  if (obj.colBI == "" || obj.colBI == null) { var colBI = "-" } else { var colBI = obj.colBI }
  if (obj.colBJ == "" || obj.colBJ == null) { var colBJ = "-" } else { var colBJ = obj.colBJ }

  var colBK = ws.getRange(rowNumber, 63).getValue()
  var colBL = ws.getRange(rowNumber, 64).getValue()
  var colBM = ws.getRange(rowNumber, 65).getValue()
  var colBN = ws.getRange(rowNumber, 66).getValue()
  var colBO = ws.getRange(rowNumber, 67).getValue()
  var colBP = ws.getRange(rowNumber, 68).getValue()
  var colBQ = new Date(obj.colK)
  var fbq = colBQ.toLocaleDateString("th-TH", { day: "numeric" }) + " เดือน " + colBQ.toLocaleDateString("th-TH", { month: "long" }) + " " + colBQ.toLocaleDateString("th-TH", { year: "numeric" })
  //อายุ
  var y1 = colBQ.getFullYear();
  var m1 = 1 + colBQ.getMonth();
  var d1 = colBQ.getDate();
  var curdate = new Date();
  var d2 = curdate.getDate();
  var m2 = 1 + curdate.getMonth();
  var y2 = curdate.getFullYear();

  var month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (d1 > d2) {
    d2 = d2 + month[m2 - 1];
    m2 = m2 - 1;
  }
  if (m1 > m2) {
    m2 = m2 + 12;
    y2 = y2 - 1;
  }
  var d = d2 - d1;
  var m = m2 - m1;
  var y = y2 - y1;

  var fbr = y + " ปี " + m + " เดือน " + d + " วัน"

  var colBS = new Date(obj.colAN)
  var fbs = colBS.toLocaleDateString("th-TH", { day: "numeric" }) + " เดือน " + colBS.toLocaleDateString("th-TH", { month: "long" }) + " " + colBS.toLocaleDateString("th-TH", { year: "numeric" })

  if (obj.colBF == "" || obj.colBF == null) {
    var fbt = "-"
  } else {
    var colBT = new Date(obj.colBF) //  ออกจากราชการเมื่อวันที่
    var fbt = colBT.toLocaleDateString("th-TH", { day: "numeric" }) + " เดือน " + colBT.toLocaleDateString("th-TH", { month: "long" }) + " " + colBT.toLocaleDateString("th-TH", { year: "numeric" })
  }

  var colBU = ws.getRange(rowNumber, 73).getValue()
  var colBV = ws.getRange(rowNumber, 74).getValue()
  var colBW = ws.getRange(rowNumber, 75).getValue()
  var colBX = ws.getRange(rowNumber, 76).getValue()
  var colBY = ws.getRange(rowNumber, 77).getValue()
  var colBZ = ws.getRange(rowNumber, 78).getValue()
  var colCA = ws.getRange(rowNumber, 79).getValue()
  var colCB = ws.getRange(rowNumber, 80).getValue()
  var colCC = ws.getRange(rowNumber, 81).getValue()
  var colB = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss")

  ws.getRange(rowNumber, 2, 1, col - 1).setValues([[
    colB,   //new Date()
    obj.colC,
    obj.colD,
    obj.colE,
    obj.colF,
    obj.colG,
    "'" + obj.colH,
    obj.colI,
    obj.colJ, // -----------แก้ 4
    obj.colK,
    obj.colL,
    obj.colM,
    obj.colN,
    obj.colO,
    obj.colP,
    colQ,
    colR,
    colS,
    obj.colT,
    obj.colU,
    obj.colV,
    obj.colW,
    "'" + obj.colX,
    obj.colY,
    colZ,
    colAA,
    colAB,
    colAC,
    obj.colAD,
    obj.colAE,
    obj.colAF,
    obj.colAG,
    obj.colAH,
    obj.colAI,
    obj.colAJ,
    obj.colAK,
    obj.colAL,
    obj.colAM,
    obj.colAN,
    obj.colAO,
    obj.colAP,
    obj.colAQ,
    obj.colAR,
    obj.colAS,
    obj.colAT,
    obj.colAU,
    obj.colAV,
    obj.colAW,
    obj.colAX,
    colAY,
    colAZ,
    colBA,
    colBB,
    colBC,
    colBD,
    colBE,
    obj.colBF,
    colBG,
    colBH,
    colBI,
    colBJ,
    colBK,
    colBL,
    colBM,
    colBN,
    colBO,
    colBP,
    fbq,
    fbr,
    fbs,
    fbt,
    colBU,
    colBV,
    colBW,
    colBX,
    colBY,
    colBZ,
    colCA,
    colCB,
    colCC,
    myFile,
    myFile2,
    myFile3
  ]])
  const pdfFile = createPDF(obj.colA, colB, obj.colC, obj.colD, obj.colE, obj.colF, obj.colG, obj.colH, obj.colI, obj.colJ, obj.colK, obj.colL, obj.colM, obj.colN, obj.colO, obj.colP, colQ, colR, colS, obj.colT, obj.colU, obj.colV, obj.colW, obj.colX, obj.colY, colZ, colAA, colAB, colAC, obj.colAD, obj.colAE, obj.colAF, obj.colAG, obj.colAH, obj.colAI, obj.colAJ, obj.colAK, obj.colAL, obj.colAM, obj.colAN, obj.colAO, obj.colAP, obj.colAQ, obj.colAR, obj.colAS, obj.colAT, obj.colAU, obj.colAV, obj.colAW, obj.colAX, colAY, colAZ, colBA, colBB, colBC, colBD, colBE, obj.colBF, colBG, colBH, colBI, colBJ, colBK, colBL, colBM, colBN, colBO, colBP, fbq, fbr, fbs, fbt, colBU, colBV, myFile)
  if (colBN !== "") { //เลขที่ form อื่น จะได้ไม่ error
    ws.getRange(rowNumber, 76).setValue(pdfFile.getUrl())
    ws.getRange(rowNumber, 77).setValue(pdfFile.getName())
  }
  return { fileUrl: [myFile, myFile2, myFile3] };
};

function createPDF(colA, colB, colC, colD, colE, colF, colG, colH, colI, colJ, colK, colL, colM, colN, colO, colP, colQ, colR, colS, colT, colU, colV, colW, colX, colY, colZ, colAA, colAB, colAC, colAD, colAE, colAF, colAG, colAH, colAI, colAJ, colAK, colAL, colAM, colAN, colAO, colAP, colAQ, colAR, colAS, colAT, colAU, colAV, colAW, colAX, colAY, colAZ, colBA, colBB, colBC, colBD, colBE, colBF, colBG, colBH, colBI, colBJ, colBK, colBL, colBM, colBN, colBO, colBP, colBQ, colBR, colBS, colBT, colBU, colBV, colCD) {

  if (colBK == "พนักงานมหาวิทยาลัยเงินแผ่นดิน") {
    var templateDoc = DriveApp.getFileById('YYYYY')
  } else {
    var templateDoc = DriveApp.getFileById('ZZZZZ')
  }
  // const templateDoc = DriveApp.getFileById('1kxyyBX4jslsvc7-itgUOmMbngnvMxsiIX7XF2XZVjPY')  //slide
  const tempFolder = DriveApp.getFolderById('AAAAA')            //Temp
  const pdfFolder = DriveApp.getFolderById('AAAAA')             //PDF

  var newTempFile = templateDoc.makeCopy(tempFolder);
  var openSlide = SlidesApp.openById(newTempFile.getId());

  const imageUrl = colCD //iData[0][66] ใน colCD ต้องไม่ = null ไม่เช่นนั้น pdf ไม่ได้
  // const imageUrl = info['รูปถ่ายหน้าตรง'][0]
  var image = imageUrl.match(/[\w\_\-]{25,}/)[0]; //const imageUrl = colCD ต้องไม่เป็น null
  var img = DriveApp.getFileById(image).getBlob();

  openSlide.getSlides().forEach(function (slide, i) {
    slide.getShapes().forEach(function (shape) {
      shape.getText().replaceAllText('{{ไอดี}}', colA)
      shape.getText().replaceAllText('{{ประทับเวลา}}', colB)
      shape.getText().replaceAllText('{{คำนำหน้า}}', colC)
      shape.getText().replaceAllText('{{ชื่อ}}', colD)
      shape.getText().replaceAllText('{{นามสกุล}}', colE)
      shape.getText().replaceAllText('{{สัญชาติ}}', colF)
      shape.getText().replaceAllText('{{ศาสนา}}', colG)
      shape.getText().replaceAllText('{{บัตรประจำตัวประชาชน}}', colH)
      shape.getText().replaceAllText('{{จังหวัด}}', colI)
      shape.getText().replaceAllText('{{อำเภอเขต}}', colJ)
      shape.getText().replaceAllText('{{วันเกิด}}', colK)
      shape.getText().replaceAllText('{{สถานภาพสมรส}}', colL)
      shape.getText().replaceAllText('{{จังหวัดที่เกิด}}', colM)
      shape.getText().replaceAllText('{{อำเภอที่เกิด}}', colN)
      shape.getText().replaceAllText('{{ตำบลที่เกิด}}', colO)

      shape.getText().replaceAllText('{{บ้านเลขที่}}', colP)
      shape.getText().replaceAllText('{{หมู่ที่}}', colQ)
      shape.getText().replaceAllText('{{ซอย}}', colR)
      shape.getText().replaceAllText('{{ถนน}}', colS)
      shape.getText().replaceAllText('{{แขวงตำบล}}', colT)
      shape.getText().replaceAllText('{{เขตอำเภอ}}', colU)
      shape.getText().replaceAllText('{{จังหวัดที่อยู่}}', colV)
      shape.getText().replaceAllText('{{รหัสไปรษณีย์}}', colW)
      shape.getText().replaceAllText('{{เบอร์โทรศัพท์}}', colX)
      shape.getText().replaceAllText('{{อีเมล์}}', colY)

      shape.getText().replaceAllText('{{ชื่อภรรยาหรือสามี}}', colZ)
      shape.getText().replaceAllText('{{สัญชาติภรรยาหรือสามี}}', colAA)
      shape.getText().replaceAllText('{{ศาสนาภรรยาหรือสามี}}', colAB)
      shape.getText().replaceAllText('{{อาชีพภรรยาหรือสามี}}', colAC)
      shape.getText().replaceAllText('{{ชื่อบิดา}}', colAD)
      shape.getText().replaceAllText('{{สัญชาติบิดา}}', colAE)
      shape.getText().replaceAllText('{{ศาสนาบิดา}}', colAF)
      shape.getText().replaceAllText('{{อาชีพบิดา}}', colAG)
      shape.getText().replaceAllText('{{ชื่อมารดา}}', colAH)
      shape.getText().replaceAllText('{{สัญชาติมารดา}}', colAI)
      shape.getText().replaceAllText('{{ศาสนามารดา}}', colAJ)
      shape.getText().replaceAllText('{{อาชีพมารดา}}', colAK)
      shape.getText().replaceAllText('{{วุฒิการศึกษาตรงตามตำแหน่งที่สมัคร}}', colAL)
      shape.getText().replaceAllText('{{สาขาวิชา}}', colAM)
      shape.getText().replaceAllText('{{วันที่ได้รับอนุมัติผลการศึกษา}}', colAN)

      shape.getText().replaceAllText('{{สถาบัน}}', colAO)
      shape.getText().replaceAllText('{{ตั้งอยู่จังหวัด}}', colAP)
      shape.getText().replaceAllText('{{GPA}}', colAQ)
      shape.getText().replaceAllText('{{วุฒิการศึกษาสูงสุด}}', colAR)
      shape.getText().replaceAllText('{{ความรู้ความสามารถพิเศษ}}', colAS)
      shape.getText().replaceAllText('{{รู้ภาษาต่างประเทศ}}', colAT)
      shape.getText().replaceAllText('{{ที่ทำงานล่าสุด}}', colAU)
      shape.getText().replaceAllText('{{ตำแหน่งสุดท้าย}}', colAV)
      shape.getText().replaceAllText('{{ลักษณะงาน}}', colAW)

      shape.getText().replaceAllText('{{เคยรับราชการหรือไม่}}', colAX)
      shape.getText().replaceAllText('{{เคยรับราชการเป็นข้าราชการ}}', colAY)
      shape.getText().replaceAllText('{{ตำแหน่ง}}', colAZ)

      shape.getText().replaceAllText('{{แผนก}}', colBA)
      shape.getText().replaceAllText('{{กอง}}', colBB)
      shape.getText().replaceAllText('{{กรม}}', colBC)
      shape.getText().replaceAllText('{{กระทรวง}}', colBD)
      shape.getText().replaceAllText('{{ออกจากราชการเพราะ}}', colBE)
      shape.getText().replaceAllText('{{ออกจากราชการเมื่อวันที่}}', colBF)
      shape.getText().replaceAllText('{{ได้รับบำเหน็จบำนาญหรือเบี้ยหวัดจากกระทรวง}}', colBG)
      shape.getText().replaceAllText('{{เป็นจำนวนเงิน}}', colBH)
      shape.getText().replaceAllText('{{ขณะนี้ได้รับเบี้ยหวัด}}', colBI)
      shape.getText().replaceAllText('{{บำเหน็จบำนาญที่}}', colBJ)
      shape.getText().replaceAllText('{{ประเภทตำแหน่ง}}', colBK)
      shape.getText().replaceAllText('{{ตำแหน่งงาน}}', colBL)
      shape.getText().replaceAllText('{{Job No}}', colBM)
      shape.getText().replaceAllText('{{เลขที่}}', colBN)
      shape.getText().replaceAllText('{{Email User}}', colBO)
      shape.getText().replaceAllText('{{Email Address}}', colBP)
      shape.getText().replaceAllText('{{BirthDate}}', colBQ)
      shape.getText().replaceAllText('{{AgeBirthday}}', colBR)
      shape.getText().replaceAllText('{{GraduateDate}}', colBS)
      shape.getText().replaceAllText('{{EarlyDate}}', colBT)
      shape.getText().replaceAllText('{{ค่าธรรมเนียมการสมัคร}}', colBU)
      shape.getText().replaceAllText('{{วันที่กรอกใบสมัคร}}', colBV)

      var imageText = shape.getText().replaceAllText('{{รูปถ่ายหน้าตรง}}', "");
      if (imageText == true && i == 0) {
        var position = { left: -15, top: 124 };
        var size = { width: 300, height: 100 };
        slide.insertImage(img, position.left, position.top, size.width, size.height);

        var position2 = { left: -15, top: 444 };
        var size = { width: 300, height: 100 };
        slide.insertImage(img, position2.left, position2.top, size.width, size.height);
      }
      if (imageText == true && i == 1) {
        var position3 = { left: 355, top: 240 };
        var size = { width: 300, height: 100 };
        slide.insertImage(img, position3.left, position3.top, size.width, size.height);
      }
    })
  });
  openSlide.saveAndClose()

  const blobPDF = newTempFile.getAs(MimeType.PDF)
  const date = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm")
  const pdfFile = pdfFolder.createFile(blobPDF).setName(colD + " " + colE + " " + date)
  tempFolder.removeFile(newTempFile)
  return pdfFile
}

//ลบข้อมูล
function deleteRecord(props) {
  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const idCellMatched = ws.getRange("A5:A").createTextFinder(props.id).matchEntireCell(true).matchCase(true).findNext()
  if (idCellMatched === null) throw new Error("No matching record")
  const recordRowNumber = idCellMatched.getRow()
  let url1 = ws.getRange(recordRowNumber, ws.getLastColumn() - 2).getValue()
  let url2 = ws.getRange(recordRowNumber, ws.getLastColumn() - 1).getValue()
  let url3 = ws.getRange(recordRowNumber, ws.getLastColumn()).getValue()

  let idFile1 = url1.split('id=')[1]
  let idFile2 = url2.split('id=')[1]
  let idFile3 = url3.split('id=')[1]

  if (url1 != '') {
    DriveApp.getFileById(idFile1).setTrashed(true)
  }
  if (url2 != '') {
    DriveApp.getFileById(idFile2).setTrashed(true)
  }
  if (url3 != '') {
    DriveApp.getFileById(idFile3).setTrashed(true)
  }
  ws.deleteRow(recordRowNumber)
  return true
}

//อัปโหลดไฟล์
const FOLDER_ID = 'XXXX'
function upLoadFile(filedatas) {
  if (!filedatas || Object.keys(filedatas).length == 0) return ''
  let imgs = Object.keys(filedatas).map(key => {
    let file = SuperScript.uploadFile(FOLDER_ID, filedatas[key].data, filedatas[key].name)
    return 'https://drive.google.com/file/d/' + file.getId()
  })
  return imgs
}

function getFileId(fileUrl) {
  if (!fileUrl || fileUrl == '') return undefined
  if(fileUrl.includes('id=')) {
    return fileUrl.split('id=')[1]
  } else if(fileUrl.includes('/d/')) {
    return fileUrl.split('/d/')[1].split('/')[0]
  }
  return undefined
}

//แก้ไขไฟล์
function replaceFile(filedata, oldUrl) {
  if (!filedata || !filedata.data) return oldUrl
  Logger.log("Old URL: " + oldUrl)
  if (oldUrl && oldUrl != '') {
    let oldFileid = getFileId(oldUrl)
    DriveApp.getFileById(oldFileid).setTrashed(true)
  }
  let file = SuperScript.uploadFile(FOLDER_ID, filedata.data, filedata.name)
  return 'https://drive.google.com/file/d/' + file.getId()
}
//let file = SuperScript.uploadFile('1MWsmo84D7gro7Um2JQX1Fo4miCttguvN', filedata.data, filedata.name)

// edit
function getDataList2() {
  const ss = SpreadsheetApp.getActiveSpreadsheet().getSheets()[2];
  const columns = [1, 2, 4, 2, 4, 2, 4, 2, 4, 7, 8];
  
  return columns.map(col => {
    const data = ss.getRange(1, col, ss.getRange(String.fromCharCode(64 + col) + "1").getDataRegion().getLastRow(), 1).getValues().slice(1);
    const obj = {};
    data.forEach(([colA]) => {
      if (!obj[colA]) {
        obj[colA] = {};
      }
    });
    return obj;
  });
}
