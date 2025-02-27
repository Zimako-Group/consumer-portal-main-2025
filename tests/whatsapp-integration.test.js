const axios = require('axios');
const { describe, it, expect, beforeEach, afterEach, jest: jestGlobal } = require('@jest/globals');
const MockAdapter = require('axios-mock-adapter');

// Import the services to test
const whatsAppService = require('../src/services/whatsapp/whatsappService');
const whatsAppNotificationService = require('../src/services/whatsapp/whatsappNotificationService');

// Create a mock for axios
const mock = new MockAdapter(axios);

describe('WhatsApp Integration Tests', () => {
  beforeEach(() => {
    // Reset the mock before each test
    mock.reset();
    
    // Mock environment variables
    process.env.WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';
    process.env.WHATSAPP_ACCESS_TOKEN = 'test_token';
  });
  
  afterEach(() => {
    // Clear all mocks after each test
    jestGlobal.clearAllMocks();
  });
  
  describe('WhatsApp Service', () => {
    it('should send a text message successfully', async () => {
      // Mock the API response
      mock.onPost(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`).reply(200, {
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'message_id' }]
      });
      
      // Call the service
      const result = await whatsAppService.sendTextMessage('whatsapp:27123456789', 'Test message');
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('message_id');
      
      // Verify the request
      expect(mock.history.post.length).toBe(1);
      const requestData = JSON.parse(mock.history.post[0].data);
      expect(requestData.to).toBe('27123456789');
      expect(requestData.type).toBe('text');
      expect(requestData.text.body).toBe('Test message');
    });
    
    it('should send a template message successfully', async () => {
      // Mock the API response
      mock.onPost(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`).reply(200, {
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'template_message_id' }]
      });
      
      // Call the service
      const result = await whatsAppService.sendTemplateMessage(
        'whatsapp:27123456789',
        'payment_reminder',
        ['John Doe', 'ACC123', '500.00', '2025-03-01']
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('template_message_id');
      
      // Verify the request
      expect(mock.history.post.length).toBe(1);
      const requestData = JSON.parse(mock.history.post[0].data);
      expect(requestData.to).toBe('27123456789');
      expect(requestData.type).toBe('template');
      expect(requestData.template.name).toBe('payment_reminder');
      expect(requestData.template.components).toBeDefined();
      expect(requestData.template.components[0].type).toBe('body');
      expect(requestData.template.components[0].parameters).toHaveLength(4);
    });
    
    it('should handle API errors when sending messages', async () => {
      // Mock the API error response
      mock.onPost(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`).reply(400, {
        error: {
          message: 'Invalid phone number',
          type: 'OAuthException',
          code: 100
        }
      });
      
      // Call the service and expect it to throw
      await expect(whatsAppService.sendTextMessage('whatsapp:invalid', 'Test message'))
        .rejects.toThrow();
      
      // Verify the request was made
      expect(mock.history.post.length).toBe(1);
    });
    
    it('should get message status successfully', async () => {
      // Mock the API response
      mock.onGet(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages/message_id`).reply(200, {
        messaging_product: 'whatsapp',
        id: 'message_id',
        status: 'delivered'
      });
      
      // Call the service
      const result = await whatsAppService.getMessageStatus('message_id');
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.id).toBe('message_id');
      expect(result.status).toBe('delivered');
      
      // Verify the request
      expect(mock.history.get.length).toBe(1);
    });
  });
  
  describe('WhatsApp Notification Service', () => {
    it('should send a payment reminder successfully', async () => {
      // Spy on the sendTemplateMessage method
      const sendTemplateSpy = jest.spyOn(whatsAppService, 'sendTemplateMessage').mockResolvedValue({
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'template_message_id' }]
      });
      
      // Call the notification service
      const result = await whatsAppNotificationService.sendPaymentReminder(
        '27123456789',
        'John Doe',
        'ACC123',
        500.00,
        new Date('2025-03-01')
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('template_message_id');
      
      // Verify the sendTemplateMessage was called with correct parameters
      expect(sendTemplateSpy).toHaveBeenCalledWith(
        'whatsapp:27123456789',
        'payment_reminder',
        expect.arrayContaining(['John Doe', 'ACC123', '500.00'])
      );
    });
    
    it('should send a statement notification successfully', async () => {
      // Spy on the sendTemplateMessage method
      const sendTemplateSpy = jest.spyOn(whatsAppService, 'sendTemplateMessage').mockResolvedValue({
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'template_message_id' }]
      });
      
      // Call the notification service
      const result = await whatsAppNotificationService.sendStatementNotification(
        '27123456789',
        'John Doe',
        'ACC123',
        new Date('2025-02-01'),
        'https://example.com/statement'
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('template_message_id');
      
      // Verify the sendTemplateMessage was called with correct parameters
      expect(sendTemplateSpy).toHaveBeenCalledWith(
        'whatsapp:27123456789',
        'statement_notification',
        expect.arrayContaining(['John Doe', 'ACC123', expect.any(String), 'https://example.com/statement'])
      );
    });
    
    it('should send a payment confirmation successfully', async () => {
      // Spy on the sendTemplateMessage method
      const sendTemplateSpy = jest.spyOn(whatsAppService, 'sendTemplateMessage').mockResolvedValue({
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'template_message_id' }]
      });
      
      // Call the notification service
      const result = await whatsAppNotificationService.sendPaymentConfirmation(
        '27123456789',
        'John Doe',
        'ACC123',
        500.00,
        new Date('2025-02-15'),
        'REC12345'
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('template_message_id');
      
      // Verify the sendTemplateMessage was called with correct parameters
      expect(sendTemplateSpy).toHaveBeenCalledWith(
        'whatsapp:27123456789',
        'payment_confirmation',
        expect.arrayContaining(['John Doe', 'ACC123', '500.00', expect.any(String), 'REC12345'])
      );
    });
    
    it('should send a service interruption notification successfully', async () => {
      // Spy on the sendTemplateMessage method
      const sendTemplateSpy = jest.spyOn(whatsAppService, 'sendTemplateMessage').mockResolvedValue({
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '27123456789' }],
        messages: [{ id: 'template_message_id' }]
      });
      
      // Call the notification service
      const result = await whatsAppNotificationService.sendServiceInterruptionNotification(
        '27123456789',
        'Central District',
        'Water',
        new Date('2025-03-10T08:00:00'),
        new Date('2025-03-10T16:00:00'),
        'Scheduled maintenance'
      );
      
      // Assertions
      expect(result).toBeDefined();
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].id).toBe('template_message_id');
      
      // Verify the sendTemplateMessage was called with correct parameters
      expect(sendTemplateSpy).toHaveBeenCalledWith(
        'whatsapp:27123456789',
        'service_interruption',
        expect.arrayContaining(['Water', 'Central District', expect.any(String), expect.any(String), 'Scheduled maintenance'])
      );
    });
    
    it('should handle errors when sending notifications', async () => {
      // Spy on the sendTemplateMessage method and make it throw an error
      jest.spyOn(whatsAppService, 'sendTemplateMessage').mockRejectedValue(new Error('API Error'));
      
      // Call the notification service and expect it to throw
      await expect(whatsAppNotificationService.sendPaymentReminder(
        '27123456789',
        'John Doe',
        'ACC123',
        500.00,
        new Date('2025-03-01')
      )).rejects.toThrow('API Error');
    });
  });
  
  describe('Webhook Handling', () => {
    // These tests would typically be integration tests against your server
    // Here we're just providing a basic structure
    
    it('should verify webhook challenge correctly', () => {
      // This would test your webhook verification logic
      // Typically involves checking the hub.verify_token and responding with hub.challenge
    });
    
    it('should process incoming messages correctly', () => {
      // This would test your webhook message handling logic
      // Involves parsing the incoming message and storing it in your database
    });
    
    it('should process message status updates correctly', () => {
      // This would test your webhook status update handling
      // Involves updating the message status in your database
    });
  });
});
