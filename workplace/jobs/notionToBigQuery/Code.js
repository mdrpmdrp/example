function syncNotionTasks() {
    const notionData = getNotionTaskData();
    const transformedData = transformNotionData(notionData);
    const projectId = PropertiesService.getScriptProperties().getProperty('BIGQUERY_PROJECT_ID');
    const datasetId = PropertiesService.getScriptProperties().getProperty('BIGQUERY_DATASET_ID');
    const tableId = PropertiesService.getScriptProperties().getProperty('BIGQUERY_TABLE_ID');

    // merge data into BigQuery
    const mergeQuery = `
    MERGE \`${projectId}.${datasetId}.${tableId}\` T
    USING UNNEST(@notionTasks) AS S
    ON T.id = S.id
    WHEN MATCHED THEN
      UPDATE SET
        created_time = S.created_time,
        last_edited_time = S.last_edited_time,
        url = S.url,
        title = S.title,
        status = S.status,
        priority = S.priority,
        deadline = S.deadline,
        reminder = S.reminder,
        group = S.group,
        responsible = S.responsible,
        assignees = S.assignees,
        approver = S.approver,
        scope = S.scope,
        acceptance_criteria = S.acceptance_criteria,
        background = S.background,
        tags = S.tags,
        routine_work = S.routine_work,
        url_link = S.url_link,
        files = S.files,
        overdue = S.overdue,
        progress = S.progress
    WHEN NOT MATCHED THEN
      INSERT (id, created_time, last_edited_time, url, title, status, priority, deadline, reminder, group, responsible, assignees, approver, scope, acceptance_criteria, background, tags, routine_work, url_link, files, overdue, progress)
      VALUES (S.id, S.created_time, S.last_edited_time, S.url, S.title, S.status, S.priority, S.deadline, S.reminder, S.group, S.responsible, S.assignees, S.approver, S.scope, S.acceptance_criteria, S.background, S.tags, S.routine_work, S.url_link, S.files, S.overdue, S.progress)
    `;
    const queryRequest = {
        query: mergeQuery,
        useLegacySql: false,
        location: 'US',
        parameterMode: 'NAMED',
        queryParameters: [
            {
                name: 'notionTasks',
                parameterType: {
                    type: 'ARRAY',
                    arrayType: {
                        type: 'STRUCT',
                        structTypes: [
                            { name: 'id', type: { type: 'STRING' } },
                            { name: 'created_time', type: { type: 'STRING' } },
                            { name: 'last_edited_time', type: { type: 'STRING' } },
                            { name: 'url', type: { type: 'STRING' } },
                            { name: 'title', type: { type: 'STRING' } },
                            { name: 'status', type: { type: 'STRING' } },
                            { name: 'priority', type: { type: 'STRING' } },
                            { name: 'deadline', type: { type: 'STRING' } },
                            { name: 'reminder', type: { type: 'STRING' } },
                            { name: 'group', type: { type: 'STRING' } },
                            { name: 'responsible', type: { type: 'ARRAY', arrayType: { type: 'STRING' } } },
                            { name: 'assignees', type: { type: 'ARRAY', arrayType: { type: 'STRING' } } },
                            { name: 'approver', type: { type: 'ARRAY', arrayType: { type: 'STRING' } } },
                            { name: 'scope', type: { type: 'STRING' } },
                            { name: 'acceptance_criteria', type: { type: 'STRING' } },
                            { name: 'background', type: { type: 'STRING' } },
                            { name: 'tags', type: { type: 'ARRAY', arrayType: { type: 'STRING' } } },
                            { name: 'routine_work', type: { type: 'ARRAY', arrayType: { type: 'STRING' } } },
                            { name: 'url_link', type: { type: 'STRING' } },
                            {
                                name: 'files', type: {
                                    type: 'ARRAY', arrayType: {
                                        type: 'STRUCT', structTypes: [
                                            { name: 'name', type: { type: 'STRING' } },
                                            { name: 'url', type: { type: 'STRING' } }
                                        ]
                                    }
                                }
                            },
                            { name: 'overdue', type: { type: 'STRING' } },
                            { name: 'progress', type: { type: 'FLOAT' } }
                        ]
                    }
                },
                parameterValue: {
                    arrayValues: transformedData.map(task => {
                        return {
                            structValues: {
                                id: { stringValue: task.id },
                                created_time: { stringValue: task.created_time },
                                last_edited_time: { stringValue: task.last_edited_time },
                                url: { stringValue: task.url },
                                title: { stringValue: task.title },
                                status: { stringValue: task.status },
                                priority: { stringValue: task.priority },
                                deadline: { stringValue: task.deadline || '' },
                                reminder: { stringValue: task.reminder || '' },
                                group: { stringValue: task.group },
                                responsible: { arrayValue: { values: task.responsible.map(name => ({ stringValue: name })) } },
                                assignees: { arrayValue: { values: task.assignees.map(name => ({ stringValue: name })) } },
                                approver: { arrayValue: { values: task.approver.map(name => ({ stringValue: name })) } },
                                scope: { stringValue: task.scope },
                                acceptance_criteria: { stringValue: task.acceptance_criteria },
                                background: { stringValue: task.background },
                                tags: { arrayValue: { values: task.tags.map(name => ({ stringValue: name })) } },
                                routine_work: { arrayValue: { values: task.routine_work.map(name => ({ stringValue: name })) } },
                                url_link: { stringValue: task.url_link },
                                files: {
                                    arrayValue: {
                                        values: task.files.map(file => ({
                                            structValue: {
                                                name: { stringValue: file.name },
                                                url: { stringValue: file.url }
                                            }
                                        }))
                                    }
                                },
                                overdue: { stringValue: task.overdue },
                                progress: { doubleValue: task.progress }
                            }
                        };
                    })
                }
            }
        ]
    };
    const bigquery = BigQuery.Jobs;;
    bigquery.query(queryRequest, projectId);
    // Update last_edited_time
    if (notionData.results.length > 0) {
        const latestEditedTime = notionData.results.reduce((latest, page) => {
            return page.last_edited_time > latest ? page.last_edited_time : latest;
        }, PropertiesService.getScriptProperties().getProperty('last_edited_time') || new Date(1).toISOString());
        PropertiesService.getScriptProperties().setProperty('last_edited_time', latestEditedTime);
    }
}

