// /****************** CONFIG ******************/
// const CONFIG = {
//   SPREADSHEET_ID: '1sW7WMWXYtmo87XiweRdyEL5hNhtQc1jH_Eu2vdX3H-Q',
//   FOLDER_DRIVE1_ID: '1Gu3yiv7EbOrP-XBEHr6xe1vWKT8HMEna',     // โฟลเดอร์ที่พนักงานอัปโหลดมา
//   FOLDER_DRIVE2_ID: '1DbVOZa02GmYjI957eQA56pzWl_hAT2l6', // root สําหรับปี/เดือน
//   FOLDER_ARCHIVE_ID: '1aIS4IF_FWu9WgAsMb2fV6XtGqn9Dap9F',

//   SHEET_MASTER: 'ใบส่งของ_สรุปลูกค้า',
//   SHEET_PAID: 'ลูกค้าจ่ายเงิน',
//   SHEET_YEAR: 'ใบส่งของ_รายปี',

//   // column indices (1-based)
//   COL_CODE: 1,
//   COL_NAME: 2,
//   COL_MONTH: 3,
//   COL_YEAR: 4,
//   COL_INVOICE: 5,
//   COL_AMOUNT: 6,
//   COL_FILEURL: 7,
//   COL_PAIDFLAG: 8,
//   COL_FILEID: 9,

//   // fallback mapping: ถ้าชื่อไฟล์มี code เช่น DS6810 ให้เติม year/month อัตโนมัติ
//   CODE_TO_YEAR_MONTH: {
//     'DS6810': { year: '2568', month: 'ต.ค.' },
//     'DS6709': { year: '2567', month: 'ก.ย.' },
//     // เพิ่มรายการอื่นได้ถ้าจำเป็น
//   }
// };

// /* ถ้าทดสอบ ให้เป็น true เพื่อไม่ย้ายไฟล์จริง (แต่จะ log) */
// let TEST_MODE = false;

// /*************** HELPERS *****************/

// // parse ชื่อไฟล์แบบ smart: คาดรูปแบบตัวอย่าง "0251_รร.บ้านโลกเกาะ_DS6810-270_3000.pdf"
// function parseFilenameSmart(fname) {
//   // ลองจับ pattern: code_name_DS<invoice>-<id>_<amount>
//   // ปรับ regex ตามรูปแบบไฟล์ของคุณ ถ้าต่างออกไป ให้แก้ตรงนี้
//   const match = fname.match(/^(\d+)_([^_]+)_DS(\d+)[-_](\d+)_?(\d+)?/i);
//   if (match) {
//     return {
//       code: match[1],
//       name: match[2],
//       dsCode: 'DS' + match[3],
//       invoice: 'DS-' + match[3],
//       amount: match[5] || match[4] || '',
//       // month/year จะเติมจาก fallback หรือเว้นว่างไว้
//       month: '',
//       year: ''
//     };
//   }
//   // ถ้าไม่ match ให้พยายามเจอ trailing numbers (ยอด)
//   const m2 = fname.match(/(\d{3,})\.?pdf$/i);
//   return {
//     code: '',
//     name: fname.replace(/\.[^.]+$/, ''),
//     dsCode: '',
//     invoice: '',
//     amount: m2 ? m2[1] : ''
//   };
// }

// function getOrCreateSubfolder(parentFolder, name) {
//   const it = parentFolder.getFoldersByName(name);
//   if (it.hasNext()) return it.next();
//   return parentFolder.createFolder(name);
// }

// function safeAppendRows(sheet, rows) {
//   if (!rows || rows.length === 0) return 0;
//   const start = sheet.getLastRow() + 1;
//   sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows);
//   return rows.length;
// }

// /************ CORE: move/import ***********/

// // ฟังก์ชันหลัก: สแกน Drive1 แล้วย้ายไป Drive2/ปี/เดือน พร้อมเขียนลง master sheet
// function bulkMoveAndImport() {
//   Logger.log('=== START bulkMoveAndImport (TEST_MODE=' + TEST_MODE + ') ===');

//   const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
//   const sheetMaster = ss.getSheetByName(CONFIG.SHEET_MASTER);
//   const sheetYear = ss.getSheetByName(CONFIG.SHEET_YEAR);

