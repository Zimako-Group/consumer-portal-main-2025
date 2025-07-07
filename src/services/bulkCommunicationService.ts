import axios from 'axios';
import { formatPhoneNumber, recordCommunication } from './communicationService';

// Temporary hardcoded Infobip credentials for testing
const INFOBIP_BASE_URL = 'wpmnqd.api.infobip.com';
const INFOBIP_API_KEY = 'ba81d7b2e0df52df953f83271532fd3b-0ea4a502-4fbb-447b-b3d5-8b5b9e3ee26b';

interface Recipient {
  phoneNumber?: string;
  accountNumber?: string;
  name?: string;
}

interface BulkSMSResponse {
  success: boolean;
  totalRecipients: number;
  totalSent: number;
  totalFailed: number;
  successfulMessages?: Array<{
    recipient: Recipient;
    messageId: string;
    status: string;
  }>;
  failedMessages?: Array<{
    recipient: Recipient;
    error: string;
  }>;
  isTemplated?: boolean;
  message?: string;
}

interface SMSAnalyticsResponse {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  successRate: string;
  dailyTrend: Array<{
    date: string;
    count: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export const sendBulkSMS = async (
  recipients: (string | Recipient)[],
  message: string,
  isTemplate: boolean = false,
  sender: string = 'System'
): Promise<BulkSMSResponse> => {
  try {
    if (!recipients || recipients.length === 0) {
      throw new Error('Recipients list cannot be empty');
    }

    if (!message || message.trim() === '') {
      throw new Error('Message content cannot be empty');
    }

    // Check message length (standard SMS is 160 chars, but we allow for multi-part SMS)
    if (message.length > 1600) {
      throw new Error('Message is too long for SMS (max 1600 characters)');
    }

    // Validate recipients
    const validRecipients = recipients.filter(recipient => {
      if (typeof recipient === 'string') {
        const cleaned = recipient.replace(/\D/g, '');
        return cleaned.length >= 9;
      } else if (typeof recipient === 'object' && recipient !== null) {
        // For object recipients, we need either a phone number or account number
        if (recipient.phoneNumber) {
          const cleaned = recipient.phoneNumber.replace(/\D/g, '');
          return cleaned.length >= 9;
        }
        // If no phone number but has account number, it's valid (phone will be fetched from customer data)
        return !!recipient.accountNumber;
      }
      return false;
    });

    if (validRecipients.length === 0) {
      throw new Error('No valid recipients in the list');
    }
    
    // Prepare results tracking
    const results: BulkSMSResponse = {
      success: true,
      totalRecipients: validRecipients.length,
      totalSent: 0,
      totalFailed: 0,
      successfulMessages: [] as Array<{recipient: Recipient; messageId: string; status: string}>,
      failedMessages: [] as Array<{recipient: Recipient; error: string}>,
      isTemplated: isTemplate,
      message: message
    };
    
    // Send SMS directly using Infobip API in batches
    const batchSize = 100; // Infobip recommends batches of 100 or less
    const batches = [];
    
    for (let i = 0; i < validRecipients.length; i += batchSize) {
      batches.push(validRecipients.slice(i, i + batchSize));
    }
    
    // Process each batch
    for (const batch of batches) {
      const messages = [];
            // Prepare messages for this batch
      for (const recipient of batch) {
        let phoneNumber;
        let accountNumber = '';
        let recipientName = '';
        
        if (typeof recipient === 'string') {
          phoneNumber = formatPhoneNumber(recipient);
        } else {
          phoneNumber = formatPhoneNumber(recipient.phoneNumber);
          accountNumber = recipient.accountNumber || '';
          recipientName = recipient.name || '';
        }
        
        // Skip if we couldn't get a valid phone number
        if (!phoneNumber) continue;
        
        // For templated messages, replace placeholders with actual values
        let finalMessage = message;
        if (isTemplate && typeof recipient !== 'string') {
          finalMessage = message
            .replace(/{user_account_number}/g, accountNumber || '')
            .replace(/{name}/g, recipientName || '')
            // Add other template variables as needed
        }
        
        // Use the same format as in communicationService.ts
        messages.push({
          to: phoneNumber,
          text: finalMessage
        });
      }
      
      if (messages.length === 0) continue;
      
      try {
        // Call Infobip API directly using the same format as infobipService.ts
        // Always use the advanced endpoint with the destinations format
        const endpoint = '/sms/2/text/advanced';
        
        // Convert our simple messages array to the format expected by Infobip
        const formattedMessages = messages.map(msg => ({
          destinations: [{ to: msg.to }],
          text: msg.text
        }));
        
        const requestBody = {
          messages: formattedMessages
        };
        
        console.log('Sending SMS to Infobip:', endpoint, requestBody);
        
        const response = await fetch(`https://${INFOBIP_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `App ${INFOBIP_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(responseData.requestError?.serviceException?.text || 'Failed to send batch');
        }
        
        // Process results
        if (responseData.messages && Array.isArray(responseData.messages)) {
          for (let i = 0; i < responseData.messages.length; i++) {
            const msgResult = responseData.messages[i];
            const recipientObj = batch[i];
            const recipientPhone = typeof recipientObj === 'string' ? recipientObj : recipientObj.phoneNumber;
            const recipientAccount = typeof recipientObj === 'string' ? '' : recipientObj.accountNumber || '';
            
            if (msgResult.status.groupId === 1 || msgResult.status.groupId === 3) {
              // Success or pending
              if (results.successfulMessages) {
                results.successfulMessages.push({
                  recipient: typeof recipientObj === 'string' ? { phoneNumber: recipientObj } : recipientObj,
                  messageId: msgResult.messageId,
                  status: msgResult.status.description
                });
              }
              results.totalSent++;
              
              // Record the communication
              await recordCommunication({
                type: 'sms',
                content: message,
                recipient: recipientPhone || '',
                sender,
                accountNumber: recipientAccount,
                status: 'sent',
              });
            } else {
              // Failed
              if (results.failedMessages) {
                results.failedMessages.push({
                  recipient: typeof recipientObj === 'string' ? { phoneNumber: recipientObj } : recipientObj,
                  error: msgResult.status.description
                });
              }
              results.totalFailed++;
            }
          }
        }
      } catch (error) {
        console.error('Error sending batch:', error);
        
        // Mark all recipients in this batch as failed
        for (const recipient of batch) {
          if (results.failedMessages) {
            results.failedMessages.push({
              recipient: typeof recipient === 'string' ? { phoneNumber: recipient } : recipient,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
          results.totalFailed++;
        }
      }
    }
    
    // Update success flag based on results
    results.success = results.totalSent > 0;
    
    return results;
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    
    if (axios.isAxiosError(error)) {
      // Handle API error responses
      const errorMessage = error.response?.data?.error || error.message;
      return {
        success: false,
        totalRecipients: recipients.length,
        totalSent: 0,
        totalFailed: recipients.length,
        message: `Failed to send bulk SMS: ${errorMessage}`
      };
    }
    
    // Handle other errors
    return {
      success: false,
      totalRecipients: recipients.length,
      totalSent: 0,
      totalFailed: recipients.length,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const getSMSAnalytics = async (days = 30): Promise<SMSAnalyticsResponse> => {
  try {
    const response = await axios.get(`/api/admin/sms/analytics?days=${days}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching SMS analytics:', error);
    throw error;
  }
};
