function myFunction() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.getSheets().forEach(sheet => {
    const shName = sheet.getName();
    const finder = sheet.getRange('A1:A').createTextFinder('CODE').findAll();
    if (finder.length > 0) {
      finder.forEach(f => {
        Logger.log(`${shName}: ${f.getA1Notation()}`);
        f.offset(0, 1).getA1Notation(); // Missing () in original code
      });
    }
  });
}

function onEdit(e) {
  const range = e.range;

  // Early returns for efficiency
  if (range.getColumn() !== 2) return;

  const codeCell = range.offset(0, -1);
  const codeValue = codeCell.getValue();

  // Handle case where CODE is in same row
  if (codeValue === 'CODE') {
    handleDirectCodeEdit(range);
  }
  // Handle case where CODE is 2 rows above
  else if (range.offset(-2, -1).getValue() === 'CODE') {
    handleDateEdit(range);
  }

  // Handle case where CODE is 1 rows above
  else if (range.offset(-1, -1).getValue() === 'CODE') {
    handleDepartmentEdit(range);
  }
  // Handle case where CODE is 3 rows above
  else if (range.offset(-3, -1).getValue() === 'CODE') {
    handleDescriptionEdit(range);
  }
}

function handleDirectCodeEdit(range) {
  const value = range.getDisplayValue();
  Logger.log(value)
  if (!/\d{4,}/g.test(value)) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('รายการ');
  const codeData = sheet.getRange('F1:F').getDisplayValues().flat();
  let regex = new RegExp(value + '$');
  const index = codeData.findIndex(x => regex.test(x));
  Logger.log(index);
  if (index < 0) return;

  const ggid = sheet.getSheetId();
  const listGgid = range.getSheet().getSheetId();
  const a1notation = 'F' + (index + 1);

  // Create bidirectional links
  createBidirectionalLinks(range, sheet, ggid, listGgid, a1notation, value);
}

function handleDateEdit(range) {
  const value = range.getValue();
  const code = range.offset(-2, 0).getDisplayValue();
  // if (!value.getFullYear) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('รายการ');
  const codeData = sheet.getRange('F1:F').getValues().flat();

  const index = codeData.findIndex(x => x.indexOf(code) > -1);
  Logger.log(index);
  if (index < 0) return;

  sheet.getRange('A' + (index + 1)).setValue(value);
}

function handleDescriptionEdit(range) {
  const value = range.getValue();
  const code = range.offset(-3, 0).getDisplayValue();
  if (value === '') return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('รายการ');
  const codeData = sheet.getRange('F1:F').getValues().flat();

  const index = codeData.findIndex(x => x.indexOf(code) > -1);
  Logger.log(index);

  sheet.getRange('E' + (index + 1)).setValue(value);
}

function handleDepartmentEdit(range) {
  const value = range.getValue();
  const code = range.offset(-1, 0).getDisplayValue();
  if (value === '') return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('รายการ');
  const codeData = sheet.getRange('F1:F').getValues().flat();
  const index = codeData.findIndex(x => x.indexOf(code) > -1);
  Logger.log(index);
  if (index < 0) return;
  sheet.getRange('D' + (index + 1)).setValue(value);
}

function createBidirectionalLinks(range, sheet, sheetGid, listGid, targetA1, value) {
  // URL for the link from the edited cell to the target cell
  const targetUrl = `#gid=${sheetGid}&range=${targetA1}`;

  // URL for the link from the target cell back to the edited cell
  const sourceUrl = `#gid=${listGid}&range=${range.getA1Notation()}`;

  // Create rich text for the edited cell
  const sourceRichText = SpreadsheetApp.newRichTextValue()
    .setText(value)
    .setLinkUrl(targetUrl)
    .build();

  // Create rich text for the target cell
  const targetRichText = SpreadsheetApp.newRichTextValue()
    .setText(sheet.getRange(targetA1).getValue())
    .setLinkUrl(sourceUrl)
    .build();

  // Apply both rich text values
  range.setRichTextValue(sourceRichText);
  sheet.getRange(targetA1).setRichTextValue(targetRichText);
}

function recreateBidirectionalLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('รายการ');
  const masterGid = masterSheet.getSheetId();
  const masterCodes = masterSheet.getRange('F1:F').getDisplayValues().flat();

  // Process all sheets in the spreadsheet
  ss.getSheets().forEach(sheet => {
    const sheetName = sheet.getName();
    if (['รายการ', 'Dashboard', 'รายการEcert', 'จำแนกฟอร์ม', 'สำเนาของ FLOW,O2',
     "monitor Philips", 
      'MONITOR',
      // 'SPHYMO',
      'FLOW,O2',
      'FLOW,Air',
      'REG, High',
      'SUC, Low',
      'OXIMETERS, PULSE',
      'Thopaz'

    ].includes(sheetName)) return; // Skip master and specific sheets

    const sheetGid = sheet.getSheetId();
    const finder = sheet.getRange('A740:A').createTextFinder('CODE').findAll();

    if (finder.length > 0) {
      if (finder[0].offset(0, 1).getDisplayValue() == '') return
      finder.forEach(codeCell => {
        const valueCell = codeCell.offset(0, 1);
        const codeValue = valueCell.getDisplayValue();

        // Only process cells with numeric codes of 4+ digits
        if (!/\d{4,}/g.test(codeValue)) return;

        const deptCell = codeCell.offset(1, 1);
        const dateCell = codeCell.offset(2, 1);
        const locationCell = codeCell.offset(3, 1);
        const deptValue = deptCell.getDisplayValue();
        const dateValue = dateCell.getValue();
        const locationValue = locationCell.getValue();

        // Find matching code in master sheet
        let regex = new RegExp(codeValue + '$');
        const masterIndex = masterCodes.findIndex(x => regex.test(x));

        if (masterIndex >= 0) {
          const masterA1 = 'F' + (masterIndex + 1);
          createBidirectionalLinks(valueCell, masterSheet, masterGid, sheetGid, masterA1, codeValue);
          // Set additional fields in master sheet
          masterSheet.getRange('D' + (masterIndex + 1)).setValue(deptValue);
          masterSheet.getRange('A' + (masterIndex + 1)).setValue(dateValue);
          masterSheet.getRange('E' + (masterIndex + 1)).setValue(locationValue);
          Logger.log(`Recreated link for ${sheetName}: ${valueCell.getA1Notation()} ↔ รายการ: ${masterA1}`);
        }
      });
    }
  });

  Logger.log('Bidirectional links recreation completed');
}

function syncDateFromMaster() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('รายการ');
  const masterCodes = masterSheet.getRange('F1:F').getDisplayValues().flat();
  const masterDates = masterSheet.getRange('A1:A').getValues().flat();
  
  ss.getSheets().forEach(sheet => {
    const sheetName = sheet.getName();
    if (['รายการ', 'Dashboard', 'รายการEcert', 'จำแนกฟอร์ม', 'สำเนาของ FLOW,O2',
     "monitor Philips", 
      'MONITOR',
      // 'SPHYMO',
      'FLOW,O2',
      'FLOW,Air',
      'REG, High',
      'SUC, Low',
      'OXIMETERS, PULSE',
      'Thopaz'

    ].includes(sheetName)) return; // Skip master and specific sheets

    const finder = sheet.getRange('A1:A').createTextFinder('CODE').findAll();
    if (finder.length > 0) {
      finder.forEach(codeCell => {
        const valueCell = codeCell.offset(0, 1);
        const codeValue = valueCell.getDisplayValue();

        // Only process cells with numeric codes of 4+ digits
        if (!/\d{4,}/g.test(codeValue)) return;

        // Find matching code in master sheet
        let regex = new RegExp(codeValue + '$');
        const masterIndex = masterCodes.findIndex(x => regex.test(x));

        if (masterIndex >= 0) {
          const masterDate = masterDates[masterIndex];
          const dateCell = codeCell.offset(2, 1); // Assuming date is 2 rows below CODE
          dateCell.setValue(masterDate);
          Logger.log(`Synced date for ${sheetName}: ${dateCell.getA1Notation()} set to ${masterDate}`);
        }
      });
    }
  });

  Logger.log('Date synchronization from master completed');
}


function recheckBidirectionalLinks() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('รายการ');
  const masterGid = masterSheet.getSheetId();

  // get link from cell
  let lastRow = masterSheet.getLastRow();
  for (let i = 1; i <= lastRow; i++) {
    console.log(i)
    const cell = masterSheet.getRange('F' + i);
    const richText = cell.getRichTextValue();
    if (richText) {
      const linkUrl = richText.getLinkUrl();
      if (linkUrl && linkUrl != null) {
        const match = linkUrl.match(/gid=(\d+)&range=([A-Z]+\d+)/);
        if (match) {
          const sheetGid = match[1];
          const rangeA1 = match[2];
          const targetSheet = ss.getSheetById(sheetGid);
          if (targetSheet) {
            const targetCell = targetSheet.getRange(rangeA1);
            cell.offset(0, 1).setValue(targetCell.getDisplayValue())
          } else {
            Logger.log(`Sheet with gid ${sheetGid} not found for cell ${cell.getA1Notation()}`);
          }
        }
      }
    }
  }

}