//   if (!sheetMaster) throw new Error('ไม่พบ sheet: ' + CONFIG.SHEET_MASTER);
//   if (!sheetYear) throw new Error('ไม่พบ sheet: ' + CONFIG.SHEET_YEAR);

//   const root = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE1_ID);
//   const files = root.getFiles();

//   // โหลด fileId ที่มีใน master เพื่อไม่ให้เขียนซ้ำ
//   const existingIds = new Set();
//   const last = sheetMaster.getLastRow();
//   if (last >= 1) {
//     const idRange = sheetMaster.getRange(1, CONFIG.COL_FILEID, last, 1).getValues();
//     idRange.forEach(r => { if (r[0]) existingIds.add(String(r[0])); });
//   }

//   const rowsToAppend = [];
//   let moved = 0, skipped = 0, errors = 0;

//   while (files.hasNext()) {
//     const f = files.next();
//     try {
//       const fname = f.getName();
//       const fid = f.getId();

//       if (existingIds.has(fid)) {
//         Logger.log('ข้าม (มีใน master แล้ว): ' + fname);
//         skipped++;
//         continue;
//       }

//       const parsed = parseFilenameSmart(fname);
//       // fallback: ถ้าไม่มี month/year ให้ดู mapping จาก dsCode
//       let month = parsed.month || '';
//       let year = parsed.year || '';
//       if ((!month || !year) && parsed.dsCode && CONFIG.CODE_TO_YEAR_MONTH[parsed.dsCode]) {
//         const mm = CONFIG.CODE_TO_YEAR_MONTH[parsed.dsCode];
//         if (!year && mm.year) year = mm.year;
//         if (!month && mm.month) month = mm.month;
//       }

//       // ถ้ายังไม่มี year/month ให้ข้าม (หรือเลือกพฤติกรรม)
//       if (!year || !month) {
//         Logger.log('ข้ามไฟล์ (ไม่มีปี/เดือน): ' + fname + ' parsed=' + JSON.stringify(parsed));
//         skipped++;
//         continue;
//       }

//       // สร้าง/หา folder ปี/เดือน ใน Drive2 root
//       const root2 = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE2_ID);
//       const yearFolder = getOrCreateSubfolder(root2, String(year));
//       const monthFolder = getOrCreateSubfolder(yearFolder, String(month));

//       // ย้ายไฟล์: add into monthFolder, remove from root (ต้องมีสิทธิ์แก้)
//       Logger.log('ย้ายไฟล์: ' + fname + ' -> ' + year + '/' + month);
//       if (!TEST_MODE) {
//         monthFolder.addFile(f);
//         // ถ้าต้องการเอาออกจาก Drive1 root ให้ใช้ removeFile
//         try { root.removeFile(f); } catch (e) { /* ถ้าไม่สามารถลบได้ (สิทธิ์) จะยังคงอยู่ */ }
//       }

//       // เตรียมแถวสำหรับ master sheet
//       const fileUrl = f.getUrl();
//       const code = parsed.code || '';
//       const name = parsed.name || '';
//       const invoice = parsed.invoice || fname;
//       const amount = parsed.amount || '';
//       const paidFlag = 'N';

//       const row = [
//         code,
//         name,
//         month,
//         year,
//         invoice,
//         amount,
//         fileUrl,
//         paidFlag,
//         fid
//       ];
//       rowsToAppend.push(row);
//       existingIds.add(fid);
//       moved++;

//     } catch (e) {
//       Logger.log('❌ เกิดข้อผิดพลาดขณะย้ายไฟล์: ' + (f ? f.getName() : 'unknown') + ' - ' + e.message);
//       errors++;
//     }
//   } // end while files

//   // เขียนลง master sheet
//   if (rowsToAppend.length) {
//     const wrote = safeAppendRows(sheetMaster, rowsToAppend);
//     Logger.log('เขียนลง master: ' + wrote + ' แถว');
//   } else {
//     Logger.log('ไม่มีแถวใหม่ที่จะเขียนลง master');
//   }

//   Logger.log('สรุปการย้าย: moved=' + moved + ' skipped=' + skipped + ' errors=' + errors);

