import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import CustomerDashboard from './CustomerDashboard';
import CsmBalanceReportUpload from './CsmBalanceReportUpload';
import MeterReadingsUpload from './MeterReadingsUpload';
import DetailedAgedAnalysisUpload from './DetailedAgedAnalysisUpload';
import DetailedLeviedUpload from './DetailedLeviedUpload';
import StatementDistributionRecords from './StatementDistributionRecords';

const ReportsLayout: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'statement-distribution'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col space-y-4 p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'dashboard'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            Customer Dashboard
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'reports'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('reports')}
          >
            Reports Upload
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'statement-distribution'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('statement-distribution')}
          >
            Statement Distribution
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'dashboard' ? (
            <CustomerDashboard 
              onLogout={async () => { return true; }} // Dummy function as we don't need logout here
              userEmail={currentUser?.email || ''}
              userName={userData?.fullName || ''}
              accountNumber={userData?.accountNumber || ''}
            />
          ) : activeTab === 'statement-distribution' ? (
            <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
              <StatementDistributionRecords />
            </div>
          ) : (
            <div className="space-y-8">
              {/* CSM Balance Report Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white text-black">Upload CSM Balance Report</h2>
                <CsmBalanceReportUpload />
              </div>

              {/* Meter Readings Report Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white text-black">Upload CSM Meter Readings Report</h2>
                <MeterReadingsUpload />
              </div>

              {/* Detailed Aged Analysis Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white text-black">Upload Detailed Aged Analysis</h2>
                <DetailedAgedAnalysisUpload />
              </div>

              {/* Detailed Levied Upload Section */}
              <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white text-black">Upload Detailed Levied</h2>
                <DetailedLeviedUpload />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsLayout;
