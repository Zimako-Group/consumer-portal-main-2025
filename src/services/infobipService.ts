import axios from 'axios';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const INFOBIP_BASE_URL = `https://${import.meta.env.VITE_INFOBIP_BASE_URL}/`;
const API_KEY = import.meta.env.VITE_INFOBIP_API_KEY;

interface MessageResponse {
  success: boolean;
  message: string;
}

async function fetchCustomerBalance(accountNumber: string): Promise<number> {
  try {
    const customerRef = doc(db, 'customers', accountNumber);
    const customerDoc = await getDoc(customerRef);
    
    if (customerDoc.exists()) {
      const data = customerDoc.data();
      return data.outstandingTotalBalance || 0;
    }
    throw new Error('Customer not found');
  } catch (error) {
    console.error('Error fetching customer balance:', error);
    throw error;
  }
}

export const sendSMS = async (phoneNumber: string | number, accountNumber: string): Promise<MessageResponse> => {
  console.log('SendSMS - Account Number:', accountNumber);
  console.log('Original phone number:', phoneNumber);

  if (phoneNumber === 'N/A') {
    return {
      success: false,
      message: 'Failed: No Customer Number'
    };
  }

  try {
    // Convert to string first and then format phone number
    let formattedNumber = String(phoneNumber);
    // Remove any spaces, dashes or other characters
    formattedNumber = formattedNumber.replace(/\D/g, '');
    
    // If number doesn't start with +27, add it
    if (!formattedNumber.startsWith('27')) {
      // If number starts with 0, replace it with 27
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '27' + formattedNumber.substring(1);
      } else {
        formattedNumber = '27' + formattedNumber;
      }
    }

    console.log('Formatted phone number:', formattedNumber);

    const balance = await fetchCustomerBalance(accountNumber);
    console.log('SendSMS - Fetched Balance:', balance);

    if (isNaN(balance)) {
      throw new Error('Invalid balance value');
    }

    const message = `Dear Mohokare customer, your September tax invoice is available for download. Click here to download and settle your account: https://mokoharo.netlify.app/`;
    
    const response = await axios.post(
      `${INFOBIP_BASE_URL}sms/2/text/advanced`,
      {
        messages: [
          {
            destinations: [{ to: formattedNumber }],
            text: message,
          },
        ],
      },
      {
        headers: {
          'Authorization': `App ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    console.log('SMS API Response:', response.data);

    return {
      success: true,
      message: 'SMS sent successfully',
    };
  } catch (error) {
    console.error('SendSMS - Error details:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
};

export const sendEmail = async (email: string, accountNumber: string): Promise<MessageResponse> => {
  console.log('SendEmail - Account Number:', accountNumber);

  if (email === 'N/A') {
    return {
      success: false,
      message: 'Failed: No Email Address'
    };
  }

  try {
    const balance = await fetchCustomerBalance(accountNumber);
    console.log('SendEmail - Fetched Balance:', balance);

    if (isNaN(balance)) {
      throw new Error('Invalid balance value');
    }

    const emailPayload = {
      messages: [{
        from: {
          email: "notifications@consumerportal.co.za",
          name: "Mohokare Local Municipality"
        },
        to: [{
          email: email,
          name: "Valued Customer"
        }],
        subject: "Mohokare Municipality - Tax Invoice Available",
        text: `Dear Customer,\n\nYour September tax invoice is available for download. Your current outstanding balance is R${balance.toFixed(2)}.\n\nTo download and settle your account, please visit: https://mokoharo.netlify.app/\n\nBest regards,\nMohokare Local Municipality`,
        html: `
          <div>
            <p>Dear Customer,</p>
            <p>Your September tax invoice is available for download.</p>
            <p>Your current outstanding balance is <strong>R${balance.toFixed(2)}</strong>.</p>
            <p>To download and settle your account, please visit: <a href="https://mokoharo.netlify.app/">https://mokoharo.netlify.app/</a></p>
            <p>Best regards,<br>Mohokare Local Municipality</p>
          </div>
        `
      }]
    };

    console.log('Email Payload:', emailPayload);

    const response = await axios.post(
      `${INFOBIP_BASE_URL}email/3/send`,  // Updated to version 3 of the API
      emailPayload,
      {
        headers: {
          'Authorization': `App ${API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    console.log('Email API Response:', response.data);

    return {
      success: true,
      message: 'Email sent successfully',
    };
  } catch (error) {
    console.error('SendEmail - Error details:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      return {
        success: false,
        message: `Failed to send email: ${error.response?.data?.requestError?.serviceException?.text || error.message}`
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};