//   // อัปเดตสรุปรายปี (aggregate) เสมอหลังการ import
//   try {
//     updateYearSummaryFromMaster();
//   } catch (e) {
//     Logger.log('❌ อัปเดตสรุปรายปีผิดพลาด: ' + e.message);
//   }

//   Logger.log('=== END bulkMoveAndImport ===');
// }

// // สร้างสรุปรายปีจาก master sheet: group by (code,name,year)
// function updateYearSummaryFromMaster() {
//   const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
//   const sheetMaster = ss.getSheetByName(CONFIG.SHEET_MASTER);
//   const sheetYear = ss.getSheetByName(CONFIG.SHEET_YEAR);
//   if (!sheetMaster || !sheetYear) throw new Error('ไม่พบ master หรือ year sheet');

//   const last = sheetMaster.getLastRow();
//   if (last < 1) {
//     sheetYear.clearContents();
//     return;
//   }
//   const data = sheetMaster.getRange(1, 1, last, CONFIG.COL_FILEID).getValues();

//   // map key: code|name|year -> aggregates
//   const agg = {};
//   data.forEach(r => {
//     const code = String(r[CONFIG.COL_CODE - 1] || '').trim();
//     const name = String(r[CONFIG.COL_NAME - 1] || '').trim();
//     const month = String(r[CONFIG.COL_MONTH - 1] || '').trim();
//     const year = String(r[CONFIG.COL_YEAR - 1] || '').trim();
//     const amount = Number(String(r[CONFIG.COL_AMOUNT - 1] || '').replace(/[^0-9.-]/g, '')) || 0;
//     const paid = String(r[CONFIG.COL_PAIDFLAG - 1] || '').toUpperCase() === 'Y' ? 1 : 0;

//     if (!code && !name) return;
//     const key = code + '|' + name + '|' + year;
//     if (!agg[key]) agg[key] = { code, name, year, count:0, total:0, paidCount:0, paidSum:0 };
//     agg[key].count += 1;
//     agg[key].total += amount;
//     if (paid) {
//       agg[key].paidCount += 1;
//       agg[key].paidSum += amount;
//     }
//   });

//   // เขียนลง sheetYear (เคลียร์ก่อน)
//   sheetYear.clearContents();
//   const header = ['รหัส','ชื่อลูกค้า','ปี','จำนวนใบส่งของ','ยอดรวม(บาท)','จ่ายแล้ว(ใบ)','ยอดจ่ายแล้ว(บาท)','คงค้าง(ใบ)','ยอดคงค้าง(บาท)'];
//   const rows = [header];
//   Object.values(agg).forEach(a => {
//     const unpaidCount = a.count - a.paidCount;
//     const unpaidSum = a.total - a.paidSum;
//     rows.push([a.code, a.name, a.year, a.count, a.total, a.paidCount, a.paidSum, unpaidCount, unpaidSum]);
//   });
//   if (rows.length > 0) sheetYear.getRange(1,1,rows.length,rows[0].length).setValues(rows);
//   Logger.log('อัปเดตสรุปรายปี: ' + (rows.length-1) + ' รายการ');
// }

// /********** Debug helpers **********/
// function debugListFiles(folderIdToTest) {
//   const fid = folderIdToTest || CONFIG.FOLDER_DRIVE1_ID;
//   const folder = DriveApp.getFolderById(fid);
//   const files = folder.getFiles();
//   while (files.hasNext()) {
//     const f = files.next();
//     const name = f.getName();
//     const owner = (f.getOwner && f.getOwner()) ? f.getOwner().getEmail() : 'n/a';
//     Logger.log('file: %s | owner: %s', name, owner);
//     const parsed = parseFilenameSmart(name);
//     Logger.log(' parsed=%s', JSON.stringify(parsed));
//   }
// }

