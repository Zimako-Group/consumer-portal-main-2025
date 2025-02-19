import { collection, query, where, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface MeterReading {
  uploadDate: string;
  Period: string;
  AccountNo: string;
  AccountHolder: string;
  ErfNo: string;
  Address: string;
  Ward: string;
  Town: string;
  Suburb: string;
  Reservoir: string;
  LocalAuthority: string;
  MeterType: string;
  HistType: string;
  MeterAlpha: string;
  MeterNumber: string;
  Book: string;
  Seq: string;
  Status: string;
  Factor: number;
  AmpsPhase: string;
  PrevRead: number;
  PrevReadDate: string;
  CurrRead: number;
  CurrReadDate: string;
  ReadType: string;
  Consumption: number;
  TariffCode: string;
  Description: string;
  AppliesToAccountType: string;
  ConsAmount: number;
  ConsRebate: number;
  BasicAmount: number;
  BasicRebate: number;
  SurCharge: number;
  VATAmount: number;
  TotLevied: number;
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
    progress.error = error.message;
    onProgress?.(progress);
    throw error;
  }
};

export const getMeterReadingsByDate = async (date: string): Promise<MeterReading[]> => {
  try {
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
    if (date) {
      const { year, month } = validateAndFormatDate(date);
      const monthCollectionRef = collection(db, 'meterReadings', year, month);
      
      console.log(`Fetching readings for account ${accountNumber} in ${year}-${month}`);
      const meterReadingsQuery = query(
        monthCollectionRef,
        where('accountNoIndex', '==', accountNumber.toLowerCase())
      );
      
      const querySnapshot = await getDocs(meterReadingsQuery);
      return querySnapshot.docs.map(doc => ({
        ...doc.data() as MeterReading
      }));
    } else {
      // If no date provided, search across all months in the current year
      const currentYear = new Date().getFullYear().toString();
      const yearCollection = collection(db, 'meterReadings', currentYear);
      
      console.log(`Fetching all readings for account ${accountNumber} in ${currentYear}`);
      const allMonthsSnapshot = await getDocs(yearCollection);
      
      const readings: MeterReading[] = [];
      for (const monthDoc of allMonthsSnapshot.docs) {
        const monthCollectionRef = collection(yearCollection, monthDoc.id);
        const meterReadingsQuery = query(
          monthCollectionRef,
          where('accountNoIndex', '==', accountNumber.toLowerCase())
        );
        const querySnapshot = await getDocs(meterReadingsQuery);
        readings.push(...querySnapshot.docs.map(doc => ({
          ...doc.data() as MeterReading
        })));
      }
      
      return readings;
    }
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    throw error;
  }
};
