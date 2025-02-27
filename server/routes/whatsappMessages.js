const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const db = admin.firestore();

// Send a WhatsApp message
router.post('/send', async (req, res) => {
  try {
    const { to, message, template, components } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Recipient phone number is required' });
    }
    
    // Get WhatsApp settings from Firestore
    const settingsDoc = await db.collection('settings').doc('whatsapp').get();
    
    if (!settingsDoc.exists) {
      return res.status(400).json({ error: 'WhatsApp settings not configured' });
    }
    
    const settings = settingsDoc.data();
    
    if (!settings.enabled) {
      return res.status(400).json({ error: 'WhatsApp integration is disabled' });
    }
    
    const accessToken = settings.accessToken;
    const phoneNumberId = settings.phoneNumberId;
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    // Format the phone number for WhatsApp API
    const formattedPhoneNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    let requestBody;
    
    if (template) {
      // Template message
      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhoneNumber,
        type: 'template',
        template: {
          name: template,
          language: {
            code: 'en'
          },
          components: components || []
        }
      };
    } else {
      // Text message
      requestBody = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const responseData = await response.json();
    
    if (response.ok) {
      // Log the message to Firestore
      await db.collection('whatsappMessages').add({
        type: 'outbound',
        recipient: formattedPhoneNumber,
        content: message || `Template: ${template}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        messageId: responseData.messages?.[0]?.id || null,
        isTemplate: !!template,
        templateData: template ? { name: template, components } : null
      });
      
      res.status(200).json(responseData);
    } else {
      console.error('WhatsApp API error:', responseData);
      res.status(response.status).json(responseData);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get WhatsApp message history
router.get('/history', async (req, res) => {
  try {
    const { phoneNumber, limit = 20, startAfter } = req.query;
    
    let messagesQuery = db.collection('whatsappMessages')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));
    
    if (phoneNumber) {
      messagesQuery = messagesQuery.where('recipient', '==', `whatsapp:${phoneNumber}`)
        .where('sender', '==', `whatsapp:${phoneNumber}`);
    }
    
    if (startAfter) {
      const startAfterDoc = await db.collection('whatsappMessages').doc(startAfter).get();
      if (startAfterDoc.exists) {
        messagesQuery = messagesQuery.startAfter(startAfterDoc);
      }
    }
    
    const snapshot = await messagesQuery.get();
    
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.status(200).json({
      messages,
      lastVisible: messages.length > 0 ? messages[messages.length - 1].id : null
    });
  } catch (error) {
    console.error('Error fetching WhatsApp message history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update WhatsApp settings
router.post('/settings', async (req, res) => {
  try {
    const { 
      WHATSAPP_PHONE_NUMBER_ID, 
      WHATSAPP_BUSINESS_ACCOUNT_ID, 
      WHATSAPP_ACCESS_TOKEN, 
      WHATSAPP_WEBHOOK_VERIFY_TOKEN 
    } = req.body;
    
    // Update environment variables (in a production environment, this would be handled differently)
    process.env.WHATSAPP_PHONE_NUMBER_ID = WHATSAPP_PHONE_NUMBER_ID;
    process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = WHATSAPP_BUSINESS_ACCOUNT_ID;
    process.env.WHATSAPP_ACCESS_TOKEN = WHATSAPP_ACCESS_TOKEN;
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    res.status(200).json({ message: 'WhatsApp settings updated successfully' });
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