// /********** small test helper (move single file to month) **********/
// function testMoveOneFileToMonth(fileId, year, month) {
//   const f = DriveApp.getFileById(fileId);
//   const root2 = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE2_ID);
//   const yearFolder = getOrCreateSubfolder(root2, String(year));
//   const monthFolder = getOrCreateSubfolder(yearFolder, String(month));
//   Logger.log('Test move: %s -> %s/%s', f.getName(), year, month);
//   if (!TEST_MODE) {
//     monthFolder.addFile(f);
//     // อยากให้ลบจาก Drive1 root ด้วยให้เรียก removeFile ด้วย folder id ของต้นทาง
//   }
// }
// /**
//  * ตรวจสอบไฟล์ทั้งหมดที่อยู่ใต้ FOLDER_DRIVE2_ID (recursive)
//  * แสดงผล parsed (dry-run) -- ไม่ย้ายไฟล์
//  */
// function debugListFilesInDrive2() {
//   const root = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE2_ID);
//   const rows = [];
//   traverseFolder(root, function(folder, file){
//     const name = file.getName();
//     const owner = (file.getOwner && file.getOwner()) ? file.getOwner().getEmail() : 'n/a';
//     const parsed = (typeof parseFilenameSmart === 'function') ? parseFilenameSmart(name) : {};
//     rows.push({folder: folder.getName(), fileId: file.getId(), name: name, owner: owner, parsed: parsed});
//   });
//   // เขียนผลลง Logs (หรือปรับให้เขียนลงชีทถ้าต้องการ)
//   rows.forEach(r => Logger.log('folder=%s | id=%s | name=%s | owner=%s | parsed=%s', r.folder, r.fileId, r.name, r.owner, JSON.stringify(r.parsed)));
//   Logger.log('debugListFilesInDrive2: scanned %s files', rows.length);
// }

// /**
//  * ย้ายไฟล์ที่อยู่ใน Drive2 (ทุกชั้น) ไปยัง subfolder ปี/เดือน ตาม parseFilenameSmart
//  * ถ้าต้องการ dry-run ให้ตั้ง TEST_MODE = true ใน CONFIG หรือ global
//  */
// function moveExistingFilesFromDrive2() {
//   const root = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE2_ID);
//   if (!root) {
//     Logger.log('ERROR: ไม่พบโฟลเดอร์ root (Drive2). ตรวจสอบ CONFIG.FOLDER_DRIVE2_ID');
//     return;
//   }

//   // ใช้ recursive traverse เพื่อรวมไฟล์จากทุก subfolder (รวม root ด้วย)
//   let moved = 0, skipped = 0, errors = 0;
//   traverseFolder(root, function(parentFolder, file) {
//     try {
//       const fname = file.getName();
//       const parsed = (typeof parseFilenameSmart === 'function') ? parseFilenameSmart(fname) : {};
//       // fallback mapping (ถ้า parse ไม่เจอ month/year แต่มี dsCode)
//       let month = parsed.month || '';
//       let year = parsed.year || '';
//       const dsCode = parsed.dsCode || parsed.code || '';

//       if ((!month || !year) && dsCode && CONFIG.CODE_TO_YEAR_MONTH && CONFIG.CODE_TO_YEAR_MONTH[dsCode]) {
//         const m = CONFIG.CODE_TO_YEAR_MONTH[dsCode];
//         if (!year && m.year) year = m.year;
//         if (!month && m.month) month = m.month;
//       }

//       if (!year || !month) {
//         Logger.log('⚠️ ข้ามไฟล์ (ไม่มีปี/เดือน): ' + fname + ' parsed=' + JSON.stringify(parsed));
//         skipped++;
//         return;
//       }

//       // หา/สร้าง subfolder year และ month ภายใต้ root (root คือ CONFIG.FOLDER_DRIVE2_ID)
//       const yearFolder = getOrCreateSubfolder(root, String(year));
//       const monthFolder = getOrCreateSubfolder(yearFolder, String(month));

//       // ถ้าไฟล์อยู่ในโฟลเดอร์ที่เป็น target อยู่แล้ว -> ข้าม
//       // ตรวจสอบว่ามี parent folder เป็น monthFolder หรือไม่
//       let alreadyInTarget = false;
//       const parents = file.getParents();
//       while (parents.hasNext()) {
//         const p = parents.next();
//         if (p.getId() === monthFolder.getId()) {
//           alreadyInTarget = true;
//           break;
//         }
//       }
//       if (alreadyInTarget) {
//         Logger.log('✅ อยู่ในโฟลเดอร์เป้าหมายแล้ว: ' + fname);
//         skipped++;
//         return;
//       }

