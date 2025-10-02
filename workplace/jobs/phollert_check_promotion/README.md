# Product & Promotion Search Application

A modern, responsive web application built with Google Apps Script that allows users to search both products and promotions from Google Sheets simultaneously. The application features a beautiful UI with real-time search capabilities and loads all data at startup for fast searching.

## Features

✨ **Modern Design**
- Beautiful gradient backgrounds and glassmorphism effects
- Responsive design that works on all devices
- Smooth animations using AOS (Animate On Scroll)
- Thai language support with Noto Sans Thai font

🔍 **Advanced Search**
- Real-time search with debouncing (500ms delay)
- Search across both products and promotions simultaneously
- Highlighted search terms in results
- Case-insensitive search across all fields

📊 **Data Management**
- Loads all data at startup for fast searching
- Displays statistics (total products, promotions, search results)
- Error handling with user-friendly messages
- Loading indicators and progress bars

🎨 **User Experience**
- Split view showing products on left, promotions on right
- Card-based layout with hover effects
- SweetAlert2 for beautiful notifications
- Bootstrap 5 for responsive components

## Setup Instructions

### 1. Google Sheets Preparation

Create a Google Spreadsheet with two sheets:

#### Sheet 1: "GOODS" (Products)
Recommended column headers (you can use English or Thai):
- `name` / `ชื่อสินค้า` - Product name
- `code` / `รหัส` - Product code
- `price` / `ราคา` - Product price
- `category` / `หมวดหมู่` - Product category
- `description` / `รายละเอียด` - Product description

Example data:
```
name           | code    | price  | category | description
iPhone 15 Pro  | IP15P   | 39900  | Mobile   | Latest iPhone model
Samsung S24    | SS24    | 28900  | Mobile   | Android flagship
MacBook Air    | MBA15   | 42900  | Laptop   | M2 chip laptop
```

#### Sheet 2: "PRO" (Promotions)
Recommended column headers:
- `title` / `ชื่อโปรโมชั่น` - Promotion title
- `code` / `รหัส` - Promotion code
- `discount` / `ส่วนลด` - Discount amount/percentage
- `expiry` / `วันหมดอายุ` - Expiration date
- `description` / `รายละเอียด` - Promotion description

Example data:
```
title               | code     | discount | expiry     | description
Flash Sale Mobile   | FLASH50  | 50%      | 2025-12-31 | 50% off all mobiles
New Year Special    | NY2025   | 2000฿    | 2025-01-31 | 2000 baht discount
Student Discount    | STUDENT  | 15%      | 2025-06-30 | 15% off for students
```

### 2. Google Apps Script Setup

1. **Open Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Click "New Project"

2. **Upload Files**
   - Replace the default `Code.gs` content with the content from `Code.js`
   - Create a new HTML file named `index` and paste the content from `index.html`
   - Copy the `appsscript.json` content to configure the project

3. **Configure Spreadsheet ID**
   - Open your Google Spreadsheet
   - Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
   - In `Code.gs`, replace `YOUR_SPREADSHEET_ID_HERE` with your actual spreadsheet ID:
   ```javascript
   const SPREADSHEET_ID = 'your_actual_spreadsheet_id_here';
   ```

4. **Set Permissions**
   - Click the "Save" button (💾)
   - Click "Run" to test the `testSheetAccess` function
   - Grant necessary permissions when prompted

5. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Select type: "Web app"
   - Description: "Product & Promotion Search"
   - Execute as: "Me"
   - Who has access: Choose based on your needs
   - Click "Deploy"
   - Copy the web app URL

### 3. Testing

1. **Test Sheet Access**
   ```javascript
   // Run this function in Apps Script editor to test
   function test() {
     const result = testSheetAccess();
     console.log(result);
   }
   ```

2. **Test Data Loading**
   - Open the web app URL
   - Check browser console for any errors
   - Verify that statistics show correct numbers

## Usage

1. **Loading Data**
   - Data loads automatically when the page opens
   - Success/error notifications will appear
   - Statistics will show total counts

2. **Searching**
   - Type in the search box to search in real-time
   - Press Enter or click the search button
   - Results appear split into Products (left) and Promotions (right)

3. **Search Features**
   - Search terms are highlighted in results
   - Search works across all fields in both sheets
   - Real-time search with 500ms delay
   - Case-insensitive matching

## Customization

### Styling
The application uses CSS custom properties and can be easily customized:

- **Colors**: Modify the gradient backgrounds in the CSS
- **Fonts**: Change the Google Fonts import
- **Layout**: Adjust Bootstrap classes and custom CSS
- **Animations**: Modify AOS settings

### Data Fields
To support different data structures:

1. Update the field mappings in `createProductCard()` and `createPromotionCard()`
2. Modify the search logic if needed
3. Update the statistics calculations

### Languages
To change language:

1. Update all Thai text in the HTML
2. Modify moment.js locale settings
3. Update SweetAlert2 messages

## Dependencies

- **Bootstrap 5.3.3** - UI framework
- **jQuery 3.7.1** - DOM manipulation
- **Font Awesome 6.7.2** - Icons
- **SweetAlert2** - Beautiful alerts
- **Moment.js** - Date formatting
- **NProgress** - Loading progress bar
- **AOS** - Scroll animations
- **Google Fonts** - Noto Sans Thai font

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## Performance Notes

- All data is loaded at startup for fast searching
- Implements debounced search to reduce processing
- Uses CSS transforms for smooth animations
- Optimized for mobile devices

## Troubleshooting

### Common Issues

1. **"ไม่สามารถโหลดข้อมูลได้"**
   - Check spreadsheet ID
   - Verify sheet names are exactly "GOODS" and "PRO"
   - Ensure proper permissions are granted

2. **Empty Results**
   - Check that sheets have data beyond headers
   - Verify data format matches expected structure

3. **Slow Loading**
   - Large datasets may take time to load
   - Consider pagination for very large datasets

### Debug Mode
Add this to enable console logging:
```javascript
// Add to the top of your script
const DEBUG = true;
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.