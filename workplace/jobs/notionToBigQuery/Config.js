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
            projectId: scriptProps.getProperty('BIGQUERY_PROJECT_ID') || 'door-to-anywhere',
            datasetId: scriptProps.getProperty('BIGQUERY_DATASET_ID') || 'test_dataset',
            taskTableId: scriptProps.getProperty('BIGQUERY_TASK_TABLE_ID') || 'notion_test',
            projectTableId: scriptProps.getProperty('BIGQUERY_PROJECT_TABLE_ID')

            // for testing
            // projectId: 'door-to-anywhere',
            // datasetId: 'test_dataset',
            // taskTableId: 'notion_test',
            // projectTableId: 'notion_projects'
        },
        
        // Notion Configuration
        notion: {
            apiKey: scriptProps.getProperty('NOTION_API_KEY'),
            taskDatabaseId: scriptProps.getProperty('NOTION_TASK_DATABASE_ID'),
            projectDatabaseId: scriptProps.getProperty('NOTION_PROJECT_DATABASE_ID'),
            apiVersion: '2025-09-03'
        },
        
        // Sync Configuration
        sync: {
            pageSize: 100,
            lastEditedTime: scriptProps.getProperty('last_edited_time') || new Date(1).toISOString()
        }
    };
}

/**
 * Sets the last edited time after sync
 */
function setLastEditedTime(timestamp) {
    PropertiesService.getScriptProperties().setProperty('last_edited_time', timestamp);
}
