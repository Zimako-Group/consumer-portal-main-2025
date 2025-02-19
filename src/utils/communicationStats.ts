import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth } from 'date-fns';

interface CommunicationStats {
  sms: number;
  email: number;
  whatsapp: number;
  month: Timestamp;
}

const STATS_COLLECTION = 'communicationStats';

export async function incrementCommunicationStat(type: 'sms' | 'email' | 'whatsapp') {
  const currentDate = new Date();
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
  const docRef = doc(db, STATS_COLLECTION, monthKey);

  try {
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing stats
      await updateDoc(docRef, {
        [type]: (docSnap.data()[type] || 0) + 1,
        month: Timestamp.fromDate(currentDate)
      });
    } else {
      // Create new stats document for this month
      const initialStats: CommunicationStats = {
        sms: type === 'sms' ? 1 : 0,
        email: type === 'email' ? 1 : 0,
        whatsapp: type === 'whatsapp' ? 1 : 0,
        month: Timestamp.fromDate(currentDate)
      };
      await setDoc(docRef, initialStats);
    }
  } catch (error) {
    console.error('Error updating communication stats:', error);
    throw error;
  }
}

export async function getCurrentMonthStats(): Promise<CommunicationStats | null> {
  const currentDate = new Date();
  const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
  const docRef = doc(db, STATS_COLLECTION, monthKey);

  try {
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as CommunicationStats;
    } else {
      // Return empty stats if no document exists
      return {
        sms: 0,
        email: 0,
        whatsapp: 0,
        month: Timestamp.fromDate(currentDate)
      };
    }
  } catch (error) {
    console.error('Error getting current month stats:', error);
    return null;
  }
}
