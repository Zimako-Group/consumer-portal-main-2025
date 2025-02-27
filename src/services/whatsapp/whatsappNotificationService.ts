import { whatsAppService } from './whatsappService';
import { format } from 'date-fns';

// WhatsApp notification service for specific business use cases
export class WhatsAppNotificationService {
  
  // Send payment reminder
  async sendPaymentReminder(
    phoneNumber: string, 
    customerName: string, 
    accountNumber: string, 
    amount: number, 
    dueDate: Date
  ): Promise<any> {
    try {
      const formattedDueDate = format(dueDate, 'dd MMMM yyyy');
      const formattedAmount = new Intl.NumberFormat('en-ZA', { 
        style: 'currency', 
        currency: 'ZAR' 
      }).format(amount);
      
      // Using a template message for payment reminders
      return await whatsAppService.sendTemplateMessage(
        `whatsapp:${phoneNumber}`, 
        'payment_reminder',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: accountNumber },
              { type: 'text', text: formattedAmount },
              { type: 'text', text: formattedDueDate }
            ]
          }
        ]
      );
    } catch (error) {
      console.error('Error sending payment reminder via WhatsApp:', error);
      throw error;
    }
  }
  
  // Send statement notification
  async sendStatementNotification(
    phoneNumber: string, 
    customerName: string, 
    accountNumber: string, 
    statementDate: Date,
    statementUrl: string
  ): Promise<any> {
    try {
      const formattedDate = format(statementDate, 'MMMM yyyy');
      
      // Using a template message for statement notifications
      return await whatsAppService.sendTemplateMessage(
        `whatsapp:${phoneNumber}`, 
        'statement_notification',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: accountNumber },
              { type: 'text', text: formattedDate }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              { type: 'text', text: statementUrl }
            ]
          }
        ]
      );
    } catch (error) {
      console.error('Error sending statement notification via WhatsApp:', error);
      throw error;
    }
  }
  
  // Send payment confirmation
  async sendPaymentConfirmation(
    phoneNumber: string, 
    customerName: string, 
    accountNumber: string, 
    amount: number, 
    paymentDate: Date,
    receiptNumber: string
  ): Promise<any> {
    try {
      const formattedDate = format(paymentDate, 'dd MMMM yyyy');
      const formattedAmount = new Intl.NumberFormat('en-ZA', { 
        style: 'currency', 
        currency: 'ZAR' 
      }).format(amount);
      
      // Using a template message for payment confirmations
      return await whatsAppService.sendTemplateMessage(
        `whatsapp:${phoneNumber}`, 
        'payment_confirmation',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: accountNumber },
              { type: 'text', text: formattedAmount },
              { type: 'text', text: formattedDate },
              { type: 'text', text: receiptNumber }
            ]
          }
        ]
      );
    } catch (error) {
      console.error('Error sending payment confirmation via WhatsApp:', error);
      throw error;
    }
  }
  
  // Send query response notification
  async sendQueryResponseNotification(
    phoneNumber: string, 
    customerName: string, 
    queryReference: string
  ): Promise<any> {
    try {
      // Using a template message for query response notifications
      return await whatsAppService.sendTemplateMessage(
        `whatsapp:${phoneNumber}`, 
        'query_response',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: customerName },
              { type: 'text', text: queryReference }
            ]
          }
        ]
      );
    } catch (error) {
      console.error('Error sending query response notification via WhatsApp:', error);
      throw error;
    }
  }
  
  // Send service interruption notification
  async sendServiceInterruptionNotification(
    phoneNumber: string, 
    area: string, 
    serviceType: string, 
    startTime: Date, 
    estimatedEndTime: Date,
    reason: string
  ): Promise<any> {
    try {
      const formattedStartTime = format(startTime, 'dd MMMM yyyy HH:mm');
      const formattedEndTime = format(estimatedEndTime, 'dd MMMM yyyy HH:mm');
      
      // Using a template message for service interruption notifications
      return await whatsAppService.sendTemplateMessage(
        `whatsapp:${phoneNumber}`, 
        'service_interruption',
        [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: area },
              { type: 'text', text: serviceType },
              { type: 'text', text: formattedStartTime },
              { type: 'text', text: formattedEndTime },
              { type: 'text', text: reason }
            ]
          }
        ]
      );
    } catch (error) {
      console.error('Error sending service interruption notification via WhatsApp:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const whatsAppNotificationService = new WhatsAppNotificationService();
