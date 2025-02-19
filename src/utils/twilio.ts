import twilio from 'twilio';

// Replace these with your actual Twilio credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('Missing Twilio credentials in environment variables');
}

export const twilioClient = twilio(accountSid, authToken);
export const fromNumber = twilioPhoneNumber;
