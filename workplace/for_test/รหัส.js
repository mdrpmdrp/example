var SPREADSHEET_FILE_ID = '1QSYcl4sHLAFjyNwzYvu5ZMfT2Dyvw1xrpBHOyPmnlcE';
var SHEET_NAME_TO_WRITE_DATA_TO = "Data";
var SHEET_NAME_TO_DROPDOWN_OPTIONS = "Options";
var SHEET_NAME_TO_DROPDOWN_LOCATIONS = "Locations";
// var FOLDER_ID = "XXXXXXXXXXXXXXXXX"; //รูปและเอกสารสมัครงาน
var FOLDER_ID = "1CEWlvFURW0X6uRa_uAAPDjyczE5cr329"; // for test

function getOptionValues(sheet, column) {
  var lastRow = sheet.getRange(1, column).getDataRegion().getLastRow();
  return sheet.getRange(2, column, Math.max(lastRow - 1, 0), 1).getValues();
}

function buildOptionMarkup(values) {
  return values.map(function(row) {
    return '<option>' + row[0] + '</option>';
  }).join('');
}

function getNextRunningNumber(passbm) {
  var rows = SpreadsheetApp.openById(SPREADSHEET_FILE_ID)
    .getSheetByName(SHEET_NAME_TO_WRITE_DATA_TO)
    .getRange('BM5:BN')
    .getValues();

  return rows.reduce(function(maxNum, row) {
    return row[0] === passbm && row[1] > maxNum ? row[1] : maxNum;
  }, 0) + 1;
}

function getValueOrDash(value) {
  return value === '' || value == null ? '-' : value;
}

function formatThaiDate(dateValue) {
  if (dateValue === '' || dateValue == null) {
    return '-';
  }

  var date = new Date(dateValue);
  return date.toLocaleDateString('th-TH', { day: 'numeric' }) +
    ' เดือน ' +
    date.toLocaleDateString('th-TH', { month: 'long' }) +
    ' ' +
    date.toLocaleDateString('th-TH', { year: 'numeric' });
}

function calculateAgeText(dateValue) {
  var birthDate = new Date(dateValue);
  var currentDate = new Date();
  var day = currentDate.getDate();
  var month = 1 + currentDate.getMonth();
  var year = currentDate.getFullYear();
  var birthDay = birthDate.getDate();
  var birthMonth = 1 + birthDate.getMonth();
  var birthYear = birthDate.getFullYear();
  var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (birthDay > day) {
    day = day + daysInMonth[month - 1];
    month = month - 1;
  }

  if (birthMonth > month) {
    month = month + 12;
    year = year - 1;
  }

  return (year - birthYear) + ' ปี ' + (month - birthMonth) + ' เดือน ' + (day - birthDay) + ' วัน';
}

function getApplicationFee(passbk) {
  return passbk === 'พนักงานมหาวิทยาลัยเงินแผ่นดิน' ? 200 : 100;
}

