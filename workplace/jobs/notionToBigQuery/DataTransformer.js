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
    if (!richText) return "";
    return richText?.map(rt => rt.plain_text).join(' ') || "";
}

/** 
 * Helper function to extract title text
 */
function getTitleText(title) {
    if (!title) return "";
    return title?.map(t => t.plain_text).join(' ') || "";
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
       task_name: getTitleText(props["Task name"]?.title),
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
        project_name: getTitleText( props["Project name"]?.title),
        project_owner: getPeopleNames(props["Project Owner"]?.people),
        status_field: props["Status"]?.status?.name || "",
        overall_progress: props["Overall Progress"]?.rollup?.number || 0,
        priority: props["Priority"]?.select?.name || "",
        deadline: formatDate(props["Deadline"]?.date?.start),
        tasks: getRelationIds(props["Tasks"]?.relation)
    };
}

function transformOkrKpiData(page){
    const props = page.properties;
    
    return {
        id: page.id,
        url: page.url,
        average_score: props["AVG คะแนน"]?.formula?.number || 0,
        weighted_score_for_graph: props["Weighted คะแนน (ทำกราฟ)"]?.formula?.number || 0,
        status: props["สถานะ"]?.select?.name || "",
        owner: getPeopleNames(props["Owner"]?.people),
        responsible_persons: getPeopleNames(props["Responsible"]?.people),
        last_edited_by: props["Last edited by"]?.last_edited_by?.name || "",
        last_edited_time: formatDate(page.last_edited_time),
        next_update: formatDate(props["Next Update"]?.date?.start),
        weight: props["น้ำหนัก"]?.number || 0,
        calculation_method: props["การคำนวณ"]?.select?.name || "",
        update_frequency: props["Update"]?.multi_select?.map(t => t.name) || [],
        january: props["มกราคม (C-20th) 2026"]?.number || 0,
        february: props["กุมภาพันธ์"]?.number || 0,
        march: props["มีนาคม"]?.number || 0,
        april: props["เมษายน"]?.number || 0,
        may: props["พฤษภาคม"]?.number || 0,
        june: props["มิถุนายน"]?.number || 0,
        july: props["กรกฎาคม"]?.number || 0,
        august: props["สิงหาคม"]?.number || 0,
        september: props["กันยายน"]?.number || 0,
        october: props["ตุลาคม"]?.number || 0,
        november: props["พฤศจิกายน"]?.number || 0,
        december: props["ธันวาคม"]?.number || 0,
        kpi_personal: getRichText(props["KPI - บุคคล"]?.rich_text),
        kpi_team: props["KPI- ทีม"]?.select?.name || "",
        report: props['Report']?.url || "",
        verification:  props["Verification"]?.verification?.state || "",
        note: getRelationIds(props["Note"]?.relation),
        topics: props["Topics"]?.select?.name || "",
        heading: getTitleText(props["หัวข้อ"]?.title)
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
    }else if( type === 'okrKpi'){
        return data.map(transformOkrKpiData);
    }
    
    return [];
}