require('dotenv').config();
const fetch = require('node-fetch');

/**
 * This script sends a test message using the WhatsApp Business API
 * Usage: node sendTestWhatsAppMessage.js <phone_number>
 * Example: node sendTestWhatsAppMessage.js 27123456789
 */

// Get the phone number from command line arguments
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Please provide a phone number as an argument');
  console.error('Usage: node sendTestWhatsAppMessage.js <phone_number>');
  console.error('Example: node sendTestWhatsAppMessage.js 27123456789');
  process.exit(1);
}

// Configuration from environment variables
const apiUrl = process.env.WHATSAPP_API_URL;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

// Format the phone number for WhatsApp API
const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
  ? phoneNumber 
  : `whatsapp:${phoneNumber}`;

// Message content
const message = 'This is a test message from the Mohokare Consumer Portal WhatsApp integration.';

async function sendWhatsAppMessage() {
  try {
    console.log('=== WhatsApp Test Message ===');
    console.log(`Sending to: ${formattedPhoneNumber}`);
    console.log(`Message: ${message}`);
    console.log('===========================\n');
    
    const url = `${apiUrl}/${phoneNumberId}/messages`;
    
    const requestBody = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhoneNumber,
      type: 'text',
      text: {
        body: message
      }
    };
    
    console.log('Sending request to WhatsApp API...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Message sent successfully!');
      console.log(`Message ID: ${responseData.messages?.[0]?.id}`);
    } else {
      console.log('\n❌ Failed to send message!');
      console.log('Error:', responseData.error?.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

sendWhatsAppMessage();
