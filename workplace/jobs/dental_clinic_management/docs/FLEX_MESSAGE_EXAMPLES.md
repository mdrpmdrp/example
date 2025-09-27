# Flex Message Implementation Example

This document provides practical examples of how to implement and use the modern Flex Message templates in your dental clinic LINE Bot.

## Quick Start Guide

### 1. Basic Setup

First, ensure your LINE Bot configuration is properly set up in the config service:

```javascript
// In src/config/configService.js
const lineBotConfig = {
  channelAccessToken: "YOUR_ACTUAL_CHANNEL_ACCESS_TOKEN",
  channelSecret: "YOUR_CHANNEL_SECRET"
};
```

### 2. Testing the Templates

You can test all Flex Message templates using the built-in test function:

```javascript
// Run this in Google Apps Script editor
function testAllFlexMessages() {
  testFlexMessages();
}
```

This will log all the Flex Message JSON structures to the console for inspection.

## Real-World Implementation Examples

### Example 1: Welcome New Users

```javascript
function handleNewUserWelcome(userId) {
  const welcomeMessage = createWelcomeFlexMessage('คลินิกทันตกรรมสมายล์');
  
  if (sendFlexMessage(userId, welcomeMessage)) {
    console.log('Welcome message sent successfully');
    
    // Optional: Send service menu after welcome
    setTimeout(() => {
      const serviceMenu = createServiceMenuFlexMessage();
      sendFlexMessage(userId, serviceMenu);
    }, 2000);
  }
}
```

### Example 2: Patient Registration Flow

```javascript
function handlePatientRegistration(userId, patientId) {
  const result = registerPatientLineId(patientId, userId);
  
  let flexMessage;
  if (result.success) {
    flexMessage = createPatientSuccessFlexMessage(patientId);
  } else if (result.message.includes('already')) {
    flexMessage = createPatientAlreadyRegisteredFlexMessage(patientId);
  } else {
    flexMessage = createPatientNotFoundFlexMessage(patientId);
  }
  
  sendFlexMessage(userId, flexMessage);
}
```

### Example 3: Appointment Reminders

```javascript
function sendAppointmentReminders() {
  // Get tomorrow's appointments
  const tomorrowAppointments = getTomorrowAppointments();
  
  tomorrowAppointments.forEach(appointment => {
    if (appointment.lineUserId) {
      const appointmentData = {
        patientName: appointment.patientName,
        doctorName: appointment.doctorName,
        appointmentDate: formatDate(appointment.date),
        appointmentTime: formatTime(appointment.time),
        treatmentType: appointment.treatment || 'การตรวจทั่วไป',
        location: 'คลินิกทันตกรรมสมายล์'
      };
      
      const reminderMessage = createAppointmentReminderFlexMessage(appointmentData);
      sendFlexMessage(appointment.lineUserId, reminderMessage);
    }
  });
}
```

### Example 4: Interactive Service Menu

```javascript
function handleServiceInquiry(userId, messageText) {
  switch(messageText.toLowerCase()) {
    case 'เมนู':
    case 'menu':
    case 'ดูเมนูบริการ':
      const serviceMenu = createServiceMenuFlexMessage();
      sendFlexMessage(userId, serviceMenu);
      break;
      
    case 'นัดหมายการรักษาทั่วไป':
      // Handle general treatment appointment booking
      handleGeneralTreatmentBooking(userId);
      break;
      
    case 'ปรึกษาทันตกรรมเสริมสวย':
      // Handle cosmetic dentistry consultation
      handleCosmeticConsultation(userId);
      break;
      
    default:
      // Send welcome message for unrecognized input
      const welcomeMsg = createWelcomeFlexMessage();
      sendFlexMessage(userId, welcomeMsg);
  }
}
```

## Advanced Customization

### Creating Custom Flex Messages

You can create additional Flex Message templates by following the same pattern:

```javascript
function createCustomTreatmentPlanFlexMessage(patientData, treatments) {
  return {
    "type": "flex",
    "altText": "แผนการรักษาของคุณ",
    "contents": {
      "type": "bubble",
      "size": "kilo",
      "header": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "แผนการรักษา",
            "weight": "bold",
            "color": THEME_COLORS.TEXT_WHITE,
            "size": "lg",
            "align": "center"
          }
        ],
        "backgroundColor": THEME_COLORS.PRIMARY_BLUE,
        "paddingAll": "15px"
      },
      "body": {
        // Add your custom body content here
      },
      "footer": {
        // Add your custom footer content here
      }
    }
  };
}
```

