# Bulk Email Setup Guide

This guide will help you set up the bulk email functionality using Resend.

## Prerequisites

1. **Resend Account**: Sign up for a free account at [resend.com](https://resend.com)
2. **API Key**: Generate an API key from your Resend dashboard
3. **Domain Verification**: Verify your sending domain (optional but recommended)

## Setup Steps

### 1. Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and sign up or log in
2. Navigate to the API Keys section in your dashboard
3. Click "Create API Key"
4. Give it a name (e.g., "Zimako Consumer Portal")
5. Copy the generated API key

### 2. Configure Environment Variables

Add the following environment variable to your `.env` file:

```env
VITE_RESEND_API_KEY=your_resend_api_key_here
```

**Important**: Replace `your_resend_api_key_here` with your actual Resend API key.

### 3. Domain Setup (Recommended)

For better deliverability, set up a custom domain:

1. In your Resend dashboard, go to "Domains"
2. Add your domain (e.g., `zimako.co.za`)
3. Follow the DNS configuration instructions
4. Update the `from` field in the email service to use your domain

### 4. Testing

1. Start your development server: `npm start`
2. Navigate to the Bulk Email Dashboard
3. Select a few test customers
4. Send a test email to verify everything works

## Features

The bulk email system includes:

- **Template Management**: Pre-built templates for statement notifications and payment reminders
- **Customer Selection**: Filter and select customers by status
- **Personalization**: Automatic replacement of placeholders like {{customerName}}
- **Batch Processing**: Emails are sent in batches to respect rate limits
- **Error Handling**: Detailed error reporting and retry logic
- **Progress Tracking**: Real-time feedback on email sending progress

## Email Templates

### Statement Notification Template
- **Purpose**: Notify customers that their monthly statement is ready
- **Link**: Directs customers to the statement download portal
- **Placeholders**: {{customerName}}, {{currentMonth}}

### Payment Reminder Template
- **Purpose**: Remind customers about outstanding balances
- **Placeholders**: {{customerName}}, {{accountNumber}}, {{outstandingAmount}}

### Custom Template
- **Purpose**: Send custom messages to customers
- **Fully customizable**: Subject and content can be modified

## Rate Limits

Resend has the following rate limits:
- **Free Plan**: 100 emails/day, 3,000 emails/month
- **Pro Plan**: 50,000 emails/month
- **Enterprise**: Custom limits

The system automatically batches emails and adds delays to respect these limits.

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check that `VITE_RESEND_API_KEY` is set in your `.env` file
   - Restart your development server after adding the environment variable

2. **"Failed to send emails"**
   - Verify your API key is correct
   - Check that you haven't exceeded your rate limits
   - Ensure recipient email addresses are valid

3. **Emails not being delivered**
   - Check your Resend dashboard for delivery status
   - Verify your domain is properly configured
   - Check spam folders

### Debug Mode

To enable debug logging, add this to your `.env` file:
```env
REACT_APP_DEBUG_EMAIL=true
```

This will log detailed information about email sending to the browser console.

## Security Notes

- Never commit your API key to version control
- Use environment variables for all sensitive configuration
- Consider using different API keys for development and production
- Regularly rotate your API keys for security

## Support

For issues with:
- **Resend API**: Check [Resend documentation](https://resend.com/docs)
- **This implementation**: Check the console for error messages and refer to the email service logs
