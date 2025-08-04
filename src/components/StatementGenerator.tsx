import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import logoImage from '../assets/mohokare-logo.png';
import absaLogo from '../assets/bank-logos/absa-logo.png';
import fnbLogo from '../assets/bank-logos/fnb-logo.png';
import nedbankLogo from '../assets/bank-logos/nedbank-logo.png';
import standardBankLogo from '../assets/bank-logos/standardbank-logo.png';
import capitecLogo from '../assets/bank-logos/capitec-logo.png';
import africanBankLogo from '../assets/bank-logos/africanbank-logo.png';
import yebopayLogo from '../assets/bank-logos/yebopay-logo.png';
import postOfficeLogo from '../assets/bank-logos/postoffice-logo.png';
import { getMeterReadingsForCustomer } from '../services/meterReadingService';
import { getDetailedLeviedForCustomer, AccountDetailsData } from '../services/detailedLeviedService';
import { getAgingAnalysisForCustomer } from '../services/detailedAgedAnalysisService';
import { getBalanceReportForCustomer } from '../services/balanceReportService';
import React from 'react';
import { createRoot } from 'react-dom/client';
import PaymentGateway from './PaymentGateway';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface CustomerData {
  accountHolderName: string;
  accountNumber: string;
  address: string;
  erfNumber: string;
  vatRegNumber: string;
  outstandingBalance: number;
  outstandingTotalBalance: number;
  aging120Days: number;
  aging90Days: number;
  aging60Days: number;
  aging30Days: number;
  agingCurrent: number;
  closingBalance: number;
  postalAddress1?: string;
  postalAddress2?: string;
  postalAddress3?: string;
  postalCode?: string;
  propertyCategory?: string;
  valuation?: number;  // Added valuation field
  agingAnalysis?: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days120: number;
    days150Plus: number;
  };
  accountDetails?: AccountDetailsData[];
}

// AccountDetailsData interface is now imported from detailedLeviedService

