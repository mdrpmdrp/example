function triggerCalculationPing(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form Responses 1');
  
  if (!sheet) return; 
  
  var targetRange = sheet.getRange('M5');
  
  for (var i = 0; i < 3; i++) {
    targetRange.clearContent();
    SpreadsheetApp.flush(); 
    Utilities.sleep(500); 
  }
}