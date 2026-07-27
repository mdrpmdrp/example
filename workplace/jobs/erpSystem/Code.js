function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("ERP")
    .addItem("Create Database", "setupDatabase")
    .addSeparator()
    .addItem("Reset Demo Data", "resetDemoData")
    .addToUi();
}

function doGet() {

  return HtmlService
    .createTemplateFromFile("index")
    .evaluate()
    .setTitle("ERP Dealer System")
    .setFaviconUrl("https://img.icons8.com/tiny-color/16/layers.png")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

}

function include(filename) {
  return HtmlService
      .createHtmlOutputFromFile(filename)
      .getContent();
}
