function doGet(e){
    return HtmlService.createTemplateFromFile('upload').evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('File Upload')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setFaviconUrl('https://img.icons8.com/color/48/upload-2--v1.png')
}

function processOrder({storeName, fileOrderDataURL, fileDbArray, fileOrderName}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return null; // No processing needed here for FRF. processing is done at frontend
        case 'boko':
            return getBokoOrderRows({fileOrderDataURL, fileOrderName, dbRows: fileDbArray});
        case 'ffv':
            return null
        case 'ak':
            return null
        default:
            throw new Error('Store not recognized');
    }
}

function generateTransactionJSON({storeName, orderRows, dbRows}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return generateFRFTransactionJSON({orderRows, dbRows});
        case 'boko':
            return generateBokoTransactionJSON({orderRows, dbRows});
        case 'ffv':
            return generateFFVTransactionJSON({orderRows, dbRows});
        case 'ak':
            return generateAKTransactionJSON({orderRows, dbRows});
        default:
            throw new Error('Store not recognized');
    }
}