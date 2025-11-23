// function onEditDone1234(e) {
//   if (!e || !e.source) {
//     Logger.log("Event object is undefined");
//     return;
//   }
//   var sheet = e.source.getActiveSheet();
//   var range = e.range;

//   if (sheet.getName() === "PDF" && range.getColumn() === 1) {
//     var newValue = range.getValue();
//     var rowIndex = range.getRow();
//     var statusCol = 2; // สมมติ "Status" อยู่คอลัมน์ B

//     if (newValue === "Done") {
//       // ✅ แสดง Loading...
//       sheet.getRange(rowIndex, statusCol).setValue("⏳ Loading...");

//       generateSelectedDocuments(rowIndex);

//       // ✅ เมื่อเสร็จ แสดง Completed
//       sheet.getRange(rowIndex, statusCol).setValue("✅ Completed");
//     } else {
//       // ✅ ถ้าไม่ใช่ Done ให้ลบค่าใน Status
//       sheet.getRange(rowIndex, statusCol).setValue("");
//     }
//   }
// }


// function generateSelectedDocuments(rowIndex) {
//   var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//   var data = sheet.getDataRange().getValues();

//   if (rowIndex < 2) return; // ข้าม Header แถวแรก

//   var headers = data[0]; // ดึง Header จากแถวแรก
//   var rowData = data[rowIndex - 1]; // ข้อมูลของแถวที่เลือก

//   // ✅ สร้าง object สำหรับจับคู่ Header กับ index
//   var columnIndex = {};
//   headers.forEach((header, index) => {
//     columnIndex[header.trim()] = index;
//   });

//   // ✅ ตั้งค่าโฟลเดอร์ปลายทาง และ Template ID
//   var folderId = "1lWJs3RqJHZIUIzI_FnuhPWr0jFi_kUJn";
//   var folder = DriveApp.getFolderById(folderId);

//   var templates = {
//     "ใบเสร็จรับเงิน RDS Best": "1hAo2br2jzDNrMP1hMuxbJ1ME1KyBx-zyrEm_At4-eKM",
//     "ใบเสร็จรับเงิน RDS Best  บริษัท": "1ezj_Xtu2WOIO8oVzXrJNiBPzlKYXNoJ0Bn6XBtOto3c",
//     "สัญญาวางเงินจองมัดจำ RDS Best": "1qnlN-02oRbyF5xugXuB9-9jB2tmLIcVOb6yvwjkmacQ",
//     "ยกเลิกการวางจองห้อง": "11mBQsfEBiS4uTpHIfHokjyJygi64-rZygApVV3W0I6s",
//     "สัญญานายหน้า บริษัท อาร์ดีเอส เบสท์ แอสเซ็ทส์ จำกัด": "1eAeKGlYt4Pqnw94aOKymflLkbuNqrPH7XVAn8QHuMAM",
//     "ฟอร์มสัญญาเช่า": "16gCDMAuvO3agjdLdZOirMR8Rev6hAcClzAJl2mTAp3k",
//     "หนังสือบอกกล่าวเลิกสัญญาเช่า": "1_AiCb3a9Zn2gI4YQoQa1qIGG_XL3OXjq_GUd-zVq_jg",

//   };

//   var docColumns = {};
//   var lastColumn = sheet.getLastColumn();

//   Object.keys(templates).forEach(function (docName) {
//     var colIndex = headers.indexOf(docName);
//     if (colIndex === -1) {
//       lastColumn++;
//       sheet.getRange(1, lastColumn).setValue(docName);
//       docColumns[docName] = lastColumn;
//     } else {
//       docColumns[docName] = colIndex + 1;
//     }
//   });

//   Logger.log("✔ Processing row " + rowIndex);

//   for (var docName in templates) {
//     try {
//       var templateFile = DriveApp.getFileById(templates[docName]);
//       var copy = templateFile.makeCopy(docName + " ของ " + rowData[columnIndex["ชื่อ"]], folder);
//       Logger.log("📄 Created File: " + copy.getName());

