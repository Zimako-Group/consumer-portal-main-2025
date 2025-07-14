import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { db } from '../firebaseConfig';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { CustomerData } from './customerService';

// Essential columns that must be present
const ESSENTIAL_COLUMNS = [
  'ACCOUNT NO',
  'ACCOUNT HOLDER NAME',
  'ID NUMBER',
  'ERF NUMBER'
];

// Optional columns that are nice to have but not required
const OPTIONAL_COLUMNS = [
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
  'CREDIT INSTRUCTION',  // Made optional since it's causing issues
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
  'OUTSANDING TOTAL BALANCE',  // Made optional with alternative names
  'LAST PAYMENT AMOUNT',
  'LAST PAYMENT DATE',
  'AGREEMENT OUTSTANDING',
  'AGREEMENT TYPE',
  'HOUSING OUTSANDING',  // Made optional with alternative names
  'ACC STATUS'  // Made optional with alternative names
];

// All columns combined for reference - used for logging and debugging
const ALL_COLUMNS = [...ESSENTIAL_COLUMNS, ...OPTIONAL_COLUMNS];

// Helper function to convert account status string to valid enum value
const getAccountStatus = (status: string): 'active' | 'inactive' | 'suspended' | 'pending' => {
  status = status.toLowerCase().trim();
  
  if (status === 'active' || status === 'a') return 'active';
  if (status === 'inactive' || status === 'i') return 'inactive';
  if (status === 'suspended' || status === 's') return 'suspended';
  if (status === 'pending' || status === 'p') return 'pending';
  
  // Default to active if unknown
  return 'active';
};

// Log available columns for debugging
console.debug('Available columns for processing:', ALL_COLUMNS);

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
  
  // Create a mapping of alternative column names
  const columnAliases: Record<string, string[]> = {
    'ACCOUNT NO': ['ACCOUNT NO', 'ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT_NO'],
    'ACCOUNT HOLDER NAME': ['ACCOUNT HOLDER NAME', 'ACCOUNT HOLDER', 'HOLDER NAME', 'CUSTOMER NAME'],
    'ID NUMBER': ['ID NUMBER', 'ID NO', 'IDENTIFICATION NUMBER', 'ID'],
    'ERF NUMBER': ['ERF NUMBER', 'ERF NO', 'ERF', 'ERF_NUMBER'],
    'CREDIT INSTRUCTION': ['CREDIT INSTRUCTION', 'CREDIT INSTRUCTIONS', 'CREDIT_INSTRUCTION'],
    'OUTSANDING TOTAL BALANCE': ['OUTSANDING TOTAL BALANCE', 'OUTSTANDING TOTAL BALANCE', 'TOTAL BALANCE', 'OUTSTANDING BALANCE'],
    'HOUSING OUTSANDING': ['HOUSING OUTSANDING', 'HOUSING OUTSTANDING', 'HOUSING BALANCE'],
    'ACC STATUS': ['ACC STATUS', 'ACCOUNT STATUS', 'STATUS']
  };
  
  // Check for missing essential columns with alias support
  const missingColumns = ESSENTIAL_COLUMNS.filter((requiredCol: string) => {
    // If the column has aliases, check if any of them are present
    if (columnAliases[requiredCol]) {
      return !columnAliases[requiredCol].some(alias => normalizedHeaders.includes(alias));
    }
    // Otherwise, check for the exact column name
    return !normalizedHeaders.includes(requiredCol);
  });

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

