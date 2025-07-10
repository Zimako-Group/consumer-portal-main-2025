import React, { useState, useEffect, useMemo } from 'react';
import { processCustomerFile } from '../services/csvService';
import { getLastUploadTimestamp, updateUploadTimestamp } from '../services/uploadTimestampService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { uploadBalanceReports, UploadProgress } from '../services/balanceReportService';

interface MonthOption {
  value: string;
  label: string;
}

export default function CsmBalanceReportUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate available months from January 2024 to current month
  const availableMonths = useMemo(() => {
    const months: MonthOption[] = [];
    const startDate = new Date(2024, 0); // January 2024
    const endDate = new Date();

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

      months.push({
        value: `${year}-${month}`,
        label: currentDate.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long'
        })
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    return months.reverse(); // Most recent first
  }, []);

  useEffect(() => {
    const fetchLastUpload = async () => {
      const timestamp = await getLastUploadTimestamp('csmBalance');
      setLastUpload(timestamp);
    };
    fetchLastUpload();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedMonth) {
      setError('Please select a month before uploading balance reports');
      return;
    }

    const fileType = file.type;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        .includes(fileType) && !['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    // The selectedMonth.value is already in YYYY-MM format
    const dateMatch = selectedMonth.value.match(/^(\d{4})-(\d{2})$/);
    if (!dateMatch) {
      setError('Invalid date format. Expected YYYY-MM');
      return;
    }

    const [_, year, month] = dateMatch;
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    // Validate year range
    if (yearNum < 2024) {
      setError('Year must be 2024 or later');
      return;
    }

    // Validate month range
    if (monthNum < 1 || monthNum > 12) {
      setError('Month must be between 1 and 12');
      return;
    }

    setIsUploading(true);
    try {
      // Process the file with the selected month
      const result = await processCustomerFile(file);
      if (result.success) {
        // Convert customer data to balance reports with the selected month
        const reports = result.data.map((customer: any) => ({
          ...customer,
          uploadDate: selectedMonth.value
        }));

        // Upload the balance reports to Firestore with the selected month
        await uploadBalanceReports(reports, (progress) => {
          console.log('Upload progress:', progress);
          setProgress(progress);
        });

        await updateUploadTimestamp('csmBalance');
        const newTimestamp = await getLastUploadTimestamp('csmBalance');
        setLastUpload(newTimestamp);
        toast.success(`Successfully uploaded ${reports.length} balance reports for ${selectedMonth.label}`);
        
        // Don't reset the month immediately so the success message can display
        setTimeout(() => {
          setSelectedMonth(null);
          setProgress(null);
        }, 3000); // Reset after 3 seconds
      } else {
        setError(result.message);
        toast.error(result.message);
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setError(errorMessage);
      toast.error('Error processing file: ' + errorMessage);
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Upload CSM Balance Report
      </h2>
      
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Report Month
          </label>
          <Listbox value={selectedMonth} onChange={setSelectedMonth}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-800 py-2.5 pl-4 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme focus-visible:border-theme sm:text-sm">
                <span className="block truncate text-gray-900 dark:text-white">
                  {selectedMonth?.label || 'Select a month'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {availableMonths.map((month) => (
                    <Listbox.Option
                      key={month.value}
                      value={month}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-4 pr-4 ${
                          active ? 'bg-theme text-white' : 'text-gray-900 dark:text-white'
                        }`
                      }
                    >
                      {({ selected }) => (
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {month.label}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
          {!selectedMonth && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please select the month for which you are uploading balance reports
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select CSV or Excel File
          </label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isUploading || !selectedMonth}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
                     file:mr-4 file:py-2.5 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-theme file:text-white
                     hover:file:bg-theme/90
                     file:cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {lastUpload && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Last Upload: {format(new Date(lastUpload), 'dd/MM/yyyy HH:mm')}
          </div>
        )}

        {isUploading && progress && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing: {progress.processedRecords} / {progress.totalRecords}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div 
                className="bg-theme h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedRecords / progress.totalRecords) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
            {error}
          </div>
        )}

        {progress?.status === 'completed' && selectedMonth && (
          <div className="mt-4 p-4 text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900/50 rounded-md">
            Successfully uploaded {progress.processedRecords} balance reports for {selectedMonth.label}
          </div>
        )}
      </div>
    </div>
  );
}