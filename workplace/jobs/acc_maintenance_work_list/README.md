# ACC Maintenance Work List Dashboard

A Google Apps Script web application for managing maintenance work orders with a comprehensive dashboard view.

## Features

### Dashboard Tab
- **Department View**: Displays work orders grouped by department (ME 1, ME 2, etc.)
- **Contractor Usage Summary**: Shows current contractor usage vs capacity
  - Bank contractors: tracks usage against capacity of 16
  - External contractors: tracks usage (unlimited capacity)
  - Chanchai contractors: tracks usage against capacity of 10
  - LM contractors: tracks usage against capacity of 8
- **Section Organization**: Work orders grouped by sections:
  - Crusher & Raw mill & Coal mill
  - Cement mill
  - Kiln
  - General
- **Supervisor Overview**: Visual pills showing supervisors with active work orders
  - Red pills indicate supervisors with overdue work
  - Gray pills indicate normal status
  - Shows work count (X 2, X 3, etc.) when supervisor has multiple work orders
- **Work Order Table**: Complete listing with columns:
  - Supervisor name
  - Work order number
  - Description
  - Contractor assigned
  - Quantity
  - Working time
  - Status (Completed, In Progress, Pending, Overdue)

### Create/Update Tab
- Add new work orders
- Edit existing work orders
- Manage supervisors, contractors, and spare parts

## Setup Instructions

### 1. Google Sheets Setup
1. Create a new Google Sheet
2. Go to Extensions → Apps Script
3. Copy the contents of `Code.js` into the script editor
4. Copy the contents of `index.html` into a new HTML file
5. Save the project

### 2. Populate Sample Data
To see the dashboard in action with demo data:
1. In the Apps Script editor, run the function `populateSampleData()`
2. This will create sample work orders matching the dashboard preview

### 3. Deploy
1. Click "Deploy" → "New deployment"
2. Select type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone" (or your preferred setting)
5. Click "Deploy"
6. Copy the web app URL

## Dashboard Data Structure

The `getDashboardData()` function returns data in this format:

```javascript
{
  success: true,
  data: {
    departments: [
      {
        name: "ME 1",
        workOrders: [
          {
            workOrderId: "10227783",
            supervisorName: "Aphirak S.",
            supervisorUserId: "ME1001",
            description: "C2J03 เปลี่ยนใบกวาด",
            section: "Crusher & Raw mill & Coal mill",
            status: "completed",
            contractors: [
              {
                name: "Bank",
                quantity: 4,
                workingTime: "08:00 - 17:00",
                capacity: 16
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Status Colors

- **Completed**: Green badge (work completed on a past date)
- **In Progress**: Gray badge (work scheduled for today)
- **Pending**: Yellow badge (work scheduled for future)
- **Overdue**: Red badge (work past due date)

## Contractor Capacity

The system tracks contractor capacity:
- **Bank**: 16 workers
- **Chanchai**: 10 workers
- **LM**: 8 workers
- **External**: Unlimited (capacity not tracked)

When usage exceeds capacity, the numbers are highlighted in red.

## Customization

### Adding Departments
Edit the department extraction logic in `getDashboardData()` function in Code.js.

### Adding Sections
Update the `extractSection()` function in Code.js to recognize new section keywords.

### Changing Contractor Capacities
Modify the `getContractorCapacity()` function in Code.js.

## Usage

1. **View Dashboard**: Click the "Dashboard" tab to see all active work orders
2. **Refresh Data**: Click the "Refresh" button to reload dashboard data
3. **Create Work Order**: Switch to "Create/Update" tab to add new work orders
4. **Auto-Updates**: Dashboard automatically loads data on page load

## File Structure

```
.
├── Code.js           # Backend Google Apps Script code
├── index.html        # Frontend HTML/JavaScript/CSS
├── appsscript.json   # Apps Script manifest
└── README.md         # This file
```

## Backend Functions

- `doGet()` - Serves the web app
- `getDashboardData(department)` - Retrieves dashboard data
- `submitWorkOrder(formData)` - Saves new work order
- `updateWorkOrder(formData)` - Updates existing work order
- `deleteWorkOrder(workOrderId)` - Deletes work order
- `populateSampleData()` - Adds demo data (for testing)

## Technology Stack

- **Backend**: Google Apps Script (JavaScript)
- **Frontend**: HTML5, CSS3 (Tailwind CSS), JavaScript (jQuery)
- **Data Storage**: Google Sheets
- **UI Components**: 
  - SweetAlert2 for notifications
  - Flatpickr for date/time selection
  - Font Awesome for icons
  - Moment.js for date formatting

## Browser Support

Works best in modern browsers (Chrome, Firefox, Safari, Edge).

## License

Internal use only.
