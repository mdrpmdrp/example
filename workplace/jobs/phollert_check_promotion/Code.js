// Configuration - Update these with your Google Sheet details
const GOODS_SHEET_NAME = 'GOODS';
const PRO_SHEET_NAME = 'PRO';

/**
 * Get data from specified sheet
 * @param {string} sheetName - Name of the sheet ('GOODS' or 'PRO')
 * @returns {Array} Array of objects representing the sheet data
 */
function getSheetData(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length === 0) {
      return [];
    }
    
    // First row contains headers
    const headers = values[0];
    const data = [];
    
    // Convert each row to an object using headers as keys
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      
      data.push(obj);
    }
    
    console.log(`Loaded ${data.length} records from ${sheetName} sheet`);
    return JSON.stringify(data);
    
  } catch (error) {
    console.error(`Error loading data from ${sheetName}:`, error);
    throw new Error(`Failed to load data from ${sheetName}: ${error.message}`);
  }
}

/**
 * Get products data from GOODS sheet
 * @returns {Array} Array of product objects
 */
function getProducts() {
  return getSheetData(GOODS_SHEET_NAME);
}

/**
 * Get promotions data from PRO sheet
 * @returns {Array} Array of promotion objects
 */
function getPromotions() {
  return getSheetData(PRO_SHEET_NAME);
}

/**
 * Get all data (products and promotions)
 * @returns {Object} Object containing both products and promotions
 */
function getAllData() {
  try {
    const products = getProducts();
    const promotions = getPromotions();
    
    return {
      products: products,
      promotions: promotions,
      timestamp: new Date().toISOString(),
      totalProducts: products.length,
      totalPromotions: promotions.length
    };
    
  } catch (error) {
    console.error('Error loading all data:', error);
    throw new Error(`Failed to load data: ${error.message}`);
  }
}

/**
 * Search function that can search across both sheets
 * @param {string} searchTerm - The search term
 * @returns {Object} Object containing search results
 */
function searchData(searchTerm) {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return {
        products: [],
        promotions: [],
        searchTerm: '',
        totalResults: 0
      };
    }
    
    const allData = getAllData();
    const term = searchTerm.toLowerCase().trim();
    
    // Search products
    const productResults = allData.products.filter(product => {
      return Object.values(product).some(value => 
        value && value.toString().toLowerCase().includes(term)
      );
    });
    
    // Search promotions
    const promotionResults = allData.promotions.filter(promotion => {
      return Object.values(promotion).some(value => 
        value && value.toString().toLowerCase().includes(term)
      );
    });
    
    return {
      products: productResults,
      promotions: promotionResults,
      searchTerm: searchTerm,
      totalResults: productResults.length + promotionResults.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error searching data:', error);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Test function to verify sheet access and data structure
 * @returns {Object} Test results
 */
function testSheetAccess() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const goodsSheet = spreadsheet.getSheetByName(GOODS_SHEET_NAME);
    const proSheet = spreadsheet.getSheetByName(PRO_SHEET_NAME);
    
    const result = {
      spreadsheetName: spreadsheet.getName(),
      goodsSheetExists: !!goodsSheet,
      proSheetExists: !!proSheet,
      goodsHeaders: goodsSheet ? goodsSheet.getRange(1, 1, 1, goodsSheet.getLastColumn()).getValues()[0] : null,
      proHeaders: proSheet ? proSheet.getRange(1, 1, 1, proSheet.getLastColumn()).getValues()[0] : null,
      goodsRowCount: goodsSheet ? goodsSheet.getLastRow() - 1 : 0,
      proRowCount: proSheet ? proSheet.getLastRow() - 1 : 0,
      timestamp: new Date().toISOString()
    };
    
    console.log('Test results:', result);
    return result;
    
  } catch (error) {
    console.error('Test failed:', error);
    return {
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Helper function to get sheet headers
 * @param {string} sheetName - Name of the sheet
 * @returns {Array} Array of header names
 */
function getSheetHeaders(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`);
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    return headers;
    
  } catch (error) {
    console.error(`Error getting headers from ${sheetName}:`, error);
    throw new Error(`Failed to get headers: ${error.message}`);
  }
}

/**
 * Serve the HTML file
 * @returns {HtmlOutput} The HTML page
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
}

/**
 * Include HTML files (for modular HTML structure if needed)
 * @param {string} filename - Name of the file to include
 * @returns {string} Content of the file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
