import { collection, writeBatch, doc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface DetailedAgedAnalysis {
    ACCOUNT_NO: string;
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
    return collection(db, 'detailed_aged_analysis', year, month);
};

export const uploadDetailedAgedAnalysis = async (records: DetailedAgedAnalysis[], uploadDate: string, progressCallback?: (progress: number) => void): Promise<UploadResult> => {
    try {
        // Check if db is initialized
        if (!db) {
            throw new Error('Firebase Firestore is not initialized');
        }
        
        // Get collection reference using helper function
        const monthCollectionRef = getMonthCollectionRef(uploadDate);
        
        // Extract year and month for logging and additional fields
        const { year, month } = validateAndFormatDate(uploadDate);
        
        console.log(`Uploading to collection: detailed_aged_analysis/${year}/${month}`);

        // Group records by account number
        const recordsByAccount: { [accountNumber: string]: DetailedAgedAnalysis[] } = {};
        let skippedRecords = 0;
        
        for (const record of records) {
            const accountNumber = String(record.ACCOUNT_NO).trim();
            
            // Skip records with empty or invalid account numbers
            if (!accountNumber || accountNumber === '' || accountNumber === 'undefined' || accountNumber === 'null') {
                console.warn('Skipping record with empty/invalid account number:', record);
                skippedRecords++;
                continue;
            }
            
            if (!recordsByAccount[accountNumber]) {
                recordsByAccount[accountNumber] = [];
            }
            recordsByAccount[accountNumber].push(record);
        }
        
        if (skippedRecords > 0) {
            console.warn(`Skipped ${skippedRecords} records with empty/invalid account numbers`);
        }
        
        console.log(`Grouped ${records.length} records into ${Object.keys(recordsByAccount).length} unique accounts`);
        
        const batch = writeBatch(db);
        let count = 0;
        let failed = 0;
        let batchCount = 0;
        const batchSize = 500; // Firestore batch limit
        const totalAccounts = Object.keys(recordsByAccount).length;
        
        // Process each account
        for (const [accountNumber, accountRecords] of Object.entries(recordsByAccount)) {
            try {
                // Validate account number before using as document ID
                if (!accountNumber || accountNumber.trim() === '') {
                    console.warn('Skipping account with empty account number:', accountRecords[0]);
                    failed += accountRecords.length;
                    continue;
                }
                
                const sanitizedAccountNumber = accountNumber.trim();
                
                // Use account number as document ID
                const docRef = doc(monthCollectionRef, sanitizedAccountNumber);
                
                // If there's only one record for this account, store it directly
                if (accountRecords.length === 1) {
                    batch.set(docRef, {
                        ...accountRecords[0],
                        accountNumber: sanitizedAccountNumber,
                        uploadDate,
                        uploadedAt: new Date().toISOString()
                    });
                } else {
                    // If there are multiple records, store them in a records array
                    batch.set(docRef, {
                        accountNumber: sanitizedAccountNumber,
                        uploadDate,
                        uploadedAt: new Date().toISOString(),
                        records: accountRecords
                    });
                }
                
                count++;
                batchCount++;
                
                // Report progress
                if (progressCallback) {
                    progressCallback(Math.round((count / totalAccounts) * 100));
                }
                
                // Commit batch when it reaches the limit
                if (batchCount >= batchSize) {
                    await batch.commit();
                    console.log(`Committed batch: ${count}/${totalAccounts}`);
                    batchCount = 0;
                }
            } catch (error) {
                console.error(`Error processing account ${accountNumber}:`, error);
                failed += accountRecords.length;
            }
        }
        
        // Commit any remaining records
        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch: ${count}/${totalAccounts}`);
        }

        return {
            success: true,
            message: `Successfully uploaded ${count} records for ${month}/${year}`,
            totalRecords: count,
            failedRecords: failed
        };
    } catch (error) {
        console.error('Error uploading detailed aged analysis:', error);
        return {
            success: false,
            message: `Failed to upload detailed aged analysis data: ${error instanceof Error ? error.message : 'Unknown error'}`,
            totalRecords: 0,
            failedRecords: records.length
        };
    }
};

export const getAgingAnalysisForCustomer = async (accountNumber: string): Promise<AgingAnalysisData> => {
    try {
        // Check if db is initialized
        if (!db) {
            console.error('Firebase Firestore is not initialized');
            return {
                hundredTwentyPlusDays: 0,
                ninetyDays: 0,
                sixtyDays: 0,
                thirtyDays: 0,
                current: 0,
                closingBalance: 0
            };
        }
        
        console.log('Fetching aging analysis for account:', accountNumber);
        
        // Initialize aging data
        let agingData: AgingAnalysisData = {
            hundredTwentyPlusDays: 0,
            ninetyDays: 0,
            sixtyDays: 0,
            thirtyDays: 0,
            current: 0,
            closingBalance: 0
        };
        
        let foundData = false;
        
        // First, try to get data directly from 2024/10 (most likely location)
        try {
            console.log('Trying to fetch directly from detailed_aged_analysis/2024/10/');
            const docRef = doc(db, 'detailed_aged_analysis', '2024', '10', accountNumber);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                foundData = true;
                const data = docSnap.data();
                console.log(`Found aging data for 2024-10:`, data);
                
                // Check if this document has a records array (multiple records)
                if (data.records && Array.isArray(data.records)) {
                    // Process each record in the array
                    data.records.forEach((record: DetailedAgedAnalysis) => {
                        agingData.hundredTwentyPlusDays += Number(record['120 DAY FACTOR']) || 0;
                        agingData.ninetyDays += Number(record['90 DAY FACTOR']) || 0;
                        agingData.sixtyDays += Number(record['60 DAY FACTOR']) || 0;
                        agingData.thirtyDays += Number(record['UP TO 30 DAY FACTOR']) || 0;
                        agingData.current += Number(record['202407']) || 0;  // Current month
                    });
                } else {
                    // Process single record document
                    agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                    agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                    agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                    agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                    agingData.current += Number(data['202407']) || 0;  // Current month
                }
            } else {
                console.log('No data found in detailed_aged_analysis/2024/10/');
            }
        } catch (error) {
            console.error('Error fetching from detailed_aged_analysis/2024/10/:', error);
        }
        
        // If no data found in 2024/10, try searching other years/months
        if (!foundData) {
            console.log('Searching other years/months...');
            
            // Get all year collections
            const rootCollection = collection(db, 'detailed_aged_analysis');
            const yearCollections = await getDocs(rootCollection);
            
            // Sort years in descending order to get the most recent first
            const years = yearCollections.docs
                .map(doc => doc.id)
                .filter(year => !isNaN(Number(year)) && Number(year) >= 2024)
                .sort((a, b) => Number(b) - Number(a));
                
            console.log('Available years:', years);
            
            // Iterate through years and months to find the account
            for (const year of years) {
                const yearCollection = collection(db, 'detailed_aged_analysis', year);
                const monthCollections = await getDocs(yearCollection);
                
                // Sort months in descending order to get the most recent first
                const months = monthCollections.docs
                    .map(doc => doc.id)
                    .filter(month => !isNaN(Number(month)) && Number(month) >= 1 && Number(month) <= 12)
                    .sort((a, b) => Number(b) - Number(a));
                    
                console.log(`Available months for ${year}:`, months);
                
                for (const month of months) {
                    // Skip 2024/10 since we already checked it
                    if (year === '2024' && month === '10') continue;
                    
                    // Try to get the document directly using the account number as ID
                    const docRef = doc(db, 'detailed_aged_analysis', year, month, accountNumber);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        foundData = true;
                        const data = docSnap.data();
                        console.log(`Found aging data for ${year}-${month}:`, data);
                        
                        // Check if this document has a records array (multiple records)
                        if (data.records && Array.isArray(data.records)) {
                            // Process each record in the array
                            data.records.forEach((record: DetailedAgedAnalysis) => {
                                agingData.hundredTwentyPlusDays += Number(record['120 DAY FACTOR']) || 0;
                                agingData.ninetyDays += Number(record['90 DAY FACTOR']) || 0;
                                agingData.sixtyDays += Number(record['60 DAY FACTOR']) || 0;
                                agingData.thirtyDays += Number(record['UP TO 30 DAY FACTOR']) || 0;
                                agingData.current += Number(record['202407']) || 0;  // Current month
                            });
                        } else {
                            // Process single record document
                            agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                            agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                            agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                            agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                            agingData.current += Number(data['202407']) || 0;  // Current month
                        }
                        
                        // If we found data for this account, we can stop searching
                        // In a real app, you might want to aggregate data across multiple months
                        break;
                    }
                }
                
                // If we found data for this account in the most recent year, we can stop searching
                if (foundData) break;
            }
        }
        
        // Fallback: If no data found in the new structure, try the legacy collection
        if (!foundData) {
            const legacyCollection = collection(db, 'detailed_aged_analysis');
            // Try both string and number formats for backward compatibility
            const legacyQuery = query(legacyCollection, where('ACCOUNT_NO', '==', accountNumber));
            const legacySnapshot = await getDocs(legacyQuery);
            
            if (!legacySnapshot.empty) {
                foundData = true;
                legacySnapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log('Found legacy aging data:', data);

                    // Read the exact fields from the database
                    agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                    agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                    agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                    agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                    agingData.current += Number(data['202407']) || 0;  // Current month
                });
            }
        }
        
        // Calculate closing balance as sum of all periods
        agingData.closingBalance = 
            agingData.hundredTwentyPlusDays +
            agingData.ninetyDays +
            agingData.sixtyDays +
            agingData.thirtyDays +
            agingData.current;

        if (foundData) {
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
