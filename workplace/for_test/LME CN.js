function fetchDataToSheetCN() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName("Raw Data 3rd Party");
  if (!sheet) {
    console.error("Sheet 'Raw Data 3rd Party' not found.");
    return;
  }

  var url = "https://3g.fx678.com/Market/index/LME";
  var response = UrlFetchApp.fetch(url);
  var content = response.getContentText();

  var start = content.indexOf('<div class="tab_data">');
  var end = content.indexOf('</table>', start) + 8;
  var tableHtml = content.slice(start, end);

  var rowData = [];
  var rows = tableHtml.match(/<tr[\s\S]*?<\/tr>/g);

  if (rows) {
    for (var i = 0; i < rows.length; i++) {
      var cells = rows[i].match(/<td[\s\S]*?<\/td>/g);
      if (cells) {
        var row = [];
        for (var j = 0; j < cells.length; j++) {
          var cellValue = cells[j].replace(/<[^>]*>/g, "").trim();
          row.push(cellValue);
        }
        rowData.push(row);
      }
    }
  }

  // Adding a Time Stamp
  var timestamp = new Date();
  var formattedTimestamp = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  rowData.unshift(["Time Stamp", formattedTimestamp, "", ""]);  // Adjust the number of columns in the timestamp row

  // Adjust the range to start from row 10
  var startRow = 10;
  var range = sheet.getRange(startRow, 1, rowData.length, rowData[0].length);
  range.setValues(rowData);
}
