# WhatsApp Business API Integration Guide

## Overview

This document provides comprehensive information about the WhatsApp Business API integration for the Mohokare Consumer Portal. The integration allows the municipality to communicate with customers via WhatsApp for various purposes including payment reminders, service interruption notifications, and customer support.

## Features

- **Two-way Communication**: Send and receive messages with customers
- **Template Messages**: Pre-approved message templates for common notifications
- **Message Dashboard**: Monitor and manage all WhatsApp communications
- **Analytics**: Track message delivery, read rates, and customer sentiment
- **Customer Management**: Associate WhatsApp numbers with customer accounts
- **Chatbot Integration**: Automated responses based on customer inquiries
- **Sentiment Analysis**: Analyze customer message sentiment

## Architecture

The WhatsApp integration consists of the following components:

1. **Frontend Services**:
   - `whatsappService.ts`: Core service for sending and receiving messages
   - `whatsappNotificationService.ts`: Template-based notification service
   - `whatsappNotifications.ts`: Utility functions for business events

2. **Frontend Components**:
   - `WhatsAppDashboard.tsx`: Main interface for message management
   - `WhatsAppSettings.tsx`: Configuration interface
   - `WhatsAppAnalytics.tsx`: Metrics and reporting
   - `WhatsAppSetupGuide.tsx`: Step-by-step setup instructions

3. **Backend Routes**:
   - `/api/whatsapp/webhook`: Receives incoming messages and status updates
   - `/api/whatsapp/send`: Sends messages to customers
   - `/api/whatsapp/templates`: Manages message templates
   - `/api/whatsapp/settings`: Manages WhatsApp configuration

4. **Database Collections**:
   - `whatsappMessages`: Stores all sent and received messages
   - `whatsappTemplates`: Stores approved message templates
   - `settings/whatsapp`: Stores WhatsApp configuration

## Setup Process

### Prerequisites

- Meta Developer Account
- WhatsApp Business Account
- Phone number for WhatsApp Business API
- Approved message templates

### Configuration Steps

