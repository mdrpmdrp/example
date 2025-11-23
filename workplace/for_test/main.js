function onEditDone1234(e) {
  if (!e || !e.source) return;
  var sheet = e.source.getSheetByName("PDF");
  var range = e.range;
  

  if (sheet && range.getColumn() === 1) {
    var newValue = range.getValue();
    var rowIndex = range.getRow();
    var statusCol = 2;

    if (newValue === "Done") {
      sheet.getRange(rowIndex, statusCol).setValue("⏳ Loading...");
      generateSelectedDocuments(rowIndex, sheet);
      sheet.getRange(rowIndex, statusCol).setValue("✅ Completed");
    } else {
      sheet.getRange(rowIndex, statusCol).setValue("");
    }
  }
}

function formatNumberWithComma(value) {
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  if (!isNaN(value)) {
    return parseFloat(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  return value || "";
}


function generateSelectedDocuments(rowIndex, sheet) {
  if (rowIndex < 2) return; // Skip header row

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rowData = data[rowIndex - 1];

  // ✅ Cache header indexes
  // var columnIndex = headers.reduce((acc, header, i) => {
  //   acc[header.trim()] = i;
  //   return acc;
  // }, {});

  var columnIndex = headers.reduce((acc, header, i) => {
  if (typeof header === "string") {
    acc[header.trim()] = i;
  } else {
    acc[String(header || "").trim()] = i;
  }
  return acc;
}, {});

  var folder = DriveApp.getFolderById("1-BaRelzhIi1j180ugSCxkuVcy3PZqlEH");

  var templates = {
    "ใบเสร็จรับเงิน RDS Best": "1WbmV6o5s3ByB6IUGko001OnQXyUv3i2cEOMrAZN5dhk", //
    "ใบเสร็จรับเงิน RDS Best  อื่นๆ": "1wyCHwu-paLW2WvcYeGzukyiUd7G5NZKRkDcn_6YmRfQ",//
    "สัญญาวางเงินจองมัดจำ RDS Best": "12w4YCCxRqV-36oKAbS4UfocDwqcU6uZ13Y9IU1nB0s0",//
    "ยกเลิกการวางจองห้อง": "1I-WjMq3UWeNNEBdz79gfpUUQ77LGFm0t-u4rw9bja3Y",//
    "สัญญานายหน้า บริษัท อาร์ดีเอส เบสท์ แอสเซ็ทส์ จำกัด": "1EkmLUOgacXlLV56wn0vkkwAZLbR0VsBP6YKWniMQnQw",
    // "ฟอร์มสัญญาเช่า": "16gCDMAuvO3agjdLdZOirMR8Rev6hAcClzAJl2mTAp3k",
    "ฟอร์มสัญญาเช่า": "1NTqMqOwlWVFfUW0GWpInMabpwy7KEO2kWzLJhQfbUHs",
    "หนังสือบอกกล่าวเลิกสัญญาเช่า": "1qLfyIi_dOqi52xlU7Iv0C5B_j82sdIQ2DVTcTBFk-MM"
  };

  var lastColumn = sheet.getLastColumn();
  var docColumns = {};

  Object.keys(templates).forEach((docName) => {
    var colIndex = headers.indexOf(docName);
    if (colIndex === -1) {
      lastColumn++;
      sheet.getRange(1, lastColumn).setValue(docName);
      docColumns[docName] = lastColumn;
    } else {
      docColumns[docName] = colIndex + 1;
    }
  });


  var placeholders = {
    "{{เลขที่ใบเสร็จ}}": rowData[columnIndex["เลขที่ใบเสร็จ"]] || "",
    "{{วันที่ทำสัญญา}}": formatDate(rowData[columnIndex["วันที่ทำสัญญา"]]) || "",
    "{{วันที่จอง}}": formatDate(rowData[columnIndex["วันที่จอง"]]) || "",
    "{{ชื่อ1}}": rowData[columnIndex["ชื่อ - สกุล เจ้าของ"]] || "",
    // "{{นามสกุล1}}": rowData[columnIndex["นามสกุล(ผู้รับเงิน)"]] || "",
    "{{เลขบัตรประชาชน1}}": rowData[columnIndex["เลขบัตรประชาชน เจ้าของ"]] || "",
    "{{ที่อยู่1}}": rowData[columnIndex["ที่อยู่ เจ้าของ"]] || "",
    "{{เบอร์ติดต่อ1}}": rowData[columnIndex["เบอร์ติดต่อ เจ้าของ"]] || "",
    "{{ชื่อนามสกุลลูกค้า}}": rowData[columnIndex["ชื่อนามสกุล(ลูกค้า)"]] || "",
    "{{เลขบัตรประชาชน2}}": rowData[columnIndex["เลขบัตรประชาชนลูกค้า"]] || "",
    "{{ที่อยู่2}}": rowData[columnIndex["ที่อยู่ ลูกค้า"]] || "",
    "{{เบอร์ติดต่อ2}}": rowData[columnIndex["เบอร์ติดต่อ(ผู้จ่ายเงิน)"]] || "",
    "{{เพื่อชำระค่า}}": rowData[columnIndex["เพื่อชำระค่า"]] || "",
    "{{ประเภททรัทย์}}": rowData[columnIndex["ประเภททรัทย์"]] || "",
    "{{วิธีชำระเงิน}}": rowData[columnIndex["วิธีชำระเงิน"]] || "",
    // "{{รวมเป็นเงินทั้งสิ้น}}": rowData[columnIndex["รวมเป็นเงินทั้งสิ้น"]] || "",
    "{{คำไทย}}": rowData[columnIndex["คำไทย"]] || "",
    "{{ระยะเวลาเช่า}}": rowData[columnIndex["ระยะเวลาเช่า"]] || "",
    "{{วันที่เริ่มต้นสัญญา}}": formatDate(rowData[columnIndex["วันที่เริ่มต้นสัญญา"]]) || "",
    "{{วันที่สิ้นสุดสัญญา}}": formatDate(rowData[columnIndex["วันที่สิ้นสุดสัญญา"]]) || "",
    // "{{ชำระ ภายใน}}": formatDate(rowData[columnIndex["ชำระ ภายใน"]]) || "",
    "{{สถานะการจ่าย}}": rowData[columnIndex["สถานะการจ่าย"]] || "",
    "{{โครงสร้างภาษาไทย}}": rowData[columnIndex["โครงสร้างภาษาไทย"]] || "",
    "{{โครงสร้างภาษาอังกฤษ}}": rowData[columnIndex["โครงสร้างภาษาอังกฤษ"]] || "",
    "{{ที่ตั้งโครงการ}}": rowData[columnIndex["ที่ตั้งโครงการ"]] || "",
    "{{วันที่วางจอง}}": formatDate(rowData[columnIndex["วันที่วางจอง"]]) || "",
    "{{เลขที่ห้อง}}": rowData[columnIndex["เลขที่ห้อง"]] || "",
    "{{ชั้น}}": rowData[columnIndex["ชั้น"]] || "",
    "{{ตึก}}": rowData[columnIndex["ตึก"]] || "",
    // "{{ราคาเช่า}}": rowData[columnIndex["ราคาเช่า"]] || "",
    // "{{ราคาเช่า1}}": rowData[columnIndex["ราคาเช่า(ภาษาไทย)"]] || "",
    "{{คำอังกฤษ}}": rowData[columnIndex["คำอังกฤษ"]] || "",
    // "{{วางจองล่วงหน้า 1 เดือน}}": rowData[columnIndex["วางจองล่วงหน้า 1 เดือน"]] || "",
    // "{{ค่าประกัน 2 เดือน}}": rowData[columnIndex["ค่าประกัน 2 เดือน"]] || "",
    // "{{วางจองไทย}}": rowData[columnIndex["วางจองไทย"]] || "",
    // "{{วางจอง เขียนเป็นตัวหนังสือ en}}": rowData[columnIndex["วางจอง เขียนเป็นตัวหนังสือ en"]] || "",
    "{{ค่าประกัน  ไทย}}": rowData[columnIndex["ค่าประกัน  ไทย"]] || "",
    "{{ค่าประกัน  Eng}}": rowData[columnIndex["ค่าประกัน  Eng"]] || "",
    "{{ภายในวันที่}}": formatDate(rowData[columnIndex["ชำระทุกวันที่"]]) || "",
    "{{สถานะการจ่าย}}": formatDate(rowData[columnIndex["สถานะการจ่าย"]]) || "",
    "{{ลงชื่อ พยาน}}": rowData[columnIndex["ลงชื่อ พยาน"]] || "",
    "{{สาเหตุ}}": rowData[columnIndex["สาเหตุ"]] || "",
    "{{กำหนดย้ายออกภายใน}}": formatDate(rowData[columnIndex["กำหนดย้ายออกภายใน"]]) || "",
    "{{คนที่ ยกเลิก วางจอง}}": rowData[columnIndex["คนที่ ยกเลิก วางจอง"]] || "",
    "{{เลขที่ใบเสร็จอื่นๆ}}": rowData[columnIndex["เลขที่ใบเสร็จ(อื่นๆ)"]] || "",
    "{{วันที่ทำสัญญาอื่นๆ}}": formatDate(rowData[columnIndex["วันที่ทำสัญญา(อื่นๆ)"]]) || "",
    "{{ชื่อ1อื่นๆ}}": rowData[columnIndex["ชื่อ(ผู้รับเงิน)(อื่นๆ)"]] || "",
    "{{นามสกุล1อื่นๆ}}": rowData[columnIndex["นามสกุล(ผู้รับเงิน)(อื่นๆ)"]] || "",
    "{{เลขบัตรประชาชน1อื่นๆ}}": rowData[columnIndex["เลขบัตรประชาชน(ผู้รับเงิน)(อื่นๆ)"]] || "",
    "{{ที่อยู่1อื่นๆ}}": rowData[columnIndex["ที่อยู่(ผู้รับเงิน)(อื่นๆ)"]] || "",
    "{{ชื่อ-นามสกุล2อื่นๆ}}": rowData[columnIndex["ชื่อ-นามสกุล(ผู้จ่ายเงิน)(อื่นๆ)"]] || "",
    "{{เลขบัตรประชาชน2อื่นๆ}}": rowData[columnIndex["เลขบัตรประชาชน(ผู้จ่ายเงิน)(อื่นๆ)"]] || "",
    "{{ที่อยู่2อื่นๆ}}": rowData[columnIndex["ที่อยู่(ผู้จ่ายเงิน)(อื่นๆ)"]] || "",
    "{{เบอร์ติดต่อ2อื่นๆ}}": rowData[columnIndex["เบอร์ติดต่อ(ผู้จ่ายเงิน)(อื่นๆ)"]] || "",
    "{{เพื่อชำระค่าอื่นๆ}}": rowData[columnIndex["เพื่อชำระค่า(อื่นๆ)"]] || "",
    "{{วิธีชำระเงินอื่นๆ}}": rowData[columnIndex["วิธีชำระเงิน(อื่นๆ)"]] || "",
    // "{{รวมเป็นเงินทั้งสิ้นอื่นๆ}}": rowData[columnIndex["รวมเป็นเงินทั้งสิ้น(อื่นๆ)"]] || "",
    "{{NamePayee}}": rowData[columnIndex["Name owner"]] || "",
    // "{{IDPayee}}": rowData[columnIndex["ID Card Number (Payee)"]] || "",
    "{{NamePerson}}": rowData[columnIndex["Name CT"]] || "",
    "{{IDPerson}}": rowData[columnIndex["ID Card Number CT"]] || "",
    "{{ชื่อบัญชี}}": rowData[columnIndex["ชื่อบัญชี"]] || "",
    "{{ธนาคาร}}": rowData[columnIndex["ธนาคาร"]] || "",
    "{{เลขที่บัญชี}}": rowData[columnIndex["เลขที่บัญชี"]] || "",

    "{{คำไทยอื่นๆ}}": rowData[columnIndex["คำไทย(อื่นๆ)"]] || "",

    // 2/5/68
    "{{รหัสสัญญา}}": rowData[columnIndex["รหัสสัญญา"]] || "", //ยังไม่เพิ่ม

    //7/5/68
    "{{ค่าเช่า}}": formatNumberWithComma(rowData[columnIndex["ค่าเช่า"]]),
    "{{ค่าประกัน 2 เดือน}}": formatNumberWithComma(rowData[columnIndex["ค่าประกัน 2 เดือน"]]),
    "{{ค่าเช่าอื่นๆ}}": formatNumberWithComma(rowData[columnIndex["ค่าเช่า(อื่นๆ)"]]),

    //18/05/68 และมีเปลี่ยนคอลัม รวมเป็นเงินทั้งสิ้น เป็น ค่าเช่า
    "{{เลขที่เอกสาร}}": rowData[columnIndex["เลขที่ใบเสร็จ"]] || "",
    "{{วันที่ทำสัญญาแค่วัน}}": rowData[columnIndex["วันที่ทำสัญญาแค่วัน"]] || "",
    "{{ที่ตั้งโครงการภาษาอังกฤษ}}": rowData[columnIndex["ที่ตั้งโครงการภาษาอังกฤษ"]] || "",
    "{{ค่าปรับรายวัน}}": rowData[columnIndex["ค่าปรับรายวัน"]] || "",
    


  };

  var paymentMethod = rowData[columnIndex["วิธีชำระเงิน"]] ? rowData[columnIndex["วิธีชำระเงิน"]].trim() : "";

  Object.keys(templates).forEach((docName) => {
    try {
      var templateFile = DriveApp.getFileById(templates[docName]);
      var copy = templateFile.makeCopy(docName + " ของ " + rowData[columnIndex["ชื่อนามสกุล(ลูกค้า)"]], folder);

      copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var doc = DocumentApp.openById(copy.getId());
      var body = doc.getBody();

      Object.keys(placeholders).forEach((key) => body.replaceText(key, placeholders[key]));

      body.replaceText("{{เงินสด}}", paymentMethod === "เงินสด/Cash" ? "✔" : "");
      body.replaceText("{{เงินโอน}}", paymentMethod === "เงินโอน/Transfer" ? "✔" : "");

      doc.saveAndClose();

      var url = "https://docs.google.com/document/d/" + copy.getId();
      var docColumnIndex = docColumns[docName];
      if (docColumnIndex > 0) {
        sheet.getRange(rowIndex, docColumnIndex).setFormula(`=HYPERLINK("${url}", "เปิดเอกสาร")`);
      }
    } catch (e) {
      Logger.log("❌ Error processing " + docName + " for row " + rowIndex + ": " + e.message);
    }
  });
}

// ✅ ฟังก์ชันช่วยแปลงวันที่
function formatDate(dateValue) {
  return dateValue instanceof Date ? Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy") : dateValue || "";
}
