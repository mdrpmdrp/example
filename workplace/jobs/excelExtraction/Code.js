function doGet(e){
    return HtmlService.createTemplateFromFile('upload').evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('File Upload')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function processOrder({storeName, fileOrderDataURL, fileDbDataURL}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return processFRFOrder({fileOrderDataURL, fileDbDataURL});
        default:
            throw new Error('Store not recognized');
    }
}

function generateTransactionFile({storeName, orderRows, dbRows}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return generateFRFTransactionFile({orderRows, dbRows});
        default:
            throw new Error('Store not recognized');
    }
}