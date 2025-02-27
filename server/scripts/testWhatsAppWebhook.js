require('dotenv').config();
const fetch = require('node-fetch');

/**
 * This script simulates a webhook verification request from Meta
 * and tests the webhook endpoint for receiving messages.
 */

// Configuration
const SERVER_URL = 'http://localhost:3000'; // Change this to your actual server URL
const WEBHOOK_PATH = '/api/whatsapp/webhook';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// Test webhook verification
async function testWebhookVerification() {
  try {
    console.log('Testing webhook verification...');
    
    const url = `${SERVER_URL}${WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE_ACCEPTED`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
    
    if (response.status === 200 && text === 'CHALLENGE_ACCEPTED') {
      console.log('✅ Webhook verification test passed!');
    } else {
      console.log('❌ Webhook verification test failed!');
    }
    
    return response.status === 200;
  } catch (error) {
    console.error('Error testing webhook verification:', error);
    return false;
  }
}

// Test webhook message receiving
async function testWebhookMessageReceiving() {
  try {
    console.log('\nTesting webhook message receiving...');
    
    // Simulate a WhatsApp message webhook payload
    const payload = {
      object: 'whatsapp_business_account',
      entry: [{
        id: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '+1234567890',
              phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
            },
            contacts: [{
              profile: {
                name: 'Test User'
              },
              wa_id: '27123456789'
            }],
            messages: [{
              from: '27123456789',
              id: 'test-message-id-' + Date.now(),
              timestamp: Math.floor(Date.now() / 1000),
              text: {
                body: 'This is a test message from the webhook test script'
              },
              type: 'text'
            }]
          }
        }]
      }]
    };
    
    const response = await fetch(`${SERVER_URL}${WEBHOOK_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);
    
    if (response.status === 200 && text === 'EVENT_RECEIVED') {
      console.log('✅ Webhook message receiving test passed!');
    } else {
      console.log('❌ Webhook message receiving test failed!');
    }
    
    return response.status === 200;
  } catch (error) {
    console.error('Error testing webhook message receiving:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('=== WhatsApp Webhook Test ===');
  console.log(`Server URL: ${SERVER_URL}`);
  console.log(`Webhook Path: ${WEBHOOK_PATH}`);
  console.log(`Verify Token: ${VERIFY_TOKEN}`);
  console.log('===========================\n');
  
  const verificationPassed = await testWebhookVerification();
  
  if (verificationPassed) {
    await testWebhookMessageReceiving();
  }
  
  console.log('\n=== Test Summary ===');
  console.log('Make sure to check your server logs for more details.');
  console.log('If the tests passed, your webhook is configured correctly.');
  console.log('If the tests failed, check the troubleshooting section in the WhatsApp-Webhook-Setup.md file.');
}

runTests();
