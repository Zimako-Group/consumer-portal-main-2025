import { collection, writeBatch, doc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface DetailedLevied {
    ACCOUNT_NO: string;
    TARIFF_CODE: string;
    TARIFF_DESC: string;
    TOS_CODE: string;
    TOS_DESC: string;
    M202409: number;
    M202410: number;
    M202411: number;
    M202412: number;
    M202501: number;
    M202502: number;
    M202503: number;
    M202504: number;
    M202505: number;
    M202506: number;
    M202507: number;
    M202508: number;
    TOTAL: number;
    ACCOUNT_HOLDER: string;
    EMAIL_ADDRESS: string;
    ERF_EXTENTION: string;
    ERF_LOT_NUMBER: string;
    ERF_SUB_DIVISION: string;
    ERF_UNIT_NUMBER: string;
    STREET_ADDRESS: string;
    POST_ADR_1: string;
    POST_ADR_2: string;
    POST_ADR_3: string;
    POST_CODE: string;
    ID_NUMBER_1: string;
    ACCOUNT_STATUS: string;
    ACCOUNT_TYPE: string;
    OWNER_TYPE: string;
    CATEGORY: string;
    CREDIT_STATUS: string;
    CREDIT_INSTRUCTION: string;
    GROUP_ACCOUNT: string;
    MAILING_INSTRUCTION: string;
    OLD_ACCOUNT_NUMBER: string;
    NOTES_2: string;
    PROVINCE: string;
    TOWN: string;
    SUBURB: string;
    WARD: string;
    PROPERTY_CATEGORY: string;
    GIS_KEY: string;
    ERF_REF: string;
    uploadedAt: string;
}

export interface AccountDetailsData {
    code: string;      // TARIFF_CODE
    description: string; // TOS_DESC
    tariff: string;    // TOS_DESC
    value: number;     // M202407
    date: string;      // Current date
}

export interface UploadResult {
    success: boolean;
    message: string;
    totalRecords: number;
    failedRecords: number;
    processedBatches: number;
}

export interface UploadProgress {
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    currentBatch: number;
    totalBatches: number;
    status: 'processing' | 'completed' | 'error';
    error?: string;
}

const BATCH_SIZE = 500; // Firestore batch limit is 500

export const uploadDetailedLevied = async (
    records: DetailedLevied[],
    progressCallback?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        let totalProcessed = 0;
        let failedRecords = 0;
        let processedBatches = 0;
        const totalRecords = records.length;
        const totalBatches = Math.ceil(totalRecords / BATCH_SIZE);

        // Clear existing records first
        const detailedLeviedCollection = collection(db, 'detailed_levied');
        const existingDocs = await getDocs(detailedLeviedCollection);
        const deleteBatch = writeBatch(db);
        existingDocs.forEach((doc) => {
            deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();

        // Process records in batches
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchRecords = records.slice(i, i + BATCH_SIZE);

            for (const record of batchRecords) {
                try {
                    const docRef = doc(detailedLeviedCollection);
                    batch.set(docRef, {
                        ...record,
                        uploadedAt: new Date().toISOString()
                    });
                    totalProcessed++;
                } catch (error) {
                    console.error('Error processing record:', error);
                    failedRecords++;
                }
            }

            try {
                await batch.commit();
                processedBatches++;

                if (progressCallback) {
                    progressCallback({
                        totalRecords,
                        processedRecords: totalProcessed,
                        failedRecords,
                        currentBatch: processedBatches,
                        totalBatches,
                        status: 'processing'
                    });
                }
            } catch (error) {
                console.error('Error committing batch:', error);
                failedRecords += batchRecords.length;
                
                if (progressCallback) {
                    progressCallback({
                        totalRecords,
                        processedRecords: totalProcessed,
                        failedRecords,
                        currentBatch: processedBatches,
                        totalBatches,
                        status: 'error',
                        error: 'Error committing batch to database'
                    });
                }
            }

            // Add a small delay between batches to prevent overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (progressCallback) {
            progressCallback({
                totalRecords,
                processedRecords: totalProcessed,
                failedRecords,
                currentBatch: processedBatches,
                totalBatches,
                status: 'completed'
            });
        }

        return {
            success: true,
            message: 'Upload completed successfully',
            totalRecords: totalProcessed,
            failedRecords,
            processedBatches
        };
    } catch (error) {
        console.error('Error uploading detailed levied:', error);
        if (progressCallback) {
            progressCallback({
                totalRecords: records.length,
                processedRecords: 0,
                failedRecords: records.length,
                currentBatch: 0,
                totalBatches: Math.ceil(records.length / BATCH_SIZE),
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
        return {
            success: false,
            message: 'Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
            totalRecords: 0,
            failedRecords: records.length,
            processedBatches: 0
        };
    }
};

export const getDetailedLeviedForCustomer = async (accountNumber: string): Promise<AccountDetailsData[]> => {
    try {
        const detailedLeviedCollection = collection(db, 'detailed_levied');
        const q = query(detailedLeviedCollection, where('ACCOUNT_NO', '==', accountNumber));
        const querySnapshot = await getDocs(q);

        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];

        querySnapshot.forEach((doc) => {
            const data = doc.data() as DetailedLevied;
            accountDetails.push({
                code: data.TARIFF_CODE,
                description: data.TOS_DESC,
                tariff: data.TOS_DESC,
                value: data.M202409,
                date: currentDate
            });
        });

        return accountDetails;
    } catch (error) {
        console.error('Error fetching detailed levied data:', error);
        return [];
    }
};
