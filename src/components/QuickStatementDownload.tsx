import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Download, FileText, Phone, AlertCircle, CheckCircle, Loader, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateStatement } from './StatementGenerator';
import { useNavigate } from 'react-router-dom';

// Define Customer interface
interface Customer {
  id: string;
  accountNumber: string;
  name?: string;
  accountHolderName?: string;
  phone?: string;
  phoneNumber?: string;
  outstandingTotalBalance?: number;
  outstandingBalance?: number;
  [key: string]: any; // For other potential properties
}

const QuickStatementDownload: React.FC = () => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showStatement, setShowStatement] = useState(false);
  const navigate = useNavigate();

  // Component load debugging
  console.log('🚀 QuickStatementDownload component loaded/re-rendered');
  console.log('📋 Current state - customer:', customer?.accountNumber, 'loading:', isLoading);

  const handleSearch = async () => {
    console.log('🔍 handleSearch function called!');
    console.log('📊 Timestamp:', new Date().toISOString());
    
    if (!phoneDigits || phoneDigits.length !== 4) {
      toast.error('Please enter the last 4 digits of your phone number');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 Searching for customer with phone digits:', phoneDigits);
      
      // Check if db is initialized
      if (!db) {
        throw new Error('Firebase database is not initialized');
      }
      
      // Search for customers whose phone number ends with these 4 digits
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      
      console.log('📊 Total customers in database:', snapshot.size);
      
      // Initialize variables with proper typing
      let matchingCustomer: Customer | null = null;
      let matchCount = 0;
      
      // Process each document
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Check both 'phone' and 'phoneNumber' fields for compatibility
        const phone = (data.phone?.toString() || data.phoneNumber?.toString() || '').replace(/\D/g, ''); // Remove non-digits
        
        console.log('📱 Checking phone:', phone, 'for document:', doc.id);
        
        // Check if phone number ends with the entered digits
        if (phone.length >= 4 && phone.slice(-4) === phoneDigits) {
          matchCount++;
          console.log('✅ Found matching customer:', doc.id, 'with phone:', phone);
          
          // Create a properly typed customer object
          const customer: Customer = {
            id: doc.id,
            accountNumber: data.accountNumber || doc.id, // Use accountNumber field or document ID as fallback
            name: data.name || '',
            accountHolderName: data.accountHolderName || '',
            phone: data.phone || '',
            phoneNumber: data.phoneNumber || '',
            outstandingTotalBalance: data.outstandingBalance || data.outstandingTotalBalance || 0
          };
          
          matchingCustomer = customer;
        }
      });

      console.log('🎯 Total matches found:', matchCount);

      // Safely use the customer data
      if (matchingCustomer) {
        setCustomer(matchingCustomer);
        setShowStatement(true);
        const accountId = (matchingCustomer as Customer).accountNumber || 'Unknown';
        toast.success(`Customer found! Account: ${accountId}`);
      } else {
        toast.error('No customer found with those phone digits. Please check and try again.');
        setCustomer(null);
        setShowStatement(false);
      }
    } catch (error) {
      console.error('❌ Error searching for customer:', error);
      toast.error('Error searching for customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = () => {
    if (!customer) {
      toast.error('Customer information not available');
      return;
    }
    
    // Format the amount properly to ensure it's passed correctly
    const amount = customer.outstandingTotalBalance || 0;
    const formattedAmount = amount.toString();
    
    // Create the payment URL with properly encoded parameters
    const paymentUrl = `/yebopay-payment/${encodeURIComponent(customer.accountNumber)}/${encodeURIComponent(customer.accountHolderName || customer.name || 'Unknown')}/${encodeURIComponent(formattedAmount)}`;
    
    // Navigate to the payment page
    navigate(paymentUrl);
  };

  const handleDownloadStatement = async () => {
    // IMMEDIATE DEBUG - This should appear first
    console.log('🔴 BUTTON CLICKED - handleDownloadStatement called!');
    console.log('🔴 Timestamp:', new Date().toISOString());
    
    if (!customer) {
      console.error('No customer data available');
      toast.error('No customer data available');
      return;
    }

    try {
      console.log('📝 Starting CLIENT-SIDE PDF generation for customer:', customer.accountNumber);
      console.log('📊 Customer data:', customer);
      
      toast.loading('Generating your PDF statement...', { id: 'pdf-generation' });
      
      // Get current month and year for statement generation
      const currentDate = new Date();
      const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = currentDate.getFullYear().toString();
      
      // Create customer input object for StatementGenerator
      const customerInput = {
        accountNumber: customer.accountNumber,
        month: currentMonth,
        year: currentYear
      };
      
      console.log('📅 Generating statement for:', customerInput);
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF generation timeout')), 30000);
      });
      
      // Generate PDF with timeout
      await Promise.race([
        generateStatement(customerInput),
        timeoutPromise
      ]);
      
      console.log('✅ PDF generation completed successfully');
      toast.success('PDF statement generated and downloaded successfully!', { id: 'pdf-generation' });
      
    } catch (error: any) {
      console.error('❌ Error generating PDF statement:', error);
      
      const errorMessage = error.message || 'Unknown error';
      const errorName = error.name || 'Error';
      
      console.error('❌ Error details:', {
        message: errorMessage,
        stack: error.stack,
        name: errorName,
        customer: customer?.accountNumber
      });
      
      // Handle specific error types
      if (errorName === 'TimeoutError') {
        toast.error('PDF generation is taking too long. Please try again.', { id: 'pdf-generation' });
      } else if (errorMessage.includes('404')) {
        toast.error('Customer data not found. Please verify your information.', { id: 'pdf-generation' });
      } else if (errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        toast.error('Network timeout. Please check your connection and try again.', { id: 'pdf-generation' });
      } else {
        toast.error(`Error generating PDF statement: ${errorMessage}`, { id: 'pdf-generation' });
      }
    }
  };




  return (
    <div className="min-h-screen bg-orange-500">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          {/* Add extra padding at the top to prevent overlap with any fixed headers */}
          <div className="pt-10 sm:pt-16"></div>
          
          {/* Header */}
          <div className="text-center mb-8">
            {/* Municipality Name */}
            <h1 className="text-3xl font-bold text-white mb-6">
              Mohokare Local Municipality
            </h1>
            
            <div className="inline-block bg-white dark:bg-gray-800 p-3 rounded-full shadow-md mb-6">
              <FileText className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Quick Statement Download
            </h2>
            <p className="text-white">
              Enter the last 4 digits of your phone number to download your municipal statement
            </p>
          </div>

          {/* Main Content */}
          {!showStatement ? (
            <div className="space-y-4">
              {/* Search Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                <div className="mb-6">
                  <label htmlFor="phoneDigits" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number (Last 4 Digits)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="phoneDigits"
                      maxLength={4}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter last 4 digits"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2 text-center">
                  Enter only the last 4 digits (e.g., if your number is 0721234567, enter 4567)
                </p>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading || phoneDigits.length !== 4}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={20} />
                    Searching...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2" size={20} />
                    Find My Statement
                  </>
                )}
              </button>

              {/* Info Section */}
              <div className="mt-6 p-3 sm:p-4 bg-orange-50 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-start">
                  <AlertCircle className="text-orange-500 mr-2 mt-0.5 hidden sm:block" size={16} />
                  <div className="text-sm text-orange-700">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Enter the last 4 digits of your phone number</li>
                      <li>We'll find your account & generate your statement</li>
                      <li>Download your statement instantly</li>
                      <li>Visit our portal for account management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Statement Display */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
              <div className="text-center mb-6">
                <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Statement Ready!
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  We found your account for <span className="font-semibold">{customer?.accountHolderName || customer?.name || 'N/A'}</span>. Click below to download your statement.
                </p>
              </div>

              {/* Customer Info */}
              <div className="bg-orange-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6 mb-6 border-l-4 border-orange-500 text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Account Details</h3>
                <div className="space-y-3">
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Account Number</span>
                    <p className="text-lg font-bold text-orange-600 dark:text-white">
                      {customer?.accountNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Customer Name</span>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {customer?.accountHolderName || customer?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</span>
                    <p className="text-xl font-bold text-orange-600 dark:text-white">
                      R{(customer?.outstandingTotalBalance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleDownloadStatement}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                  <Download className="mr-2" size={20} />
                  Download Statement
                </button>
                
                <button
                  onClick={handlePayNow}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                >
                  <CreditCard className="mr-2" size={20} />
                  Pay Now
                </button>

                <button
                  onClick={() => {
                    setShowStatement(false);
                    setCustomer(null);
                    setPhoneDigits('');
                  }}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Search Again
                </button>

                <div className="text-center">
                  <a
                    href="https://consumerportal.co.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Visit Full Portal for Payments →
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white text-sm">
          <p>Mohokare Municipality - Quick Statement Access</p>
          <p>For support, visit <a href="https://consumerportal.co.za" className="text-white font-bold hover:text-orange-200">consumerportal.co.za</a></p>
        </div>
      </div>
    </div>
  );
};

export default QuickStatementDownload;
