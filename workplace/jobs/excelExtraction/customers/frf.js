function processFRFOrder({fileOrderDataURL, fileDbDataURL}){
    const orderData = readExcelData(fileOrderDataURL);
    const dbData = readExcelData(fileDbDataURL);
    return JSON.stringify({
        orderRows: orderData,
        dbRows: dbData
    });
}

function generateFRFTransactionFile({orderRows, dbRows} = {}) {
    orderRows = orderRows.slice(2); // Remove header rows
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const matcherSheet = ss.getSheetByName('FRF_matcher') || ss.insertSheet('FRF_matcher');
    const matcherData = matcherSheet.getDataRange().getDisplayValues();
    
    // Build optimized maps for O(1) lookups
    const productMap = new Map();
    const branchMap = new Map();
    
    // Pre-process matcher data once
    for (const row of matcherData) {
        const productKey = String(row[1]).toLowerCase().trim();
        const branchKey = String(row[5]).toLowerCase().trim();
        if (productKey) productMap.set(productKey, String(row[0]).trim());
        if (branchKey) branchMap.set(branchKey, String(row[4]).trim());
    }
    
    // Build database map for O(1) product lookups
    const dbMap = new Map();
    for (const row of dbRows) {
        const code = String(row[0]).toLowerCase().trim();
        if (code) {
            dbMap.set(code, {
                nameEN: row[1],
                nameTH: row[2],
                price: row[4]
            });
        }
    }
    
    const header = ["Product Code", "Name (Eng)", "Name (Thai", "ราคา", "Volume", "Unit"];
    const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MMdd');
    const newSpreadsheet = SpreadsheetApp.create(`order_${dateStr}-Fresh Flavors`);
    
    // Pre-normalize branch names for reuse
    const branches = orderRows[0].slice(4).map((branchName, index) => ({
        code: branchMap.get(String(branchName).toLowerCase().trim()) || 'UNKNOWN',
        index: index + 4
    }));
    
    // Process each branch
    for (const branch of branches) {
        const branchSheet = newSpreadsheet.insertSheet(branch.code);
        const branchOrders = [];
        
        for (let i = 1; i < orderRows.length; i++) {
            const row = orderRows[i];
            const quantity = row[branch.index];
            
            if (!quantity || quantity <= 0 || row[0] === 'TOTAL') continue;
            
            const productName = String(row[0]).toLowerCase().trim();
            const productCode = productMap.get(productName) || 'UNKNOWN';
            const dbData = dbMap.get(productCode.toLowerCase());
            
            branchOrders.push([
                productCode,
                dbData?.nameEN ?? row[0],
                dbData?.nameTH ?? 'N/A',
                dbData?.price ?? 0,
                quantity,
                String(row[3]).trim()
            ]);
        }
        
        // Write data in a single batch operation
        if (branchOrders.length > 0) {
            branchSheet.getRange(1, 1, branchOrders.length + 1, header.length)
                .setValues([header, ...branchOrders]);
        } else {
            branchSheet.getRange(1, 1, 1, header.length).setValues([header]);
        }
        
        // Format header
        branchSheet.getRange(1, 1, 1, header.length)
            .setBackground('#fde9d9')
            .setFontWeight('bold');
        branchSheet.getDataRange().setFontSize(8);
    }
    
    // Remove first sheet and sort
    newSpreadsheet.deleteSheet(newSpreadsheet.getSheets()[0]);
    
    const sheets = newSpreadsheet.getSheets().sort((a, b) => a.getName().localeCompare(b.getName()));
    sheets.forEach((sheet, index) => {
        newSpreadsheet.setActiveSheet(sheet);
        newSpreadsheet.moveActiveSheet(index + 1);
    });
    
    return newSpreadsheet.getUrl();
}
