import React, { useState, useEffect } from 'react';
import { Send, Mail, MessageSquare, Phone, Info, Plus, Loader2 } from 'lucide-react';
import Tooltip from './Tooltip';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import SuperPaymentReminder from './SuperPaymentReminder';
import { sendSMSAndRecord, sendEmailAndRecord, updateCommunicationStats } from '../services/communicationService';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  fullName: string;
  accountNumber: string;
  outstandingTotalBalance: number;
  email: string;
  phoneNumber: string;
  communicationStats?: {
    sms: number;
    email: number;
    whatsapp: number;
  };
}

function AdminPaymentReminder() {
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(10);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const sendPaymentReminderSMS = async (phoneNumber: string, customerName: string, amount: number, accountNumber: string) => {
    try {
      const message = `Dear ${customerName}, this is a reminder that you have an outstanding balance of R${amount.toLocaleString()} on your Mohokare Municipality account. Please make payment as soon as possible to avoid service interruption.`;
      
      await sendSMSAndRecord(
        phoneNumber,
        message,
        accountNumber,
        'System Admin'
      );
      
      // Update communication stats for reporting
      await updateCommunicationStats('sms');
      
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  };

  const sendPaymentReminderEmail = async (email: string, customerName: string, amount: number, accountNumber: string) => {
    try {
      const subject = 'Payment Reminder - Mohokare Municipality';
      const message = `
        <h2>Payment Reminder</h2>
        <p>Dear ${customerName},</p>
        <p>This is a friendly reminder that you have an outstanding balance of <strong>R${amount.toLocaleString()}</strong> on your Mohokare Municipality account.</p>
        <p>Please make payment as soon as possible to avoid any service interruption.</p>
        <p>If you have already made the payment, please disregard this message.</p>
        <br>
        <p>Best regards,</p>
        <p>Mohokare Municipality</p>
      `;
      
      await sendEmailAndRecord(
        email,
        subject,
        message,
        accountNumber,
        'System Admin'
      );
      
      // Update communication stats for reporting
      await updateCommunicationStats('email');
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const customersRef = collection(db, 'customers');
        const q = query(
          customersRef,
          orderBy('outstandingTotalBalance', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedCustomers: Customer[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const outstandingBalance = parseFloat(data.outstandingTotalBalance);
          
          // Only add customer if they have a valid numeric balance
          if (!isNaN(outstandingBalance)) {
            fetchedCustomers.push({
              id: doc.id,
              fullName: data.accountHolderName || 'N/A',
              accountNumber: data.accountNumber || 'N/A',
              outstandingTotalBalance: outstandingBalance,
              email: data.contactDetails?.email || '',
              phoneNumber: data.contactDetails?.phoneNumber || '',
              communicationStats: data.communicationStats || {
                sms: 0,
                email: 0,
                whatsapp: 0
              }
            });
          }
        });
        
        setCustomers(fetchedCustomers);
      } catch (err) {
        setError('Failed to fetch customers');
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleSingleAction = async (customer: Customer, method: 'sms' | 'email') => {
    try {
      setSendingMessages(true);
      
      if (method === 'sms' && customer.phoneNumber) {
        await sendPaymentReminderSMS(
          customer.phoneNumber,
          customer.fullName,
          customer.outstandingTotalBalance,
          customer.accountNumber
        );
        toast.success('SMS sent successfully');
      } else if (method === 'email' && customer.email) {
        await sendPaymentReminderEmail(
          customer.email,
          customer.fullName,
          customer.outstandingTotalBalance,
          customer.accountNumber
        );
        toast.success('Email sent successfully');
      } else {
        toast.error(`No ${method === 'sms' ? 'phone number' : 'email'} available for this customer`);
      }
    } catch (error) {
      console.error(`Error sending ${method}:`, error);
      toast.error(`Failed to send ${method}. Please try again.`);
    } finally {
      setSendingMessages(false);
    }
  };

  const handleBulkAction = async (method: 'sms' | 'email') => {
    try {
      setSendingMessages(true);
      const selectedCustomerDetails = customers.filter(c => selectedCustomers.includes(c.id));
      let successCount = 0;
      let failCount = 0;
      
      setProgress({ current: 0, total: selectedCustomerDetails.length });
      
      for (const customer of selectedCustomerDetails) {
        try {
          if (method === 'sms' && customer.phoneNumber) {
            await sendPaymentReminderSMS(
              customer.phoneNumber,
              customer.fullName,
              customer.outstandingTotalBalance,
              customer.accountNumber
            );
            successCount++;
          } else if (method === 'email' && customer.email) {
            await sendPaymentReminderEmail(
              customer.email,
              customer.fullName,
              customer.outstandingTotalBalance,
              customer.accountNumber
            );
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error(`Error sending ${method} to ${customer.fullName}:`, error);
          failCount++;
        }
        
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      }
      
      toast.success(
        `Bulk ${method} completed: ${successCount} successful, ${failCount} failed`
      );
      
      // Clear selection after successful bulk action
      setSelectedCustomers([]);
    } catch (error) {
      console.error(`Error sending bulk ${method}:`, error);
      toast.error(`Failed to complete bulk ${method} operation. Please try again.`);
    } finally {
      setSendingMessages(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  // Calculate pagination values
  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = customers.slice(indexOfFirstCustomer, indexOfLastCustomer);
  const totalPages = Math.ceil(customers.length / customersPerPage);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 7; // Total number of page buttons to show
    const halfVisible = Math.floor(maxVisiblePages / 2);

    if (totalPages <= maxVisiblePages) {
      // If total pages is less than max visible, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Calculate start and end of middle section
      let startPage = Math.max(2, currentPage - halfVisible);
      let endPage = Math.min(totalPages - 1, currentPage + halfVisible);

      // Adjust if current page is near the start
      if (currentPage <= halfVisible + 1) {
        endPage = maxVisiblePages - 1;
      }
      // Adjust if current page is near the end
      else if (currentPage >= totalPages - halfVisible) {
        startPage = totalPages - (maxVisiblePages - 2);
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Clear selected customers when changing pages
    setSelectedCustomers([]);
  };

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Reminders</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Send payment reminders to customers with outstanding balances
          </p>
        </div>
      </div>

      {/* Progress Bar for Bulk Actions */}
      {sendingMessages && progress.total > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mb-4">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${(progress.current / progress.total) * 100}%` }}
          />
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Processing: {progress.current} of {progress.total}
          </p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Customers</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-700 dark:text-blue-300">
            {customers.length}
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Total Outstanding</h3>
          <p className="mt-2 text-2xl font-semibold text-yellow-700 dark:text-yellow-300">
            R {customers.reduce((sum, customer) => {
                const balance = parseFloat(customer.outstandingTotalBalance.toString());
                return !isNaN(balance) ? sum + balance : sum;
              }, 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600 dark:text-green-400">Selected</h3>
          <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-300">
            {selectedCustomers.length}
          </p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{selectedCustomers.length}</span>
            <span className="ml-1">customers selected</span>
          </div>
          
          <div className="flex gap-2">
            <Tooltip content="Send bulk SMS">
              <button
                onClick={() => handleBulkAction('sms')}
                disabled={selectedCustomers.length === 0 || sendingMessages}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  selectedCustomers.length === 0 || sendingMessages
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 shadow-sm hover:shadow'
                }`}
              >
                {sendingMessages ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Phone className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
            
            <Tooltip content="Send bulk email">
              <button
                onClick={() => handleBulkAction('email')}
                disabled={selectedCustomers.length === 0 || sendingMessages}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  selectedCustomers.length === 0 || sendingMessages
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 shadow-sm hover:shadow'
                }`}
              >
                {sendingMessages ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCustomers(customers.map(c => c.id));
                      } else {
                        setSelectedCustomers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Customer Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Account Number
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Outstanding Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-red-500">
                    <div className="flex items-center justify-center space-x-2">
                      <Info className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No customers found with outstanding balances
                  </td>
                </tr>
              ) : (
                currentCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCustomers([...selectedCustomers, customer.id]);
                          } else {
                            setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {customer.fullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {customer.accountNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        customer.outstandingTotalBalance > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        R {customer.outstandingTotalBalance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex space-x-2">
                        <Tooltip content={customer.phoneNumber ? "Send SMS" : "No phone number available"}>
                          <button
                            onClick={() => handleSingleAction(customer, 'sms')}
                            disabled={!customer.phoneNumber}
                            className={`p-1.5 rounded-lg transition-colors ${
                              customer.phoneNumber
                                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        
                        <Tooltip content={customer.email ? "Send Email" : "No email available"}>
                          <button
                            onClick={() => handleSingleAction(customer, 'email')}
                            disabled={!customer.email}
                            className={`p-1.5 rounded-lg transition-colors ${
                              customer.email
                                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                                : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {customers.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {indexOfFirstCustomer + 1} to {Math.min(indexOfLastCustomer, customers.length)} of {customers.length} customers
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded-md text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  First
                </button>
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 rounded-md text-sm ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Previous
                </button>
                
                {getPageNumbers().map((number, index) => (
                  <button
                    key={index}
                    onClick={() => typeof number === 'number' ? paginate(number) : null}
                    disabled={typeof number !== 'number'}
                    className={`px-2 py-1 min-w-[32px] rounded-md text-sm ${
                      number === currentPage
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : number === '...'
                        ? 'bg-transparent text-gray-500 cursor-default'
                        : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {number}
                  </button>
                ))}

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-md text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Next
                </button>
                <button
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-2 py-1 rounded-md text-sm ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-600 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Divider */}
      <div className="relative my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white dark:bg-gray-800 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
            Advanced Payment Reminder System
          </span>
        </div>
      </div>

      {/* Super Payment Reminder Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Advanced Payment Reminder Management
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Use this advanced system to manage payment reminders with templates and scheduling options.
          </p>
        </div>
        <SuperPaymentReminder />
      </div>
    </div>
  );
}

export default AdminPaymentReminder;