//       if (typeof TEST_MODE !== 'undefined' && TEST_MODE === true) {
//         Logger.log('[DRY-RUN] จะย้าย: ' + fname + ' -> ' + year + '/' + month);
//       } else {
//        // ✅ เปลี่ยนจากการย้ายไฟล์ เป็นการคัดลอกไฟล์แทน (แก้ Access denied)
//       const copy = file.makeCopy(file.getName(), monthFolder);
//       Logger.log('📄 คัดลอกไฟล์: ' + file.getName() + ' -> ' + year + '/' + month);
//       moved++; 
//         Logger.log('📁 ย้ายไฟล์: ' + fname + ' -> ' + year + '/' + month);
//         moved++;
//       }
//     } catch (e) {
//       Logger.log('❌ เกิดข้อผิดพลาดขณะย้ายไฟล์: ' + file.getName() + ' : ' + e.message);
//       errors++;
//     }
//   });

//   Logger.log('สรุปการย้าย: moved=' + moved + ' skipped=' + skipped + ' errors=' + errors);
// }

// /* ---------- ช่วยเหลือทั่วไป ---------- */

// // traverse ทุก folder -> callback(folderObj, fileObj)
// function traverseFolder(folder, fileCallback) {
//   // files in this folder
//   const files = folder.getFiles();
//   while (files.hasNext()) {
//     const f = files.next();
//     fileCallback(folder, f);
//   }
//   // subfolders
//   const subs = folder.getFolders();
//   while (subs.hasNext()) {
//     const sf = subs.next();
//     traverseFolder(sf, fileCallback);
//   }
// }

// // หา หรือ สร้าง subfolder ชื่อ givenName ภายใต้ parentFolder
// function getOrCreateSubfolder(parentFolder, givenName) {
//   const it = parentFolder.getFoldersByName(givenName);
//   if (it && it.hasNext()) {
//     return it.next();
//   } else {
//     return parentFolder.createFolder(givenName);
//   }
// }
// function processPaidFiles() {
//   // ตั้งค่า
//   const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
//   const sheetMaster = ss.getSheetByName(CONFIG.SHEET_MASTER);
//   const sheetPaid = ss.getSheetByName(CONFIG.SHEET_PAID);
//   const archiveFolderId = CONFIG.FOLDER_ARCHIVE_ID;
//   const TEST = (typeof TEST_MODE !== 'undefined' && TEST_MODE === true);

//   // อ่านข้อมูลทั้งหมด (สมมติ header แถว 1)
//   const dataRange = sheetMaster.getDataRange();
//   const values = dataRange.getValues(); // 2D array
//   if (values.length <= 1) {
//     Logger.log('ไม่มีข้อมูลใน master sheet');
//     return;
//   }

//   const header = values[0];
//   const rows = values.slice(1); // แถวข้อมูลจริง
//   const toMoveRows = []; // เก็บแถวที่ต้องย้าย (index relative to rows array)
//   const rowsDataToAppend = [];

//   // loop หาแถวที่ paid flag == 'Y' (หรือ 'y')
//   for (let i = 0; i < rows.length; i++) {
//     const row = rows[i];
//     const paidFlag = row[CONFIG.COL_PAIDFLAG - 1]; // ปรับเป็น 0-based
//     if ((String(paidFlag || '').trim().toUpperCase()) === 'Y') {
//       // เก็บข้อมูลเพื่อ append และเก็บตำแหน่งเพื่อลบภายหลัง
//       toMoveRows.push(i);
//       rowsDataToAppend.push(row);
//     }
//   }

//   if (toMoveRows.length === 0) {
//     Logger.log('ไม่พบแถวที่ทำเครื่องหมาย Y');
//     return;
//   }

//   let movedCount = 0;
//   let copiedFallback = 0;
//   let errors = 0;

//   // 1) append rows ไปชีท paid
//   rowsDataToAppend.forEach(r => {
//     sheetPaid.appendRow(r);
//   });

//   // 2) ย้ายไฟล์แต่ละแถว (พยายาม move ถ้าไม่สำเร็จ ก็ copy ไป Archive)
//   const archiveFolder = DriveApp.getFolderById(archiveFolderId);

