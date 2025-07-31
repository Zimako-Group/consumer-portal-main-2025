import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
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
        
        // Use a much smaller batch size to prevent rate limiting
        const MAX_BATCH_SIZE = 25; // Reduced to 25 to prevent write stream exhaustion

        // Group records by account number but preserve all individual records
        const recordsByAccount: { [accountNumber: string]: DetailedLevied[] } = {};
        
        for (const record of records) {
            const accountNumber = record.ACCOUNT_NO?.toString().trim();
            if (!accountNumber || accountNumber === '') {
                console.warn('Skipping record with empty account number:', record);
                failedRecords++;
                continue;
            }
            
            if (!recordsByAccount[accountNumber]) {
                recordsByAccount[accountNumber] = [];
            }
            recordsByAccount[accountNumber].push(record);
        }

        console.log(`Grouped ${records.length} records into ${Object.keys(recordsByAccount).length} unique accounts`);

        // Process records by account number - create one document per account with nested records
        const accountNumbers = Object.keys(recordsByAccount);
        const totalBatches = Math.ceil(accountNumbers.length / MAX_BATCH_SIZE);
        
        for (let i = 0; i < accountNumbers.length; i += MAX_BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchAccountNumbers = accountNumbers.slice(i, i + MAX_BATCH_SIZE);
            
            try {
                for (const accountNumber of batchAccountNumbers) {
                    const accountRecords = recordsByAccount[accountNumber];
                    
                    // Use account number as document ID
                    const accountDoc = doc(monthCollectionRef, accountNumber);
                    
                    // Create the document data with all records nested
                    const documentData: any = {
                        accountNumber: accountNumber,
                        uploadDate,
                        uploadedAt: new Date().toISOString(),
                        totalRecords: accountRecords.length,
                        records: accountRecords // Store all individual records in an array
                    };
                    
                    batch.set(accountDoc, documentData);
                    totalProcessed += accountRecords.length;
                }
                
                // Commit this batch with retry logic
                let retryCount = 0;
                const maxRetries = 3;
                let batchCommitted = false;
                
                while (!batchCommitted && retryCount < maxRetries) {
                    try {
                        await batch.commit();
                        batchCommitted = true;
                        processedBatches++;
                        console.log(`Committed batch ${processedBatches}/${totalBatches}: ${Math.min(i + MAX_BATCH_SIZE, accountNumbers.length)}/${accountNumbers.length} accounts processed`);
                    } catch (commitError: any) {
                        retryCount++;
                        if (commitError.code === 'resource-exhausted' && retryCount < maxRetries) {
                            console.warn(`Rate limited on batch ${processedBatches + 1}, retrying in ${retryCount * 2} seconds... (attempt ${retryCount}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, retryCount * 2000)); // Exponential backoff
                        } else {
                            throw commitError; // Re-throw if not rate limiting or max retries reached
                        }
                    }
                }
                
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
                
                // Add a longer delay between batches to prevent rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000)); // Increased to 1 second
                
            } catch (error) {
                console.error(`Error processing batch ${processedBatches + 1}:`, error);
                // Count failed records in this batch
                for (const accountNumber of batchAccountNumbers) {
                    failedRecords += recordsByAccount[accountNumber].length;
                }
            }
        }

        if (progressCallback) {
            progressCallback({
                totalRecords,
                processedRecords: totalProcessed,
                failedRecords,
                currentBatch: processedBatches,
                totalBatches: Math.ceil(accountNumbers.length / MAX_BATCH_SIZE),
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

export const getDetailedLeviedForCustomer = async (accountNumber: string, year: string, month: string): Promise<AccountDetailsData[]> => {
    try {
        // Check if db is initialized
        if (!db) {
            console.error('Firebase Firestore is not initialized');
            return [];
        }
        
        console.log(`Fetching detailed levied data for account ${accountNumber} in ${year}/${month}`);
        
        // Initialize result array
        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Try to get the document directly using the account number as document ID
        // Records are now nested in a 'records' array within the account document
        try {
            const monthCollectionRef = getMonthCollectionRef(`${year}-${month.padStart(2, '0')}`);
            const docSnap = await getDocs(monthCollectionRef);
            
            console.log(`Searching for account ${accountNumber} in ${docSnap.size} documents`);
            
            // Look for the account document
            docSnap.forEach((doc: any) => {
                const data = doc.data();
                
                // Check if this is our account document
                if (data.accountNumber === accountNumber) {
                    console.log(`Found account document for ${accountNumber} with ${data.totalRecords || 0} records`);
                    
                    // Process all nested records
                    if (data.records && Array.isArray(data.records)) {
                        data.records.forEach((record: DetailedLevied) => {
                            accountDetails.push({
                                code: record.TARIFF_CODE || 'N/A',
                                description: record.TOS_DESC || 'N/A',
                                units: '1',
                                tariff: record.TOS_DESC || 'N/A',
                                value: getDynamicMonthValue(record, year, month) || 0,
                                date: currentDate
                            });
                        });
                    }
                }
            });
            
            if (accountDetails.length === 0) {
                console.log(`No detailed levied data found for account ${accountNumber} in ${year}/${month}`);
            } else {
                console.log(`Found ${accountDetails.length} detailed levied records for account ${accountNumber}`);
            }
        } catch (error) {
            console.error(`Error fetching account document for ${accountNumber}:`, error);
        }
        
        // Do NOT fall back to legacy collections - we want to strictly use data for the selected month/year
        if (accountDetails.length === 0) {
            console.log(`No detailed levied data found for account ${accountNumber} in ${year}/${month} - NOT falling back to legacy collection`);
        }
        console.log(`Found ${accountDetails.length} detailed levied records for account ${accountNumber}`);
        return accountDetails;
    } catch (error) {
        console.error('Error fetching detailed levied data:', error);
        return [];
    }
};

/**
 * Helper function to get the value for a specific month/year from a DetailedLevied record
 * @param record The DetailedLevied record
 * @param year The year (e.g., '2024')
 * @param month The month (e.g., '10')
 * @returns The value for the specified month/year or 0 if not found
 */
const getDynamicMonthValue = (record: DetailedLevied, year: string, month: string): number => {
    // Format the month field name (e.g., M202410 for October 2024)
    const monthFieldName = `M${year}${month.padStart(2, '0')}`;
    
    // Log the field name we're looking for
    console.log(`Looking for field ${monthFieldName} in record:`, Object.keys(record));
    
    // Check if the field exists in the record
    if (monthFieldName in record) {
        const value = (record as any)[monthFieldName] || 0;
        console.log(`Found value ${value} for ${monthFieldName}`);
        return value;
    }
    
    console.log(`Field ${monthFieldName} not found in record, returning 0`);
    return 0;
};
