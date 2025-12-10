/**
 * BigQuery Helper module
 * Utility functions for BigQuery operations
 */

/**
 * Converts schema to BigQuery parameter type format
 * @param {Array} schema - Schema definition array
 * @returns {Array} - BigQuery struct types
 */
function convertSchemaToStructTypes(schema) {
    return schema.map(field => ({
        name: field.name,
        type: field.mode === 'REPEATED' 
            ? { type: 'ARRAY', arrayType: { type: field.type } }
            : { type: field.type }
    }));
}

/**
 * Builds merge query for BigQuery
 * @param {string} projectId - BigQuery project ID
 * @param {string} datasetId - BigQuery dataset ID
 * @param {string} tableId - BigQuery table ID
 * @param {Array} schema - Schema definition array
 * @returns {string} - SQL merge query
 */
function buildMergeQuery(projectId, datasetId, tableId, schema) {
    const updateFields = schema
        .map(field => {
            const fieldName = (field.name === 'status' || field.name === 'group') 
                ? `\`${field.name}\`` 
                : field.name;
            return `${fieldName} = S.${fieldName}`;
        })
        .join(',\n        ');
    
    const insertFields = schema
        .map(field => (field.name === 'status' || field.name === 'group') ? `\`${field.name}\`` : field.name)
        .join(', ');
    
    const insertValues = schema
        .map(field => {
            const fieldName = (field.name === 'status' || field.name === 'group') 
                ? `\`${field.name}\`` 
                : field.name;
            return `S.${fieldName}`;
        })
        .join(', ');
    
    return `
    MERGE \`${projectId}.${datasetId}.${tableId}\` T
    USING UNNEST(@notionData) AS S
    ON T.id = S.id
    WHEN MATCHED THEN
      UPDATE SET
        ${updateFields}
    WHEN NOT MATCHED THEN
      INSERT (${insertFields})
      VALUES (${insertValues});
    `;
}

/**
 * Converts data to BigQuery parameter value format
 * @param {Array} transformedData - Transformed data array
 * @param {Array} schema - Schema definition array
 * @returns {Array} - BigQuery parameter values
 */
function convertToParameterValue(transformedData, schema) {
    return transformedData.map(item => ({
        structValues: schema.reduce((acc, field) => {
            let value = item[field.name];
            
            if (field.mode === 'REPEATED') {
                acc[field.name] = {
                    arrayValues: (value || []).map(v => ({ value: v }))
                };
            } else {
                acc[field.name] = { 
                    value: value !== undefined ? value : null 
                };
            }
            
            return acc;
        }, {})
    }));
}

/**
 * Builds query parameters for BigQuery
 * @param {Array} transformedData - Transformed data array
 * @param {Array} schema - Schema definition array
 * @param {string} paramName - Parameter name (default: 'notionData')
 * @returns {Array} - BigQuery query parameters
 */
function buildQueryParameters(transformedData, schema, paramName = 'notionData') {
    const structTypes = convertSchemaToStructTypes(schema);
    const parameterValue = convertToParameterValue(transformedData, schema);
    
    return [{
        name: paramName,
        parameterType: {
            type: 'ARRAY',
            arrayType: {
                type: 'STRUCT',
                structTypes: structTypes
            }
        },
        parameterValue: {
            arrayValues: parameterValue
        }
    }];
}
