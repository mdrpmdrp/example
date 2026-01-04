/**
 * Notion Service module
 * Handles all interactions with Notion API
 */

/**
 * Fetches data from a Notion database with pagination
 * @param {string} databaseId - The Notion database ID
 * @param {string} lastEditedTime - Filter for entries edited after this time
 * @returns {Array} - Array of Notion pages
 */
function fetchNotionData(databaseId, lastEditedTime) {
    const config = getConfig();
    const apiKey = config.notion.apiKey;
    const apiVersion = config.notion.apiVersion;
    
    let allResults = [];
    let next_cursor = undefined;
    
    do {
        const payload = {
            filter: {
                timestamp: "last_edited_time",
                last_edited_time: {
                    after: lastEditedTime
                }
            }
        };
        
        if (next_cursor) {
            payload.start_cursor = next_cursor;
        }
        
        const options = {
            method: 'post',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': apiVersion
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };
        
        const response = UrlFetchApp.fetch(
            `https://api.notion.com/v1/data_sources/${databaseId}/query`,
            options
        );
        const result = JSON.parse(response.getContentText());
        
        allResults = allResults.concat(result.results);
        next_cursor = result.next_cursor;
    } while (next_cursor);
    
    return allResults;
}

/**
 * Fetches task data from Notion
 * @returns {Array} - Array of Notion task pages
 */
function getNotionTaskData() {
    const config = getConfig();
    const databaseId = config.notion.taskDatabaseId;
    let lastEditedTime = config.sync.lastEditedTime.tasks || new Date(1).toISOString();
    // lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    
    return fetchNotionData(databaseId, lastEditedTime);
}

/**
 * Fetches project data from Notion
 * @returns {Array} - Array of Notion project pages
 */
function getNotionProjectData() {
    const config = getConfig();
    const databaseId = config.notion.projectDatabaseId;
    let lastEditedTime = config.sync.lastEditedTime.projects || new Date(1).toISOString();
    // lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    
    return fetchNotionData(databaseId, lastEditedTime);
}

/**
 * Fetches OKR KPI data from Notion
 * @returns {Array} - Array of Notion OKR KPI pages
 */
function getNotionOkrKpiData() {
    const config = getConfig();
    const databaseId = config.notion.okrKpiDatabaseId;
    let lastEditedTime = config.sync.lastEditedTime.okr_kpis || new Date(1).toISOString();
    lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    return fetchNotionData(databaseId, lastEditedTime);
}
