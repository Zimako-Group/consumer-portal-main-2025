import React, { useState, useEffect, lazy, Suspense } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { calculateAccountStats } from '../../utils/accountStats';
import { getMonthlyStats } from '../../utils/usageStats';

const Chart = lazy(() => import('react-apexcharts'));

interface DemographicData {
  geographicData: { category: string; Accounts: number; 'Book Value': number }[];
  usageStats: {
    labels: string[];
    statements: number[];
    readings: number[];
  };
}

const DISTRIBUTION_INDICATORS = [
  { name: 'Accounts', color: '#3b82f6' },     // Blue
  { name: 'Book Value', color: '#22c55e' },   // Green
];

const USAGE_INDICATORS = [
  { name: 'Statements', color: '#f59e0b' },   // Amber
  { name: 'Readings', color: '#8b5cf6' },     // Purple
];

export default function DemographicsView() {
  const [demographics, setDemographics] = useState<DemographicData>({
    geographicData: [],
    usageStats: {
      labels: [],
      statements: [],
      readings: []
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchAccountStats();
    fetchUsageStats();

    // Set up real-time listeners
    const customersRef = collection(db, 'customers');
    const customerUnsubscribe = onSnapshot(query(customersRef), () => {
      fetchAccountStats();
    });

    const usageStatsRef = collection(db, 'usageStats');
    const usageUnsubscribe = onSnapshot(query(usageStatsRef), () => {
      fetchUsageStats();
    });

    // Check for month change
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (tomorrow.getMonth() !== now.getMonth()) {
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      const timeout = setTimeout(() => {
        fetchAccountStats();
        fetchUsageStats();
      }, timeUntilMidnight);

      return () => {
        clearTimeout(timeout);
        customerUnsubscribe();
        usageUnsubscribe();
      };
    }

    return () => {
      customerUnsubscribe();
      usageUnsubscribe();
    };
  }, []);

  const fetchAccountStats = async () => {
    try {
      setLoading(true);
      const stats = await calculateAccountStats();
      
      setDemographics(prev => ({
        ...prev,
        geographicData: [
          {
            category: 'Distribution',
            Accounts: Math.round(stats.accountPercentage),
            'Book Value': Math.round(stats.bookValuePercentage),
          },
        ],
      }));
    } catch (error) {
      console.error('Error fetching account stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const stats = await getMonthlyStats();
      setDemographics(prev => ({
        ...prev,
        usageStats: stats
      }));
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const usageChartOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2
    },
    xaxis: {
      categories: demographics.usageStats.labels,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      title: { text: 'Count' }
    },
    colors: ['#f59e0b', '#8b5cf6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.9,
        stops: [0, 90, 100]
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val: number) => val.toFixed(0)
      }
    }
  };

  const distributionChartOptions = {
    chart: { type: 'bar', height: 350, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ['transparent'] },
    xaxis: { categories: ['Distribution'] },
    yaxis: {
      title: { text: 'Percentage (%)' },
      min: 0,
      max: 100,
      tickAmount: 10,
    },
    fill: { opacity: 1 },
    colors: ['#3b82f6', '#22c55e'],
    tooltip: { y: { formatter: (val: number) => `${val}%` } },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Suspense fallback={<div>Loading charts...</div>}>
        {/* Statements vs Meter Readings Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold text-center">
              Statements vs Meter Readings
            </h3>
            <div className="flex items-center justify-center space-x-8">
              {USAGE_INDICATORS.map(indicator => (
                <div key={indicator.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: indicator.color }}
                  ></div>
                  <span className="text-sm font-medium">{indicator.name}</span>
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Chart
              options={usageChartOptions}
              series={[
                {
                  name: 'Statements',
                  data: demographics.usageStats.statements
                },
                {
                  name: 'Readings',
                  data: demographics.usageStats.readings
                }
              ]}
              type="area"
              height={350}
            />
          )}
        </div>

        {/* Accounts vs Book Value Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col space-y-4">
            <h3 className="text-lg font-semibold text-center">
              Accounts VS Book Value
            </h3>
            <div className="flex items-center justify-center space-x-8">
              {DISTRIBUTION_INDICATORS.map(indicator => (
                <div key={indicator.name} className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: indicator.color }}
                  ></div>
                  <span className="text-sm font-medium">{indicator.name}</span>
                </div>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-[350px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              <Chart
                options={distributionChartOptions}
                series={[
                  {
                    name: 'Accounts',
                    data: [demographics.geographicData[0]?.Accounts || 0],
                  },
                  {
                    name: 'Book Value',
                    data: [demographics.geographicData[0]?.['Book Value'] || 0],
                  },
                ]}
                type="bar"
                height={350}
              />
              <div className="flex justify-around mt-4">
                <div className="text-center">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#3b82f6' }}
                  >
                    {demographics.geographicData[0]?.Accounts}%
                  </span>
                  <p className="text-xs text-gray-600">Accounts</p>
                </div>
                <div className="text-center">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: '#22c55e' }}
                  >
                    {demographics.geographicData[0]?.['Book Value']}%
                  </span>
                  <p className="text-xs text-gray-600">Book Value</p>
                </div>
              </div>
            </>
          )}
        </div>
      </Suspense>
    </div>
  );
}