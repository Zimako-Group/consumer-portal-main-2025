import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface CollectionRateStats {
  rate: number;
  loading: boolean;
  error: string | null;
  totalPaid: number;
  totalOutstanding: number;
}

export function useCollectionRate(): CollectionRateStats {
  const [stats, setStats] = useState<CollectionRateStats>({
    rate: 0,
    loading: true,
    error: null,
    totalPaid: 0,
    totalOutstanding: 0
  });

  useEffect(() => {
    async function fetchCollectionRate() {
      try {
        const customersRef = collection(db, 'customers');
        const customersSnapshot = await getDocs(customersRef);
        
        let totalOutstanding = 0;
        let totalPaid = 0;

        customersSnapshot.forEach(doc => {
          const data = doc.data();
          
          // Debug log for each customer
          console.log('Customer data:', {
            id: doc.id,
            outstandingBalance: data.outstandingTotalBalance,
            lastPaymentAmount: data.lastPaymentAmount
          });
          
          // Get the outstanding balance
          const outstandingBalance = Number(data.outstandingTotalBalance) || 0;
          totalOutstanding += outstandingBalance;

          // Sum up all payments from payment history instead of just last payment
          const paymentHistory = data.paymentHistory || [];
          const customerTotalPaid = paymentHistory.reduce((sum: number, payment: any) => {
            const amount = Math.abs(Number(payment.amount) || 0);
            return sum + amount;
          }, 0);
          
          totalPaid += customerTotalPaid;

          // Debug log running totals
          console.log('Running totals:', {
            totalOutstanding,
            totalPaid,
            customerTotalPaid
          });
        });

        // Calculate collection rate as percentage
        const totalBilled = totalOutstanding + totalPaid;
        const rate = totalBilled > 0 
          ? (totalPaid / totalBilled) * 100 
          : 0;

        // Debug log final calculations
        console.log('Final calculations:', {
          totalOutstanding,
          totalPaid,
          totalBilled,
          rate
        });

        setStats({
          rate: Number(rate.toFixed(1)),
          loading: false,
          error: null,
          totalPaid,
          totalOutstanding
        });
      } catch (error) {
        console.error('Error fetching collection rate:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch collection rate'
        }));
      }
    }

    fetchCollectionRate();
  }, []);

  return stats;
}
