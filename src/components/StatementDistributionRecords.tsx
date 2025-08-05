import React, { useState, useEffect } from 'react';
import { Download, FileText, Calendar, User, Upload, FileIcon, Link, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getStatementDistributionRecords, 
  generateStatementDistributionCSV, 
  updateStatementDistributionPdfUrl, 
  createStatementDistributionWithPdf, 
  deleteStatementDistribution,
  updateStatementDistributionCounts,
  StatementDistributionRecord
} from '../services/statementDistributionService';
import StatementDistributionUpload from './StatementDistributionUpload';

// Using the interface from the service instead

const StatementDistributionRecords: React.FC = () => {
  const [distributions, setDistributions] = useState<StatementDistributionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [showManualLinkForm, setShowManualLinkForm] = useState<boolean>(false);
  const [selectedDistribution, setSelectedDistribution] = useState<StatementDistributionRecord | null>(null);
  const [manualPdfUrl, setManualPdfUrl] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newMonth, setNewMonth] = useState<string>('');
  const [newYear, setNewYear] = useState<string>('');
  const [newDistributor, setNewDistributor] = useState<string>('');

  const toggleUploadForm = () => {
    setShowUploadForm(!showUploadForm);
    if (showManualLinkForm) setShowManualLinkForm(false);
  };

  const toggleManualLinkForm = (distribution?: StatementDistributionRecord) => {
    if (distribution) {
      // Editing existing record
      setSelectedDistribution(distribution);
      setIsCreatingNew(false);
      // Extract filename from existing URL if available
      if (distribution.pdfFileName) {
        setManualPdfUrl(distribution.pdfUrl || '');
      } else {
        setManualPdfUrl('');
      }
    } else {
      // Creating new record or selecting from existing
      setSelectedDistribution(null);
      setManualPdfUrl('');
      
      // Default to current month and year for new records
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = now.getFullYear().toString();
      setNewMonth(currentMonth);
      setNewYear(currentYear);
      setNewDistributor('Admin');
      
      // If there are no records, default to creating a new one
      if (distributions.length === 0) {
        setIsCreatingNew(true);
      } else {
        setIsCreatingNew(false);
      }
    }
    
    setShowManualLinkForm(!showManualLinkForm);
    if (showUploadForm) setShowUploadForm(false);
  };

  const updateDecemberRecord = async () => {
    try {
      // Find the December 2024 record
      const decemberRecords = distributions.filter(d => d.month === '12' && d.year === '2024');
      
      if (decemberRecords.length === 0) {
        toast.error('December 2024 record not found');
        return;
      }
      
      const decemberRecord = decemberRecords[0];
      
      // Update with the specified values
      const totalStatements = 4814 + 507; // Total = successful + failed
      const successCount = 4814;
      const failureCount = 507;
      
      await updateStatementDistributionCounts(
        decemberRecord.id!,
        totalStatements,
        successCount,
        failureCount
      );
      
      toast.success('December 2024 record updated successfully');
      fetchDistributionRecords(); // Refresh the list
    } catch (error) {
      console.error('Error updating December record:', error);
      toast.error('Failed to update December record');
    }
  };

  const updateNovemberRecord = async () => {
    try {
      // Find the November 2024 record
      const novemberRecords = distributions.filter(d => d.month === '11' && d.year === '2024');
      
      if (novemberRecords.length === 0) {
        toast.error('November 2024 record not found');
        return;
      }
      
      const novemberRecord = novemberRecords[0];
      
      // Update with the specified values
      const totalStatements = 4824 + 499; // Total = successful + failed
      const successCount = 4824;
      const failureCount = 499;
      
      await updateStatementDistributionCounts(
        novemberRecord.id!,
        totalStatements,
        successCount,
        failureCount
      );
      
      toast.success('November 2024 record updated successfully');
      fetchDistributionRecords(); // Refresh the list
    } catch (error) {
      console.error('Error updating November record:', error);
      toast.error('Failed to update November record');
    }
  };

  const updateOctoberRecord = async () => {
    try {
      // Find the October 2024 record
      const octoberRecords = distributions.filter(d => d.month === '10' && d.year === '2024');
      
      if (octoberRecords.length === 0) {
        toast.error('October 2024 record not found');
        return;
      }
      
      const octoberRecord = octoberRecords[0];
      
      // Update with the specified values
      const totalStatements = 4819 + 508; // Total = successful + failed
      const successCount = 4819;
      const failureCount = 508;
      
      await updateStatementDistributionCounts(
        octoberRecord.id!,
        totalStatements,
        successCount,
        failureCount
      );
      
      toast.success('October 2024 record updated successfully');
      fetchDistributionRecords(); // Refresh the list
    } catch (error) {
      console.error('Error updating October record:', error);
      toast.error('Failed to update October record');
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!recordId) return;
    
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteStatementDistribution(recordId);
      toast.success('Record deleted successfully');
      fetchDistributionRecords(); // Refresh the list
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleManualPdfLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isCreatingNew) {
        // Create a new record with PDF URL
        if (!newMonth || !newYear || !newDistributor) {
          toast.error('Please fill in all required fields');
          return;
        }

        if (!manualPdfUrl || !manualPdfUrl.trim()) {
          toast.error('Please enter a valid PDF URL');
          return;
        }

        // Extract filename from URL if possible
        const urlParts = manualPdfUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0];

        // Create new record with PDF URL
        await createStatementDistributionWithPdf(
          newMonth,
          newYear,
          manualPdfUrl,
          newDistributor,
          fileName
        );

        toast.success('New record created with PDF URL!');
      } else {
        // Update existing record
        if (!selectedDistribution) {
          toast.error('Please select a distribution record');
          return;
        }

        if (!manualPdfUrl || !manualPdfUrl.trim()) {
          toast.error('Please enter a valid PDF URL');
          return;
        }

        // Extract filename from URL if possible
        const urlParts = manualPdfUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0];

        await updateStatementDistributionPdfUrl(
          selectedDistribution.id!,
          manualPdfUrl,
          fileName
        );

        toast.success('PDF URL linked successfully!');
      }
      
      setShowManualLinkForm(false);
      setManualPdfUrl('');
      setSelectedDistribution(null);
      setIsCreatingNew(false);
      fetchDistributionRecords(); // Refresh the list
    } catch (error) {
      console.error('Error linking PDF URL:', error);
      toast.error('Failed to link PDF URL. Please try again.');
    }
  };

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const years = ['2024', '2025', '2026'];

  useEffect(() => {
    fetchDistributionRecords();
  }, [selectedMonth, selectedYear]);

  const fetchDistributionRecords = async () => {
    try {
      setLoading(true);
      
      // Use the service to fetch records with optional filters
      const distributionsData = await getStatementDistributionRecords(
        selectedMonth || undefined,
        selectedYear || undefined
      );
      
      setDistributions(distributionsData);
    } catch (error) {
      console.error('Error fetching distribution records:', error);
      toast.error('Failed to load statement distribution records');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (distribution: StatementDistributionRecord) => {
    try {
      toast.loading('Preparing download...');
      
      // Use the service to generate CSV content
      const csvContent = generateStatementDistributionCSV([distribution]);
      
      // Create a blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `statement-distribution-${distribution.month}-${distribution.year}.csv`;
      document.body.appendChild(link);
      
      setTimeout(() => {
        toast.dismiss();
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloaded ${distribution.month}/${distribution.year} distribution records`);
      }, 500);
    } catch (error) {
      console.error('Error downloading distribution record:', error);
      toast.error('Failed to download distribution record');
    }
  };

  const resetFilters = () => {
    setSelectedMonth('');
    setSelectedYear('');
  };

  return (
    <div className="space-y-6">
      {showUploadForm ? (
        <StatementDistributionUpload 
          onUploadComplete={() => {
            setShowUploadForm(false);
            fetchDistributionRecords();
          }} 
        />
      ) : showManualLinkForm ? (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {isCreatingNew ? 'Create New Record with PDF' : 'Link Manually Uploaded PDF'}
            </h3>
            <button 
              onClick={() => toggleManualLinkForm()} 
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleManualPdfLinkSubmit} className="space-y-4">
            {!isCreatingNew && distributions.length > 0 ? (
              <div>
                <label htmlFor="distribution" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Distribution Record
                </label>
                <select
                  id="distribution"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={selectedDistribution?.id || ''}
                  onChange={(e) => {
                    const selected = distributions.find(d => d.id === e.target.value);
                    if (selected) {
                      toggleManualLinkForm(selected);
                    }
                  }}
                  required
                >
                  <option value="">-- Select a record --</option>
                  {distributions.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {`${months.find(m => m.value === dist.month)?.label || dist.month} ${dist.year} - ${dist.distributionDate.toDate().toLocaleDateString()}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {isCreatingNew && (
              <>
                <div className="flex space-x-4">
                  <div className="w-1/2">
                    <label htmlFor="newMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Month
                    </label>
                    <select
                      id="newMonth"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={newMonth}
                      onChange={(e) => setNewMonth(e.target.value)}
                      required
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label htmlFor="newYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Year
                    </label>
                    <select
                      id="newYear"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      required
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="newDistributor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Distributed By
                  </label>
                  <input
                    type="text"
                    id="newDistributor"
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Your name"
                    value={newDistributor}
                    onChange={(e) => setNewDistributor(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <div>
              <label htmlFor="pdfUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Firebase Storage PDF URL
              </label>
              <input
                type="text"
                id="pdfUrl"
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://firebasestorage.googleapis.com/..."
                value={manualPdfUrl}
                onChange={(e) => setManualPdfUrl(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Paste the full URL to the PDF file in Firebase Storage
              </p>
            </div>

            {distributions.length > 0 && !isCreatingNew && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(true)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Create New Record Instead
                </button>
              </div>
            )}

            {isCreatingNew && distributions.length > 0 && (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Link Existing Record Instead
                </button>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Link className="h-4 w-4 mr-2" />
                {isCreatingNew ? 'Create & Link PDF' : 'Link PDF'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Statement Distribution Records
          </h2>

          <div className="flex space-x-2">
            
            {/* Manual Link Button */}
            <button
              onClick={() => toggleManualLinkForm()}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
            >
              <Link className="h-4 w-4 mr-2" />
              {showManualLinkForm ? 'Cancel' : 'Link Manual PDF'}
            </button>
            
            {/* Upload Button */}
            <button
              onClick={toggleUploadForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {showUploadForm ? 'Cancel' : 'Upload PDF'}
            </button>
            {/* Filter Controls */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Months</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : distributions.length === 0 ? (
        <div className="bg-white dark:bg-dark-card rounded-lg shadow p-10 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No distribution records found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            {selectedMonth || selectedYear ? 
              'No records match your filter criteria.' : 
              'No statement distribution records have been logged yet.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month/Year</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distribution Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Statements</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Success Rate</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distributed By</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">File</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {distributions.map((distribution) => {
                const monthName = months.find(m => m.value === distribution.month)?.label || distribution.month;
                const successRate = distribution.successRate?.toFixed(1) || '0';
                
                return (
                  <tr key={distribution.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {monthName} {distribution.year}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {distribution.distributionDate.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{distribution.totalStatements}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {distribution.successCount} successful, {distribution.failureCount} failed
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            parseFloat(successRate) > 90 ? 'bg-green-500' : 
                            parseFloat(successRate) > 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 block">
                        {successRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="flex-shrink-0 h-4 w-4 text-gray-400 mr-1.5" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">{distribution.distributedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {distribution.pdfUrl ? (
                        <div className="flex items-center">
                          <FileIcon className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-sm text-gray-500 dark:text-gray-400">PDF Available</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">No file</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        {distribution.pdfUrl ? (
                          <button
                            onClick={() => {
                              try {
                                // Open PDF in a new window to avoid CORS issues
                                window.open(distribution.pdfUrl, '_blank');
                              } catch (error) {
                                console.error('Error opening PDF:', error);
                                toast.error('Could not open PDF. Please try again.');
                              }
                            }}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-end w-full"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            View PDF
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDownload(distribution)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-end w-full"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download CSV
                          </button>
                        )}
                        
                        <button
                          onClick={() => toggleManualLinkForm(distribution)}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 flex items-center justify-end w-full"
                        >
                          <Link className="h-4 w-4 mr-1" />
                          {distribution.pdfUrl ? 'Update PDF' : 'Link PDF'}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(distribution.id!)}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center justify-end w-full"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StatementDistributionRecords;
