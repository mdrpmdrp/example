/**
 * Data Transformer module
 * Transforms Notion data to BigQuery format
 */

/**
 * Helper function to format date strings
 */
function formatDate(dateString) {
    if (!dateString) return null;
    return dateString.includes('T') ? dateString.split('T')[0] : dateString;
}

/**
 * Helper function to extract plain text from rich_text
 */
function getRichText(richText) {
    return richText?.[0]?.plain_text || "";
}

/**
 * Helper function to extract relation IDs
 */
function getRelationIds(relation) {
    return relation?.map(r => r.id) || [];
}

/**
 * Helper function to extract people names
 */
function getPeopleNames(people) {
    return people?.map(p => p.name || "").filter(name => name) || [];
}

/**
 * Helper function to extract files information
 */
function getFilesInfo(files) {
    return files?.map(f => f.name + '|' + f.file?.url) || [];
}

/**
 * Transforms Notion task data to BigQuery format
 */
function transformTaskData(page) {
    const props = page.properties;
    
    return {
        id: page.id,
        created_time: formatDate(page.created_time),
        last_edited_time: formatDate(page.last_edited_time),
        url: page.url,
        task_name: props["Task name"]?.title?.[0]?.plain_text || "",
        status: props["Status"]?.status?.name || "",
        priority: props["*Priority"]?.select?.name || "",
        final_deadline: formatDate(props["*Final Deadline"]?.date?.start),
        initial_deadline: formatDate(props["Initial Deadline"]?.date?.start),
        reminder: formatDate(props["Reminder"]?.date?.start),
        group: props["Group 🤜🤛"]?.select?.name || "",
        responsible_persons: getPeopleNames(props["*ผู้รับผิดชอบ"]?.people),
        assignees: getPeopleNames(props["ผู้ปฏิบัติงาน"]?.people),
        approvers: getPeopleNames(props["*อนุมัติ/ตรวจ"]?.people),
        scope: getRichText(props["*Scope"]?.rich_text),
        acceptance_criteria: getRichText(props["*Acceptance Criteria"]?.rich_text),
        background: getRichText(props["Background"]?.rich_text),
        tags: props["Tags"]?.multi_select?.map(t => t.name) || [],
        routine_work: props["Routine Work"]?.multi_select?.map(t => t.name) || [],
        url_field: props["URL"]?.url || "",
        files_and_media: getFilesInfo(props["Files & media"]?.files),
        overdue: props["Overdue"]?.formula?.string || "",
        progress: props["Progress"]?.rollup?.number || 0,
        sub_tasks: getRelationIds(props["Sub-tasks"]?.relation),
        parent_tasks: getRelationIds(props["Parent-task"]?.relation),
        required_field: props["Required Field"]?.formula?.string || "",
        issue_tracking: getRelationIds(props["Issue Tracking"]?.relation),
        project: getRelationIds(props["Project"]?.relation)
    };
}

/**
 * Transforms Notion project data to BigQuery format
 */
function transformProjectData(page) {
    const props = page.properties;
    
    return {
        id: page.id,
        involved_persons: getPeopleNames(props["Involved Persons"]?.people),
        note: getRelationIds(props["Note"]?.relation),
        expense: props["Expense"]?.rollup?.number || 0,
        status: props["Status (ทำกราฟ)"]?.formula?.string || "",
        comment: getRichText(props["Comment"]?.rich_text),
        url: props["URL"]?.url || "",
        files_and_media: getFilesInfo(props["Files & media"]?.files),
        budget: props["Budget"]?.number || 0,
        project_name: props["Project name"]?.title?.[0]?.plain_text || "",
        project_owner: getPeopleNames(props["Project Owner"]?.people),
        status_field: props["Status"]?.status?.name || "",
        overall_progress: props["Overall Progress"]?.rollup?.number || 0,
        priority: props["Priority"]?.select?.name || "",
        deadline: formatDate(props["Deadline"]?.date?.start),
        tasks: getRelationIds(props["Tasks"]?.relation)
    };
}

/**
 * Transforms Notion data based on type
 */
function transformNotionData(data, type) {
    if (type === 'tasks') {
        return data.map(transformTaskData);
    } else if (type === 'projects') {
        return data.map(transformProjectData);
    }
    
    return [];
}