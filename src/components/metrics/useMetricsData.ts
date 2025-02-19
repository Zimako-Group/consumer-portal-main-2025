import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, Timestamp, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface MetricData {
  newUsers: number;
  totalCustomers: number;
  activeServices: number;
  revenueCollected: number;
}

const handleFirestoreError = (error: Error, context: string) => {
  console.error(`Error in ${context}:`, error);
};

export const useMetricsData = () => {
  const [metrics, setMetrics] = useState<MetricData>({
    newUsers: 0,
    totalCustomers: 0,
    activeServices: 0,
    revenueCollected: 0,
  });

  useEffect(() => {
    try {
      // Get the start and end of the current week
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 });

      // Query for new users this week
      const newUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', Timestamp.fromDate(weekStart)),
        where('createdAt', '<=', Timestamp.fromDate(weekEnd))
      );

      // Query for all active users
      const allUsersQuery = query(
        collection(db, 'users'),
        where('active', '==', true)
      );

      // Set up real-time listener for new users this week
      const unsubscribeNewUsers = onSnapshot(newUsersQuery, 
        (snapshot) => {
          setMetrics(prev => ({
            ...prev,
            newUsers: snapshot.size
          }));
        },
        (error) => handleFirestoreError(error, 'new users listener')
      );

      // Set up real-time listener for total customers
      const unsubscribeTotalCustomers = onSnapshot(allUsersQuery,
        (snapshot) => {
          console.log('Total customers update:', snapshot.size); // Debug log
          setMetrics(prev => ({
            ...prev,
            totalCustomers: snapshot.size
          }));
        },
        (error) => handleFirestoreError(error, 'total customers listener')
      );

      // Weekly reset check for new users
      const resetInterval = setInterval(() => {
        const now = new Date();
        if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
          setMetrics(prev => ({ ...prev, newUsers: 0 }));
        }
      }, 60000);

      // Cleanup function
      return () => {
        unsubscribeNewUsers();
        unsubscribeTotalCustomers();
        clearInterval(resetInterval);
      };
    } catch (error) {
      handleFirestoreError(error as Error, 'metrics setup');
    }
  }, []); // Empty dependency array since we want this to run once on mount

  return metrics;
};