//   // toMoveRows เป็น index ของ rows array (0-based)
//   // ก่อนลบจาก sheet เราจะย้าย/คัดลอกไฟล์ทีละแถว
//   for (let idx of toMoveRows) {
//     const row = rows[idx];
//     // คาดว่า col fileId อยู่ใน CONFIG.COL_FILEID (1-based)
//     const fileId = row[CONFIG.COL_FILEID - 1];
//     const fileName = row[CONFIG.COL_NAME - 1] || '(no-name)';

//     if (!fileId || String(fileId).trim() === '') {
//       Logger.log('แถวไม่มี fileId, ข้าม: ' + fileName);
//       continue;
//     }

//     try {
//       if (TEST) {
//         Logger.log('[TEST MODE] จะย้ายไฟล์ id=' + fileId + ' name=' + fileName);
//         movedCount++;
//         continue;
//       }

//       const file = DriveApp.getFileById(fileId);

//       // พยายาม addFile -> removeFile (ย้ายจริง)
//       try {
//         archiveFolder.addFile(file);
//         // ลบจาก parent ทั้งหมดที่ไม่ใช่ target (ถ้าสามารถ)
//         const parents = file.getParents();
//         while (parents.hasNext()) {
//           const p = parents.next();
//           if (p.getId() !== archiveFolder.getId()) {
//             // removeFile ต้องมีสิทธิ์
//             try {
//               p.removeFile(file);
//             } catch (e2) {
//               // ถ้า removeFile ล้มเหลว เราจะปล่อยไว้ (fallback: copy already done)
//               Logger.log('ไม่สามารถ removeFile จาก parent ' + p.getName() + ': ' + e2.message);
//             }
//           }
//         }
//         movedCount++;
//         Logger.log('ย้ายไฟล์สำเร็จ: ' + file.getName());
//       } catch (eMove) {
//         // ถ้าย้ายไม่ได้ (สิทธิ์) -> fallback: copy ไป archive
//         Logger.log('ไม่สามารถย้ายไฟล์ id=' + fileId + ' : ' + eMove.message + ' -> พยายามคัดลอก');
//         try {
//           file.makeCopy(file.getName(), archiveFolder);
//           copiedFallback++;
//           Logger.log('คัดลอกไฟล์ไปที่ Archive: ' + file.getName());
//         } catch (eCopy) {
//           Logger.log('คัดลอกไฟล์ไม่สำเร็จ: ' + eCopy.message);
//           errors++;
//         }
//       }

//     } catch (e) {
//       Logger.log('เกิดข้อผิดพลาดเมื่อจัดการไฟล์ id=' + fileId + ' : ' + e.message);
//       errors++;
//     }
//   }

//   // 3) ลบแถวจาก sheet master — ต้องลบจากด้านล่างขึ้นบน (index ใน sheet เป็น 1-based header + index)
//   // toMoveRows เป็น index ใน rows[] (0-based). แถวใน sheet = index + 2 (header อยู่แถว 1)
//   toMoveRows.sort((a,b) => b - a); // เรียงจากมากไปน้อย
//   for (let idx of toMoveRows) {
//     const sheetRow = idx + 2;
//     sheetMaster.deleteRow(sheetRow);
//   }

//   // 4) เรียกอัปเดตรายปี (ถ้ามี ฟังก์ชันนี้)
//   try {
//     if (typeof updateYearSummaryFromMaster === 'function') {
//       updateYearSummaryFromMaster();
//     }
//   } catch (e) {
//     Logger.log('เรียก updateYearSummaryFromMaster() ผิดพลาด: ' + e.message);
//   }

//   Logger.log('สรุป: appended=' + rowsDataToAppend.length + ' moved=' + movedCount + ' copiedFallback=' + copiedFallback + ' errors=' + errors);
// }
// // TEST_MODE อยู่แล้วในโค้ดหลักของคุณ (let TEST_MODE = false;)
// // ถ้ายังไม่มี ให้เพิ่มบรรทัดนี้ด้านบน
// // let TEST_MODE = true; // set true for dry-run

