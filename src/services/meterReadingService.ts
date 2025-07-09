import { collection, query, where, getDocs, writeBatch, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface MeterReading {
  AccountHolder: string;
  AccountNo: string;
  Address: string;
  AmpsPhase: string;
  AppliesToAccountType: string;
  BasicAmount: number;
  BasicRebate: number;
  Book: string;
  ConsAmount: number;
  ConsRebate: number;
  Consumption: number;
  CurrRead: number;
  CurrReadDate: string;
  Description: string;
  ErfNo: string;
  Factor: number;
  HistType: string;
  LocalAuthority: string;
  MeterAlpha: string;
  MeterNumber: string;
  MeterType: string;
  Period: string;
  PrevRead: number;
  PrevReadDate: string;
  ReadType: string;
  Reservoir: string;
  Seq: string;
  Status: string;
  Suburb: string;
  SurCharge: number;
  TariffCode: string;
  TotLevied: number;
  Town: string;
  VATAmount: number;
  Ward: string;
  uploadDate: string;
  // Additional fields used internally
  accountNoIndex?: string;
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
  
  return collection(db, 'meterReadings', year, month);
};

export const uploadMeterReadings = async (
  readings: MeterReading[],
  onProgress?: (progress: UploadProgress) => void
): Promise<void> => {
  if (!readings.length) {
    throw new Error('No readings provided');
  }

  const progress: UploadProgress = {
    totalRecords: readings.length,
    processedRecords: 0,
    failedRecords: 0,
    status: 'processing'
  };

  try {
    if (!db) {
      throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
    }

    const uploadDate = readings[0].uploadDate;
    console.log(`Processing upload for date: ${uploadDate}`);

    // Validate date format and get collection reference
    const { year, month } = validateAndFormatDate(uploadDate);
    const monthCollectionRef = collection(db, 'meterReadings', year, month);

    console.log(`Uploading to collection: meterReadings/${year}/${month}`);

    // Upload new readings in batches
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(readings.length / BATCH_SIZE);
    progress.totalBatches = totalBatches;

    for (let i = 0; i < readings.length; i += BATCH_SIZE) {
      progress.phase = 'uploading';
      progress.currentBatch = Math.floor(i / BATCH_SIZE) + 1;
      
      const batch = writeBatch(db);
      const batchReadings = readings.slice(i, i + BATCH_SIZE);

      batchReadings.forEach((reading) => {
        const docId = reading.AccountNo.toLowerCase();
        const docRef = doc(monthCollectionRef, docId);

        // Add metadata
        const readingWithMetadata = {
          ...reading,
          accountNoIndex: reading.AccountNo.toLowerCase(), // for case-insensitive queries
          uploadTimestamp: new Date().toISOString(),
          year: year,
          month: month
        };

        // Use set with merge option to update existing documents or create new ones
        batch.set(docRef, readingWithMetadata, { merge: true });
      });

      await batch.commit();
      console.log(`Batch ${progress.currentBatch}/${totalBatches} uploaded`);

      progress.processedRecords += batchReadings.length;
      onProgress?.(progress);
    }

    progress.status = 'completed';
    onProgress?.(progress);
    console.log('Upload completed successfully');
  } catch (error) {
    console.error('Error in uploadMeterReadings:', error);
    progress.status = 'error';
    progress.error = error instanceof Error ? error.message : 'An unknown error occurred';
    onProgress?.(progress);
    throw error;
  }
};

export const getMeterReadingsByDate = async (date: string): Promise<MeterReading[]> => {
  try {
    if (!db) {
      throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
    }

    const { year, month } = validateAndFormatDate(date);
    const monthCollectionRef = collection(db, 'meterReadings', year, month);
    
    console.log(`Fetching readings for ${year}-${month}`);
    const querySnapshot = await getDocs(monthCollectionRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data() as MeterReading
    }));
  } catch (error) {
    console.error('Error fetching meter readings by date:', error);
    throw error;
  }
};

export const getMeterReadingsForCustomer = async (
  accountNumber: string,
  date?: string
): Promise<MeterReading[]> => {
  try {
    if (!db) {
      console.warn('Firebase Firestore not initialized. Returning empty array.');
      return [];
    }

    // Default to 2024/09 as per your structure
    const defaultYear = '2024';
    const defaultMonth = '09';

    const year = date ? validateAndFormatDate(date).year : defaultYear;
    const month = date ? validateAndFormatDate(date).month : defaultMonth;

    console.log(`Fetching meter readings for account ${accountNumber} in ${year}-${month}`);

    // Create reference to the specific customer's meter reading document
    const meterReadingRef = doc(db, 'meterReadings', year, month, accountNumber);
    const docSnapshot = await getDoc(meterReadingRef);

    if (!docSnapshot.exists()) {
      console.log(`No meter readings found for account ${accountNumber} in ${year}-${month}`);
      return [];
    }

    const data = docSnapshot.data();
    console.log('Retrieved meter reading data:', data);

    // Map the exact structure from Firestore
    const meterReading: MeterReading = {
      AccountHolder: data.AccountHolder || '',
      AccountNo: data.AccountNo || accountNumber,
      Address: data.Address || '',
      AmpsPhase: data.AmpsPhase || '',
      AppliesToAccountType: data.AppliesToAccountType || '',
      BasicAmount: data.BasicAmount || 0,
      BasicRebate: data.BasicRebate || 0,
      Book: data.Book || '',
      ConsAmount: data.ConsAmount || 0,
      ConsRebate: data.ConsRebate || 0,
      Consumption: data.Consumption || 0,
      CurrRead: data.CurrRead || 0,
      CurrReadDate: data.CurrReadDate || '',
      Description: data.Description || '',
      ErfNo: data.ErfNo || '',
      Factor: data.Factor || 1,
      HistType: data.HistType || '',
      LocalAuthority: data.LocalAuthority || '',
      MeterAlpha: data.MeterAlpha || '',
      MeterNumber: data.MeterNumber || '',
      MeterType: data.MeterType || '',
      Period: data.Period || '',
      PrevRead: data.PrevRead || 0,
      PrevReadDate: data.PrevReadDate || '',
      ReadType: data.ReadType || '',
      Reservoir: data.Reservoir || '',
      Seq: data.Seq || '',
      Status: data.Status || '',
      Suburb: data.Suburb || '',
      SurCharge: data.SurCharge || 0,
      TariffCode: data.TariffCode || '',
      TotLevied: data.TotLevied || 0,
      Town: data.Town || '',
      VATAmount: data.VATAmount || 0,
      Ward: data.Ward || '',
      uploadDate: data.uploadDate || `${year}-${month}`,
      // Include additional fields that might be used internally
      accountNoIndex: data.accountNoIndex || accountNumber.toLowerCase(),
      month: data.month || month,
      year: data.year || year,
      uploadTimestamp: data.uploadTimestamp || new Date().toISOString()
    };

    console.log('Mapped meter reading:', meterReading);
    return [meterReading];
  } catch (error: any) {
    console.error('Error fetching meter readings for customer:', error);
    
    // Handle permission errors gracefully
    if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
      console.warn('Permission denied for meter readings. Returning empty array.');
      return [];
    }
    
    // For other errors, still return empty array to allow statement generation to continue
    console.warn('Failed to fetch meter readings, continuing with empty data.');
    return [];
  }
};
