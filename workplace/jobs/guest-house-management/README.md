# Non La Mer Hostel - Bed Management System

A comprehensive bed management system for Non La Mer Hostel built with Google Apps Script and modern web technologies.

## Features

### 🏨 **Hostel Configuration**
- **48 Total Beds** across 7 dormitories
- **Room Layout:**
  - Dorm 1: 8 beds (1A-1H)
  - Dorm 2: 6 beds (2A-2F)
  - Dorm 3: 6 beds (3A-3F)
  - Dorm 4: 6 beds (4A-4F)
  - Dorm 5: 8 beds (5A-5H)
  - Dorm 7: 8 beds (7A-7H)
  - Dorm 8: 6 beds (8A-8F)

### 🛏️ **Bed Types**
- **Upper Beds:** A, C, E, G positions
- **Lower Beds:** B, D, F, H positions

### 📊 **Dashboard Features**
- Real-time occupancy statistics
- Available vs occupied bed counts
- Occupancy rate percentage
- Date-specific data views

### 🔄 **Bed Management**
- **Move Beds:** Swap guest data between any two beds
- **Check-in System:** Register new guests with dates and notes
- **Check-out System:** Process guest departures
- **Reset Function:** Clear all bed data for a specific date

### 🎨 **Design Elements**
- **Brand Colors:** #f5e34 (primary), #db0b20 (secondary)
- **Logo Integration:** Non La Mer Hostel branding
- **Responsive Design:** Mobile-friendly interface
- **Animation Effects:** Smooth transitions and hover effects

## Setup Instructions

### 1. Google Apps Script Setup

1. **Create a new Google Apps Script project:**
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"
   - Name it "Non La Mer Hostel Management"

2. **Upload files:**
   - Replace `Code.gs` content with `Code.js`
   - Replace `appsscript.json` content
   - Add `index.html` as an HTML file

3. **Create a Google Spreadsheet:**
   - Create a new Google Sheets document
   - Copy the Spreadsheet ID from the URL
   - Update the `SPREADSHEET_ID` constant in `Code.js`

4. **Deploy as Web App:**
   - Click "Deploy" > "New Deployment"
   - Choose "Web app" as type
   - Set access to "Anyone"
   - Click "Deploy"

### 2. Local Development (Optional)

If you want to develop locally using clasp:

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google
clasp login

# Clone this project (update with your script ID)
clasp clone [YOUR_SCRIPT_ID]

# Push changes
clasp push

# Deploy
clasp deploy
```

### 3. Configuration

1. **Update Script ID in .clasp.json:**
   ```json
   {
     "scriptId": "YOUR_ACTUAL_SCRIPT_ID_HERE"
   }
   ```

2. **Set up the spreadsheet:**
   - The system will automatically create the required sheets
   - Or manually create a sheet named "HostelData" with these columns:
     - Date | BedID | Status | GuestName | CheckInDate | CheckOutDate | Notes

## Usage Guide

### Daily Operations

1. **Select Date:**
   - Use the date picker to view/manage specific dates
   - System defaults to current date

2. **Dashboard Monitoring:**
   - View real-time occupancy statistics
   - Monitor available/occupied bed counts

3. **Guest Check-in:**
   - Click "Check In" button
   - Fill guest details and select available bed
   - Set check-in and expected check-out dates

4. **Guest Check-out:**
   - Click "Check Out" button
   - Select occupied bed from dropdown
   - Confirm check-out date

5. **Bed Swapping:**
   - Click "Move Beds" to enter move mode
   - Click on two beds to swap their occupants
   - Useful for guest requests or room changes

### Bed Status Colors

- 🟢 **Green:** Available beds
- 🔴 **Red:** Occupied beds
- 🟡 **Yellow:** Selected beds (during move mode)

### Advanced Features

- **Auto-save:** Data is automatically saved every 30 seconds
- **Local Storage:** Backup data stored in browser
- **Responsive Design:** Works on desktop, tablet, and mobile
- **Data Export:** Generate reports for specific date ranges

## File Structure

```
guest-house-management/
├── index.html          # Main web interface
├── Code.js            # Google Apps Script backend
├── appsscript.json    # Apps Script configuration
├── .clasp.json        # Clasp deployment config
└── README.md          # Documentation
```

## Technical Details

### Frontend Technologies
- **Bootstrap 5.3.3:** UI framework
- **jQuery 3.7.1:** DOM manipulation
- **SweetAlert2:** Beautiful alerts and modals
- **Flatpickr:** Date picker
- **NProgress:** Loading indicators
- **AOS:** Scroll animations
- **Font Awesome & Bootstrap Icons:** Icon sets

### Backend (Google Apps Script)
- **Spreadsheet Integration:** Data persistence
- **RESTful Functions:** API endpoints for CRUD operations
- **Error Handling:** Comprehensive error management
- **Data Validation:** Input validation and sanitization

### Data Structure

Each bed record contains:
```javascript
{
  status: 'available' | 'occupied',
  guest: 'Guest Name' | null,
  checkIn: 'YYYY-MM-DD' | null,
  checkOut: 'YYYY-MM-DD' | null,
  notes: 'Additional notes' | ''
}
```

## Customization

### Adding New Dorms
1. Update `HOSTEL_CONFIG.dorms` in both frontend and backend
2. Update `HOSTEL_CONFIG.totalBeds` count
3. Redeploy the application

### Styling Changes
- Modify CSS custom properties in `:root` selector
- Update brand colors and logo URL
- Customize animation effects and transitions

### Functionality Extensions
- Add guest contact information fields
- Implement booking calendar integration
- Add payment tracking features
- Create automated email notifications

## Troubleshooting

### Common Issues

1. **Data not saving:**
   - Check Google Sheets permissions
   - Verify SPREADSHEET_ID is correct
   - Ensure Apps Script has proper OAuth scopes

2. **Web app not loading:**
   - Verify deployment settings
   - Check if web app is deployed as "Anyone" access
   - Clear browser cache

3. **Bed data not updating:**
   - Refresh the page
   - Check browser console for errors
   - Verify internet connection

### Support

For technical support or feature requests, please refer to the Google Apps Script documentation or contact the development team.

## License

This project is developed for Non La Mer Hostel - Bed & Yoga. All rights reserved.

---

**Non La Mer Hostel - Bed & Yoga Management System**  
*Streamlining hostel operations with modern technology*