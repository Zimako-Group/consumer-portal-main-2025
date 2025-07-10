import { collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface BalanceReport {
  accountNumber: string;
  accountHolderName: string;
  idNumber: string;
  erfNumber: string;
  valuation?: string;
  vatRegNumber?: string;
  companyCcNumber?: string;
  postalAddress1?: string;
  postalAddress2?: string;
  postalAddress3?: string;
  postalCode?: string;
  emailAddress?: string;
  cellNumber?: string;
  occupancyOwnership?: string;
  accountType?: string;
  ownerCategory?: string;
  groupAccount?: string;
  creditInstruction?: string;
  creditStatus?: string;
  mailingInstruction?: string;
  streetAddress?: string;
  town?: string;
  suburb?: string;
  ward?: string;
  propertyCategory?: string;
  gisKey?: string;
  indigent?: string;
  pensioner?: string;
  handOver?: string;
  outstandingBalanceCapital?: number;
  outstandingBalanceInterest?: number;
  outstandingTotalBalance?: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  agreementOutstanding?: string;
  agreementType?: string;
  housingOutstanding?: string;
  accountStatus?: string;
  uploadDate: string;
  // Additional fields used internally
  month?: string;
  year?: string;
  uploadTimestamp?: string;
}

export interface UploadProgress {
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
  phase?: 'deleting' | 'uploading';
  currentBatch?: number;
  totalBatches?: number;
}

// Helper function to validate and format date
const validateAndFormatDate = (date: string): { year: string; month: string } => {
  // Ensure date is in YYYY-MM format
  const match = date.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error('Invalid date format. Expected YYYY-MM');
  }

  const [_, year, month] = match;
  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  // Validate year range (2024 onwards)
  if (yearNum < 2024) {
    throw new Error('Year must be 2024 or later');
  }

  // Validate month range (1-12)
  if (monthNum < 1 || monthNum > 12) {
    throw new Error('Month must be between 1 and 12');
  }

  // Ensure month is always 2 digits
  const formattedMonth = monthNum.toString().padStart(2, '0');

  return {
    year: year,
    month: formattedMonth
  };
};

// Helper function to get collection reference for a specific month
const getMonthCollectionRef = (date: string) => {
  const { year, month } = validateAndFormatDate(date);
  console.log(`Creating collection reference for year: ${year}, month: ${month}`);
  
  if (!db) {
    throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
  }
  
  return collection(db, 'balanceReports', year, month);
};

export const uploadBalanceReports = async (
  reports: BalanceReport[],
  onProgress?: (progress: UploadProgress) => void
): Promise<void> => {
  if (!reports.length) {
    throw new Error('No reports provided');
  }

  const progress: UploadProgress = {
    totalRecords: reports.length,
    processedRecords: 0,
    failedRecords: 0,
    status: 'processing'
  };

  try {
    if (!db) {
      throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
    }

    const uploadDate = reports[0].uploadDate;
    console.log(`Processing upload for date: ${uploadDate}`);

    // Get collection reference using helper function
    const monthCollectionRef = getMonthCollectionRef(uploadDate);
    
    // Extract year and month for logging and additional fields
    const { year, month } = validateAndFormatDate(uploadDate);
    
    console.log(`Uploading to collection: balanceReports/${year}/${month}`);

    // Upload new reports in batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(reports.length / BATCH_SIZE);
    progress.totalBatches = totalBatches;

    for (let i = 0; i < reports.length; i += BATCH_SIZE) {
      progress.phase = 'uploading';
      progress.currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      
      const batch = writeBatch(db);
      const batchReports = reports.slice(i, i + BATCH_SIZE);

      for (const report of batchReports) {
        // Add month and year fields for easier querying
        report.month = month;
        report.year = year;
        report.uploadTimestamp = new Date().toISOString();

        // Use accountNumber as document ID
        const docRef = doc(monthCollectionRef, report.accountNumber);
        batch.set(docRef, report);
        
        progress.processedRecords++;
      }

      // Commit the batch
      await batch.commit();
      console.log(`Batch ${progress.currentBatch}/${totalBatches} committed`);
      
      if (onProgress) {
        onProgress({...progress});
      }
    }

    progress.status = 'completed';
    if (onProgress) {
      onProgress({...progress});
    }
    
    console.log('Upload completed successfully');
  } catch (error) {
    console.error('Error uploading balance reports:', error);
    progress.status = 'error';
    progress.error = error instanceof Error ? error.message : 'Unknown error';
    
    if (onProgress) {
      onProgress({...progress});
    }
    
    throw error;
  }
};

export const getBalanceReportsByDate = async (date: string): Promise<BalanceReport[]> => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
    }

    const { year, month } = validateAndFormatDate(date);
    const monthCollectionRef = collection(db, 'balanceReports', year, month);
    
    console.log(`Fetching balance reports for ${year}-${month}`);
    const querySnapshot = await getDocs(monthCollectionRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data() as BalanceReport
    }));
  } catch (error) {
    console.error('Error fetching balance reports by date:', error);
    throw error;
  }
};

export const getBalanceReportForCustomer = async (
  accountNumber: string,
  date?: string
): Promise<BalanceReport | null> => {
  try {
    if (!db) {
      console.warn('Firebase Firestore not initialized. Returning null.');
      return null;
    }

    // Get current date if not provided
    if (!date) {
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      date = `${year}-${month}`;
    }

    const { year, month } = validateAndFormatDate(date);

    console.log(`Fetching balance report for account ${accountNumber} in ${year}-${month}`);

    // Create reference to the specific customer's balance report document
    const balanceReportRef = doc(db, 'balanceReports', year, month, accountNumber);
    const docSnapshot = await getDoc(balanceReportRef);

    if (!docSnapshot.exists()) {
      console.log(`No balance report found for account ${accountNumber} in ${year}-${month}`);
      return null;
    }

    const data = docSnapshot.data() as BalanceReport;
    console.log('Retrieved balance report data:', data);

    return data;
  } catch (error: any) {
    console.error('Error fetching balance report for customer:', error);
    
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      console.warn('Permission denied for balance report. Returning null.');
      return null;
    }
    
    // For other errors, still return null to allow the application to continue
    console.warn('Failed to fetch balance report, continuing with null data.');
    return null;
  }
};
