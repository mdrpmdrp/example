/**
 * Data Transformer module
 * Transforms Notion data to BigQuery format
 */

/**
 * Transforms Notion task data to BigQuery format
 */
function transformTaskData(page) {
    const props = page.properties;
    
    return {
        id: page.id,
        created_time: page.created_time,
        last_edited_time: page.last_edited_time,
        url: page.url,
        task_name: props["Task name"]?.title?.[0]?.plain_text || "",
        status: props["Status"]?.status?.name || "",
        priority: props["*Priority"]?.select?.name || "",
        final_deadline: props["*Final Deadline"]?.date?.start || null,
        reminder: props["Reminder"]?.date?.start || null,
        group: props["Group 🤜🤛"]?.select?.name || "",
        responsible_persons: props["*ผู้รับผิดชอบ"]?.people?.map(p => p.name) || [],
        assignees: props["ผู้ปฏิบัติงาน"]?.people?.map(p => p.name) || [],
        approvers: props["*อนุมัติ/ตรวจ"]?.people?.map(p => p.name) || [],
        scope: props["*Scope"]?.rich_text?.[0]?.plain_text || "",
        acceptance_criteria: props["*Acceptance Criteria"]?.rich_text?.[0]?.plain_text || "",
        background: props["Background"]?.rich_text?.[0]?.plain_text || "",
        tags: props["Tags"]?.multi_select?.map(t => t.name) || [],
        routine_work: props["Routine Work"]?.multi_select?.map(t => t.name) || [],
        url_field: props["URL"]?.url || "",
        files_and_media: props["Files & media"]?.files?.map(f => f.name + '|' + f.file?.url) || [],
        overdue: props["Overdue"]?.formula?.string || "",
        progress: props["Progress"]?.rollup?.number || 0,
        sub_tasks: props["Sub-tasks"]?.relation?.map(r => r.id) || [],
        parent_tasks: props["Parent-task"]?.relation?.map(r => r.id) || [],
        required_field: props["Required Field"]?.formula?.string || "",
        issue_tracking: props["Issue Tracking"]?.relation?.map(r => r.id) || [],
        project: props["Project"]?.relation?.map(r => r.id) || []
    };
}

/**
 * Transforms Notion project data to BigQuery format
 */
function transformProjectData(page) {
    const props = page.properties;
    
    return {
        id: page.id,
        involved_persons: props["Involved Persons"]?.people?.map(p => p.name) || [],
        note: props["Note"]?.relation?.map(r => r.id) || [],
        expense: props["Expense"]?.rollup?.number || 0,
        status: props["Status (ทำกราฟ)"]?.formula?.string || "",
        comment: props["Comment"]?.rich_text?.[0]?.plain_text || "",
        url: props["URL"]?.url || "",
        files_and_media: props["Files & media"]?.files?.map(f => f.name + '|' + f.file?.url) || [],
        budget: props["Budget"]?.number || 0,
        project_name: props["Project name"]?.title?.[0]?.plain_text || "",
        project_owner: props["Project Owner"]?.people?.map(p => p.name) || [],
        status_field: props["Status"]?.status?.name || "",
        overall_progress: props["Overall Progress"]?.rollup?.number || 0,
        priority: props["Priority"]?.select?.name || "",
        deadline: props["Deadline"]?.date?.start || null,
        tasks: props["Tasks"]?.relation?.map(r => r.id) || []
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
