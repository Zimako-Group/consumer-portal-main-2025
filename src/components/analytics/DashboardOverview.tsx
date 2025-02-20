import React from 'react';
import DashboardMetrics from './DashboardMetrics';

function DashboardOverview() {
  return (
    <div className="p-6 space-y-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Municipal Analytics Overview
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Real-time metrics and performance indicators
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live Data</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <DashboardMetrics />
        </div>
      </div>
    </div>
  );
}

export default DashboardOverview;