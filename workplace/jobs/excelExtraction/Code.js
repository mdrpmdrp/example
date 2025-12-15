function doGet(e){
    return HtmlService.createTemplateFromFile('upload').evaluate()
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('File Upload')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function processOrder({storeName, fileOrder, fileDb}){
    switch(storeName.toLowerCase()){
        case 'frf':
            return processFRFOrder({fileOrder, fileDb});
        default:
            throw new Error('Store not recognized');
    }
}