function pushLineNotification(obj, file1Label, file2Label) {
  const CHANNEL_ACCESS_TOKEN = 'XXXXXXXXXXXXXXXXXXXXXXX';
  const GROUP_ID = 'XXXXXXXXXXXXXXXX';

  const message = {
    to: GROUP_ID,
    messages: [
      {
        type: 'text',
        text: '\n' +'👨‍🎓 ชื่อ สกุล : ' + obj.firstname + ' ' + obj.lastname + '\n📍 ตำแหน่ง : ' + obj.passbk + ' \n📚 เลขที่ : ' + obj.passbn + '\n📁 ไฟล์ที่ 1 : ' + file1Label + '\n📁 ไฟล์ที่ 2 : ' + file2Label + '\n🔗 ลิ้งค์งาน : ' + obj.passbm
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(message)
  };

  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
}

function uploadApplicantFile(fileData, applicantName, index, originalName) {
  var blob = dataURItoBlob(fileData, applicantName, index, originalName);
  if (!blob) {
    return { url: '-', name: '-' };
  }

  var file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  return {
    url: file.getUrl(),
    name: file.getName()
  };
}

function doGet(e) {
  var ws = SpreadsheetApp.openById(SPREADSHEET_FILE_ID).getSheetByName(SHEET_NAME_TO_DROPDOWN_OPTIONS);
  var template = HtmlService.createTemplateFromFile('index');
  var params = (e && e.parameter) || {};
  var passbk = params.passbk || '---';
  var passbl = params.passbl || '---';
  var passbm = params.passbm || '---';

  template.list_prefix = buildOptionMarkup(getOptionValues(ws, 1));
  template.list_nation = buildOptionMarkup(getOptionValues(ws, 2));
  template.list_religion = buildOptionMarkup(getOptionValues(ws, 4));
  template.list_degree = buildOptionMarkup(getOptionValues(ws, 5));
  template.list_major = buildOptionMarkup(getOptionValues(ws, 6));
  template.list_highest = buildOptionMarkup(getOptionValues(ws, 7));
  template.list_province = buildOptionMarkup(getOptionValues(ws, 8));

  template.passbk = passbk;
  template.passbl = passbl;
  template.passbm = passbm;
  template.passbn = getNextRunningNumber(passbm);

  return template.evaluate()
    .setTitle('ใบสมัครงาน')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
}
 
function saveData(obj) {
  var currentUser = Session.getActiveUser().getEmail();  //Email User
  var emailAdmin = "supinya@ku.th, jariya.ph@ku.th"      //Email Address  
  Logger.log(currentUser);
  var link1 = obj.file1url || '-';
  var link2 = obj.file2url || '-';

  let lock = LockService.getScriptLock();
  lock.tryLock(3000);  //   lock.tryLock(10000); 19/11/2023
  if (!lock.hasLock()) {
    throw new Error('ไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  }

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_FILE_ID);
    var sheet = ss.getSheetByName(SHEET_NAME_TO_WRITE_DATA_TO);

    //
    var fbq = formatThaiDate(obj.birth);
    var fbs = formatThaiDate(obj.edubirth);
    var fbt = formatThaiDate(obj.military9);
    var fbv = formatThaiDate(new Date());
    var fbr = calculateAgeText(obj.birth);
    var fbu = getApplicationFee(obj.passbk);
    var colQ = getValueOrDash(obj.moo);
    var colR = getValueOrDash(obj.soi);
    var colS = getValueOrDash(obj.road);
    var colZ = getValueOrDash(obj.namespouse);
    var colAA = getValueOrDash(obj.nationspouse);
    var colAB = getValueOrDash(obj.religionspouse);
    var colAC = getValueOrDash(obj.careerspouse);
    var colAS = getValueOrDash(obj.special);
    var colAT = getValueOrDash(obj.language);
    var colAU = getValueOrDash(obj.work1);
    var colAV = getValueOrDash(obj.work2);
    var colAW = getValueOrDash(obj.work3);
    var colAY = getValueOrDash(obj.military2);
    var colAZ = getValueOrDash(obj.military3);
    var colBA = getValueOrDash(obj.military4);
    var colBB = getValueOrDash(obj.military5);
    var colBC = getValueOrDash(obj.military6);
    var colBD = getValueOrDash(obj.military7);
    var colBE = getValueOrDash(obj.military8);
    var colBF = getValueOrDash(obj.military9);
    var colBG = getValueOrDash(obj.military10);
    var colBH = getValueOrDash(obj.military11);
    var colBI = getValueOrDash(obj.military12);
    var colBJ = getValueOrDash(obj.military13);

    const newId = MyIMCLibrary.createNewId()
    sheet.appendRow([newId,new Date(),obj.prefix,obj.firstname,obj.lastname,obj.nation,obj.religion,"'"+obj.uid ,obj.provincecard,obj.amphoecard,obj.birth,'-',obj.provincebirth,obj.amphoebirth,obj.districtbirth, obj.address,colQ,colR,colS,obj.district,obj.amphoe,obj.province,obj.zipcode,"'"+obj.telephone,obj.email,colZ,colAA,colAB,colAC,obj.namedad,obj.nationdad,obj.religiondad,obj.careerdad,obj.namemom,obj.nationmom,obj.religionmom,obj.careermom,obj.degree,obj.major,obj.edubirth,obj.university,obj.uniprovince,obj.grade,obj.highest,colAS,colAT,colAU,colAV,colAW,obj.military1,colAY,colAZ,colBA,colBB,colBC,colBD,colBE,colBF,colBG,colBH,colBI,colBJ,obj.passbk,obj.position,obj.passbm,obj.passbn,currentUser,emailAdmin,fbq,fbr,fbs,fbt,fbu,fbv,"","","","รอการพิจารณาคุณวุฒิ","","","",link1,link2])

  //lastrow คือแถวสุดท้าย ซึ่งคอลัมน์ H แถวสุดท้าย(รหัสบัตรประชาชน) จะถูกดึงมาใช้
    var lastrow=sheet.getLastRow();
    var lastvalueK=sheet.getRange("H"+lastrow).getValue();
    var lastvalueBM=sheet.getRange("BM"+lastrow).getValue();

  //กำหนดสูตรนับข้อมูลรหัสของคอลัมน์ H ที่ตรงกับข้อมูลสุดท้าย ในที่นี้นำสูตรลงใน L ถ้าข้อมูลเรามีหลายคอลัมน์เราก็ต้องเลือกเซลอื่นที่ว่างๆ เช่น  I2, J3 หรือ K5 เป็นต้น
    var formula="=COUNTIFS(H:H,"+lastvalueK+",BM:BM,"+ '"'+lastvalueBM+'"'+")";
    // Logger.log(formula);
    sheet.getRange("BW"+lastrow).setFormula(formula);
    // Logger.log(sheet.getRange("BW"+lastrow).getValue());
  //เสร็จแล้วเราก็เชคค่าที่นับว่ามากกว่า 1(คือซ้ำ) หรือไม่ ถ้าซ้ำแถวสุดท้ายนั้นก็จะถูกลบออกไป
    if(sheet.getRange("BW"+lastrow).getValue()>1){
      sheet.deleteRow(lastrow);
      // pushLineNotification(obj, 'กรอกซ้ำ', 'กรอกซ้ำ');
      // throw new Error('พบข้อมูลการสมัครซ้ำ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง');
      return {
        error: 'พบข้อมูลการสมัครซ้ำ กรุณาตรวจสอบข้อมูลแล้วลองใหม่อีกครั้ง'
      }
    } else {
      // pushLineNotification(obj, link1, link2);
      return {
        applicationId: newId,
        applicantName: obj.firstname + ' ' + obj.lastname,
        applicationType: obj.passbk || '-',
        position: obj.position || '-',
        passbn: obj.passbn || '-'
      };
    }
  } finally {
    lock.releaseLock();
  }
}

function createPdfForSavedApplication(applicationId) {
  if (!applicationId) {
    throw new Error('ไม่พบรหัสรายการสำหรับสร้าง PDF');
  }

  var ss = SpreadsheetApp.openById(SPREADSHEET_FILE_ID);
  var sheet = ss.getSheetByName(SHEET_NAME_TO_WRITE_DATA_TO);
  var matchedCell = sheet.getRange('A:A').createTextFinder(applicationId).matchEntireCell(true).findNext();

  if (!matchedCell) {
    throw new Error('ไม่พบข้อมูลใบสมัครที่บันทึกไว้');
  }

  return createPdfForRow(sheet, matchedCell.getRow());
}

function createPdfForRow(sheet, iDataRow) {
  var existingUrl = sheet.getRange(iDataRow, 76).getValue();
  var existingName = sheet.getRange(iDataRow, 77).getValue();

  if (existingUrl && existingName) {
    return {
      url: existingUrl,
      name: existingName
    };
  }

  var colA = sheet.getRange('$A'+iDataRow).getValue(); //ไอดี
  var colB = Utilities.formatDate(sheet.getRange('$B'+iDataRow).getValue(), 'GMT+7', 'dd-MM-yyyy HH:mm:ss'); //ประทับเวลา
  var colC = sheet.getRange('$C'+iDataRow).getValue(); //คำนำหน้า
  var colD = sheet.getRange('$D'+iDataRow).getValue(); //ชื่อ
  var colE = sheet.getRange('$E'+iDataRow).getValue(); //นามสกุล
  var colF = sheet.getRange('$F'+iDataRow).getValue(); //สัญชาติ
  var colG = sheet.getRange('$G'+iDataRow).getValue(); //ศาสนา
  var colH = sheet.getRange('$H'+iDataRow).getValue(); //บัตรประจำตัวประชาชน
  var colI = sheet.getRange('$I'+iDataRow).getValue(); //จังหวัด
  var colJ = sheet.getRange('$J'+iDataRow).getValue(); //อำเภอเขต
  var colK = sheet.getRange('$K'+iDataRow).getValue(); //วันเกิด
  var colM = sheet.getRange('$M'+iDataRow).getValue(); //จังหวัดที่เกิด
  var colN = sheet.getRange('$N'+iDataRow).getValue(); //อำเภอที่เกิด
  var colO = sheet.getRange('$O'+iDataRow).getValue(); //ตำบลที่เกิด
  var colP = sheet.getRange('$P'+iDataRow).getValue(); //บ้านเลขที่
  var colQ = sheet.getRange('$Q'+iDataRow).getValue(); //หมู่ที่
  var colR = sheet.getRange('$R'+iDataRow).getValue(); //ซอย
  var colS = sheet.getRange('$S'+iDataRow).getValue(); //ถนน
  var colT = sheet.getRange('$T'+iDataRow).getValue(); //แขวง/ตำบล
  var colU = sheet.getRange('$U'+iDataRow).getValue(); //เขต/อำเภอ
  var colV = sheet.getRange('$V'+iDataRow).getValue(); //จังหวัดที่อยู่
  var colW = sheet.getRange('$W'+iDataRow).getValue(); //รหัสไปรษณีย์
  var colX2 = sheet.getRange('$X'+iDataRow).getValue(); //เบอร์โทรศัพท์
  var colX = String(colX2).padStart(10,0);
  var colY = sheet.getRange('$Y'+iDataRow).getValue(); //อีเมล์

  var colZ = sheet.getRange('$Z'+iDataRow).getValue(); //ชื่อภรรยาหรือสามี
  var colAA = sheet.getRange('$AA'+iDataRow).getValue(); //สัญชาติภรรยาหรือสามี
  var colAB = sheet.getRange('$AB'+iDataRow).getValue(); //ศาสนาภรรยาหรือสามี
  var colAC = sheet.getRange('$AC'+iDataRow).getValue(); //อาชีพภรรยาหรือสามี
  var colAD = sheet.getRange('$AD'+iDataRow).getValue(); //ชื่อบิดา
  var colAE = sheet.getRange('$AE'+iDataRow).getValue(); //สัญชาติบิดา
  var colAF = sheet.getRange('$AF'+iDataRow).getValue(); //ศาสนาบิดา
  var colAG = sheet.getRange('$AG'+iDataRow).getValue(); //อาชีพบิดา
  var colAH = sheet.getRange('$AH'+iDataRow).getValue(); //ชื่อมารดา
  var colAI = sheet.getRange('$AI'+iDataRow).getValue(); //สัญชาติมารดา
  var colAJ = sheet.getRange('$AJ'+iDataRow).getValue(); //ศาสนามารดา
  var colAK = sheet.getRange('$AK'+iDataRow).getValue(); //อาชีพมารดา

  var colAL = sheet.getRange('$AL'+iDataRow).getValue(); //วุฒิการศึกษาตรงตามตำแหน่งที่สมัคร
  var colAM = sheet.getRange('$AM'+iDataRow).getValue(); //สาขาวิชา
  var colAN = sheet.getRange('$AN'+iDataRow).getValue(); //วันที่ได้รับอนุมัติผลการศึกษา
  var colAO = sheet.getRange('$AO'+iDataRow).getValue(); //สถาบัน
  var colAP = sheet.getRange('$AP'+iDataRow).getValue(); //ตั้งอยู่จังหวัด
  var colAQ = sheet.getRange('$AQ'+iDataRow).getValue(); //GPA
  var colAR = sheet.getRange('$AR'+iDataRow).getValue(); //วุฒิการศึกษาสูงสุด
  var colAS = sheet.getRange('$AS'+iDataRow).getValue(); //ความรู้ความสามารถพิเศษ
  var colAT = sheet.getRange('$AT'+iDataRow).getValue(); //รู้ภาษาต่างประเทศ ภาษาใด เพียงใด
  var colAU = sheet.getRange('$AU'+iDataRow).getValue(); //ที่ทำงานล่าสุด
  var colAV = sheet.getRange('$AV'+iDataRow).getValue(); //ตำแหน่งสุดท้าย
  var colAW = sheet.getRange('$AW'+iDataRow).getValue(); //ลักษณะงาน
  var colAX = sheet.getRange('$AX'+iDataRow).getValue(); //เคยรับราชการหรือไม่
  var colAY = sheet.getRange('$AY'+iDataRow).getValue(); //เคยรับราชการเป็นข้าราชการ
  var colAZ = sheet.getRange('$AZ'+iDataRow).getValue(); //ตำแหน่ง

  var colBA = sheet.getRange('$BC'+iDataRow).getValue(); //แผนก
  var colBB = sheet.getRange('$BC'+iDataRow).getValue(); //กอง
  var colBC = sheet.getRange('$BC'+iDataRow).getValue(); //กรม
  var colBD = sheet.getRange('$BD'+iDataRow).getValue(); //กระทรวง
  var colBE = sheet.getRange('$BE'+iDataRow).getValue(); //ออกจากราชการเพราะ
  var colBF = sheet.getRange('$BF'+iDataRow).getValue(); //ออกจากราชการเมื่อวันที่
  var colBG = sheet.getRange('$BG'+iDataRow).getValue(); //ได้รับบำเหน็จ บำนาญ หรือเบี้ยหวัดจากกระทรวง
  var colBH = sheet.getRange('$BH'+iDataRow).getValue(); //เป็นจำนวนเงิน
  var colBI = sheet.getRange('$BI'+iDataRow).getValue(); //ขณะนี้ได้รับเบี้ยหวัด
  var colBJ = sheet.getRange('$BJ'+iDataRow).getValue(); //บำเหน็จบำนาญที่
  var colBK = sheet.getRange('$BK'+iDataRow).getValue(); //ประเภทตำแหน่ง
  var colBL = sheet.getRange('$BL'+iDataRow).getValue(); //ตำแหน่งงาน
  var colBM = sheet.getRange('$BM'+iDataRow).getValue(); //Job No
  var colBN = sheet.getRange('$BN'+iDataRow).getValue(); //เลขที่

  var colBO = sheet.getRange('$BO'+iDataRow).getValue(); //Email User
  var colBP = sheet.getRange('$BP'+iDataRow).getValue(); //Email Address
  var colBQ = sheet.getRange('$BQ'+iDataRow).getValue(); //BirthDate
  var colBR = sheet.getRange('$BR'+iDataRow).getValue(); //AgeBirthday
  var colBS = sheet.getRange('$BS'+iDataRow).getValue(); //GraduateDate
  var colBT = sheet.getRange('$BT'+iDataRow).getValue(); //ออกจากราชการเมื่อวันที่
  var colBU = sheet.getRange('$BU'+iDataRow).getValue(); //ค่าธรรมเนียมการสมัคร
  var colBV = sheet.getRange('$BV'+iDataRow).getValue(); //วันที่กรอกใบสมัคร
  var colCD = sheet.getRange('$CD'+iDataRow).getValue(); //รูปถ่ายหน้าตรง

  const pdfFile = createPDF(colA,colB,colC,colD,colE,colF,colG,colH,colI,colJ,colK,colM,colN,colO,colP,colQ,colR,colS,colT,colU,colV,colW,colX,colY,colZ,colAA,colAB,colAC,colAD,colAE,colAF,colAG,colAH,colAI,colAJ,colAK,colAL,colAM,colAN,colAO,colAP,colAQ,colAR,colAS,colAT,colAU,colAV,colAW,colAX,colAY,colAZ,colBA,colBB,colBC,colBD,colBE,colBF,colBG,colBH,colBI,colBJ,colBK,colBL,colBM,colBN,colBO,colBP,colBQ,colBR,colBS,colBT,colBU,colBV,colCD);

  if (colBN !== '') {
    sheet.getRange(iDataRow, 76).setValue(pdfFile.getUrl());
    sheet.getRange(iDataRow, 77).setValue(pdfFile.getName());
  }

  return {
    url: pdfFile.getUrl(),
    name: pdfFile.getName()
  };
}

function dataURItoBlob(dataURI,name, index, originalName) {
  if(dataURI == '') return false
  var type = (dataURI.split(";")[0]).replace('data:', '');
  var imageUpload = Utilities.base64Decode(dataURI.split(",")[1]);
  var extension = originalName && originalName.indexOf('.') > -1
    ? originalName.slice(originalName.lastIndexOf('.'))
    : '';
  var blob = Utilities.newBlob(imageUpload, type, name+ " ไฟล์ที่ "+index + extension);
  return blob;
}

function getData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_FILE_ID);    
  var sheet = ss.getSheetByName(SHEET_NAME_TO_DROPDOWN_LOCATIONS); 

  var data = sheet.getDataRange().getDisplayValues().slice(1)
  var obj ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj[colA]
      if(!firstCol){
          obj[colA] = {}
          obj[colA][colB] = [colC]
      }else{
        const secondCol = firstCol[colB]
        if(!secondCol){
          firstCol[colB] = [colC]
        }else{
          secondCol.push(colC)
        }
      }
    })
  return obj
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
         .getContent();
} 

