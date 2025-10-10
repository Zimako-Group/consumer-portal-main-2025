import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
  lastPaymentDate?: string;
  lastPaymentAmount?: string | number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; // Allow additional fields
}

const ExportCustomersButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportCustomersToCSV = async () => {
    setIsExporting(true);
    const loadingToast = toast.loading('Fetching customers from Firebase...');

    try {
      // Check if Firebase is initialized
      if (!db) {
        toast.error('Firebase is not initialized. Please check your configuration.', { id: loadingToast });
        setIsExporting(false);
        return;
      }

      // Fetch all customers from Firestore
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      
      if (snapshot.empty) {
        toast.error('No customers found in the database', { id: loadingToast });
        setIsExporting(false);
        return;
      }

      // Convert to array of data
      const customers: CustomerData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      toast.loading(`Processing ${customers.length} customers...`, { id: loadingToast });

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
        'Last Payment Date',
        'Last Payment Amount',
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
        customer.lastPaymentDate || '',
        customer.lastPaymentAmount || '',
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
      const filename = `customers_export_${timestamp}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${customers.length} customers!`, { id: loadingToast });
    } catch (error) {
      console.error('Error exporting customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Export failed: ${errorMessage}`, { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportCustomersToCSV}
      disabled={isExporting}
      className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
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
  );
};

export default ExportCustomersButton;
