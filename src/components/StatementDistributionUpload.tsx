import React, { useState, useEffect } from 'react';
import { Upload, Calendar, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { uploadStatementDistributionPDF } from '../services/storageService';
// No need for getStorage import as we're using the service

interface StatementDistributionUploadProps {
  onUploadComplete: () => void;
}

const StatementDistributionUpload: React.FC<StatementDistributionUploadProps> = ({ 
  onUploadComplete 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const { userData } = useAuth();

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  useEffect(() => {
    // Reset progress when component unmounts
    return () => {
      setUploadProgress(0);
    };
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a PDF file');
      return;
    }

    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    if (!selectedYear) {
      toast.error('Please select a year');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const toastId = toast.loading(`Preparing to upload PDF file...`);
      
      console.log('Starting PDF upload for:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        month: selectedMonth,
        year: selectedYear,
        distributedBy: userData?.fullName || 'Unknown User'
      });

      // Validate file type again before upload
      if (selectedFile.type !== 'application/pdf') {
        toast.dismiss(toastId);
        toast.error('Only PDF files are allowed');
        setUploading(false);
        return;
      }
      
      // Set up progress tracking
      const updateProgress = (progress: number) => {
        setUploadProgress(progress);
        toast.loading(`Uploading: ${Math.round(progress)}% complete...`, { id: toastId });
      };
      
      // Start with initial progress
      updateProgress(0);
      
      // Get month name for display purposes
      const monthName = months.find(m => m.value === selectedMonth)?.label || 'Unknown';
      
      // Proceed with upload with progress tracking
      const downloadURL = await uploadStatementDistributionPDF(
        selectedFile,
        selectedMonth,
        selectedYear,
        userData?.fullName || 'Unknown User',
        // Add progress callback
        (progress) => {
          setUploadProgress(progress);
        }
      );
      
      console.log('Upload successful, download URL:', downloadURL);

      toast.dismiss(toastId);
      toast.success(`PDF uploaded successfully for ${monthName} ${selectedYear}`);
      
      // Reset form
      setSelectedFile(null);
      setSelectedMonth('');
      setUploadProgress(0);
      
      // Notify parent component that upload is complete
      onUploadComplete();
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      setUploadProgress(0);
      
      // Provide more specific error messages
      if (error.code === 'storage/unauthorized') {
        toast.error('Permission denied: You do not have permission to upload files');
      } else if (error.code === 'storage/canceled') {
        toast.error('Upload was canceled');
      } else if (error.code === 'storage/unknown') {
        toast.error('Unknown error occurred during upload');
      } else if (error.code?.includes('cors')) {
        toast.error('CORS error: The server blocked the upload request. Please try again later.');
      } else if (error.message?.includes('network')) {
        toast.error('Network error: Please check your internet connection and try again.');
      } else {
        toast.error(`Failed to upload PDF file: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Upload className="mr-2 h-5 w-5 text-blue-500" />
        Upload Statement Distribution PDF
      </h2>
      
      <div className="space-y-4">
        {/* Month and Year Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={uploading}
            >
              <option value="">Select Month</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              disabled={uploading}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            PDF File
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {selectedFile ? (
                  <>
                    <Check className="w-8 h-8 text-green-500 mb-2" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </>
                ) : (
                  <>
                    <Calendar className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Click to select PDF file
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Only PDF files are supported
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </label>
          </div>
        </div>
        
        {/* Upload Button */}
        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
              {Math.round(uploadProgress)}% Uploaded
            </p>
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedMonth || uploading}
            className={`px-4 py-2 rounded-md text-white font-medium flex items-center ${
              !selectedFile || !selectedMonth || uploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload PDF'}
          </button>
        </div>
        
        {/* Help Text */}
        <div className="flex items-start mt-2 text-sm text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
          <p>
            Upload PDF files containing statement distribution records. The file will be
            associated with the selected month and year and made available for download.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatementDistributionUpload;
