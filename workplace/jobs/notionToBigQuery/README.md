# Notion to BigQuery Sync - Refactored

This project syncs data from Notion databases to Google BigQuery tables using Google Apps Script.

## Project Structure

```
notionToBigQuery/
├── Code.js              # Main entry points (sync functions)
├── Config.js            # Configuration and settings management
├── Schema.js            # BigQuery schema definitions
├── NotionService.js     # Notion API integration
├── DataTransformer.js   # Data transformation logic
├── BigQueryHelper.js    # BigQuery utility functions
├── BigQueryService.js   # BigQuery API integration
├── appsscript.json      # Apps Script project manifest
└── .clasp.json          # Clasp configuration
```

## Module Descriptions

### Code.js
Main entry point containing the public functions that can be triggered:
- `syncNotionTasks()` - Syncs Notion tasks to BigQuery using MERGE
- `insertNewNotionTasks()` - Inserts new Notion tasks (use sparingly)
- `insertNewNotionProjects()` - Inserts new Notion projects (use sparingly)

### Config.js
Manages all configuration and script properties:
- `getConfig()` - Returns configuration object with BigQuery and Notion settings
- `setLastEditedTime()` - Updates the last sync timestamp

### Schema.js
Defines BigQuery table schemas:
- `taskSchema` - Schema for tasks table
- `projectSchema` - Schema for projects table

### NotionService.js
Handles Notion API interactions:
- `fetchNotionData()` - Generic function to fetch data from Notion with pagination
- `getNotionTaskData()` - Fetches task data from Notion
- `getNotionProjectData()` - Fetches project data from Notion

### DataTransformer.js
Transforms Notion data to BigQuery format:
- `transformNotionData()` - Main transformation function
- `transformTaskData()` - Transforms individual task records
- `transformProjectData()` - Transforms individual project records

### BigQueryHelper.js
Utility functions for BigQuery operations:
- `convertSchemaToStructTypes()` - Converts schema to BigQuery parameter types
- `buildMergeQuery()` - Generates SQL MERGE query
- `convertToParameterValue()` - Converts data to BigQuery parameter format
- `buildQueryParameters()` - Builds complete query parameters

### BigQueryService.js
Handles BigQuery API interactions:
- `mergeDataToBigQuery()` - Merges data using MERGE query (recommended)
- `insertDataToBigQuery()` - Inserts data directly (use sparingly)

## Configuration

Set the following script properties in your Google Apps Script project:

### BigQuery Properties
- `BIGQUERY_PROJECT_ID` - Your BigQuery project ID
- `BIGQUERY_DATASET_ID` - Your BigQuery dataset ID
- `BIGQUERY_TASK_TABLE_ID` - Table ID for tasks
- `BIGQUERY_PROJECT_TABLE_ID` - Table ID for projects

### Notion Properties
- `NOTION_API_KEY` - Your Notion integration API key
- `NOTION_TASK_DATABASE_ID` - Notion database ID for tasks
- `NOTION_PROJECT_DATABASE_ID` - Notion database ID for projects

### Sync Properties
- `last_edited_time` - Timestamp of last sync (managed automatically)

## Usage

### Manual Execution
1. Open the Apps Script editor
2. Select the function you want to run from the dropdown
3. Click the Run button

### Scheduled Execution
1. Click the clock icon in Apps Script editor
2. Add a new trigger
3. Choose the function to run (e.g., `syncNotionTasks`)
4. Set your desired schedule

## Key Features

- **Modular Design**: Separated concerns into distinct modules
- **MERGE Support**: Uses BigQuery MERGE for efficient updates
- **Error Handling**: Comprehensive error logging
- **Pagination**: Handles large datasets from Notion
- **Type Safety**: Proper BigQuery type handling for arrays and scalars
- **SQL Reserved Words**: Automatically escapes reserved keywords (status, group)

## Development

### Testing
For testing purposes, the sync functions currently fetch all data (from epoch). In production:
1. Remove the line: `lastEditedTime = new Date(1).toISOString();`
2. This will enable incremental syncing based on `last_edited_time`

### Deployment
Use [clasp](https://github.com/google/clasp) for deployment:
```bash
clasp push    # Push changes to Apps Script
clasp deploy  # Create a new deployment
```

## Notes

- The `group` and `status` fields are SQL reserved keywords and are automatically escaped with backticks
- Array fields in BigQuery cannot contain null values - nulls are automatically filtered
- For repeated/array fields, the schema uses `mode: "REPEATED"`
