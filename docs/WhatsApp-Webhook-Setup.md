# WhatsApp Webhook Setup Guide

This guide will walk you through setting up a webhook for the WhatsApp Business API integration in the Mohokare Consumer Portal.

## Prerequisites

1. A Meta Developer account
2. A WhatsApp Business Account
3. A WhatsApp Business API phone number
4. A publicly accessible server URL (for production)

## Step 1: Configure Your Server

The server is already configured to handle webhook requests. The webhook endpoints are:

- **Verification Endpoint**: `GET /api/whatsapp/webhook`
- **Message Receiving Endpoint**: `POST /api/whatsapp/webhook`

Make sure your server is running and accessible from the internet. For local development, you can use a service like ngrok to expose your local server.

## Step 2: Set Up Webhook in Meta Developer Dashboard

1. Log in to the [Meta Developer Dashboard](https://developers.facebook.com/)
2. Navigate to your WhatsApp Business App
3. Go to **WhatsApp** > **Configuration** in the left sidebar
4. Scroll down to the **Webhook** section

![WhatsApp Webhook Configuration](https://i.imgur.com/example1.png)

5. In the **Webhook** section, enter the following:
   - **Callback URL**: Your server URL followed by `/api/whatsapp/webhook` (e.g., `https://your-server.com/api/whatsapp/webhook`)
   - **Verify Token**: `mohokare_whatsapp_webhook_verify_token` (this should match the value in your server's .env file)

![Webhook Configuration Fields](https://i.imgur.com/example2.png)

6. Click **Verify and Save**

## Step 3: Subscribe to Webhook Events

1. After verifying your webhook, click on **Manage** next to the webhook section
2. Check the following events to subscribe to:
   - `messages`
   - `message_status_updates`
   - `message_template_status_updates`

![Subscribe to Webhook Events](https://i.imgur.com/example3.png)

3. Click **Save** to confirm your subscription

## Step 4: Test the Webhook

1. Send a test message to your WhatsApp Business phone number
2. Check your server logs to verify that the webhook is receiving the message:

```
Received webhook message
Processing WhatsApp message...
Incoming message from: +1234567890
Message content: Hello, this is a test
```

3. Verify that the message is being stored in your Firestore database by checking the `whatsappMessages` collection

## Step 5: Configure WhatsApp Settings in Firestore

The server includes a script to update WhatsApp settings in Firestore. Run the script with:

```bash
cd server
node scripts/updateWhatsAppSettings.js
```

This will create or update a document in the `settings` collection with the WhatsApp configuration from your .env file.

## Troubleshooting

### Webhook Verification Issues

If you're having trouble verifying your webhook:

1. **Server Accessibility**: Make sure your server is publicly accessible. The Meta servers need to be able to reach your endpoint.
   - For local development, use ngrok: `ngrok http 3000`
   - Use the ngrok URL as your webhook URL (e.g., `https://a1b2c3d4.ngrok.io/api/whatsapp/webhook`)

2. **Verify Token Mismatch**: Check that the verify token in your server's .env file matches the one you entered in the Meta Developer Dashboard.

3. **Server Response**: Your server must respond with the challenge code sent by Meta during verification. Check your server logs for any errors.

4. **HTTPS Required**: Meta requires HTTPS for webhooks. Make sure your URL starts with `https://`.

### Message Receiving Issues

If you're not receiving messages:

1. **Webhook Subscription**: Verify that you've subscribed to the correct webhook events.

2. **Server Errors**: Check your server logs for any errors when processing webhook events.

3. **Firestore Permissions**: Ensure your Firebase service account has the necessary permissions to write to Firestore.

## Local Development with ngrok

For local development, use ngrok to expose your local server to the internet:

1. Install ngrok globally:
   ```bash
   npm install -g ngrok
   ```

2. Start your server:
   ```bash
   cd server
   node server.js
   ```

3. In a new terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the HTTPS URL provided by ngrok (e.g., `https://a1b2c3d4.ngrok.io`)

5. Use this URL as your webhook URL in the Meta Developer Dashboard:
   ```
   https://a1b2c3d4.ngrok.io/api/whatsapp/webhook
   ```

6. Complete the webhook verification process as described above

**Note**: The ngrok URL changes each time you restart ngrok, so you'll need to update the webhook URL in the Meta Developer Dashboard whenever you restart ngrok.

## Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/api/webhooks)
- [Meta Webhook Guide](https://developers.facebook.com/docs/graph-api/webhooks/getting-started)
- [ngrok Documentation](https://ngrok.com/docs)
