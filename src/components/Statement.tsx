import React, { useState, useEffect } from 'react';
import { Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { StatementGenerator } from './StatementGenerator';
import toast from 'react-hot-toast';
import "react-datepicker/dist/react-datepicker.css";
import { logUserActivity } from '../utils/activity';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
}

interface Statement {
  id: string;
  period: string;
  openingBalance: number;
  closingBalance: number;
  transactions: Transaction[];
}

interface CustomerData {
  accountNumber: string;
  accountHolderName: string;
  postalAddress: string;
  postalCode: string;
  outstandingBalance: number;
  lastPaymentDate: string;
  lastPaymentAmount: number;
}

export default function Statement() {
  const { currentUser, userData } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [currentStatement, setCurrentStatement] = useState<Statement | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const statementGenerator = new StatementGenerator({});

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        if (!currentUser || !userData?.accountNumber) {
          toast.error('Please log in to view statements');
          setLoading(false);
          return;
        }

        // Fetch customer details
        const customersRef = collection(db, 'customers');
        const customerQuery = query(customersRef, where('accountNumber', '==', userData.accountNumber));
        const customerSnapshot = await getDocs(customerQuery);

        if (!customerSnapshot.empty) {
          const customerDoc = customerSnapshot.docs[0].data();
          setCustomerData({
            accountNumber: customerDoc.accountNumber,
            accountHolderName: customerDoc.accountHolderName,
            postalAddress: customerDoc.postalAddress,
            postalCode: customerDoc.postalCode,
            outstandingBalance: customerDoc.outstandingTotalBalance,
            lastPaymentDate: customerDoc.lastPaymentDate,
            lastPaymentAmount: customerDoc.lastPaymentAmount
          });

          // Fetch transactions
          const transactionsRef = collection(db, 'transactions');
          const transactionsQuery = query(
            transactionsRef,
            where('accountNumber', '==', userData.accountNumber),
            orderBy('date', 'desc')
          );
          const transactionsSnapshot = await getDocs(transactionsQuery);

          const transactions: Transaction[] = transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              date: new Date(data.date),
              description: data.description,
              amount: data.amount,
              type: data.type
            };
          });

          // Group transactions by month and create statement
          if (transactions.length > 0) {
            const currentMonth = format(new Date(), 'MMMM yyyy');
            const statement: Statement = {
              id: '1',
              period: currentMonth,
              openingBalance: customerDoc.openingBalance || 0,
              closingBalance: customerDoc.outstandingTotalBalance || 0,
              transactions: transactions
            };
            setCurrentStatement(statement);
          }
        } else {
          toast.error('Customer details not found');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load statement data');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [currentUser, userData]);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      if (!customerData) {
        toast.error('Customer data not available');
        return;
      }

      if (!currentUser) {
        toast.error('Please log in to download statements');
        return;
      }

      // Create input for statement generator
      const statementInput = {
        accountNumber: customerData.accountNumber,
        month: format(new Date(), 'MM'),
        year: format(new Date(), 'yyyy')
      };

      // Generate statement using the StatementGenerator instance
      await statementGenerator.generateStatement(statementInput);
      
      await logUserActivity(
        currentUser.uid,
        'STATEMENT_DOWNLOAD',
        `Downloaded statement for ${format(new Date(), 'MMMM yyyy')}`,
        {
          statementMonth: format(new Date(), 'MMMM yyyy'),
          accountNumber: customerData.accountNumber,
          openingBalance: currentStatement?.openingBalance || 0,
          closingBalance: currentStatement?.closingBalance || 0,
          transactionCount: filteredTransactions.length
        }
      );
      
      toast.success('Statement downloaded successfully');
    } catch (error) {
      console.error('Error generating statement:', error);
      toast.error('Failed to generate statement');
    } finally {
      setIsDownloading(false);
    }
  };

  const filteredTransactions = currentStatement?.transactions.filter(transaction => {
    const dateInRange = (!selectedDateRange[0] || !selectedDateRange[1]) ? true :
      (transaction.date >= selectedDateRange[0] && transaction.date <= selectedDateRange[1]);
    
    const typeMatch = filterType === 'all' ? true : transaction.type === filterType;
    
    return dateInRange && typeMatch;
  }) || [];

  const metrics = {
    totalDebits: filteredTransactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0),
    totalCredits: filteredTransactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0),
    transactionCount: filteredTransactions.length,
    outstandingBalance: customerData?.outstandingBalance || 0
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-16 h-16 relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-theme"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Financial Statement
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Account: {customerData?.accountNumber}
            </p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className={`flex items-center px-6 py-3 bg-theme text-white rounded-xl transition-all transform shadow-md ${
              isDownloading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-theme/90 hover:scale-105'
            }`}
          >
            {isDownloading ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Download Statement
              </>
            )}
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              R {metrics.outstandingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Credits</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              R {metrics.totalCredits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.transactionCount}
            </p>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <DatePicker
                selectsRange
                startDate={selectedDateRange[0]}
                endDate={selectedDateRange[1]}
                onChange={(dates) => setSelectedDateRange(dates)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover dark:text-white"
                placeholderText="Select date range"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Transaction Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'debit' | 'credit')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-theme focus:border-transparent dark:bg-dark-hover dark:text-white"
              >
                <option value="all">All Transactions</option>
                <option value="debit">Debits Only</option>
                <option value="credit">Credits Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {format(transaction.date, 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {transaction.description}
                    </td>
                    <td className={`px-6 py-4 text-sm text-right font-medium ${
                      transaction.type === 'credit'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      R {transaction.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Opening Balance</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              R {currentStatement?.openingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Closing Balance</p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              R {currentStatement?.closingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}