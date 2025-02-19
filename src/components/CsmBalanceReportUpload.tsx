import React, { useState, useEffect } from 'react';
import { processCustomerFile } from '../services/csvService';
import { getLastUploadTimestamp, updateUploadTimestamp } from '../services/uploadTimestampService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function CsmBalanceReportUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  useEffect(() => {
    const fetchLastUpload = async () => {
      const timestamp = await getLastUploadTimestamp('csmBalance');
      setLastUpload(timestamp);
    };
    fetchLastUpload();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        .includes(fileType) && !['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setIsUploading(true);
    try {
      const result = await processCustomerFile(file);
      if (result.success) {
        await updateUploadTimestamp('csmBalance');
        const newTimestamp = await getLastUploadTimestamp('csmBalance');
        setLastUpload(newTimestamp);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Error processing file: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Upload CSM Balance Report
        </h2>
        {lastUpload && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last Upload: {format(new Date(lastUpload), 'dd/MM/yyyy HH:mm')}
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select CSV or Excel File
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
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