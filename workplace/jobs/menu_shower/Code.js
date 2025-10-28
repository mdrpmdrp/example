function doGet(e) {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('Scrump Gelatoria - เมนูเจลาโต้')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getBranchData(branchId) {
    if (!branchId || branchId === '') {
        return getDefaultBranchData();
    }
    const ss = SpreasheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Branches');
    const data = sheet.getDataRange().getValues();
    let branchData = data.find(row => row[0] == branchId);
    if (branchData) {
        let branchName = branchData[1];
        let sheetBranchId = branchData[2];
        if (!sheetBranchId || sheetBranchId === '') {
            return JSON.stringify({
                success: false,
                error: 'Branch Data Incomplete'
            })
        }
        let branchSpreadsheet = SpreadsheetApp.openById(sheetBranchId);
        let branchSheet = branchSpreadsheet.getSheetByName('For Rich Menu');
        let branchDataRange = branchSheet.getDataRange().getValues();
        let categories = [...new Set(branchDataRange[0].slice(1).filter(cell => cell !== ''))];
        categories = categories.map((cat, i) => {
            return {
                name: cat,
                plates: branchDataRange[1][i * 2 + 1],
                cups: branchDataRange[1][i * 2 + 2],
            }
        }).filter(cat => cat.plates > 0 || cat.cups > 0);
        return JSON.stringify({
            success: true,
            branchName: branchName,
            branchId: branchId,
            categories: categories
        });
    } else {
        return JSON.stringify({
            success: false,
            error: 'Branch Not Found'
        })
    }
}

function getDefaultBranchData() {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('For Rich Menu');
    let categoryDetailSheet = ss.getSheetByName('Category Detail');
    let dateMonth = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd/MM');
    let data = sheet.getDataRange().getValues();
    let defaultBranchData = data.find(row => row[0] == dateMonth);
    let categoryDetail = categoryDetailSheet.getDataRange().getValues().slice(1).reduce((acc, row) => {
        acc[row[0]] = {
            imageUrl: row[1],
            min: row[2],
        };
        return acc;
    }, {});

    if (defaultBranchData) {
        let category = [...new Set(data[0].slice(1).filter(cell => cell !== ''))]
        category = category.map((cat, i) => {
            return {
                name: cat,
                plates: defaultBranchData[i * 2 + 1],
                cups: defaultBranchData[i * 2 + 2],
                imageUrl: categoryDetail[cat] ? categoryDetail[cat].imageUrl : '',
                min: categoryDetail[cat] ? categoryDetail[cat].min : 0,
            }
        }).filter(cat => cat.plates > 0 || cat.cups > 0);
        return JSON.stringify({
            success: true,
            branchName: 'G Floor, Central Park',
            branchId: 'DEFAULT',
            categories: category
        });
    } else {
        return JSON.stringify({
            success: false,
            error: 'Default Branch Not Found'
        });
    }
}