function getNotionProgectData(){
    let api_endpoint = 'https://api.notion.com/v1/data_sources/{database_id}/query';
    const page_id = '2c4913f3-e748-80ee-9b8c-d5ea86a03439'
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