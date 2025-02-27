require('dotenv').config();
const fetch = require('node-fetch');

/**
 * This script registers the webhook with the WhatsApp Business API
 * It sets up the webhook URL and subscribes to the necessary fields
 */

// Configuration from environment variables
const apiUrl = process.env.WHATSAPP_API_URL;
const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Get the webhook URL from command line arguments or use default
const webhookUrl = process.argv[2] || 'https://your-ngrok-url.ngrok.io/api/whatsapp/webhook';

async function registerWebhook() {
  try {
    console.log('=== WhatsApp Webhook Registration ===');
    console.log(`Business Account ID: ${businessAccountId}`);
    console.log(`Webhook URL: ${webhookUrl}`);
    console.log(`Verify Token: ${verifyToken}`);
    console.log('===================================\n');
    
    // Construct the API URL for webhook registration
    const url = `${apiUrl}/${businessAccountId}/subscribed_apps`;
    
    console.log('Registering webhook with WhatsApp Business API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        access_token: accessToken,
        callback_url: webhookUrl,
        verify_token: verifyToken,
        fields: [
          'messages',
          'message_deliveries',
          'message_reads',
          'message_templates'
        ]
      })
    });
    
    const responseData = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Webhook registered successfully!');
      console.log('Your webhook is now configured to receive WhatsApp messages and events.');
    } else {
      console.log('\n❌ Failed to register webhook!');
      console.log('Error:', responseData.error?.message || 'Unknown error');
      console.log('\nTroubleshooting:');
      console.log('1. Make sure your webhook URL is publicly accessible');
      console.log('2. Check that your access token is valid');
      console.log('3. Verify that your Business Account ID is correct');
      console.log('4. Ensure your webhook URL is using HTTPS');
    }
  } catch (error) {
    console.error('Error registering webhook:', error);
  }
}

// Check webhook status
async function checkWebhookStatus() {
  try {
    console.log('\nChecking current webhook status...');
    
    const url = `${apiUrl}/${businessAccountId}/subscribed_apps`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const responseData = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (response.ok && responseData.data && responseData.data.length > 0) {
      console.log('\n✅ Webhook is already registered!');
      console.log('Current webhook configuration:');
      console.log(`URL: ${responseData.data[0].callback_url}`);
      console.log(`Fields: ${responseData.data[0].fields.join(', ')}`);
      
      return true;
    } else {
      console.log('\n❌ No webhook currently registered or unable to fetch status.');
      return false;
    }
  } catch (error) {
    console.error('Error checking webhook status:', error);
    return false;
  }
}

// Main function
async function main() {
  const isRegistered = await checkWebhookStatus();
  
  if (!isRegistered) {
    console.log('\nProceeding with webhook registration...');
    await registerWebhook();
  } else {
    console.log('\nWould you like to update the existing webhook? (Y/N)');
    console.log('To update, run this script again with the --force flag:');
    console.log(`node registerWhatsAppWebhook.js ${webhookUrl} --force`);
    
    if (process.argv.includes('--force')) {
      console.log('\nForce flag detected. Updating webhook...');
      await registerWebhook();
    }
  }
}

main();
