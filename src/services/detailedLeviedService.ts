import { collection, writeBatch, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
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
    units?: string | number; // Adding units property to match StatementGenerator.tsx
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
        // Check if db is initialized
        if (!db) {
            throw new Error('Firebase Firestore is not initialized');
        }
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

        // Group records by account number
        const recordsByAccount: { [accountNumber: string]: DetailedLevied[] } = {};
        
        for (const record of records) {
            const accountNumber = record.ACCOUNT_NO;
            if (!recordsByAccount[accountNumber]) {
                recordsByAccount[accountNumber] = [];
            }
            recordsByAccount[accountNumber].push(record);
        }

        // Process records by account number in batches
        const accountNumbers = Object.keys(recordsByAccount);
        let currentBatchSize = 0;
        let currentBatch = writeBatch(db);
        
        for (let i = 0; i < accountNumbers.length; i++) {
            const accountNumber = accountNumbers[i];
            const accountRecords = recordsByAccount[accountNumber];
            
            try {
                // Create a document for each account number
                const accountDocRef = doc(detailedLeviedCollection, accountNumber);
                
                // Store the account records as a nested collection
                currentBatch.set(accountDocRef, {
                    accountNumber: accountNumber,
                    recordCount: accountRecords.length,
                    uploadedAt: new Date().toISOString(),
                    records: accountRecords
                });
                
                totalProcessed += accountRecords.length;
                currentBatchSize++;
                
                // Commit when batch size reaches limit
                if (currentBatchSize >= 500) { // Firestore batch limit
                    await currentBatch.commit();
                    processedBatches++;
                    currentBatchSize = 0;
                    currentBatch = writeBatch(db);
                    
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
                    
                    // Add a small delay between batches
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                console.error(`Error processing account ${accountNumber}:`, error);
                failedRecords += accountRecords.length;
            }
        }
        
        // Commit any remaining records
        if (currentBatchSize > 0) {
            try {
                await currentBatch.commit();
                processedBatches++;
            } catch (error) {
                console.error('Error committing final batch:', error);
                failedRecords += currentBatchSize;
            }
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
        // Check if db is initialized
        if (!db) {
            console.error('Firebase Firestore is not initialized');
            return [];
        }
        // Get the specific document for this account number
        const detailedLeviedDoc = doc(db, 'detailed_levied', accountNumber);
        const docSnapshot = await getDoc(detailedLeviedDoc);

        if (!docSnapshot.exists()) {
            console.log(`No detailed levied data found for account number: ${accountNumber}`);
            return [];
        }

        const accountData = docSnapshot.data();
        const records = accountData.records as DetailedLevied[];
        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];

        // Process all records for this account
        records.forEach((record) => {
            accountDetails.push({
                code: record.TARIFF_CODE,
                description: record.TOS_DESC,
                units: '1', // Adding a default units value
                tariff: record.TOS_DESC,
                value: record.M202409,
                date: currentDate
            });
        });

        return accountDetails;
    } catch (error) {
        console.error('Error fetching detailed levied data:', error);
        return [];
    }
};
