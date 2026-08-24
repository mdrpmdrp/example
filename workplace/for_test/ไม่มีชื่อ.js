function fillRandom(min=5.5,max=6.5,resolution=0.05,ranges='M5:M249'){
    ranges = [
      'D4:D248',
      // 'E4:E248',
      // 'F4:F248',
    //   'K5:K249',
    //   'N5:N249',
    //   'Q5:Q249',
    //   'T5:T249',
    //   'W5:W249',
    //   'AB5:AB249',
    //   'AF5:AF249',
    //   'AJ5:AJ249',
      
    ]
    if(typeof ranges === 'string') ranges = [ranges]
    ranges.forEach(function(range){
        let ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName("incubator");
        let r = sheet.getRange(range).getValues()
        let values = r.map(function(row){
            row[0] = Math.random() * (max - min) + min;
            row[0] = Math.round(row[0] / resolution) * resolution;
            // round to 2 decimal place
            row[0] = Math.round(row[0] * 100) / 100;
            return row;
        });
        sheet.getRange(range).setValues(values)
    })
  }