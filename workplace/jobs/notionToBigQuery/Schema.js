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
    { "name": "issue_tracking", "type": "STRING", "mode": "REPEATED" },

    {"name": "timestamp_done", "type": "DATE" },
    {"name": "lt_timestamp", "type": "NUMERIC" },
    {"name": "timestamp_in_progress", "type": "DATE" },
    { "name": "status_2", "type": "STRING" }

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

const salesCrmSchema = [
    // Core identifiers
    { "name": "id", "type": "STRING" },
    { "name": "url", "type": "STRING" },

    // Contact information
    { "name": "contact_name", "type": "STRING" },
    { "name": "name", "type": "STRING" },
    { "name": "phone_number", "type": "STRING" },
    { "name": "email", "type": "STRING" },

    // Company information
    { "name": "registered_company_name", "type": "STRING" },
    { "name": "category", "type": "STRING" },

    // Opportunity & sales data
    { "name": "opportunity", "type": "STRING" },
    { "name": "forecast_income", "type": "FLOAT" },
    { "name": "average_monthly_income", "type": "FLOAT" },
    { "name": "focus", "type": "STRING" },

    // People & relationships
    { "name": "caretaker", "type": "STRING", "mode": "REPEATED" },
    { "name": "interesting", "type": "STRING", "mode": "REPEATED" },

    // Dates
    { "name": "contact_date", "type": "STRING" },
    { "name": "first_contact_date", "type": "DATE" },
    { "name": "last_contact_date", "type": "DATE" },
    { "name": "next_contact_date", "type": "DATE" },

    // Communication channels
    { "name": "contact_channels", "type": "STRING", "mode": "REPEATED" },

    // Details & notes
    { "name": "summary_data", "type": "STRING" },
    { "name": "gg_map", "type": "STRING" },
    { "name": "required_field", "type": "STRING" },

    // Relations
    { "name": "crm_records", "type": "STRING", "mode": "REPEATED" }
]

const salesRecordSchema = [
    // Core identifiers
    { "name": "id", "type": "STRING" },
    { "name": "url", "type": "STRING" },

    // Status & dates
    { "name": "status", "type": "STRING" },
    { "name": "last_edited_time", "type": "TIMESTAMP" },
    { "name": "first_contact_date", "type": "DATE" },
    { "name": "expected_closure_date", "type": "DATE" },
    { "name": "next_contact_date", "type": "DATE" },

    // Contact information
    { "name": "key_contact", "type": "STRING" },
    { "name": "phone_number", "type": "STRING" },
    { "name": "position", "type": "STRING" },

    // Financial data
    { "name": "amount", "type": "FLOAT" },
    { "name": "lt_ticket", "type": "FLOAT" },
    { "name": "lt_14_days_test", "type": "FLOAT" },

    // Service & focus
    { "name": "service", "type": "STRING" },
    { "name": "focus", "type": "STRING" },
    { "name": "delivery_target", "type": "STRING" },

    // People & relations
    { "name": "responsible_persons", "type": "STRING", "mode": "REPEATED" },
    { "name": "sales_crm", "type": "STRING", "mode": "REPEATED" },
    { "name": "tasks", "type": "STRING" },

    // Details & attachments
    { "name": "presentation_details", "type": "STRING" },
    { "name": "files_and_media", "type": "STRING", "mode": "REPEATED" }
]