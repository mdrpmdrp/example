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
 * Fetches all Notion users and caches their names
 * @returns {Array} - Array of Notion users
 */
function getNotionListAllUsers() {
    const config = getConfig();
    const apiKey = config.notion.apiKey;
    const apiVersion = config.notion.apiVersion;
    let allUsers = [];
    let next_cursor = undefined;
    do {
        let url = 'https://api.notion.com/v1/users';
        if (next_cursor) {
            url += `?start_cursor=${next_cursor}`;
        }
        const options = {
            method: 'get',
            contentType: 'application/json',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Notion-Version': apiVersion
            },
            muteHttpExceptions: true
        };
        const response = UrlFetchApp.fetch(url, options);
        const result = JSON.parse(response.getContentText());
        allUsers = allUsers.concat(result.results);
        next_cursor = result.next_cursor;
    } while (next_cursor);
    // Cache user names for later use
    let namesCache = {};
    allUsers.forEach(user => {
        if(!user.name) return;
        namesCache[user.id] = user.name || "";
    });
    CacheService.getScriptCache().put('peopleNames', JSON.stringify(namesCache), 21600); // Cache for 6 hours
    return allUsers;
}

/**
 * Fetches Notion user name by user ID
 * @param {string} userId - The Notion user ID
 * @returns {string} - User name
 */
function getNotionPeopleNameById(userId) {
    const config = getConfig();
    const apiKey = config.notion.apiKey;
    const apiVersion = config.notion.apiVersion;
    const options = {
        method: 'get',
        contentType: 'application/json',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': apiVersion
        },
        muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(`https://api.notion.com/v1/users/${userId}`, options);
    if(response.getResponseCode() !== 200){
        return null;
    }
    const result = JSON.parse(response.getContentText());
    return result.name || null;
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
    // lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    return fetchNotionData(databaseId, lastEditedTime);
}

/** * Fetches Sales CRM data from Notion
 * @returns {Array} - Array of Notion Sales CRM pages
 */
function getNotionSalesCrmData() {
    const config = getConfig();
    const databaseId = config.notion.salesCrmDatabaseId;
    let lastEditedTime = config.sync.lastEditedTime.sales_crm || new Date(1).toISOString();
    // lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    return fetchNotionData(databaseId, lastEditedTime);
}

/** * Fetches Sales Record data from Notion
 * @returns {Array} - Array of Notion Sales Record pages
 */
function getNotionSalesRecordData() {
    const config = getConfig();
    const databaseId = config.notion.salesRecordDatabaseId;
    let lastEditedTime = config.sync.lastEditedTime.sales_record || new Date(1).toISOString();
    // lastEditedTime = new Date(1).toISOString(); // for test - remove this line in production
    return fetchNotionData(databaseId, lastEditedTime);
}