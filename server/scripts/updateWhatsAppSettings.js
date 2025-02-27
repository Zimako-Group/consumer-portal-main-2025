require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccount.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateWhatsAppSettings() {
  try {
    console.log('Updating WhatsApp settings in Firestore...');
    
    // Get values from environment variables
    const settings = {
      enabled: true,
      apiUrl: process.env.WHATSAPP_API_URL,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
      webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      webhookUrl: 'https://your-server-url.com/api/whatsapp/webhook', // Update this with your actual webhook URL
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Update settings in Firestore
    await db.collection('settings').doc('whatsapp').set(settings, { merge: true });
    
    console.log('WhatsApp settings updated successfully!');
    console.log('Settings:', {
      ...settings,
      accessToken: '********' // Hide token for security
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    process.exit(1);
  }
}

updateWhatsAppSettings();
