import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  SortAsc,
  SortDesc,
  Filter,
  FileDown,
  FileUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { format } from 'date-fns';
import { StatementDistribution } from '../types/statements';
import { createPDFGenerator } from '../services/PDFGenerator';
import { toast } from 'react-hot-toast';

// TypeScript interfaces
interface StatementDistribution {
  id: string;
  month: Date;
  smsSent: number;
  emailsSent: number;
  whatsappSent: number;
  totalSent: number;
}

interface SortConfig {
  key: keyof StatementDistribution | null;
  direction: 'asc' | 'desc';
}

const ViewStatements: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<StatementDistribution[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const itemsPerPage = 10;

  // Loading skeleton component
  const LoadingSkeleton = () => {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Header Skeleton */}
        <div className="mb-8">
          <Skeleton 
            height={40} 
            className="mb-4" 
            baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
            highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
          />
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Skeleton 
              height={40} 
              width={300}
              baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
              highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
            />
            <div className="flex gap-2">
              <Skeleton 
                height={40} 
                width={120}
                baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
                highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
              />
              <Skeleton 
                height={40} 
                width={120}
                baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
                highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
              />
            </div>
          </div>
        </div>

        {/* Table Header Skeleton */}
        <div className={`rounded-t-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div className="grid grid-cols-5 gap-4 p-4">
            {Array(5).fill(null).map((_, index) => (
              <Skeleton 
                key={index}
                height={24}
                baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
                highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
              />
            ))}
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className={`rounded-b-lg overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          {Array(5).fill(null).map((_, rowIndex) => (
            <div 
              key={rowIndex}
              className={`grid grid-cols-5 gap-4 p-4 ${
                isDarkMode 
                  ? 'border-b border-gray-700 bg-gray-900' 
                  : 'border-b border-gray-200 bg-white'
              }`}
            >
              {Array(5).fill(null).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex}
                  height={24}
                  width={colIndex === 4 ? '100px' : '100%'}
                  baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
                  highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
                  style={{ borderRadius: '4px' }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-4 flex items-center justify-between">
          <Skeleton 
            height={24} 
            width={200}
            baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
            highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
          />
          <div className="flex gap-2">
            {Array(5).fill(null).map((_, index) => (
              <Skeleton 
                key={index}
                height={32} 
                width={32}
                baseColor={isDarkMode ? '#2D3748' : '#E2E8F0'}
                highlightColor={isDarkMode ? '#4A5568' : '#F7FAFC'}
                style={{ borderRadius: '8px' }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Mock data generation
  useEffect(() => {
    const generateMockData = () => {
      const mockData: StatementDistribution[] = Array.from({ length: 50 }, (_, index) => ({
        id: `stat-${index + 1}`,
        month: new Date(2024, index % 12, 1),
        smsSent: Math.floor(Math.random() * 1000),
        emailsSent: Math.floor(Math.random() * 2000),
        whatsappSent: Math.floor(Math.random() * 1500),
        totalSent: 0
      }));

      // Calculate total sent for each record
      mockData.forEach(item => {
        item.totalSent = item.smsSent + item.emailsSent + item.whatsappSent;
      });

      return mockData;
    };

    setTimeout(() => {
      setData(generateMockData());
      setIsLoading(false);
    }, 1500);
  }, []);

  // Sorting logic
  const sortData = (key: keyof StatementDistribution) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Filtering logic
  const filteredData = data.filter(item =>
    format(item.month, 'MMMM yyyy').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export functions
  const exportToPDF = async (item: StatementDistribution) => {
    try {
      const pdfGenerator = createPDFGenerator({
        companyName: 'Your Company Name',
        watermarkText: 'CONFIDENTIAL'
      });

      const pdfBlob = await pdfGenerator.generateMonthlyReport(item);
      
      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement-report-${format(item.month, 'yyyy-MM')}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Statement report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate statement report');
    }
  };

  const exportToCSV = () => {
    // Implement CSV export logic
    console.log('Exporting to CSV...');
  };

  // If loading, return the skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}
    >
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Statements Distribution Reports</h1>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by month..."
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileDown size={20} />
              Export PDF
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileUp size={20} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead>
            <tr className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <th className="px-6 py-3 text-left" onClick={() => sortData('month')}>
                <div className="flex items-center gap-2 cursor-pointer">
                  Month
                  {sortConfig.key === 'month' && (
                    sortConfig.direction === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left">SMS's Sent</th>
              <th className="px-6 py-3 text-left">Emails Sent</th>
              <th className="px-6 py-3 text-left">WhatsApp's Sent</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.map((item) => (
              <motion.tr
                key={item.id}
                whileHover={{ scale: 1.01 }}
                className={`${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">{format(item.month, 'MMMM yyyy')}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.smsSent.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.emailsSent.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.whatsappSent.toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    onClick={() => exportToPDF(item)}
                  >
                    <Download size={16} />
                    Download
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg ${
              currentPage === 1
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                ? 'hover:bg-gray-800'
                : 'hover:bg-gray-100'
            }`}
          >
            <ChevronLeft size={20} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
            .map((page, index, array) => (
              <React.Fragment key={page}>
                {index > 0 && array[index - 1] !== page - 1 && (
                  <span className="px-2">...</span>
                )}
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-500 text-white'
                      : isDarkMode
                      ? 'hover:bg-gray-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              </React.Fragment>
            ))}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg ${
              currentPage === totalPages
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                ? 'hover:bg-gray-800'
                : 'hover:bg-gray-100'
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ViewStatements;
