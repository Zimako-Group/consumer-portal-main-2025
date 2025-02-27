# Mohokare Consumer Portal - WhatsApp Integration

This document provides a comprehensive guide to the WhatsApp Business API integration in the Mohokare Consumer Portal.

## Overview

The WhatsApp integration allows the Mohokare Consumer Portal to send and receive messages via WhatsApp, enabling direct communication with consumers through one of the most popular messaging platforms in South Africa.

## Features

- Two-way messaging with consumers
- Message status tracking (sent, delivered, read)
- Template message support
- Media message support (images, documents, etc.)
- Analytics and reporting
- Webhook integration for real-time updates

## Architecture

The WhatsApp integration consists of the following components:

1. **Frontend Components**
   - WhatsApp Dashboard
   - WhatsApp Analytics
   - WhatsApp Setup Guide

2. **Backend Components**
   - Webhook endpoints
   - Message sending API
   - Message processing logic
   - Firestore integration for message storage

3. **External Services**
   - Meta WhatsApp Business API
   - Firestore Database

## Setup and Configuration

### Prerequisites

- Meta Developer Account
- WhatsApp Business Account
- WhatsApp Business API access
- Approved message templates (for template messaging)
- Publicly accessible webhook URL (for production)

### Environment Variables

The following environment variables are required for the WhatsApp integration:

```
WHATSAPP_API_URL=https://graph.facebook.com/v19.0
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
```

### Webhook Setup

1. Follow the instructions in [WhatsApp-Webhook-Setup.md](./WhatsApp-Webhook-Setup.md) to set up the webhook.
2. Register your webhook with the WhatsApp Business API using the `registerWhatsAppWebhook.js` script.

## Usage

### Testing the Integration

1. Test the webhook using the `testWhatsAppWebhook.js` script:
   ```
   npm run whatsapp:test
   ```

2. Send a test message using the `sendTestWhatsAppMessage.js` script:
   ```
   npm run whatsapp:send 27123456789
   ```

3. Monitor WhatsApp events in real-time using the `monitorWhatsAppEvents.js` script:
   ```
   npm run whatsapp:monitor
   ```

### Frontend Components

#### WhatsApp Dashboard

The WhatsApp Dashboard provides a comprehensive interface for managing WhatsApp communications. It includes:

- Message history
- Message sending interface
- Template message selection
- Media message support
- Contact management

#### WhatsApp Analytics

The WhatsApp Analytics component provides insights into WhatsApp communications, including:

- Message volume trends
- Response time metrics
- Message status distribution
- Template message performance
- User engagement metrics

#### WhatsApp Setup Guide

The WhatsApp Setup Guide provides step-by-step instructions for setting up the WhatsApp Business API integration, including:

- Account creation
- API access setup
- Webhook configuration
- Template message approval
- Testing and validation

## API Reference

### Sending a Message

```javascript
const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await axios.post('/api/whatsapp/send', {
      to,
      message
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};
```

### Sending a Template Message

```javascript
const sendWhatsAppTemplateMessage = async (to, templateName, parameters) => {
  try {
    const response = await axios.post('/api/whatsapp/send-template', {
      to,
      templateName,
      parameters
    });
    return response.data;
  } catch (error) {
    console.error('Error sending WhatsApp template message:', error);
    throw error;
  }
};
```

## Firestore Schema

### WhatsApp Messages Collection

```javascript
{
  id: 'message_id',
  from: 'phone_number',
  to: 'phone_number',
  body: 'message_text',
  type: 'text|image|document|template',
  timestamp: Timestamp,
  status: 'sent|delivered|read|failed',
  metadata: {
    // Additional message metadata
  }
}
```

### WhatsApp Templates Collection

```javascript
{
  id: 'template_id',
  name: 'template_name',
  category: 'MARKETING|UTILITY|AUTHENTICATION',
  components: [
    {
      type: 'HEADER|BODY|FOOTER|BUTTONS',
      text: 'component_text',
      parameters: [
        // Parameter placeholders
      ]
    }
  ],
  status: 'APPROVED|PENDING|REJECTED',
  language: 'en_US',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Troubleshooting

### Common Issues

1. **Webhook Verification Fails**
   - Check that the verify token matches the one in your environment variables
   - Ensure your webhook URL is publicly accessible
   - Verify that your server is running and the webhook endpoint is correctly implemented

2. **Messages Not Being Sent**
   - Check your WhatsApp Business API access token
   - Verify that your phone number ID is correct
   - Ensure that your WhatsApp Business Account is active
   - Check for rate limiting issues

3. **Template Messages Not Working**
   - Ensure that your template is approved
   - Verify that you're using the correct template name
   - Check that your parameters match the template placeholders

## Best Practices

1. **Rate Limiting**
   - Implement rate limiting to avoid hitting WhatsApp API limits
   - Use exponential backoff for retries

2. **Error Handling**
   - Implement comprehensive error handling
   - Log all API errors for troubleshooting

3. **Security**
   - Secure your webhook endpoint
   - Validate all incoming webhook requests
   - Store sensitive information in environment variables

4. **Performance**
   - Implement message queuing for high-volume scenarios
   - Use asynchronous processing for webhook events

## References

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/api/reference)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business Platform](https://business.whatsapp.com/)

## Support

For support with the WhatsApp integration, please contact the Mohokare Municipality development team.

## License

This project is licensed under the terms of the Mohokare Municipality license.
