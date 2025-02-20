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
        // Reference to the customers collection
        const customersRef = collection(db, 'customers');
        
        // Get total customers count
        const totalSnapshot = await getDocs(customersRef);
        const totalCount = totalSnapshot.size;

        // Query for active customers using exact field name and value
        const activeQuery = query(
          customersRef,
          where('accountStatus', '==', 'ACTIVE')
        );
        const activeSnapshot = await getDocs(activeQuery);
        const activeCount = activeSnapshot.size;

        console.log('Customer Stats:', {
          total: totalCount,
          active: activeCount,
          query: 'accountStatus == ACTIVE'
        });

        setStats({
          totalCustomers: totalCount,
          activeCustomers: activeCount,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching customer stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch customer statistics'
        }));
      }
    }

    fetchCustomerStats();
  }, []);

  return stats;
}
