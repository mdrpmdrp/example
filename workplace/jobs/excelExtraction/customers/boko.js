function getBokoOrderRows({ fileOrderDataURL, dbRows }) {
    try {
        // fileOrderDataURL is dataurl of pdf file, convert pdf to text and parse order rows
        const blob = Utilities.newBlob(Utilities.base64Decode(fileOrderDataURL.split(',')[1]));

        // Convert PDF to Google Doc to use OCR
        const resource = {
            title: 'temp_boko_order_ocr',
            mimeType: 'application/vnd.google-apps.document'
        };
        const ocrFile = Drive.Files.create(resource, blob, {
            ocr: true
        });

        const ocrDoc = DocumentApp.openById(ocrFile.id);
        const ocrText = ocrDoc.getBody().getText();
        Drive.Files.remove(ocrFile.id);
        const orderRows = extractBokoOrderRows(ocrText, dbRows);

        // remove the temporary OCR document

        return JSON.stringify({orderRows})
    } catch (e) {
        Logger.log('Error in generating Boko transaction JSON: ' + e.message);
        throw e;
    }
}

function extractBokoOrderRows(ocrText, dbRows) {
    const branchRegex = /Code\s*:\s*(\w+)/;
    if (!branchRegex.test(ocrText)) {
        throw new Error('Branch code not found in OCR text');
    }
    const branchCode = ocrText.match(branchRegex)[1].trim();

    const itemRegex = /^\s*(\d+)\s+(\d+)\s+(.+?)\s+(\d+%)\s+([\d,.]+)\s+(\w+)/gm;
    const orderRows = [];
    let match;

    while ((match = itemRegex.exec(ocrText)) !== null) {
        orderRows.push({
            branchCode: branchCode,
            position: match[1],
            articleNo: match[2],
            description: match[3].trim(),
            vat: match[4],
            quantity: match[5],
            unit: match[6]
        });
    }
    return orderRows;
}
function generateBokoTransactionJSON({orderRows, dbRows } = {}) {

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const matcherSheet = ss.getSheetByName('BOKO') || ss.insertSheet('BOKO');
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
    
     // Pre-normalize branch names for reuse
    // const branches = orderRows[0].slice(4).map((branchName, index) => {
    //     if(!branchMap.has(String(branchName).toLowerCase().trim()) && branchName.toLowerCase().trim() !== 'total'){
    //         branchMapErrors.add(branchName.trim());
    //         Logger.log(`Branch mapping not found for branch name: "${branchName}"`);
    //     }
    //     return {
    //         code: branchMap.get(String(branchName).toLowerCase().trim()) || ("ไม่มีชื่อสาขา " + branchName.trim()),
    //         index: index + 4
    //     }
    // });
    const branches = [];
    for (const row of orderRows) {
        const branchName = row.branchCode;
        if (!branchMap.has(String(branchName).toLowerCase().trim()) && branchName.toLowerCase().trim() !== 'total') {
            branchMapErrors.add(branchName.trim());
            Logger.log(`Branch mapping not found for branch name: "${branchName}"`);
        }
        const branchCode = branchMap.get(String(branchName).toLowerCase().trim()) || ("ไม่มีชื่อสาขา " + branchName.trim());
        if (!branches.find(b => b.code === branchCode)) {
            branches.push({ code: branchCode });
        }
    }



    // Process each branch
    for (const branch of branches) {
        // const branchSheet = newSpreadsheet.insertSheet(branch.code);
        if (branch.code === 'ไม่มีชื่อสาขา TOTAL') continue;
        const tabObject = { tabName: branch.code, rows: [] };
        const branchOrders = tabObject.rows;
        tableObjects.tabs.push(tabObject);

        const branchOrderRows = orderRows.filter(row => {
            const mappedBranchCode = branchMap.get(String(row.branchCode).toLowerCase().trim()) || ("ไม่มีชื่อสาขา " + row.branchCode.trim());
            return mappedBranchCode === branch.code;
        });
        
        for (const row of branchOrderRows) {
            const quantity = Number(String(row.quantity).replace(/\./g, '').replace(/,/g, '.'));
            if (!quantity || quantity <= 0 || row.articleNo.trim() === 'TOTAL') continue;

            const articleNo = String(row.articleNo).toLowerCase().trim().replace(/^0+/, '');
            if (!productMap.has(articleNo) && !productMapErrors.has(row.articleNo.trim())) {
                productMapErrors.add(row.articleNo.trim());
                Logger.log(`Product mapping not found for product name: "${articleNo}"`);
            }

            const productCode = productMap.get(articleNo) || 'UNKNOWN';
            const dbData = dbMap.get(productCode.toLowerCase());

            branchOrders.push([
                productCode,
                dbData?.nameEN ?? row.description,
                dbData?.nameTH ?? "",
                dbData?.price ?? 0,
                quantity,
                dbData?.unit ?? "" //unit is in db
            ]);
        }

    }

    productMapErrors = [...productMapErrors];
    branchMapErrors = [...branchMapErrors];
    return JSON.stringify({ tableObjects, productMapErrors, branchMapErrors });
}