function getNotionTaskData() {
    const database_id = PropertiesService.getScriptProperties().getProperty('NOTION_TASK_DATABASE_ID');
    let last_edited_time = PropertiesService.getScriptProperties().getProperty('last_edited_time') || null;
    let api_endpoint = 'https://api.notion.com/v1/data_sources/' + database_id + '/query';

    let payload = {
        page_size: 100
    };
    if (!last_edited_time) {
        last_edited_time = new Date(1).toISOString(); // Set to epoch time if not found
    }

    payload.filter = {
        "timestamp": "last_edited_time",
        "last_edited_time": {
            "after": last_edited_time
        }
    };

    let options = {
        'method': 'post',
        'contentType': 'application/json',
        'headers': {
            'Authorization': 'Bearer ' + PropertiesService.getScriptProperties().getProperty('NOTION_API_KEY'),
            'Notion-Version': '2025-09-03'
        },
        'payload': JSON.stringify(payload)
    };
    let response = UrlFetchApp.fetch(api_endpoint, options);
    return JSON.parse(response.getContentText());
}

function transformNotionData(data) {
    return data.results.map(page => {
        const props = page.properties;

        return {
            id: page.id,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            url: page.url,
            title: props["Task name"]?.title?.[0]?.plain_text || "",
            status: props["Status"]?.status?.name || "",
            priority: props["*Priority"]?.select?.name || "",
            deadline: props["*Final Deadline"]?.date?.start || null,
            reminder: props["Reminder"]?.date?.start || null,
            group: props["Group 🤜🤛"]?.select?.name || "",
            responsible: props["*ผู้รับผิดชอบ"]?.people?.map(p => p.name) || [],
            assignees: props["ผู้ปฏิบัติงาน"]?.people?.map(p => p.name) || [],
            approver: props["*อนุมัติ/ตรวจ"]?.people?.map(p => p.name) || [],
            scope: props["*Scope"]?.rich_text?.[0]?.plain_text || "",
            acceptance_criteria: props["*Acceptance Criteria"]?.rich_text?.[0]?.plain_text || "",
            background: props["Background"]?.rich_text?.[0]?.plain_text || "",
            tags: props["Tags"]?.multi_select?.map(t => t.name) || [],
            routine_work: props["Routine Work"]?.multi_select?.map(t => t.name) || [],
            url_link: props["URL"]?.url || "",
            files: props["Files & media"]?.files?.map(f => ({
                name: f.name,
                url: f.file?.url
            })) || [],
            overdue: props["Overdue"]?.formula?.string || "",
            progress: props["Progress"]?.rollup?.number || 0
        };
    });
}
function testBigQueryConnection() {
    const projectId = PropertiesService.getScriptProperties().getProperty('BIGQUERY_PROJECT_ID');
    const queryRequest = {
        query: 'SELECT CURRENT_DATE() AS today',
        useLegacySql: false,
        location: 'Asia-Southeast2'
    };
    const bigquery = BigQuery.Jobs;
    const response = bigquery.query(queryRequest, projectId);
    Logger.log(response);
}