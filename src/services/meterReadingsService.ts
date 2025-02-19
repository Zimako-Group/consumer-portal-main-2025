import { db } from '../firebaseConfig';
import { 
    collection, 
    writeBatch, 
    doc,
    query,
    where,
    getDocs,
    Timestamp 
} from 'firebase/firestore';

export interface MeterReading {
    period: string;
    accountNumber: string;
    accountHolder: string;
    erfNo: string;
    address: string;
    ward: string;
    town: string;
    suburb: string;
    reservoir: string;
    localAuthority: string;
    meterType: string;
    histType: string;
    meterAlpha: string;
    meterNumber: string;
    book: string;
    seq: string;
    status: string;
    factor: number;
    ampsPhase: string;
    previousReading: number;
    previousReadingDate: string | null;
    currentReading: number;
    currentReadingDate: string | null;
    readType: string;
    consumption: number;
    tariffCode: string;
    description: string;
    appliesToAccountType: string;
    consAmount: number;
    consRebate: number;
    basicAmount: number;
    basicRebate: number;
    surCharge: number;
    vatAmount: number;
    totalLevied: number;
    createdAt: string;
    updatedAt: string;
}

export interface UploadResult {
    success: boolean;
    error?: string;
}

const convertToTimestamp = (dateStr: string | null): Timestamp => {
    if (!dateStr) return Timestamp.now();
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? Timestamp.now() : Timestamp.fromDate(date);
};

export const uploadMeterReadings = async (readings: MeterReading[]): Promise<UploadResult> => {
    try {
        // Process in batches of 500 records to stay well under the 10MB limit
        const BATCH_SIZE = 500;
        const totalBatches = Math.ceil(readings.length / BATCH_SIZE);
        
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
            const batch = writeBatch(db);
            const meterReadingsRef = collection(db, 'meterReadings');
            
            const start = batchIndex * BATCH_SIZE;
            const end = Math.min(start + BATCH_SIZE, readings.length);
            const currentBatch = readings.slice(start, end);

            currentBatch.forEach((reading) => {
                const docRef = doc(meterReadingsRef);
                batch.set(docRef, {
                    ...reading,
                    createdAt: convertToTimestamp(reading.createdAt),
                    updatedAt: convertToTimestamp(reading.updatedAt),
                    previousReadingDate: convertToTimestamp(reading.previousReadingDate),
                    currentReadingDate: convertToTimestamp(reading.currentReadingDate)
                });
            });

            await batch.commit();
            console.log(`Completed batch ${batchIndex + 1} of ${totalBatches}`);
        }

        return { success: true };
    } catch (error) {
        console.error('Error uploading meter readings:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

export const getMeterReadingsByAccount = async (accountNumber: string): Promise<MeterReading[]> => {
    try {
        const meterReadingsRef = collection(db, 'meterReadings');
        const q = query(meterReadingsRef, where('accountNumber', '==', accountNumber));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                previousReadingDate: data.previousReadingDate?.toDate().toISOString() ?? null,
                currentReadingDate: data.currentReadingDate?.toDate().toISOString() ?? null,
                createdAt: data.createdAt.toDate().toISOString(),
                updatedAt: data.updatedAt.toDate().toISOString()
            } as MeterReading;
        });
    } catch (error) {
        console.error('Error fetching meter readings:', error);
        return [];
    }
};
