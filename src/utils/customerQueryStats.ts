import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, increment, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface QueryStats {
  billingQueries: number;
  paymentArrangements: number;
  timestamp: Timestamp;
}

export async function incrementBillingQuery() {
  const currentDate = new Date();
  const monthKey = format(currentDate, 'yyyy-MM');
  const statsRef = doc(db, 'customerQueryStats', monthKey);

  try {
    await setDoc(statsRef, {
      billingQueries: increment(1),
      timestamp: Timestamp.fromDate(currentDate)
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing billing queries:', error);
    throw error;
  }
}

export async function incrementPaymentArrangement() {
  const currentDate = new Date();
  const monthKey = format(currentDate, 'yyyy-MM');
  const statsRef = doc(db, 'customerQueryStats', monthKey);

  try {
    await setDoc(statsRef, {
      paymentArrangements: increment(1),
      timestamp: Timestamp.fromDate(currentDate)
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing payment arrangements:', error);
    throw error;
  }
}

export async function getCurrentMonthStats(): Promise<{
  billingQueries: number;
  paymentArrangements: number;
}> {
  try {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const docRef = doc(db, 'customerQueryStats', currentMonth);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as QueryStats;
      return {
        billingQueries: data.billingQueries || 0,
        paymentArrangements: data.paymentArrangements || 0
      };
    }

    return {
      billingQueries: 0,
      paymentArrangements: 0
    };
  } catch (error) {
    console.error('Error fetching query stats:', error);
    throw error;
  }
}
