# LINE Flex Message Templates Documentation

This document describes the modern Flex Message templates implemented for the dental clinic management system.

## Overview

The system includes several professionally designed Flex Message templates that provide a modern, responsive interface for LINE Bot interactions. All templates follow dental clinic branding with appropriate colors and iconography.

## Design System

### Color Palette
- **Primary Blue**: `#2B5797` - Headers, titles, primary actions
- **Success Green**: `#27AE60` - Success states, confirmations
- **Warning Orange**: `#F39C12` - Warnings, already registered states
- **Error Red**: `#E74C3C` - Errors, cancellations
- **Info Blue**: `#3498DB` - Information, secondary actions
- **Pink Accent**: `#E91E63` - Cosmetic dentistry services
- **Text Colors**: 
  - Primary: `#2C3E50`
  - Secondary: `#34495E`
  - Muted: `#7F8C8D`
- **Backgrounds**:
  - Success: `#E8F5E8`
  - Warning: `#FFF9E6`
  - Info: `#F8FBFF`

### Typography
- **Headers**: Bold, Large (lg/xl)
- **Body Text**: Regular, Medium (sm/md)
- **Captions**: Small (xs/sm), muted colors

## Flex Message Templates

### 1. Patient Not Found Message
**Function**: `createPatientNotFoundFlexMessage(patientId)`

Features:
- Clean error state design
- Search icon and appropriate messaging
- Call-to-action button for support
- Patient ID display
- Helpful instructions

**Use Case**: When a patient ID is not found in the database

### 2. Patient Already Registered Message
**Function**: `createPatientAlreadyRegisteredFlexMessage(patientId)`

Features:
- Warning state with shield icon
- Dual action buttons (Contact Support / Check Info)
- Clear status messaging
- Professional layout

**Use Case**: When attempting to register a patient ID that's already linked to LINE

### 3. Patient Registration Success Message
**Function**: `createPatientSuccessFlexMessage(patientId)`

Features:
- Celebration design with success checkmark
- Welcome messaging
- Quick action buttons for appointments and services
- Usage tips at the bottom

**Use Case**: Successful LINE registration completion

### 4. Appointment Reminder Message
**Function**: `createAppointmentReminderFlexMessage(appointmentData)`

**Parameters**:
```javascript
appointmentData = {
  patientName: string,
  doctorName: string,
  appointmentDate: string,
  appointmentTime: string,
  treatmentType: string,
  location: string
}
```

Features:
- Professional appointment card layout
- Dental icon branding
- Structured information display with icons
- Three-button footer (Cancel, Reschedule, Confirm)
- Clear visual hierarchy

**Use Case**: Appointment reminders and notifications

### 5. Service Menu Carousel
**Function**: `createServiceMenuFlexMessage()`

Features:
- Three-card carousel design
- Color-coded service categories:
  - **General Treatment** (Blue): Basic dental services
  - **Cosmetic Dentistry** (Pink): Aesthetic treatments
  - **Additional Services** (Green): Consultations and support
- Each card includes relevant icons and service lists
- Action buttons for each category

**Use Case**: Main service menu and navigation

### 6. Welcome Message
**Function**: `createWelcomeFlexMessage(clinicName)`

Features:
- Hero image with dental clinic ambiance
- Professional welcome design
- Step-by-step usage instructions
- Dual action buttons (Services / Contact)
- Branded header with clinic name

**Use Case**: First-time user onboarding and help

## Helper Functions

### sendFlexMessage(userId, flexMessage)
Sends a Flex Message directly to a specific LINE user.

**Parameters**:
- `userId`: LINE User ID
- `flexMessage`: Flex Message object

**Returns**: Boolean (success/failure)

### sendReplyFlexMessage(replyToken, flexMessage)
Replies to a specific message with a Flex Message.

**Parameters**:
- `replyToken`: LINE Reply Token from webhook
- `flexMessage`: Flex Message object

**Returns**: Boolean (success/failure)

### testFlexMessages()
Comprehensive testing function that generates and logs all Flex Message templates for debugging and validation.

## Integration with LINE Bot

The Flex Messages are integrated into the main message processing flow:

1. **Patient ID Pattern**: Triggers registration flow with appropriate Flex Messages
2. **Menu Keywords**: "เมนู", "menu", "ดูเมนูบริการ" trigger service menu
3. **Greeting Keywords**: "สวัสดี", "hello", "hi" trigger welcome message
4. **Default**: Unknown messages trigger welcome message with instructions

## Usage Examples

```javascript
// Send a welcome message
const welcomeMsg = createWelcomeFlexMessage('คลินิกทันตกรรมสมายล์');
sendFlexMessage(userId, welcomeMsg);

// Send appointment reminder
const appointmentData = {
  patientName: 'คุณสมชาย',
  doctorName: 'ทพ.สมหญิง',
  appointmentDate: '15 ต.ค. 2567',
  appointmentTime: '14:30 น.',
  treatmentType: 'อุดฟัน',
  location: 'คลินิกทันตกรรมสมายล์'
};
const reminderMsg = createAppointmentReminderFlexMessage(appointmentData);
sendFlexMessage(userId, reminderMsg);

// Test all templates
testFlexMessages();
```

## Best Practices

1. **Consistent Branding**: All templates maintain consistent color scheme and typography
2. **Mobile-First**: Designed for optimal mobile viewing experience
3. **Accessibility**: High contrast ratios and clear text hierarchy
4. **Action-Oriented**: Clear call-to-action buttons in each template
5. **Informative**: Appropriate icons and visual cues for quick understanding
6. **Error Handling**: Graceful fallbacks and helpful error messages

## Future Enhancements

- **Rich Menu Integration**: Link Flex Messages with LINE Rich Menu
- **Dynamic Content**: Template personalization based on user data
- **Analytics**: Track interaction rates with different templates
- **Localization**: Multi-language support for templates
- **A/B Testing**: Template variation testing for optimization

## Technical Notes

- All templates are compatible with LINE Messaging API v2
- Images use public CDN URLs (replace with your own assets)
- Templates follow LINE's Flex Message specification
- Error handling included in all helper functions
- Logging implemented for debugging and monitoring