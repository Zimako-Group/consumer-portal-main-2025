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

const BATCH_SIZE = 25; // Optimized batch size to prevent rate limiting
const BATCH_DELAY = 1000; // 1 second delay between batches
const MAX_RETRIES = 3; // Maximum retry attempts per batch

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

/**
 * Helper function to implement exponential backoff delay
 */
const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Helper function to commit a batch with comprehensive retry logic
 */
const commitBatchWithRetry = async (
    batch: any, 
    batchNumber: number, 
    totalBatches: number, 
    maxRetries: number = MAX_RETRIES
): Promise<void> => {
    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
        try {
            await batch.commit();
            console.log(`✅ Committed batch ${batchNumber}/${totalBatches}`);
            return;
        } catch (error: any) {
            const isRateLimited = 
                error?.code === 'resource-exhausted' || 
                error?.message?.includes('rate') ||
                error?.message?.includes('quota') ||
                error?.message?.includes('limit') ||
                error?.message?.includes('write stream');
            
            if (isRateLimited && retryCount < maxRetries) {
                retryCount++;
                const backoffDelay = Math.min(2000 * Math.pow(2, retryCount - 1), 10000); // Max 10 seconds
                console.log(`⚠️ Rate limited on batch ${batchNumber}, retrying in ${backoffDelay/1000} seconds... (attempt ${retryCount}/${maxRetries})`);
                await delay(backoffDelay);
            } else {
                console.error(`❌ Failed to commit batch ${batchNumber} after ${retryCount} retries:`, error);
                throw error;
            }
        }
    }
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
        
        console.log(`📤 Starting upload to collection: detailed_levied/${year}/${month}`);
        let totalProcessed = 0;
        let failedRecords = 0;
        let processedBatches = 0;
        const totalRecords = records.length;
        
        // Group records by account number but preserve all individual records
        const recordsByAccount: { [accountNumber: string]: DetailedLevied[] } = {};
        let skippedRecords = 0;
        
        for (const record of records) {
            const accountNumber = record.ACCOUNT_NO?.toString().trim();
            if (!accountNumber || accountNumber === '') {
                console.warn('⚠️ Skipping record with empty account number:', record);
                skippedRecords++;
                continue;
            }
            
            if (!recordsByAccount[accountNumber]) {
                recordsByAccount[accountNumber] = [];
            }
            recordsByAccount[accountNumber].push(record);
        }
        
        if (skippedRecords > 0) {
            console.warn(`⚠️ Skipped ${skippedRecords} records with empty/invalid account numbers`);
        }

        console.log(`📊 Grouped ${records.length} records into ${Object.keys(recordsByAccount).length} unique accounts`);

        // Process records by account number - create one document per account with nested records
        const accountNumbers = Object.keys(recordsByAccount);
        const totalBatches = Math.ceil(accountNumbers.length / BATCH_SIZE);
        
        console.log(`🚀 Starting upload of ${accountNumbers.length} unique accounts in ${totalBatches} batches...`);
        console.log(`⚙️ Batch size: ${BATCH_SIZE} accounts, Delay: ${BATCH_DELAY}ms between batches`);
        
        for (let i = 0; i < accountNumbers.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const batchAccountNumbers = accountNumbers.slice(i, i + BATCH_SIZE);
            const currentBatchNumber = processedBatches + 1;
            
            try {
                for (const accountNumber of batchAccountNumbers) {
                    const accountRecords = recordsByAccount[accountNumber];
                    
                    // Validate account number before using as document ID
                    if (!accountNumber || accountNumber.trim() === '') {
                        console.warn('⚠️ Skipping account with empty account number:', accountRecords[0]);
                        failedRecords += accountRecords.length;
                        continue;
                    }
                    
                    const sanitizedAccountNumber = accountNumber.trim();
                    
                    // Use account number as document ID
                    const accountDoc = doc(monthCollectionRef, sanitizedAccountNumber);
                    
                    // Create the document data with all records nested
                    const documentData: any = {
                        accountNumber: sanitizedAccountNumber,
                        uploadDate,
                        uploadedAt: new Date().toISOString(),
                        totalRecords: accountRecords.length,
                        records: accountRecords // Store all individual records in an array
                    };
                    
                    batch.set(accountDoc, documentData);
                    totalProcessed += accountRecords.length;
                }
                
                // Commit this batch with enhanced retry logic
                try {
                    await commitBatchWithRetry(batch, currentBatchNumber, totalBatches);
                    processedBatches++;
                    console.log(`📈 Progress: ${Math.min(i + BATCH_SIZE, accountNumbers.length)}/${accountNumbers.length} accounts processed (${Math.round((processedBatches / totalBatches) * 100)}%)`);
                    
                    // Report progress
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
                    
                    // Add delay between batches to prevent rate limiting (except for last batch)
                    if (i + BATCH_SIZE < accountNumbers.length) {
                        console.log(`⏱️ Waiting ${BATCH_DELAY}ms before next batch...`);
                        await delay(BATCH_DELAY);
                    }
                } catch (error) {
                    console.error(`❌ Failed to commit batch ${currentBatchNumber}:`, error);
                    // Count failed records in this batch
                    for (const accountNumber of batchAccountNumbers) {
                        failedRecords += recordsByAccount[accountNumber].length;
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error processing batch ${currentBatchNumber}:`, error);
                // Count failed records in this batch
                for (const accountNumber of batchAccountNumbers) {
                    failedRecords += recordsByAccount[accountNumber].length;
                }
            }
        }

        const successfulRecords = totalProcessed - failedRecords;
        console.log(`🎉 Upload complete! Total records processed: ${totalProcessed}, Successful: ${successfulRecords}, Failed: ${failedRecords}`);

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
            success: successfulRecords > 0,
            message: failedRecords > 0 
                ? `Uploaded ${successfulRecords} records for ${month}/${year} (${failedRecords} failed due to rate limiting)` 
                : `Successfully uploaded ${successfulRecords} records for ${month}/${year}`,
            totalRecords: successfulRecords,
            failedRecords,
            processedBatches
        };
    } catch (error) {
        console.error('❌ Error uploading detailed levied:', error);
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
        
        console.log(`📋 Fetching detailed levied data for account ${accountNumber} in ${year}/${month}`);
        console.log(`📂 Collection path: detailed_levied/${year}/${month.padStart(2, '0')}`);
        
        // Initialize result array
        const accountDetails: AccountDetailsData[] = [];
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Try to get the document directly using the account number as document ID
        // Records are now nested in a 'records' array within the account document
        try {
            const monthCollectionRef = getMonthCollectionRef(`${year}-${month.padStart(2, '0')}`);
            console.log(`🔍 Querying collection reference for: ${year}-${month.padStart(2, '0')}`);
            const docSnap = await getDocs(monthCollectionRef);
            
            console.log(`📊 Found ${docSnap.size} documents in collection detailed_levied/${year}/${month.padStart(2, '0')}`);
            if (docSnap.size === 0) {
                console.log(`⚠️ No documents found in collection - this might indicate no data uploaded for ${year}/${month}`);
                
                // Let's also check if there are any documents in the year collection
                console.log('🔍 Checking what collections exist in the year level...');
                try {
                    const yearCollectionRef = collection(db, 'detailed_levied', year);
                    const yearDocSnap = await getDocs(yearCollectionRef);
                    console.log(`📊 Found ${yearDocSnap.size} documents/subcollections in detailed_levied/${year}`);
                    
                    if (!yearDocSnap.empty) {
                        console.log('📝 Documents found in year collection:');
                        yearDocSnap.forEach((doc) => {
                            console.log(`  - Document ID: ${doc.id}`);
                        });
                    }
                } catch (yearError) {
                    console.log('❌ Error checking year collection:', yearError);
                }
            }
            
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
