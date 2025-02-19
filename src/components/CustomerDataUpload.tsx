import React, { useState } from 'react';
import { processCustomerCSV } from '../services/csvService';
import toast from 'react-hot-toast';

export default function CustomerDataUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await processCustomerCSV(file);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error processing file: ' + error.message);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Upload Customer Data
      </h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
                     file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-theme file:text-white
                     hover:file:bg-theme/90
                     file:cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        {isUploading && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}