//       copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

//       var doc = DocumentApp.openById(copy.getId());
//       var body = doc.getBody();

//       // ✅ ดึงข้อมูลจาก Sheet โดยใช้ชื่อคอลัมน์แทน index
//       var placeholders = {
//         "{{เลขที่ใบเสร็จ}}": rowData[columnIndex["เลขที่ใบเสร็จ"]] || "",
//         "{{}}": rowData[columnIndex[""]] || "",
//         "{{วันที่ทำสัญญา}}": formatDate(rowData[columnIndex["วันที่ทำสัญญา"]])|| "",
//         "{{ชื่อ}}": rowData[columnIndex["ชื่อ(ผู้รับเงิน)"]] || "",
//         "{{นามสกุล}}": rowData[columnIndex["นามสกุล(ผู้รับเงิน)"]] || "",
//         "{{เลขบัตรประชาชน}}": rowData[columnIndex["เลขบัตรประชาชน(ผู้รับเงิน)"]] || "",
//         "{{ที่อยู่}}": rowData[columnIndex["ที่อยู่(ผู้รับเงิน)"]] || "",
//         "{{ชื่อ-นามสกุล}}": rowData[columnIndex["ชื่อ-นามสกุล(ผู้จ่ายเงิน)"]] || "",
//         "{{เลขบัตรประชาชน1}}": rowData[columnIndex["เลขบัตรประชาชน(ผู้จ่ายเงิน)"]] || "",
//         "{{ที่อยู่(ผู้จ่ายเงิน)}}": rowData[columnIndex["ที่อยู่(ผู้จ่ายเงิน)"]] || "",
//         "{{เพื่อชำระค่า}}": rowData[columnIndex["เพื่อชำระค่า"]] || "",
//         "{{รวมเป็นเงินทั้งสิ้น}}": rowData[columnIndex["รวมเป็นเงินทั้งสิ้น"]] || "",
//         "{{คำไทย}}": rowData[columnIndex["คำไทย"]] || "",
//         "{{จำนวนเดือนสัญญา}}": rowData[columnIndex["จำนวนเดือนสัญญา"]] || "",
//         "{{วันที่เริ่มต้นสัญญา}}": formatDate(rowData[columnIndex["วันที่เริ่มต้นสัญญา"]]|| ""),
//         "{{วันที่สิ้นสุดสัญญา}}": formatDate(rowData[columnIndex["วันที่สิ้นสุดสัญญา"]]|| "")
//       };

//       for (var key in placeholders) {
//         body.replaceText(key, placeholders[key]);
//       }

//       // ✅ กำหนดช่อง "✔" ตามประเภทการชำระเงิน
//       var paymentMethod = rowData[columnIndex["วิธีชำระเงิน"]] ? rowData[columnIndex["วิธีชำระเงิน"]].trim() : "";
//       body.replaceText("{{เงินสด}}", paymentMethod === "เงินสด/Cash" ? "✔" : "");
//       body.replaceText("{{เงินโอน}}", paymentMethod === "เงินโอน/Transfer" ? "✔" : "");

//       doc.saveAndClose();

//       var url = "https://docs.google.com/document/d/" + copy.getId();
//       Logger.log("✅ Created: " + url);

//       var docColumnIndex = docColumns[docName];
//       if (docColumnIndex > 0) {
//         sheet.getRange(rowIndex, docColumnIndex).setFormula(`=HYPERLINK("${url}", "เปิดเอกสาร")`);
//       }
//     } catch (e) {
//       Logger.log("❌ Error processing " + docName + " for row " + rowIndex + ": " + e.message);
//     }
//   }
// }

// // ✅ ฟังก์ชันช่วยแปลงวันที่
// function formatDate(dateValue) {
//   return (dateValue instanceof Date)
//     ? Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy")
//     : dateValue || "";
// }
