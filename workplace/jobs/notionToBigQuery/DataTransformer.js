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
    let namesCache = CacheService.getScriptCache().get('peopleNames');
    if (!namesCache) {
        namesCache = getNotionListAllUsers();
    } else {
        namesCache = JSON.parse(namesCache);
    }
    return people?.map(p => {
        if(!namesCache[p.id]){
            try{
                let name =  getNotionPeopleNameById(p.id);
                if(name){
                    namesCache[p.id] = name;
                    CacheService.getScriptCache().put('peopleNames', JSON.stringify(namesCache), 21600); // Update cache for 6 hours
                    return name;
                } else {
                    return null;
                }
            } catch (e) {
                return null;
            }
        };
        return namesCache[p.id];
    }).filter(name => name) || [];
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

function transformSalesCrmData(page){
    const props = page.properties;
    
    return {
        id: page.id,
        url: page.url,
        contact_name: getRichText(props["ชื่อผู้ติดต่อ*"]?.rich_text),
        name: getTitleText(props["Name"]?.title),
        phone_number: getRichText(props["เบอร์*"]?.rich_text),
        email: props["อีเมล*"]?.email || "",
        registered_company_name: getRichText(props["ชื่อบริษัทจดทะเบียน*"]?.rich_text),
        category: props["Category"]?.select?.name || "",
        opportunity: props["โอกาส*"]?.select?.name || "",
        forecast_income: props["Forecast Income"]?.number || 0,
        average_monthly_income: props["รายได้เฉลี่ยต่อเดือน*"]?.number || 0,
        focus: props["Focus*"]?.select?.name || "",
        caretaker: getPeopleNames(props["เจ้าหน้าที่ดูแล"]?.people),
        interesting: props["สนใจ"]?.multi_select?.map(t => t.name) || [],
        contact_date: props["วันติดต่อ"]?.formula?.string || "",
        first_contact_date: formatDate(props["วันแรกที่เจอ"]?.created_time),
        last_contact_date: formatDate(props["ติดต่อล่าสุด"]?.date?.start),
        next_contact_date: formatDate(props["ติดต่อครั้งถัดไป"]?.date?.start),
        contact_channels: props["ช่องทางการสื่อสาร*"]?.multi_select?.map(t => t.name) || [],
        summary_data: getRichText(props["สรุปข้อมูล"]?.rich_text),
        gg_map: props["GG Map"]?.url || "",
        required_field: props["Required field"]?.formula?.string || "",
        crm_records: getRelationIds(props["CRM Records"]?.relation)
    };

}

