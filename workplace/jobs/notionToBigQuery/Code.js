/**
 * Main entry point for syncing Notion tasks to BigQuery
 */
function syncNotionToBigQuery() {
    syncNotionTasks();
    syncNotionProjects();
    syncNotionOkrKpis();
}

/**
 * Syncs Notion tasks to BigQuery
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

    config.sync.lastEditedTime = new Date().toISOString();
    setLastEditedTime(config.sync.lastEditedTime, config.bigQuery.taskTableId);
}

/**
 * Syncs Notion projects to BigQuery
 */
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

    config.sync.lastEditedTime = new Date().toISOString();
    setLastEditedTime(config.sync.lastEditedTime, config.bigQuery.projectTableId);
}

/**
 * Syncs Notion OKR KPIs to BigQuery
 */
function syncNotionOkrKpis() {
    const config = getConfig();
    const notionOkrKpiData = getNotionOkrKpiData();
    const transformedData = transformNotionData(notionOkrKpiData, 'okrKpi');
    mergeDataToBigQuery(
        transformedData,
        okrKpiSchema,
        config.bigQuery.projectId,
        config.bigQuery.datasetId,
        config.bigQuery.okrKpiTableId
    );
    config.sync.lastEditedTime = new Date().toISOString();
    setLastEditedTime(config.sync.lastEditedTime, config.bigQuery.okrKpiTableId);
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