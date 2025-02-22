import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendSMSAndRecord, sendEmailAndRecord, updateCommunicationStats } from './services/communicationService';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Run every minute to check for scheduled reminders
export const processScheduledReminders = functions.pubsub
  .schedule('every 1 minutes')
  .timeZone('Africa/Johannesburg') // SAST timezone
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const currentDate = new Date().toISOString().split('T')[0];

    try {
      // Query for pending reminders that are due
      const remindersQuery = await db
        .collection('paymentReminders')
        .where('status', '==', 'pending')
        .where('scheduledDate', '<=', now)
        .get();

      if (remindersQuery.empty) {
        console.log('No pending reminders to process');
        return null;
      }

      const batch = db.batch();
      const promises: Promise<any>[] = [];

      for (const doc of remindersQuery.docs) {
        const reminder = doc.data();
        
        try {
          // Send message based on channel
          if (reminder.channel === 'sms') {
            promises.push(
              sendSMSAndRecord(
                reminder.contactInfo,
                reminder.message,
                reminder.accountNumber,
                'System Admin'
              )
            );
          } else if (reminder.channel === 'email') {
            promises.push(
              sendEmailAndRecord(
                reminder.contactInfo,
                'Payment Reminder',
                reminder.message,
                reminder.accountNumber,
                'System Admin'
              )
            );
          }

          // Update reminder status
          batch.update(doc.ref, {
            status: 'sent',
            sentDate: currentDate,
            success: true,
            errorMessage: null
          });

          // Add to communication history
          const historyRef = db.collection('communicationHistory').doc();
          batch.set(historyRef, {
            timestamp: now,
            type: reminder.channel,
            recipient: reminder.contactInfo,
            accountNumber: reminder.accountNumber,
            customerName: reminder.customerName,
            message: reminder.message,
            status: 'delivered',
            department: 'billing',
            purpose: 'payment_reminder',
            amount: reminder.amount,
            sender: 'System Admin'
          });

          // Update communication stats
          promises.push(
            updateCommunicationStats({
              date: currentDate,
              type: reminder.channel,
              totalCount: 1,
              successCount: 1,
              failureCount: 0,
              department: 'billing',
              purpose: 'payment_reminder'
            })
          );

        } catch (error) {
          console.error(`Error processing reminder ${doc.id}:`, error);

          // Update reminder as failed
          batch.update(doc.ref, {
            status: 'failed',
            sentDate: currentDate,
            success: false,
            errorMessage: error.message
          });

          // Log failed communication
          const historyRef = db.collection('communicationHistory').doc();
          batch.set(historyRef, {
            timestamp: now,
            type: reminder.channel,
            recipient: reminder.contactInfo,
            accountNumber: reminder.accountNumber,
            customerName: reminder.customerName,
            message: reminder.message,
            status: 'failed',
            department: 'billing',
            purpose: 'payment_reminder',
            amount: reminder.amount,
            sender: 'System Admin',
            errorMessage: error.message
          });

          // Update failure stats
          promises.push(
            updateCommunicationStats({
              date: currentDate,
              type: reminder.channel,
              totalCount: 1,
              successCount: 0,
              failureCount: 1,
              department: 'billing',
              purpose: 'payment_reminder'
            })
          );
        }
      }

      // Execute all promises and batch updates
      await Promise.all([...promises, batch.commit()]);
      console.log(`Successfully processed ${remindersQuery.size} reminders`);

    } catch (error) {
      console.error('Error in processScheduledReminders:', error);
      throw error;
    }

    return null;
  });
