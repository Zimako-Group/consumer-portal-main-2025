import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DetailedLevied, uploadDetailedLevied, UploadProgress } from '../services/detailedLeviedService';
import { getLastUploadTimestamp, updateUploadTimestamp } from '../services/uploadTimestampService';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { format } from 'date-fns';

// Interface for raw data from uploaded file (before processing)
interface RawDetailedLevied {
    ACCOUNT_NO: string;
    TARIFF_CODE: string;
    TARIFF_DESC: string;
    TOS_CODE: string;
    TOS_DESC: string;
    M202409: string | number;
    M202410: string | number;
    M202411: string | number;
    M202412: string | number;
    M202501: string | number;
    M202502: string | number;
    M202503: string | number;
    M202504: string | number;
    M202505: string | number;
    M202506: string | number;
    M202507: string | number;
    M202508: string | number;
    TOTAL: string | number;
    [key: string]: string | number; // For other fields
}

// Month option interface for the dropdown
interface MonthOption {
    id: string;
    name: string;
    value: string; // YYYY-MM format
}

const DetailedLeviedUpload: React.FC = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [lastUpload, setLastUpload] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);
    const [isMonthValid, setIsMonthValid] = useState<boolean>(false);

    // Generate month options from Jan 2024 to current month
    const monthOptions = useMemo(() => {
        const options: MonthOption[] = [];
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed

        // Start from January 2024
        const startYear = 2024;
        
        for (let year = startYear; year <= currentYear; year++) {
            // If it's the current year, only show months up to the current month
            const monthLimit = year === currentYear ? currentMonth + 1 : 12;
            
            for (let month = 0; month < monthLimit; month++) {
                const date = new Date(year, month, 1);
                const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;
                options.push({
                    id: monthValue,
                    name: format(date, 'MMMM yyyy'),
                    value: monthValue
                });
            }
        }
        
        // Sort in descending order (newest first)
        return options.sort((a, b) => b.value.localeCompare(a.value));
    }, []);

    // Fetch last upload timestamp on component mount
    useEffect(() => {
        const fetchLastUpload = async () => {
            try {
                const timestamp = await getLastUploadTimestamp('detailed_levied');
                if (timestamp) {
                    setLastUpload(format(new Date(timestamp), 'dd/MM/yyyy HH:mm'));
                }
            } catch (error) {
                console.error('Error fetching last upload timestamp:', error);
            }
        };
        
        fetchLastUpload();
    }, []);

    // Validate selected month whenever it changes
    useEffect(() => {
        if (!selectedMonth) {
            setIsMonthValid(false);
            return;
        }
        
        try {
            const dateMatch = selectedMonth.value.match(/^(\d{4})-(\d{2})$/);
            if (!dateMatch) {
                console.log('Date format validation failed for:', selectedMonth.value);
                setIsMonthValid(false);
                return;
            }
            
            const [_, year, month] = dateMatch;
            const yearNum = parseInt(year);
            const monthNum = parseInt(month);
            
            const isValid = yearNum >= 2024 && monthNum >= 1 && monthNum <= 12;
            console.log('Month validation:', { selectedMonth: selectedMonth.value, yearNum, monthNum, isValid });
            
            setIsMonthValid(isValid);
        } catch (error) {
            console.error('Error validating month:', error);
            setIsMonthValid(false);
        }
    }, [selectedMonth]);

    const handleProgress = (progress: UploadProgress) => {
        setUploadProgress(progress);
        const percentComplete = Math.round((progress.processedRecords / progress.totalRecords) * 100);
        
        switch (progress.status) {
            case 'processing':
                setUploadStatus(`Processing: ${percentComplete}% complete (${progress.processedRecords}/${progress.totalRecords} records, Batch ${progress.currentBatch}/${progress.totalBatches})`);
                break;
            case 'completed':
                // Update the last upload timestamp
                updateUploadTimestamp('detailed_levied');
                const now = new Date();
                const formattedDate = format(now, 'dd/MM/yyyy HH:mm');
                setLastUpload(formattedDate);
                setUploadStatus(`Upload completed: ${progress.processedRecords} records processed, ${progress.failedRecords} failed`);
                break;
            case 'error':
                setUploadStatus(`Error: ${progress.error || 'Unknown error occurred'}`);
                break;
        }
    };

    const processFile = async (fileContent: string | ArrayBuffer, fileName: string) => {
        try {
            console.log('processFile validation:', { selectedMonth, isMonthValid });
            
            if (!selectedMonth) {
                throw new Error('Please select a month before uploading');
            }
            
            if (!isMonthValid) {
                throw new Error('Please select a valid month before uploading');
            }
            
            // Use RawDetailedLevied for parsing and DetailedLevied for upload
            let rawRecords: RawDetailedLevied[] = [];
            let records: DetailedLevied[] = [];

            const processRow = (row: any): DetailedLevied => ({
                ACCOUNT_NO: row.ACCOUNT_NO?.toString() || 'N/A',
                TARIFF_CODE: row.TARIFF_CODE?.toString() || 'N/A',
                TARIFF_DESC: row.TARIFF_DESC || 'N/A',
                TOS_CODE: row.TOS_CODE?.toString() || 'N/A',
                TOS_DESC: row.TOS_DESC || 'N/A',
                M202409: Number(row.M202409) || 0,
                M202410: Number(row.M202410) || 0,
                M202411: Number(row.M202411) || 0,
                M202412: Number(row.M202412) || 0,
                M202501: Number(row.M202501) || 0,
                M202502: Number(row.M202502) || 0,
                M202503: Number(row.M202503) || 0,
                M202504: Number(row.M202504) || 0,
                M202505: Number(row.M202505) || 0,
                M202506: Number(row.M202506) || 0,
                M202507: Number(row.M202507) || 0,
                M202508: Number(row.M202508) || 0,
                TOTAL: Number(row.TOTAL) || 0,
                ACCOUNT_HOLDER: row.ACCOUNT_HOLDER || 'N/A',
                EMAIL_ADDRESS: row['EMAIL ADDRESS'] || 'N/A',
                ERF_EXTENTION: row.ERF_EXTENTION || 'N/A',
                ERF_LOT_NUMBER: row.ERF_LOT_NUMBER || 'N/A',
                ERF_SUB_DIVISION: row.ERF_SUB_DIVISION || 'N/A',
                ERF_UNIT_NUMBER: row.ERF_UNIT_NUMBER || 'N/A',
                STREET_ADDRESS: row.STREET_ADDRESS || 'N/A',
                POST_ADR_1: row.POST_ADR_1 || 'N/A',
                POST_ADR_2: row.POST_ADR_2 || 'N/A',
                POST_ADR_3: row.POST_ADR_3 || 'N/A',
                POST_CODE: row.POST_CODE?.toString() || 'N/A',
                ID_NUMBER_1: row.ID_NUMBER_1?.toString() || 'N/A',
                ACCOUNT_STATUS: row.ACCOUNT_STATUS || 'N/A',
                ACCOUNT_TYPE: row.ACCOUNT_TYPE || 'N/A',
                OWNER_TYPE: row.OWNER_TYPE || 'N/A',
                CATEGORY: row.CATEGORY || 'N/A',
                CREDIT_STATUS: row.CREDIT_STATUS || 'N/A',
                CREDIT_INSTRUCTION: row.CREDIT_INSTRUCTION || 'N/A',
                GROUP_ACCOUNT: row.GROUP_ACCOUNT || 'N/A',
                MAILING_INSTRUCTION: row.MAILING_INSTRUCTION || 'N/A',
                OLD_ACCOUNT_NUMBER: row.OLD_ACCOUNT_NUMBER?.toString() || 'N/A',
                NOTES_2: row.NOTES_2 || 'N/A',
                PROVINCE: row.PROVINCE || 'N/A',
                TOWN: row.TOWN || 'N/A',
                SUBURB: row.SUBURB || 'N/A',
                WARD: row.WARD || 'N/A',
                PROPERTY_CATEGORY: row.PROPERTY_CATEGORY || 'N/A',
                GIS_KEY: row.GIS_KEY || 'N/A',
                ERF_REF: row.ERF_REF || 'N/A',
                uploadedAt: new Date().toISOString(),
            });

            setUploadStatus('Reading file contents...');

            if (fileName.endsWith('.csv')) {
                // Process CSV file
                const result = Papa.parse(fileContent as string, {
                    header: true,
                    skipEmptyLines: true,
                });

                rawRecords = result.data as RawDetailedLevied[];
            } else {
                // Process XLSX file
                const workbook = XLSX.read(fileContent, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                rawRecords = data as RawDetailedLevied[];
            }
            
            // Convert raw records to typed DetailedLevied records
            records = rawRecords.map(processRow);

            // Validate records before upload
            if (records.length === 0) {
                throw new Error('No valid records found in the file');
            }

            setUploadStatus(`Processing ${records.length} records...`);

            // Filter out completely empty rows
            records = records.filter(record => {
                const numericValues = [
                    record.M202409, record.M202410, record.M202411, record.M202412,
                    record.M202501, record.M202502, record.M202503, record.M202504,
                    record.M202505, record.M202506, record.M202507, record.M202508,
                    record.TOTAL
                ];
                
                const hasNonZeroNumeric = numericValues.some(val => val !== 0);
                const hasNonNAText = Object.values(record).some(val => 
                    typeof val === 'string' && val !== 'N/A' && val !== ''
                );
                
                return hasNonZeroNumeric || hasNonNAText;
            });

            if (records.length === 0) {
                throw new Error('No valid records found after filtering empty rows');
            }

            // Process the data and upload
            const result = await uploadDetailedLevied(
                records.map(record => ({
                    ...record,
                    // Convert string values to numbers
                    M202409: Number(record.M202409) || 0,
                    M202410: Number(record.M202410) || 0,
                    M202411: Number(record.M202411) || 0,
                    M202412: Number(record.M202412) || 0,
                    M202501: Number(record.M202501) || 0,
                    M202502: Number(record.M202502) || 0,
                    M202503: Number(record.M202503) || 0,
                    M202504: Number(record.M202504) || 0,
                    M202505: Number(record.M202505) || 0,
                    M202506: Number(record.M202506) || 0,
                    M202507: Number(record.M202507) || 0,
                    M202508: Number(record.M202508) || 0,
                    TOTAL: Number(record.TOTAL) || 0,
                })) as DetailedLevied[],
                selectedMonth.value,
                handleProgress
            );
            
            if (result.success) {
                // Update the upload timestamp
                try {
                    await updateUploadTimestamp('detailed_levied');
                    const now = new Date();
                    setLastUpload(format(now, 'dd/MM/yyyy HH:mm'));
                } catch (timestampError) {
                    console.error('Error updating timestamp:', timestampError);
                }
                
                setUploadStatus(`Upload successful: ${result.totalRecords} records processed`);
            } else {
                setUploadStatus(`Upload failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Error processing file:', error);
            setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            setUploadProgress(null);
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;
        
        console.log('onDrop validation:', { selectedMonth, isMonthValid });
        
        if (!selectedMonth) {
            setUploadStatus('Please select a month before uploading');
            return;
        }
        
        if (!isMonthValid) {
            setUploadStatus('Please select a valid month before uploading');
            return;
        }

        setIsUploading(true);
        setUploadStatus('Processing file...');
        setUploadProgress(null);

        const file = acceptedFiles[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
            if (e.target?.result) {
                await processFile(e.target.result, file.name);
            }
            setIsUploading(false);
        };

        reader.onerror = () => {
            setUploadStatus('Error reading file');
            setIsUploading(false);
            setUploadProgress(null);
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    }, [selectedMonth, isMonthValid]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls']
        },
        multiple: false
    });

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold mb-4 dark:text-white text-black">Upload Detailed Levied Report</h2>
                {lastUpload && (
                    <span className="text-sm text-blue-500">Last Upload: {lastUpload}</span>
                )}
            </div>

            <div className="space-y-4">
                {/* Month Selection */}
                <div>
                    <p className="text-sm font-medium dark:text-white text-black mb-2">Select Month</p>
                    <Listbox value={selectedMonth} onChange={setSelectedMonth}>
                        <div className="relative mt-1">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-dark-card dark:bg-dark-card py-2 pl-3 pr-10 text-left border border-gray-600 focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
                                <span className="block truncate text-gray-300">
                                    {selectedMonth ? selectedMonth.name : 'Select a month'}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                    <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </span>
                            </Listbox.Button>
                            <Transition
                                as={React.Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-dark-card dark:bg-dark-card py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                    {monthOptions.map((month) => (
                                        <Listbox.Option
                                            key={month.id}
                                            className={({ active }) =>
                                                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${active ? 'bg-orange-100 text-orange-900' : 'text-gray-300'}`
                                            }
                                            value={month}
                                        >
                                            {({ selected }) => (
                                                <>
                                                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                                        {month.name}
                                                    </span>
                                                    {selected ? (
                                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-orange-600">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </Listbox>
                    {!isMonthValid && selectedMonth && (
                        <p className="text-red-500 text-xs mt-1">Please select a valid month</p>
                    )}
                </div>

                <div className="space-y-2">
                    <p className="text-sm font-medium dark:text-white text-black">Select CSV or Excel File</p>
                    <div className="relative">
                        <div 
                            {...getRootProps()} 
                            className={`flex items-center justify-between bg-dark-card dark:bg-dark-card rounded-lg p-3 cursor-pointer border border-gray-600 ${
                                isUploading || !isMonthValid ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <input {...getInputProps()} disabled={isUploading || !isMonthValid} />
                            <button 
                                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                                disabled={isUploading || !isMonthValid}
                            >
                                {isUploading ? 'Uploading...' : 'Choose File'}
                            </button>
                            <span className="text-gray-400">
                                {isDragActive ? "Drop the file here..." : "No file chosen"}
                            </span>
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-500">Supported formats: CSV, XLSX, XLS</p>
                {uploadProgress && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                        <div 
                            className="bg-orange-500 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((uploadProgress.processedRecords / uploadProgress.totalRecords) * 100)}%` }}
                        ></div>
                    </div>
                )}
                {uploadStatus && (
                    <div className={`mt-2 p-2 rounded ${
                        uploadStatus.startsWith('Error') ? 'bg-red-100 text-red-700' : 
                        uploadStatus.startsWith('Processing') ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                    }`}>
                        {uploadStatus}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DetailedLeviedUpload;
