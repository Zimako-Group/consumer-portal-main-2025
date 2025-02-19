import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { CustomerData } from '../types/customer';

const REQUIRED_COLUMNS = [
  'ACCOUNT NO',
  'ACCOUNT HOLDER NAME',
  'ID NUMBER',
  'ERF NUMBER',
  'VALUATION',
  'VAT REG NUMBER',
  'COMPANY CC NUMBER',
  'POSTAL ADDRESS 1',
  'POSTAL ADDRESS 2',
  'POSTAL ADDRESS 3',
  'POSTAL CODE',
  'EMAIL ADDRESS',
  'CELL NUMBER',
  'OCC/OWN',
  'ACCOUNT TYPE',
  'OWNER CATEGORY',
  'GROUP ACCOUNT',
  'CREDIT INSTRUCTION',
  'CREDIT STATUS',
  'MAILING INSTRUCTION',
  'STREET ADDRESS',
  'TOWN',
  'SUBURB',
  'WARD',
  'PROPERTY CATEGORY',
  'GIS KEY',
  'INDIGENT',
  'PENSIONER',
  'HAND OVER',
  'OUTSTANDING BALANCE CAPITAL',
  'OUTSTANDING BALANCE INTEREST',
  'OUTSANDING TOTAL BALANCE',
  'LAST PAYMENT AMOUNT',
  'LAST PAYMENT DATE',
  'AGREEMENT OUTSTANDING',
  'AGREEMENT TYPE',
  'HOUSING OUTSANDING',
  'ACC STATUS'
];

const parseValue = (value: any): string | number => {
  try {
    if (value === null || value === undefined) return 'N/A';
    const strValue = String(value).trim();
    if (strValue === '') return 'N/A';
    if (/^-?\d*\.?\d+$/.test(strValue)) {
      const num = parseFloat(strValue);
      return isNaN(num) ? 'N/A' : num;
    }
    return strValue || 'N/A';
  } catch (error) {
    console.error('Error parsing value:', value, error);
    return 'N/A';
  }
};

const sanitizeDocumentId = (value: string): string => {
  return value.toString()
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/^[^a-zA-Z0-9]/, '0')
    .substring(0, 1500);
};

const validateHeaders = (headers: string[]): { isValid: boolean; message: string } => {
  const normalizedHeaders = headers.map(h => h.trim().toUpperCase());
  const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));

  if (missingColumns.length > 0) {
    return {
      isValid: false,
      message: `Missing required columns: ${missingColumns.join(', ')}`
    };
  }

  return { isValid: true, message: 'Headers valid' };
};

const processExcelFile = async (file: File): Promise<{ data: any[]; errors: any[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or contains only headers'));
          return;
        }

        const headers = jsonData[0] as string[];
        const headerValidation = validateHeaders(headers);

        if (!headerValidation.isValid) {
          reject(new Error(headerValidation.message));
          return;
        }

        const normalizedHeaders = headers.map(h => h.trim().toUpperCase());
        const rows = jsonData.slice(1).map(row => {
          const obj: any = {};
          normalizedHeaders.forEach((header, index) => {
            obj[header] = (row as any[])[index];
          });
          return obj;
        });

        resolve({ data: rows, errors: [] });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

const processCsvFile = async (file: File): Promise<{ data: any[]; errors: any[] }> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toUpperCase(),
      complete: (results) => {
        const headerValidation = validateHeaders(Object.keys(results.data[0] || {}));
        if (!headerValidation.isValid) {
          reject(new Error(headerValidation.message));
          return;
        }
        resolve({ data: results.data, errors: results.errors });
      },
      error: (error) => reject(error)
    });
  });
};

