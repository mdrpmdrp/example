# LINE Messaging API Integration

This document describes how to integrate the Dental Clinic Management System with LINE Messaging API to receive messages from LINE users.

## 📋 Features

### ✅ Implemented Features
- **Webhook Processing**: Receives and processes LINE webhook data
- **Message Extraction**: Extracts text messages, user IDs, and message metadata
- **Multi-message Support**: Handles multiple events in a single webhook request
- **Message Types**: Supports text, sticker, location, and media messages
- **Data Storage**: Stores LINE messages in Google Sheets for record keeping
- **Notifications**: Sends alerts to Google Chat when new messages arrive
- **User Search**: Find messages by LINE user ID

### 🔧 Core Functions

#### Webhook Processing
- `handleLineWebhook(requestData)` - Main webhook handler
- `processLineWebhook(webhookData)` - Process webhook events
- `extractLineMessageData(event)` - Extract message from individual events

#### Data Management
- `storeLineMessages(messages)` - Store messages in Google Sheets
- `getLineMessagesByUserId(userId)` - Retrieve messages by user ID

#### Configuration
- `setLineBotConfig(channelSecret, channelAccessToken)` - Set LINE Bot credentials
- `getLineBotConfig()` - Get stored LINE Bot configuration

#### Testing
- `testLineWebhookProcessing()` - Test webhook processing with sample data
- `testLineBotSetup()` - Complete LINE Bot setup test

## 🚀 Setup Instructions

### Step 1: Create LINE Bot
1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a new channel (Messaging API)
3. Get your **Channel Secret** and **Channel Access Token**

### Step 2: Configure the System
```javascript
// Set LINE Bot configuration
setLineBotConfig("YOUR_CHANNEL_SECRET", "YOUR_CHANNEL_ACCESS_TOKEN");
```

### Step 3: Deploy as Web App
1. In Google Apps Script, go to **Deploy** > **New Deployment**
2. Choose type: **Web App**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Copy the deployed web app URL

### Step 4: Set Webhook URL in LINE
1. Go to your LINE channel settings
2. Set **Webhook URL** to your deployed web app URL
3. Enable **Use webhook**
4. Verify the webhook (it should return 200 OK)

### Step 5: Test the Integration
```javascript
// Test the LINE Bot setup
testLineBotSetup();

// Test webhook processing
testLineWebhookProcessing();
```

## 📊 Data Structure

### Incoming LINE Webhook Format
```json
{
  "destination": "U1234567890abcdef1234567890abcdef",
  "events": [
    {
      "type": "message",
      "mode": "active",
      "timestamp": 1234567890123,
      "source": {
        "type": "user",
        "userId": "U1234567890abcdef1234567890abcdef"
      },
      "replyToken": "replytoken123",
      "message": {
        "id": "message123",
        "type": "text",
        "text": "Hello from LINE!"
      }
    }
  ]
}
```

### Processed Message Data
```javascript
{
  eventId: "replytoken123",
  timestamp: "2025-09-27T10:30:00.000Z",
  userId: "U1234567890abcdef1234567890abcdef",
  userType: "user",
  messageId: "message123", 
  messageType: "text",
  text: "Hello from LINE!",
  processedAt: "2025-09-27T10:30:01.000Z",
  source: "LINE"
}
```

## 💬 Supported Message Types

### Text Messages
- ✅ **Plain text**: Extracts message content
- ✅ **User ID**: Identifies the sender
- ✅ **Timestamp**: Records when message was sent

### Rich Messages
- ✅ **Stickers**: Package ID and Sticker ID
- ✅ **Location**: Title, address, coordinates
- ✅ **Media**: Images, videos, audio files (URLs)
- ✅ **Files**: Document attachments (URLs)

## 📈 Usage Examples

### Basic Webhook Handling
```javascript
function doPost(e) {
  // This is automatically called when LINE sends webhook data
  const result = handleLineWebhook(JSON.parse(e.postData.contents));
  return ContentService.createTextOutput(JSON.stringify(result));
}
```

