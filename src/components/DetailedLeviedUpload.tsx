import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { DetailedLevied, uploadDetailedLevied, UploadProgress } from '../services/detailedLeviedService';

const DetailedLeviedUpload: React.FC = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    const [lastUpload, setLastUpload] = useState<string>('');
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    const handleProgress = (progress: UploadProgress) => {
        setUploadProgress(progress);
        const percentComplete = Math.round((progress.processedRecords / progress.totalRecords) * 100);
        
        switch (progress.status) {
            case 'processing':
                setUploadStatus(`Processing: ${percentComplete}% complete (${progress.processedRecords}/${progress.totalRecords} records, Batch ${progress.currentBatch}/${progress.totalBatches})`);
                break;
            case 'completed':
                const now = new Date();
                const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
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

                records = result.data.map(processRow);
            } else {
                // Process XLSX file
                const workbook = XLSX.read(fileContent, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet);

                records = data.map(processRow);
            }

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

            await uploadDetailedLevied(records, handleProgress);
        } catch (error) {
            console.error('Error processing file:', error);
            setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            setUploadProgress(null);
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

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
    }, []);

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

            <div className="space-y-2">
                <p className="text-sm font-medium dark:text-white text-black">Select CSV or Excel File</p>
                <div className="relative">
                    <div 
                        {...getRootProps()} 
                        className={`flex items-center justify-between bg-dark-card dark:bg-dark-card rounded-lg p-3 cursor-pointer border border-gray-600 ${
                            isUploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        <input {...getInputProps()} disabled={isUploading} />
                        <button 
                            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
                            disabled={isUploading}
                        >
                            {isUploading ? 'Uploading...' : 'Choose File'}
                        </button>
                        <span className="text-gray-400">
                            {isDragActive ? "Drop the file here..." : "No file chosen"}
                        </span>
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