export const processCustomerFile = async (file: File): Promise<{ success: boolean; message: string }> => {
  try {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let parseResult;

    if (fileExtension === 'csv') {
      parseResult = await processCsvFile(file);
    } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
      parseResult = await processExcelFile(file);
    } else {
      throw new Error('Unsupported file format');
    }

    if (parseResult.errors.length > 0) {
      throw new Error(`File parsing errors: ${JSON.stringify(parseResult.errors)}`);
    }

    const totalRecords = parseResult.data.length;
    console.log(`Starting to process ${totalRecords} records...`);

    let batch = writeBatch(db);
    const customersRef = collection(db, 'customers');
    let processedCount = 0;
    let batchCount = 0;
    let startTime = Date.now();

    for (const row of parseResult.data) {
      const rawAccountNumber = parseValue(row['ACCOUNT NO']);
      if (!rawAccountNumber || rawAccountNumber === 'N/A') {
        console.warn(`Skipping row: Missing account number`);
        continue;
      }

      const documentId = sanitizeDocumentId(rawAccountNumber.toString());
      const customerData: Partial<CustomerData> = {
        accountNumber: rawAccountNumber.toString(),
        accountHolderName: parseValue(row['ACCOUNT HOLDER NAME']) as string,
        idNumber: parseValue(row['ID NUMBER']) as string,
        erfNumber: parseValue(row['ERF NUMBER']) as string,
        valuation: parseValue(row['VALUATION']) as string,
        vatRegNumber: parseValue(row['VAT REG NUMBER']) as string,
        companyCcNumber: parseValue(row['COMPANY CC NUMBER']) as string,
        postalAddress1: parseValue(row['POSTAL ADDRESS 1']) as string,
        postalAddress2: parseValue(row['POSTAL ADDRESS 2']) as string,
        postalAddress3: parseValue(row['POSTAL ADDRESS 3']) as string,
        postalCode: parseValue(row['POSTAL CODE']) as string,
        emailAddress: parseValue(row['EMAIL ADDRESS']) as string,
        cellNumber: parseValue(row['CELL NUMBER']) as string,
        occupantOwner: parseValue(row['OCC/OWN']) as string,
        accountType: parseValue(row['ACCOUNT TYPE']) as string,
        ownerCategory: parseValue(row['OWNER CATEGORY']) as string,
        groupAccount: parseValue(row['GROUP ACCOUNT']) as string,
        creditInstruction: parseValue(row['CREDIT INSTRUCTION']) as string,
        creditStatus: parseValue(row['CREDIT STATUS']) as string,
        mailingInstruction: parseValue(row['MAILING INSTRUCTION']) as string,
        streetAddress: parseValue(row['STREET ADDRESS']) as string,
        town: parseValue(row['TOWN']) as string,
        suburb: parseValue(row['SUBURB']) as string,
        ward: parseValue(row['WARD']) as string,
        propertyCategory: parseValue(row['PROPERTY CATEGORY']) as string,
        gisKey: parseValue(row['GIS KEY']) as string,
        indigent: parseValue(row['INDIGENT']) as string,
        pensioner: parseValue(row['PENSIONER']) as string,
        handOver: parseValue(row['HAND OVER']) as string,
        outstandingBalanceCapital: parseValue(row['OUTSTANDING BALANCE CAPITAL']) as number,
        outstandingBalanceInterest: parseValue(row['OUTSTANDING BALANCE INTEREST']) as number,
        outstandingTotalBalance: parseValue(row['OUTSANDING TOTAL BALANCE']) as number,
        lastPaymentAmount: parseValue(row['LAST PAYMENT AMOUNT']) as number,
        lastPaymentDate: parseValue(row['LAST PAYMENT DATE']) as string,
        agreementOutstanding: parseValue(row['AGREEMENT OUTSTANDING']) as string,
        agreementType: parseValue(row['AGREEMENT TYPE']) as string,
        housingOutstanding: parseValue(row['HOUSING OUTSANDING']) as string,
        accountStatus: parseValue(row['ACC STATUS']) as string,
        contactDetails: {
          email: parseValue(row['EMAIL ADDRESS']) as string,
          phoneNumber: parseValue(row['CELL NUMBER']) as string,
          address: parseValue(row['STREET ADDRESS']) as string,
        },
        paymentHistory: [
          {
            date: parseValue(row['LAST PAYMENT DATE']) as string,
            amount: parseValue(row['LAST PAYMENT AMOUNT']) as number,
            type: 'Payment',
            reference: 'Payment Reference',
            status: 'Paid',
          },
        ],
      };

      const customerDoc = doc(customersRef, documentId);
      batch.set(customerDoc, {
        ...customerData,
        lastUpdated: new Date().toISOString()
      });
      processedCount++;
      batchCount++;

      // Calculate and log progress
      const progress = (processedCount / totalRecords) * 100;
      const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
      const recordsPerSecond = processedCount / elapsedTime;
      const estimatedTimeRemaining = (totalRecords - processedCount) / recordsPerSecond;

      // Commit batch every 500 documents and create a new batch
      if (batchCount === 500) {
        await batch.commit();
        console.log(
          `Progress: ${progress.toFixed(1)}% (${processedCount}/${totalRecords}) - ` +
          `Batch ${Math.ceil(processedCount / 500)} committed. ` +
          `Est. time remaining: ${Math.ceil(estimatedTimeRemaining)} seconds`
        );
        batch = writeBatch(db);
        batchCount = 0;
      }
    }

    // Commit any remaining documents
    if (batchCount > 0) {
      await batch.commit();
      const totalTime = (Date.now() - startTime) / 1000;
      console.log(
        `Completed! Processed ${processedCount} records in ${totalTime.toFixed(1)} seconds ` +
        `(${(processedCount / totalTime).toFixed(1)} records/sec)`
      );
    }

    return {
      success: true,
      message: `Successfully processed ${processedCount} records`
    };
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
};