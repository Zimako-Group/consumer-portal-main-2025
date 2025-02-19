import React from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import ReactImageZoom from 'react-image-zoom';
import { MeterReading } from './types';

interface ViewModalProps {
  reading: MeterReading;
  onClose: () => void;
}

function ViewModal({ reading, onClose }: ViewModalProps) {
  return (
    <div className="relative max-h-[90vh] flex flex-col w-full mx-auto">
      {/* Fixed header with close button */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pt-2 pb-4">
        <button
          onClick={onClose}
          className="absolute right-0 top-0 p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
        <h2 className="text-xl font-bold pr-12 dark:text-white">Meter Reading Details</h2>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Account Information</h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>Account Number: <span className="font-medium">{reading.accountNumber}</span></p>
                <p>Meter Number: <span className="font-medium">{reading.meterNumber}</span></p>
                <p>Meter Type: <span className="font-medium">{reading.meterType}</span></p>
                <p>Tariff Code: <span className="font-medium">{reading.tariffCode}</span></p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Reading Information</h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>Previous: <span className="font-medium">{reading.previousReading.value}</span></p>
                <p>Previous Date: <span className="font-medium">
                  {format(reading.previousReading.date, 'dd/MM/yyyy')}
                </span></p>
                <p>Current: <span className="font-medium">{reading.currentReading.value}</span></p>
                <p>Current Date: <span className="font-medium">
                  {format(reading.currentReading.date, 'dd/MM/yyyy')}
                </span></p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-gray-100">Meter Reading Image</h3>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
              <div className="relative aspect-[4/3] w-full max-w-2xl mx-auto">
                <ReactImageZoom
                  width={800}
                  height={600}
                  zoomWidth={400}
                  img={reading.currentReading.image}
                  className="rounded-lg"
                  zoomPosition="original"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ViewModal;