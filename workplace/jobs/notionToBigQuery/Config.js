/**
 * Configuration module
 * Manages all configuration and constants
 */


/** 
 * Retrieves configuration settings
 */
function getConfig() {
    const scriptProps = PropertiesService.getScriptProperties();
    
    return {
        // BigQuery Configuration
        bigQuery: {
            projectId: scriptProps.getProperty('BIGQUERY_PROJECT_ID'),
            datasetId: scriptProps.getProperty('BIGQUERY_DATASET_ID'),
            taskTableId: scriptProps.getProperty('BIGQUERY_TASK_TABLE_ID'),
            projectTableId: scriptProps.getProperty('BIGQUERY_PROJECT_TABLE_ID'),
            okrKpiTableId: scriptProps.getProperty('BIGQUERY_OKR_KPI_TABLE_ID'),
            salesCrmTableId: scriptProps.getProperty('BIGQUERY_SALES_CRM_TABLE_ID'),
            salesRecordTableId: scriptProps.getProperty('BIGQUERY_SALES_RECORD_TABLE_ID'),
        },
        
        // Notion Configuration
        notion: {
            apiKey: scriptProps.getProperty('NOTION_API_KEY'),
            apiVersion: '2025-09-03',
            taskDatabaseId: scriptProps.getProperty('NOTION_TASK_DATABASE_ID'),
            projectDatabaseId: scriptProps.getProperty('NOTION_PROJECT_DATABASE_ID'),
            okrKpiDatabaseId: scriptProps.getProperty('NOTION_OKR_KPI_DATABASE_ID'),
            salesCrmDatabaseId: scriptProps.getProperty('NOTION_SALES_CRM_DATABASE_ID'),
            salesRecordDatabaseId: scriptProps.getProperty('NOTION_SALES_RECORD_DATABASE_ID'),
        },
        
        // Sync Configuration
        sync: {
            pageSize: 100,
            lastEditedTime: {
                tasks: scriptProps.getProperty('last_edited_time_' + scriptProps.getProperty('BIGQUERY_TASK_TABLE_ID')) || null,
                projects: scriptProps.getProperty('last_edited_time_' + scriptProps.getProperty('BIGQUERY_PROJECT_TABLE_ID')) || null,
                okrKpis: scriptProps.getProperty('last_edited_time_' + scriptProps.getProperty('BIGQUERY_OKR_KPI_TABLE_ID')) || null,
                salesCrms: scriptProps.getProperty('last_edited_time_' + scriptProps.getProperty('BIGQUERY_SALES_CRM_TABLE_ID')) || null,
                salesRecords: scriptProps.getProperty('last_edited_time_' + scriptProps.getProperty('BIGQUERY_SALES_RECORD_TABLE_ID')) || null,
            }
        }
    };
}

/**
 * Sets the last edited time after sync
 */
function setLastEditedTime(timestamp,tableId) {
    PropertiesService.getScriptProperties().setProperty('last_edited_time_' + tableId, timestamp);
}
