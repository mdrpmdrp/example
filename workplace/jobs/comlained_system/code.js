// Google Apps Script Code for Complain Management System
// Main File: code.js
// 
// This is the main entry point that imports modular components.
// 
// Module Structure:
// - cache.js: Cache management for spreadsheet and sheet references
// - utils.js: Utility functions (ID generation, date formatting, JSON parsing)
// - sheetOperations.js: Sheet creation, configuration, and lookup operations
// - dataCrud.js: CRUD operations for complaint data (getData, addData, updateData, deleteData)
// - solutionManagement.js: Solution-specific operations (add, update, delete, get solutions)

/**
 * Main entry point for the web app
 * @param {Object} e - Event parameter from doGet
 * @returns {HtmlOutput} HTML output for the web app
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ระบบจัดการข้อมูล Complain')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
}