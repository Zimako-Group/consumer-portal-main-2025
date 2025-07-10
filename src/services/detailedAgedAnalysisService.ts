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

        const batch = writeBatch(db);
        let count = 0;
        let failed = 0;
        let batchCount = 0;
        const batchSize = 500; // Firestore batch limit
        const totalRecords = records.length;

        for (const record of records) {
            try {
                const docRef = doc(monthCollectionRef);
                batch.set(docRef, {
                    ...record,
                    uploadDate,
                    uploadedAt: new Date().toISOString()
                });
                count++;
                batchCount++;
                
                // Report progress
                if (progressCallback) {
                    progressCallback(Math.round((count / totalRecords) * 100));
                }
                
                // Commit batch when it reaches the limit
                if (batchCount >= batchSize) {
                    await batch.commit();
                    console.log(`Committed batch: ${count}/${totalRecords}`);
                    batchCount = 0;
                }
            } catch (error) {
                console.error('Error processing record:', error);
                failed++;
            }
        }

        // Commit any remaining records
        if (batchCount > 0) {
            await batch.commit();
            console.log(`Committed final batch: ${count}/${totalRecords}`);
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
        
        // Root collection path for detailed aged analysis
        // Note: We'll implement querying across years/months in a future update
        
        // Initialize aging data
        let agingData: AgingAnalysisData = {
            hundredTwentyPlusDays: 0,
            ninetyDays: 0,
            sixtyDays: 0,
            thirtyDays: 0,
            current: 0,
            closingBalance: 0
        };
        
        // Get all documents across all months/years that match the account number
        // Note: This is a simplified approach. In a production app, you might want to
        // query specific months/years based on user selection.
        
        // For now, we'll use the old collection as a fallback for backward compatibility
        const legacyCollection = collection(db, 'detailed_aged_analysis');
        const legacyQuery = query(legacyCollection, where('ACCOUNT_NO', '==', Number(accountNumber)));
        const legacySnapshot = await getDocs(legacyQuery);
        
        let foundData = false;
        
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
