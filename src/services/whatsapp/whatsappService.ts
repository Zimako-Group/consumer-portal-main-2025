import axios from 'axios';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, orderBy, limit, Timestamp, DocumentData, getDoc } from 'firebase/firestore';

// Types for WhatsApp API
export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: Date | Timestamp;
  status: string;
  content: string;
  mediaUrl?: string;
  caption?: string;
  templateName?: string;
  interactiveData?: any;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  components: any[];
}

export interface WhatsAppBusinessProfile {
  about: string;
  address: string;
  description: string;
  email: string;
  websites: string[];
  vertical: string;
}

// WhatsApp Business API integration service
export class WhatsAppService {
  private apiUrl: string;
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;
  private webhookVerifyToken: string;
  private enabled: boolean;

  constructor() {
    // Load from environment variables
    this.apiUrl = import.meta.env.VITE_WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
    this.accessToken = import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '';
    this.businessAccountId = import.meta.env.VITE_WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    this.webhookVerifyToken = import.meta.env.VITE_WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
    this.enabled = false;
    
    // Refresh settings from Firestore on initialization
    this.refreshSettings();
  }
  
  // Refresh settings from Firestore
  async refreshSettings(): Promise<void> {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'whatsapp'));
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        this.enabled = settings.enabled || false;
        
        // Only update if values exist and are not empty
        if (settings.accessToken) this.accessToken = settings.accessToken;
        if (settings.phoneNumberId) this.phoneNumberId = settings.phoneNumberId;
        if (settings.businessAccountId) this.businessAccountId = settings.businessAccountId;
        if (settings.webhookVerifyToken) this.webhookVerifyToken = settings.webhookVerifyToken;
        
        console.log('WhatsApp settings refreshed from Firestore');
      }
    } catch (error) {
      console.error('Error refreshing WhatsApp settings:', error);
    }
  }
  
  // Check if WhatsApp integration is enabled
  isEnabled(): boolean {
    return this.enabled && 
           !!this.accessToken && 
           !!this.phoneNumberId && 
           !!this.businessAccountId;
  }

  // Send a text message to a customer
  async sendTextMessage(to: string, message: string): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !message) {
        throw new Error('Recipient phone number and message content are required');
      }
      
      // Format phone number if needed (remove spaces, ensure it starts with country code)
      to = this.formatPhoneNumber(to);
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            body: message
          }
        }
      });

      // Log the message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: message,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: message,
        timestamp: new Date(),
        status: 'failed',
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Send a template message (for notifications)
  async sendTemplateMessage(to: string, templateName: string, components: any[] = []): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !templateName) {
        throw new Error('Recipient phone number and template name are required');
      }
      
      // Format phone number if needed
      to = this.formatPhoneNumber(to);
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: 'en_US'
            },
            components
          }
        }
      });

      // Log the template message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Template: ${templateName}`,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null,
        templateName
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp template message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Template: ${templateName}`,
        timestamp: new Date(),
        status: 'failed',
        templateName,
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Send an image message
  async sendImageMessage(to: string, imageUrl: string, caption: string = ''): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !imageUrl) {
        throw new Error('Recipient phone number and image URL are required');
      }
      
      // Format phone number if needed
      to = this.formatPhoneNumber(to);
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: {
            link: imageUrl,
            caption
          }
        }
      });

      // Log the image message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: caption || 'Image message',
        mediaUrl: imageUrl,
        caption,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp image message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: caption || 'Image message',
        mediaUrl: imageUrl,
        caption,
        timestamp: new Date(),
        status: 'failed',
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Send a document message
  async sendDocumentMessage(to: string, documentUrl: string, filename: string, caption: string = ''): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !documentUrl || !filename) {
        throw new Error('Recipient phone number, document URL, and filename are required');
      }
      
      // Format phone number if needed
      to = this.formatPhoneNumber(to);
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'document',
          document: {
            link: documentUrl,
            filename,
            caption
          }
        }
      });

      // Log the document message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: filename,
        mediaUrl: documentUrl,
        caption,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp document message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: filename,
        mediaUrl: documentUrl,
        caption,
        timestamp: new Date(),
        status: 'failed',
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Send an interactive message with buttons
  async sendButtonMessage(to: string, bodyText: string, buttons: { id: string, title: string }[]): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !bodyText || !buttons || buttons.length === 0) {
        throw new Error('Recipient, body text, and at least one button are required');
      }
      
      // Format phone number if needed
      to = this.formatPhoneNumber(to);
      
      // WhatsApp limits to 3 buttons max
      const limitedButtons = buttons.slice(0, 3).map(button => ({
        type: 'reply',
        reply: {
          id: button.id,
          title: button.title
        }
      }));
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: bodyText
            },
            action: {
              buttons: limitedButtons
            }
          }
        }
      });

      // Log the interactive message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Interactive button message: ${bodyText}`,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null,
        interactive: true,
        buttonCount: limitedButtons.length
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp interactive button message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Interactive button message: ${bodyText}`,
        timestamp: new Date(),
        status: 'failed',
        interactive: true,
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Send a list message
  async sendListMessage(to: string, bodyText: string, buttonText: string, sections: Array<{
    title: string,
    rows: Array<{ id: string, title: string, description?: string }>
  }>): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!to || !bodyText || !buttonText || !sections || sections.length === 0) {
        throw new Error('Recipient, body text, button text, and at least one section are required');
      }
      
      // Format phone number if needed
      to = this.formatPhoneNumber(to);
      
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/messages`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: bodyText
            },
            action: {
              button: buttonText,
              sections
            }
          }
        }
      });

      // Log the list message to Firestore
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Interactive list message: ${bodyText}`,
        timestamp: new Date(),
        status: 'sent',
        messageId: response.data?.messages?.[0]?.id || null,
        interactive: true,
        listType: true
      });

      return response.data;
    } catch (error: any) {
      console.error('Error sending WhatsApp list message:', error);
      
      // Log the failed message attempt
      await this.logMessage({
        type: 'outbound',
        recipient: to,
        content: `Interactive list message: ${bodyText}`,
        timestamp: new Date(),
        status: 'failed',
        interactive: true,
        listType: true,
        error: error.message || 'Unknown error'
      });
      
      throw error;
    }
  }

  // Helper method to format phone numbers
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // Ensure it starts with a country code (default to South Africa +27 if needed)
    if (formatted.startsWith('0')) {
      formatted = '27' + formatted.substring(1);
    }
    
    // If no country code is present, add South Africa's code
    if (formatted.length <= 10) {
      formatted = '27' + formatted;
    }
    
    return formatted;
  }

  // Process incoming messages from webhook
  async processIncomingMessage(data: any): Promise<void> {
    try {
      // Extract the message data from the webhook payload
      const entry = data.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        console.log('No messages in webhook payload');
        return;
      }

      // Process each message
      for (const message of messages) {
        const from = message.from;
        const messageId = message.id;
        const timestamp = new Date(Number(message.timestamp) * 1000);
        
        let messageContent = '';
        let mediaUrl = '';
        let caption = '';
        let interactiveData = null;
        
        // Extract message content based on type
        if (message.type === 'text') {
          messageContent = message.text.body;
        } else if (message.type === 'image') {
          mediaUrl = message.image.id;
          caption = message.image.caption || '';
          messageContent = caption || 'Image received';
          
          // Download media if needed
          try {
            const mediaInfo = await this.getMediaUrl(mediaUrl);
            mediaUrl = mediaInfo.url;
          } catch (error) {
            console.error('Error getting media URL:', error);
          }
        } else if (message.type === 'document') {
          mediaUrl = message.document.id;
          caption = message.document.caption || '';
          messageContent = message.document.filename || 'Document received';
          
          // Download media if needed
          try {
            const mediaInfo = await this.getMediaUrl(mediaUrl);
            mediaUrl = mediaInfo.url;
          } catch (error) {
            console.error('Error getting media URL:', error);
          }
        } else if (message.type === 'audio') {
          mediaUrl = message.audio.id;
          messageContent = 'Audio received';
          
          // Download media if needed
          try {
            const mediaInfo = await this.getMediaUrl(mediaUrl);
            mediaUrl = mediaInfo.url;
          } catch (error) {
            console.error('Error getting media URL:', error);
          }
        } else if (message.type === 'video') {
          mediaUrl = message.video.id;
          caption = message.video.caption || '';
          messageContent = caption || 'Video received';
          
          // Download media if needed
          try {
            const mediaInfo = await this.getMediaUrl(mediaUrl);
            mediaUrl = mediaInfo.url;
          } catch (error) {
            console.error('Error getting media URL:', error);
          }
        } else if (message.type === 'location') {
          const { latitude, longitude, name, address } = message.location;
          messageContent = `Location: ${name || ''} ${address || ''} (${latitude}, ${longitude})`;
        } else if (message.type === 'interactive') {
          // Handle interactive messages (button responses or list responses)
          const interactiveType = message.interactive.type;
          
          if (interactiveType === 'button_reply') {
            const buttonReply = message.interactive.button_reply;
            messageContent = `Button selected: ${buttonReply.title} (ID: ${buttonReply.id})`;
            interactiveData = {
              type: 'button_reply',
              buttonId: buttonReply.id,
              buttonTitle: buttonReply.title
            };
          } else if (interactiveType === 'list_reply') {
            const listReply = message.interactive.list_reply;
            messageContent = `List item selected: ${listReply.title} (ID: ${listReply.id})`;
            interactiveData = {
              type: 'list_reply',
              listItemId: listReply.id,
              listItemTitle: listReply.title,
              listItemDescription: listReply.description
            };
          }
        } else {
          messageContent = `Message of type ${message.type} received`;
        }

        // Log the incoming message
        await this.logMessage({
          type: 'inbound',
          sender: from,
          content: messageContent,
          mediaUrl,
          caption,
          interactiveData,
          timestamp,
          status: 'received',
          messageId
        });

        // Process with chatbot or other logic
        await this.processWithChatbot(from, messageContent, interactiveData);
      }
    } catch (error) {
      console.error('Error processing incoming WhatsApp message:', error);
    }
  }

  // Process message with your existing chatbot
  async processWithChatbot(from: string, content: string, interactiveData: any = null): Promise<void> {
    try {
      // Simple auto-reply for now
      // In a real implementation, you would integrate with your NLP/chatbot service
      let response = "Thank you for your message. A customer service representative will respond shortly.";
      
      // Custom response for interactive messages
      if (interactiveData) {
        if (interactiveData.type === 'button_reply') {
          response = `Thank you for selecting "${interactiveData.buttonTitle}". We'll process your request.`;
        } else if (interactiveData.type === 'list_reply') {
          response = `Thank you for selecting "${interactiveData.listItemTitle}". We'll process your request.`;
        }
      }
      
      // Send the response back to the user
      await this.sendTextMessage(from, response);
    } catch (error) {
      console.error('Error processing message with chatbot:', error);
    }
  }

  // Upload media to WhatsApp servers
  async uploadMedia(mediaType: string, mediaUrl: string): Promise<string> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      // First, download the media file
      const mediaResponse = await axios({
        method: 'GET',
        url: mediaUrl,
        responseType: 'arraybuffer'
      });
      
      // Convert to form data
      const formData = new FormData();
      const blob = new Blob([mediaResponse.data], { type: `${mediaType}/${this.getFileExtension(mediaUrl)}` });
      formData.append('file', blob);
      formData.append('messaging_product', 'whatsapp');
      
      // Upload to WhatsApp servers
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/media`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'multipart/form-data'
        },
        data: formData
      });
      
      return response.data.id;
    } catch (error) {
      console.error('Error uploading media to WhatsApp:', error);
      throw error;
    }
  }
  
  // Get media URL from media ID
  async getMediaUrl(mediaId: string): Promise<{ url: string, mimeType: string }> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      // Get media URL
      const response = await axios({
        method: 'GET',
        url: `${this.apiUrl}/${mediaId}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
      
      // Get the actual media file
      const mediaResponse = await axios({
        method: 'GET',
        url: response.data.url,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        responseType: 'arraybuffer'
      });
      
      // Convert to base64 for storage or display
      const base64 = Buffer.from(mediaResponse.data).toString('base64');
      const mimeType = response.data.mime_type;
      const dataUrl = `data:${mimeType};base64,${base64}`;
      
      return {
        url: dataUrl,
        mimeType
      };
    } catch (error) {
      console.error('Error getting media from WhatsApp:', error);
      throw error;
    }
  }
  
  // Helper to get file extension from URL or filename
  private getFileExtension(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!extension) return 'bin';
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'jpeg';
      case 'png':
        return 'png';
      case 'gif':
        return 'gif';
      case 'pdf':
        return 'pdf';
      case 'mp3':
      case 'ogg':
      case 'wav':
        return 'audio';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      default:
        return 'bin';
    }
  }

  // Log messages to Firestore for tracking
  async logMessage(messageData: any): Promise<void> {
    try {
      await addDoc(collection(db, 'whatsappMessages'), {
        ...messageData,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error logging WhatsApp message:', error);
    }
  }

  // Update message status when webhooks are received
  async updateMessageStatus(messageId: string, status: string): Promise<void> {
    try {
      // Find the message in Firestore
      const messagesRef = collection(db, 'whatsappMessages');
      const q = query(messagesRef, where('messageId', '==', messageId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update the message status
        const messageDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'whatsappMessages', messageDoc.id), {
          status,
          updatedAt: new Date()
        });

        // Also log the status update in a separate collection
        await addDoc(collection(db, 'whatsappMessageStatus'), {
          messageId,
          status,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Error updating WhatsApp message status:', error);
    }
  }

  // Verify webhook
  verifyWebhook(mode: string, token: string): boolean {
    return mode === 'subscribe' && token === this.webhookVerifyToken;
  }

  // Get message templates
  async getMessageTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.apiUrl}/${this.businessAccountId}/message_templates`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Error getting WhatsApp message templates:', error);
      throw error;
    }
  }

  // Get business profile
  async getBusinessProfile(): Promise<WhatsAppBusinessProfile> {
    try {
      const response = await axios({
        method: 'GET',
        url: `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return response.data.data[0] || {};
    } catch (error) {
      console.error('Error getting WhatsApp business profile:', error);
      throw error;
    }
  }

  // Update business profile
  async updateBusinessProfile(profileData: Partial<WhatsAppBusinessProfile>): Promise<any> {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.apiUrl}/${this.phoneNumberId}/whatsapp_business_profile`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          ...profileData
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error updating WhatsApp business profile:', error);
      throw error;
    }
  }

  // Get recent messages
  async getRecentMessages(limit: number = 20): Promise<WhatsAppMessage[]> {
    try {
      const messagesRef = collection(db, 'whatsappMessages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limit));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as WhatsAppMessage;
      });
    } catch (error) {
      console.error('Error getting recent WhatsApp messages:', error);
      throw error;
    }
  }

  // Get conversation with a specific user
  async getConversation(phoneNumber: string, limit: number = 50): Promise<WhatsAppMessage[]> {
    try {
      const messagesRef = collection(db, 'whatsappMessages');
      const q = query(
        messagesRef, 
        where('sender', '==', phoneNumber), 
        orderBy('timestamp', 'desc'), 
        limit(limit)
      );
      const querySnapshot = await getDocs(q);
      
      // Get outbound messages to this user as well
      const outboundQ = query(
        messagesRef,
        where('recipient', '==', phoneNumber),
        orderBy('timestamp', 'desc'),
        limit(limit)
      );
      const outboundSnapshot = await getDocs(outboundQ);
      
      // Combine and sort by timestamp
      const allMessages = [
        ...querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...outboundSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ] as WhatsAppMessage[];
      
      return allMessages.sort((a, b) => {
        const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : (a.timestamp as Date).getTime();
        const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : (b.timestamp as Date).getTime();
        return aTime - bTime;
      });
    } catch (error) {
      console.error('Error getting WhatsApp conversation:', error);
      throw error;
    }
  }

  // Get message analytics
  async getMessageAnalytics(days: number = 30): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const messagesRef = collection(db, 'whatsappMessages');
      const q = query(
        messagesRef,
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      );
      const querySnapshot = await getDocs(q);
      
      const messages = querySnapshot.docs.map(doc => doc.data());
      
      // Calculate analytics
      const totalMessages = messages.length;
      const inboundMessages = messages.filter(msg => msg.type === 'inbound').length;
      const outboundMessages = messages.filter(msg => msg.type === 'outbound').length;
      
      // Message status distribution
      const statusDistribution = messages.reduce((acc: Record<string, number>, msg) => {
        const status = msg.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      // Message type distribution
      const messageTypes = messages.reduce((acc: Record<string, number>, msg) => {
        // Check for media types
        if (msg.mediaUrl) {
          if (msg.mediaUrl.includes('image')) {
            acc['image'] = (acc['image'] || 0) + 1;
          } else if (msg.mediaUrl.includes('video')) {
            acc['video'] = (acc['video'] || 0) + 1;
          } else if (msg.mediaUrl.includes('audio')) {
            acc['audio'] = (acc['audio'] || 0) + 1;
          } else if (msg.mediaUrl.includes('pdf') || msg.mediaUrl.includes('document')) {
            acc['document'] = (acc['document'] || 0) + 1;
          }
        } else if (msg.templateName) {
          acc['template'] = (acc['template'] || 0) + 1;
        } else if (msg.interactiveData) {
          acc['interactive'] = (acc['interactive'] || 0) + 1;
        } else {
          acc['text'] = (acc['text'] || 0) + 1;
        }
        return acc;
      }, {});
      
      // Daily message count
      const dailyMessageCount: Record<string, { inbound: number, outbound: number }> = {};
      
      // Create entries for each day in the range
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyMessageCount[dateStr] = { inbound: 0, outbound: 0 };
      }
      
      // Fill in the actual counts
      messages.forEach(msg => {
        const timestamp = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : msg.timestamp;
        const dateStr = timestamp.toISOString().split('T')[0];
        
        if (!dailyMessageCount[dateStr]) {
          dailyMessageCount[dateStr] = { inbound: 0, outbound: 0 };
        }
        
        if (msg.type === 'inbound') {
          dailyMessageCount[dateStr].inbound++;
        } else {
          dailyMessageCount[dateStr].outbound++;
        }
      });
      
      // User engagement metrics
      const uniqueUsers = new Set(messages.map(msg => msg.sender || msg.recipient)).size;
      
      // Response time metrics
      const conversationMap = new Map<string, any[]>();
      
      // Group messages by conversation (same sender/recipient pair)
      messages.forEach(msg => {
        const user = msg.sender || msg.recipient;
        if (!conversationMap.has(user)) {
          conversationMap.set(user, []);
        }
        conversationMap.get(user)?.push(msg);
      });
      
      // Calculate average response times
      let totalResponseTime = 0;
      let responseCount = 0;
      
      conversationMap.forEach(conversation => {
        // Sort by timestamp
        conversation.sort((a, b) => {
          const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toDate().getTime() : (a.timestamp as Date).getTime();
          const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toDate().getTime() : (b.timestamp as Date).getTime();
          return aTime - bTime;
        });
        
        // Calculate response times
        for (let i = 1; i < conversation.length; i++) {
          const prevMsg = conversation[i-1];
          const currMsg = conversation[i];
          
          // Only count if it's a response (different direction)
          if (prevMsg.type !== currMsg.type) {
            const prevTime = prevMsg.timestamp instanceof Timestamp ? prevMsg.timestamp.toDate().getTime() : (prevMsg.timestamp as Date).getTime();
            const currTime = currMsg.timestamp instanceof Timestamp ? currMsg.timestamp.toDate().getTime() : (currMsg.timestamp as Date).getTime();
            
            const responseTime = (currTime - prevTime) / 1000; // in seconds
            totalResponseTime += responseTime;
            responseCount++;
          }
        }
      });
      
      const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
      
      return {
        totalMessages,
        inboundMessages,
        outboundMessages,
        statusDistribution,
        messageTypes,
        dailyMessageCount,
        uniqueUsers,
        averageResponseTime,
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting WhatsApp message analytics:', error);
      throw error;
    }
  }
  
  // Send bulk messages (for notifications, marketing, etc.)
  async sendBulkMessages(recipients: string[], messageType: 'text' | 'template', content: string, templateParams?: any): Promise<any> {
    try {
      if (!this.isEnabled()) {
        throw new Error('WhatsApp integration is not enabled or configured');
      }
      
      if (!recipients || recipients.length === 0) {
        throw new Error('At least one recipient is required');
      }
      
      const results: any[] = [];
      const errors: any[] = [];
      
      // Process in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        // Process each recipient in the batch
        const batchPromises = batch.map(async (recipient) => {
          try {
            let result;
            
            if (messageType === 'text') {
              result = await this.sendTextMessage(recipient, content);
            } else if (messageType === 'template') {
              result = await this.sendTemplateMessage(recipient, content, templateParams);
            }
            
            results.push({
              recipient,
              success: true,
              messageId: result?.messages?.[0]?.id
            });
            
            return result;
          } catch (error: any) {
            errors.push({
              recipient,
              success: false,
              error: error.message
            });
            
            return null;
          }
        });
        
        await Promise.all(batchPromises);
        
        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        totalSent: results.length,
        totalFailed: errors.length,
        successfulMessages: results,
        failedMessages: errors
      };
    } catch (error) {
      console.error('Error sending bulk WhatsApp messages:', error);
      throw error;
    }
  }
  
  // Get message templates with status
  async getMessageTemplatesWithStatus(): Promise<any[]> {
    try {
      // First get templates from WhatsApp API
      const apiTemplates = await this.getMessageTemplates();
      
      // Then get template settings from Firestore
      const settingsDoc = await getDoc(doc(db, 'settings', 'whatsapp'));
      let configuredTemplates: any[] = [];
      
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        configuredTemplates = settings.templates || [];
      }
      
      // Merge the data
      const mergedTemplates = apiTemplates.map(apiTemplate => {
        const configTemplate = configuredTemplates.find(t => t.name === apiTemplate.name);
        return {
          ...apiTemplate,
          configured: !!configTemplate,
          id: configTemplate?.id || '',
          inUse: configTemplate?.inUse || false
        };
      });
      
      return mergedTemplates;
    } catch (error) {
      console.error('Error getting WhatsApp message templates with status:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const whatsAppService = new WhatsAppService();
