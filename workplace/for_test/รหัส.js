// Setting
let sheetName = 'Data'
let header    = 'A2:AC2' // -------------แก้ 1
let database  = 'A5:AC'  // -------------แก้ 2

function getData() {
  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  const headers = ws.getRange(header).getValues()[0];
  const data = ws.getRange(database + ws.getLastRow()).getValues();

  return JSON.stringify(data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  }));
}

function doGet() {
  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]  //Data
  var list_jobno = ws.getRange(5, 19, ws.getRange("S5").getDataRegion().getLastRow(),1).getValues();
  var htmlList_jobnoArray = list_jobno.map(function(r){ return '<option>' + r[0] + '</option>'; }).join('');

  var template = HtmlService.createTemplateFromFile('index');

  template.list_jobno = htmlList_jobnoArray;

  return template.evaluate()
      .setTitle('ประกาศรับสมัครงาน')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);   //responsive
}

//เพิ่มข้อมูล
function addRecord(obj, myFiles) {
  var currentUser = Session.getActiveUser().getEmail();  //Email User
  var emailAdmin  = "supinya@ku.th, jariya.ph@ku.th"     //Email Address

  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const data = ws.getRange(5,18,ws.getLastRow(),1).getValues()
  let lastRow = ws.getLastRow() + 1;
  var maxNum = 0
  data.forEach( r => {
    maxNum = Number(r[0]) > maxNum ? Number(r[0]) : maxNum  })

  var jobnewId = maxNum + 1
  if(jobnewId < 10){  
    jobno = "Job.00"+jobnewId
  } else if(jobnewId >= 10 && jobnewId <100){
    jobno = "Job.0"+jobnewId
  } else{
    jobno = "Job."+jobnewId
  }

  colY = '="'+"https://script.google.com/macros/s/AKfycby7B7V2ZVPLb2QoIdpxPN6aOeXF5TrXBiPW1kLzLDZstkyrNlLjLGAZLmOdSjJGDKS_/exec?passbk="+'"'+"&E"+lastRow+"&"+'"'+"&passbl="+'"'+"&F"+lastRow+"&"+'"'+"&passbm="+'"'+"&S"+lastRow+"&"+'""'

  const newId = Utilities.getUuid();

  myFiles = upLoadFile(myFiles)
  while (myFiles.length < 4) myFiles.push("");
  
  ws.appendRow([
    newId,
    new Date(),
    obj.colC,
    obj.colD,
    obj.colE,
    obj.colF,
    obj.colG,
    obj.colH,
    obj.colI,
    obj.colJ, // -------------แก้ 3
    obj.colK, 
    obj.colL,
    obj.colM, 
    obj.colN, 
    obj.colO,
    obj.colP, 
    obj.colQ,
    jobnewId,
    jobno,
    '',    
    currentUser,
    emailAdmin,
    '',      //Job Status
    '',      //News Show
    colY,
    ...myFiles

  ])
  return { newId: newId, fileUrl: myFiles }
}

//แก้ไขข้อมูล
function editRecord(obj, id) {
  var currentUser = Session.getActiveUser().getEmail();  //Email User
  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  let col = ws.getLastColumn()
  const custIds = ws.getRange(5, 1, ws.getLastRow() - 4, 1).getDisplayValues().map(r => r[0].toString().toLowerCase());
  const posIndex = custIds.indexOf(id.toString().toLowerCase());  
  const rowNumber = posIndex === -1 ? 0 : posIndex + 5
  let myFile  = replaceFile(obj.myFiles.myFile_edit,   ws.getRange(rowNumber, col-3).getValue())
  let myFile2 = replaceFile(obj.myFiles.myFile_edit_2, ws.getRange(rowNumber, col-2).getValue())
  let myFile3 = replaceFile(obj.myFiles.myFile_edit_3, ws.getRange(rowNumber, col-1).getValue())
  let myFile4 = replaceFile(obj.myFiles.myFile_edit_4, ws.getRange(rowNumber, col).getValue())
  var colR = ws.getRange(rowNumber,18).getValue()
  var colS = ws.getRange(rowNumber,19).getValue()
  var colT = ws.getRange(rowNumber,20).getValue()
  var colV = ws.getRange(rowNumber,22).getValue()
  
  colY = '="'+"https://script.google.com/macros/s/AKfycby7B7V2ZVPLb2QoIdpxPN6aOeXF5TrXBiPW1kLzLDZstkyrNlLjLGAZLmOdSjJGDKS_/exec?passbk="+'"'+"&E"+rowNumber+"&"+'"'+"&passbl="+'"'+"&F"+rowNumber+"&"+'"'+"&passbm="+'"'+"&S"+rowNumber+"&"+'""'
Logger.log("edit:"+colY)

  ws.getRange(rowNumber, 2, 1, col - 1).setValues([[
    new Date(),
    obj.colC,
    obj.colD,
    obj.colE,
    obj.colF,
    obj.colG,
    obj.colH,
    obj.colI,
    obj.colJ, // -----------แก้ 4
    obj.colK,
    obj.colL,
    obj.colM, 
    obj.colN, 
    obj.colO,
    obj.colP, 
    obj.colQ,   
    colR,
    colS,
    '',    
    currentUser,
    colV, 
    '',      //Job Status
    '',      //News Show
    colY,
    myFile,
    myFile2,
    myFile3,
    myFile4
  ]])
  return { fileUrl: [myFile, myFile2, myFile3, myFile4] };
};

