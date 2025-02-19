import React, { useState } from 'react';
import { read, utils } from 'xlsx';
import { uploadMeterReadings, UploadProgress } from '../services/meterReadingService';

const MeterReadingsUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setUploading(true);
      const file = event.target.files?.[0];
      
      if (!file) {
        throw new Error('No file selected');
      }

      console.log('Starting file processing:', {
        name: file.name,
        size: file.size,
        type: file.type
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
          // Log every 100th row for debugging
          if (index % 100 === 0) {
            console.log(`Processing row ${index}:`, row);
          }

          const reading = {
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
    } catch (err) {
      console.error('Error in handleFileUpload:', err);
      setError(err.message || 'An error occurred while uploading meter readings');
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Upload Meter Readings
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 dark:text-gray-400
                     file:mr-4 file:py-2 file:px-4
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
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-theme h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.processedRecords / progress.totalRecords) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        {progress?.status === 'completed' && (
          <div className="mt-4 p-4 text-green-700 bg-green-100 rounded-md">
            Successfully uploaded {progress.processedRecords} meter readings
          </div>
        )}
      </div>
    </div>
  );
};

export default MeterReadingsUpload;
