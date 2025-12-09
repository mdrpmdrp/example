# Complaint Management System - Code Structure

## Overview
The backend code has been refactored into modular files for better organization, maintainability, and reusability.

## File Structure

```
├── appsscript.json          # Google Apps Script configuration
├── code.js                  # Main entry point (doGet function)
├── cache.js                 # Cache management module
├── utils.js                 # Utility functions module
├── sheetOperations.js       # Sheet operations module
├── dataCrud.js              # Data CRUD operations module
├── solutionManagement.js    # Solution management module
└── index.html               # Frontend UI
```

## Module Descriptions

### 1. **code.js** (Main Entry Point)
- Contains the `doGet(e)` function - the main entry point for the web app
- Returns the HTML output for the complaint management system
- Imports and coordinates all other modules

### 2. **cache.js** (Cache Management)
Manages caching for spreadsheet and sheet references to improve performance.

**Functions:**
- `getCachedSheet(sheetName)` - Retrieve cached sheet or null if expired
- `setCachedSheet(sheetName, sheet)` - Update sheet cache
- `getCachedSpreadsheet()` - Get cached spreadsheet reference
- `clearCache()` - Clear all caches

**Constants:**
- `CACHE_DURATION` - 5 minutes (300,000ms)

### 3. **utils.js** (Utility Functions)
Contains helper functions used across modules.

**Functions:**
- `parseSolutionsJson(jsonString)` - Parse JSON with error handling
- `getComplainId()` - Generate sequential complaint ID (C00001, C00002, etc.)
- `getFollowUpId()` - Generate timestamp-based solution ID (F123456)
- `formatDate(date)` - Format date using Utilities.formatDate
- `formatDateFast(date)` - Optimized date formatting for bulk operations
- `testSetup()` - Test function to verify system setup

### 4. **sheetOperations.js** (Sheet Operations)
Handles all sheet-related operations including creation, configuration, and data retrieval.

**Functions:**
- `getOrCreateSheet(sheetName)` - Get or create sheet with proper formatting
- `findRowIndexById(sheet, targetId)` - Find row index by ID
- `getDropdownList()` - Get dropdown list data from "Dropdown list" sheet
- `migrateAddSolutionsColumn()` - Migration function for adding solutions column

**Features:**
- Automatic sheet creation with headers
- Column width configuration
- Header formatting (background, font color, alignment)
- Frozen header row
- Cache integration

### 5. **dataCrud.js** (Data CRUD Operations)
Manages all CRUD operations for complaint data.

**Functions:**
- `getData()` - Retrieve all complaint data
- `addData(formData)` - Add new complaint record
- `updateData(formData)` - Update existing complaint record
- `deleteData(id)` - Delete complaint record

**Features:**
- Batch data reading for performance
- Pre-allocated arrays for better memory management
- Automatic ID generation
- JSON serialization for solutions
- Row formatting (alternating colors, number formatting)

### 6. **solutionManagement.js** (Solution Management)
Handles all operations related to solutions within complaints.

**Functions:**
- `addSolution(complainId, solutionData)` - Add solution to complaint
- `updateSolution(complainId, solutionId, solutionData)` - Update existing solution
- `deleteSolution(complainId, solutionId)` - Delete solution from complaint
- `getSolutions(complainId)` - Get all solutions for a complaint

**Features:**
- Unique solution ID generation
- Timestamp tracking (createAt, updateAt)
- JSON array management for multiple solutions per complaint
- Batch updates to minimize API calls

## Data Flow

```
Frontend (index.html)
    ↓
google.script.run.functionName()
    ↓
code.js (Entry Point)
    ↓
Module Functions (cache.js, utils.js, etc.)
    ↓
Google Sheets (Data Layer)
```

## Performance Optimizations

1. **Caching Layer** - Reduces redundant Spreadsheet API calls
2. **Batch Operations** - Read/write multiple values in single API calls
3. **Pre-allocated Arrays** - Better memory management for large datasets
4. **Helper Functions** - Reusable code reduces duplication
5. **Fast Date Formatting** - Optimized for bulk operations

## Usage in Google Apps Script

When deploying to Google Apps Script:

1. All `.js` files should be uploaded to the same Apps Script project
2. Google Apps Script automatically includes all files in the global scope
3. Functions from any module can call functions from other modules
4. No explicit import/export syntax needed (Apps Script uses global namespace)

## API Functions (Called from Frontend)

### Data Operations
- `getData()` - Get all complaints
- `addData(formData)` - Add new complaint
- `updateData(formData)` - Update complaint
- `deleteData(id)` - Delete complaint

### Solution Operations
- `addSolution(complainId, solutionData)` - Add solution
- `updateSolution(complainId, solutionId, solutionData)` - Update solution
- `deleteSolution(complainId, solutionId)` - Delete solution
- `getSolutions(complainId)` - Get solutions

### Utility Operations
- `getDropdownList()` - Get dropdown options
- `testSetup()` - Test system setup

## Development Notes

- All functions return JSON strings for consistency
- Error handling with try-catch in all public functions
- Console logging for debugging
- Thai language error messages for user feedback
- Commented-out notification code (can be enabled if needed)

## Maintenance

When making changes:
1. Identify the appropriate module for your change
2. Update the specific function in that module
3. Test using `testSetup()` function
4. Deploy using `clasp push` or Apps Script editor
5. Redeploy web app if needed

## Migration

The `migrateAddSolutionsColumn()` function in `sheetOperations.js` handles migration of old data structure to new JSON-based solutions format. Only run once during initial setup if migrating from previous version.
