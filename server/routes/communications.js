const express = require('express');
const router = express.Router();
const axios = require('axios');

// Helper function to format phone number
const formatPhoneNumber = (phoneNumber) => {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith('27')) {
    // Remove leading 0 if present
    cleaned = cleaned.replace(/^0/, '');
    // Add 27 prefix
    cleaned = '27' + cleaned;
  }
  
  return cleaned;
};

// Send SMS route
router.post('/send-sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const finalPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log('Sending SMS to:', finalPhoneNumber);
    console.log('Using Infobip URL:', process.env.INFOBIP_BASE_URL);

    // Send SMS using Infobip
    const response = await axios({
      method: 'POST',
      url: `https://${process.env.INFOBIP_BASE_URL}/sms/2/text/single`,
      headers: {
        'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        to: finalPhoneNumber,
        text: message
      }
    });

    console.log('Infobip response:', response.data);

    if (response.data && response.data.messages && response.data.messages[0]) {
      res.json({ 
        success: true, 
        messageId: response.data.messages[0].messageId,
        status: response.data.messages[0].status.name 
      });
    } else {
      throw new Error('Message not accepted by Infobip');
    }
  } catch (error) {
    console.error('Error sending SMS:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.response?.data || error.message 
    });
  }
});

// Send Email route
router.post('/send-email', async (req, res) => {
  try {
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject and message are required' });
    }

    // Send Email using Infobip
    const response = await axios({
      method: 'POST',
      url: `${process.env.INFOBIP_BASE_URL}/email/3/send`,
      headers: {
        'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        to: email,
        subject: subject,
        text: message
      }
    });

    res.json({ 
      success: true,
      messageId: response.data.messageId 
    });
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.response?.data || error.message 
    });
  }
});

// Send WhatsApp route
router.post('/send-whatsapp', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const finalPhoneNumber = formatPhoneNumber(phoneNumber);

    // Send WhatsApp message using Infobip
    const response = await axios({
      method: 'POST',
      url: `${process.env.INFOBIP_BASE_URL}/whatsapp/1/message/text`,
      headers: {
        'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: {
        to: finalPhoneNumber,
        content: {
          text: message
        }
      }
    });

    res.json({ 
      success: true,
      messageId: response.data.messageId 
    });
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to send WhatsApp message',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;
