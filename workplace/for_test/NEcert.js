function exportThermoHygroData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Ecert");
  const data = sheet.getDataRange().getValues().slice(1); // Skip header row

  // Use object literal for faster data collection
  const dataMap = {};

  // Process main sheet data
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    let [date, , , , location_dept, uut_temp, uut_hum, std_temp, std_hum, location_detail, code, name, , , , , form_pm, form_cal] = row;

    if (!code) continue; // Skip entries without codes
    if (date instanceof Date && date.getMonth() === 4) {
      date = new Date(2025, 5, 1)
    }
    dataMap[code] = {
      date: (date instanceof Date) ? date.toISOString().split('T')[0] : '',
      location_dept: location_dept || '',
      location_detail: location_detail || '',
      code: code || '',
      name: name || '',
      form_pm: form_pm || '',
      form_cal: form_cal || ''
    };
  }

  // // Process other sheets in a single loop
  // const sheets = ['MONITOR', 'SPHYMO', 'FLOW,O2', 'FLOW,Air', 'REG, High', 'SUC, Thoracic', 'SUC, Low', 'OXIMETERS, PULSE'];
  // const processorMap = {
  //   'MONITOR': getMonitorData,
  //   'SPHYMO': getSphyData,
  //   'FLOW,O2': getFlowO2Data,
  //   'FLOW,Air': getFlowAirData,
  //   'REG, High': getRegHighData,
  //   'SUC, Thoracic': getSucthoracicData,
  //   'SUC, Low': getSucLowData,
  //   'OXIMETERS, PULSE': getOximetersPulseData,
  //   'EKG RECORDER': getEKGData
  // };

  // const sliceSize = {
  //   'MONITOR': 9,
  //   'SPHYMO': 13,
  //   'FLOW,O2': 11,
  //   'FLOW,Air': 11,
  //   'REG, High': 11,
  //   'SUC, Thoracic': 11,
  //   'SUC, Low': 11,
  //   'OXIMETERS, PULSE': 9,
  //   'EKG RECORDER': 9
  // };

  const sheetName = "Ecert";
  const currentSheet = ss.getSheetByName(sheetName);
  if (!currentSheet) return Logger.log('Sheet not found: ' + sheetName);

  const sheet_data = currentSheet.getDataRange().getValues();

  // Process entries
  for (let i = 0; i < sheet_data.length; i++) {
    if (sheet_data[i][0] === '' || sheet_data[i][1] === '') continue; // Skip empty rows

    let codeValue = sheet_data[i][10].toString().trim().replace('PYT3D_', '').replace('PYT3_', '').replace('D_', '');
    const hasUnderscore = codeValue.indexOf('_') !== -1;

    // Generate both possible codes
    let suffix
    if (hasUnderscore) {
      suffix = codeValue.padStart(7, '0');
    } else {
      suffix = codeValue.padStart(5, '0');
    }

    const code1 = 'PYT3_' + suffix;
    const code2 = 'PYT3D_' + suffix;
    const code3 = 'PYT3T_' + suffix;

    // Check which code exists in dataMap
    let actualCode = null;
    if (dataMap[code1]) {
      actualCode = code1;
    } else if (dataMap[code2]) {
      actualCode = code2;
    } else if (dataMap[code3]) {
      actualCode = code3;
    }
    else {
      Logger.log('Skipping code: ' + code1 + ', ' + code2 + ', and ' + code3 + ' as none exists in main data');
      continue;
    }

    // Process data for the existing code
    const calData = getThermoHygroData(sheet_data[i]);
    Object.assign(dataMap[actualCode], calData);
    if(dataMap[actualCode].checklist) {
      if (dataMap[actualCode].checklist.uut_hum == "" ||  dataMap[actualCode].checklist.std_hum == "" || dataMap[actualCode].checklist.uut_hum == "-" ||  dataMap[actualCode].checklist.std_hum == "-") {
        dataMap[actualCode].form_pm = "THERMOMETER DIGITAL (MED)#354";
        dataMap[actualCode].form_cal = "THERMOMETER DIGITAL (MED)#152";
      }else {
        dataMap[actualCode].form_pm = "THERMOMETER, HYGRO (MED)#357";
        dataMap[actualCode].form_cal = "THERMOMETER, HYGRO (MED)#24";
      }
    }
  }

  // Create JSON and save to file
  const json = JSON.stringify(dataMap, null, 2);
  const fileName = 'Ecert_Data_' + new Date().toISOString().replace(/:/g, '-') + '.json';

  // Create file directly with content, not using Blob
  const file = DriveApp.createFile(fileName, json);

  Logger.log('Data exported to: ' + file.getUrl());
}

function getThermoHygroData(data) {
  return {
    checklist: {
      uut_temp: data[5],
      uut_hum: data[6],
      std_temp: data[7],
      std_hum: data[8],
    }
  }
}

function getMonitorData(data) {
  return {
    checklist: {
      ground: data[1][5],
      leakage: data[2][5],
      ['sys-dia']: [[data[6][0], data[6][1]], [data[7][0], data[7][1]], [data[8][0], data[8][1]]],
      hr: [[data[6][3], data[6][4]], [data[7][3], data[7][4]], [data[8][3], data[8][4]]],
      spo2: [[data[6][5], data[6][6]], [data[7][5], data[7][6]], [data[8][5], data[8][6]]],
    }
  }
}

function getEKGData(data) {
  return {
    checklist: [[data[6][3], data[6][4]], [data[7][3], data[7][4]], [data[8][3], data[8][4]]],
  }
}

function getSphyData(data) {
  return {
    checklist: {
      leakage: data[4][1],
      battery: data[5][1],
      pressure: data.slice(9).map(r => [r[0], r[1]]),
    }
  };
}

function getFlowO2Data(data) {
  return {
    checklist: data.slice(6).map(r => [r[0], r[1]]),
  };
}

function getFlowAirData(data) {
  return {
    checklist: data.slice(6).map(r => [r[0], r[1]]),
  };
}

function getRegHighData(data) {
  return {
    checklist: data.slice(6).map(r => [r[0], r[1]]),
  };
}

function getSucthoracicData(data) {
  return {
    checklist: data.slice(6).map(r => [r[0], r[1]]),
  };
}

function getSucLowData(data) {
  return {
    checklist: data.slice(6).map(r => [r[0], r[1]]),
  };
}

function getOximetersPulseData(data) {
  return {
    checklist: {
      spo2: data.slice(6).map(r => [r[0], r[1]]),
      hr: data.slice(6).map(r => [r[2], r[3]])
    }
  };
}