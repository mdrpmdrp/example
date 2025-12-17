function doGet(e){
    return HtmlService.createTemplateFromFile('upload').evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('File Upload')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl('https://img.icons8.com/color/48/upload-2--v1.png')
}

function processOrder({storeName, fileOrderData, fileDbData}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return generateFRFTransactionJSON({orderRows: fileOrderData, dbRows: fileDbData});
        default:
            throw new Error('Store not recognized');
    }
}

function generateTransactionJSON({storeName, orderRows, dbRows}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return generateFRFTransactionJSON({orderRows, dbRows});
        default:
            throw new Error('Store not recognized');
    }
}