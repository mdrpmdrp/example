/**
 * Main entry point for syncing Notion tasks to BigQuery
 */
function syncNotionTasks() {
    const config = getConfig();
    const notionTaskData = getNotionTaskData();
    const transformedData = transformNotionData(notionTaskData, 'tasks');
    
    mergeDataToBigQuery(
        transformedData,
        taskSchema,
        config.bigQuery.projectId,
        config.bigQuery.datasetId,
        config.bigQuery.taskTableId
    );
}

function syncNotionProjects() {
    const config = getConfig();
    const notionProjectData = getNotionProjectData();
    const transformedData = transformNotionData(notionProjectData, 'projects');
    
    mergeDataToBigQuery(
        transformedData,
        projectSchema,
        config.bigQuery.projectId,
        config.bigQuery.datasetId,
        config.bigQuery.projectTableId
    );
}

/**
 * Inserts new Notion tasks into BigQuery
 * Only run once in a while to avoid duplicates
 */
function insertNewNotionTasks() {
    const config = getConfig();
    const notionTaskData = getNotionTaskData();
    const transformedData = transformNotionData(notionTaskData, 'tasks');
    
    insertDataToBigQuery(
        transformedData,
        config.bigQuery.projectId,
        config.bigQuery.datasetId,
        config.bigQuery.taskTableId
    );
}

/**
 * Inserts new Notion projects into BigQuery
 * Only run once in a while to avoid duplicates
 */
function insertNewNotionProjects() {
    const config = getConfig();
    const notionProjectData = getNotionProjectData();
    const transformedData = transformNotionData(notionProjectData, 'projects');
    
    insertDataToBigQuery(
        transformedData,
        config.bigQuery.projectId,
        config.bigQuery.datasetId,
        config.bigQuery.projectTableId
    );
}