### Using Theme Colors

Always use the predefined theme colors from constants for consistency:

```javascript
// Good: Using theme constants
color: THEME_COLORS.PRIMARY_BLUE

// Bad: Hard-coded colors
color: "#2B5797"
```

## Integration with Webhook

### Complete Webhook Handler Example

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    data.events.forEach(event => {
      if (event.type === 'message' && event.message.type === 'text') {
        const userId = event.source.userId;
        const messageText = event.message.text.trim().toLowerCase();
        const replyToken = event.replyToken;
        
        // Handle different message types with Flex Messages
        if (messageText === 'เมนู' || messageText === 'menu') {
          const serviceMenu = createServiceMenuFlexMessage();
          sendReplyFlexMessage(replyToken, serviceMenu);
          
        } else if (messageText.match(/^p\d{8}$/)) {
          // Handle patient registration
          handlePatientRegistrationWithReply(replyToken, messageText.toUpperCase(), userId);
          
        } else {
          // Default welcome message
          const welcomeMsg = createWelcomeFlexMessage();
          sendReplyFlexMessage(replyToken, welcomeMsg);
        }
      }
    });
    
    return ContentService.createTextOutput('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return ContentService.createTextOutput('Error');
  }
}

function handlePatientRegistrationWithReply(replyToken, patientId, userId) {
  const result = registerPatientLineId(patientId, userId);
  
  let flexMessage;
  if (result.success) {
    flexMessage = createPatientSuccessFlexMessage(patientId);
  } else if (result.message.includes('already')) {
    flexMessage = createPatientAlreadyRegisteredFlexMessage(patientId);
  } else {
    flexMessage = createPatientNotFoundFlexMessage(patientId);
  }
  
  sendReplyFlexMessage(replyToken, flexMessage);
}
```

## Automated Campaigns

### Daily Appointment Reminders

Set up a daily trigger to send appointment reminders:

```javascript
function createAppointmentReminderTrigger() {
  ScriptApp.newTrigger('sendDailyAppointmentReminders')
    .timeBased()
    .everyDays(1)
    .atHour(18) // 6 PM
    .create();
}

function sendDailyAppointmentReminders() {
  sendAppointmentReminders();
}
```

### Weekly Service Promotions

```javascript
function sendWeeklyPromotions() {
  const activeUsers = getActiveLineUsers();
  
  activeUsers.forEach(user => {
    const promotionalMessage = createPromotionalFlexMessage();
    sendFlexMessage(user.lineUserId, promotionalMessage);
  });
}
```

## Performance Optimization

### Batch Message Sending

For multiple messages, use batch operations:

```javascript
function sendBatchFlexMessages(userMessages) {
  const batchSize = 10;
  
  for (let i = 0; i < userMessages.length; i += batchSize) {
    const batch = userMessages.slice(i, i + batchSize);
    
    batch.forEach(({userId, message}) => {
      sendFlexMessage(userId, message);
    });
    
    // Add delay between batches to avoid rate limiting
    if (i + batchSize < userMessages.length) {
      Utilities.sleep(1000);
    }
  }
}
```

## Error Handling Best Practices

```javascript
function robustFlexMessageSend(userId, flexMessage) {
  try {
    const success = sendFlexMessage(userId, flexMessage);
    
    if (!success) {
      // Fallback to simple text message
      sendSimpleTextMessage(userId, flexMessage.altText);
      console.warn(`Flex message failed for user ${userId}, sent fallback text`);
    }
    
    return success;
  } catch (error) {
    console.error('Error sending flex message:', error);
    
    // Log error for monitoring
    logMessageError(userId, error);
    
    return false;
  }
}
```

## Monitoring and Analytics

### Message Delivery Tracking

```javascript
function trackMessageDelivery(userId, messageType, success) {
  const trackingData = [
    new Date(),
    userId,
    messageType,
    success ? 'SUCCESS' : 'FAILED'
  ];
  
  const trackingSheet = getSheet('MESSAGE_TRACKING');
  trackingSheet.appendRow(trackingData);
}
```

This implementation provides a complete, production-ready system for dental clinic LINE Bot with modern Flex Messages that enhance user experience and maintain professional branding throughout all interactions.