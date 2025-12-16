function processFRFOrder({fileOrderDataURL, fileDbDataURL}){
    const orderData = readExcelData(fileOrderDataURL);
    const dbData = readExcelData(fileDbDataURL);
    return JSON.stringify({
        orderRows: orderData,
        dbRows: dbData
    });
}

function generateFRFTransactionFile({orderRows, dbRows} = {}) {
    // orderRows = temp_orderRows;
    // dbRows = temp_dbRows;
    orderRows = orderRows.slice(2); // Remove header rows
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const matcherSheet = ss.getSheetByName('FRF_matcher') || ss.insertSheet('FRF_matcher');
    const matcherData = matcherSheet.getDataRange().getDisplayValues();
    
    // Build optimized maps for O(1) lookups
    const productMap = new Map();
    const branchMap = new Map();
    const dbMap = new Map();
    
    // Pre-process matcher data once
    matcherData.forEach(row => {
        const productKey = String(row[1]).toLowerCase().trim();
        const branchKey = String(row[5]).toLowerCase().trim();
        if (productKey) productMap.set(productKey, String(row[0]).trim());
        if (branchKey) branchMap.set(branchKey, String(row[4]).trim());
    });
    
    // Build database map for O(1) product lookups
    dbRows.forEach(row => {
        const code = String(row[0]).toLowerCase().trim();
        if (code) {
            dbMap.set(code, {
                nameEN: row[1],
                nameTH: row[2],
                price: row[4]
            });
        }
    });
    
    const header = ["Product Code", "Name (Eng)", "Name (Thai", "ราคา", "Volume", "Unit"];
    const today = new Date();
    const dateStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MMdd');
    const newSpreadsheet = SpreadsheetApp.create(`order_${dateStr}-Fresh Flavors`);
    
    // Pre-normalize branch names for reuse
    const branches = orderRows[0].slice(4).map((branchName, index) => ({
        name: branchName,
        code: branchMap.get(String(branchName).toLowerCase().trim()) || 'UNKNOWN',
        index: index + 4
    }));
    
    // Process each branch
    branches.forEach(branch => {
        const branchSheet = newSpreadsheet.getSheetByName(branch.code) || newSpreadsheet.insertSheet(branch.code);
        
        // Build branch orders with combined filter/map for better performance
        const branchOrders = [];
        for (let i = 1; i < orderRows.length; i++) {
            const row = orderRows[i];
            const quantity = row[branch.index];
            
            // Skip invalid rows
            if (!quantity || quantity <= 0 || row[0] === 'TOTAL') continue;
            
            const productName = String(row[0]).toLowerCase().trim();
            const productCode = productMap.get(productName) || 'UNKNOWN';
            const pack = String(row[3]).trim();
            
            // O(1) database lookup using pre-built map
            const dbData = dbMap.get(productCode.toLowerCase());
            
            branchOrders.push([
                productCode,
                dbData ? dbData.nameEN : row[0],
                dbData ? dbData.nameTH : 'N/A',
                dbData ? dbData.price : 0,
                quantity,
                pack
            ]);
        }
        
        // Write data in a single batch operation
        branchSheet.getRange(1, 1, 1, header.length).setValues([header]);
        if (branchOrders.length > 0) {
            branchSheet.getRange(2, 1, branchOrders.length, header.length).setValues(branchOrders);
        }
        
        // Format header
        branchSheet.getRange(1, 1, 1, header.length)
            .setBackground('#fde9d9')
            .setFontWeight('bold');
        branchSheet.getDataRange().setFontSize(8);
        
    });
    
    // remove First Sheet
    if (newSpreadsheet.getSheets().length > 1) {
        newSpreadsheet.deleteSheet(newSpreadsheet.getSheets()[0]);
    }

    // sort sheet tab alphabetically
    const sheets = newSpreadsheet.getSheets();
    sheets.sort((a, b) => a.getName().localeCompare(b.getName()));
    sheets.forEach((sheet, index) => {
        newSpreadsheet.setActiveSheet(sheet);
        newSpreadsheet.moveActiveSheet(index + 1);
    });
    
    const url = newSpreadsheet.getUrl();
    Logger.log('Transaction file generated: ' + url);
    return url;
}