// {
//         "เป้าหมายการส่ง": {
//           "id": "%3FhDf",
//           "type": "select",
//           "select": null
//         },
//         "Status": {
//           "id": "JQ%3B%3B",
//           "type": "status",
//           "status": {
//             "id": "uapG",
//             "name": "8. Close lose",
//             "color": "orange"
//           }
//         },
//         "Last edited time": {
//           "id": "Lgs%40",
//           "type": "last_edited_time",
//           "last_edited_time": "2025-11-04T04:23:00.000Z"
//         },
//         "ยอด": {
//           "id": "QFU%5E",
//           "type": "number",
//           "number": 480
//         },
//         "บริการ": {
//           "id": "RrGh",
//           "type": "select",
//           "select": null
//         },
//         "ครั้งแรกที่เจอ": {
//           "id": "X%40%7B%7C",
//           "type": "created_time",
//           "created_time": "2025-02-05T05:02:00.000Z"
//         },
//         "เบอร์โทร": {
//           "id": "XQxc",
//           "type": "rich_text",
//           "rich_text": []
//         },
//         "LT Ticket": {
//           "id": "Xyui",
//           "type": "formula",
//           "formula": {
//             "type": "number",
//             "number": 332
//           }
//         },
//         "URL": {
//           "id": "YOuj",
//           "type": "url",
//           "url": null
//         },
//         "Key contact": {
//           "id": "%5CCSJ",
//           "type": "rich_text",
//           "rich_text": [
//             {
//               "type": "text",
//               "text": {
//                 "content": "คุณมิ้ง",
//                 "link": null
//               },
//               "annotations": {
//                 "bold": false,
//                 "italic": false,
//                 "strikethrough": false,
//                 "underline": false,
//                 "code": false,
//                 "color": "default"
//               },
//               "plain_text": "คุณมิ้ง",
//               "href": null
//             }
//           ]
//         },
//         "วันที่คาดว่าจะปิดงาน": {
//           "id": "%5DIdN",
//           "type": "formula",
//           "formula": {
//             "type": "date",
//             "date": {
//               "start": "2025-02-26T05:02:00.000+00:00",
//               "end": null,
//               "time_zone": null
//             }
//           }
//         },
//         "ตำแหน่ง": {
//           "id": "l%5CNp",
//           "type": "rich_text",
//           "rich_text": []
//         },
//         "👟 Sales CRM": {
//           "id": "lxID",
//           "type": "relation",
//           "relation": [
//             {
//               "id": "2cd08e1e-487c-487b-ac6a-2437beeb897a"
//             }
//           ],
//           "has_more": false
//         },
//         "LT 14 days (test)": {
//           "id": "mGLS",
//           "type": "number",
//           "number": null
//         },
//         "Files & media": {
//           "id": "mckw",
//           "type": "files",
//           "files": []
//         },
//         "ติดต่อครั้งต่อไป": {
//           "id": "rLt%40",
//           "type": "date",
//           "date": {
//             "start": "2025-02-05",
//             "end": null,
//             "time_zone": null
//           }
//         },
//         "ผู้รับผิดชอบ": {
//           "id": "taCo",
//           "type": "people",
//           "people": []
//         },
//         "รายละเอียดที่นำเสนอ": {
//           "id": "vuRo",
//           "type": "rich_text",
//           "rich_text": [
//             {
//               "type": "text",
//               "text": {
//                 "content": "ราคาเข้ารับสินค้า + ส่ง IEL ",
//                 "link": null
//               },
//               "annotations": {
//                 "bold": false,
//                 "italic": false,
//                 "strikethrough": false,
//                 "underline": false,
//                 "code": false,
//                 "color": "default"
//               },
//               "plain_text": "ราคาเข้ารับสินค้า + ส่ง IEL ",
//               "href": null
//             }
//           ]
//         },
//         "Focus": {
//           "id": "zr%3DC",
//           "type": "select",
//           "select": null
//         },
//         "Tasks": {
//           "id": "title",
//           "type": "title",
//           "title": [
//             {
//               "type": "text",
//               "text": {
//                 "content": "เสนอราคาให้ลูกค้า",
//                 "link": null
//               },
//               "annotations": {
//                 "bold": false,
//                 "italic": false,
//                 "strikethrough": false,
//                 "underline": false,
//                 "code": false,
//                 "color": "default"
//               },
//               "plain_text": "เสนอราคาให้ลูกค้า",
//               "href": null
//             }
//           ]
//         }
//       }
function transformSalesRecordData(page){
    const props = page.properties;
    return {
        id: page.id,
        url: page.url,
        status: props["Status"]?.status?.name || "",
        last_edited_time: formatDate(props["Last edited time"]?.last_edited_time),
        first_contact_date: formatDate(props["ครั้งแรกที่เจอ"]?.created_time),
        expected_closure_date: formatDate(props["วันที่คาดว่าจะปิดงาน"]?.formula?.date?.start),
        next_contact_date: formatDate(props["ติดต่อครั้งต่อไป"]?.date?.start),
        key_contact: getRichText(props["Key contact"]?.rich_text),
        phone_number: getRichText(props["เบอร์โทร"]?.rich_text),
        position: getRichText(props["ตำแหน่ง"]?.rich_text),
        amount: props["ยอด"]?.number || null,
        lt_ticket: props["LT Ticket"]?.formula?.number || null,
        lt_14_days_test: props["LT 14 days (test)"]?.number || null,
        service: props["บริการ"]?.select?.name || "",
        focus: props["Focus"]?.select?.name || "",
        delevery_target: props["เป้าหมายการส่ง"]?.select?.name || "",
        responsible_persons: getPeopleNames(props["ผู้รับผิดชอบ"]?.people),
        sales_crm: getRelationIds(props["👟 Sales CRM"]?.relation),
        tasks: getTitleText(props["Tasks"]?.title),
        presentation_details: getRichText(props["รายละเอียดที่นำเสนอ"]?.rich_text),
        files_and_media: getFilesInfo(props["Files & media"]?.files)
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
    }else if( type === 'salesCrm'){
        return data.map(transformSalesCrmData);
    }else if (type === 'salesRecord'){
        return data.map(transformSalesRecordData);
    }
    
    return [];
}