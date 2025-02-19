import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Clock, Plus } from 'lucide-react';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { logUserActivity } from '../utils/activity';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export interface PaymentArrangementType {
  id: string;
  accountNumber: string;
  totalAmount: number;
  installmentAmount: number;
  startDate: string;
  endDate: string;
  nextPaymentDate: string;
  status: 'active' | 'completed' | 'defaulted';
  remainingAmount: number;
  createdAt: Date;
}

interface PaymentArrangementFormData {
  totalAmount: string;
  installmentAmount: string;
  startDate: Date;
  numberOfMonths: string;
}

export default function PaymentArrangement() {
  const { currentUser, userData } = useAuth();
  const [arrangements, setArrangements] = useState<PaymentArrangementType[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState<{ outstandingBalance: number } | null>(null);
  const [formData, setFormData] = useState<PaymentArrangementFormData>({
    totalAmount: '',
    installmentAmount: '',
    startDate: new Date(),
    numberOfMonths: ''
  });

  useEffect(() => {
    if (currentUser && userData?.accountNumber) {
      Promise.all([fetchCustomerData(), fetchArrangements()])
        .catch(error => {
          console.error('Error initializing data:', error);
          toast.error('Failed to load data. Please try again.');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [currentUser, userData]);

  const fetchCustomerData = async () => {
    try {
      if (!currentUser || !userData?.accountNumber) return;

      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('accountNumber', '==', userData.accountNumber));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data();
        const outstandingBalance = data.outstandingTotalBalance || 0;
        setCustomerData({ outstandingBalance });
        setFormData(prev => ({
          ...prev,
          totalAmount: outstandingBalance.toString()
        }));
      } else {
        throw new Error('Customer data not found');
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast.error('Failed to load customer data');
      throw error;
    }
  };

  const calculateMonths = (amount: number, installment: number) => {
    if (!installment || installment <= 0) return '';
    const months = Math.ceil(amount / installment);
    return months.toString();
  };

  const handleInstallmentChange = (value: string) => {
    const installment = parseFloat(value);
    const total = parseFloat(formData.totalAmount);
    
    setFormData(prev => ({
      ...prev,
      installmentAmount: value,
      numberOfMonths: calculateMonths(total, installment)
    }));
  };

  const fetchArrangements = async () => {
    try {
      if (!currentUser || !userData?.accountNumber) return;

      const arrangementsRef = collection(db, 'paymentArrangements');
      const q = query(
        arrangementsRef,
        where('accountNumber', '==', userData.accountNumber),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedArrangements: PaymentArrangementType[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedArrangements.push({
          id: doc.id,
          accountNumber: data.accountNumber,
          totalAmount: data.totalAmount,
          installmentAmount: data.installmentAmount,
          startDate: data.startDate,
          endDate: data.endDate,
          nextPaymentDate: data.nextPaymentDate,
          status: data.status,
          remainingAmount: data.remainingAmount,
          createdAt: data.createdAt.toDate()
        });
      });

      setArrangements(fetchedArrangements);
    } catch (error) {
      console.error('Error fetching arrangements:', error);
      toast.error('Failed to load payment arrangements');
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!currentUser || !userData?.accountNumber) {
        toast.error('Please log in to create a payment arrangement');
        return;
      }

      // Validate inputs
      const totalAmount = parseFloat(formData.totalAmount);
      const installmentAmount = parseFloat(formData.installmentAmount);
      const months = parseInt(formData.numberOfMonths);

      if (isNaN(totalAmount) || isNaN(installmentAmount) || isNaN(months)) {
        toast.error('Please enter valid numbers');
        return;
      }

      if (installmentAmount <= 0) {
        toast.error('Monthly installment must be greater than 0');
        return;
      }

      if (installmentAmount * months < totalAmount) {
        toast.error('Total installments should cover the total amount');
        return;
      }

      const endDate = new Date(formData.startDate);
      endDate.setMonth(endDate.getMonth() + months);

      const arrangementData = {
        accountNumber: userData.accountNumber,
        totalAmount,
        installmentAmount,
        startDate: formData.startDate.toISOString(),
        endDate: endDate.toISOString(),
        nextPaymentDate: formData.startDate.toISOString(),
        status: 'active' as const,
        remainingAmount: totalAmount,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'paymentArrangements'), arrangementData);

      // Log the activity
      await logUserActivity(
        currentUser.uid,
        'PAYMENT_ARRANGEMENT_CREATED',
        `Created payment arrangement for R${totalAmount.toFixed(2)}`,
        {
          arrangementId: docRef.id,
          totalAmount,
          installmentAmount,
          numberOfMonths: months,
          startDate: formData.startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      );

      await fetchArrangements(); // Refresh the arrangements list
      toast.success('Payment arrangement created successfully');
      setShowForm(false);
      setFormData({
        totalAmount: customerData?.outstandingBalance.toString() || '',
        installmentAmount: '',
        startDate: new Date(),
        numberOfMonths: ''
      });
    } catch (error) {
      console.error('Error creating arrangement:', error);
      toast.error('Failed to create payment arrangement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMakePayment = async (arrangementId: string) => {
    // Implement payment logic here
    toast.info('Payment functionality coming soon!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'completed':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'defaulted':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (!currentUser || !userData?.accountNumber) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400 py-8">
        Please log in to view payment arrangements
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">Payment Arrangements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-theme hover:bg-theme/90"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Arrangement
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Create New Payment Arrangement
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Amount Due (R)
              </label>
              <input
                type="number"
                value={formData.totalAmount}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme dark:bg-dark-hover dark:border-dark-border dark:text-white bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This is your current outstanding balance
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Monthly Installment (R)
              </label>
              <input
                type="number"
                value={formData.installmentAmount}
                onChange={(e) => handleInstallmentChange(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme dark:bg-dark-hover dark:border-dark-border dark:text-white"
                required
                min="1"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Enter how much you can pay monthly
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Start Date
              </label>
              <DatePicker
                selected={formData.startDate}
                onChange={(date) => setFormData(prev => ({ ...prev, startDate: date || new Date() }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme dark:bg-dark-hover dark:border-dark-border dark:text-white"
                dateFormat="yyyy-MM-dd"
                minDate={new Date()}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Number of Months to Pay Off
              </label>
              <input
                type="text"
                value={formData.numberOfMonths}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme dark:bg-dark-hover dark:border-dark-border dark:text-white bg-gray-100 cursor-not-allowed"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formData.numberOfMonths ? 
                  `It will take ${formData.numberOfMonths} months to pay off R${formData.totalAmount} at R${formData.installmentAmount} per month` :
                  'Enter a monthly installment amount to see how long it will take to pay off'
                }
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-theme hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Arrangement'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {arrangements.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400 py-8">
            No payment arrangements found
          </div>
        ) : (
          arrangements.map((arrangement) => (
            <div key={arrangement.id} className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Payment Plan #{arrangement.id.slice(0, 8)}
                  </h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${getStatusColor(arrangement.status)}`}>
                    {arrangement.status.charAt(0).toUpperCase() + arrangement.status.slice(1)}
                  </span>
                </div>
                <button
                  onClick={() => handleMakePayment(arrangement.id)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-theme hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
                >
                  Make Payment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Payment</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      R {arrangement.installmentAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Next Payment</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      {new Date(arrangement.nextPaymentDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Remaining Amount</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white">
                      R {arrangement.remainingAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}