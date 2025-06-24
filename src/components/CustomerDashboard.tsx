import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CustomerData as BaseCustomerData } from '../services/customerService';

// Extended CustomerData interface to include properties from different data sources
interface CustomerData extends BaseCustomerData {
  outstandingTotalBalance?: number;
}
import { Download, FileDown, CheckSquare, Square, BarChart2, X, Search, Filter } from 'lucide-react';
import CustomerDetailsModalContainer from './CustomerDetailsModal';
import ReportModal from './ReportModal';
import { Toaster } from 'react-hot-toast';
import { exportToCSV } from '../utils/exportUtils';
import { generateCustomerReport, generateChartConfigs, ReportMetrics, ChartConfigs } from '../services/reportService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { generateStatement } from './StatementGenerator';
import { useDebounce } from '../hooks/useDebounce';
import { useTheme } from '../contexts/ThemeContext';

interface CustomerDashboardProps {
  onLogout: () => Promise<boolean>;
  userEmail: string;
  userName: string;
  accountNumber: string;
}

const PAGE_SIZE = 10;

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ 
  onLogout, 
  userEmail, 
  userName, 
  accountNumber 
}) => {
  const { isDarkMode } = useTheme();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('accountNumber');
  const [allCustomers, setAllCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportMetrics, setReportMetrics] = useState<ReportMetrics | null>(null);
  const [chartConfigs, setChartConfigs] = useState<ChartConfigs | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStates, setLoadingStates] = useState({
    table: false,
    export: false,
    statement: new Set<string>(),
    report: false
  });

  const setLoadingState = (key: keyof typeof loadingStates, value: any) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  const fetchAllCustomers = async () => {
    try {
      setLoading(true);
      // Fetch basic customer data
      const customersQuery = query(collection(db, 'customers'), orderBy(selectedFilter));
      const snapshot = await getDocs(customersQuery);
      
      // Fetch balance data from the balances collection if it exists
      const balancesQuery = query(collection(db, 'customer_balances'));
      const balancesSnapshot = await getDocs(balancesQuery);
      
      // Create a map of account numbers to balance data
      const balancesMap = new Map();
      balancesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.accountNumber) {
          balancesMap.set(data.accountNumber, data);
        }
      });
      
      // Merge customer data with balance data
      const customerList = snapshot.docs.map(doc => {
        const customerData = doc.data();
        const accountNumber = doc.id;
        const balanceData = balancesMap.get(accountNumber);
        
        return {
          id: doc.id,
          ...customerData,
          // Use outstandingTotalBalance from balances collection if available,
          // otherwise fall back to outstandingBalance from customer data
          outstandingTotalBalance: balanceData?.outstandingTotalBalance || customerData.outstandingBalance || 0
        };
      }) as CustomerData[];
      
      setAllCustomers(customerList);
    } catch (error) {
      console.error('Error fetching all customers:', error);
      setError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const filterCustomers = (customers: CustomerData[], searchValue: string, filterField: string) => {
    if (!searchValue) return customers;

    return customers.filter(customer => {
      const fieldValue = customer[filterField as keyof CustomerData];
      if (fieldValue === undefined) return false;

      const searchLower = searchValue.toLowerCase();
      const fieldValueString = String(fieldValue).toLowerCase();

      switch (filterField) {
        case 'accountHolderName':
          // Partial match for names
          return fieldValueString.includes(searchLower);
        case 'erfNumber':
        case 'idNumber':
        case 'accountNumber':
          // Partial match for numeric fields
          return fieldValueString.includes(searchLower);
        default:
          return fieldValueString === searchLower;
      }
    });
  };

  const [searchInput, setSearchInput] = useState('');
  const debouncedSearchTerm = useDebounce(searchInput, 300);

  useEffect(() => {
    setSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  const fetchInitialCustomers = async () => {
    setLoadingState('table', true);
    setError(null);
    try {
      setLoading(true);
      const customersQuery = query(
        collection(db, 'customers'),
        orderBy(selectedFilter)
      );

      const snapshot = await getDocs(customersQuery);
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CustomerData[];

      setCustomers(customerList);
      setAllCustomers(customerList); // Store all customers
      setLoading(false);
    } catch (error) {
      console.error('Error fetching initial customers:', error);
      setError('Failed to load customers. Please try again.');
      toast.error('Failed to load customers');
    } finally {
      setLoadingState('table', false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialCustomers();
  }, [selectedFilter]); // Refetch when filter changes

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return filterCustomers(customers, searchTerm, selectedFilter);
  }, [searchTerm, selectedFilter, customers]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCustomers, currentPage, PAGE_SIZE]);

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handlePageClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  useEffect(() => {
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSearchInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFilter(event.target.value);
    setSearchInput(''); // Reset search when changing filter
  };

  const handleRowClick = useCallback((customer: CustomerData) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    setLoadingState('export', true);
    try {
      const dataToExport = searchTerm
        ? filteredCustomers
        : allCustomers;

      const filename = searchTerm
        ? `customers_filtered_${selectedFilter}`
        : 'customers_all';

      exportToCSV(dataToExport, filename);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Export failed');
    } finally {
      setLoadingState('export', false);
    }
  }, [searchTerm, selectedFilter, filteredCustomers, allCustomers]);

  const handleCustomerUpdate = (updatedCustomer: CustomerData) => {
    // Update the customer in the customers list
    setCustomers(prevCustomers =>
      prevCustomers.map(customer =>
        customer.accountNumber === updatedCustomer.accountNumber
          ? updatedCustomer
          : customer
      )
    );

    // Update the customer in allCustomers list
    setAllCustomers(prevCustomers =>
      prevCustomers.map(customer =>
        customer.accountNumber === updatedCustomer.accountNumber
          ? updatedCustomer
          : customer
      )
    );

    // Update the selected customer
    setSelectedCustomer(updatedCustomer);
  };

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    if (selectMode) {
      // Clear selections when exiting select mode
      setSelectedCustomers(new Set());
    }
  };

  const toggleCustomerSelection = (customer: CustomerData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    const accountNumber = customer.accountNumber;
    const newSelected = new Set(selectedCustomers);
    
    if (newSelected.has(accountNumber)) {
      newSelected.delete(accountNumber);
    } else {
      newSelected.add(accountNumber);
    }
    
    setSelectedCustomers(newSelected);
  };

  const handleExportSelected = () => {
    if (selectedCustomers.size === 0) {
      toast.error('Please select at least one customer to export');
      return;
    }

    setLoadingState('export', true);
    try {
      const selectedCustomersData = customers.filter(
        customer => selectedCustomers.has(customer.accountNumber)
      );

      exportToCSV(selectedCustomersData, 'selected_customers');
      toast.success(`Exported ${selectedCustomers.size} customers successfully`);
    } catch (error) {
      console.error('Error exporting selected customers:', error);
      toast.error('Failed to export selected customers');
    } finally {
      setLoadingState('export', false);
    }
  };

  const handleGenerateReport = () => {
    const metrics = generateCustomerReport(allCustomers);
    const configs = generateChartConfigs(metrics);
    setReportMetrics(metrics);
    setChartConfigs(configs);
    setIsReportModalOpen(true);
  };

  const exportReportToPDF = async () => {
    if (!reportMetrics || !chartConfigs) {
      toast.error('Report data is not available');
      return;
    }
  
    setLoadingState('report', true);
    try {
      const doc = new jsPDF();
      
      // Helper functions
      const formatNumber = (value: number | undefined | null): string => 
        new Intl.NumberFormat('en-ZA').format(Number(value || 0));
      
      const formatCurrency = (value: number | undefined | null): string => 
        new Intl.NumberFormat('en-ZA', {
          style: 'currency',
          currency: 'ZAR',
          minimumFractionDigits: 2
        }).format(Number(value || 0));
  
      // Header
      doc.setFillColor(41, 128, 185); // Professional blue
      doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.text('Customer Analytics Report', 20, 25);
      
      // Subtitle with date
      doc.setFontSize(12);
      doc.text(`Generated on ${new Date().toLocaleDateString('en-ZA')}`, 20, 35);
      
      // Reset text color
      doc.setTextColor(0, 0, 0);
  
      // Executive Summary
      doc.setFontSize(16);
      doc.text('Executive Summary', 20, 55);
      doc.setFontSize(10);
      const summaryText = `This report provides a comprehensive analysis of ${formatNumber(reportMetrics.totalCustomers)} customers, ` +
        `with ${formatNumber(reportMetrics.activeCustomers)} active accounts and a total outstanding balance of ${formatCurrency(reportMetrics.totalOutstandingBalance)}.`;
      doc.text(doc.splitTextToSize(summaryText, 170), 20, 65);
  
      // Key Metrics Section
      doc.setFontSize(14);
      doc.text('Key Performance Indicators', 20, 85);
  
      // Create a grid layout for KPIs
      const kpiData = [
        [
          { title: 'Total Customers', value: formatNumber(reportMetrics.totalCustomers) },
          { title: 'Active Customers', value: formatNumber(reportMetrics.activeCustomers) },
          { title: 'Inactive Customers', value: formatNumber(reportMetrics.inactiveCustomers) }
        ],
        [
          { title: 'Total Outstanding', value: formatCurrency(reportMetrics.totalOutstandingBalance) },
          { title: 'Average Outstanding', value: formatCurrency(reportMetrics.averageOutstandingBalance) },
          { title: 'Collection Rate', value: `${((reportMetrics.recentPaymentStats?.totalPayments || 0) / (reportMetrics.totalOutstandingBalance || 1) * 100).toFixed(1)}%` }
        ]
      ];
  
      // KPI Grid
      let yPos = 95;
      kpiData.forEach((row, rowIndex) => {
        row.forEach((kpi, colIndex) => {
          const xPos = 20 + (colIndex * 60);
          doc.setFontSize(12);
          doc.setTextColor(100, 100, 100);
          doc.text(kpi.title, xPos, yPos);
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.text(kpi.value, xPos, yPos + 7);
        });
        yPos += 25;
      });
  
      // Payment Statistics
      doc.setFontSize(14);
      doc.text('Payment Analysis', 20, yPos + 10);
  
      const paymentStats = [
        ['Metric', 'Value', 'Trend'],
        ['Total Payments', formatCurrency(reportMetrics.recentPaymentStats?.totalPayments), '↑'],
        ['Average Payment', formatCurrency(reportMetrics.recentPaymentStats?.averagePayment), '→'],
        ['Customers with Payments', formatNumber(reportMetrics.recentPaymentStats?.customersWithPayments), '↑']
      ];
  
      (doc as any).autoTable({
        startY: yPos + 15,
        head: [paymentStats[0]],
        body: paymentStats.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 }
      });
  
      // Outstanding Balance Distribution
      doc.setFontSize(14);
      doc.text('Outstanding Balance Distribution', 20, (doc as any).lastAutoTable.finalY + 15);
  
      if (Array.isArray(reportMetrics.outstandingBalanceRanges)) {
        const balanceData = reportMetrics.outstandingBalanceRanges.map(range => [
          range.range || 'N/A',
          formatNumber(range.count),
          formatCurrency(range.totalAmount),
          `${((range.count / (reportMetrics.totalCustomers || 1)) * 100).toFixed(1)}%`
        ]);
  
        (doc as any).autoTable({
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [['Range', 'Customers', 'Total Amount', 'Distribution']],
          body: balanceData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185] },
          styles: { fontSize: 10 }
        });
      }
  
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Page ${i} of ${pageCount} | Confidential Document`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }
  
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `customer_analytics_report_${timestamp}.pdf`;
  
      // Save the PDF
      doc.save(filename);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingState('report', false);
    }
  };

  const handleDownloadStatement = async (customer: CustomerData, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingState('statement', new Set([...loadingStates.statement, customer.accountNumber]));
    try {
      // Create a CustomerInput object with the required properties
      const currentDate = new Date();
      const customerInput = {
        accountNumber: customer.accountNumber,
        month: currentDate.getMonth() + 1 + '', // Convert to string (1-12)
        year: currentDate.getFullYear() + '' // Convert to string
      };
      await generateStatement(customerInput);
      toast.success('Statement downloaded successfully');
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast.error('Failed to download statement');
    } finally {
      const newSet = new Set(loadingStates.statement);
      newSet.delete(customer.accountNumber);
      setLoadingState('statement', newSet);
    }
  };

  const CustomerRow = ({ customer }: { customer: CustomerData }) => {
    const { isDarkMode } = useTheme();
    
    return (
      <div 
        className={`grid grid-cols-[1fr,1.5fr,1fr,1fr,0.8fr,0.5fr] gap-4 items-center border-b transition-colors duration-200 ${
          isDarkMode 
            ? 'border-gray-700 hover:bg-gray-800' 
            : 'border-gray-100 hover:bg-gray-50'
        } ${selectMode ? '' : 'cursor-pointer'}`}
        onClick={() => !selectMode && handleRowClick(customer)}
      >
        {selectMode && (
          <div className="p-4 w-10">
            <button
              onClick={(e) => toggleCustomerSelection(customer, e)}
              className={`transition-colors duration-200 ${
                isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {selectedCustomers.has(customer.accountNumber) 
                ? <CheckSquare className="w-5 h-5" /> 
                : <Square className="w-5 h-5" />
              }
            </button>
          </div>
        )}
        <div className="p-4 truncate">{customer.accountNumber}</div>
        <div className="p-4 truncate">{customer.accountHolderName}</div>
        <div className="p-4 truncate hidden md:block">{customer.idNumber || 'N/A'}</div>
        <div className="p-4 truncate">
          <span className={`font-medium ${
            (customer.outstandingTotalBalance || customer.outstandingBalance || 0) > 0
              ? isDarkMode ? 'text-red-400' : 'text-red-600'
              : isDarkMode ? 'text-green-400' : 'text-green-600'
          }`}>
            R {(customer.outstandingTotalBalance || customer.outstandingBalance || 0).toFixed(2)}
          </span>
        </div>
        <div className="p-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            customer.accountStatus?.toLowerCase() === 'active'
              ? isDarkMode
                ? 'bg-green-900/50 text-green-300'
                : 'bg-green-100 text-green-800'
              : isDarkMode
                ? 'bg-red-900/50 text-red-300'
                : 'bg-red-100 text-red-800'
          }`}>
            {customer.accountStatus}
          </span>
        </div>
        <div className="p-4 flex justify-center">
          <button
            className={`transition-colors duration-200 ${
              isDarkMode
                ? 'text-gray-400 hover:text-white disabled:text-gray-600'
                : 'text-gray-600 hover:text-blue-600 disabled:text-gray-400'
            }`}
            title="Download Statement"
            onClick={(e) => handleDownloadStatement(customer, e)}
            disabled={loadingStates.statement.has(customer.accountNumber)}
          >
            {loadingStates.statement.has(customer.accountNumber) 
              ? <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                  isDarkMode ? 'border-gray-400' : 'border-gray-600'
                }`} />
              : <Download className="w-5 h-5" />
            }
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen p-4 transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    }`}>
      <Toaster 
        position="top-right"
        toastOptions={{
          className: isDarkMode ? '!bg-gray-800 !text-white' : ''
        }}
      />
      
      {error && (
        <div className={`mb-6 p-4 rounded-lg border ${
          isDarkMode 
            ? 'bg-red-900/50 border-red-700 text-red-200' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <strong className="font-bold">Error!</strong>
              <span className="ml-2">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-current hover:opacity-75"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* User Info */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-sm text-gray-500">{userEmail}</span>
              {accountNumber && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  Account: {accountNumber}
                </span>
              )}
            </div>
            <button
              onClick={onLogout}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              <X className="h-5 w-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className={`relative flex-grow max-w-md ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchInput}
                onChange={handleSearchInput}
                className={`pl-10 pr-4 py-2 w-full rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 focus:border-blue-500'
                } transition-colors duration-200`}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={handleFilterChange}
                className={`pl-10 pr-4 py-2 rounded-lg border appearance-none ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white'
                    : 'bg-white border-gray-300'
                } transition-colors duration-200`}
              >
                <option value="accountNumber">Account Number</option>
                <option value="accountHolderName">Account Holder Name</option>
                <option value="idNumber">ID Number</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button
              onClick={handleGenerateReport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <BarChart2 className="h-5 w-5" />
              <span className="hidden sm:inline">Generate Report</span>
            </button>

            <button
              onClick={toggleSelectMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                selectMode
                  ? isDarkMode
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                  : isDarkMode
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {selectMode ? 'Cancel Selection' : 'Select Customers'}
            </button>

            {selectMode ? (
              <button
                onClick={handleExportSelected}
                disabled={loadingStates.export || selectedCustomers.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                } disabled:cursor-not-allowed`}
              >
                <FileDown className="h-5 w-5" />
                <span className="hidden sm:inline">
                  {loadingStates.export 
                    ? 'Exporting...' 
                    : `Export Selected (${selectedCustomers.size})`
                  }
                </span>
              </button>
            ) : (
              <button
                onClick={handleExport}
                disabled={loadingStates.export || customers.length === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  isDarkMode
                    ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-800'
                    : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300'
                } disabled:cursor-not-allowed`}
              >
                <FileDown className="h-5 w-5" />
                <span className="hidden sm:inline">
                  {loadingStates.export ? 'Exporting...' : 'Export All'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className={`mt-6 rounded-lg shadow-sm overflow-hidden ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
              <p className="mt-2">Loading customers...</p>
            </div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <p>No customers found</p>
            </div>
          ) : (
            <div>
              {/* Table Headers */}
              <div className={`grid grid-cols-[1fr,1.5fr,1fr,1fr,0.8fr,0.5fr] gap-4 p-4 font-medium border-b ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                {selectMode && <div className="w-10"></div>}
                <div className="truncate">Account Number</div>
                <div className="truncate">Account Holder</div>
                <div className="truncate hidden md:block">ID Number</div>
                <div className="truncate">Outstanding Balance</div>
                <div className="truncate">Status</div>
                <div className="truncate text-center">Actions</div>
              </div>

              {/* Customer Rows */}
              {paginatedCustomers.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredCustomers.length > 0 && (
          <div className={`mt-4 flex flex-col gap-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm`}>
            {/* Results count */}
            <div className="px-4 py-3 sm:px-6">
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Showing{' '}
                <span className="font-medium">{((currentPage - 1) * PAGE_SIZE) + 1}</span>
                {' '}to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)}
                </span>
                {' '}of{' '}
                <span className="font-medium">{filteredCustomers.length}</span>
                {' '}results
              </p>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center px-4 py-3 sm:px-6 border-t border-gray-200 dark:border-gray-700">
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                {/* Previous button */}
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold
                    ${currentPage === 1
                      ? `${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                      : `${isDarkMode 
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                    focus:z-20 focus:outline-offset-0`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 7) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i < 5 ? i + 1 : i === 5 ? '...' : totalPages;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = i === 0 ? 1 : i === 1 ? '...' : totalPages - (5 - i);
                  } else {
                    pageNumber = i === 0 ? 1 : i === 1 ? '...' : i === 5 ? '...' : i === 6 ? totalPages : currentPage + (i - 3);
                  }

                  if (pageNumber === '...') {
                    return (
                      <span
                        key={`ellipsis-${i}`}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold
                          ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-700'}
                          ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}`}
                      >
                        ...
                      </span>
                    );
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => typeof pageNumber === 'number' && handlePageClick(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold
                        ${pageNumber === currentPage
                          ? `${isDarkMode 
                              ? 'bg-theme text-white' 
                              : 'bg-theme text-white'} 
                            z-10`
                          : `${isDarkMode 
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        ring-1 ring-inset 
                        ${pageNumber === currentPage
                          ? 'ring-theme'
                          : isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                        focus:z-20 focus:outline-offset-0`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                {/* Next button */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className={`relative inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold
                    ${currentPage >= totalPages
                      ? `${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                      : `${isDarkMode 
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                    focus:z-20 focus:outline-offset-0`}
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Modals */}
        <CustomerDetailsModalContainer
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          customer={selectedCustomer}
          onCustomerUpdate={handleCustomerUpdate}
        />

        {reportMetrics && chartConfigs && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            metrics={reportMetrics}
            chartConfigs={chartConfigs}
            onExportReport={exportReportToPDF}
            isExporting={loadingStates.report}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;