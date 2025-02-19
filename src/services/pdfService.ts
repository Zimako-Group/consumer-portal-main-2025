import PDFDocument from 'pdfkit';
import { CustomerData } from './customerService';

export const generateCustomerPDF = async (customer: CustomerData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        },
        info: {
          Title: `Customer Statement - ${customer.accountHolderName}`,
          Author: 'Mohokare Municipality',
          Subject: 'Customer Statement'
        }
      });

      // Stream to create PDF
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        try {
          const result = Buffer.concat(chunks);
          const blob = new Blob([result], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          window.open(url);
          resolve(url);
        } catch (error) {
          reject(error);
        }
      });

      // Add header without logo for now
      doc.fillColor('#ff6b00')
         .fontSize(24)
         .text('Mohokare Municipality', 50, 50, { align: 'center' })
         .fontSize(14)
         .fillColor('#666666')
         .text('A Performance Driven Municipality', 50, 80, { align: 'center' });

      // Add horizontal line
      doc.strokeColor('#ff6b00')
         .lineWidth(2)
         .moveTo(50, 100)
         .lineTo(545, 100)
         .stroke();

      // Statement Title
      doc.moveDown()
         .fontSize(20)
         .fillColor('#333333')
         .text('Customer Statement', { align: 'center' })
         .moveDown();

      // Customer Information Section
      doc.fontSize(16)
         .fillColor('#333333')
         .text('Customer Information', { underline: true });

      doc.moveDown()
         .fontSize(12)
         .fillColor('#666666');

      const customerInfo = [
        { label: 'Account Holder:', value: customer.accountHolderName },
        { label: 'Account Number:', value: customer.accountNumber },
        { label: 'ID Number:', value: customer.idNumber },
        { label: 'Email:', value: customer.emailAddress || 'N/A' },
        { label: 'Phone:', value: customer.cellNumber || 'N/A' },
        { label: 'Postal Address:', value: [customer.postalAddress1, customer.postalAddress2, customer.postalAddress3, customer.postalCode].filter(Boolean).join(', ') },
        { label: 'Street Address:', value: customer.streetAddress || 'N/A' },
        { label: 'Town:', value: customer.town || 'N/A' },
        { label: 'Suburb:', value: customer.suburb || 'N/A' },
        { label: 'Ward:', value: customer.ward || 'N/A' }
      ];

      customerInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, { continued: false });
        doc.moveDown(0.5);
      });

      // Account Details Section
      doc.moveDown()
         .fontSize(16)
         .fillColor('#333333')
         .text('Account Details', { underline: true });

      doc.moveDown()
         .fontSize(12)
         .fillColor('#666666');

      const accountInfo = [
        { label: 'Account Type:', value: customer.accountType || 'N/A' },
        { label: 'Account Status:', value: customer.accountStatus || 'N/A' },
        { label: 'Owner Category:', value: customer.ownerCategory || 'N/A' },
        { label: 'Property Category:', value: customer.propertyCategory || 'N/A' },
        { label: 'ERF Number:', value: customer.erfNumber || 'N/A' },
        { label: 'Valuation:', value: customer.valuation || 'N/A' },
        { label: 'Indigent Status:', value: customer.indigent || 'N/A' },
        { label: 'Pensioner Status:', value: customer.pensioner || 'N/A' }
      ];

      accountInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, { continued: false });
        doc.moveDown(0.5);
      });

      // Financial Information Section
      doc.moveDown()
         .fontSize(16)
         .fillColor('#333333')
         .text('Financial Information', { underline: true });

      doc.moveDown()
         .fontSize(12)
         .fillColor('#666666');

      const financialInfo = [
        { label: 'Outstanding Balance (Capital):', value: `R ${customer.outstandingBalanceCapital?.toFixed(2) || '0.00'}` },
        { label: 'Outstanding Balance (Interest):', value: `R ${customer.outstandingBalanceInterest?.toFixed(2) || '0.00'}` },
        { label: 'Total Outstanding Balance:', value: `R ${customer.outstandingTotalBalance?.toFixed(2) || '0.00'}` },
        { label: 'Last Payment Amount:', value: `R ${customer.lastPaymentAmount?.toFixed(2) || '0.00'}` },
        { label: 'Last Payment Date:', value: customer.lastPaymentDate || 'N/A' },
        { label: 'Agreement Type:', value: customer.agreementType || 'N/A' },
        { label: 'Agreement Outstanding:', value: customer.agreementOutstanding || 'N/A' },
        { label: 'Housing Outstanding:', value: customer.housingOutstanding || 'N/A' }
      ];

      financialInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, { continued: false });
        doc.moveDown(0.5);
      });

      // Additional Information Section
      doc.moveDown()
         .fontSize(16)
         .fillColor('#333333')
         .text('Additional Information', { underline: true });

      doc.moveDown()
         .fontSize(12)
         .fillColor('#666666');

      const additionalInfo = [
        { label: 'Credit Status:', value: customer.creditStatus || 'N/A' },
        { label: 'Credit Instruction:', value: customer.creditInstruction || 'N/A' },
        { label: 'Mailing Instruction:', value: customer.mailingInstruction || 'N/A' },
        { label: 'Hand Over Status:', value: customer.handOver || 'N/A' },
        { label: 'VAT Registration:', value: customer.vatRegNumber || 'N/A' },
        { label: 'Company/CC Number:', value: customer.companyCcNumber || 'N/A' }
      ];

      additionalInfo.forEach(info => {
        doc.text(`${info.label} ${info.value}`, { continued: false });
        doc.moveDown(0.5);
      });

      // Footer
      const date = new Date().toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc.fontSize(10)
         .fillColor('#666666')
         .text(
           `Generated on ${date}`,
           50,
           doc.page.height - 50,
           { align: 'left' }
         )
         .text(
           'Page 1 of 1',
           50,
           doc.page.height - 50,
           { align: 'right' }
         );

      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};