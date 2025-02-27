const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const { WhatsAppService } = require('../../src/services/whatsapp/whatsappService');

// Middleware to ensure only admins can access these routes
router.use(requireAdmin);

// Update WhatsApp settings and environment variables
router.post('/update-whatsapp-settings', async (req, res) => {
  try {
    const { phoneNumberId, businessAccountId, accessToken, webhookVerifyToken } = req.body;
    
    // Validate required fields
    if (!phoneNumberId || !businessAccountId || !accessToken || !webhookVerifyToken) {
      return res.status(400).json({ error: 'Missing required WhatsApp settings' });
    }
    
    // In production, you might want to use a more secure method to update environment variables
    // This is a simplified example for development purposes
    
    // Read the current .env file
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent;
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      // If .env doesn't exist, create an empty one
      envContent = '';
    }
    
    // Parse existing variables
    const envConfig = dotenv.parse(envContent);
    
    // Update WhatsApp-related variables
    envConfig.VITE_WHATSAPP_PHONE_NUMBER_ID = phoneNumberId;
    envConfig.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID = businessAccountId;
    envConfig.VITE_WHATSAPP_ACCESS_TOKEN = accessToken;
    envConfig.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN = webhookVerifyToken;
    
    // Convert back to .env format
    const newEnvContent = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Write back to .env file
    await fs.writeFile(envPath, newEnvContent);
    
    // Update process.env variables for the current session
    process.env.VITE_WHATSAPP_PHONE_NUMBER_ID = phoneNumberId;
    process.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID = businessAccountId;
    process.env.VITE_WHATSAPP_ACCESS_TOKEN = accessToken;
    process.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN = webhookVerifyToken;
    
    res.status(200).json({ message: 'WhatsApp settings updated successfully' });
  } catch (error) {
    console.error('Error updating WhatsApp settings:', error);
    res.status(500).json({ error: 'Failed to update WhatsApp settings' });
  }
});

// Get system status
router.get('/system-status', (req, res) => {
  // This would typically gather information about the system
  const status = {
    serverUptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    whatsappIntegration: {
      enabled: !!process.env.VITE_WHATSAPP_ACCESS_TOKEN,
      phoneNumberConfigured: !!process.env.VITE_WHATSAPP_PHONE_NUMBER_ID
    }
  };
  
  res.json(status);
});

// WhatsApp Analytics
router.get('/whatsapp/analytics', requireAdmin, async (req, res) => {
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
router.get('/whatsapp/templates', requireAdmin, async (req, res) => {
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
router.post('/whatsapp/bulk-message', requireAdmin, async (req, res) => {
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
