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

/**
 * Validates and formats a date string in YYYY-MM format
 * @param dateString Date string in YYYY-MM format
 * @returns Object containing year and month
 */
export const validateAndFormatDate = (dateString: string): { year: string; month: string } => {
    const dateMatch = dateString.match(/^(\d{4})-(\d{2})$/);
    if (!dateMatch) {
        throw new Error('Invalid date format. Expected YYYY-MM');
    }

    const [_, year, month] = dateMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate year range
    if (yearNum < 2024) {
        throw new Error('Year must be 2024 or later');
    }

    // Validate month range
    if (monthNum < 1 || monthNum > 12) {
        throw new Error('Month must be between 1 and 12');
    }

    return { year, month };
};

/**
 * Gets a reference to the collection for a specific month
 * @param dateString Date string in YYYY-MM format
 * @returns Firestore collection reference
 */
export const getMonthCollectionRef = (dateString: string) => {
    // Check if db is initialized
    if (!db) {
        throw new Error('Firebase Firestore is not initialized');
    }
    
    const { year, month } = validateAndFormatDate(dateString);
    return collection(db, 'detailed_levied', year, month);
};

export const uploadDetailedLevied = async (
    records: DetailedLevied[],
    uploadDate: string,
    progressCallback?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
    try {
        // Check if db is initialized
        if (!db) {
            throw new Error('Firebase Firestore is not initialized');
        }
        
        // Get collection reference using helper function
        const monthCollectionRef = getMonthCollectionRef(uploadDate);
        
        // Extract year and month for logging and additional fields
        const { year, month } = validateAndFormatDate(uploadDate);
        
        console.log(`Uploading to collection: detailed_levied/${year}/${month}`);
        let totalProcessed = 0;
        let failedRecords = 0;
        let processedBatches = 0;
        const totalRecords = records.length;
        
        // Use a smaller batch size to prevent transaction too big errors
        const MAX_BATCH_SIZE = 100; // Reduced from 500 to 100

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
                // Process records in batches to avoid transaction too large errors
                for (let j = 0; j < accountRecords.length; j += MAX_BATCH_SIZE) {
                    const batch = writeBatch(db);
                    const batchRecords = accountRecords.slice(j, j + MAX_BATCH_SIZE);
                    let batchSize = 0;
                    
                    // Add each record to the batch with its own document
                    for (const record of batchRecords) {
                        const recordDoc = doc(monthCollectionRef);
                        batch.set(recordDoc, {
                            ...record,
                            accountNumber, // Add account number for easier querying
                            uploadDate,    // Add the selected month
                            uploadedAt: new Date().toISOString()
                        });
                        
                        batchSize++;
                    }
                    
                    // Commit this batch
                    await batch.commit();
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
        
        // Initialize result array
        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];
        
        // For backward compatibility, first check the legacy flat collection
        const legacyCollection = collection(db, 'detailed_levied');
        const legacyQuery = query(legacyCollection, where('accountNumber', '==', accountNumber));
        const legacySnapshot = await getDocs(legacyQuery);
        
        if (!legacySnapshot.empty) {
            console.log(`Found legacy detailed levied data for account number: ${accountNumber}`);
            
            // Process legacy data format (with subcollections)
            for (const docSnapshot of legacySnapshot.docs) {
                try {
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
                } catch (error) {
                    console.error('Error processing legacy detailed levied data:', error);
                }
            }
        }
        
        // Now check the new nested year/month collections
        // Note: In a real implementation, you might want to query specific months based on user selection
        // For now, we'll just use the current month
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        
        try {
            const nestedCollection = collection(db, 'detailed_levied', year, month);
            const nestedQuery = query(nestedCollection, where('accountNumber', '==', accountNumber));
            const nestedSnapshot = await getDocs(nestedQuery);
            
            if (!nestedSnapshot.empty) {
                console.log(`Found ${nestedSnapshot.size} detailed levied records in ${year}/${month} for account ${accountNumber}`);
                
                nestedSnapshot.forEach((doc) => {
                    const record = doc.data() as DetailedLevied;
                    accountDetails.push({
                        code: record.TARIFF_CODE || 'N/A',
                        description: record.TOS_DESC || 'N/A',
                        units: '1',
                        tariff: record.TOS_DESC || 'N/A',
                        value: record.M202409 || 0, // Use the current month's value
                        date: currentDate
                    });
                });
            }
        } catch (error) {
            console.error(`Error querying nested collection for ${year}/${month}:`, error);
        }

        console.log(`Found ${accountDetails.length} detailed levied records for account ${accountNumber}`);
        return accountDetails;
    } catch (error) {
        console.error('Error fetching detailed levied data:', error);
        return [];
    }
};
