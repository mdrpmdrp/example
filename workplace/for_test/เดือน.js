function autoCalculateEndDate(e) {
  if (!e || !e.source || !e.range) return;

  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var column = range.getColumn();

  // ตรวจเฉพาะคอลัมน์ AE (33) หรือ AF (34)
  if (column === 33 || column === 34) {
    var row = range.getRow();
    var months = parseInt(sheet.getRange("AG" + row).getValue(), 10);
    var startDate = sheet.getRange("AH" + row).getValue();
    var endDateCell = sheet.getRange("AI" + row);

    if (isNaN(months) || !startDate || isNaN(new Date(startDate).getTime())) {
      endDateCell.setValue("");
      return;
    }

    var endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    endDate.setDate(endDate.getDate() - 1); // 🔸 ลบ 1 วัน

    endDateCell.setValue(Utilities.formatDate(endDate, sheet.getParent().getSpreadsheetTimeZone(), "dd/MM/yyyy"));
  }
}

function onEdit(e) {
  autoCalculateEndDate(e);
}


//เวอร์เก่า ไม่ - 1 วัน

// function autoCalculateEndDate(e) {
//   if (!e || !e.source || !e.range) return;

//   var sheet = e.source.getActiveSheet();
//   var range = e.range;
//   var column = range.getColumn();

//   // ตรวจเฉพาะคอลัมน์ AE (31) หรือ AF (32)
//   if (column === 33 || column === 34) {
//     var row = range.getRow();
//     var months = parseInt(sheet.getRange("AG" + row).getValue(), 10);
//     var startDate = sheet.getRange("AH" + row).getValue();
//     var endDateCell = sheet.getRange("AI" + row);

//     if (isNaN(months) || !startDate || isNaN(new Date(startDate).getTime())) {
//       endDateCell.setValue("");
//       return;
//     }

//     var endDate = new Date(startDate);
//     endDate.setMonth(endDate.getMonth() + months);
//     endDateCell.setValue(Utilities.formatDate(endDate, sheet.getParent().getSpreadsheetTimeZone(), "dd/MM/yyyy"));
//   }
// }

// function onEdit(e) {
//   autoCalculateEndDate(e);
// }




