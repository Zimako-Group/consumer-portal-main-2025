import { whatsAppService } from '../services/whatsapp/whatsappService';
import { whatsAppNotificationService } from '../services/whatsapp/whatsappNotificationService';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';

// Check if WhatsApp integration is enabled
export const isWhatsAppEnabled = async (): Promise<boolean> => {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'whatsapp'));
    if (settingsDoc.exists()) {
      const settings = settingsDoc.data();
      return settings.enabled === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking WhatsApp status:', error);
    return false;
  }
};

// Send payment reminder via WhatsApp
export const sendPaymentReminderWhatsApp = async (
  customerId: string,
  amount: number,
  dueDate: Date
): Promise<boolean> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return false;

    // Get customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) return false;

    const customerData = customerDoc.data();
    const phoneNumber = customerData.phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') return false;

    // Send the reminder
    await whatsAppNotificationService.sendPaymentReminder(
      phoneNumber,
      customerData.accountHolderName,
      customerData.accountNumber,
      amount,
      dueDate
    );

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp payment reminder:', error);
    return false;
  }
};

// Send statement notification via WhatsApp
export const sendStatementNotificationWhatsApp = async (
  customerId: string,
  statementDate: Date,
  statementUrl: string
): Promise<boolean> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return false;

    // Get customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) return false;

    const customerData = customerDoc.data();
    const phoneNumber = customerData.phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') return false;

    // Send the notification
    await whatsAppNotificationService.sendStatementNotification(
      phoneNumber,
      customerData.accountHolderName,
      customerData.accountNumber,
      statementDate,
      statementUrl
    );

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp statement notification:', error);
    return false;
  }
};

// Send payment confirmation via WhatsApp
export const sendPaymentConfirmationWhatsApp = async (
  customerId: string,
  amount: number,
  paymentDate: Date,
  receiptNumber: string
): Promise<boolean> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return false;

    // Get customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) return false;

    const customerData = customerDoc.data();
    const phoneNumber = customerData.phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') return false;

    // Send the confirmation
    await whatsAppNotificationService.sendPaymentConfirmation(
      phoneNumber,
      customerData.accountHolderName,
      customerData.accountNumber,
      amount,
      paymentDate,
      receiptNumber
    );

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp payment confirmation:', error);
    return false;
  }
};

// Send query response notification via WhatsApp
export const sendQueryResponseNotificationWhatsApp = async (
  customerId: string,
  queryReference: string
): Promise<boolean> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return false;

    // Get customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) return false;

    const customerData = customerDoc.data();
    const phoneNumber = customerData.phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') return false;

    // Send the notification
    await whatsAppNotificationService.sendQueryResponseNotification(
      phoneNumber,
      customerData.accountHolderName,
      queryReference
    );

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp query response notification:', error);
    return false;
  }
};

// Send service interruption notification via WhatsApp to multiple customers
export const sendServiceInterruptionNotificationWhatsApp = async (
  area: string,
  serviceType: string,
  startTime: Date,
  estimatedEndTime: Date,
  reason: string,
  affectedCustomerIds: string[]
): Promise<{success: number, failed: number}> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return { success: 0, failed: affectedCustomerIds.length };

    let successCount = 0;
    let failedCount = 0;

    // Process each customer
    for (const customerId of affectedCustomerIds) {
      try {
        // Get customer data
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (!customerDoc.exists()) {
          failedCount++;
          continue;
        }

        const customerData = customerDoc.data();
        const phoneNumber = customerData.phoneNumber;
        
        // Validate phone number
        if (!phoneNumber || phoneNumber.trim() === '') {
          failedCount++;
          continue;
        }

        // Send the notification
        await whatsAppNotificationService.sendServiceInterruptionNotification(
          phoneNumber,
          area,
          serviceType,
          startTime,
          estimatedEndTime,
          reason
        );

        successCount++;
      } catch (error) {
        console.error(`Error sending service interruption to customer ${customerId}:`, error);
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error sending WhatsApp service interruption notifications:', error);
    return { success: 0, failed: affectedCustomerIds.length };
  }
};

// Send a custom message to a customer via WhatsApp
export const sendCustomMessageWhatsApp = async (
  customerId: string,
  message: string
): Promise<boolean> => {
  try {
    // Check if WhatsApp is enabled
    const whatsAppEnabled = await isWhatsAppEnabled();
    if (!whatsAppEnabled) return false;

    // Get customer data
    const customerDoc = await getDoc(doc(db, 'customers', customerId));
    if (!customerDoc.exists()) return false;

    const customerData = customerDoc.data();
    const phoneNumber = customerData.phoneNumber;
    
    // Validate phone number
    if (!phoneNumber || phoneNumber.trim() === '') return false;

    // Send the message
    await whatsAppService.sendTextMessage(
      `whatsapp:${phoneNumber}`,
      message
    );

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp custom message:', error);
    return false;
  }
};