// /**
//  * moveFileToMonthSafe
//  * - file: DriveApp File object
//  * - monthFolder: DriveApp Folder object (destination)
//  * - rootFolderIdsToRemove: array of folderId strings ที่ต้องการลบ parent ออก
//  */
// function moveFileToMonthSafe(file, monthFolder, rootFolderIdsToRemove) {
//   const fname = file.getName();
//   try {
//     // DRY RUN?
//     if (typeof TEST_MODE !== 'undefined' && TEST_MODE === true) {
//       Logger.log('[DRY-RUN] จะย้ายไฟล์: ' + fname + ' -> ' + monthFolder.getName());
//       return {ok: true, method: 'dryrun'};
//     }

//     // 1) Try normal DriveApp method first
//     try {
//       monthFolder.addFile(file);
//       // remove from parents that are not destination
//       const parents = file.getParents();
//       while (parents.hasNext()) {
//         const p = parents.next();
//         if (p.getId() !== monthFolder.getId()) {
//           try {
//             p.removeFile(file); // may throw if not allowed (not owner)
//           } catch (e) {
//             // ignore here, fallback below
//             Logger.log('ไม่สามารถ removeFile ด้วย DriveApp จากพาเรนท์: ' + p.getName() + ' : ' + e.message);
//           }
//         }
//       }
//       Logger.log('ย้ายไฟล์ (DriveApp): ' + fname + ' -> ' + monthFolder.getName());
//       return {ok: true, method: 'DriveApp'};
//     } catch (e1) {
//       Logger.log('DriveApp move ล้มเหลวสำหรับ ' + fname + ' : ' + e1.message);
//       // continue to Drive API fallback
//     }

//     // 2) Fallback: use Advanced Drive API to update parents (add then remove)
//     // ต้องเปิด Advanced Drive Service (Drive API) ใน Apps Script
//     const fileId = file.getId();
//     const destId = monthFolder.getId();

//     // Build addParents & removeParents lists
//     // removeParents: collect parents except dest
//     const parents = file.getParents();
//     let removeParentsList = [];
//     while (parents.hasNext()) {
//       const p = parents.next();
//       const pid = p.getId();
//       if (pid !== destId) removeParentsList.push(pid);
//     }

//     // If dest already in parents and no other parents -> nothing to do
//     if (removeParentsList.length === 0) {
//       // maybe already in folder
//       Logger.log('ไฟล์อยู่ในโฟลเดอร์เป้าหมายแล้ว: ' + fname);
//       return {ok: true, method: 'noop'};
//     }

//     // Call Drive API: patch/update with addParents/removeParents
//     // Note: Drive.Files.update requires advanced Drive service enabled
//     Drive.Files.update({}, fileId, {addParents: destId, removeParents: removeParentsList.join(',')});
//     Logger.log('ย้ายไฟล์ (Drive API): ' + fname + ' -> ' + monthFolder.getName() + ' (removed ' + removeParentsList.join(',') + ')');
//     return {ok: true, method: 'DriveAPI'};
//   } catch (e) {
//     Logger.log('❌ เกิดข้อผิดพลาดขณะย้ายไฟล์: ' + fname + ' : ' + e.message);
//     return {ok: false, error: e.message};
//   }
// }
// // === RUNNER: โยกจาก Drive1 -> Drive2 + เขียนสรุป ===
// function runMoveFromDrive1() {
//   if (typeof TEST_MODE === 'undefined') TEST_MODE = false; // ให้แก้ด้านบนได้

//   Logger.log('=== START runMoveFromDrive1 (TEST_MODE=' + TEST_MODE + ') ===');

//   const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
//   const sheetMaster = ss.getSheetByName(CONFIG.SHEET_MASTER);
//   const sheetYear   = ss.getSheetByName(CONFIG.SHEET_YEAR);
//   if (!sheetMaster || !sheetYear) throw new Error('หาแผ่นไม่เจอ: ' + CONFIG.SHEET_MASTER + ' / ' + CONFIG.SHEET_YEAR);

//   // โหลด id ที่เคยเขียนแล้ว เพื่อไม่เขียนซ้ำ
//   const existingIds = new Set();
//   const last = sheetMaster.getLastRow();
//   if (last > 1) {
//     const idRange = sheetMaster.getRange(1, CONFIG.COL_FILEID, last, 1).getValues();
//     idRange.forEach(r => { if (r[0]) existingIds.add(String(r[0])); });
//   }

