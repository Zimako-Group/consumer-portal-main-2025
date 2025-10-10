import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, limit, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';

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

    // Clean email log data to remove undefined values
    const cleanEmailLog = (log: any) => {
      const cleaned: any = {};
      Object.keys(log).forEach(key => {
        if (log[key] !== undefined) {
          cleaned[key] = log[key];
        }
      });
      return cleaned;
    };

    // Create individual email log documents
    const emailLogsPromises = emailLogs.map(emailLog => 
      addDoc(collection(dbInstance, 'emailLogs'), {
        ...cleanEmailLog(emailLog),
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
    console.log('📊 Fetching email statistics...');
    
    if (!db) {
      console.warn('⚠️ Database connection not available for email stats');
      return {
        totalEmailsSent: 0,
        totalBatches: 0,
        successRate: 0,
        recentActivity: []
      };
    }

    const dbInstance = db;
    
    // Get all email logs
    const emailLogsRef = collection(dbInstance, 'emailLogs');
    console.log('📋 Querying emailLogs collection...');
    const allLogsSnapshot = await getDocs(emailLogsRef);
    
    console.log(`📄 Found ${allLogsSnapshot.size} email log documents`);
    
    let totalEmailsSent = 0;
    let successfulEmails = 0;

    allLogsSnapshot.forEach((doc) => {
      const log = doc.data() as EmailLog;
      console.log(`📧 Email log: ${log.recipientEmail} - Status: ${log.status}`);
      totalEmailsSent++;
      if (log.status === 'sent') {
        successfulEmails++;
      }
    });

    console.log(`📊 Email logs summary: ${totalEmailsSent} total, ${successfulEmails} successful`);

    // Get total batches
    const batchesRef = collection(dbInstance, 'emailBatches');
    console.log('📋 Querying emailBatches collection...');
    const batchesSnapshot = await getDocs(batchesRef);
    const totalBatches = batchesSnapshot.size;
    console.log(`📄 Found ${totalBatches} email batch documents`);

    // Get recent activity
    console.log('🕰️ Fetching recent activity...');
    const recentActivity = await getRecentEmailLogs(10);
    console.log(`📅 Found ${recentActivity.length} recent activities`);

    const successRate = totalEmailsSent > 0 ? (successfulEmails / totalEmailsSent) * 100 : 0;
    
    const stats = {
      totalEmailsSent,
      totalBatches,
      successRate: Math.round(successRate * 100) / 100,
      recentActivity
    };
    
    console.log('✅ Email stats calculated:', stats);
    return stats;
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

/**
 * Reset email logs and batch history
 */
export const resetEmailData = async (): Promise<void> => {
  if (!db) {
    throw new Error('Database connection not available');
  }

  const dbInstance = db;
  const collectionsToReset = ['emailLogs', 'emailBatches'];

  for (const collectionName of collectionsToReset) {
    const collectionRef = collection(dbInstance, collectionName);
    const snapshot = await getDocs(collectionRef);

    const deletions = snapshot.docs.map((document) =>
      deleteDoc(doc(dbInstance, collectionName, document.id))
    );

    if (deletions.length > 0) {
      await Promise.all(deletions);
    }
  }
};
