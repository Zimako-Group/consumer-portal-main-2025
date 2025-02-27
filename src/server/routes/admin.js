const express = require('express');
const router = express.Router();
const { authenticateUser, requireAdmin } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Middleware to ensure only admins can access these routes
router.use(authenticateUser, requireAdmin);

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

module.exports = router;
