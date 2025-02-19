import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface DetailedAgedAnalysis {
    ACCOUNT_NO: number;
    '120 DAY FACTOR': number;
    '90 DAY FACTOR': number;
    '60 DAY FACTOR': number;
    'UP TO 30 DAY FACTOR': number;
    '202407': number;  // Current month
    TOTAL: number;
    uploadedAt: string;
}

export interface AgingAnalysisData {
    hundredTwentyPlusDays: number;
    ninetyDays: number;
    sixtyDays: number;
    thirtyDays: number;
    current: number;
    closingBalance: number;
}

export interface UploadResult {
    success: boolean;
    message: string;
    totalRecords?: number;
    failedRecords?: number;
}

export const uploadDetailedAgedAnalysis = async (records: DetailedAgedAnalysis[]): Promise<UploadResult> => {
    try {
        const batch = writeBatch(db);
        const detailedAgedAnalysisCollection = collection(db, 'detailed_aged_analysis');
        let count = 0;
        let failed = 0;

        for (const record of records) {
            try {
                const docRef = doc(detailedAgedAnalysisCollection);
                batch.set(docRef, {
                    ...record,
                    uploadedAt: new Date().toISOString()
                });
                count++;
            } catch (error) {
                console.error('Error processing record:', error);
                failed++;
            }
        }

        await batch.commit();

        return {
            success: true,
            message: `Successfully uploaded ${count} records`,
            totalRecords: count,
            failedRecords: failed
        };
    } catch (error) {
        console.error('Error uploading detailed aged analysis:', error);
        return {
            success: false,
            message: 'Failed to upload detailed aged analysis data',
            totalRecords: 0,
            failedRecords: records.length
        };
    }
};

export const getAgingAnalysisForCustomer = async (accountNumber: string): Promise<AgingAnalysisData> => {
    try {
        console.log('Fetching aging analysis for account:', accountNumber);
        const detailedAgedAnalysisCollection = collection(db, 'detailed_aged_analysis');
        const q = query(detailedAgedAnalysisCollection, where('ACCOUNT_NO', '==', Number(accountNumber)));
        const querySnapshot = await getDocs(q);

        let agingData: AgingAnalysisData = {
            hundredTwentyPlusDays: 0,
            ninetyDays: 0,
            sixtyDays: 0,
            thirtyDays: 0,
            current: 0,
            closingBalance: 0
        };

        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                console.log('Found aging data:', data);

                // Read the exact fields from your database
                agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                agingData.current += Number(data['202407']) || 0;  // Current month
            });

            // Calculate closing balance as sum of all periods
            agingData.closingBalance = 
                agingData.hundredTwentyPlusDays +
                agingData.ninetyDays +
                agingData.sixtyDays +
                agingData.thirtyDays +
                agingData.current;

            console.log('Processed aging data:', agingData);
        } else {
            console.log('No aging data found for account:', accountNumber);
        }

        return agingData;
    } catch (error) {
        console.error('Error fetching aging analysis data:', error);
        return {
            hundredTwentyPlusDays: 0,
            ninetyDays: 0,
            sixtyDays: 0,
            thirtyDays: 0,
            current: 0,
            closingBalance: 0
        };
    }
};
