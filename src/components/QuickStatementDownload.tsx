import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { Download, FileText, Phone, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateStatement } from './StatementGenerator';

// Define Customer interface
interface Customer {
  id: string;
  accountNumber: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  outstandingTotalBalance?: number;
  [key: string]: any; // For other potential properties
}

const QuickStatementDownload: React.FC = () => {
  const [phoneDigits, setPhoneDigits] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showStatement, setShowStatement] = useState(false);

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
            accountNumber: doc.id, // Use document ID as account number
            name: data.name || '',
            phone: data.phone || '',
            phoneNumber: data.phoneNumber || '',
            outstandingTotalBalance: data.outstandingTotalBalance || 0
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <FileText className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-medium font-bold text-gray-900 dark:text-white mb-2">
            Quick Statement Download
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Enter the last 4 digits of your phone number to download your municipal statement
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-md mx-auto">
          {!showStatement ? (
            /* Search Form */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="inline mr-2" size={16} />
                  Last 4 digits of your phone number
                </label>
                <input
                  type="text"
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="e.g., 1234"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-xl font-mono"
                  maxLength={4}
                  disabled={isLoading}
                />
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
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="text-blue-500 mr-2 mt-0.5" size={16} />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <p className="font-medium mb-1">How it works:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Enter the last 4 digits of your registered phone number</li>
                      <li>We'll find your account and generate your statement</li>
                      <li>Download your statement instantly</li>
                      <li>Visit our portal for payments and account management</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Statement Display */
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="text-center mb-6">
                <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Statement Ready!
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  We found your account. Click below to download your statement.
                </p>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Account Details</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Account:</span> {customer?.accountNumber || 'N/A'}</p>
                  <p><span className="font-medium">Name:</span> {customer?.name || 'N/A'}</p>
                  <p><span className="font-medium">Balance:</span> R{(customer?.outstandingTotalBalance || 0).toFixed(2)}</p>
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
        <div className="text-center mt-8 text-gray-500 dark:text-gray-400 text-sm">
          <p>Mohokare Municipality - Quick Statement Access</p>
          <p>For support, visit <a href="https://consumerportal.co.za" className="text-blue-600 hover:text-blue-700">consumerportal.co.za</a></p>
        </div>
      </div>
    </div>
  );
};

export default QuickStatementDownload;
