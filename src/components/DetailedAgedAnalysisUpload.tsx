import React, { useState, useEffect } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { getLastUploadTimestamp, updateUploadTimestamp } from '../services/uploadTimestampService';

interface DetailedAgedAnalysis {
    ACCOUNT_NO: string;
    TARIFF_CODE: string;
    TARIFF_DESC: string;
    SERVICE_CODE: string;
    SERVICE_DESC: string;
    INTEREST_YN: string;
    REF_TARIFF_CODE: string;
    REF_TARIFF_DESC: string;
    SCOA_CONTROL_CODE: string;
    SCOA_CONTROL_DESC: string;
    SCOA_ITEM_CODE: string;
    '202409_Current': string;
    '202408_30Days': string;
    '202407_60Days': string;
    '202406_90Days': string;
    '202405_120 Days': string;
    '202404_150Days': string;
    '202403_180Days': string;
    '202402_210Days': string;
    '202401_240Days': string;
    '202312_270Days': string;
    '202311_300Days': string;
    '202310_330Days': string;
    '202309_360Days': string;
    '202308_390+Days': string;
    TOTAL: string;
    WRITTEN_OFF: string;
    ACCOUNT_HOLDER: string;
    ERF_EXTENTION: string;
    ERF_LOT_NUMBER: string;
    ERF_SUB_DIVISION: string;
    ERF_UNIT_NUMBER: string;
    STREET_ADDRESS: string;
    POST_ADR_1: string;
    POST_ADR_2: string;
    POST_ADR_3: string;
    POST_CODE: string;
    CELL_NUMBER: string;
    ID_NUMBER_1: string;
    ID_NUMBER_2: string;
    ACCOUNT_EMAIL: string;
    ACCOUNT_STATUS: string;
    ACCOUNT_TYPE: string;
    SUB_ACCOUNT_TYPE: string;
    OWNER_TYPE: string;
    CATEGORY: string;
    CREDIT_STATUS: string;
    CREDIT_INSTRUCTION: string;
    GROUP_ACCOUNT: string;
    MAILING_INSTRUCTION: string;
    OLD_ACCOUNT_NUMBER: string;
    NOTES_2: string;
    PROVINCE: string;
    TOWN: string;
    SUBURB: string;
    WARD: string;
    PROPERTY_CATEGORY: string;
    GIS_KEY: string;
    ERF_REF: string;
    DEPOSIT: string;
    INDIGENT_YN: string;
    INDIGENT_APPLICATION: string;
    INDIGENT_EXPIRY: string;
    INDIGENT_SEQ: string;
    PENSIONER_YN: string;
    EXTENSION_YN: string;
    LAST_PAYMENT_DATE: string;
    LAST_PAYMENT_AMT: string;
    AGREEMENT_BALANCE: string;
    NO_OF_HND_OVERS: string;
    HND_OVR_YN: string;
    METERS: string;
    'NT GROUP CODE': string;
    'NT GROUP DESC': string;
    STATUS_RISK_SCORE: string;
    OWNERSHIP_TYPE_RISK_SCORE: string;
    ACC_TYPE_RISK_SCORE: string;
    TOTAL_TYPE_RISK: string;
    IMPAIR_YN: string;
    IMPAIR_TOTAL: string;
    'UP TO 30 DAY FACTOR': string;
    '60 DAY FACTOR': string;
    '90 DAY FACTOR': string;
    '120 DAY FACTOR': string;
    '150 DAY FACTOR': string;
    '180 DAY FACTOR': string;
    TOTAL_PAYMENT_RISK: string;
    PROVISION_FACTOR: string;
    BAD_DEBT_PROVISION: string;
    FACTOR: string;
}

export default function DetailedAgedAnalysisUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [lastUpload, setLastUpload] = useState<string | null>(null);

    useEffect(() => {
        const fetchLastUpload = async () => {
            const timestamp = await getLastUploadTimestamp('detailedAged');
            setLastUpload(timestamp);
        };
        fetchLastUpload();
    }, []);

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
        setIsUploading(true);
        setProgress(0);

        try {
            let data: DetailedAgedAnalysis[] = [];

            if (file.name.endsWith('.csv')) {
                data = await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            resolve(results.data as DetailedAgedAnalysis[]);
                        },
                        error: (error) => {
                            reject(error);
                        }
                    });
                });
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const workbook = await readExcelFile(file);
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(worksheet);
            } else {
                throw new Error('Unsupported file format');
            }

            if (!data || data.length === 0) {
                throw new Error('No data found in file');
            }

            console.log('Sample record:', data[0]); // Debug log
            await processUpload(data);
            await updateUploadTimestamp('detailedAged');
            const newTimestamp = await getLastUploadTimestamp('detailedAged');
            setLastUpload(newTimestamp);
            toast.success('File uploaded successfully');
        } catch (error) {
            console.error('Error processing file:', error);
            toast.error('Failed to process file');
        } finally {
            setIsUploading(false);
            setProgress(0);
        }
    };

    const processUpload = async (data: DetailedAgedAnalysis[]) => {
        try {
            console.log(`Starting to process ${data.length} records...`);
            const BATCH_SIZE = 500;
            let processedRecords = 0;
            let currentBatch: DetailedAgedAnalysis[] = [];
            let totalGroups = 0;

            // First pass: group all data and count total unique customers
            console.log('Grouping data by customer...');
            const allGroupedData = data.reduce((acc, record) => {
                if (!record.ACCOUNT_NO) {
                    console.warn('Record missing ACCOUNT_NO:', record);
                    return acc;
                }

                if (!acc[record.ACCOUNT_NO]) {
                    acc[record.ACCOUNT_NO] = {
                        details: [],
                        totals: {
                            current: 0,
                            days30: 0,
                            days60: 0,
                            days90: 0,
                            days120: 0,
                            days150: 0,
                            days180: 0,
                            days210: 0,
                            days240: 0,
                            days270: 0,
                            days300: 0,
                            days330: 0,
                            days360: 0,
                            days390Plus: 0
                        }
                    };
                }

                acc[record.ACCOUNT_NO].details.push(record);

                // Helper function to safely process amounts
                const processAmount = (value: any): number => {
                    if (value === undefined || value === null || value === '') return 0;
                    if (typeof value === 'number') return value;
                    if (typeof value === 'string') {
                        const cleanValue = value.replace(/[^0-9.-]/g, '');
                        const num = Number(cleanValue);
                        return isNaN(num) ? 0 : num;
                    }
                    return 0;
                };

                // Sum up the aging amounts
                acc[record.ACCOUNT_NO].totals.current += processAmount(record['202409_Current']);
                acc[record.ACCOUNT_NO].totals.days30 += processAmount(record['202408_30Days']);
                acc[record.ACCOUNT_NO].totals.days60 += processAmount(record['202407_60Days']);
                acc[record.ACCOUNT_NO].totals.days90 += processAmount(record['202406_90Days']);
                acc[record.ACCOUNT_NO].totals.days120 += processAmount(record['202405_120 Days']);
                acc[record.ACCOUNT_NO].totals.days150 += processAmount(record['202404_150Days']);
                acc[record.ACCOUNT_NO].totals.days180 += processAmount(record['202403_180Days']);
                acc[record.ACCOUNT_NO].totals.days210 += processAmount(record['202402_210Days']);
                acc[record.ACCOUNT_NO].totals.days240 += processAmount(record['202401_240Days']);
                acc[record.ACCOUNT_NO].totals.days270 += processAmount(record['202312_270Days']);
                acc[record.ACCOUNT_NO].totals.days300 += processAmount(record['202311_300Days']);
                acc[record.ACCOUNT_NO].totals.days330 += processAmount(record['202310_330Days']);
                acc[record.ACCOUNT_NO].totals.days360 += processAmount(record['202309_360Days']);
                acc[record.ACCOUNT_NO].totals.days390Plus += processAmount(record['202308_390+Days']);

                return acc;
            }, {} as Record<string, { details: DetailedAgedAnalysis[], totals: Record<string, number> }>);

            const groupedDataArray = Object.entries(allGroupedData);
            totalGroups = groupedDataArray.length;
            console.log(`Grouped into ${totalGroups} unique customers`);

            // Process in batches
            let currentBatchNumber = 1;
            const totalBatches = Math.ceil(totalGroups / BATCH_SIZE);

            for (let i = 0; i < groupedDataArray.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const batchItems = groupedDataArray.slice(i, i + BATCH_SIZE);

                console.log(`Processing batch ${currentBatchNumber}/${totalBatches} (${batchItems.length} customers)`);

                for (const [accountNo, data] of batchItems) {
                    const docRef = doc(db, 'detailed_aged_analysis', accountNo);
                    batch.set(docRef, {
                        accountNo,
                        details: data.details,
                        totals: data.totals,
                        lastUpdated: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
                        uploadTimestamp: new Date().toISOString()
                    });
                    processedRecords++;
                }

                // Commit the batch
                await batch.commit();
                console.log(`Committed batch ${currentBatchNumber}/${totalBatches}`);
                
                // Update progress
                const progress = Math.round((processedRecords / totalGroups) * 100);
                setProgress(progress);
                
                // Show progress toast every 5 batches
                if (currentBatchNumber % 5 === 0 || currentBatchNumber === totalBatches) {
                    toast.success(`Processed ${processedRecords} of ${totalGroups} customers (${progress}%)`);
                }

                currentBatchNumber++;

                // Small delay between batches to prevent overwhelming Firestore
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log(`Successfully processed all ${processedRecords} customers`);
            setProgress(100);
            toast.success(`Upload complete! Processed ${processedRecords} customers`);

        } catch (error) {
            console.error('Error uploading to Firestore:', error);
            toast.error('Upload failed. Please try again.');
            throw new Error('Failed to upload data to Firestore');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const fileType = file.name.toLowerCase();
            if (!fileType.endsWith('.csv') && !fileType.match(/\.(xlsx|xls)$/)) {
                toast.error('Please upload a CSV or Excel file');
                return;
            }
            processFile(file);
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Upload Detailed Aged Analysis Report
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
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Supported formats: CSV, XLSX, XLS
                    </p>
                </div>
                {isUploading && (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                            Processing... {progress}%
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
