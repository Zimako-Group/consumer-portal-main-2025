import { CustomerData } from '../services/customerService';

const formatDate = (date: string | undefined) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString();
};

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined) return '';
  return `R ${amount.toFixed(2)}`;
};

export const exportToCSV = (customers: CustomerData[], filename: string = 'customers') => {
  // Define CSV headers and corresponding data fields
  const headers = [
    'Account Number',
    'Account Holder',
    'ID Number',
    'ERF Number',
    'Outstanding Balance',
    'Account Status',
    'Email Address',
    'Phone Number',
    'Postal Address',
    'Last Payment Amount',
    'Last Payment Date'
  ];

  const dataFields = [
    'accountNumber',
    'accountHolderName',
    'idNumber',
    'erfNumber',
    'outstandingTotalBalance',
    'accountStatus',
    'emailAddress',
    'cellNumber',
    'postalAddress1',
    'lastPaymentAmount',
    'lastPaymentDate'
  ] as (keyof CustomerData)[];

  // Create CSV content
  const csvContent = [
    // Headers
    headers.join(','),
    // Data rows
    ...customers.map(customer => 
      dataFields.map(field => {
        const value = customer[field];
        
        // Handle different data types
        if (field === 'outstandingTotalBalance' || field === 'lastPaymentAmount') {
          return formatCurrency(value as number);
        }
        if (field === 'lastPaymentDate') {
          return formatDate(value as string);
        }
        if (field === 'postalAddress1') {
          // Combine postal address fields
          const address = [
            customer.postalAddress1,
            customer.postalAddress2,
            customer.postalAddress3,
            customer.postalCode
          ].filter(Boolean).join(', ');
          return `"${address}"`; // Wrap in quotes to handle commas
        }
        
        // Handle general string fields
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`; // Wrap in quotes if contains comma
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};