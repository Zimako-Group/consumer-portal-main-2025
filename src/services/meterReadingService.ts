import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface MeterReading {
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

const BATCH_SIZE = 400; // Reduced from 500 to be safer

export async function uploadMeterReadings(
  readings: MeterReading[],
  onProgress?: (progress: UploadProgress) => void
): Promise<void> {
  try {
    console.log('Starting upload process with readings:', readings.length);
    
    const progress: UploadProgress = {
      totalRecords: readings.length,
      processedRecords: 0,
      failedRecords: 0,
      status: 'processing',
      phase: 'uploading'
    };
    onProgress?.(progress);

    // Process readings in batches
    const meterReadingsRef = collection(db, 'meterReadings');
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let totalProcessed = 0;
    const totalBatches = Math.ceil(readings.length / BATCH_SIZE);
    
    // Create a map to store the latest reading per account
    const latestReadings = new Map<string, MeterReading>();
    
    // First, determine the latest reading for each account
    for (const reading of readings) {
      const existingReading = latestReadings.get(reading.AccountNo);
      if (!existingReading || 
          (reading.CurrReadDate > existingReading.CurrReadDate)) {
        latestReadings.set(reading.AccountNo, reading);
      }
    }
    
    // Now process each unique account's latest reading
    for (const [accountNo, reading] of latestReadings) {
      try {
        // Query for existing reading for this account
        const q = query(meterReadingsRef, where('AccountNo', '==', accountNo));
        const existingDocs = await getDocs(q);
        
        if (!existingDocs.empty) {
          // Update existing document
          const docRef = doc(db, 'meterReadings', existingDocs.docs[0].id);
          currentBatch.update(docRef, reading);
        } else {
          // Create new document
          const newDocRef = doc(meterReadingsRef);
          currentBatch.set(newDocRef, reading);
        }
        
        operationCount++;
        totalProcessed++;
        
        // Update progress
        progress.processedRecords = totalProcessed;
        progress.currentBatch = Math.floor(totalProcessed / BATCH_SIZE) + 1;
        progress.totalBatches = totalBatches;
        onProgress?.(progress);
        
        // Commit batch if it reaches the size limit
        if (operationCount === BATCH_SIZE) {
          console.log(`Committing batch ${progress.currentBatch}/${totalBatches}`);
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
      } catch (error) {
        console.error('Error processing reading:', error);
        progress.failedRecords++;
        onProgress?.(progress);
      }
    }
    
    // Commit any remaining operations
    if (operationCount > 0) {
      console.log('Committing final batch');
      await currentBatch.commit();
    }
    
    progress.status = 'completed';
    onProgress?.(progress);
    console.log('Upload completed successfully');
    
  } catch (error) {
    console.error('Upload failed:', error);
    const errorProgress: UploadProgress = {
      totalRecords: readings.length,
      processedRecords: 0,
      failedRecords: readings.length,
      status: 'error',
      error: error.message
    };
    onProgress?.(errorProgress);
    throw error;
  }
}

export async function getMeterReadingsForCustomer(accountNumber: string): Promise<MeterReading[]> {
  try {
    console.log('Fetching meter readings for account:', accountNumber);
    const meterReadingsRef = collection(db, 'meterReadings');
    const q = query(meterReadingsRef, where('AccountNo', '==', accountNumber));
    
    const querySnapshot = await getDocs(q);
    console.log('Query complete. Number of docs:', querySnapshot.size);

    const readings: MeterReading[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      readings.push({
        ...data,
        // Ensure all numeric fields are properly converted
        PrevRead: Number(data.PrevRead) || 0,
        CurrRead: Number(data.CurrRead) || 0,
        Consumption: Number(data.Consumption) || 0,
        TotLevied: Number(data.TotLevied) || 0,
        // Ensure string fields are properly formatted
        MeterNumber: data.MeterNumber?.toString() || '',
        MeterType: data.MeterType?.toString() || '',
      } as MeterReading);
    });

    console.log('Processed meter readings:', readings);
    return readings;
  } catch (error) {
    console.error('Error fetching meter readings:', error);
    return [];
  }
}
