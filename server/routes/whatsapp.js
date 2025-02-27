const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const db = admin.firestore();
const { WhatsAppService } = require('../../src/services/whatsapp/whatsappService');
const { requireAuth } = require('../middleware/auth');

// WhatsApp webhook verification endpoint
router.get('/webhook', (req, res) => {
  try {
    console.log('Received webhook verification request');
    
    // Parse query parameters
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Verify token from environment variable
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    console.log('Webhook verification details:', {
      mode,
      receivedToken: token,
      expectedToken: verifyToken,
      challenge
    });
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed');
      if (mode !== 'subscribe') {
        console.error('Invalid mode:', mode);
      }
      if (token !== verifyToken) {
        console.error('Token mismatch');
      }
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error('Error in webhook verification:', error);
    return res.sendStatus(500);
  }
});

// WhatsApp webhook for receiving messages
router.post('/webhook', async (req, res) => {
  try {
    console.log('Received webhook message');
    
    // Immediately respond to acknowledge receipt
    res.status(200).send('EVENT_RECEIVED');
    
    const body = req.body;
    
    // Check if this is a WhatsApp message
    if (body.object === 'whatsapp_business_account') {
      await processWhatsAppMessage(body);
    } else {
      console.log('Unknown webhook event type');
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Already sent 200 response, so just log the error
  }
});

// Process WhatsApp messages
async function processWhatsAppMessage(data) {
  try {
    const entries = data.entry || [];
    
    for (const entry of entries) {
      const changes = entry.changes || [];
      
      for (const change of changes) {
        if (change.field === 'messages') {
          const value = change.value;
          const messages = value.messages || [];
          const statuses = value.statuses || [];
          
          // Process incoming messages
          for (const message of messages) {
            await processIncomingMessage(message, value.metadata);
          }
          
          // Process message statuses
          for (const status of statuses) {
            await processMessageStatus(status);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in processWhatsAppMessage:', error);
  }
}

// Process incoming messages
async function processIncomingMessage(message, metadata) {
  try {
    const from = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);
    let content = '';
    let messageType = message.type;
    
    // Extract message content based on type
    if (messageType === 'text' && message.text) {
      content = message.text.body;
    } else if (messageType === 'interactive' && message.interactive) {
      content = JSON.stringify(message.interactive);
    } else if (messageType === 'image' && message.image) {
      content = message.image.id || 'Image received';
    } else if (messageType === 'document' && message.document) {
      content = message.document.filename || 'Document received';
    } else {
      content = `${messageType} message received`;
    }
    
    // Log the message to Firestore
    await db.collection('whatsappMessages').add({
      type: 'inbound',
      sender: from,
      content,
      messageType,
      timestamp,
      status: 'received',
      messageId,
      metadata: {
        phoneNumberId: metadata.phone_number_id,
        displayPhoneNumber: metadata.display_phone_number
      }
    });
    
    // Find customer by phone number
    const phoneNumber = from.replace('whatsapp:', '');
    const customersSnapshot = await db.collection('customers')
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();
    
    let customerData = null;
    if (!customersSnapshot.empty) {
      customerData = customersSnapshot.docs[0].data();
      customerData.id = customersSnapshot.docs[0].id;
    }
    
    // Process the message with AI chatbot
    await processWithChatbot(from, content, customerData);
    
  } catch (error) {
    console.error('Error in processIncomingMessage:', error);
  }
}

// Process message with chatbot
async function processWithChatbot(from, content, customerData) {
  try {
    // Fetch intents and responses from Firestore
    const intentsSnapshot = await db.collection('chatbotIntents').get();
    const intents = [];
    
    intentsSnapshot.forEach(doc => {
      const intentData = doc.data();
      intents.push({
        intent: doc.id,
        phrases: intentData.phrases || [],
        responses: intentData.responses || []
      });
    });
    
    // Simple intent matching (in production, this would use your AI model)
    let matchedIntent = null;
    let highestScore = 0;
    
    for (const intent of intents) {
      for (const phrase of intent.phrases) {
        // Simple matching score based on word overlap
        const contentWords = content.toLowerCase().split(/\\s+/);
        const phraseWords = phrase.toLowerCase().split(/\\s+/);
        
        const matchingWords = contentWords.filter(word => 
          phraseWords.includes(word)
        ).length;
        
        const score = matchingWords / Math.max(contentWords.length, phraseWords.length);
        
        if (score > highestScore && score > 0.3) { // Threshold of 0.3
          highestScore = score;
          matchedIntent = intent;
        }
      }
    }
    
    // Select response
    let response = "I'm not sure how to respond to that. Could you please rephrase?";
    
    if (matchedIntent && matchedIntent.responses.length > 0) {
      // Select random response from matched intent
      response = matchedIntent.responses[
        Math.floor(Math.random() * matchedIntent.responses.length)
      ];
    }
    
    // Personalize response if customer is known
    if (customerData) {
      response = response
        .replace('{customerName}', customerData.accountHolderName || 'Customer')
        .replace('{accountNumber}', customerData.accountNumber || '');
    }
    
    // Send response via WhatsApp API
    await sendWhatsAppMessage(from, response);
    
  } catch (error) {
    console.error('Error in processWithChatbot:', error);
    // Send fallback message
    await sendWhatsAppMessage(from, "I'm sorry, I'm having trouble processing your request right now. Please try again later.");
  }
}

// Process message status updates
async function processMessageStatus(status) {
  try {
    const messageId = status.id;
    const statusType = status.status;
    const timestamp = new Date(parseInt(status.timestamp) * 1000);
    
    // Update message status in Firestore
    const messagesSnapshot = await db.collection('whatsappMessages')
      .where('messageId', '==', messageId)
      .limit(1)
      .get();
    
    if (!messagesSnapshot.empty) {
      await messagesSnapshot.docs[0].ref.update({
        status: statusType,
        statusUpdatedAt: timestamp
      });
    }
  } catch (error) {
    console.error('Error in processMessageStatus:', error);
  }
}

// Send WhatsApp message
async function sendWhatsAppMessage(to, message) {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          body: message
        }
      })
    });
    
    const responseData = await response.json();
    
    // Log the outbound message
    await db.collection('whatsappMessages').add({
      type: 'outbound',
      recipient: to,
      content: message,
      timestamp: new Date(),
      status: 'sent',
      messageId: responseData.messages?.[0]?.id || null
    });
    
    return responseData;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

