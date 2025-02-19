import React, { useState, useMemo } from 'react';
import { read, utils } from 'xlsx';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { uploadMeterReadings, UploadProgress } from '../services/meterReadingService';

interface MonthOption {
  value: string;
  label: string;
}

const MeterReadingsUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthOption | null>(null);

  // Generate available months from January 2024 to current month
  const availableMonths = useMemo(() => {
    const months: MonthOption[] = [];
    const startDate = new Date(2024, 0); // January 2024
    const endDate = new Date();
    
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      
      months.push({
        value: `${year}-${month}`,
        label: currentDate.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'long'
        })
      });
      currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    }
    return months.reverse(); // Most recent first
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!selectedMonth) {
        setError('Please select a month before uploading meter readings');
        return;
      }

      // The selectedMonth.value is already in YYYY-MM format
      const dateMatch = selectedMonth.value.match(/^(\d{4})-(\d{2})$/);
      if (!dateMatch) {
        setError('Invalid date format. Expected YYYY-MM');
        return;
      }

      const [_, year, month] = dateMatch;
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);

      // Validate year range
      if (yearNum < 2024) {
        setError('Year must be 2024 or later');
        return;
      }

      // Validate month range
      if (monthNum < 1 || monthNum > 12) {
        setError('Month must be between 1 and 12');
        return;
      }

      setError(null);
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) {
        throw new Error('No file selected');
      }

      console.log('Starting file processing:', {
        name: file.name,
        size: file.size,
        type: file.type,
        selectedDate: selectedMonth.value
      });

      const data = await file.arrayBuffer();
      console.log('File loaded into buffer, size:', data.byteLength);

      const workbook = read(data);
      console.log('Workbook loaded, sheets:', workbook.SheetNames);

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }

      const jsonData = utils.sheet_to_json(worksheet);
      console.log('Data parsed from Excel:', {
        rowCount: jsonData.length,
        sampleRow: jsonData[0]
      });

      if (jsonData.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      // Validate required fields in first row
      const firstRow = jsonData[0] as any;
      const requiredFields = [
        'Period', 'AccountNo', 'MeterNumber', 'PrevRead', 'CurrRead',
        'Consumption', 'TotLevied'
      ];

      const missingFields = requiredFields.filter(field => !(field in firstRow));
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Transform and validate the data
      const readings = jsonData.map((row: any, index) => {
        try {
          if (index % 100 === 0) {
            console.log(`Processing row ${index}:`, row);
          }

          const reading = {
            uploadDate: selectedMonth.value,
            Period: row.Period?.toString() || '',
            AccountNo: row.AccountNo?.toString() || '',
            AccountHolder: row.AccountHolder?.toString() || '',
            ErfNo: row.ErfNo?.toString() || '',
            Address: row.Address?.toString() || '',
            Ward: row.Ward?.toString() || '',
            Town: row.Town?.toString() || '',
            Suburb: row.Suburb?.toString() || '',
            Reservoir: row.Reservoir?.toString() || '',
            LocalAuthority: row.LocalAuthority?.toString() || '',
            MeterType: row.MeterType?.toString() || '',
            HistType: row.HistType?.toString() || '',
            MeterAlpha: row.MeterAlpha?.toString() || '',
            MeterNumber: row.MeterNumber?.toString() || '',
            Book: row.Book?.toString() || '',
            Seq: row.Seq?.toString() || '',
            Status: row.Status?.toString() || '',
            Factor: Number(row.Factor) || 0,
            AmpsPhase: row.AmpsPhase?.toString() || '',
            PrevRead: Number(row.PrevRead) || 0,
            PrevReadDate: row.PrevReadDate?.toString() || '',
            CurrRead: Number(row.CurrRead) || 0,
            CurrReadDate: row.CurrReadDate?.toString() || '',
            ReadType: row.ReadType?.toString() || '',
            Consumption: Number(row.Consumption) || 0,
            TariffCode: row.TariffCode?.toString() || '',
            Description: row.Description?.toString() || '',
            AppliesToAccountType: row.AppliesToAccountType?.toString() || '',
            ConsAmount: Number(row.ConsAmount) || 0,
            ConsRebate: Number(row.ConsRebate) || 0,
            BasicAmount: Number(row.BasicAmount) || 0,
            BasicRebate: Number(row.BasicRebate) || 0,
            SurCharge: Number(row.SurCharge) || 0,
            VATAmount: Number(row.VATAmount) || 0,
            TotLevied: Number(row.TotLevied) || 0
          };

          // Validate critical numeric fields
          if (isNaN(reading.PrevRead)) throw new Error(`Invalid PrevRead value: ${row.PrevRead}`);
          if (isNaN(reading.CurrRead)) throw new Error(`Invalid CurrRead value: ${row.CurrRead}`);
          if (isNaN(reading.Consumption)) throw new Error(`Invalid Consumption value: ${row.Consumption}`);
          if (isNaN(reading.TotLevied)) throw new Error(`Invalid TotLevied value: ${row.TotLevied}`);

          return reading;
        } catch (err) {
          throw new Error(`Error processing row ${index + 1}: ${err.message}`);
        }
      });

      console.log('Starting upload with readings:', {
        date: selectedMonth.value,
        count: readings.length,
        firstReading: readings[0],
        lastReading: readings[readings.length - 1]
      });

      await uploadMeterReadings(readings, (progress) => {
        console.log('Upload progress:', progress);
        setProgress(progress);
      });

      console.log('Upload completed successfully');
      setUploading(false);
      setSelectedMonth(null); // Reset month after successful upload
    } catch (err) {
      console.error('Error in handleFileUpload:', err);
      setError(err.message || 'An error occurred while uploading meter readings');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Upload CSM Meter Readings Report
      </h2>
      
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Report Month
          </label>
          <Listbox value={selectedMonth} onChange={setSelectedMonth}>
            <div className="relative mt-1">
              <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white dark:bg-gray-800 py-2.5 pl-4 pr-10 text-left border border-gray-300 dark:border-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme focus-visible:border-theme sm:text-sm">
                <span className="block truncate text-gray-900 dark:text-white">
                  {selectedMonth?.label || 'Select a month'}
                </span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon
                    className="h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                </span>
              </Listbox.Button>
              <Transition
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {availableMonths.map((month) => (
                    <Listbox.Option
                      key={month.value}
                      value={month}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-4 pr-4 ${
                          active ? 'bg-theme text-white' : 'text-gray-900 dark:text-white'
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                          {month.label}
                        </span>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </div>
          </Listbox>
          {!selectedMonth && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please select the month for which you are uploading meter readings
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={uploading || !selectedMonth}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
                     file:mr-4 file:py-2.5 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-theme file:text-white
                     hover:file:bg-theme/90
                     file:cursor-pointer
                     disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {uploading && progress && (
          <div className="mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Processing: {progress.processedRecords} / {progress.totalRecords}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
              <div 
                className="bg-theme h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedRecords / progress.totalRecords) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md">
            {error}
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="mt-4 p-4 text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900/50 rounded-md">
            Successfully uploaded {progress.processedRecords} meter readings for {selectedMonth?.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeterReadingsUpload;