function createPDF(colA,colB,colC,colD,colE,colF,colG,colH,colI,colJ,colK,colM,colN,colO,colP,colQ,colR,colS,colT,colU,colV,colW,colX,colY,colZ,colAA,colAB,colAC,colAD,colAE,colAF,colAG,colAH,colAI,colAJ,colAK,colAL,colAM,colAN,colAO,colAP,colAQ,colAR,colAS,colAT,colAU,colAV,colAW,colAX,colAY,colAZ,colBA,colBB,colBC,colBD,colBE,colBF,colBG,colBH,colBI,colBJ,colBK,colBL,colBM,colBN,colBO,colBP,colBQ,colBR,colBS,colBT,colBU,colBV,colCD) {          

  if (colBK == "พนักงานมหาวิทยาลัยเงินแผ่นดิน") {
    var templateDoc = DriveApp.getFileById('1kxyyBX4jslsvc7-itgUOmMbngnvMxsiIX7XF2XZVjPY')
  } else {
    var templateDoc = DriveApp.getFileById('1a3sFq13SEIb4XaGuZCY9NyTcMUinP911h4tx4TYIknE')
  }
  // const templateDoc = DriveApp.getFileById('1kxyyBX4jslsvc7-itgUOmMbngnvMxsiIX7XF2XZVjPY')  //slide
  const tempFolder = DriveApp.getFolderById('1OLKvqSA0u0njZyWAI7il7RgLKsg4wJ2Q')            //Temp
  const pdfFolder = DriveApp.getFolderById('14ReFs1On34j_Z05Ghxjgwv--e7yGfHMI')             //PDF

  var newTempFile = templateDoc.makeCopy(tempFolder);
  var openSlide = SlidesApp.openById(newTempFile.getId());

  const imageUrl = colCD //iData[0][66] ใน colCD ต้องไม่ = null ไม่เช่นนั้น pdf ไม่ได้
  // const imageUrl = info['รูปถ่ายหน้าตรง'][0]
  var image = imageUrl.match(/[\w\_\-]{25,}/)[0]; //const imageUrl = colCD ต้องไม่เป็น null
  var img = DriveApp.getFileById(image).getBlob(); 

  openSlide.getSlides().forEach(function(slide, i) {
    slide.getShapes().forEach(function(shape) {
      shape.getText().replaceAllText('{{ไอดี}}',colA)  
      shape.getText().replaceAllText('{{ประทับเวลา}}',colB)
      shape.getText().replaceAllText('{{คำนำหน้า}}',colC)
      shape.getText().replaceAllText('{{ชื่อ}}',colD)
      shape.getText().replaceAllText('{{นามสกุล}}',colE)
      shape.getText().replaceAllText('{{สัญชาติ}}',colF)
      shape.getText().replaceAllText('{{ศาสนา}}',colG)
      shape.getText().replaceAllText('{{บัตรประจำตัวประชาชน}}',colH)
      shape.getText().replaceAllText('{{จังหวัด}}',colI)
      shape.getText().replaceAllText('{{อำเภอเขต}}',colJ)
      shape.getText().replaceAllText('{{วันเกิด}}',colK)
      // shape.getText().replaceAllText('{{สถานภาพสมรส}}',colL)
      shape.getText().replaceAllText('{{จังหวัดที่เกิด}}',colM)
      shape.getText().replaceAllText('{{อำเภอที่เกิด}}',colN)
      shape.getText().replaceAllText('{{ตำบลที่เกิด}}',colO)

      shape.getText().replaceAllText('{{บ้านเลขที่}}',colP)
      shape.getText().replaceAllText('{{หมู่ที่}}',colQ)
      shape.getText().replaceAllText('{{ซอย}}',colR)
      shape.getText().replaceAllText('{{ถนน}}',colS)
      shape.getText().replaceAllText('{{แขวงตำบล}}',colT)
      shape.getText().replaceAllText('{{เขตอำเภอ}}',colU)
      shape.getText().replaceAllText('{{จังหวัดที่อยู่}}',colV)
      shape.getText().replaceAllText('{{รหัสไปรษณีย์}}',colW)
      shape.getText().replaceAllText('{{เบอร์โทรศัพท์}}',colX)
      shape.getText().replaceAllText('{{อีเมล์}}',colY)

      shape.getText().replaceAllText('{{ชื่อภรรยาหรือสามี}}',colZ)
      shape.getText().replaceAllText('{{สัญชาติภรรยาหรือสามี}}',colAA)
      shape.getText().replaceAllText('{{ศาสนาภรรยาหรือสามี}}',colAB)
      shape.getText().replaceAllText('{{อาชีพภรรยาหรือสามี}}',colAC)
      shape.getText().replaceAllText('{{ชื่อบิดา}}',colAD)
      shape.getText().replaceAllText('{{สัญชาติบิดา}}',colAE)
      shape.getText().replaceAllText('{{ศาสนาบิดา}}',colAF)
      shape.getText().replaceAllText('{{อาชีพบิดา}}',colAG)
      shape.getText().replaceAllText('{{ชื่อมารดา}}',colAH)
      shape.getText().replaceAllText('{{สัญชาติมารดา}}',colAI)
      shape.getText().replaceAllText('{{ศาสนามารดา}}',colAJ)
      shape.getText().replaceAllText('{{อาชีพมารดา}}',colAK)
      shape.getText().replaceAllText('{{วุฒิการศึกษาตรงตามตำแหน่งที่สมัคร}}',colAL)
      shape.getText().replaceAllText('{{สาขาวิชา}}',colAM)
      shape.getText().replaceAllText('{{วันที่ได้รับอนุมัติผลการศึกษา}}',colAN)

      shape.getText().replaceAllText('{{สถาบัน}}',colAO)
      shape.getText().replaceAllText('{{ตั้งอยู่จังหวัด}}',colAP)
      shape.getText().replaceAllText('{{GPA}}',colAQ)
      shape.getText().replaceAllText('{{วุฒิการศึกษาสูงสุด}}',colAR)
      shape.getText().replaceAllText('{{ความรู้ความสามารถพิเศษ}}',colAS)
      shape.getText().replaceAllText('{{รู้ภาษาต่างประเทศ}}',colAT)
      shape.getText().replaceAllText('{{ที่ทำงานล่าสุด}}',colAU)
      shape.getText().replaceAllText('{{ตำแหน่งสุดท้าย}}',colAV)
      shape.getText().replaceAllText('{{ลักษณะงาน}}',colAW)

      shape.getText().replaceAllText('{{เคยรับราชการหรือไม่}}',colAX)
      shape.getText().replaceAllText('{{เคยรับราชการเป็นข้าราชการ}}',colAY)
      shape.getText().replaceAllText('{{ตำแหน่ง}}',colAZ)

      shape.getText().replaceAllText('{{แผนก}}',colBA)
      shape.getText().replaceAllText('{{กอง}}',colBB)
      shape.getText().replaceAllText('{{กรม}}',colBC)
      shape.getText().replaceAllText('{{กระทรวง}}',colBD)
      shape.getText().replaceAllText('{{ออกจากราชการเพราะ}}',colBE)
      shape.getText().replaceAllText('{{ออกจากราชการเมื่อวันที่}}',colBF)
      shape.getText().replaceAllText('{{ได้รับบำเหน็จบำนาญหรือเบี้ยหวัดจากกระทรวง}}',colBG)
      shape.getText().replaceAllText('{{เป็นจำนวนเงิน}}',colBH)
      shape.getText().replaceAllText('{{ขณะนี้ได้รับเบี้ยหวัด}}',colBI)
      shape.getText().replaceAllText('{{บำเหน็จบำนาญที่}}',colBJ)
      shape.getText().replaceAllText('{{ประเภทตำแหน่ง}}',colBK)
      shape.getText().replaceAllText('{{ตำแหน่งงาน}}',colBL)
      shape.getText().replaceAllText('{{Job No}}',colBM)
      shape.getText().replaceAllText('{{เลขที่}}',colBN)  
      shape.getText().replaceAllText('{{Email User}}',colBO)      
      shape.getText().replaceAllText('{{Email Address}}',colBP)  
      shape.getText().replaceAllText('{{BirthDate}}',colBQ)  
      shape.getText().replaceAllText('{{AgeBirthday}}',colBR)  
      shape.getText().replaceAllText('{{GraduateDate}}',colBS)  
      shape.getText().replaceAllText('{{EarlyDate}}',colBT)  
      shape.getText().replaceAllText('{{ค่าธรรมเนียมการสมัคร}}',colBU)      
      shape.getText().replaceAllText('{{วันที่กรอกใบสมัคร}}',colBV)      

      var imageText = shape.getText().replaceAllText('{{รูปถ่ายหน้าตรง}}',"");    
      if(imageText == true && i == 0){
        var position = {left: -15, top: 124};
        var size = {width: 300, height: 100};
        slide.insertImage(img, position.left, position.top, size.width, size.height);

        var position2 = {left: -15, top: 444};
        var size = {width: 300, height: 100};
        slide.insertImage(img, position2.left, position2.top, size.width, size.height);
      } 
      if(imageText == true && i == 1){
        var position3 = {left: 355, top: 240};
        var size = {width: 300, height: 100};
        slide.insertImage(img, position3.left, position3.top, size.width, size.height);
      }
    })
  });        
  openSlide.saveAndClose()

  const blobPDF = newTempFile.getAs(MimeType.PDF)
  const date = Utilities.formatDate(new Date(), "GMT+7", "dd-MM-yyyy HH:mm")
  const pdfFile = pdfFolder.createFile(blobPDF).setName(colD+" "+colE+" "+date)
  tempFolder.removeFile(newTempFile)
  return pdfFile
}
