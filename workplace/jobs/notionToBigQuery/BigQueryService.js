/**
 * BigQuery Service module
 * Handles all interactions with BigQuery API
 */

/**
 * Merges data into BigQuery using MERGE query
 * @param {Array} transformedData - Transformed data array
 * @param {Array} schema - Schema definition array
 * @param {string} projectId - BigQuery project ID
 * @param {string} datasetId - BigQuery dataset ID
 * @param {string} tableId - BigQuery table ID
 * @returns {Object} - Query result
 */
function mergeDataToBigQuery(transformedData, schema, projectId, datasetId, tableId) {
    if (transformedData.length === 0) {
        Logger.log('No data to merge.');
        return null;
    }
    
    const mergeQuery = buildMergeQuery(projectId, datasetId, tableId, schema);
    const queryParams = buildQueryParameters(transformedData, schema, 'notionData');
    
    const request = {
        query: mergeQuery,
        useLegacySql: false,
        queryParameters: queryParams
    };
    
    try {
        const queryResults = BigQuery.Jobs.query(request, projectId);
        
        if (queryResults.jobComplete === false) {
            Logger.log('Merge job failed to complete.');
            return null;
        }
        
        Logger.log('Merge completed. Job ID: ' + queryResults.jobReference.jobId + 
                  ', Rows affected: ' + queryResults.numDmlAffectedRows + 
                  ', DML Stats: ' + JSON.stringify(queryResults.dmlStats));
        
        return queryResults;
    } catch (err) {
        Logger.log('Failed to merge data: ' + err.message);
        throw err;
    }
}

/**
 * Inserts data into BigQuery
 * @param {Array} transformedData - Transformed data array
 * @param {string} projectId - BigQuery project ID
 * @param {string} datasetId - BigQuery dataset ID
 * @param {string} tableId - BigQuery table ID
 * @returns {Object} - Insert result
 */
function insertDataToBigQuery(transformedData, projectId, datasetId, tableId) {
    if (transformedData.length === 0) {
        Logger.log('No data to insert.');
        return null;
    }
    
    const rows = transformedData.map(item => ({ json: item }));
    const insertRequest = { rows: rows };
    
    try {
        const insertResult = BigQuery.Tabledata.insertAll(insertRequest, projectId, datasetId, tableId);
        Logger.log('Insert completed: ' + JSON.stringify(insertResult, null, 2));
        return insertResult;
    } catch (err) {
        Logger.log('Failed to insert data: ' + err.message);
        throw err;
    }
}
