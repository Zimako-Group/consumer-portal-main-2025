import { db } from '../firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

export interface AccountStats {
  totalAccounts: number;
  totalBookValue: number;
  accountPercentage: number;
  bookValuePercentage: number;
}

export async function calculateAccountStats(): Promise<AccountStats> {
  try {
    const customersRef = collection(db, 'customers');
    const querySnapshot = await getDocs(customersRef);
    
    let totalAccounts = 0;
    let totalBookValue = 0;
    let activeAccounts = 0;
    let activeBookValue = 0;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      totalAccounts++;
      totalBookValue += parseFloat(data.outstandingTotalBalance || 0);

      // Consider an account active if it has any activity in the last 30 days
      const lastActivity = data.lastActivity ? new Date(data.lastActivity) : null;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (lastActivity && lastActivity > thirtyDaysAgo) {
        activeAccounts++;
        activeBookValue += parseFloat(data.outstandingTotalBalance || 0);
      }
    });

    return {
      totalAccounts,
      totalBookValue,
      accountPercentage: totalAccounts > 0 ? (activeAccounts / totalAccounts) * 100 : 0,
      bookValuePercentage: totalBookValue > 0 ? (activeBookValue / totalBookValue) * 100 : 0,
    };
  } catch (error) {
    console.error('Error calculating account stats:', error);
    throw error;
  }
}
