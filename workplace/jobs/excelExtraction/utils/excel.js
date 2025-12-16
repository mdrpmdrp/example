function readExcelData(dataUrl) {
    // 1. Split the Data URL to get the Base64 data part
    const parts = dataUrl.split(',');
    if (parts.length < 2) {
        Logger.log('Invalid Data URL format.');
        return null;
    }
    const base64Data = parts[1];

    // 2. Decode the Base64 data into a Blob
    const excelBlob = Utilities.newBlob(
        Utilities.base64Decode(base64Data),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // MIME type for .xlsx
        'temp_excel_file.xlsx'
    );

    let tempSheetId = null;

    try {
        // 3. Convert the Excel Blob to a temporary Google Sheet file using the Drive API
        // We set 'convert: true' to tell Drive to change the file format.
        const resource = {
            title: 'TEMP_CONVERSION_' + new Date().getTime(),
            mimeType: MimeType.GOOGLE_SHEETS,
        };

        // Inserts the blob and converts it to a Google Sheet
        const convertedFile = Drive.Files.create(resource, excelBlob, {
            convert: true
        });

        tempSheetId = convertedFile.id;
        Logger.log('Temporary Sheet created with ID: ' + tempSheetId);

        // 4. Read data from the converted Google Sheet
        const ss = SpreadsheetApp.openById(tempSheetId);
        const sheet = ss.getSheets()[0]; // Get the first sheet
        const data = sheet.getDataRange().getValues();

        Logger.log('Data successfully read from Excel file:');

        return data;

    } catch (e) {
        Logger.log('An error occurred during file processing: ' + e.toString());
        return null;

    } finally {
        // 5. Clean up: Delete the temporary file from Google Drive
        if (tempSheetId) {
            Drive.Files.remove(tempSheetId);
            Logger.log('Temporary Sheet deleted.');
        }
    }
}