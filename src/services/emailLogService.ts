import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

export interface EmailLog {
  id?: string;
  batchId: string;
  recipientEmail: string;
  recipientName: string;
  recipientAccountNumber: string;
  subject: string;
  content: string;
  templateType: 'statement_notification' | 'payment_reminder' | 'custom';
  status: 'sent' | 'failed';
  messageId?: string;
  error?: string;
  sentAt: Timestamp;
  sentBy?: string; // Admin user who sent the email
}

export interface EmailBatch {
  id?: string;
  batchId: string;
  templateType: 'statement_notification' | 'payment_reminder' | 'custom';
  subject: string;
  totalRecipients: number;
  successfulSends: number;
  failedSends: number;
  sentAt: Timestamp;
  sentBy?: string;
  completed: boolean;
}

export interface EmailStats {
  totalEmailsSent: number;
  totalBatches: number;
  successRate: number;
  recentActivity: EmailLog[];
}

/**
 * Log a batch of emails sent
 */
export const logEmailBatch = async (
  batchData: Omit<EmailBatch, 'id' | 'sentAt'>,
  emailLogs: Omit<EmailLog, 'id' | 'sentAt'>[]
): Promise<string> => {
  try {
    if (!db) {
      throw new Error('Database connection not available');
    }

    const timestamp = Timestamp.now();
    const dbInstance = db; // TypeScript assertion after null check

    // Create batch document
    const batchRef = await addDoc(collection(dbInstance, 'emailBatches'), {
      ...batchData,
      sentAt: timestamp
    });

    // Create individual email log documents
    const emailLogsPromises = emailLogs.map(emailLog => 
      addDoc(collection(dbInstance, 'emailLogs'), {
        ...emailLog,
        sentAt: timestamp
      })
    );

    await Promise.all(emailLogsPromises);

    console.log(`✅ Email batch logged: ${batchRef.id}`);
    return batchRef.id;
  } catch (error) {
    console.error('❌ Error logging email batch:', error);
    throw error;
  }
};

/**
 * Get recent email logs
 */
export const getRecentEmailLogs = async (limitCount: number = 50): Promise<EmailLog[]> => {
  try {
    if (!db) {
      console.warn('Database connection not available');
      return [];
    }

    const emailLogsRef = collection(db, 'emailLogs');
    const q = query(
      emailLogsRef,
      orderBy('sentAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const emailLogs: EmailLog[] = [];

    querySnapshot.forEach((doc) => {
      emailLogs.push({
        id: doc.id,
        ...doc.data()
      } as EmailLog);
    });

    return emailLogs;
  } catch (error) {
    console.error('❌ Error fetching email logs:', error);
    return [];
  }
};

/**
 * Get email logs for a specific recipient
 */
export const getEmailLogsForRecipient = async (email: string): Promise<EmailLog[]> => {
  try {
    if (!db) {
      console.warn('Database connection not available');
      return [];
    }

    const emailLogsRef = collection(db, 'emailLogs');
    const q = query(
      emailLogsRef,
      where('recipientEmail', '==', email),
      orderBy('sentAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const emailLogs: EmailLog[] = [];

    querySnapshot.forEach((doc) => {
      emailLogs.push({
        id: doc.id,
        ...doc.data()
      } as EmailLog);
    });

    return emailLogs;
  } catch (error) {
    console.error('❌ Error fetching email logs for recipient:', error);
    return [];
  }
};

/**
 * Get email batches
 */
export const getEmailBatches = async (limitCount: number = 20): Promise<EmailBatch[]> => {
  try {
    if (!db) {
      console.warn('Database connection not available');
      return [];
    }

    const batchesRef = collection(db, 'emailBatches');
    const q = query(
      batchesRef,
      orderBy('sentAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const batches: EmailBatch[] = [];

    querySnapshot.forEach((doc) => {
      batches.push({
        id: doc.id,
        ...doc.data()
      } as EmailBatch);
    });

    return batches;
  } catch (error) {
    console.error('❌ Error fetching email batches:', error);
    return [];
  }
};

/**
 * Get email statistics
 */
export const getEmailStats = async (): Promise<EmailStats> => {
  try {
    if (!db) {
      console.warn('Database connection not available');
      return {
        totalEmailsSent: 0,
        totalBatches: 0,
        successRate: 0,
        recentActivity: []
      };
    }

    // Get all email logs
    const emailLogsRef = collection(db, 'emailLogs');
    const allLogsSnapshot = await getDocs(emailLogsRef);
    
    let totalEmailsSent = 0;
    let successfulEmails = 0;

    allLogsSnapshot.forEach((doc) => {
      const log = doc.data() as EmailLog;
      totalEmailsSent++;
      if (log.status === 'sent') {
        successfulEmails++;
      }
    });

    // Get total batches
    const batchesRef = collection(db, 'emailBatches');
    const batchesSnapshot = await getDocs(batchesRef);
    const totalBatches = batchesSnapshot.size;

    // Get recent activity
    const recentActivity = await getRecentEmailLogs(10);

    const successRate = totalEmailsSent > 0 ? (successfulEmails / totalEmailsSent) * 100 : 0;

    return {
      totalEmailsSent,
      totalBatches,
      successRate: Math.round(successRate * 100) / 100,
      recentActivity
    };
  } catch (error) {
    console.error('❌ Error fetching email stats:', error);
    return {
      totalEmailsSent: 0,
      totalBatches: 0,
      successRate: 0,
      recentActivity: []
    };
  }
};

/**
 * Generate unique batch ID
 */
export const generateBatchId = (): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const random = Math.random().toString(36).substring(2, 8);
  return `batch_${timestamp}_${random}`;
};