// WhatsApp Analytics
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const whatsappService = new WhatsAppService();
    const analytics = await whatsappService.getMessageAnalytics(days);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching WhatsApp analytics:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp analytics' });
  }
});

// WhatsApp Templates with Status
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const whatsappService = new WhatsAppService();
    const templates = await whatsappService.getMessageTemplatesWithStatus();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    res.status(500).json({ error: 'Failed to fetch WhatsApp templates' });
  }
});

// Send Bulk WhatsApp Messages
router.post('/bulk-message', requireAuth, async (req, res) => {
  try {
    const { recipients, messageType, content, templateParams } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }
    
    if (!messageType || !['text', 'template'].includes(messageType)) {
      return res.status(400).json({ error: 'Valid messageType is required (text or template)' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // For template messages, validate template parameters
    if (messageType === 'template' && !templateParams) {
      return res.status(400).json({ error: 'Template parameters are required for template messages' });
    }
    
    const whatsappService = new WhatsAppService();
    const result = await whatsappService.sendBulkMessages(recipients, messageType, content, templateParams);
    
    res.json(result);
  } catch (error) {
    console.error('Error sending bulk WhatsApp messages:', error);
    res.status(500).json({ error: 'Failed to send bulk WhatsApp messages' });
  }
});

module.exports = router;
