const taskSchema = [
    // Core identifiers
    { "name": "id", "type": "STRING" },
    { "name": "url", "type": "STRING" },

    // Timestamps
    { "name": "created_time", "type": "TIMESTAMP" },
    { "name": "last_edited_time", "type": "TIMESTAMP" },

    // Task basic info
    { "name": "task_name", "type": "STRING" },
    { "name": "status", "type": "STRING" },
    { "name": "priority", "type": "STRING" },
    { "name": "group", "type": "STRING" },
    { "name": "project", "type": "STRING", "mode": "REPEATED" },

    // Dates
    { "name": "final_deadline", "type": "DATE" },
    { "name": "reminder", "type": "DATE" },

    // People
    { "name": "responsible_persons", "type": "STRING", "mode": "REPEATED" },
    { "name": "assignees", "type": "STRING", "mode": "REPEATED" },
    { "name": "approvers", "type": "STRING", "mode": "REPEATED" },

    // Task details
    { "name": "scope", "type": "STRING" },
    { "name": "acceptance_criteria", "type": "STRING" },
    { "name": "background", "type": "STRING" },

    // Categorization
    { "name": "tags", "type": "STRING", "mode": "REPEATED" },
    { "name": "routine_work", "type": "STRING", "mode": "REPEATED" },

    // Attachments & links
    { "name": "url_field", "type": "STRING" },
    { "name": "files_and_media", "type": "STRING", "mode": "REPEATED" },

    // Status & metrics
    { "name": "overdue", "type": "STRING" },
    { "name": "progress", "type": "FLOAT" },
    { "name": "required_field", "type": "STRING" },

    // Relations
    { "name": "sub_tasks", "type": "STRING", "mode": "REPEATED" },
    { "name": "parent_tasks", "type": "STRING", "mode": "REPEATED" },
    { "name": "issue_tracking", "type": "STRING", "mode": "REPEATED" }
];

const projectSchema = [
    // Core identifiers
    { "name": "id", "type": "STRING" },

    // Project basic info
    { "name": "project_name", "type": "STRING" },
    { "name": "url", "type": "STRING" },

    // Status & metrics
    { "name": "status_field", "type": "STRING" },
    { "name": "priority", "type": "STRING" },
    { "name": "overall_progress", "type": "FLOAT" },

    // Dates
    { "name": "deadline", "type": "DATE" },

    // People
    { "name": "project_owner", "type": "STRING", "mode": "REPEATED" },
    { "name": "involved_persons", "type": "STRING", "mode": "REPEATED" },

    // Financials
    { "name": "budget", "type": "FLOAT" },
    { "name": "expense", "type": "FLOAT" },

    // Details
    { "name": "comment", "type": "STRING" },

    // Attachments & links
    { "name": "files_and_media", "type": "STRING", "mode": "REPEATED" },

    // Relations
    { "name": "tasks", "type": "STRING", "mode": "REPEATED" },
    { "name": "note", "type": "STRING", "mode": "REPEATED" },

    { "name": "status", "type": "STRING" }
]




const okrKpiSchema = [
    // Core identifiers
    { "name": "id", "type": "STRING" },
    { "name": "url", "type": "STRING" },

    // Key metrics
    { "name": "average_score", "type": "FLOAT" },
    { "name": "weighted_score_for_graph", "type": "FLOAT" },
    { "name": "status", "type": "STRING" },

    // Ownership & responsibility
    { "name": "owner", "type": "STRING" },
    { "name": "responsible_persons", "type": "STRING", "mode": "REPEATED" },
    { "name": "last_edited_by", "type": "STRING" },

    // Timestamps
    { "name": "last_edited_time", "type": "TIMESTAMP" },
    { "name": "next_update", "type": "DATE" },

    // Configuration
    { "name": "weight", "type": "FLOAT" },
    { "name": "calculation_method", "type": "STRING"},
    { "name": "update_frequency", "type": "STRING", "mode": "REPEATED" },

    // Monthly data
    { "name": "january", "type": "FLOAT" },
    { "name": "february", "type": "FLOAT" },
    { "name": "march", "type": "FLOAT" },
    { "name": "april", "type": "FLOAT" },
    { "name": "may", "type": "FLOAT" },
    { "name": "june", "type": "FLOAT" },
    { "name": "july", "type": "FLOAT" },
    { "name": "august", "type": "FLOAT" },
    { "name": "september", "type": "FLOAT" },
    { "name": "october", "type": "FLOAT" },
    { "name": "november", "type": "FLOAT" },
    { "name": "december", "type": "FLOAT" },

    // Relationships
    { "name": "kpi_personal", "type": "STRING"},
    { "name": "kpi_team", "type": "STRING" },

    // Details & notes
    { "name": "report", "type": "STRING" },
    { "name": "verification", "type": "STRING" },
    { "name": "note", "type": "STRING", "mode": "REPEATED" },
    { "name": "topics", "type": "STRING" },
    { "name": "heading", "type": "STRING"}
]
