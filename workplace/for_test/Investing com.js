function fetchDataToInvestingSheet() {
  var url = "https://th.investing.com/currencies/usd-thb";
  var requestOptions = {
    "method": "GET",
    "headers": {'User-Agent': 'Mozilla/5.0'} // Set a user agent header to mimic a browser request
  };
  var response = UrlFetchApp.fetch(url, requestOptions);
  var content = response.getContentText();

  // Attempting to locate the desired data
  var startMarker = '<div class="text-5xl/9 font-bold md:text-[42px] md:leading-[60px] text-[#232526]" data-test="instrument-price-last">';
  var endMarker = '</div>';
  var startIndex = content.indexOf(startMarker);
  var endIndex = content.indexOf(endMarker, startIndex);

  // Handling cases where the data is not found
  if (startIndex === -1 || endIndex === -1) {
    console.error("Unable to locate the desired data in the HTML content.");
    return;
  }

  var valueHtml = content.substring(startIndex + startMarker.length, endIndex);
  var value = valueHtml.trim(); // Extracting the value

  // Preparing data with timestamp
  var timestamp = new Date();
  var formattedTimestamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var data = [["Time Stamp", formattedTimestamp], ["USD-THB", value]];

  // Writing data to the sheet
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("Raw Data 3rd Party");
  

  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);
}
