import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { getLastUploadTimestamp, updateUploadTimestamp } from '../services/uploadTimestampService';
import { uploadDetailedAgedAnalysis, DetailedAgedAnalysis as ServiceDetailedAgedAnalysis } from '../services/detailedAgedAnalysisService';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';

// This interface represents the raw data from the uploaded file
interface RawDetailedAgedAnalysis {
    ACCOUNT_NO: string;
    Current: string | number;
    '30 Days': string | number;
    '60 Days': string | number;
    '90 Days': string | number;
    '120 Days': string | number;
    '150 Days'?: string | number;
    '180 Days'?: string | number;
    '210 Days'?: string | number;
    '240 Days'?: string | number;
    '270 Days'?: string | number;
    '300 Days'?: string | number;
    '330 Days'?: string | number;
    '360 Days'?: string | number;
    '390 + Days'?: string | number;
    TOTAL: string | number;
}

interface MonthOption {
    value: string;
    label: string;
}

const DetailedAgedAnalysisUpload: React.FC = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);

    useEffect(() => {
        const fetchLastUpload = async () => {
            const timestamp = await getLastUploadTimestamp('detailedAged');
            setLastUploadTime(timestamp);
        };
        fetchLastUpload();
    }, []);

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
        const fetchLastUploadTime = async () => {
            try {
                if (!db) {
                    console.error('Firebase Firestore not initialized');
                    return;
                }
                
                // For now, we'll check the legacy collection for backward compatibility
                const detailedAgedAnalysisCollection = collection(db, 'detailed_aged_analysis');
                const q = query(detailedAgedAnalysisCollection, orderBy('uploadedAt', 'desc'), limit(1));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const uploadedAt = querySnapshot.docs[0].data().uploadedAt;
                    setLastUploadTime(uploadedAt);
                }
            } catch (error) {
                console.error('Error fetching last upload time:', error);
            }
        };
        
        fetchLastUploadTime();
    }, [uploadSuccess]);

    const readExcelFile = (file: File): Promise<XLSX.WorkBook> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    resolve(workbook);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    const processFile = async (file: File) => {
        try {
            let data: RawDetailedAgedAnalysis[] = [];

            if (file.name.toLowerCase().endsWith('.csv')) {
                // Process CSV file using a promise-based approach
                data = await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            resolve(results.data as RawDetailedAgedAnalysis[]);
                        },
                        error: (error) => {
                            reject(new Error(`CSV parsing error: ${error.message}`));
                        }
                    });
                });
                
                console.log(`Parsed ${data.length} records from CSV`);
            } else if (file.name.match(/\.(xlsx|xls)$/i)) {
                // Process Excel file
                const workbook = await readExcelFile(file);
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                if (!worksheet) {
                    throw new Error('No worksheet found in the Excel file');
                }
                
                data = XLSX.utils.sheet_to_json(worksheet) as RawDetailedAgedAnalysis[];
                
                if (data.length === 0) {
                    throw new Error('No data found in the Excel file');
                }
                
                console.log(`Parsed ${data.length} records from Excel`);
            } else {
                throw new Error('Unsupported file format. Please upload a CSV or Excel file.');
            }
            
            // Process the data
            if (data.length === 0) {
                throw new Error('No data found in the file');
            }
            
            await processUpload(data);
        } catch (error) {
            console.error('Error processing file:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error processing file';
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            setUploading(false);
            throw error; // Re-throw to be caught by the caller
        }
    };

    const processUpload = async (data: RawDetailedAgedAnalysis[]) => {
        try {
            if (!db || !selectedMonth) {
                toast.error('Firebase not initialized or month not selected');
                return;
            }

            console.log(`📊 Processing ${data.length} records for upload for ${selectedMonth.label}`);
            toast.loading(`Processing ${data.length} records for ${selectedMonth.label}...`, { id: 'upload' });
            
            // Inform user about optimized upload process
            console.log('🚀 Using optimized upload with rate limiting and retry logic');
            console.log('⚙️ Features: 25 records/batch, 1s delays, exponential backoff retries');

            // Helper function to safely process amounts to numbers
            const processAmount = (value: any): number => {
                if (value === undefined || value === null || value === '') return 0;
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                    // Remove any non-numeric characters except decimal point
                    const cleanValue = value.replace(/[^0-9.-]/g, '');
                    const num = Number(cleanValue);
                    return isNaN(num) ? 0 : num;
                }
                return 0;
            };
            
            // Debug: Log the first few records to see what's being parsed
            console.log('Sample raw records:', data.slice(0, 3));
            console.log('Available columns:', Object.keys(data[0] || {}));
            
            // Debug: Check account numbers specifically
            const accountNumbers = data.map(record => record.ACCOUNT_NO);
            console.log('All account numbers:', accountNumbers);
            console.log('Unique account numbers:', [...new Set(accountNumbers)]);
            console.log('Empty account numbers count:', accountNumbers.filter(acc => !acc || acc.toString().trim() === '').length);
            
            // Filter out records with empty account numbers before processing
            const validRecords = data.filter(record => {
                const accountNo = record.ACCOUNT_NO?.toString().trim();
                return accountNo && accountNo !== '' && accountNo !== 'undefined' && accountNo !== 'null';
            });
            
            console.log(`Filtered from ${data.length} to ${validRecords.length} records with valid account numbers`);
            
            if (validRecords.length === 0) {
                throw new Error('No records found with valid account numbers. Please check that the ACCOUNT_NO column contains valid data.');
            }
            
            // Get the dynamic current month field based on selected month
            const [year, month] = selectedMonth.value.split('-');
            const currentMonthField = `${year}${month}`; // e.g., '202410' for October 2024
            console.log('Using current month field:', currentMonthField);
            
            // Group records by account number and aggregate them
            const recordsByAccount = new Map<string, {
                accountNumber: string;
                days120Plus: number;
                days90: number;
                days60: number;
                days30: number;
                current: number;
                total: number;
            }>();
            
            console.log('Aggregating records by account number...');
            
            for (const record of validRecords) {
                const accountNumber = record.ACCOUNT_NO?.toString().trim() || '';
                
                // Calculate the 120+ days factor by summing all periods >= 120 days
                const days120Plus = processAmount(record['120 Days']) + 
                                  processAmount(record['150 Days']) + 
                                  processAmount(record['180 Days']) + 
                                  processAmount(record['210 Days']) + 
                                  processAmount(record['240 Days']) + 
                                  processAmount(record['270 Days']) + 
                                  processAmount(record['300 Days']) + 
                                  processAmount(record['330 Days']) + 
                                  processAmount(record['360 Days']) + 
                                  processAmount(record['390 + Days']);
                
                // Get or create aggregated record for this account
                const existing = recordsByAccount.get(accountNumber) || {
                    accountNumber,
                    days120Plus: 0,
                    days90: 0,
                    days60: 0,
                    days30: 0,
                    current: 0,
                    total: 0
                };
                
                // Aggregate the values
                existing.days120Plus += days120Plus;
                existing.days90 += processAmount(record['90 Days']);
                existing.days60 += processAmount(record['60 Days']);
                existing.days30 += processAmount(record['30 Days']);
                existing.current += processAmount(record.Current);
                existing.total += processAmount(record.TOTAL);
                
                recordsByAccount.set(accountNumber, existing);
            }
            
            console.log(`Aggregated ${validRecords.length} records into ${recordsByAccount.size} unique accounts`);
            
            // Transform aggregated data to match the DetailedAgedAnalysis interface
            const transformedRecords: ServiceDetailedAgedAnalysis[] = Array.from(recordsByAccount.values()).map((aggregated) => {
                return {
                    ACCOUNT_NO: aggregated.accountNumber,
                    '120 DAY FACTOR': aggregated.days120Plus,
                    '90 DAY FACTOR': aggregated.days90,
                    '60 DAY FACTOR': aggregated.days60,
                    'UP TO 30 DAY FACTOR': aggregated.days30,
                    [currentMonthField]: aggregated.current, // Dynamic current month field
                    TOTAL: aggregated.total,
                    uploadedAt: new Date().toISOString()
                };
            });

            // Use the updated service function with month selection and enhanced progress feedback
            const result = await uploadDetailedAgedAnalysis(
                transformedRecords, 
                selectedMonth?.value || '',
                (progress) => {
                    setUploadProgress(progress);
                    if (progress % 5 === 0 || progress === 100) {
                        const message = progress === 100 
                            ? 'Finalizing upload...' 
                            : `Uploading: ${progress}% complete (with rate limiting)`;
                        toast.loading(message, { id: 'upload' });
                    }
                }
            );

            if (result.success) {
                console.log(`✅ Successfully processed ${result.totalRecords} records`);
                setUploadProgress(100);
                setUploadSuccess(true);
                
                // Enhanced success message with failure info if applicable
                const successMessage = result.failedRecords && result.failedRecords > 0
                    ? `Upload complete! Processed ${result.totalRecords} records (${result.failedRecords} failed due to rate limits)`
                    : `Upload complete! Successfully processed ${result.totalRecords} records for ${selectedMonth?.label || ''}`;
                    
                toast.success(successMessage, { duration: 5000 });
                
                if (result.failedRecords && result.failedRecords > 0) {
                    console.log(`⚠️ Note: ${result.failedRecords} records failed due to rate limiting - you may retry the upload`);
                }
            } else {
                console.error('❌ Upload failed:', result.message);
                setErrorMessage(result.message);
                setUploadSuccess(false);
                toast.error(`Upload failed: ${result.message}`, { duration: 6000 });
            }

            // Update last upload timestamp
            await updateUploadTimestamp('detailedAged');
            const newTimestamp = await getLastUploadTimestamp('detailedAged');
            setLastUploadTime(newTimestamp);
        } catch (error) {
            console.error('Error uploading to Firestore:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
            setUploadSuccess(false);
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            if (!selectedMonth) {
                const errorMsg = 'Please select a month before uploading detailed aged analysis';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return;
            }

            // The selectedMonth.value is already in YYYY-MM format
            const dateMatch = selectedMonth.value.match(/^(\d{4})-(\d{2})$/);
            if (!dateMatch) {
                const errorMsg = 'Invalid date format. Expected YYYY-MM';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return;
            }

            const [_, year, month] = dateMatch;
            const yearNum = parseInt(year);
            const monthNum = parseInt(month);

            // Validate year range
            if (yearNum < 2024) {
                const errorMsg = 'Year must be 2024 or later';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return;
            }

            // Validate month range
            if (monthNum < 1 || monthNum > 12) {
                const errorMsg = 'Month must be between 1 and 12';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                return;
            }

            setUploading(true);
            setUploadSuccess(null);
            setErrorMessage(null);
            setUploadProgress(0);
            const file = event.target.files?.[0];
            
            if (!file) {
                const errorMsg = 'No file selected';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                setUploading(false);
                return;
            }

            const fileType = file.name.toLowerCase();
            if (!fileType.endsWith('.csv') && !fileType.match(/\.(xlsx|xls)$/)) {
                const errorMsg = 'Please upload a CSV or Excel file';
                setErrorMessage(errorMsg);
                toast.error(errorMsg);
                setUploading(false);
                return;
            }
            
            await processFile(file);
        } catch (error) {
            console.error('Error processing file:', error);
            const errorMsg = error instanceof Error ? error.message : 'Failed to process file';
            setErrorMessage(errorMsg);
            toast.error(errorMsg);
            setUploading(false);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Upload Detailed Aged Analysis</h2>
                
                {lastUploadTime && (
                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                        Last upload: {new Date(lastUploadTime).toLocaleString()}
                    </div>
                )}
                
                {uploadSuccess === true && selectedMonth && (
          <div className="mt-4 p-4 text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900/50 rounded-md">
            Detailed aged analysis data for {selectedMonth.label} uploaded successfully!
          </div>
        )}
        
        {errorMessage && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
            {errorMessage}
          </div>
        )}
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Month
                    </label>
                    <Listbox value={selectedMonth} onChange={setSelectedMonth}>
                        <div className="relative mt-1">
                            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white dark:bg-gray-700 py-2.5 pl-3 pr-10 text-left shadow-sm border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-theme sm:text-sm">
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
                            Please select the month for which you are uploading detailed aged analysis
                        </p>
                    )}
                </div>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select CSV or Excel File
                    </label>
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileUpload}
                        disabled={uploading || !selectedMonth}
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
                
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Supported formats: CSV, XLSX, XLS
                </p>
                
                {uploading && (
                    <div className="mt-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Processing: {uploadProgress}%
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                            <div 
                                className="bg-theme h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedAgedAnalysisUpload;
