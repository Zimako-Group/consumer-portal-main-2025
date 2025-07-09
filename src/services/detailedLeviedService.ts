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
        
        // Use a much smaller batch size to prevent transaction too big errors
        const MAX_BATCH_SIZE = 100; // Reduced from 400/500 to 100
        const totalBatches = Math.ceil(totalRecords / MAX_BATCH_SIZE);

        // Get reference to the detailed levied collection (preserving existing records)
        const detailedLeviedCollection = collection(db, 'detailed_levied');

        // Group records by account number
        const recordsByAccount: { [accountNumber: string]: DetailedLevied[] } = {};
        
        for (const record of records) {
            const accountNumber = record.ACCOUNT_NO;
            if (!recordsByAccount[accountNumber]) {
                recordsByAccount[accountNumber] = [];
            }
            recordsByAccount[accountNumber].push(record);
        }

        // Process records by account number
        const accountNumbers = Object.keys(recordsByAccount);
        
        for (let i = 0; i < accountNumbers.length; i++) {
            const accountNumber = accountNumbers[i];
            const accountRecords = recordsByAccount[accountNumber];
            
            try {
                // Create a unique document ID using account number and timestamp to avoid conflicts
                const uploadTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const uniqueDocId = `${accountNumber}_${uploadTimestamp}`;
                const accountDocRef = doc(detailedLeviedCollection, uniqueDocId);
                
                // Create and commit a single batch just for the account summary
                const summaryBatch = writeBatch(db);
                summaryBatch.set(accountDocRef, {
                    accountNumber: accountNumber,
                    recordCount: accountRecords.length,
                    uploadedAt: new Date().toISOString(),
                    uploadTimestamp: uploadTimestamp
                });
                await summaryBatch.commit();
                
                // Create a subcollection for the detailed records
                const recordsSubcollection = collection(accountDocRef, 'records');
                
                // Process records in smaller batches
                for (let j = 0; j < accountRecords.length; j += MAX_BATCH_SIZE) {
                    const batchRecords = accountRecords.slice(j, j + MAX_BATCH_SIZE);
                    const recordBatch = writeBatch(db);
                    let batchSize = 0;
                    
                    for (let k = 0; k < batchRecords.length; k++) {
                        const record = batchRecords[k];
                        const recordIndex = j + k;
                        const recordDocRef = doc(recordsSubcollection, `record_${recordIndex}`);
                        
                        // Store each record with minimal data
                        // Extract only the essential fields to reduce document size
                        recordBatch.set(recordDocRef, {
                            ACCOUNT_NO: record.ACCOUNT_NO,
                            TARIFF_CODE: record.TARIFF_CODE,
                            TARIFF_DESC: record.TARIFF_DESC,
                            TOS_CODE: record.TOS_CODE,
                            TOS_DESC: record.TOS_DESC,
                            M202409: record.M202409,
                            M202410: record.M202410,
                            M202411: record.M202411,
                            M202412: record.M202412,
                            M202501: record.M202501,
                            M202502: record.M202502,
                            M202503: record.M202503,
                            M202504: record.M202504,
                            M202505: record.M202505,
                            M202506: record.M202506,
                            M202507: record.M202507,
                            M202508: record.M202508,
                            TOTAL: record.TOTAL,
                            recordIndex: recordIndex,
                            uploadTimestamp: uploadTimestamp,
                            uploadedAt: new Date().toISOString()
                            // Only include essential fields, omit others to reduce size
                        });
                        
                        batchSize++;
                    }
                    
                    // Commit this small batch
                    await recordBatch.commit();
                    processedBatches++;
                    totalProcessed += batchSize;
                    
                    if (progressCallback) {
                        progressCallback({
                            totalRecords,
                            processedRecords: totalProcessed,
                            failedRecords,
                            currentBatch: processedBatches,
                            totalBatches: Math.ceil(totalRecords / MAX_BATCH_SIZE),
                            status: 'processing'
                        });
                    }
                    
                    // Add a delay between batches
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.error(`Error processing account ${accountNumber}:`, error);
                failedRecords += accountRecords.length;
            }
        }

        if (progressCallback) {
            progressCallback({
                totalRecords,
                processedRecords: totalProcessed,
                failedRecords,
                currentBatch: processedBatches,
                totalBatches: Math.ceil(totalRecords / 100), // Use consistent batch size
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
        
        // Query for all documents that start with the account number
        const detailedLeviedCollection = collection(db, 'detailed_levied');
        const q = query(detailedLeviedCollection, where('accountNumber', '==', accountNumber));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No detailed levied data found for account number: ${accountNumber}`);
            return [];
        }

        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];

        // Process all documents for this account (there might be multiple uploads)
        for (const docSnapshot of querySnapshot.docs) {
            // Get all records from the subcollection of each document
            const recordsCollection = collection(docSnapshot.ref, 'records');
            const recordsSnapshot = await getDocs(recordsCollection);
            
            // Process all records from this upload
            recordsSnapshot.forEach((recordDoc) => {
                const record = recordDoc.data() as DetailedLevied;
                accountDetails.push({
                    code: record.TARIFF_CODE || 'N/A',
                    description: record.TOS_DESC || 'N/A',
                    units: '1', // Adding a default units value
                    tariff: record.TOS_DESC || 'N/A',
                    value: record.M202409 || 0,
                    date: currentDate
                });
            });
        }

        console.log(`Found ${accountDetails.length} detailed levied records for account ${accountNumber}`);
        return accountDetails;
    } catch (error) {
        console.error('Error fetching detailed levied data:', error);
        return [];
    }
};
