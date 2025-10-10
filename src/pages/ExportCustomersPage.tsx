import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Download, Loader2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface CustomerData {
  id?: string;
  accountNumber?: string;
  accountHolderName?: string;
  idNumber?: string;
  erfNumber?: string;
  email?: string;
  emailAddress?: string;
  phone?: string;
  cellNumber?: string;
  phoneNumber?: string;
  address?: string;
  physicalAddress?: string;
  postalAddress1?: string;
  postalAddress2?: string;
  postalAddress3?: string;
  postalCode?: string;
  valuation?: string | number;
  accountStatus?: string;
  outstandingBalance?: string | number;
  outstandingTotalBalance?: string | number;
  outstandingBalanceCapital?: string | number;
  outstandingBalanceInterest?: string | number;
  lastPaymentDate?: string;
  lastPaymentAmount?: string | number;
  mailingInstruction?: string;
  occupantOwner?: string;
  ownerCategory?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow additional fields
}

const ExportCustomersPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{
    total: number;
    processed: number;
    success: boolean;
    message: string;
  } | null>(null);
  const navigate = useNavigate();

  const exportCustomersToCSV = async () => {
    setIsExporting(true);
    setExportStatus(null);

    try {
      console.log('🔄 Fetching customers from Firebase...');
      
      // Check if Firebase is initialized
      if (!db) {
        const errorMsg = 'Firebase is not initialized. Please check your configuration.';
        toast.error(errorMsg);
        setExportStatus({
          total: 0,
          processed: 0,
          success: false,
          message: errorMsg
        });
        setIsExporting(false);
        return;
      }
      
      // Fetch all customers from Firestore
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      
      if (snapshot.empty) {
        toast.error('No customers found in the database');
        setExportStatus({
          total: 0,
          processed: 0,
          success: false,
          message: 'No customers found in the database'
        });
        setIsExporting(false);
        return;
      }

      const totalCustomers = snapshot.size;
      console.log(`✅ Found ${totalCustomers} customers`);

      // Convert to array of data
      const customers: CustomerData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Define CSV headers
      const headers = [
        'Account Number',
        'Account Holder Name',
        'ID Number',
        'ERF Number',
        'Email',
        'Phone',
        'Physical Address',
        'Postal Address 1',
        'Postal Address 2',
        'Postal Address 3',
        'Postal Code',
        'Valuation',
        'Account Status',
        'Outstanding Balance',
        'Outstanding Balance Capital',
        'Outstanding Balance Interest',
        'Last Payment Date',
        'Last Payment Amount',
        'Mailing Instruction',
        'Occupant Owner',
        'Owner Category',
        'Created At',
        'Updated At'
      ];

      // Create CSV rows
      const rows = customers.map(customer => [
        customer.accountNumber || '',
        customer.accountHolderName || '',
        customer.idNumber || '',
        customer.erfNumber || '',
        customer.email || customer.emailAddress || '',
        customer.phone || customer.cellNumber || customer.phoneNumber || '',
        customer.address || customer.physicalAddress || '',
        customer.postalAddress1 || '',
        customer.postalAddress2 || '',
        customer.postalAddress3 || '',
        customer.postalCode || '',
        customer.valuation || '',
        customer.accountStatus || '',
        customer.outstandingBalance || customer.outstandingTotalBalance || '',
        customer.outstandingBalanceCapital || '',
        customer.outstandingBalanceInterest || '',
        customer.lastPaymentDate || '',
        customer.lastPaymentAmount || '',
        customer.mailingInstruction || '',
        customer.occupantOwner || '',
        customer.ownerCategory || '',
        customer.createdAt || '',
        customer.updatedAt || ''
      ]);

      // Escape CSV values (handle commas, quotes, newlines)
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Build CSV content
      const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `customers_export_${timestamp}_${time}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${totalCustomers} customers!`);
      setExportStatus({
        total: totalCustomers,
        processed: totalCustomers,
        success: true,
        message: `Successfully exported ${totalCustomers} customers to ${filename}`
      });

    } catch (error) {
      console.error('Error exporting customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Export failed: ${errorMessage}`);
      setExportStatus({
        total: 0,
        processed: 0,
        success: false,
        message: `Export failed: ${errorMessage}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Export Customers to CSV
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Download all customer data from Firebase Firestore in CSV format
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6">
          <div className="space-y-6">
            {/* Info Section */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                What will be exported?
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• All customer records from the 'customers' collection</li>
                <li>• Account numbers, names, contact details</li>
                <li>• Outstanding balances and payment history</li>
                <li>• Property information (ERF, valuation)</li>
                <li>• Timestamps (created/updated dates)</li>
              </ul>
            </div>

            {/* Export Button */}
            <div className="flex justify-center">
              <button
                onClick={exportCustomersToCSV}
                disabled={isExporting}
                className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:transform-none"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Export Customers to CSV
                  </>
                )}
              </button>
            </div>

            {/* Status Display */}
            {exportStatus && (
              <div className={`rounded-lg p-4 ${
                exportStatus.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  {exportStatus.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${
                      exportStatus.success 
                        ? 'text-green-900 dark:text-green-300' 
                        : 'text-red-900 dark:text-red-300'
                    }`}>
                      {exportStatus.success ? 'Export Successful!' : 'Export Failed'}
                    </h4>
                    <p className={`mt-1 text-sm ${
                      exportStatus.success 
                        ? 'text-green-800 dark:text-green-400' 
                        : 'text-red-800 dark:text-red-400'
                    }`}>
                      {exportStatus.message}
                    </p>
                    {exportStatus.success && (
                      <p className="mt-2 text-xs text-green-700 dark:text-green-500">
                        Total records: {exportStatus.total}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                After Export:
              </h3>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li>1. The CSV file will download to your Downloads folder</li>
                <li>2. Open with Excel, Google Sheets, or any spreadsheet application</li>
                <li>3. Verify the data is complete and accurate</li>
                <li>4. Store securely (contains sensitive customer information)</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCustomersPage;
