// function onOpen() {
//   const ui = SpreadsheetApp.getUi();
//   ui.createMenu("📄 สร้างเอกสาร")
//     .addItem("🔄 สร้างเอกสารตามแถวที่กรอก", "handleGenerateRowByPrompt")
//     .addToUi();
// }

// function handleGenerateRowByPrompt() {
//   const ui = SpreadsheetApp.getUi();
//   const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PDF");

//   if (!sheet) {
//     ui.alert("❌ ไม่พบชีตชื่อ 'PDF'");
//     return;
//   }

//   const result = ui.prompt("📄 โปรดกรอกหมายเลขแถวที่ต้องการสร้างเอกสาร", ui.ButtonSet.OK_CANCEL);
//   if (result.getSelectedButton() !== ui.Button.OK) return;

//   const rowIndex = parseInt(result.getResponseText(), 10);

//   if (isNaN(rowIndex) || rowIndex < 2) {
//     ui.alert("❌ กรุณากรอกเลขแถวที่ถูกต้อง (ตั้งแต่ 2 ขึ้นไป)");
//     return;
//   }

//   try {
//     const statusCol = 2;
//     sheet.getRange(rowIndex, statusCol).setValue("⏳ Loading...");

//     Logger.log("📥 เริ่มสร้างเอกสารจากแถวที่ " + rowIndex);
//     generateSelectedDocuments(rowIndex, sheet);
//     sheet.getRange(rowIndex, statusCol).setValue("✅ Completed");

//     ui.alert("✅ สร้างเอกสารเรียบร้อยแล้ว สำหรับแถวที่ " + rowIndex);
//     Logger.log("✅ เสร็จสิ้นที่แถว " + rowIndex);
//   } catch (err) {
//     Logger.log("❌ ERROR: " + err.message);
//     ui.alert("❌ เกิดข้อผิดพลาด: " + err.message);
//   }
// }

// function generateSelectedDocuments(rowIndex, sheet) {
//   if (rowIndex < 2) return;

//   const data = sheet.getDataRange().getValues();
//   const headers = data[0];
//   const rowData = data[rowIndex - 1];

//   const columnIndex = headers.reduce((acc, header, i) => {
//     acc[header.trim()] = i;
//     return acc;
//   }, {});

//   const folder = DriveApp.getFolderById("1lWJs3RqJHZIUIzI_FnuhPWr0jFi_kUJn");
  
//   var templates = {
//     "ใบเสร็จรับเงิน RDS Best": "1hAo2br2jzDNrMP1hMuxbJ1ME1KyBx-zyrEm_At4-eKM",
//     "ใบเสร็จรับเงิน RDS Best  อื่นๆ": "1ezj_Xtu2WOIO8oVzXrJNiBPzlKYXNoJ0Bn6XBtOto3c",
//     "สัญญาวางเงินจองมัดจำ RDS Best": "1qnlN-02oRbyF5xugXuB9-9jB2tmLIcVOb6yvwjkmacQ",
//     "ยกเลิกการวางจองห้อง": "11mBQsfEBiS4uTpHIfHokjyJygi64-rZygApVV3W0I6s",
//     "สัญญานายหน้า บริษัท อาร์ดีเอส เบสท์ แอสเซ็ทส์ จำกัด": "1eAeKGlYt4Pqnw94aOKymflLkbuNqrPH7XVAn8QHuMAM",
//     // "ฟอร์มสัญญาเช่า": "16gCDMAuvO3agjdLdZOirMR8Rev6hAcClzAJl2mTAp3k",
//     "ฟอร์มสัญญาเช่า": "1XFqGbtpI3YDdQzoxRRK5G4p2DnMBGBZ3r3LmOhPPZ_0",
//     "หนังสือบอกกล่าวเลิกสัญญาเช่า": "1_AiCb3a9Zn2gI4YQoQa1qIGG_XL3OXjq_GUd-zVq_jg"
//   };
//   let lastColumn = sheet.getLastColumn();
//   const docColumns = {};

//   Object.keys(templates).forEach((docName) => {
//     let colIndex = headers.indexOf(docName);
//     if (colIndex === -1) {
//       lastColumn++;
//       sheet.getRange(1, lastColumn).setValue(docName);
//       docColumns[docName] = lastColumn;
//     } else {
//       docColumns[docName] = colIndex + 1;
//     }
//   });

//   const placeholders = {};
//   headers.forEach((header, i) => {
//     const cleanHeader = header.trim();
//     if (cleanHeader) {
//       const key = `{{${cleanHeader}}}`;
//       let value = rowData[i];

//       // Auto format date
//       if (value instanceof Date) {
//         value = formatDate(value);
//       }

//       // Auto format number for ค่าเช่า and ค่าประกัน
//       if (
//         cleanHeader.includes("ค่าเช่า") ||
//         cleanHeader.includes("ค่าประกัน")
//       ) {
//         value = formatNumberWithComma(value);
//       }

//       placeholders[key] = value || "";
//     }
//   });

//   const paymentMethod = (rowData[columnIndex["วิธีชำระเงิน"]] || "").trim();

//   Object.keys(templates).forEach((docName) => {
//     try {
//       const templateFile = DriveApp.getFileById(templates[docName]);
//       const copy = templateFile.makeCopy(`${docName} ของ ${rowData[columnIndex["ชื่อ-นามสกุล(ผู้จ่ายเงิน)"]]}`, folder);
//       copy.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

//       const doc = DocumentApp.openById(copy.getId());
//       const body = doc.getBody();

//       Object.keys(placeholders).forEach((key) => {
//         body.replaceText(key, placeholders[key]);
//       });

//       body.replaceText("{{เงินสด}}", paymentMethod === "เงินสด/Cash" ? "✔" : "");
//       body.replaceText("{{เงินโอน}}", paymentMethod === "เงินโอน/Transfer" ? "✔" : "");

//       doc.saveAndClose();

//       const url = `https://docs.google.com/document/d/${copy.getId()}`;
//       const docColumnIndex = docColumns[docName];
//       if (docColumnIndex > 0) {
//         sheet.getRange(rowIndex, docColumnIndex).setFormula(`=HYPERLINK("${url}", "เปิดเอกสาร")`);
//       }
//     } catch (err) {
//       Logger.log(`❌ Error on ${docName}: ${err.message}`);
//     }
//   });
// }

// function formatDate(dateValue) {
//   return Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
// }

// function formatNumberWithComma(value) {
//   if (typeof value === "number") {
//     return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
//   }
//   if (!isNaN(value)) {
//     return parseFloat(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
//   }
//   return value || "";
// }
