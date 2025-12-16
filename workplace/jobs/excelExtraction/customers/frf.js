function processFRFOrder({fileOrderDataURL, fileDbDataURL}){
    const orderData = readExcelData(fileOrderDataURL);
    const dbData = readExcelData(fileDbDataURL);

    let ss = SpreadsheetApp.getActiveSpreadSheet();
    let orderSheet = ss.getSheetByName('FRF_Orders') || ss.insertSheet('FRF_Orders');
    let dbSheet = ss.getSheetByName('FRF_DB') || ss.insertSheet('FRF_DB');

    orderSheet.clearContents();
    dbSheet.clearContents();

    if(orderData){
        orderSheet.getRange(1, 1, orderData.length, orderData[0].length).setValues(orderData);
    }

    if(dbData){
        dbSheet.getRange(1, 1, dbData.length, dbData[0].length).setValues(dbData);
    }

    return {
        orderRows: orderData ? orderData.length : 0,
        dbRows: dbData ? dbData.length : 0
    };
}

