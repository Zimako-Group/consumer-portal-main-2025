import React from 'react';
import { generateCustomerPDF } from '../services/pdfService';
import { CustomerData } from '../services/customerService';
import { Download } from 'lucide-react';

interface GenerateCustomerPDFProps {
  customer: CustomerData;
}

const GenerateCustomerPDF: React.FC<GenerateCustomerPDFProps> = ({ customer }) => {
  // Mock usage data - replace with actual data from your system
  const mockUsageData = [
    { month: 'Jan', water: 15, electricity: 450 },
    { month: 'Feb', water: 14, electricity: 420 },
    { month: 'Mar', water: 16, electricity: 480 },
    // Add more months as needed
  ];

  const handleGeneratePDF = async () => {
    try {
      await generateCustomerPDF(customer, mockUsageData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Add error handling (e.g., toast notification)
    }
  };

  return (
    <button
      onClick={handleGeneratePDF}
      className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
    >
      <Download size={18} />
      <span>Generate Statement</span>
    </button>
  );
};

export default GenerateCustomerPDF;
