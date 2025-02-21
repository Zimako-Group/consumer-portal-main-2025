import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Helper function to format phone number
const formatPhoneNumber = (phoneNumber: string | number | null | undefined) => {
  if (!phoneNumber) return '';
  
  // Convert to string if it's a number
  const phoneStr = phoneNumber.toString();
  
  // Remove any non-digit characters
  let cleaned = phoneStr.replace(/\D/g, '');
  
  // Add country code if not present
  if (!cleaned.startsWith('27')) {
    // Remove leading 0 if present
    cleaned = cleaned.replace(/^0/, '');
    // Add 27 prefix
    cleaned = '27' + cleaned;
  }
  
  return cleaned;
};

export interface CommunicationRecord {
  type: 'sms' | 'email' | 'whatsapp';
  content: string;
  recipient: string;
  sender: string;
  accountNumber: string;
  status: 'sent' | 'delivered' | 'failed';
}

export const recordCommunication = async (data: CommunicationRecord) => {
  try {
    const communicationsRef = collection(db, 'communications');
    const communicationData = {
      ...data,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };

    await addDoc(communicationsRef, communicationData);
    return true;
  } catch (error) {
    console.error('Error recording communication:', error);
    throw error;
  }
};

// Update the existing sendSMS function to record the communication
export const sendSMSAndRecord = async (
  phoneNumber: string | number,
  message: string,
  accountNumber: string,
  sender: string
) => {
  try {
    const finalPhoneNumber = formatPhoneNumber(phoneNumber);
    if (!finalPhoneNumber) {
      throw new Error('Invalid phone number');
    }
    
    console.log('Sending SMS to formatted number:', finalPhoneNumber);

    // Send SMS directly using Infobip
    const response = await fetch(`https://${import.meta.env.VITE_INFOBIP_BASE_URL}/sms/2/text/single`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${import.meta.env.VITE_INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: finalPhoneNumber,
        text: message
      })
    });

    const responseData = await response.json();
    console.log('Infobip API Response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.requestError?.serviceException?.text || 'Failed to send SMS');
    }

    // Then record the communication
    await recordCommunication({
      type: 'sms',
      content: message,
      recipient: phoneNumber.toString(),
      sender,
      accountNumber,
      status: 'sent',
    });

    return responseData;
  } catch (error) {
    console.error('Error in sendSMSAndRecord:', error);
    throw error;
  }
};

// Update the existing sendEmail function to record the communication
export const sendEmailAndRecord = async (
  email: string,
  subject: string,
  message: string,
  accountNumber: string,
  sender: string
) => {
  try {
    // Send email directly using Infobip
    const response = await fetch(`https://${import.meta.env.VITE_INFOBIP_BASE_URL}/email/3/send`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${import.meta.env.VITE_INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject: subject,
        text: message
      })
    });

    const responseData = await response.json();
    console.log('Infobip Email API Response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.requestError?.serviceException?.text || 'Failed to send email');
    }

    // Then record the communication
    await recordCommunication({
      type: 'email',
      content: `${subject}\n\n${message}`,
      recipient: email,
      sender,
      accountNumber,
      status: 'sent',
    });

    return responseData;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Add WhatsApp sending and recording function
export const sendWhatsAppAndRecord = async (
  phoneNumber: string,
  message: string,
  accountNumber: string,
  sender: string
) => {
  try {
    const finalPhoneNumber = formatPhoneNumber(phoneNumber);
    console.log('Sending WhatsApp to formatted number:', finalPhoneNumber);

    // Send WhatsApp message directly using Infobip
    const response = await fetch(`https://${import.meta.env.VITE_INFOBIP_BASE_URL}/ott/1/messaging`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${import.meta.env.VITE_INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: {
          phoneNumberId: import.meta.env.VITE_INFOBIP_WHATSAPP_PHONE_NUMBER_ID
        },
        to: {
          phoneNumber: finalPhoneNumber
        },
        message: {
          content: {
            text: message
          }
        }
      })
    });

    const responseData = await response.json();
    console.log('Infobip WhatsApp API Response:', responseData);

    if (!response.ok) {
      throw new Error(responseData.requestError?.serviceException?.text || 'Failed to send WhatsApp message');
    }

    // Then record the communication
    await recordCommunication({
      type: 'whatsapp',
      content: message,
      recipient: phoneNumber,
      sender,
      accountNumber,
      status: 'sent',
    });

    return responseData;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    throw error;
  }
};
