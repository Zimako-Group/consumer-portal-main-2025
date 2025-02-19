import React, { useState, useEffect } from 'react';
import { CreditCard, CalendarRange, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import PaymentArrangement, { PaymentArrangementType } from './PaymentArrangement';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { format, lastDayOfMonth } from 'date-fns';

interface PaymentDetails {
  name: string;
  accountNumber: string;
  lastPaymentDate: string;
  lastAmountPaid: number;
  amountDue: number;
  dueDate: string;
}

export default function Payment() {
  const { currentUser, userData } = useAuth();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    name: "",
    accountNumber: "",
    lastPaymentDate: "",
    lastAmountPaid: 0,
    amountDue: 0,
    dueDate: format(lastDayOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(true);

  const calculateDueDate = () => {
    const lastDay = lastDayOfMonth(new Date());
    return format(lastDay, 'yyyy-MM-dd');
  };

  const formatCurrency = (amount: number): string => {
    return `R ${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  useEffect(() => {
    const updateDueDate = () => {
      setPaymentDetails(prev => ({
        ...prev,
        dueDate: calculateDueDate()
      }));
    };

    updateDueDate();

    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        updateDueDate();
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        if (!currentUser || !userData?.accountNumber) {
          toast.error('Please log in to view payment details');
          setLoading(false);
          return;
        }

        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('accountNumber', '==', userData.accountNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setPaymentDetails(prev => ({
            name: customerData.accountHolderName || '',
            accountNumber: customerData.accountNumber || '',
            lastPaymentDate: customerData.lastPaymentDate || '',
            lastAmountPaid: customerData.lastPaymentAmount || 0,
            amountDue: customerData.outstandingTotalBalance || 0,
            dueDate: calculateDueDate() 
          }));
        } else {
          toast.error('Customer details not found');
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [currentUser, userData]);

  useEffect(() => {
    const location = window.location;
    const searchParams = new URLSearchParams(location.search);
    const action = searchParams.get('action');
    
    if (action === 'arrangement') {
      handleMakeArrangement();
    }
  }, []);

  const [isArrangementFormOpen, setIsArrangementFormOpen] = useState(false);
  const [arrangementAmount, setArrangementAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [arrangements, setArrangements] = useState<PaymentArrangementType[]>([
    {
      id: '1',
      totalAmount: 2450.00,
      installmentAmount: 408.33,
      startDate: '2024-03-15',
      endDate: '2024-09-15',
      nextPaymentDate: '2024-04-15',
      status: 'active',
      remainingAmount: 2041.67
    }
  ]);

  const handlePayNow = () => {
    const paymentUrl = `/payment/confirm?account_no=${encodeURIComponent(paymentDetails.accountNumber)}&name=${encodeURIComponent(paymentDetails.name)}&amount=${encodeURIComponent(paymentDetails.amountDue)}`;
    toast.success('Redirecting to payment gateway...');
    setTimeout(() => {
      window.location.href = paymentUrl;
    }, 1000);
  };

  const handleMakeArrangement = () => {
    setIsArrangementFormOpen(true);
    // Scroll to the arrangement form
    const arrangementSection = document.getElementById('payment-arrangements');
    if (arrangementSection) {
      arrangementSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCreateArrangement = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(arrangementAmount);
    const months = parseInt(installments);
    
    if (isNaN(amount) || isNaN(months) || months <= 0) {
      toast.error('Please enter valid amount and number of installments');
      return;
    }

    const monthlyPayment = amount / months;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);

    const newArrangement: PaymentArrangementType = {
      id: (arrangements.length + 1).toString(),
      totalAmount: amount,
      installmentAmount: monthlyPayment,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      nextPaymentDate: startDate.toISOString(),
      status: 'active',
      remainingAmount: amount
    };

    setArrangements([...arrangements, newArrangement]);
    setIsArrangementFormOpen(false);
    setArrangementAmount('');
    setInstallments('');
    toast.success('Payment arrangement created successfully');
  };

  const handleMakeArrangementPayment = (arrangementId: string) => {
    toast.success('Processing arrangement payment...');
    // Payment gateway integration would go here
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Payment Details
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Holder</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {paymentDetails.name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Account Number</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {paymentDetails.accountNumber}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Payment Date</p>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {paymentDetails.lastPaymentDate ? format(new Date(paymentDetails.lastPaymentDate), 'PPP') : 'No payment recorded'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Last Amount Paid</p>
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {formatCurrency(paymentDetails.lastAmountPaid)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {formatCurrency(paymentDetails.amountDue)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
              <p className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
                {paymentDetails.dueDate ? format(new Date(paymentDetails.dueDate), 'PPP') : 'Not set'}
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 dark:bg-dark-hover rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Amount Due</p>
                <p className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
                  {formatCurrency(paymentDetails.amountDue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 dark:text-white">
                  {paymentDetails.dueDate ? format(new Date(paymentDetails.dueDate), 'PPP') : 'Not set'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-4">
            <button
              onClick={handlePayNow}
              disabled={loading || !userData?.accountNumber}
              className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-theme hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </span>
              ) : (
                <>
                  <CreditCard className="w-5 h-5 mr-2" />
                  Pay Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Arrangement Form */}
      {isArrangementFormOpen && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm mb-8 p-6">
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
            Create Payment Arrangement
          </h3>
          <form onSubmit={handleCreateArrangement} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Amount
              </label>
              <input
                type="number"
                id="amount"
                value={arrangementAmount}
                onChange={(e) => setArrangementAmount(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm"
                placeholder="Enter amount"
                required
              />
            </div>
            <div>
              <label htmlFor="installments" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Installments
              </label>
              <input
                type="number"
                id="installments"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm"
                placeholder="Enter number of months"
                required
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setIsArrangementFormOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-theme hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
              >
                Create Arrangement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Payment Arrangements Section */}
      {arrangements.length > 0 && (
        <div id="payment-arrangements" className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            My Payment Arrangements
          </h2>
          <div className="space-y-4">
            {arrangements.map((arrangement) => (
              <PaymentArrangement
                key={arrangement.id}
                arrangement={arrangement}
                onMakePayment={handleMakeArrangementPayment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}