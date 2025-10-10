import axios from 'axios';
import { formatPhoneNumber, recordCommunication } from './communicationService';

const MYMOBILEAPI_BASE_URL = import.meta.env.VITE_MYMOBILEAPI_BASE_URL || import.meta.env.MYMOBILEAPI_BASE_URL;
const MYMOBILEAPI_CLIENT_ID = import.meta.env.VITE_MYMOBILEAPI_CLIENT_ID || import.meta.env.MYMOBILEAPI_CLIENT_ID;
const MYMOBILEAPI_API_SECRET = import.meta.env.VITE_MYMOBILEAPI_API_SECRET || import.meta.env.MYMOBILEAPI_API_SECRET;
const MYMOBILEAPI_SENDER = import.meta.env.VITE_MYMOBILEAPI_SENDER || import.meta.env.MYMOBILEAPI_SENDER;

if (!MYMOBILEAPI_BASE_URL || !MYMOBILEAPI_CLIENT_ID || !MYMOBILEAPI_API_SECRET) {
  console.warn('MyMobileAPI configuration is missing. Check your environment variables.');
}

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

    if (message.length > 1600) {
      throw new Error('Message is too long for SMS (max 1600 characters)');
    }

    if (!MYMOBILEAPI_BASE_URL || !MYMOBILEAPI_CLIENT_ID || !MYMOBILEAPI_API_SECRET) {
      throw new Error('MyMobileAPI configuration missing. Please check your environment variables.');
    }

    const normalisedBaseUrl = MYMOBILEAPI_BASE_URL.replace(/\/$/, '');
    const senderId = sender || MYMOBILEAPI_SENDER || 'ConsumerPortal';

    const encodeCredentials = (credentials: string) => {
      if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window.btoa(credentials);
      }

      if (typeof Buffer !== 'undefined') {
        return Buffer.from(credentials).toString('base64');
      }

      return credentials;
    };

    const authHeader = encodeCredentials(`${MYMOBILEAPI_CLIENT_ID}:${MYMOBILEAPI_API_SECRET}`);

    const validRecipients = recipients.filter(recipient => {
      if (typeof recipient === 'string') {
        const cleaned = recipient.replace(/\D/g, '');
        return cleaned.length >= 9;
      }

      if (recipient && typeof recipient === 'object') {
        const phoneCandidate = (recipient as Record<string, unknown>).phoneNumber ?? '';
        if (phoneCandidate) {
          const cleaned = phoneCandidate.toString().replace(/\D/g, '');
          if (cleaned.length >= 9) {
            return true;
          }
        }

        return Boolean(recipient.accountNumber);
      }

      return false;
    });

    if (validRecipients.length === 0) {
      throw new Error('No valid recipients in the list');
    }

    const results: BulkSMSResponse = {
      success: true,
      totalRecipients: validRecipients.length,
      totalSent: 0,
      totalFailed: 0,
      successfulMessages: [],
      failedMessages: [],
      isTemplated: isTemplate,
      message
    };

    const batchSize = 100;

    for (let i = 0; i < validRecipients.length; i += batchSize) {
      const batch = validRecipients.slice(i, i + batchSize);
      const preparedMessages: Array<{
        to: string;
        content: string;
        meta: Recipient;
      }> = [];

      for (const recipient of batch) {
        const rawPhone =
          typeof recipient === 'string'
            ? recipient
            : (recipient.phoneNumber ?? '');

        const formattedPhone = formatPhoneNumber(rawPhone);
        if (!formattedPhone) {
          continue;
        }

        const accountNumber =
          typeof recipient === 'string' ? '' : (recipient.accountNumber ?? '');
        const recipientName =
          typeof recipient === 'string' ? '' : (recipient.name ?? '');

        let personalisedMessage = message;
        if (isTemplate) {
          personalisedMessage = personalisedMessage
            .replace(/{user_account_number}/g, accountNumber)
            .replace(/{account_number}/g, accountNumber)
            .replace(/{customer_name}/g, recipientName)
            .replace(/{name}/g, recipientName);
        }

        preparedMessages.push({
          to: formattedPhone,
          content: personalisedMessage,
          meta: typeof recipient === 'string'
            ? { phoneNumber: recipient }
            : {
                phoneNumber: recipient.phoneNumber ?? formattedPhone,
                accountNumber: recipient.accountNumber,
                name: recipient.name
              }
        });
      }

      if (preparedMessages.length === 0) {
        continue;
      }

      try {
        const response = await fetch(`${normalisedBaseUrl}/bulkmessages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${authHeader}`
          },
          body: JSON.stringify({
            Messages: preparedMessages.map(item => ({
              Content: item.content,
              Destination: item.to
            }))
          })
        });

        const rawResponse = await response.text();
        let responseJson: any = {};
        try {
          responseJson = rawResponse ? JSON.parse(rawResponse) : {};
        } catch (parseError) {
          console.warn('Could not parse MyMobileAPI response JSON:', parseError, rawResponse);
        }

        if (!response.ok) {
          const errorMessage = responseJson?.message || responseJson?.error || response.statusText || 'Failed to send SMS batch';
          throw new Error(errorMessage);
        }

        const candidateResults = [
          responseJson?.messages,
          responseJson?.results,
          responseJson?.data,
          responseJson?.Responses,
          responseJson?.response,
          responseJson?.Messages
        ];

        const messageResults = candidateResults.find(Array.isArray) as any[] | undefined;

        preparedMessages.forEach((prepared, index) => {
          const resultEntry = messageResults?.[index] ?? {};
          const statusText = (
            resultEntry?.status ||
            resultEntry?.Status ||
            resultEntry?.StatusDescription ||
            resultEntry?.statusDescription ||
            resultEntry?.Description ||
            ''
          ).toString().toLowerCase();

          const statusCode = resultEntry?.statusCode ?? resultEntry?.StatusCode ?? resultEntry?.StatusCodeId;
          const isSuccess =
            resultEntry?.success === true ||
            statusCode === 0 ||
            statusText.includes('success') ||
            statusText.includes('queued') ||
            statusText.includes('accepted') ||
            statusText.includes('sent') ||
            !messageResults;

          if (isSuccess) {
            results.totalSent += 1;
            results.successfulMessages?.push({
              recipient: prepared.meta,
              messageId:
                resultEntry?.messageId ||
                resultEntry?.MessageID ||
                resultEntry?.id ||
                resultEntry?.MessageId ||
                '',
              status: (resultEntry?.status || resultEntry?.Status || 'Delivered').toString()
            });

            recordCommunication({
              type: 'sms',
              content: prepared.content,
              recipient: prepared.to,
              sender: senderId,
              accountNumber: prepared.meta.accountNumber ?? '',
              status: 'sent'
            }).catch(logError => {
              console.error('Error recording SMS communication:', logError);
            });
          } else {
            results.totalFailed += 1;
            results.failedMessages?.push({
              recipient: prepared.meta,
              error: (
                resultEntry?.error ||
                resultEntry?.message ||
                resultEntry?.Status ||
                resultEntry?.StatusDescription ||
                statusText ||
                'Unknown error'
              ).toString()
            });
          }
        });
      } catch (batchError) {
        console.error('Error sending SMS batch via MyMobileAPI:', batchError);

        preparedMessages.forEach(prepared => {
          results.totalFailed += 1;
          results.failedMessages?.push({
            recipient: prepared.meta,
            error: batchError instanceof Error ? batchError.message : 'Unknown error'
          });
        });
      }
    }

    results.success = results.totalFailed === 0;
    return results;
  } catch (error) {
    console.error('Error sending bulk SMS:', error);

    const errorMessage = axios.isAxiosError(error)
      ? error.response?.data?.error || error.message
      : error instanceof Error
        ? error.message
        : 'Unknown error occurred';

    return {
      success: false,
      totalRecipients: recipients.length,
      totalSent: 0,
      totalFailed: recipients.length,
      message: errorMessage
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