1. **Create Meta Developer Account**:
   - Sign up at [developers.facebook.com](https://developers.facebook.com/)
   - Verify your account

2. **Create Meta Business App**:
   - From the Meta Developer Dashboard, create a new app
   - Select "Business" as the app type
   - Complete the app creation process

3. **Add WhatsApp to Your App**:
   - Navigate to the Dashboard
   - Add WhatsApp as a product to your app

4. **Set Up WhatsApp Business Account**:
   - Create or connect a WhatsApp Business Account
   - Verify your business details

5. **Add Phone Number**:
   - Add and verify a phone number for WhatsApp Business

6. **Generate Access Token**:
   - Create a system user or generate an access token
   - Copy the token for use in your app

7. **Set Up Webhook**:
   - Configure your webhook URL
   - Set up a verify token
   - Subscribe to message and status update events

8. **Create Message Templates**:
   - Create templates for different notification types
   - Submit for approval

9. **Configure Portal Settings**:
   - Enter your WhatsApp credentials in the portal settings
   - Enable WhatsApp integration

10. **Test Integration**:
    - Send test messages
    - Verify webhook functionality

## Environmental Variables

### Frontend (.env)

```
VITE_WHATSAPP_API_URL=https://graph.facebook.com/v19.0
VITE_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
VITE_WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
VITE_WHATSAPP_ACCESS_TOKEN=your_access_token
VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
```

### Backend (.env)

```
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
```

## Message Templates

The following message templates should be created and approved in the WhatsApp Business Manager:

1. **Payment Reminder**:
   ```
   Hello {{1}}, this is a reminder that your account {{2}} has an outstanding balance of R{{3}} due on {{4}}. Please make payment to avoid service interruption.
   ```

2. **Statement Notification**:
   ```
   Hello {{1}}, your monthly statement for account {{2}} dated {{3}} is now available. You can view it here: {{4}}
   ```

3. **Payment Confirmation**:
   ```
   Hello {{1}}, we've received your payment of R{{2}} for account {{3}} on {{4}}. Your receipt number is {{5}}. Thank you!
   ```

4. **Query Response**:
   ```
   Hello {{1}}, we've responded to your query (Ref: {{2}}). Please check your customer portal or email for details.
   ```

5. **Service Interruption**:
   ```
   NOTICE: {{1}} service in {{2}} area will be interrupted from {{3}} to {{4}} due to {{5}}. We apologize for any inconvenience.
   ```

## API Reference

### WhatsApp Service

The `whatsappService.ts` provides the following methods:

- `sendTextMessage(to: string, message: string)`: Sends a text message
- `sendTemplateMessage(to: string, template: string, parameters: any[])`: Sends a template message
- `sendMediaMessage(to: string, mediaType: string, mediaUrl: string)`: Sends a media message
- `getMessageStatus(messageId: string)`: Gets the status of a sent message

### WhatsApp Notification Service

The `whatsappNotificationService.ts` provides the following methods:

- `sendPaymentReminder(phoneNumber: string, name: string, accountNumber: string, amount: number, dueDate: Date)`: Sends payment reminder
- `sendStatementNotification(phoneNumber: string, name: string, accountNumber: string, statementDate: Date, statementUrl: string)`: Sends statement notification
- `sendPaymentConfirmation(phoneNumber: string, name: string, accountNumber: string, amount: number, paymentDate: Date, receiptNumber: string)`: Sends payment confirmation
- `sendQueryResponseNotification(phoneNumber: string, name: string, queryReference: string)`: Sends query response notification
- `sendServiceInterruptionNotification(phoneNumber: string, area: string, serviceType: string, startTime: Date, estimatedEndTime: Date, reason: string)`: Sends service interruption notification

## Webhook Events

The WhatsApp webhook receives the following events:

- `messages`: New incoming messages
- `message_status`: Status updates for sent messages (sent, delivered, read)

## Database Schema

### whatsappMessages Collection

```typescript
interface WhatsAppMessage {
  id: string;
  type: 'inbound' | 'outbound';
  sender?: string;
  recipient?: string;
  content: string;
  timestamp: Timestamp;
  status: string;
  messageId?: string;
  messageType?: string;
  isTemplate?: boolean;
  templateData?: any;
  sentiment?: 'positive' | 'neutral' | 'negative';
  replyToMessageId?: string;
}
```

### settings/whatsapp Document

```typescript
interface WhatsAppSettings {
  enabled: boolean;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  apiVersion: string;
  autoReplyEnabled: boolean;
  autoReplyMessage: string;
}
```

## Security Considerations

- Store access tokens securely in environment variables
- Implement proper webhook verification
- Use HTTPS for all API calls
- Implement rate limiting to prevent abuse
- Regularly rotate access tokens
- Implement proper access control for WhatsApp dashboard

## Troubleshooting

### Common Issues

1. **Webhook Verification Failing**:
   - Ensure the verify token matches in both Meta Developer Portal and your server
   - Check that your server is publicly accessible

2. **Messages Not Being Sent**:
   - Verify access token is valid and has not expired
   - Check phone number ID is correct
   - Ensure template messages are approved

3. **Template Messages Rejected**:
   - Ensure templates comply with WhatsApp policies
   - Avoid promotional content in utility templates
   - Use clear, concise language

4. **Rate Limiting Issues**:
   - Implement proper queuing for high-volume messaging
   - Monitor rate limits in the Meta Developer Portal

## Best Practices

1. **Message Content**:
   - Keep messages concise and clear
   - Use templates for consistent communication
   - Personalize messages when possible

2. **Customer Experience**:
   - Respond to customer messages promptly
   - Use appropriate tone and language
   - Provide clear call-to-actions

3. **Technical Implementation**:
   - Implement proper error handling
   - Log all message events
   - Regularly monitor message delivery rates
   - Implement fallback notification methods

## Limitations

- WhatsApp Business API has rate limits
- Template messages require approval (can take 24-48 hours)
- Initial customer outreach limitations
- Message format restrictions

## Future Enhancements

- Advanced chatbot capabilities with NLP
- Integration with CRM systems
- Multi-language support
- Rich media message support
- Interactive buttons and list messages
- Appointment scheduling via WhatsApp

## Support Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business Platform](https://business.whatsapp.com/)

## Contributors

- Mohokare Municipality Development Team

## License

This integration is proprietary and for exclusive use by Mohokare Municipality.
