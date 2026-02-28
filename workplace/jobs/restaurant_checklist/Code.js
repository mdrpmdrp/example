// ============================================================
//  Vella Beach Bar & Bistro — Daily Checklist Web App
// ============================================================

var SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
var CHECKLIST_SHEET = "ชีต1";
var EMPLOYEE_SHEET  = "รายชื่อพนักงาน";
var LOG_SHEET       = "Checklist Log";
var DRIVE_FOLDER_ID    = "1y_bA7Bu8Zu5rN7bZbF1JiQKldYaRTImD";
var LOGO_ID = "1elZjcZRbAdGHu01BhpZejw3iQv3OKTtz"

// ── Serve Web App ─────────────────────────────────────────
function doGet() {
    let html = HtmlService.createTemplateFromFile("index");
    html.logoBase64 = _getLogoBase64();
    return html
    .evaluate()
    .setTitle("Vella Beach Bar & Bistro — Daily Checklist")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl("https://img2.pic.in.th/vella_logo.th.png");
}

function _getLogoBase64() {
    var file = DriveApp.getFileById(LOGO_ID);
    var blob = file.getBlob();
    return "data:" + blob.getContentType() + ";base64," + Utilities.base64Encode(blob.getBytes());
}

// ── Get Checklist Items + Employee Names ──────────────────
function getInitialData() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Checklist — "ชีต1" A6:E (B=Task, E=Remarks)
    var csSheet = ss.getSheetByName(CHECKLIST_SHEET);
    var lastRow = csSheet.getLastRow();
    var checklist = [];
    if (lastRow >= 6) {
      var csData = csSheet.getRange("A6:E" + lastRow).getValues();
      csData.forEach(function(row) {
        if (row[1] && String(row[1]).trim() !== "") {
          checklist.push({
            category : String(row[0]).trim(),
            task     : String(row[1]).trim(),
            remarks  : String(row[4]).trim()
          });
        }
      });
    }

    // Employees — "รายชื่อพนักงาน" Col B
    var empSheet = ss.getSheetByName(EMPLOYEE_SHEET);
    var empLast  = empSheet.getLastRow();
    var employees = [];
    if (empLast >= 2) {
      var empData = empSheet.getRange("B2:B" + empLast).getValues();
      empData.forEach(function(row) {
        if (row[0] && String(row[0]).trim() !== "") {
          employees.push(String(row[0]).trim());
        }
      });
    }

    return JSON.stringify({ success: true, checklist: checklist, employees: employees });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ── Submit Checklist ──────────────────────────────────────
// PDF is built on the frontend (jsPDF); we just save the base64 blob to Drive.
function submitChecklist(dataStr) {
  try {
    var data       = JSON.parse(dataStr);
    var employee   = data.employeeName;
    var results    = data.checklistResults;
    var pdfBase64  = data.pdfBase64;          // base64 string sent from browser
    var ts         = new Date();

    // 1. Save PDF blob to Drive
    var pdfUrl = _savePDFToDrive(employee, pdfBase64, ts);

    // 2. Log to Sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName(LOG_SHEET);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET);
      logSheet.appendRow(["Timestamp", "Employee", "Checklist JSON", "PDF URL"]);
      logSheet.getRange("1:1").setFontWeight("bold");
    }
    logSheet.appendRow([ts, employee, JSON.stringify(results), pdfUrl]);

    return JSON.stringify({ success: true, pdfUrl: pdfUrl });
  } catch (e) {
    return JSON.stringify({ success: false, error: e.message });
  }
}

// ── Save PDF blob (base64) sent from browser to Google Drive ──
function _savePDFToDrive(employee, base64, ts) {
  var dateStr  = Utilities.formatDate(ts, "Asia/Bangkok", "dd-MM-yyyy");
  var fileName = "Checklist_Vella_" + employee + "_" + dateStr + ".pdf";

  var pdfBlob = Utilities.newBlob(Utilities.base64Decode(base64), "application/pdf", fileName);

  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

  var file = folder.createFile(pdfBlob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