//   const root = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE1_ID);
//   const files = root.getFiles();

//   const rowsToAppend = [];
//   let moved = 0, skipped = 0, errors = 0;

//   while (files.hasNext()) {
//     const f = files.next();
//     const id = f.getId();
//     const name = f.getName();
//     const url = f.getUrl();

//     if (existingIds.has(id)) {
//       Logger.log('ข้าม (อยู่ใน master แล้ว): ' + name);
//       skipped++;
//       continue;
//     }

//     // --- parse ปี/เดือน ---
//     let parsed = {};
//     try {
//       parsed = (typeof parseFilenameSmart === 'function') ? parseFilenameSmart(name) : {};
//     } catch(e) { parsed = {}; }

//     // เติมปี/เดือนจาก fallback code (เช่น DS6810 -> 2568/ต.ค.)
//     let year  = parsed.year || '';
//     let month = parsed.month || '';
//     if ((!year || !month) && parsed.dsCode && CONFIG.CODE_TO_YEAR_MONTH && CONFIG.CODE_TO_YEAR_MONTH[parsed.dsCode]) {
//       const m = CONFIG.CODE_TO_YEAR_MONTH[parsed.dsCode];
//       if (!year  && m.year)  year  = m.year;
//       if (!month && m.month) month = m.month;
//     }

//     // ถ้าไม่มีปี/เดือน ข้าม (จะไม่ย้าย)
//     if (!year || !month) {
//       Logger.log('ข้ามไฟล์ (ไม่มีปี/เดือน): ' + name + ' | parsed=' + JSON.stringify(parsed));
//       skipped++;
//       continue;
//     }

//     // --- เตรียมโฟลเดอร์ปลายทางปี/เดือนใน Drive2 ---
//     const root2 = DriveApp.getFolderById(CONFIG.FOLDER_DRIVE2_ID);
//     const yearFolder  = getOrCreateSubfolder(root2, String(year));
//     const monthFolder = getOrCreateSubfolder(yearFolder, String(month));

//     // --- ย้ายไฟล์ ---
//     const res = moveFileToMonthSafe(f, monthFolder, [root.getId()]);
//     if (!res.ok) {
//       errors++;
//       Logger.log('ย้ายล้มเหลว: ' + name + ' : ' + res.error);
//       continue;
//     }
//     moved++;

//     // --- เตรียมแถวสำหรับเขียน master sheet ---
//     const row = [
//       parsed.code || '',                // รหัสลูกค้า
//       parsed.name || '',                // ชื่อลูกค้า
//       month,                            // เดือน (ข้อความ)
//       year,                             // ปี (พ.ศ.)
//       parsed.invoice || (parsed.dsCode ? parsed.dsCode : ''), // เลขใบส่ง/DS code
//       parsed.amount || '',              // จำนวนเงิน
//       url,                              // ลิงก์ไฟล์
//       'N',                              // จ่ายแล้ว (Y/N) เริ่มต้น N
//       id                                // fileId
//     ];
//     rowsToAppend.push(row);
//   }

//   // เขียนลง master
//   if (rowsToAppend.length) {
//     const start = sheetMaster.getLastRow() + 1;
//     sheetMaster.getRange(start, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
//     Logger.log('เขียน master เพิ่ม: ' + rowsToAppend.length + ' แถว');
//   } else {
//     Logger.log('ไม่มีแถวใหม่สำหรับ master (อาจย้ายไม่สำเร็จ หรือข้อมูลซ้ำ)');
//   }

//   // รีคอมไพล์สรุปรายปีจาก master
//   updateYearSummaryFromMaster();

//   Logger.log('=== END runMoveFromDrive1 : moved=' + moved + ' skipped=' + skipped + ' errors=' + errors + ' ===');
// }

// /** สร้างโฟลเดอร์ย่อย ถ้ายังไม่มี */
// function getOrCreateSubfolder(parent, name) {
//   const iter = parent.getFoldersByName(name);
//   if (iter.hasNext()) return iter.next();
//   return parent.createFolder(name);
// }