export const processCustomerFile = async (file: File): Promise<{ success: boolean; message: string; data: any[] }> => {
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
    
    // Store parsed data for return value
    const parsedData = parseResult.data;
    
    // Check if db is initialized
    if (!db) {
      throw new Error('Firebase Firestore is not initialized');
    }
    
    let batch = writeBatch(db);
    const customersRef = collection(db, 'customers');
    let processedCount = 0;
    let batchCount = 0;
    let startTime = Date.now();

    // Helper function to get value from row with alternative column names
    const getValueFromRow = (row: any, primaryKey: string, alternativeKeys: string[] = []): any => {
      // First try the primary key
      if (row[primaryKey] !== undefined) {
        return parseValue(row[primaryKey]);
      }
      
      // Try alternative keys
      for (const altKey of alternativeKeys) {
        if (row[altKey] !== undefined) {
          return parseValue(row[altKey]);
        }
      }
      
      // If not found, try case-insensitive matching
      const allKeys = [primaryKey, ...alternativeKeys];
      const rowKeys = Object.keys(row);
      
      for (const searchKey of allKeys) {
        const foundKey = rowKeys.find(key => key.toUpperCase() === searchKey.toUpperCase());
        if (foundKey && row[foundKey] !== undefined) {
          return parseValue(row[foundKey]);
        }
      }
      
      return 'N/A';
    };
    
    for (const row of parseResult.data) {
      console.log('Processing row with keys:', Object.keys(row));
      console.log('Raw row data:', row);
      
      const rawAccountNumber = getValueFromRow(row, 'ACCOUNT NO', ['ACCOUNT NUMBER', 'ACC NO', 'ACCOUNT_NO']);
      console.log('Extracted rawAccountNumber:', rawAccountNumber);
      
      if (!rawAccountNumber || rawAccountNumber === 'N/A') {
        console.warn(`Skipping row: Missing account number. Raw value:`, rawAccountNumber);
        continue;
      }

      const documentId = sanitizeDocumentId(rawAccountNumber.toString());
      // Create a data object with only the fields that exist in CustomerData interface
      const customerData: Partial<CustomerData> = {
        accountNumber: rawAccountNumber.toString(),
        accountHolderName: getValueFromRow(row, 'ACCOUNT HOLDER NAME', ['ACCOUNT HOLDER', 'HOLDER NAME']) as string,
        idNumber: getValueFromRow(row, 'ID NUMBER', ['ID NO', 'IDENTIFICATION NUMBER']) as string,
        erfNumber: getValueFromRow(row, 'ERF NUMBER', ['ERF NO', 'ERF']) as string,
        valuation: Number(getValueFromRow(row, 'VALUATION', ['PROPERTY VALUATION'])) || 0,
        email: getValueFromRow(row, 'EMAIL ADDRESS', ['EMAIL', 'E-MAIL']) as string,
        phone: getValueFromRow(row, 'CELL NUMBER', ['CELL PHONE', 'MOBILE NUMBER', 'PHONE NUMBER']) as string,
        address: getValueFromRow(row, 'STREET ADDRESS', ['STREET', 'ADDRESS', 'PHYSICAL ADDRESS']) as string,
        postalAddress1: getValueFromRow(row, 'POSTAL ADDRESS 1', ['POSTAL ADDRESS LINE 1', 'POSTAL LINE 1']) as string,
        postalAddress2: getValueFromRow(row, 'POSTAL ADDRESS 2', ['POSTAL ADDRESS LINE 2', 'POSTAL LINE 2']) as string,
        postalAddress3: getValueFromRow(row, 'POSTAL ADDRESS 3', ['POSTAL ADDRESS LINE 3', 'POSTAL LINE 3']) as string,
        postalCode: getValueFromRow(row, 'POSTAL CODE', ['POST CODE', 'ZIP CODE']) as string,
        accountStatus: getAccountStatus(getValueFromRow(row, 'ACC STATUS', ['ACCOUNT STATUS', 'STATUS']) as string),
        outstandingBalance: Number(getValueFromRow(row, 'OUTSANDING TOTAL BALANCE', ['OUTSTANDING TOTAL BALANCE', 'TOTAL BALANCE', 'OUTSTANDING BALANCE'])) || 0,
        lastPaymentAmount: Number(getValueFromRow(row, 'LAST PAYMENT AMOUNT', ['PAYMENT AMOUNT', 'RECENT PAYMENT AMOUNT'])) || 0,
        lastPaymentDate: getValueFromRow(row, 'LAST PAYMENT DATE', ['PAYMENT DATE', 'RECENT PAYMENT DATE']) as string,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // Additional data fields that could be used in the future
      /* const additionalData = {
        vatRegNumber: getValueFromRow(row, 'VAT REG NUMBER', ['VAT REGISTRATION', 'VAT NUMBER']) as string,
        companyCcNumber: getValueFromRow(row, 'COMPANY CC NUMBER', ['COMPANY NUMBER', 'CC NUMBER']) as string,
        occupantOwner: getValueFromRow(row, 'OCC/OWN', ['OCCUPANT/OWNER', 'OCCUPANT OWNER']) as string,
        accountType: getValueFromRow(row, 'ACCOUNT TYPE', ['ACC TYPE', 'TYPE OF ACCOUNT']) as string,
        ownerCategory: getValueFromRow(row, 'OWNER CATEGORY', ['OWNER TYPE', 'CATEGORY']) as string,
        groupAccount: getValueFromRow(row, 'GROUP ACCOUNT', ['GROUP ACC', 'GROUP']) as string,
        creditInstruction: getValueFromRow(row, 'CREDIT INSTRUCTION', ['CREDIT INSTRUCTIONS', 'CREDIT_INSTRUCTION']) as string,
        creditStatus: getValueFromRow(row, 'CREDIT STATUS', ['CREDIT STATE', 'CREDIT STANDING']) as string,
        mailingInstruction: getValueFromRow(row, 'MAILING INSTRUCTION', ['MAILING INSTRUCTIONS', 'MAIL INSTRUCTION']) as string,
        town: getValueFromRow(row, 'TOWN', ['CITY', 'MUNICIPALITY']) as string,
        suburb: getValueFromRow(row, 'SUBURB', ['DISTRICT', 'AREA']) as string,
        ward: getValueFromRow(row, 'WARD', ['WARD NUMBER', 'WARD NO']) as string,
        propertyCategory: getValueFromRow(row, 'PROPERTY CATEGORY', ['PROPERTY TYPE', 'PROPERTY CLASS']) as string,
        gisKey: getValueFromRow(row, 'GIS KEY', ['GIS', 'GIS ID']) as string,
        indigent: getValueFromRow(row, 'INDIGENT', ['INDIGENT STATUS', 'IS INDIGENT']) as string,
        pensioner: getValueFromRow(row, 'PENSIONER', ['PENSIONER STATUS', 'IS PENSIONER']) as string,
        handOver: getValueFromRow(row, 'HAND OVER', ['HANDOVER', 'HANDED OVER']) as string,
        outstandingBalanceCapital: Number(getValueFromRow(row, 'OUTSTANDING BALANCE CAPITAL', ['BALANCE CAPITAL', 'CAPITAL BALANCE'])) || 0,
        outstandingBalanceInterest: Number(getValueFromRow(row, 'OUTSTANDING BALANCE INTEREST', ['BALANCE INTEREST', 'INTEREST BALANCE'])) || 0,
        agreementOutstanding: getValueFromRow(row, 'AGREEMENT OUTSTANDING', ['AGREEMENT BALANCE', 'OUTSTANDING AGREEMENT']) as string,
        agreementType: getValueFromRow(row, 'AGREEMENT TYPE', ['TYPE OF AGREEMENT', 'AGREEMENT']) as string,
        housingOutstanding: getValueFromRow(row, 'HOUSING OUTSANDING', ['HOUSING OUTSTANDING', 'HOUSING BALANCE']) as string,
        contactDetails: {
          email: getValueFromRow(row, 'EMAIL ADDRESS', ['EMAIL', 'E-MAIL']) as string,
          phoneNumber: getValueFromRow(row, 'CELL NUMBER', ['CELL PHONE', 'MOBILE NUMBER', 'PHONE NUMBER']) as string,
          address: getValueFromRow(row, 'STREET ADDRESS', ['STREET', 'ADDRESS', 'PHYSICAL ADDRESS']) as string,
        },
        paymentHistory: [
          {
            date: getValueFromRow(row, 'LAST PAYMENT DATE', ['PAYMENT DATE', 'RECENT PAYMENT DATE']) as string,
            amount: Number(getValueFromRow(row, 'LAST PAYMENT AMOUNT', ['PAYMENT AMOUNT', 'RECENT PAYMENT AMOUNT'])) || 0,
            type: 'Payment',
            reference: 'Payment Reference',
            status: 'Paid',
          },
        ],
      };
      
      */ 
      
      // For debugging
      console.debug(`Processing customer: ${customerData.accountNumber}, Balance: ${customerData.outstandingBalance}`);

      const customerDoc = doc(customersRef, documentId);
      // Set the main customer data
      batch.set(customerDoc, customerData);
      
      // Store additional data in a separate collection if needed in the future
      // batch.set(doc(collection(db, 'customer_metadata'), documentId), additionalData);
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
      message: `Successfully processed ${processedCount} records`,
      data: parsedData // Include the parsed data in the return value
    };
  } catch (error) {
    console.error('Error processing file:', error);
    return {
      success: false,
      message: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: []
    };
  }
};