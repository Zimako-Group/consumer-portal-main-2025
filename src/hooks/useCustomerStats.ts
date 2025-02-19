import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  loading: boolean;
  error: string | null;
}

export function useCustomerStats(): CustomerStats {
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchCustomerStats() {
      try {
        const customersRef = collection(db, 'customers');
        
        // Get total customers
        const totalSnapshot = await getDocs(customersRef);
        const totalCount = totalSnapshot.size;

        // Get active customers
        const activeQuery = query(
          customersRef,
          where('accountStatus', '==', 'Active')
        );
        const activeSnapshot = await getDocs(activeQuery);
        const activeCount = activeSnapshot.size;

        setStats({
          totalCustomers: totalCount,
          activeCustomers: activeCount,
          loading: false,
          error: null,
        });
      } catch (error) {
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch customer statistics',
        }));
        console.error('Error fetching customer stats:', error);
      }
    }

    fetchCustomerStats();
  }, []);

  return stats;
}
