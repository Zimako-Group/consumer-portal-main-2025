import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where, 
  Firestore, 
  Timestamp, 
  DocumentData,
  QuerySnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface StatementDistributionRecord {
  id?: string;
  month: string;
  year: string;
  distributionDate: Timestamp;
  totalStatements: number;
  successCount: number;
  failureCount: number;
  distributedBy: string;
  successRate?: number; // Calculated field
  pdfUrl?: string; // URL to the PDF file in Firebase Storage
  pdfFileName?: string; // Name of the PDF file
  uploadTimestamp?: number; // Timestamp when the file was uploaded
  isPdfOnly?: boolean; // Flag to indicate if this is just a PDF upload without detailed stats
}

/**
 * Fetches statement distribution records from Firestore
 * @param month Optional month filter (01-12)
 * @param year Optional year filter (e.g., 2024, 2025)
 * @returns Promise with array of statement distribution records
 */
export const getStatementDistributionRecords = async (
  month?: string,
  year?: string
): Promise<StatementDistributionRecord[]> => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      return [];
    }

    // Build query with optional filters
    let statementQuery = collection(db as Firestore, 'statementDistributions');
    let constraints = [];

    if (month) {
      constraints.push(where('month', '==', month));
    }

    if (year) {
      constraints.push(where('year', '==', year));
    }

    // Apply filters and order by distribution date (newest first)
    let finalQuery = query(
      statementQuery,
      ...constraints,
      orderBy('distributionDate', 'desc')
    );

    const snapshot = await getDocs(finalQuery);
    
    return processStatementDistributionSnapshot(snapshot);
  } catch (error) {
    console.error('Error fetching statement distribution records:', error);
    return [];
  }
};

/**
 * Processes a Firestore snapshot and returns formatted statement distribution records
 */
const processStatementDistributionSnapshot = (
  snapshot: QuerySnapshot<DocumentData>
): StatementDistributionRecord[] => {
  return snapshot.docs.map(doc => {
    const data = doc.data() as StatementDistributionRecord;
    
    // Calculate success rate
    const successRate = data.totalStatements > 0 
      ? (data.successCount / data.totalStatements) * 100 
      : 0;
    
    return {
      id: doc.id,
      ...data,
      successRate: parseFloat(successRate.toFixed(2))
    };
  });
};

/**
 * Generates a CSV file from statement distribution records
 * @param records Array of statement distribution records
 * @returns CSV content as string
 */
export const generateStatementDistributionCSV = (
  records: StatementDistributionRecord[]
): string => {
  // CSV header
  const header = [
    'Month',
    'Year',
    'Distribution Date',
    'Total Statements',
    'Success Count',
    'Failure Count',
    'Success Rate (%)',
    'Distributed By'
  ].join(',');

  // CSV rows
  const rows = records.map(record => {
    const distributionDate = record.distributionDate instanceof Timestamp
      ? record.distributionDate.toDate().toLocaleDateString()
      : new Date(record.distributionDate as any).toLocaleDateString();

    return [
      record.month,
      record.year,
      distributionDate,
      record.totalStatements,
      record.successCount,
      record.failureCount,
      record.successRate?.toFixed(2) || '0.00',
      record.distributedBy
    ].join(',');
  });

  // Combine header and rows
  return [header, ...rows].join('\n');
};

/**
 * Updates a statement distribution record with a manually entered PDF URL
 * @param recordId The ID of the statement distribution record to update
 * @param pdfUrl The URL of the PDF file in Firebase Storage
 * @param fileName Optional filename for the PDF
 * @returns Promise that resolves when the update is complete
 */
export const updateStatementDistributionPdfUrl = async (
  recordId: string,
  pdfUrl: string,
  fileName?: string
): Promise<void> => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      throw new Error('Firestore database is not initialized');
    }

    if (!recordId) {
      throw new Error('Record ID is required');
    }

    if (!pdfUrl) {
      throw new Error('PDF URL is required');
    }

    const recordRef = doc(db as Firestore, 'statementDistributions', recordId);
    
    const updateData: Partial<StatementDistributionRecord> = {
      pdfUrl,
      uploadTimestamp: Date.now(),
      isPdfOnly: true
    };
    
    if (fileName) {
      updateData.pdfFileName = fileName;
    }
    
    await updateDoc(recordRef, updateData);
    console.log(`Updated statement distribution record ${recordId} with PDF URL`);
  } catch (error) {
    console.error('Error updating statement distribution PDF URL:', error);
    throw error;
  }
};

/**
 * Creates a new statement distribution record with PDF URL
 * @param month Month (01-12)
 * @param year Year (e.g., 2024)
 * @param pdfUrl URL to the PDF in Firebase Storage
 * @param distributedBy Name of the person who distributed the statements
 * @param fileName Optional filename of the PDF
 * @returns Promise with the ID of the newly created record
 */
export const createStatementDistributionWithPdf = async (
  month: string,
  year: string,
  pdfUrl: string,
  distributedBy: string,
  fileName?: string
): Promise<string> => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      throw new Error('Firestore database is not initialized');
    }

    if (!month || !year || !pdfUrl || !distributedBy) {
      throw new Error('Month, year, PDF URL, and distributor name are required');
    }

    // Validate month format
    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
      throw new Error('Month must be in format 01-12');
    }

    // Validate year format
    if (!/^\d{4}$/.test(year)) {
      throw new Error('Year must be in format YYYY');
    }

    const newRecord: StatementDistributionRecord = {
      month,
      year,
      distributionDate: Timestamp.now(),
      totalStatements: 0,
      successCount: 0,
      failureCount: 0,
      distributedBy,
      pdfUrl,
      pdfFileName: fileName || `statement_distribution_${month}_${year}.pdf`,
      uploadTimestamp: Date.now(),
      isPdfOnly: true
    };

    const docRef = await addDoc(collection(db as Firestore, 'statementDistributions'), newRecord);
    console.log(`Created new statement distribution record with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating statement distribution record:', error);
    throw error;
  }
};

/**
 * Deletes a statement distribution record from Firestore
 * @param recordId The ID of the statement distribution record to delete
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteStatementDistribution = async (
  recordId: string
): Promise<void> => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      throw new Error('Firestore database is not initialized');
    }

    if (!recordId) {
      throw new Error('Record ID is required');
    }

    const recordRef = doc(db as Firestore, 'statementDistributions', recordId);
    await deleteDoc(recordRef);
    console.log(`Deleted statement distribution record ${recordId}`);
  } catch (error) {
    console.error('Error deleting statement distribution record:', error);
    throw error;
  }
};

/**
 * Updates a statement distribution record with new counts
 * @param recordId The ID of the statement distribution record to update
 * @param totalStatements Total number of statements
 * @param successCount Number of successful statements
 * @param failureCount Number of failed statements
 * @returns Promise that resolves when the update is complete
 */
export const updateStatementDistributionCounts = async (
  recordId: string,
  totalStatements: number,
  successCount: number,
  failureCount: number
): Promise<void> => {
  try {
    if (!db) {
      console.error('Firestore database is not initialized');
      throw new Error('Firestore database is not initialized');
    }

    if (!recordId) {
      throw new Error('Record ID is required');
    }

    const recordRef = doc(db as Firestore, 'statementDistributions', recordId);
    
    const updateData: Partial<StatementDistributionRecord> = {
      totalStatements,
      successCount,
      failureCount
    };
    
    await updateDoc(recordRef, updateData);
    console.log(`Updated statement distribution record ${recordId} with new counts`);
  } catch (error) {
    console.error('Error updating statement distribution counts:', error);
    throw error;
  }
};
