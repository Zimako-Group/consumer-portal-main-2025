import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { StatementDistribution } from '../types/statements';

interface PDFGeneratorOptions {
  companyName: string;
  companyLogo?: string;
  watermarkText?: string;
}

export class PDFGenerator {
  private pdf: jsPDF;
  private readonly options: PDFGeneratorOptions;
  private currentPage: number = 1;
  private totalPages: number = 1;
  private readonly margins = {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  };

  constructor(options: PDFGeneratorOptions) {
    this.options = options;
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set default font
    this.pdf.setFont('helvetica');
  }

  private async addHeader(statementDate: Date, statementId: string): Promise<void> {
    const { pdf } = this;
    
    // Add company logo if provided
    if (this.options.companyLogo) {
      pdf.addImage(this.options.companyLogo, 'PNG', 20, 20, 40, 20);
    }

    // Company name
    pdf.setFontSize(24);
    pdf.setTextColor(44, 62, 80);
    pdf.text(this.options.companyName, 70, 30);

    // Statement info
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Statement Period: ${format(statementDate, 'MMMM yyyy')}`, 70, 40);
    pdf.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 70, 45);
    pdf.text(`Statement ID: ${statementId}`, 70, 50);

    // Add watermark if provided
    if (this.options.watermarkText) {
      pdf.setTextColor(230, 230, 230);
      pdf.setFontSize(60);
      pdf.text(this.options.watermarkText, 105, 150, {
        align: 'center',
        angle: 45
      });
    }

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
  }

  private addExecutiveSummary(data: StatementDistribution): void {
    const { pdf } = this;
    const startY = 70;

    // Section title
    pdf.setFontSize(18);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Executive Summary', 20, startY);

    // Key metrics
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);

    const metrics = [
      ['Total Messages Sent', (data.smsSent + data.emailsSent + data.whatsappSent).toString()],
      ['SMS Messages', data.smsSent.toString()],
      ['Email Messages', data.emailsSent.toString()],
      ['WhatsApp Messages', data.whatsappSent.toString()]
    ];

    pdf.autoTable({
      startY: startY + 10,
      head: [['Metric', 'Value']],
      body: metrics,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: {
        fillColor: [44, 62, 80],
        textColor: [255, 255, 255]
      },
      margin: { left: 20 }
    });
  }

  private addDistributionGraph(data: StatementDistribution): void {
    const { pdf } = this;
    const startY = 150;
    const graphWidth = 170;
    const graphHeight = 60;

    // Graph title
    pdf.setFontSize(14);
    pdf.setTextColor(44, 62, 80);
    pdf.text('Distribution Channels Breakdown', 20, startY);

    // Calculate percentages
    const total = data.smsSent + data.emailsSent + data.whatsappSent;
    const smsWidth = (data.smsSent / total) * graphWidth;
    const emailWidth = (data.emailsSent / total) * graphWidth;
    const whatsappWidth = (data.whatsappSent / total) * graphWidth;

    // Draw bars
    pdf.setFillColor(52, 152, 219); // Blue for SMS
    pdf.rect(20, startY + 10, smsWidth, 20, 'F');
    
    pdf.setFillColor(46, 204, 113); // Green for Email
    pdf.rect(20 + smsWidth, startY + 10, emailWidth, 20, 'F');
    
    pdf.setFillColor(155, 89, 182); // Purple for WhatsApp
    pdf.rect(20 + smsWidth + emailWidth, startY + 10, whatsappWidth, 20, 'F');

    // Add labels
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`SMS (${Math.round((data.smsSent / total) * 100)}%)`, 20, startY + 40);
    pdf.text(`Email (${Math.round((data.emailsSent / total) * 100)}%)`, 20 + smsWidth, startY + 40);
    pdf.text(`WhatsApp (${Math.round((data.whatsappSent / total) * 100)}%)`, 20 + smsWidth + emailWidth, startY + 40);
  }

  private addFooter(): void {
    const { pdf } = this;
    const pageWidth = pdf.internal.pageSize.width;
    
    // Add page numbers
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(
      `Page ${this.currentPage} of ${this.totalPages}`,
      pageWidth / 2,
      pdf.internal.pageSize.height - 10,
      { align: 'center' }
    );

    // Add disclaimer
    pdf.setFontSize(8);
    pdf.text(
      'This is an automatically generated report. For any queries, please contact support.',
      20,
      pdf.internal.pageSize.height - 15
    );
  }

  public async generateMonthlyReport(data: StatementDistribution): Promise<Blob> {
    // Reset PDF instance
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Generate unique statement ID
    const statementId = `STM-${format(data.month, 'yyyyMM')}-${Math.random().toString(36).substr(2, 9)}`;

    // Add header
    await this.addHeader(data.month, statementId);

    // Add executive summary
    this.addExecutiveSummary(data);

    // Add distribution graph
    this.addDistributionGraph(data);

    // Add footer
    this.addFooter();

    // Return PDF as blob
    return this.pdf.output('blob');
  }
}

export const createPDFGenerator = (options: PDFGeneratorOptions): PDFGenerator => {
  return new PDFGenerator(options);
};
