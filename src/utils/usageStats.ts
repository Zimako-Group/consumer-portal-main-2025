import { db } from '../firebaseConfig';
import { collection, doc, getDoc, setDoc, increment, Timestamp } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface UsageStats {
  statementDownloads: number;
  meterReadings: number;
  timestamp: Timestamp;
}

export async function incrementStatementDownload() {
  const currentDate = new Date();
  const monthKey = format(currentDate, 'yyyy-MM');
  const statsRef = doc(db, 'usageStats', monthKey);

  try {
    await setDoc(statsRef, {
      statementDownloads: increment(1),
      timestamp: Timestamp.fromDate(currentDate)
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing statement downloads:', error);
    throw error;
  }
}

export async function incrementMeterReading() {
  const currentDate = new Date();
  const monthKey = format(currentDate, 'yyyy-MM');
  const statsRef = doc(db, 'usageStats', monthKey);

  try {
    await setDoc(statsRef, {
      meterReadings: increment(1),
      timestamp: Timestamp.fromDate(currentDate)
    }, { merge: true });
  } catch (error) {
    console.error('Error incrementing meter readings:', error);
    throw error;
  }
}

export async function getMonthlyStats(): Promise<{ 
  labels: string[], 
  statements: number[], 
  readings: number[] 
}> {
  try {
    const months = [];
    const currentDate = new Date();
    
    // Get last 6 months
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      months.unshift(format(date, 'yyyy-MM'));
    }

    const stats = await Promise.all(
      months.map(async (monthKey) => {
        const docRef = doc(db, 'usageStats', monthKey);
        const docSnap = await getDoc(docRef);
        return {
          month: format(new Date(monthKey), 'MMM'),
          data: docSnap.exists() ? docSnap.data() as UsageStats : { 
            statementDownloads: 0, 
            meterReadings: 0 
          }
        };
      })
    );

    return {
      labels: stats.map(stat => stat.month),
      statements: stats.map(stat => stat.data.statementDownloads || 0),
      readings: stats.map(stat => stat.data.meterReadings || 0)
    };
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    throw error;
  }
}
