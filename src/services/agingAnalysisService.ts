import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface AgingAnalysis {
    '202409 (Current)': number;
    '202408 (30 Days)': number;
    '202407 (60 Days)': number;
    '202406 (90 Days)': number;
    '202405 (120 Days)': number;
    TOTAL: number;
}

export const getAgingAnalysisForCustomer = async (accountNumber: string): Promise<AgingAnalysis | null> => {
    try {
        const q = query(
            collection(db, 'detailed_aged_analysis'),
            where('ACCOUNT_NO', '==', accountNumber)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('No aging analysis found for account:', accountNumber);
            return null;
        }

        // Get the first document since we expect only one per account
        const doc = querySnapshot.docs[0].data();

        return {
            '202409 (Current)': Number(doc['202409 (Current)']) || 0,
            '202408 (30 Days)': Number(doc['202408 (30 Days)']) || 0,
            '202407 (60 Days)': Number(doc['202407 (60 Days)']) || 0,
            '202406 (90 Days)': Number(doc['202406 (90 Days)']) || 0,
            '202405 (120 Days)': Number(doc['202405 (120 Days)']) || 0,
            TOTAL: Number(doc['TOTAL']) || 0
        };
    } catch (error) {
        console.error('Error fetching aging analysis:', error);
        return null;
    }
};