### Manual Processing
```javascript
// Process a webhook manually
const webhookData = {
  events: [/* LINE events */]
};
const result = processLineWebhook(webhookData);
console.log("Processed:", result.processedMessages, "messages");
```

### Search User Messages
```javascript
// Find all messages from a specific user
const userId = "U1234567890abcdef1234567890abcdef";
const userMessages = getLineMessagesByUserId(userId);
console.log("Found", userMessages.count, "messages from user");
```

## 🔔 Notifications

### Google Chat Integration
When a LINE message is received, the system can automatically send a notification to Google Chat:

```
📱 ข้อความใหม่จาก LINE
👤 User ID: U1234567890abcdef1234567890abcdef
📝 ประเภท: text
💬 ข้อความ: "สวัสดีค่ะ ต้องการนัดหมายหมอ"
⏰ เวลา: 27/9/2025 17:30:00
```

### Configure Notifications
```javascript
// Enable LINE message notifications
setGoogleChatWebhook("YOUR_GOOGLE_CHAT_WEBHOOK_URL");

// Test notification
testGoogleChatNotification();
```

## 📊 Data Storage

### LINE_Messages Sheet
The system automatically creates a sheet to store LINE messages:

| Column | Description |
|--------|-------------|
| Message ID | Unique message identifier |
| Event ID | Reply token from LINE |
| User ID | LINE user identifier |
| User Type | user/group/room |
| Message Type | text/sticker/location/media |
| Text Content | Message text (if text message) |
| Timestamp | When message was sent |
| Processed At | When system processed it |
| Group ID | Group ID (if sent in group) |
| Room ID | Room ID (if sent in room) |
| Media URL | URL for media files |
| Location | Location data (JSON) |
| Sticker Info | Sticker data (JSON) |
| Source | Always "LINE" |

## 🔧 Troubleshooting

### Common Issues

#### 1. Webhook Not Receiving Data
- ✅ Check web app is deployed with correct permissions
- ✅ Verify webhook URL is set correctly in LINE console
- ✅ Check Google Apps Script logs for errors

#### 2. Message Processing Fails
```javascript
// Check webhook processing
const testResult = testLineWebhookProcessing();
console.log("Test result:", testResult);
```

#### 3. Configuration Issues
```javascript
// Verify LINE Bot configuration
const config = getLineBotConfig();
console.log("Channel Secret configured:", !!config.channelSecret);
console.log("Access Token configured:", !!config.channelAccessToken);
```

#### 4. Storage Problems
- ✅ Check if LINE_Messages sheet exists
- ✅ Verify sheet has correct headers
- ✅ Check Google Sheets API permissions

### Debug Information
```javascript
// Enable detailed logging
function debugLineWebhook(webhookData) {
  console.log("Raw webhook data:", JSON.stringify(webhookData, null, 2));
  
  const result = handleLineWebhook(webhookData);
  console.log("Processing result:", JSON.stringify(result, null, 2));
  
  return result;
}
```

## 🎯 Next Steps

### Potential Enhancements
1. **Reply Messages**: Send automated replies to LINE users
2. **Rich Messages**: Send template messages with buttons/carousels
3. **User Registration**: Link LINE users to patient records
4. **Appointment Booking**: Allow appointment booking via LINE
5. **Payment Integration**: Process payments through LINE Pay
6. **Multi-language**: Support multiple languages
7. **Analytics**: Track message volume and user engagement

### Integration Examples
```javascript
// Example: Link LINE user to patient
function linkLineUserToPatient(lineUserId, patientId) {
  // Implementation would go here
  // Store mapping in Google Sheets
  // Enable patient-specific communications
}

// Example: Send appointment reminder
function sendAppointmentReminder(patientId, appointmentData) {
  // Get patient's LINE user ID
  // Send reminder message via LINE API
  // Log communication
}
```

---

📚 **Documentation**: This integration provides a solid foundation for LINE messaging capabilities. The modular design makes it easy to extend with additional features as needed.

🔧 **Support**: For technical issues, check the Google Apps Script logs and use the provided testing functions to diagnose problems.