//ลบข้อมูล
function deleteRecord(props) {
  const ws = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  const idCellMatched = ws.getRange("A5:A").createTextFinder(props.id).matchEntireCell(true).matchCase(true).findNext()
  if (idCellMatched === null) throw new Error("No matching record")
  const recordRowNumber = idCellMatched.getRow()
  let url1 = ws.getRange(recordRowNumber, ws.getLastColumn()-1).getValue()
  let url2 = ws.getRange(recordRowNumber, ws.getLastColumn()).getValue()
  let idFile1 = url1.split('id=')[1]
  let idFile2 = url2.split('id=')[1]
  if(url1 != ''){
  DriveApp.getFileById(idFile1).setTrashed(true)
  }
  if(url2 != ''){
  DriveApp.getFileById(idFile2).setTrashed(true)
  }
   ws.deleteRow(recordRowNumber)
  return true
}

//อัปโหลดไฟล์
function upLoadFile(filedatas) {
  if (!filedatas || Object.keys(filedatas).length === 0) return ["","","",""];

  // const folderId = '1mfhAFtOd5Yj0LRAKgTTz8kbI9uq35UmH';
  const folderId = '1CEWlvFURW0X6uRa_uAAPDjyczE5cr329'; // for test
  const folder = DriveApp.getFolderById(folderId);

  let results = ["","","",""]; // fix 4 ช่อง

  const keys = Object.keys(filedatas);

  keys.forEach((key, index) => {
    const fileData = filedatas[key];
    if (!fileData || !fileData.data) return;

    // 🔥 ตัด prefix base64 ออก
    const base64 = fileData.data.split(',')[1];

    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64),
      MimeType.PNG,
      fileData.name
    );

    const file = folder.createFile(blob);

    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    results[index] = `https://drive.google.com/uc?id=${file.getId()}`;
  });

  return results;
}

//แก้ไขไฟล์
function replaceFile(filedata, oldUrl) {
  if (!filedata || !filedata.data) return oldUrl;

  if (oldUrl) {
    let oldId = oldUrl.split('id=')[1];
    DriveApp.getFileById(oldId).setTrashed(true);
  }

  const base64 = filedata.data.split(',')[1];

  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64),
    MimeType.PNG,
    filedata.name
  );

  const file = DriveApp.getFolderById('1mfhAFtOd5Yj0LRAKgTTz8kbI9uq35UmH')
    .createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return `https://drive.google.com/uc?id=${file.getId()}`;
}

//add
function getDataList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1] 

  var data = ss.getRange(1, 1, ss.getRange("A1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj[colA]
      if(!firstCol){
          obj[colA] = {}
          obj[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 2, ss.getRange("B1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj2 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj2[colA]
      if(!firstCol){
          obj2[colA] = {}
          obj2[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 3, ss.getRange("C1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj3 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj3[colA]
      if(!firstCol){
          obj3[colA] = {}
          obj3[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 4, ss.getRange("D1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj4 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj4[colA]
      if(!firstCol){
          obj4[colA] = {}
          obj4[colA][colB] = [colC]
      }
    })
  return [obj,obj2,obj3,obj4]
}
// edit
function getDataList2() {
  var ss = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1] 

  var data = ss.getRange(1, 1, ss.getRange("A1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj[colA]
      if(!firstCol){
          obj[colA] = {}
          obj[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 2, ss.getRange("B1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj2 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj2[colA]
      if(!firstCol){
          obj2[colA] = {}
          obj2[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 3, ss.getRange("C1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj3 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj3[colA]
      if(!firstCol){
          obj3[colA] = {}
          obj3[colA][colB] = [colC]
      }
    })

  var data = ss.getRange(1, 4, ss.getRange("D1").getDataRegion().getLastRow(),1).getValues().slice(1);
  var obj4 ={}
      data.forEach(([colA,colB,colC])=>{
      const firstCol = obj4[colA]
      if(!firstCol){
          obj4[colA] = {}
          obj4[colA][colB] = [colC]
      }
    })
  return [obj,obj2,obj3,obj4]
}