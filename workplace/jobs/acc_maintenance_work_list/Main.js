/**
 * Main entry point for the application
 * Serves the HTML interface and coordinates between services
 */

/**
 * Serve the HTML form
 */
function doGet() {
  try {
    const html = HtmlService.createTemplateFromFile('index');
    const ss = getSpreadsheet();
    
    // Load data with caching
    html.contractorList = getContractorList(ss);
    html.supervisorList = getSupervisorList(ss);
    html.preDefinedWorkOrders = getPredefinedWorkOrderList(ss);
    
    return html.evaluate()
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('ACC Maintenance Work List')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (error) {
    Logger.log('Error in doGet: ' + error);
    return HtmlService.createHtmlOutput(
      '<h1>Error loading application</h1><p>' + error.toString() + '</p>'
    );
  }
}

/**
 * Include external HTML/JS files
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