// Helper function to preload images synchronously
function preloadImage(src: any): Promise<string> {
  return new Promise((resolve, reject) => {
    // Handle different types of image sources
    let imgSrc = src;
    if (typeof src === 'object' && src !== null && 'default' in src) {
      imgSrc = (src as any).default;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imgSrc as string;
  });
}

interface CustomerInput {
  accountNumber: string;
  month: string;
  year: string;
}

interface StatementGeneratorState {
  isPaymentModalOpen: boolean;
  currentCustomer: {
    name: string;
    amount: number;
    accountNumber: string;
  } | null;
}

class StatementGenerator extends React.Component<{}, StatementGeneratorState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      isPaymentModalOpen: false,
      currentCustomer: null
    };
  }

  componentDidMount() {
    (window as any).handleYeboPayClick = this.handleYeboPayClick;
  }

  componentWillUnmount() {
    delete (window as any).handleYeboPayClick;
  }

  handleYeboPayClick = (customerName: string, amount: number, accountNumber: string) => {
    this.setState({
      currentCustomer: {
        name: customerName,
        amount: amount,
        accountNumber: accountNumber
      },
      isPaymentModalOpen: true
    });
  };

  fetchCustomerDetails = async (input: string | CustomerInput): Promise<CustomerData | null> => {
    try {
      // Get the account number from either string input or customer object
      const accountNumber = typeof input === 'string' ? input : (input.accountNumber);
      // Always use the provided month and year from input if available, otherwise use current date
      const currentDate = new Date();
      const year = typeof input === 'object' ? input.year : currentDate.getFullYear().toString();
      const month = typeof input === 'object' ? input.month : (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      console.log('=== STATEMENT GENERATION DEBUG ===');
      console.log('Input type:', typeof input);
      console.log('Input object:', input);
      console.log('Extracted account number:', accountNumber);
      console.log('Extracted year:', year);
      console.log('Extracted month:', month);
      console.log('Expected Firestore paths:');
      console.log(`  - detailed_levied/${year}/${month.padStart(2, '0')}/${accountNumber}`);
      console.log(`  - detailed_aged_analysis/${year}/${month.padStart(2, '0')}/${accountNumber}`);
      console.log(`  - balanceReports/${year}/${month.padStart(2, '0')}/${accountNumber}`);
      console.log('=== END DEBUG INFO ===');
      
      // Get customer document from Firestore
      if (!db) {
        console.error('Firestore database is not initialized');
        return null;
      }
      const customerDoc = await getDoc(doc(db, 'customers', accountNumber));
      
      if (!customerDoc.exists()) {
        console.log('No customer found with account number:', accountNumber);
        return null;
      }

      const data = customerDoc.data();
      console.log('Customer data from Firestore:', data);

      // Fetch account details from detailed_levied collection
      console.log('Fetching account details from detailed_levied collection...');
      console.log(`Using year: ${year}, month: ${month} for detailed levied data`);
      const accountDetails = await getDetailedLeviedForCustomer(accountNumber, year, month);
      console.log('Account details fetched:', accountDetails);

      // Fetch aging analysis data from detailed_aged_analysis collection
      console.log('Fetching aging analysis data from detailed_aged_analysis collection...');
      console.log(`Account number for aging analysis: ${accountNumber}, Year: ${year}, Month: ${month}`);
      const agingAnalysisData = await getAgingAnalysisForCustomer(accountNumber, year, month);
      console.log('Aging analysis data fetched:', agingAnalysisData);
      console.log('Aging analysis data type:', typeof agingAnalysisData);
      console.log('Aging analysis data keys:', agingAnalysisData ? Object.keys(agingAnalysisData) : 'null');
      
      // Check if we got valid data
      if (agingAnalysisData && (agingAnalysisData.current > 0 || agingAnalysisData.thirtyDays > 0 || agingAnalysisData.sixtyDays > 0 || agingAnalysisData.ninetyDays > 0 || agingAnalysisData.hundredTwentyPlusDays > 0)) {
        console.log('✅ Valid aging analysis data found!');
      } else {
        console.log('❌ No valid aging analysis data found - all values are 0');
      }

      // Fetch balance report data for closing balance
      console.log('Fetching balance report data for closing balance...');
      console.log('Account number for balance report lookup:', accountNumber);
      console.log('Account number type:', typeof accountNumber);
      // Ensure month is properly padded with leading zero if needed
      const paddedMonth = month.padStart(2, '0');
      const balanceReportDate = `${year}-${paddedMonth}`;
      console.log('Balance report date:', balanceReportDate);
      console.log(`Looking for document at path: balanceReports/${year}/${paddedMonth}/${accountNumber}`);
      const balanceReportData = await getBalanceReportForCustomer(accountNumber, balanceReportDate);
      console.log('Balance report data fetched:', balanceReportData);
      console.log('Available fields in balance report:', balanceReportData ? Object.keys(balanceReportData) : 'No data');
      
      // Extract closing balance from balance report
      // Handle both camelCase and uppercase field names
      const balanceReportAny = balanceReportData as any;
      const closingBalanceFromReport = balanceReportData?.outstandingTotalBalance || 
                                     balanceReportAny?.['OUTSTANDING TOTAL BALANCE'] || 
                                     balanceReportAny?.['OUTSTANDING_TOTAL_BALANCE'] || 0;
      console.log('Closing balance from balance report (outstandingTotalBalance):', balanceReportData?.outstandingTotalBalance);
      console.log('Closing balance from balance report (OUTSTANDING TOTAL BALANCE):', balanceReportAny?.['OUTSTANDING TOTAL BALANCE']);
      console.log('Final closing balance from report:', closingBalanceFromReport);
      
      // If no balance report data is found for the selected month/year, do NOT fall back to another month
      // Instead, just use the aging analysis data or show zero
      const finalClosingBalance = balanceReportData ? closingBalanceFromReport : (agingAnalysisData?.closingBalance || 0);
      console.log(`Using ${balanceReportData ? 'balance report data' : 'aging analysis data'} for closing balance`);
      console.log('Final closing balance to use:', finalClosingBalance);

      // Return customer data with postal address fields, account details, and aging analysis
      return {
        accountHolderName: data.accountHolderName || '',
        accountNumber: accountNumber,
        address: data.streetAddress || '',
        erfNumber: data.erfNumber || '',
        vatRegNumber: data.vatRegNumber || '',
        outstandingBalance: data.outstandingBalance || 0,
        outstandingTotalBalance: data.outstandingTotalBalance || 0,
        aging120Days: agingAnalysisData?.hundredTwentyPlusDays || data.aging120Days || 0,
        aging90Days: agingAnalysisData?.ninetyDays || data.aging90Days || 0,
        aging60Days: agingAnalysisData?.sixtyDays || data.aging60Days || 0,
        aging30Days: agingAnalysisData?.thirtyDays || data.aging30Days || 0,
        agingCurrent: agingAnalysisData?.current || data.agingCurrent || 0,
        closingBalance: finalClosingBalance,
        postalAddress1: data.postalAddress1 || '',
        postalAddress2: data.postalAddress2 || '',
        postalAddress3: data.postalAddress3 || '',
        postalCode: data.postalCode || '',
        propertyCategory: data.propertyCategory || '',
        valuation: data.valuation || 0,  // Added valuation field
        agingAnalysis: agingAnalysisData ? {
          current: agingAnalysisData.current,
          days30: agingAnalysisData.thirtyDays,
          days60: agingAnalysisData.sixtyDays,
          days90: agingAnalysisData.ninetyDays,
          days120: agingAnalysisData.hundredTwentyPlusDays,
          days150Plus: 0 // Not available in new structure
        } : (data.agingAnalysis || {
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          days120: 0,
          days150Plus: 0
        }),
        // Add account details to the customer data
        accountDetails: accountDetails
      };
    } catch (error) {
      console.error('Error fetching customer details:', error);
      return null;
    }
  };

  fetchAgedAnalysis = async (customerNumber: string, year: string = '2024', month: string = '10') => {
    try {
      console.log(`Fetching aged analysis for account ${customerNumber} in ${year}/${month}`);
      
      // Use the service function to get aging analysis data
      const agingData = await getAgingAnalysisForCustomer(customerNumber, year, month);
      
      if (agingData) {
        console.log('Aging analysis data fetched:', agingData);
        return {
          current: agingData.current.toFixed(2),
          days30: agingData.thirtyDays.toFixed(2),
          days60: agingData.sixtyDays.toFixed(2),
          days90: agingData.ninetyDays.toFixed(2),
          days120: agingData.hundredTwentyPlusDays.toFixed(2),
          days150: '0.00', // Not available in new structure
          days180: '0.00', // Not available in new structure
          days210: '0.00', // Not available in new structure
          days240: '0.00', // Not available in new structure
          days270: '0.00', // Not available in new structure
          days300: '0.00', // Not available in new structure
          days330: '0.00', // Not available in new structure
          days360: '0.00', // Not available in new structure
          days390Plus: '0.00', // Not available in new structure
          closingBalance: agingData.closingBalance.toFixed(2)
        };
      }
      
      console.log(`No aging analysis data found for account ${customerNumber}`);
      return null;
    } catch (error) {
      console.error('Error fetching aged analysis:', error);
      return null;
    }
  };

  fetchCustomerBalance = async (customerNumber: string): Promise<string> => {
    try {
      if (!db) {
        console.error('Firebase database is not initialized');
        return '0';
      }
      const customerDoc = await getDoc(doc(db, 'customers', customerNumber));
      if (customerDoc.exists()) {
        const data = customerDoc.data();
        return data.outstandingBalance || data.outstandingTotalBalance || '0';
      }
      return '0';
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      return '0';
    }
  };

  generateStatement = async (input: string | CustomerInput): Promise<void> => {
    // Preload all logo images to ensure they're ready for PDF generation
    let preloadedLogos: Record<string, string> = {};
    try {
      // Preload all logos in parallel
      const logoPromises = [
        preloadImage(logoImage).then(data => { preloadedLogos.municipal = data; }),
        preloadImage(absaLogo).then(data => { preloadedLogos.absa = data; }),
        preloadImage(fnbLogo).then(data => { preloadedLogos.fnb = data; }),
        preloadImage(nedbankLogo).then(data => { preloadedLogos.nedbank = data; }),
        preloadImage(standardBankLogo).then(data => { preloadedLogos.standardBank = data; }),
        preloadImage(capitecLogo).then(data => { preloadedLogos.capitec = data; }),
        preloadImage(africanBankLogo).then(data => { preloadedLogos.africanBank = data; }),
        preloadImage(yebopayLogo).then(data => { preloadedLogos.yebopay = data; }),
        preloadImage(postOfficeLogo).then(data => { preloadedLogos.postOffice = data; })
      ];
      
      // Wait for all logos to preload
      await Promise.allSettled(logoPromises);
      console.log('Preloaded logos:', Object.keys(preloadedLogos));
    } catch (error) {
      console.warn('Error preloading logos:', error);
      // Continue with generation even if preloading fails
    }
    try {
      console.log('Generating statement for input:', input);
      
      // Log the period being used for statement generation
      if (typeof input === 'object') {
        console.log(`Generating statement for period: Year ${input.year}, Month ${input.month}`);
      }
      
      // Get the account number from either string input or customer object
      const accountNumber = typeof input === 'string' ? input : (input.accountNumber);
      
      // Always use the provided month and year from input if available, otherwise use current date
      const currentDate = new Date();
      const year = typeof input === 'object' ? input.year : currentDate.getFullYear().toString();
      const month = typeof input === 'object' ? input.month : (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      console.log('Using year:', year, 'month:', month, 'for statement generation');

      if (!accountNumber) {
        throw new Error('Account number is required');
      }

      // Fetch customer details
      const customerData = await this.fetchCustomerDetails(input);
      if (!customerData) {
        console.error('Failed to fetch customer details');
        return;
      }

      // Create new jsPDF instance
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Set page margins and content area with increased spacing
      const margin = {
        top: 18,
        bottom: 18,
        left: 18,
        right: 18
      };
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const contentWidth = pageWidth - (margin.left + margin.right);

      // Add single black border around the entire content
      doc.setDrawColor(0, 0, 0); // Pure black
      doc.setLineWidth(0.7);
      
      // Draw single outer border - square corners
      const borderPadding = 12;
      doc.rect(
        margin.left - borderPadding,
        margin.top - borderPadding,
        contentWidth + (borderPadding * 2),
        pageHeight - (margin.top + margin.bottom) + (borderPadding * 2),
        'S'
      );

      // Add logo and header - adjusted to be inside new border with improved size and positioning
      const municipalLogoHeight = 25;
      const municipalLogoWidth = 50;
      const municipalLogoX = margin.left - 8; // Moved left by 8mm
      const municipalLogoY = margin.top - 8; // Moved up further by 3mm (from -5 to -8)

      // Add municipal logo with production-safe error handling
      try {
        // Use preloaded image if available, otherwise try direct approach
        let imageSource = preloadedLogos.municipal || logoImage;
        
        // Try direct image addition first
        doc.addImage({
          imageData: imageSource,
          format: 'PNG',  // Changed from JPEG to PNG for consistency
          x: municipalLogoX,
          y: municipalLogoY,
          width: municipalLogoWidth,
          height: municipalLogoHeight,
          compression: 'MEDIUM',
          alias: 'municipal-logo'
        });
      } catch (error) {
        console.warn('First attempt to add municipal logo failed:', error);
        try {
          // Second attempt: Try with explicit base64 handling
          // Create an Image element to load the image
          const img = new Image();
          img.crossOrigin = 'Anonymous'; // Handle CORS issues
          
          // Convert the image to a data URL using a canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set image source to logoImage (which might be a URL or object)
          if (typeof logoImage === 'object' && logoImage !== null && 'default' in logoImage) {
            img.src = (logoImage as any).default;
          } else {
            img.src = logoImage as string;
          }
          
          // Wait for image to load and then convert to data URL
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            
            try {
              // Now add the image using the data URL
              doc.addImage({
                imageData: dataUrl,
                format: 'PNG',
                x: municipalLogoX,
                y: municipalLogoY,
                width: municipalLogoWidth,
                height: municipalLogoHeight,
                compression: 'MEDIUM',
                alias: 'municipal-logo'
              });
            } catch (thirdError) {
              console.warn('Third attempt to add municipal logo failed:', thirdError);
              // Final fallback - text placeholder
              createMunicipalLogoPlaceholder();
            }
          };
          
          // Handle image loading errors
          img.onerror = () => {
            console.warn('Municipal image loading failed');
            createMunicipalLogoPlaceholder();
          };
        } catch (secondError) {
          console.warn('Second attempt to add municipal logo failed:', secondError);
          createMunicipalLogoPlaceholder();
        }
      }
      
      // Helper function to create a placeholder for failed municipal logo loading
      function createMunicipalLogoPlaceholder() {
        // Draw a styled placeholder as last resort
        doc.setDrawColor(0, 123, 255); // Blue border
        doc.setFillColor(240, 248, 255); // Light blue background
        doc.rect(municipalLogoX, municipalLogoY, municipalLogoWidth, municipalLogoHeight, 'FD');
        doc.setFontSize(12);
        doc.setTextColor(0, 123, 255);
        doc.text('MOHOKARE', municipalLogoX + (municipalLogoWidth/2), municipalLogoY + (municipalLogoHeight/2), { align: 'center' });
      }
      
      // Municipality details - adjusted right position
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('MOHOKARE LOCAL MUNICIPALITY', pageWidth - (margin.right - 5), margin.top + 1, { align: 'right' });
      
      // Contact details with reduced spacing - adjusted right position
      doc.setFontSize(6);
      doc.text('1 Hoofd Street, Zastron 9950', pageWidth - (margin.right - 5), margin.top + 6, { align: 'right' });
      doc.text('Tel: (051) 673 9600', pageWidth - (margin.right - 5), margin.top + 9, { align: 'right' });
      doc.text('Fax: (051) 673 1550', pageWidth - (margin.right - 5), margin.top + 12, { align: 'right' });
      doc.text('Vat No.: 4000846412', pageWidth - (margin.right - 5), margin.top + 15, { align: 'right' });

      // Adjusted horizontal line position - moved up further
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, margin.top + 17, pageWidth - (margin.right - 6), margin.top + 17);

      // Add statement heading - perfectly centered between lines
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold'); // Changed to bold
      doc.text('TAX INVOICE/ STATEMENT OF ACCOUNT', pageWidth / 2, margin.top + 23, { align: 'center' });

      // Add first horizontal line with bold width
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, margin.top + 17, pageWidth - (margin.right - 6), margin.top + 17);

      // Add statement heading - perfectly centered between lines
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE/ STATEMENT OF ACCOUNT', pageWidth / 2, margin.top + 23, { align: 'center' });

      // Add second horizontal line with same bold width
      doc.line(margin.left - 6, margin.top + 29, pageWidth - (margin.right - 6), margin.top + 29);

      // Reset line width for other content
      doc.setLineWidth(0.1);

      // Adjust starting position for customer information to follow new heading position
      let currentY = margin.top + 33; // Moved up from 35

      // Add customer information section
      doc.setFontSize(8); // Decreased base font size from 9 to 8
      doc.setFont('helvetica', 'normal'); // Normal weight for all text
      
      // Left column headers - adjusted right
      doc.text('Account Number:', margin.left - 5, currentY);
      doc.text('Consumer Name:', margin.left - 5, currentY + 4);
      doc.text('Postal Address:', margin.left - 5, currentY + 8);
      doc.text('Postal Code:', margin.left - 5, currentY + 12);

      // Right column headers - adjusted right
      doc.text('Account Date:', pageWidth / 2 - 10, currentY);
      doc.text('Tax Invoice No.:', pageWidth / 2 - 10, currentY + 4);
      doc.text('VAT Registration No.:', pageWidth / 2 - 10, currentY + 8);
      doc.text('ERF Number:', pageWidth / 2 - 10, currentY + 12);
      doc.text('Property Value:', pageWidth / 2 - 10, currentY + 16);
      doc.text('Street Address:', pageWidth / 2 - 10, currentY + 20);
      doc.text('Town:', pageWidth / 2 - 10, currentY + 24);
      
      // Left column values (position maintained)
      doc.text(customerData.accountNumber || '', margin.left + 23, currentY);
      doc.text(customerData.accountHolderName || '', margin.left + 23, currentY + 4);
      // Use the postal address fields from Firestore
      const postalAddress = [
        customerData.postalAddress1,
        customerData.postalAddress2,
        customerData.postalAddress3
      ].filter(Boolean).join(', ');
      doc.text(postalAddress || 'No postal address', margin.left + 23, currentY + 8);
      doc.text(customerData.postalCode?.toString() || '', margin.left + 23, currentY + 12);

      // Generate tax invoice number (YYYY/MM/AccountNumber)
      // Calculate the last day of the selected month
      const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const statementDate = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth}`; // Dynamic date based on selected month/year
      const taxInvoiceNo = `${year}/${month}/${customerData.accountNumber}`;

      // Right column values (position maintained)
      const rightX = pageWidth / 2;
      doc.text(statementDate, rightX + 23, currentY); // Fixed date
      doc.text(taxInvoiceNo, rightX + 23, currentY + 4);
      doc.text(customerData.vatRegNumber || 'N/A', rightX + 23, currentY + 8);
      doc.text(customerData.erfNumber || '', rightX + 23, currentY + 12);
      doc.text(`R ${customerData.valuation?.toFixed(2) || '0.00'}`, rightX + 23, currentY + 16);
      doc.text(customerData.address || '', rightX + 23, currentY + 20);
      doc.text(customerData.address || '', rightX + 23, currentY + 24);

      // Update currentY to reflect the end of customer info section
      currentY += 29;

      // Add horizontal line before METER READINGS - bold and long
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY, pageWidth - (margin.right - 6), currentY);

      // Add METER READINGS heading with bold font
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('METER READINGS', pageWidth / 2, currentY + 4, { align: 'center' });

      // Add second horizontal line - matching length and boldness of top line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY + 6, pageWidth - (margin.right - 6), currentY + 6);

      // Reset line width for table and set smaller font for table content
      doc.setLineWidth(0.1);
      doc.setFont('helvetica', 'normal'); // Reset font to normal for table content

      // Fetch meter readings for the customer using account number
      console.log('Fetching meter readings for customer:', customerData.accountNumber);
      const meterReadings = await getMeterReadingsForCustomer(customerData.accountNumber);
      console.log('Meter readings:', meterReadings);

      // Configure meter readings table with same styling as before
      const meterTableOptions = {
        startY: currentY + 8,
        head: [['METER NO.', 'METER TYPE', 'OLD READING', 'NEW READING', 'CONSUMPTION', 'LEVIED AMOUNT']],
        body: meterReadings && meterReadings.length > 0 ? meterReadings.map(reading => {
          console.log('Processing reading for display:', reading);
          return [
            reading.MeterNumber || '',
            reading.MeterType || '',
            reading.PrevRead?.toFixed(2) || '0.00',
            reading.CurrRead?.toFixed(2) || '0.00',
            reading.Consumption?.toFixed(2) || '0.00',
            `R ${reading.TotLevied?.toFixed(2) || '0.00'}`
          ];
        }) : [['0', 'N/A', '0.00', '0.00', '0.00', 'R 0.00']],
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          textColor: [0, 0, 0],
          fontStyle: 'normal',
          minCellHeight: 2
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',  // Made headers bold
          fontSize: 7.5,
          cellPadding: 1,
          minCellHeight: 2
        },
        margin: { left: margin.left - 6, right: margin.right - 6 },
        tableWidth: pageWidth - (margin.left - 6) - (margin.right - 6),
      };

      // Add the meter readings table
      doc.autoTable(meterTableOptions);

      // Update currentY position after the meter readings table
      currentY = doc.lastAutoTable.finalY + 2;

      // Add horizontal line before ACCOUNT DETAILS
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY, pageWidth - (margin.right - 6), currentY);

      // Add ACCOUNT DETAILS heading
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ACCOUNT DETAILS', pageWidth / 2, currentY + 4, { align: 'center' });

      // Add second horizontal line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY + 6, pageWidth - (margin.right - 6), currentY + 6);

      // Update currentY for the table
      currentY += 7;

      // Calculate opening balance from aging analysis totals
      const agedAnalysis = customerData.agingAnalysis;
      const aging120Plus = agedAnalysis?.days120 || customerData.aging120Days || 0;
      const aging90 = agedAnalysis?.days90 || customerData.aging90Days || 0;
      const aging60 = agedAnalysis?.days60 || customerData.aging60Days || 0;
      const aging30 = agedAnalysis?.days30 || customerData.aging30Days || 0;
      
      // Sum up all aging totals for opening balance
      const calculatedOpeningBalance = aging120Plus + aging90 + aging60 + aging30;
      
      console.log('\n=== OPENING BALANCE CALCULATION ===');
      console.log('120+ Days:', aging120Plus);
      console.log('90 Days:', aging90);
      console.log('60 Days:', aging60);
      console.log('30 Days:', aging30);
      console.log('Calculated Opening Balance:', calculatedOpeningBalance);
      console.log('Original Outstanding Balance:', customerData.outstandingBalance);
      console.log('Total Outstanding Balance:', customerData.outstandingTotalBalance);
      console.log('=== END OPENING BALANCE CALCULATION ===\n');
      
      // Always use the calculated opening balance from aging analysis totals
      // Do not fall back to total outstanding balance to avoid confusion
      const openingBalance = calculatedOpeningBalance;
      
      console.log('Final Opening Balance used:', openingBalance);

      // Configure account details table with real data
      const accountTableOptions = {
        startY: currentY,
        head: [['DATE', 'CODE', 'DESCRIPTION', 'UNITS', 'TARIFF', 'VALUE']],
        body: [
          [{ content: `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`, styles: { cellPadding: 0.3 } }, 
           { content: '', styles: { cellPadding: 0.3 } }, 
           { content: 'OPENING BALANCE', styles: { cellPadding: 0.3 } }, 
           { content: '', styles: { cellPadding: 0.3 } }, 
           { content: '', styles: { cellPadding: 0.3 } }, 
           { content: `R ${openingBalance.toFixed(2)}`, styles: { cellPadding: 0.3, halign: 'left' } }],
          ...(await getDetailedLeviedForCustomer(accountNumber, year, month)).map(item => [
            { content: `${year}-${month.padStart(2, '0')}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`, styles: { cellPadding: 0.3 } },
            { content: item.code || '', styles: { cellPadding: 0.3 } },
            { content: item.description || '', styles: { cellPadding: 0.3 } },
            { content: item.units?.toString() || '', styles: { cellPadding: 0.3 } },
            { content: item.tariff?.toString() || '', styles: { cellPadding: 0.3 } },
            { content: `R ${item.value?.toFixed(2) || '0.00'}`, styles: { cellPadding: 0.3, halign: 'left' } }
          ])
        ],
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          textColor: [0, 0, 0]
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',  // Made headers bold
          fontSize: 7.5,
          cellPadding: 1
        },
        margin: { left: margin.left - 6, right: margin.right - 6 },
        tableWidth: pageWidth - (margin.left - 6) - (margin.right - 6),
      };

      // Add the account details table
      doc.autoTable(accountTableOptions);
      currentY = (doc as any).lastAutoTable.finalY + 2;

      // Use the aging analysis data already fetched in customerData
      console.log('\n=== PDF GENERATION AGING ANALYSIS DEBUG ===');
      console.log('customerData.agingAnalysis:', customerData.agingAnalysis);
      console.log('customerData.aging120Days:', customerData.aging120Days);
      console.log('customerData.aging90Days:', customerData.aging90Days);
      console.log('customerData.aging60Days:', customerData.aging60Days);
      console.log('customerData.aging30Days:', customerData.aging30Days);
      console.log('customerData.agingCurrent:', customerData.agingCurrent);
      console.log('customerData.closingBalance (from balance reports):', customerData.closingBalance);
      
      const agingAnalysisData = customerData.agingAnalysis;
      const closingBalance = customerData.closingBalance;

      // Use the aging data directly from customerData (already formatted)
      const days120Plus = agingAnalysisData?.days120?.toFixed(2) || customerData.aging120Days?.toFixed(2) || '0.00';
      const days90 = agingAnalysisData?.days90?.toFixed(2) || customerData.aging90Days?.toFixed(2) || '0.00';
      const days60 = agingAnalysisData?.days60?.toFixed(2) || customerData.aging60Days?.toFixed(2) || '0.00';
      const days30 = agingAnalysisData?.days30?.toFixed(2) || customerData.aging30Days?.toFixed(2) || '0.00';
      const current = agingAnalysisData?.current?.toFixed(2) || customerData.agingCurrent?.toFixed(2) || '0.00';
      const closingBalanceFormatted = closingBalance?.toFixed(2) || '0.00';
      
      console.log('Final aging analysis values for PDF:', { days120Plus, days90, days60, days30, current, closingBalanceFormatted });
      console.log('=== END AGING ANALYSIS DEBUG ===\n');

      // Configure aging analysis table
      const agingTableOptions = {
        startY: currentY,
        head: [['120+ DAYS', '90 DAYS', '60 DAYS', '30 DAYS', 'CURRENT', 'CLOSING BALANCE']],
        body: [[
          { content: `R ${days120Plus}`, styles: { cellPadding: 1 } },
          { content: `R ${days90}`, styles: { cellPadding: 1 } },
          { content: `R ${days60}`, styles: { cellPadding: 1 } },
          { content: `R ${days30}`, styles: { cellPadding: 1 } },
          { content: `R ${current}`, styles: { cellPadding: 1 } },
          { content: `R ${closingBalanceFormatted}`, styles: { cellPadding: 1 } }
        ]],
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1,
          lineWidth: 0.1,
          lineColor: [0, 0, 0],
          textColor: [0, 0, 0],
          halign: 'center'  // Center-align all content
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',  // Make headers bold
          fontSize: 7.5,
          cellPadding: 1,
          halign: 'center'  // Center-align headers
        },
        columnStyles: {
          0: { cellWidth: 30 },  // 120+ DAYS
          1: { cellWidth: 30 },  // 90 DAYS
          2: { cellWidth: 30 },  // 60 DAYS
          3: { cellWidth: 30 },  // 30 DAYS
          4: { cellWidth: 30 },  // CURRENT
          5: { cellWidth: 35 }   // CLOSING BALANCE (slightly wider)
        },
        margin: { left: margin.left - 6, right: margin.right - 6 },
        tableWidth: pageWidth - (margin.left - 6) - (margin.right - 6),
      };

      // Add the aging analysis table
      doc.autoTable(agingTableOptions);
      currentY = (doc as any).lastAutoTable.finalY + 1;

      // Add first dividing line
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY, pageWidth - (margin.right - 6), currentY);

      // Add second dividing line - reduced spacing between lines
      currentY += 1; // Reduced from 2
      doc.setLineWidth(0.5);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY, pageWidth - (margin.right - 6), currentY);

      currentY += 5; // Reduced from 10

      // Add columns for remittance and banking details
      const columnWidth = (pageWidth - 2 * margin.left - 15) / 2;
      const leftColumnX = margin.left + 5;
      const rightColumnX = margin.left + columnWidth + 15;

      // Add REMITTANCE ADVICE heading
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('REMITTANCE ADVICE', leftColumnX, currentY + 4); // Reduced from +8

      // Add BANKING DETAILS heading
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('BANKING DETAILS', rightColumnX, currentY + 4); // Reduced from +8

      // Reset font for details
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      // Update currentY for detail rows (reduced spacing)
      currentY += 2; // Reduced from 6

      // Helper function to draw detail rows
      const drawDetailRow = (x: number, y: number, label: string, value: string) => {
        const cellHeight = 4;
        doc.setFillColor(240, 240, 240);
        
        // Calculate positions
        const labelX = x + 2;
        const maxLabelWidth = doc.getTextWidth('TOTAL DUE ON OR BEFORE:');
        const valueX = labelX + maxLabelWidth + 3;
        
        // Draw background only up to the colon
        doc.rect(x, y, maxLabelWidth + 4, cellHeight, 'F');
        
        // Draw the label and value
        doc.setFont('helvetica', 'normal');
        doc.text(label, labelX, y + 3);
        doc.text(value, valueX, y + 3);
      };

      // Calculate due date based on statement period (last day of the statement month)
      const statementYear = parseInt(year);
      const statementMonth = parseInt(month);
      const lastDayOfStatementMonth = new Date(statementYear, statementMonth, 0).getDate();
      const dueDate = `${year}-${month.padStart(2, '0')}-${lastDayOfStatementMonth.toString().padStart(2, '0')}`;
      
      // Draw remittance advice details
      drawDetailRow(leftColumnX, currentY + 4, 'ACCOUNT NUMBER:', customerData.accountNumber || '');
      drawDetailRow(leftColumnX, currentY + 8, 'CONSUMER NAME:', customerData.accountHolderName || '');
      drawDetailRow(leftColumnX, currentY + 12, 'TOTAL DUE:', `R ${closingBalanceFormatted}`);
      drawDetailRow(leftColumnX, currentY + 16, 'TOTAL DUE ON OR BEFORE:', dueDate);

      // Draw banking details with consistent alignment
      const drawBankingDetailRow = (x: number, y: number, label: string, value: string) => {
        const cellHeight = 4;
        doc.setFillColor(240, 240, 240);
        
        const labelX = x + 2;
        const maxLabelWidth = doc.getTextWidth('ACCOUNT NUMBER:');
        const valueX = labelX + maxLabelWidth + 3;
        
        // Draw background only up to the colon
        doc.rect(x, y, maxLabelWidth + 4, cellHeight, 'F');
        
        // Draw label and value
        doc.setFont('helvetica', 'normal');
        doc.text(label, labelX, y + 3);
        doc.text(value, valueX, y + 3);
      };

      // Draw banking details
      drawBankingDetailRow(rightColumnX, currentY + 4, 'BANK NAME:', 'ABSA');
      drawBankingDetailRow(rightColumnX, currentY + 8, 'ACCOUNT NAME:', 'Mohokare Local Municipality');
      drawBankingDetailRow(rightColumnX, currentY + 12, 'ACCOUNT NUMBER:', '4052654487');
      drawBankingDetailRow(rightColumnX, currentY + 16, 'BRANCH CODE:', '250655');
      drawBankingDetailRow(rightColumnX, currentY + 20, 'REFERENCE:', customerData.accountNumber || '');

      currentY += 30;

      // Add dividing line before bank logos
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.line(margin.left - 6, currentY, pageWidth - (margin.right - 6), currentY);

      currentY += 10;

      // Add heading for bank logos
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Click on the LOGO below to go to the banking page and settle your account', pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 8;

      // Add bank logos
      const bankLogos = [
        { src: absaLogo, x: 60, width: 10, url: 'https://www.absa.co.za/personal/' },
        { src: fnbLogo, x: 73, width: 10, url: 'https://www.fnb.co.za/' },
        { src: nedbankLogo, x: 86, width: 10, url: 'https://personal.nedbank.co.za/home.html' },
        { src: standardBankLogo, x: 99, width: 10, url: 'https://www.standardbank.co.za/southafrica/personal' },
        { src: capitecLogo, x: 112, width: 10, url: 'https://www.capitecbank.co.za/' },
        { src: africanBankLogo, x: 125, width: 10, url: 'https://ib.africanbank.co.za/' },
        { src: postOfficeLogo, x: 138, width: 10, url: 'https://www.postoffice.co.za/' }
      ];

      // Safely add bank logos with error handling
      for (const logo of bankLogos) {
        try {
          // Add clickable link area
          doc.link(logo.x, currentY, logo.width, 7, { url: logo.url });
          
          // Production-safe image handling
          // Use preloaded image if available, otherwise try direct approach
          let imageSource;
          
          // Determine which preloaded logo to use based on URL
          if (logo.url.includes('absa')) {
            imageSource = preloadedLogos.absa;
          } else if (logo.url.includes('fnb')) {
            imageSource = preloadedLogos.fnb;
          } else if (logo.url.includes('nedbank')) {
            imageSource = preloadedLogos.nedbank;
          } else if (logo.url.includes('standard')) {
            imageSource = preloadedLogos.standardBank;
          } else if (logo.url.includes('capitec')) {
            imageSource = preloadedLogos.capitec;
          } else if (logo.url.includes('african')) {
            imageSource = preloadedLogos.africanBank;
          } else if (logo.url.includes('postoffice')) {
            imageSource = preloadedLogos.postOffice;
          }
          
          // Fall back to original source if preloaded version isn't available
          imageSource = imageSource || logo.src;
          
          // Try direct image addition first
          doc.addImage(
            imageSource,
            'PNG',
            logo.x,
            currentY,
            logo.width,
            7
          );
        } catch (error) {
          console.warn(`First attempt to add bank logo for ${logo.url} failed:`, error);
          try {
            // Second attempt: Try with explicit base64 handling
            // Create an Image element to load the image
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Handle CORS issues
            
            // Convert the image to a data URL using a canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set image source to logo.src (which might be a URL or object)
            if (typeof logo.src === 'object' && logo.src !== null && 'default' in logo.src) {
              img.src = (logo.src as any).default;
            } else {
              img.src = logo.src as string;
            }
            
            // Wait for image to load and then convert to data URL
            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              
              try {
                // Now add the image using the data URL
                doc.addImage(
                  dataUrl,
                  'PNG',
                  logo.x,
                  currentY,
                  logo.width,
                  7
                );
              } catch (thirdError) {
                console.warn(`Third attempt failed for ${logo.url}:`, thirdError);
                // Final fallback - text placeholder
                createLogoPlaceholder(logo);
              }
            };
            
            // Handle image loading errors
            img.onerror = () => {
              console.warn(`Image loading failed for ${logo.url}`);
              createLogoPlaceholder(logo);
            };
          } catch (secondError) {
            console.warn(`Second attempt failed for ${logo.url}:`, secondError);
            createLogoPlaceholder(logo);
          }
        }
      }
      
      // Helper function to create a placeholder for failed logo loading
      function createLogoPlaceholder(logo: any) {
        // Draw a styled placeholder as last resort
        doc.setDrawColor(0, 123, 255); // Blue border
        doc.setFillColor(240, 248, 255); // Light blue background
        doc.rect(logo.x, currentY, logo.width, 7, 'FD');
        doc.setFontSize(6);
        doc.setTextColor(0, 123, 255);
        const bankName = logo.url.includes('absa') ? 'ABSA' : 
                       logo.url.includes('capitec') ? 'CAPITEC' : 
                       logo.url.includes('fnb') ? 'FNB' : 
                       logo.url.includes('nedbank') ? 'NEDBANK' : 
                       logo.url.includes('standard') ? 'STANDARD' : 
                       logo.url.includes('african') ? 'AFRICAN' : 
                       logo.url.includes('postoffice') ? 'POST' : 'BANK';
        doc.text(bankName, logo.x + (logo.width/2), currentY + 3.5, { align: 'center' });
      }

      currentY += 10;

      // Add dividing line after bank logos
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.line(margin.left + 5, currentY, pageWidth - (margin.right + 5), currentY);
      currentY += 5;

      // Add YeboPay heading
      doc.setFontSize(7); // Reduced from 8
      doc.setFont('helvetica', 'bold');
      doc.text('Alternatively, you can click on the YeboPay LOGO to manage your account and make payment arrangement',
        pageWidth / 2, currentY, { align: 'center' });

      currentY += 8;

      // Add YeboPay logo with payment link
      const yeboPayLogoHeight = 8; // Reduced from 10
      const yeboPayLogoWidth = 24; // Reduced from 30
      const yeboPayLogoX = (pageWidth - yeboPayLogoWidth) / 2;
      const yeboPayLogoY = currentY;

      // Create a special URL that will be intercepted by our application
      // This URL will work in the downloaded PDF and can be handled when clicked
      // Ensure we have a valid amount by checking both outstandingBalance and outstandingTotalBalance
      const outstandingAmount = customerData.outstandingBalance || customerData.outstandingTotalBalance || 0;
      // Format the amount properly to ensure it's passed correctly as a string
      const formattedAmount = typeof outstandingAmount === 'number' ? outstandingAmount.toString() : outstandingAmount;
      
      const paymentUrl = `${window.location.origin}/yebopay-payment/${encodeURIComponent(customerData.accountNumber)}/${encodeURIComponent(customerData.accountHolderName)}/${encodeURIComponent(formattedAmount)}`;
      
      // Add clickable link to the logo
      doc.link(yeboPayLogoX, yeboPayLogoY, yeboPayLogoWidth, yeboPayLogoHeight, { url: paymentUrl });

      // Add YeboPay logo with production-safe error handling
      try {
        // Use preloaded image if available, otherwise try direct approach
        let imageSource = preloadedLogos.yebopay || yebopayLogo;
        
        // Try direct image addition first
        doc.addImage(
          imageSource,
          'PNG',
          yeboPayLogoX,
          yeboPayLogoY,
          yeboPayLogoWidth,
          yeboPayLogoHeight
        );
      } catch (error) {
        console.warn('First attempt to add YeboPay logo failed:', error);
        try {
          // Second attempt: Try with explicit base64 handling
          // Create an Image element to load the image
          const img = new Image();
          img.crossOrigin = 'Anonymous'; // Handle CORS issues
          
          // Convert the image to a data URL using a canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set image source to yebopayLogo (which might be a URL or object)
          if (typeof yebopayLogo === 'object' && yebopayLogo !== null && 'default' in yebopayLogo) {
            img.src = (yebopayLogo as any).default;
          } else {
            img.src = yebopayLogo as string;
          }
          
          // Wait for image to load and then convert to data URL
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            
            try {
              // Now add the image using the data URL
              doc.addImage(
                dataUrl,
                'PNG',
                yeboPayLogoX,
                yeboPayLogoY,
                yeboPayLogoWidth,
                yeboPayLogoHeight
              );
            } catch (thirdError) {
              console.warn('Third attempt to add YeboPay logo failed:', thirdError);
              // Final fallback - text placeholder
              createYeboPayPlaceholder();
            }
          };
          
          // Handle image loading errors
          img.onerror = () => {
            console.warn('YeboPay image loading failed');
            createYeboPayPlaceholder();
          };
        } catch (secondError) {
          console.warn('Second attempt to add YeboPay logo failed:', secondError);
          createYeboPayPlaceholder();
        }
      }
      
      // Helper function to create a placeholder for failed YeboPay logo loading
      function createYeboPayPlaceholder() {
        // Draw a styled placeholder as last resort
        doc.setDrawColor(0, 123, 255); // Blue border
        doc.setFillColor(240, 248, 255); // Light blue background
        doc.rect(yeboPayLogoX, yeboPayLogoY, yeboPayLogoWidth, yeboPayLogoHeight, 'FD');
        doc.setFontSize(10);
        doc.setTextColor(0, 123, 255);
        doc.text('YeboPay', yeboPayLogoX + (yeboPayLogoWidth/2), yeboPayLogoY + (yeboPayLogoHeight/2), { align: 'center' });
      }

      currentY += yeboPayLogoHeight + 3; // Reduced spacing after logo from 5 to 3

      // Add dividing line after YeboPay section
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.line(margin.left + 5, currentY, pageWidth - (margin.right + 5), currentY);
      currentY += 5;

      // Add disclaimer text
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      
      // First line of disclaimer
      const disclaimer1 = 'Mohokare Municipality has gone digital, and you can now access your municipal statement, submit your meter reading online, and lodge';
      doc.text(disclaimer1, pageWidth / 2, currentY, { align: 'center' });
      currentY += 3;

      // Second line with link
      const disclaimer2Start = 'complaints anytime, any day, 24/7. To find out more, click on the link ';
      const linkText = ' www.consumerportal.co.za ';
      const disclaimer2End = ' to register and access your statement.';

      // Calculate positions for text and link
      const textWidth = doc.getTextWidth(disclaimer2Start + linkText + disclaimer2End);
      const disclaimerStartX = (pageWidth - textWidth) / 2;
      let currentX = disclaimerStartX;

      // Add first part of text
      doc.text(disclaimer2Start, currentX, currentY);
      currentX += doc.getTextWidth(disclaimer2Start);

      // Add link in blue
      doc.setTextColor(0, 0, 255);
      doc.text(linkText, currentX, currentY);
      doc.link(currentX, currentY - 2, doc.getTextWidth(linkText), 3, { url: 'https://consumerportal.co.za' });
      currentX += doc.getTextWidth(linkText);

      // Add final part of text
      doc.setTextColor(0, 0, 0);
      doc.text(disclaimer2End, currentX, currentY);
      
      currentY += 5;

      // Add final dividing line
      doc.setLineWidth(0.3);
      doc.setDrawColor(0);
      doc.line(margin.left + 5, currentY, pageWidth - (margin.right + 5), currentY);

      // Convert the PDF to a blob and trigger download
      const pdfBlob = doc.output('blob');
      const filename = `Statement_${customerData.accountNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Create a link element and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('Statement generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Re-throw the error so calling components can handle it
      throw error;
    }
  };

  render() {
    return (
      <>
        <PaymentGateway
          isOpen={this.state.isPaymentModalOpen}
          onClose={() => this.setState({ isPaymentModalOpen: false })}
          customerName={this.state.currentCustomer?.name || ''}
          outstandingAmount={this.state.currentCustomer?.amount || 0}
          accountNumber={this.state.currentCustomer?.accountNumber || ''}
        />
      </>
    );
  }
}

// Export both the component and the generate function
export { StatementGenerator as default, StatementGenerator };
export const generateStatement = async (input: string | CustomerInput): Promise<void> => {
  // Create a temporary instance of StatementGenerator to use its generateStatement method
  const tempElement = document.createElement('div');
  const root = createRoot(tempElement);
  let component: StatementGenerator | null = null;
  
  return new Promise((resolve, reject) => {
    root.render(
      <StatementGenerator ref={(ref) => { component = ref; }} />
    );

    // Wait for next tick to ensure component is mounted
    setTimeout(async () => {
      if (component) {
        try {
          await component.generateStatement(input);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          root.unmount();
        }
      } else {
        reject(new Error('Failed to create StatementGenerator component'));
      }
    }, 0);
  });
};