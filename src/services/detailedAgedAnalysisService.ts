import { collection, writeBatch, doc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface DetailedAgedAnalysis {
    ACCOUNT_NO: string;
    '120 DAY FACTOR': number;
    '90 DAY FACTOR': number;
    '60 DAY FACTOR': number;
    'UP TO 30 DAY FACTOR': number;
    TOTAL: number;
    uploadedAt: string;
    // Dynamic month fields (e.g., '202407', '202410', etc.)
    [key: string]: string | number;
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
        
        let batch = writeBatch(db);
        let count = 0;
        let failed = 0;
        let batchCount = 0;
        const batchSize = 500; // Firestore batch limit
        const totalAccounts = Object.keys(recordsByAccount).length;
        
        console.log(`Starting upload of ${totalAccounts} unique accounts...`);
        
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
                
                // Commit batch when it reaches the limit and create a new batch
                if (batchCount >= batchSize) {
                    await batch.commit();
                    console.log(`Committed batch ${Math.ceil(count / batchSize)}: ${count}/${totalAccounts} accounts processed`);
                    
                    // Create a new batch for the next set of records
                    batch = writeBatch(db);
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
            console.log(`Committed final batch: ${count}/${totalAccounts} accounts processed`);
        }
        
        console.log(`Upload complete! Total accounts processed: ${count}, Failed: ${failed}`);

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

export const getAgingAnalysisForCustomer = async (accountNumber: string, year: string, month: string): Promise<AgingAnalysisData> => {
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
        
        console.log('=== AGING ANALYSIS FETCH START ===');
        console.log('Account Number:', accountNumber);
        console.log('Account Number Type:', typeof accountNumber);
        console.log('Year:', year, 'Month:', month);
        
        // Normalize account number - trim and convert to string
        const normalizedAccountNumber = String(accountNumber).trim();
        
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
        
        // Try multiple account number variations to handle different storage formats
        const accountVariations = [
            normalizedAccountNumber,
            accountNumber, // Original as passed
            String(accountNumber).trim(),
            accountNumber.toString().trim()
        ].filter((acc, index, arr) => arr.indexOf(acc) === index); // Remove duplicates
        
        console.log('Account number variations to try:', accountVariations);
        
        // First, let's see what documents exist in the target collection
        try {
            const monthCollectionRef = getMonthCollectionRef(`${year}-${month.padStart(2, '0')}`);
            const collectionSnapshot = await getDocs(monthCollectionRef);
            console.log(`📁 Documents in detailed_aged_analysis/${year}/${month}:`);
            collectionSnapshot.docs.forEach(doc => {
                console.log(`  - Document ID: '${doc.id}', Data:`, doc.data());
            });
        } catch (error) {
            console.error('Error listing collection documents:', error);
        }
        
        // Try to get data from the specified year/month
        for (const accVar of accountVariations) {
            try {
                console.log(`🔍 Trying to fetch from detailed_aged_analysis/${year}/${month}/${accVar}`);
                const docRef = doc(db, 'detailed_aged_analysis', year, month, accVar);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    foundData = true;
                    const data = docSnap.data();
                    console.log(`✅ Found aging data for ${year}-${month} with account variation '${accVar}':`, data);
                    console.log('Document data keys:', Object.keys(data));
                    console.log('Document data structure:', JSON.stringify(data, null, 2));
                
                // Check if this document has a records array (multiple records)
                if (data.records && Array.isArray(data.records)) {
                    // Process each record in the array
                    data.records.forEach((record: DetailedAgedAnalysis) => {
                        agingData.hundredTwentyPlusDays += Number(record['120 DAY FACTOR']) || 0;
                        agingData.ninetyDays += Number(record['90 DAY FACTOR']) || 0;
                        agingData.sixtyDays += Number(record['60 DAY FACTOR']) || 0;
                        agingData.thirtyDays += Number(record['UP TO 30 DAY FACTOR']) || 0;
                        // Get the current month value dynamically
                        const currentMonthField = `${year}${month.padStart(2, '0')}`;
                        agingData.current += Number((record as any)[currentMonthField]) || 0;  // Current month
                    });
                } else {
                    // Process single record document
                    agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                    agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                    agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                    agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                    // Get the current month value dynamically
                    const currentMonthField = `${year}${month.padStart(2, '0')}`;
                    agingData.current += Number((data as any)[currentMonthField]) || 0;  // Current month
                }
                
                // Break out of the loop since we found data
                break;
            } else {
                console.log(`❌ No data found for account variation '${accVar}' in detailed_aged_analysis/${year}/${month}/`);
            }
        } catch (error) {
            console.error(`Error fetching account variation '${accVar}' from detailed_aged_analysis/${year}/${month}/:`, error);
        }
    }
        
        // If no data found in the requested year/month, try searching other years/months
        if (!foundData) {
            console.log('Searching other years/months...');
            
            // Store original parameters for comparison
            const originalYear = year;
            const originalMonth = month.padStart(2, '0');
            
            // Get all year collections
            const rootCollection = collection(db, 'detailed_aged_analysis');
            const yearCollections = await getDocs(rootCollection);
            
            // Sort years in descending order to get the most recent first
            const years = yearCollections.docs
                .map(doc => doc.id)
                .filter(yearId => !isNaN(Number(yearId)) && Number(yearId) >= 2024)
                .sort((a, b) => Number(b) - Number(a));
                
            console.log('Available years:', years);
            
            // Iterate through years and months to find the account
            for (const yearId of years) {
                const yearCollection = collection(db, 'detailed_aged_analysis', yearId);
                const monthCollections = await getDocs(yearCollection);
                
                // Sort months in descending order to get the most recent first
                const months = monthCollections.docs
                    .map(doc => doc.id)
                    .filter(monthId => !isNaN(Number(monthId)) && Number(monthId) >= 1 && Number(monthId) <= 12)
                    .sort((a, b) => Number(b) - Number(a));
                    
                console.log(`Available months for ${yearId}:`, months);
                
                for (const monthId of months) {
                    // Skip the originally requested year/month since we already checked it
                    if (yearId === originalYear && monthId.padStart(2, '0') === originalMonth) continue;
                    
                    // Try all account number variations for this year/month
                    for (const accVar of accountVariations) {
                        try {
                            console.log(`Fallback: Trying ${yearId}/${monthId}/${accVar}`);
                            const docRef = doc(db, 'detailed_aged_analysis', yearId, monthId, accVar);
                            const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        foundData = true;
                        const data = docSnap.data();
                        console.log(`Found aging data for ${yearId}-${monthId}:`, data);
                        
                        // Check if this document has a records array (multiple records)
                        if (data.records && Array.isArray(data.records)) {
                            // Process each record in the array
                            data.records.forEach((record: DetailedAgedAnalysis) => {
                                agingData.hundredTwentyPlusDays += Number(record['120 DAY FACTOR']) || 0;
                                agingData.ninetyDays += Number(record['90 DAY FACTOR']) || 0;
                                agingData.sixtyDays += Number(record['60 DAY FACTOR']) || 0;
                                agingData.thirtyDays += Number(record['UP TO 30 DAY FACTOR']) || 0;
                                // Get the current month value dynamically
                                const currentMonthField = `${yearId}${monthId.padStart(2, '0')}`;
                                agingData.current += Number((record as any)[currentMonthField]) || 0;  // Current month
                            });
                        } else {
                            // Process single record document
                            agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                            agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                            agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                            agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                            // Get the current month value dynamically
                            const currentMonthField = `${yearId}${monthId.padStart(2, '0')}`;
                            agingData.current += Number((data as any)[currentMonthField]) || 0;  // Current month
                        }
                        
                        // If we found data for this account, we can stop searching
                        // In a real app, you might want to aggregate data across multiple months
                        break;
                    }
                } catch (error) {
                    console.error(`Error in fallback search for ${yearId}/${monthId}/${accVar}:`, error);
                }
            }
            
            // If we found data, break out of the month loop
            if (foundData) break;
        }
                
                // If we found data for this account in the most recent year, we can stop searching
                if (foundData) break;
            }
        }
        
        // Final fallback: Try to find the document using collection queries
        // This handles cases where the account number might be stored in a field rather than as document ID
        if (!foundData) {
            console.log('Final fallback: Searching collection for account number in fields...');
            try {
                const monthCollectionRef = getMonthCollectionRef(`${year}-${month.padStart(2, '0')}`);
                const querySnapshot = await getDocs(monthCollectionRef);
                
                console.log(`Found ${querySnapshot.docs.length} documents in ${year}/${month} collection`);
                
                for (const docSnap of querySnapshot.docs) {
                    const data = docSnap.data();
                    
                    // Check if this document matches any of our account number variations
                    const docAccountNumber = data.ACCOUNT_NO || data.accountNumber;
                    if (docAccountNumber && accountVariations.includes(String(docAccountNumber).trim())) {
                        console.log(`✅ Found matching document via collection query:`, docSnap.id, data);
                        foundData = true;
                        
                        // Process the data same as before
                        if (data.records && Array.isArray(data.records)) {
                            data.records.forEach((record: DetailedAgedAnalysis) => {
                                agingData.hundredTwentyPlusDays += Number(record['120 DAY FACTOR']) || 0;
                                agingData.ninetyDays += Number(record['90 DAY FACTOR']) || 0;
                                agingData.sixtyDays += Number(record['60 DAY FACTOR']) || 0;
                                agingData.thirtyDays += Number(record['UP TO 30 DAY FACTOR']) || 0;
                                const currentMonthField = `${year}${month.padStart(2, '0')}`;
                                agingData.current += Number((record as any)[currentMonthField]) || 0;
                            });
                        } else {
                            agingData.hundredTwentyPlusDays += Number(data['120 DAY FACTOR']) || 0;
                            agingData.ninetyDays += Number(data['90 DAY FACTOR']) || 0;
                            agingData.sixtyDays += Number(data['60 DAY FACTOR']) || 0;
                            agingData.thirtyDays += Number(data['UP TO 30 DAY FACTOR']) || 0;
                            const currentMonthField = `${year}${month.padStart(2, '0')}`;
                            agingData.current += Number((data as any)[currentMonthField]) || 0;
                        }
                        break;
                    }
                }
            } catch (error) {
                console.error('Error in final fallback search:', error);
            }
        }
        
        if (!foundData) {
            console.log(`❌ No aging data found for account ${accountNumber} in ${year}/${month} after all searches`);
            console.log('Account variations tried:', accountVariations);
        }

        // Calculate closing balance as sum of all periods
        agingData.closingBalance = 
            agingData.hundredTwentyPlusDays +
            agingData.ninetyDays +
            agingData.sixtyDays +
            agingData.thirtyDays +
            agingData.current;

        console.log('=== AGING ANALYSIS FETCH COMPLETE ===');
        if (foundData) {
            console.log('✅ SUCCESS: Found and processed aging data for account:', accountNumber);
            console.log('Final aging data:', agingData);
            console.log('Data breakdown:');
            console.log('  - 120+ Days:', agingData.hundredTwentyPlusDays);
            console.log('  - 90 Days:', agingData.ninetyDays);
            console.log('  - 60 Days:', agingData.sixtyDays);
            console.log('  - 30 Days:', agingData.thirtyDays);
            console.log('  - Current:', agingData.current);
            console.log('  - Closing Balance:', agingData.closingBalance);
        } else {
            console.log('❌ FAILED: No aging data found for account:', accountNumber);
            console.log('Returning zero values for all aging periods');
        }
        console.log('=== END AGING ANALYSIS FETCH ===');

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
