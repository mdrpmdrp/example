function readExcelFile(file) {
    // the inputfile type is arraybuffer
    const data = new Uint8Array(file);
    let excelFile = DriveApp.createFile('temp.xlsx', data);
    let workbook = XLSX.read(excelFile.getBlob().getBytes(), {type: 'array'});
    let firstSheetName = workbook.SheetNames[0];
    let worksheet = workbook.Sheets[firstSheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ''});
}