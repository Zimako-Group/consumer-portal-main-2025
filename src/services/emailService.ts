// Email service that calls our backend API to avoid CORS issues
const API_BASE_URL = 'http://localhost:3001';

interface ApiEmailRequest {
  recipients: Array<{
    email: string;
    name: string;
    accountNumber: string;
  }>;
  subject: string;
  content: string;
  templateType: string;
}

interface ApiEmailResponse {
  success: boolean;
  message: string;
  totalSent: number;
  successful: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface BulkEmailData {
  recipients: Array<{
    email: string;
    name: string;
    accountNumber: string;
  }>;
  subject: string;
  content: string;
  templateType: 'statement_notification' | 'payment_reminder' | 'custom';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailResult {
  totalSent: number;
  successful: number;
  failed: number;
  results: Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

/**
 * Send a single email using backend API
 */
export const sendEmail = async (emailData: EmailData, apiKey: string): Promise<EmailResult> => {
  try {
    // For single emails, we'll use the bulk email function with one recipient
    const bulkResult = await sendBulkEmails({
      recipients: [{
        email: emailData.to,
        name: 'Customer',
        accountNumber: 'SINGLE'
      }],
      subject: emailData.subject,
      content: emailData.html || '',
      templateType: 'custom'
    }, apiKey);

    if (bulkResult.successful > 0) {
      return {
        success: true,
        messageId: bulkResult.results[0]?.messageId
      };
    } else {
      return {
        success: false,
        error: bulkResult.results[0]?.error || 'Failed to send email'
      };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Send bulk emails using backend API
 */
export const sendBulkEmails = async (bulkEmailData: BulkEmailData, apiKey: string): Promise<BulkEmailResult> => {
  try {
    if (!apiKey) {
      throw new Error('API key is required.');
    }

    // Prepare the request data
    const requestData: ApiEmailRequest = {
      recipients: bulkEmailData.recipients,
      subject: bulkEmailData.subject,
      content: bulkEmailData.content,
      templateType: bulkEmailData.templateType
    };

    // Call the backend API
    const response = await fetch(`${API_BASE_URL}/api/send-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiEmailResponse = await response.json();

    return {
      totalSent: result.totalSent,
      successful: result.successful,
      failed: result.failed,
      results: result.results
    };
  } catch (error) {
    console.error('Error sending bulk emails:', error);
    
    // Return error results for all recipients
    const errorResults = bulkEmailData.recipients.map(recipient => ({
      email: recipient.email,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }));

    return {
      totalSent: bulkEmailData.recipients.length,
      successful: 0,
      failed: bulkEmailData.recipients.length,
      results: errorResults
    };
  }
};

/**
 * Validate email address format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get email template by type
 */
export const getEmailTemplate = (type: 'statement_notification' | 'payment_reminder' | 'custom') => {
  const templates = {
    statement_notification: {
      subject: 'Your Monthly Statement is Ready for Download',
      content: `Dear {{customerName}},

Your monthly statement for {{currentMonth}} is now available for download.

You can access your statement by visiting our customer portal at:
https://consumerportal.co.za/statement

Simply enter the last 4 digits of your phone number to search for your account and download your statement.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
The Zimako Team`
    },
    payment_reminder: {
      subject: 'Payment Reminder - Account {{accountNumber}}',
      content: `Dear {{customerName}},

This is a friendly reminder that your account has an outstanding balance.

Account Number: {{accountNumber}}
Outstanding Amount: {{outstandingAmount}}

Please visit our customer portal to view your statement and make a payment:
https://consumerportal.co.za/statement

Thank you for your prompt attention to this matter.

Best regards,
The Zimako Team`
    },
    custom: {
      subject: 'Important Notice from Zimako',
      content: `Dear {{customerName}},

[Your custom message here]

Best regards,
The Zimako Team`
    }
  };

  return templates[type];
};
