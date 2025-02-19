import React from 'react';
import DashboardMetrics from './DashboardMetrics';
import ServiceDeliveryTracker from './ServiceDeliveryTracker';
import DemographicsView from './DemographicsView';

function DashboardOverview() {
  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Municipal Analytics Overview
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Real-time metrics and performance indicators
        </p>
      </div>
      
      <DashboardMetrics />
      <ServiceDeliveryTracker />
      <DemographicsView />
    </div>
  );
}

export default DashboardOverview;