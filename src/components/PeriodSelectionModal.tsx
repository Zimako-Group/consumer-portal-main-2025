import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PeriodSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPeriodSelect: (year: string, month: string) => void;
  accountNumber: string;
}

interface PeriodOption {
  value: string;
  label: string;
  year: string;
  month: string;
}

const PeriodSelectionModal: React.FC<PeriodSelectionModalProps> = ({
  isOpen,
  onClose,
  onPeriodSelect,
  accountNumber
}) => {
  const { isDarkMode } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null);

  // Generate available periods from January 2024 to current month
  const availablePeriods = useMemo(() => {
    const periods: PeriodOption[] = [];
    const startDate = new Date(2024, 0); // January 2024
    const endDate = new Date();

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear().toString();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');

      periods.push({
        value: `${year}-${month}`,
        label: currentDate.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long'
        }),
        year,
        month
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    return periods.reverse(); // Most recent first
  }, []);

  const handleSelectPeriod = () => {
    if (selectedPeriod) {
      onPeriodSelect(selectedPeriod.year, selectedPeriod.month);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`w-full max-w-md p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Select Statement Period
          </h3>
          <button
            onClick={onClose}
            className={`p-1 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
            Account Number: <span className="font-medium">{accountNumber}</span>
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Select the period for which you want to generate a statement:
          </p>
          
          <select
            value={selectedPeriod?.value || ''}
            onChange={(e) => {
              const selected = availablePeriods.find(p => p.value === e.target.value);
              setSelectedPeriod(selected || null);
            }}
            className={`w-full p-2 border rounded-md ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            } focus:outline-none focus:ring-2 focus:ring-theme`}
          >
            <option value="" disabled>Select a period</option>
            {availablePeriods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSelectPeriod}
            disabled={!selectedPeriod}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              !selectedPeriod
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-theme text-white hover:bg-theme/90'
            }`}
          >
            Generate Statement
          </button>
        </div>
      </div>
    </div>
  );
};

export default PeriodSelectionModal;
