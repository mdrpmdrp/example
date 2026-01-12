function generateFFVTransactionJSON({ orderRows, dbRows } = {}) {
    // orderRows = temp_orderRows
    // dbRows = temp_dbRows
    orderRows = orderRows.slice(2); // Remove header rows

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const matcherSheet = ss.getSheetByName('FFV') || ss.insertSheet('FFV');
    const matcherData = matcherSheet.getDataRange().getDisplayValues();

    // Build optimized maps for O(1) lookups
    const productMap = new Map();
    const branchMap = new Map();

    // Pre-process matcher data once
    for (const row of matcherData) {
        const productKey = String(row[1]).toLowerCase().trim()
        const branchKey = String(row[5]).toLowerCase().trim()
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
                unit: row[3],
                price: row[4]
            });
        }
    }

    const header = ["Product Code", "Name (Eng)", "Name (Thai)", "ราคา", "Volume", "Unit"];
    // const newSpreadsheet = SpreadsheetApp.create(`order_${dateStr}-Fresh Flavors`);

    const tableObjects = { header, tabs: [] };
    let branchMapErrors = new Set();
    let productMapErrors = new Set();

    const branches = [{code: 'Food Foods Co.-Main'}] // FFV has only one branch
    // Process each branch
    const quantityIndex = 3; // For FFV, quantity is always at index 3
    for (const branch of branches) {
        // const branchSheet = newSpreadsheet.insertSheet(branch.code);
        if (branch.code === 'ไม่มีชื่อสาขา TOTAL') continue;
        const tabObject = { tabName: branch.code, rows: [] };
        const branchOrders = tabObject.rows;
        tableObjects.tabs.push(tabObject);

        for (let i = 0; i < orderRows.length; i++) {
            const row = orderRows[i];
            const quantity = row[quantityIndex];

            if (!quantity || quantity <= 0 || String(row[0]).trim() === 'TOTAL') continue;

            const productName = String(row[0]).toLowerCase().trim();
            if (!productMap.has(productName) && !productMapErrors.has(String(row[0]).trim())) {
                productMapErrors.add(String(row[0]).trim());
                Logger.log(`Product mapping not found for product name: "${productName}"`);
            }

            const productCode = productMap.get(productName) || 'UNKNOWN';
            const dbData = dbMap.get(productCode.toLowerCase());

            branchOrders.push([
                productCode,
                dbData?.nameEN ?? row[0],
                dbData?.nameTH ?? "",
                dbData?.price ?? 0,
                quantity,
                dbData?.unit ?? "" // For FRF, unit is in db
            ]);
        }
    }

    productMapErrors = [...productMapErrors];
    branchMapErrors = [...branchMapErrors];
    return JSON.stringify({ tableObjects, productMapErrors, branchMapErrors });
}
