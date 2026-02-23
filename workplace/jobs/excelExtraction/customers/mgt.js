function generateMGTTransactionJSON({ orderRows, dbRows } = {}) {
    // orderRows = temp_orderRows
    // dbRows = temp_dbRows
    orderRows = orderRows.slice(1); // Remove header rows

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Build optimized maps for O(1) lookups
    const productMap = new Map();
    const branchMap = new Map();
    orderRows[0].slice(3).map((branchName, index) => {
        if(branchName.toLowerCase().trim() === 'total') return;
       branchMap.set(String(branchName).toLowerCase().trim(), String(branchName).trim());
    });
    orderRows.slice(1).forEach(row => {
        const productName = String(row[0]).toLowerCase().trim();
        if(productName.toLowerCase().trim() === 'total') return;
        if (productName) {
            productMap.set(productName, String(row[0]).trim());
        }
    })

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
    // const newSpreadsheet = SpreadsheetApp.create(`order_${dateStr}-MGT`);

    const tableObjects = { header, tabs: [] };
    let branchMapErrors = new Set();
    let productMapErrors = new Set();

    // Pre-normalize branch names for reuse
    const branches = orderRows[0].slice(3).map((branchName, index) => {
        if(!branchMap.has(String(branchName).toLowerCase().trim()) && branchName.toLowerCase().trim() !== 'total'){
            branchMapErrors.add(branchName.trim());
            Logger.log(`Branch mapping not found for branch name: "${branchName}"`);
        }
        return {
            code: branchMap.get(String(branchName).toLowerCase().trim()) || ("ไม่มีชื่อสาขา " + branchName.trim()),
            index: index + 3
        }
    });


    // Process each branch
    for (const branch of branches) {
        // const branchSheet = newSpreadsheet.insertSheet(branch.code);
        if(branch.code === 'ไม่มีชื่อสาขา TOTAL') continue;
        const tabObject = { tabName: branch.code, rows: [] };
        const branchOrders = tabObject.rows;
        tableObjects.tabs.push(tabObject);

        for (let i = 1; i < orderRows.length; i++) {
            const row = orderRows[i];
            const quantity = row[branch.index];

            if (!quantity || quantity <= 0 || row[0]?.trim().toLowerCase() === 'total' || row[1]?.trim().toLowerCase() === 'total') continue;

            const productName = String(row[0]).toLowerCase().trim();
            if (!productMap.has(productName) && !productMapErrors.has(row[0].trim())) {
                productMapErrors.add(row[0].trim());
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
