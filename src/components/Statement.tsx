import { useState, useEffect } from 'react';
import { Download, Calendar, FileText, Filter, ArrowDown, Clock, CreditCard, Activity } from 'lucide-react';
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
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);
  const statementGenerator = new StatementGenerator({});

  // Available months for statement generation
  const availableMonths: MonthOption[] = [
    { value: '2024-10', label: 'October 2024', year: '2024', month: '10' },
    { value: '2024-11', label: 'November 2024', year: '2024', month: '11' },
    { value: '2024-12', label: 'December 2024', year: '2024', month: '12' },
    { value: '2025-01', label: 'January 2025', year: '2025', month: '01' },
    { value: '2025-02', label: 'February 2025', year: '2025', month: '02' },
    { value: '2025-03', label: 'March 2025', year: '2025', month: '03' }
  ];

  useEffect(() => {
    fetchCustomerData();
  }, [currentUser, userData]);

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
          outstandingBalance: customerDoc.outstandingTotalBalance || 0,
          lastPaymentDate: customerDoc.lastPaymentDate || '',
          lastPaymentAmount: customerDoc.lastPaymentAmount || 0
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

  const handleDownloadPDF = async (monthOption: MonthOption) => {
    try {
      setDownloadingMonth(monthOption.value);
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
        month: monthOption.month,
        year: monthOption.year
      };

      // Generate statement using the StatementGenerator instance
      await statementGenerator.generateStatement(statementInput);
      
      await logUserActivity(
        currentUser.uid,
        'STATEMENT_DOWNLOAD',
        `Downloaded statement for ${monthOption.label} - Account: ${customerData.accountNumber}`,
        {
          statementMonth: monthOption.label
        }
      );
      
      toast.success(`Statement for ${monthOption.label} downloaded successfully`);
    } catch (error) {
      console.error('Error generating statement:', error);
      toast.error('Failed to generate statement');
    } finally {
      setDownloadingMonth(null);
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
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-800">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-500" />
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
              onClick={() => handleDownloadPDF(selectedMonth)}
              disabled={downloadingMonth === selectedMonth.value}
              className={`flex items-center px-4 py-2 bg-theme text-white text-sm rounded-md transition-all transform shadow-sm ${
                downloadingMonth === selectedMonth.value ? 'opacity-75 cursor-not-allowed' : 'hover:bg-theme/90 hover:scale-102'
              }`}
            >
              {downloadingMonth === selectedMonth.value ? (
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

        {/* Statement Cards Section */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-500" />
            Available Statements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {availableMonths.map((month) => (
              <div 
                key={month.value} 
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-800 dark:text-white">{month.label}</h4>
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Statement Period</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{month.label}</span>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(month)}
                    disabled={downloadingMonth === month.value}
                    className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      downloadingMonth === month.value
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    {downloadingMonth === month.value ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-blue-500" />
            Account Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-red-500/10 dark:from-red-500/10 dark:to-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Outstanding Balance</p>
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <CreditCard className="w-5 h-5 text-red-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  R {metrics.outstandingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center text-red-500 text-xs font-medium">
                  <span>Due Balance</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-green-500/10 dark:from-green-500/10 dark:to-green-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Credits</p>
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <ArrowDown className="w-5 h-5 text-green-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  R {metrics.totalCredits.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center text-green-500 text-xs font-medium">
                  <span>Total Payments</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Transactions</p>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.transactionCount}
                </p>
                <div className="flex items-center text-blue-500 text-xs font-medium">
                  <span>Total Activities</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-blue-500" />
            Transaction Filters
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <DatePicker
                  selectsRange
                  startDate={selectedDateRange[0]}
                  endDate={selectedDateRange[1]}
                  onChange={(dates) => setSelectedDateRange(dates)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholderText="Select date range"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Transaction Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'all' | 'debit' | 'credit')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Transactions</option>
                  <option value="debit">Debits Only</option>
                  <option value="credit">Credits Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-500" />
            Transaction History
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="bg-gray-100 dark:bg-gray-700 grid grid-cols-[1fr_2fr_1fr] text-sm font-medium text-gray-700 dark:text-gray-200 p-3 border-b border-gray-200 dark:border-gray-600">
              <div>Date</div>
              <div>Description</div>
              <div className="text-right">Amount</div>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTransactions?.map((transaction, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_2fr_1fr] text-sm p-3 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <div className="text-gray-600 dark:text-gray-300">{format(transaction.date, 'dd MMM yyyy')}</div>
                  <div className="text-gray-700 dark:text-gray-200">{transaction.description}</div>
                  <div className={`text-right ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    R {Math.abs(transaction.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
              {(!filteredTransactions || filteredTransactions.length === 0) && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-6">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No transactions found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or date range</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Opening Balance</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  R {currentStatement?.openingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Closing Balance</p>
                <p className="text-lg font-medium text-red-600 dark:text-red-400">
                  R {customerData?.outstandingBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}