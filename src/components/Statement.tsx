import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
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

interface MonthOption {
  value: string;
  label: string;
  year: string;
  month: string;
}

export default function Statement() {
  const { currentUser, userData } = useAuth();
  const [selectedDateRange, setSelectedDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [currentStatement, setCurrentStatement] = useState<Statement | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption>({
    value: '2024-10',
    label: 'October 2024',
    year: '2024',
    month: '10'
  });
  const statementGenerator = new StatementGenerator({});

  // Available months for statement generation
  const availableMonths: MonthOption[] = [
    { value: '2024-10', label: 'October 2024', year: '2024', month: '10' },
    { value: '2024-11', label: 'November 2024', year: '2024', month: '11' },
    { value: '2024-12', label: 'December 2024', year: '2024', month: '12' }
  ];

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        if (!currentUser || !userData?.accountNumber) {
          toast.error('Please log in to view statements');
          setLoading(false);
          return;
        }

        if (!db) {
          toast.error('Database connection not available');
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

      // Create input for statement generator using selected month
      const statementInput = {
        accountNumber: customerData.accountNumber,
        month: selectedMonth.month,
        year: selectedMonth.year
      };

      // Generate statement using the StatementGenerator instance
      await statementGenerator.generateStatement(statementInput);
      
      await logUserActivity(
        currentUser.uid,
        'STATEMENT_DOWNLOAD',
        `Downloaded statement for ${selectedMonth.label} - Account: ${customerData.accountNumber}`,
        {
          statementMonth: selectedMonth.label
        }
      );
      
      toast.success(`Statement for ${selectedMonth.label} downloaded successfully`);
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Financial Statement - {selectedMonth.label}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Account: {customerData?.accountNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth.value}
              onChange={(e) => {
                const selected = availableMonths.find(month => month.value === e.target.value);
                if (selected) setSelectedMonth(selected);
              }}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-theme focus:border-transparent dark:bg-dark-hover dark:text-white"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`flex items-center px-4 py-2 bg-theme text-white text-sm rounded-md transition-all transform shadow-sm ${
                isDownloading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-theme/90 hover:scale-102'
              }`}
            >
              {isDownloading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm">Downloading...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-1.5" />
                  <span className="text-sm">Download Statement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-500/10 dark:from-red-500/10 dark:to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Outstanding Balance</p>
                <div className="p-1.5 bg-red-500/10 rounded-md">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                R {metrics.outstandingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center text-red-500 text-[10px] font-medium">
                <span>Due Balance</span>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Credits</p>
                <div className="p-1.5 bg-green-500/10 rounded-md">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                R {metrics.totalCredits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center text-green-500 text-[10px] font-medium">
                <span>Total Payments</span>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Transactions</p>
                <div className="p-1.5 bg-blue-500/10 rounded-md">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                  </svg>
                </div>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">
                {metrics.transactionCount}
              </p>
              <div className="flex items-center text-blue-500 text-[10px] font-medium">
                <span>Total Activities</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <DatePicker
                selectsRange
                startDate={selectedDateRange[0]}
                endDate={selectedDateRange[1]}
                onChange={(dates) => setSelectedDateRange(dates)}
                className="w-full px-2.5 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-theme focus:border-transparent dark:bg-dark-hover dark:text-white"
                placeholderText="Select date range"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'debit' | 'credit')}
                className="w-full px-2.5 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-1 focus:ring-theme focus:border-transparent dark:bg-dark-hover dark:text-white"
              >
                <option value="all">All Transactions</option>
                <option value="debit">Debits Only</option>
                <option value="credit">Credits Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-gray-700/40 dark:bg-gray-800 rounded-md overflow-hidden">
          <div className="grid grid-cols-[1fr_2fr_1fr] text-[11px] font-medium text-white p-1.5">
            <div>Date</div>
            <div>Description</div>
            <div className="text-right">Amount</div>
          </div>
          <div className="divide-y divide-gray-700/30">
            {filteredTransactions?.map((transaction, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_2fr_1fr] text-xs p-1.5 hover:bg-gray-700/20"
              >
                <div className="text-gray-300">{format(transaction.date, 'dd MMM yyyy')}</div>
                <div className="text-gray-300">{transaction.description}</div>
                <div className={`text-right ${transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  R {Math.abs(transaction.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
            {(!filteredTransactions || filteredTransactions.length === 0) && (
              <div className="text-center text-xs text-gray-400 py-2">
                No transactions found
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary */}
        <div className="mt-3 flex flex-col md:flex-row justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-md p-2">
          <div className="mb-1.5 md:mb-0 flex items-center gap-3">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Opening Balance</p>
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                R {currentStatement?.openingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Closing Balance</p>
              <p className="text-xs font-medium text-red-500 dark:text-red-400">
                R {customerData?.outstandingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}