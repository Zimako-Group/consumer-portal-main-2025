import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit, Timestamp } from 'firebase/firestore';

export interface UserActivityData {
  userId: string;
  action: string;
  component: string;
  timestamp: any;
  metadata?: Record<string, any>;
  biweeklyPeriod?: string;
}

// Helper function to get biweekly period identifier
const getBiweeklyPeriodId = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
  const biweeklyPeriod = Math.floor(dayOfYear / 14);
  return `${year}-${biweeklyPeriod}`;
};

export const trackUserActivity = async (
  userId: string,
  action: string,
  component: string,
  metadata?: Record<string, any>
) => {
  try {
    console.log('Tracking activity:', { userId, action, component, metadata }); // Debug log

    const activityData: UserActivityData = {
      userId,
      action,
      component,
      timestamp: serverTimestamp(),
      metadata,
      biweeklyPeriod: getBiweeklyPeriodId()
    };

    await addDoc(collection(db, 'userActivities'), activityData);
    console.log('Activity tracked successfully'); // Debug log
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
};

export const getRecentActivities = async (timeframe: 'day' | 'week' | 'month' = 'week', maxResults = 9) => {
  try {
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const activitiesRef = collection(db, 'userActivities');
    const q = query(
      activitiesRef,
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc'),
      limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error getting recent activities:', error);
    return [];
  }
};

// Function to get user logins for a specific time period
export const getUserLogins = async (startDate: Date, endDate: Date) => {
  try {
    const activitiesRef = collection(db, 'userActivities');
    const q = query(
      activitiesRef,
      where('action', '==', 'login'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const uniqueUsers = new Set();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      uniqueUsers.add(data.userId);
    });

    return uniqueUsers.size; // Return count of unique users who logged in
  } catch (error) {
    console.error('Error getting user logins:', error);
    return 0;
  }
};

// Function to get unique users who logged in during the current biweekly period
export const getBiweeklyUniqueUsers = async () => {
  try {
    console.log('Getting biweekly unique users...'); // Debug log
    const currentPeriod = getBiweeklyPeriodId();
    console.log('Current period:', currentPeriod); // Debug log

    const activitiesRef = collection(db, 'userActivities');
    const q = query(
      activitiesRef,
      where('action', '==', 'login'),
      where('biweeklyPeriod', '==', currentPeriod)
    );

    const snapshot = await getDocs(q);
    console.log('Found activities:', snapshot.size); // Debug log

    const uniqueUsers = new Set();
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      uniqueUsers.add(data.userId);
    });

    console.log('Unique users count:', uniqueUsers.size); // Debug log
    return uniqueUsers.size;
  } catch (error) {
    console.error('Error getting biweekly unique users:', error);
    return 0;
  }
};

// Function to get activity data grouped by date
export const getActivityDataByDate = async (days: number) => {
  try {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    const activitiesRef = collection(db, 'userActivities');
    const q = query(
      activitiesRef,
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    const activityByDate: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.timestamp) {
        const date = data.timestamp.toDate();
        const dateStr = date.toISOString().split('T')[0];
        activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1;
      }
    });

    return activityByDate;
  } catch (error) {
    console.error('Error getting activity data by date:', error);
    return {};
  }
};
