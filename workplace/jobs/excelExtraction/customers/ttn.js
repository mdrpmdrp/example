function generateTTNTransactionJSON({ orderRows, dbRows } = {}) {
    orderRows = normalizeTTNOrderRows(orderRows)
    // orderRows = orderRows.slice(1); // Remove header rows

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const matcherSheet = ss.getSheetByName('TTN') || ss.insertSheet('TTN');
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

    // ถึงนี่ล่ะ

    const header = ["Product Code", "Name (Eng)", "Name (Thai)", "ราคา", "Volume", "Unit"];
    // const newSpreadsheet = SpreadsheetApp.create(`order_${dateStr}-MGT`);

    const tableObjects = { header, tabs: [] };
    let branchMapErrors = new Set();
    let productMapErrors = new Set();

    // Pre-normalize branch names for reuse
    const branches = orderRows.slice(1).reduce((uniqueBranches, row) => {
        const branchName = String(row[0]).toLowerCase().trim();
        if (!branchMap.has(branchName) && branchName !== 'total') {
            branchMapErrors.add(branchName.trim());
            Logger.log(`Branch mapping not found for branch name: "${branchName}"`);
        }
        const code = branchMap.get(branchName) || ("ไม่มีชื่อสาขา " + branchName.trim());
        if (!uniqueBranches.some(b => b.code === code)) {
            uniqueBranches.push({
                code: code,
                name: branchName,
                index: 2 // Volume is always at index 2 for TTN
            });
        }
        return uniqueBranches;
    }, []).filter(branch => branch.code !== null); // Filter out any branches that ended up with empty code

    // Process each branch
    for (const branch of branches) {
        // const branchSheet = newSpreadsheet.insertSheet(branch.code);
        if (branch.code === 'ไม่มีชื่อสาขา TOTAL') continue;
        const tabObject = { tabName: branch.code, rows: [] };
        const branchOrders = tabObject.rows;
        tableObjects.tabs.push(tabObject);
        for (let i = 1; i < orderRows.length; i++) {
            const row = orderRows[i];
            if (row[0]?.toLowerCase().trim() !== branch.name.toLowerCase().trim()) continue; // Skip rows that don't belong to the current branch
            const quantity = row[branch.index];

            if (!quantity || quantity <= 0 || row[0]?.trim().toLowerCase() === 'total' || row[1]?.trim().toLowerCase() === 'total') continue;

            const productName = String(row[1]).toLowerCase().trim();
            if (!productMap.has(productName) && !productMapErrors.has(productName)) {
                productMapErrors.add(productName);
                Logger.log(`Product mapping not found for product name: "${productName}"`);
            }

            const productCode = productMap.get(productName) || 'UNKNOWN';
            const dbData = dbMap.get(productCode.toLowerCase());

            branchOrders.push([
                productCode,
                dbData?.nameEN ?? row[1]?.trim(), // Use original name if not found in DB
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

function normalizeTTNOrderRows(orderRows) {
    const normalizedRows = [];
    const data = orderRows[0];

    const generalOrders = data['general order'];
    for (let i = 1; i < generalOrders.length; i++) {
        const row = generalOrders[i];
        const firstCol = row[0]?.toString().toLowerCase() ?? '';
        if (!firstCol || firstCol.includes('total')) continue;
        normalizedRows.push(['general order', row[1], row[3]]);
    }

    const shopOrders = data['order by shop'];
    for (let i = 1; i < shopOrders.length; i++) {
        const row = shopOrders[i];
        const firstCol = row[0]?.toString().toLowerCase() ?? '';
        if (!firstCol || firstCol.includes('total')) continue;
        const branch = row[1];
        if (!branch) continue;
        normalizedRows.push([branch, row[3], row[6]]);
    }

    return normalizedRows;
}