function triggerCalculationPing(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Form Responses 1');
  
  if (!sheet) return; 
  
  var targetRange = sheet.getRange('C2');
  var currentValue = targetRange.getValue();
  
  targetRange.setValue(currentValue);
  SpreadsheetApp.flush();
}