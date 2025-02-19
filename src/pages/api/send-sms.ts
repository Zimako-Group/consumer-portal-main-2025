import { NextApiRequest, NextApiResponse } from 'next';
import { twilioClient, fromNumber } from '../../utils/twilio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    // Format the phone number to E.164 format
    let formattedNumber = to;
    if (!to.startsWith('+')) {
      // Assuming South African numbers, add the country code if not present
      formattedNumber = `+27${to.startsWith('0') ? to.substring(1) : to}`;
    }

    // Send the SMS
    const twilioResponse = await twilioClient.messages.create({
      body: message,
      to: formattedNumber,
      from: fromNumber,
    });

    return res.status(200).json({
      success: true,
      messageId: twilioResponse.sid,
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({
      error: 'Failed to send SMS',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
