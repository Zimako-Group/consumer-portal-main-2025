import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, query, getDocs, orderBy, Firestore } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { CustomerData as BaseCustomerData } from '../services/customerService';
import PeriodSelectionModal from './PeriodSelectionModal';

// Extended CustomerData interface to include properties from different data sources
interface CustomerData extends BaseCustomerData {
  outstandingTotalBalance?: number;
}
import { Download, FileDown, CheckSquare, Square, BarChart2, X, Search, Filter } from 'lucide-react';
import CustomerDetailsModalContainer from './CustomerDetailsModal';
import ReportModal from './ReportModal';
import { Toaster } from 'react-hot-toast';
import { exportToCSV } from '../utils/exportUtils';
import { generateCustomerReport, generateChartConfigs, ReportMetrics as BaseReportMetrics, ChartConfigs as BaseChartConfigs } from '../services/reportService';

// Extended interfaces to include properties used in the PDF export
interface ReportMetrics extends BaseReportMetrics {
  topCustomers: Array<CustomerData>;
}

interface ChartConfigs extends BaseChartConfigs {
  statusDistribution?: boolean;
  balanceDistribution?: boolean;
}
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
  const [error, setError] = useState<string | null>(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<CustomerData | null>(null);
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
      if (!db) {
        console.error('Firestore database is not initialized');
        setError('Database connection error');
        return;
      }
    
      const customersQuery = query(collection(db as Firestore, 'customers'), orderBy(selectedFilter));
      const snapshot = await getDocs(customersQuery);
      
      // Fetch balance data from the balances collection if it exists
      const balancesQuery = query(collection(db as Firestore, 'customer_balances'));
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
      if (!db) {
        console.error('Firestore database is not initialized');
        setError('Database connection error');
        setLoadingState('table', false);
        return;
      }
      
      const customersQuery = query(
        collection(db as Firestore, 'customers'),
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
    const baseMetrics = generateCustomerReport(allCustomers);
    
    // Create extended report metrics with top customers
    const metrics: ReportMetrics = {
      ...baseMetrics,
      topCustomers: allCustomers
        .sort((a, b) => (b.outstandingTotalBalance || b.outstandingBalance || 0) - 
                       (a.outstandingTotalBalance || a.outstandingBalance || 0))
        .slice(0, 10)
    };
    
    // Create extended chart configs
    const baseConfigs = generateChartConfigs(baseMetrics);
    const configs: ChartConfigs = {
      ...baseConfigs,
      statusDistribution: true,
      balanceDistribution: true
    };
    
    setReportMetrics(metrics);
    setChartConfigs(configs);
    setIsReportModalOpen(true);
  };

  const exportReportToPDF = async () => {
    if (!reportMetrics) return;

    setLoadingState('report', true);
    try {
      // Create a new jsPDF instance
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      let currentY = margin.top;

      // Helper functions
      const formatNumber = (value: number | undefined | null): string => {
        if (value === undefined || value === null) return '0';
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };

      const formatCurrency = (value: number | undefined | null): string => {
        if (value === undefined || value === null) return 'R 0.00';
        return `R ${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
      };

      // Add title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Customer Report', pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Add date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      // Add summary metrics
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary Metrics', margin.left, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Customers: ${formatNumber(reportMetrics.totalCustomers)}`, margin.left, currentY);
      currentY += 6;
      doc.text(`Active Customers: ${formatNumber(reportMetrics.activeCustomers)}`, margin.left, currentY);
      currentY += 6;
      doc.text(`Inactive Customers: ${formatNumber(reportMetrics.inactiveCustomers)}`, margin.left, currentY);
      currentY += 6;
      doc.text(`Total Outstanding Balance: ${formatCurrency(reportMetrics.totalOutstandingBalance)}`, margin.left, currentY);
      currentY += 6;
      doc.text(`Average Outstanding Balance: ${formatCurrency(reportMetrics.averageOutstandingBalance)}`, margin.left, currentY);
      currentY += 15;

      // Add charts as images if available
      if (chartConfigs) {
        // Status Distribution Chart
        if (chartConfigs.statusDistribution) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Customer Status Distribution', margin.left, currentY);
          currentY += 8;

          const chartImg = document.getElementById('status-chart') as HTMLCanvasElement;
          if (chartImg) {
            const imgData = chartImg.toDataURL('image/png');
            const imgWidth = 80;
            const imgHeight = 60;
            doc.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          }
        }

        // Balance Distribution Chart
        if (chartConfigs.balanceDistribution && currentY + 80 <= pageHeight - margin.bottom) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Outstanding Balance Distribution', margin.left, currentY);
          currentY += 8;

          const chartImg = document.getElementById('balance-chart') as HTMLCanvasElement;
          if (chartImg) {
            const imgData = chartImg.toDataURL('image/png');
            const imgWidth = 80;
            const imgHeight = 60;
            doc.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          }
        } else if (chartConfigs.balanceDistribution) {
          // Add new page if not enough space
          doc.addPage();
          currentY = margin.top;
          
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Outstanding Balance Distribution', margin.left, currentY);
          currentY += 8;

          const chartImg = document.getElementById('balance-chart') as HTMLCanvasElement;
          if (chartImg) {
            const imgData = chartImg.toDataURL('image/png');
            const imgWidth = 80;
            const imgHeight = 60;
            doc.addImage(imgData, 'PNG', (pageWidth - imgWidth) / 2, currentY, imgWidth, imgHeight);
            currentY += imgHeight + 10;
          }
        }
      }

      // Add top customers table if there's enough space, otherwise add a new page
      if (reportMetrics.topCustomers.length > 0) {
        if (currentY + 60 > pageHeight - margin.bottom) {
          doc.addPage();
          currentY = margin.top;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Customers by Outstanding Balance', margin.left, currentY);
        currentY += 8;

        // Create table
        const tableColumn = ['Account Number', 'Account Holder', 'Outstanding Balance'];
        const tableRows = reportMetrics.topCustomers.map((customer: CustomerData) => [
          customer.accountNumber,
          customer.accountHolderName,
          formatCurrency(customer.outstandingTotalBalance || customer.outstandingBalance)
        ]);

        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: currentY,
          margin: { left: margin.left, right: margin.right },
          styles: { fontSize: 8 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      }

      // Add footer with page numbers
      // Use internal.pages.length instead of getNumberOfPages()
      const totalPages = doc.internal.pages.length - 1; // -1 because pages array is 1-indexed
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
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

  const handleDownloadStatement = (customer: CustomerData, e: React.MouseEvent) => {
    e.stopPropagation();
    setStatementCustomer(customer);
    setIsPeriodModalOpen(true);
  };

  const handleGenerateStatementForPeriod = async (year: string, month: string) => {
    if (!statementCustomer) return;
    
    setIsPeriodModalOpen(false);
    setLoadingState('statement', new Set([...loadingStates.statement, statementCustomer.accountNumber]));
    
    try {
      const customerInput = {
        accountNumber: statementCustomer.accountNumber,
        month,
        year
      };
      await generateStatement(customerInput);
      toast.success(`Statement for ${new Date(parseInt(year), parseInt(month)-1).toLocaleDateString('en-US', {year: 'numeric', month: 'long'})} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading statement:', error);
      toast.error('Failed to download statement');
    } finally {
      const newSet = new Set(loadingStates.statement);
      newSet.delete(statementCustomer.accountNumber);
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
          <div>
            <button
              className={`flex items-center transition-colors duration-200 ${
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
                : <>
                  <Download className="w-5 h-5" />
                  <span className="sr-only">Download Statement</span>
                </>
              }
            </button>
          </div>
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

      {/* Period Selection Modal */}
      <PeriodSelectionModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        onPeriodSelect={handleGenerateStatementForPeriod}
        accountNumber={statementCustomer?.accountNumber || ''}
      />
    </div>
  );
};

export default CustomerDashboard;