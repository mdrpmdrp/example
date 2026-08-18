// function onOpen() {
//   SpreadsheetApp.getUi()
//     .createMenu("ERP")
//     .addItem("Create Database", "setupDatabase")
//     .addSeparator()
//     .addItem("Archive Old Orders Now", "archiveOrdersBeforeCurrentMonth")
//     .addItem("Install Monthly Archive Trigger", "installMonthlyOrderBackupTrigger")
//     .addSeparator()
//     .addItem("Reset Demo Data", "resetDemoData")
//     .addToUi();
// }
let ss = SpreadsheetApp.getActiveSpreadsheet();
function doGet() {
  return withConsoleTiming_('server:doGet', function () {
    return HtmlService
      .createTemplateFromFile("index")
      .evaluate()
      .setTitle("ERP Dealer System")
      .setFaviconUrl("https://img.icons8.com/tiny-color/16/layers.png")
      .addMetaTag("viewport", "width=device-width, initial-scale=1, viewport-fit=cover")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  });
}

function include(filename) {
  return HtmlService
      .createHtmlOutputFromFile(filename)
      .getContent();
}
