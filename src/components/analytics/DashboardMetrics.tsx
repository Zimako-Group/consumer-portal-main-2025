import React, { useState, useEffect } from 'react';
import ApexCharts from 'react-apexcharts';
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachMonthOfInterval, isBefore } from 'date-fns';
import { MetricCard } from '../metrics/MetricCard';
import { useMetricsData } from '../metrics/useMetricsData';
import { useCustomerStats } from '../../hooks/useCustomerStats';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';

interface CombinedStats {
  accounts: number;
  bookValue: number;
  statements: number;
  readings: number;
  date: string;
  timestamp: Date;
}

const timeRanges = [
  { key: '7d', label: '7 Days', days: 7 },
  { key: '30d', label: '30 Days', days: 30 },
  { key: '3m', label: '3 Months', days: 90 },
  { key: '6m', label: '6 Months', days: 180 },
  { key: '12m', label: '12 Months', days: 365 },
];

// Function to generate random number within a range with decimal support
const randomInRange = (min: number, max: number, decimals = 0) => {
  const rand = Math.random() * (max - min) + min;
  const power = Math.pow(10, decimals);
  return Math.round(rand * power) / power;
};

// Function to add trend to a base value
const addTrend = (baseValue: number, date: Date, trendStrength = 0.1) => {
  const dayOfYear = date.getDate() + date.getMonth() * 30;
  
  // Increased seasonal variation for more dramatic changes
  const seasonalFactor = Math.sin((dayOfYear / 365) * Math.PI * 2);
  const seasonalVariation = baseValue * (seasonalFactor * 0.35); // 35% seasonal variation

  // Increased growth trend
  const yearProgress = date.getMonth() / 12;
  const growthTrend = baseValue * (yearProgress * 0.05); // 5% annual growth

  // More significant random variation
  const randomVariation = baseValue * (randomInRange(-0.15, 0.20)); // Increased random variation range

  return Math.round(baseValue + seasonalVariation + growthTrend + randomVariation);
};

// Function to generate realistic dummy data based on date
const generateDummyDataForDate = (date: Date) => {
  // Base values with realistic ratios - increased base numbers
  const baseAccounts = randomInRange(8000, 12000); // Total customer base
  const activeRatio = randomInRange(0.75, 0.95); // 75-95% active accounts
  
  // Significantly increased ratios for statements and readings
  const statementRatio = randomInRange(3.0, 4.5); // 300-450% statement generation (multiple per account)
  const readingRatio = randomInRange(2.8, 4.2); // 280-420% meter reading (multiple per account)

  // Calculate derived values with trends
  const accounts = addTrend(baseAccounts, date);
  const activeAccounts = Math.round(accounts * activeRatio);
  
  // Book value calculation (average R2000-R5000 per active account)
  const averageBookValue = randomInRange(2000, 5000);
  const bookValue = addTrend(activeAccounts * averageBookValue, date);
  
  // Enhanced randomization for statements and readings with higher base values
  const baseStatements = Math.round(activeAccounts * statementRatio * (1 + randomInRange(-0.1, 0.3))); // Add up to 30% extra
  const baseReadings = Math.round(activeAccounts * readingRatio * (1 + randomInRange(-0.1, 0.35))); // Add up to 35% extra
  
  // Add significant random variations
  const statements = addTrend(baseStatements, date) + randomInRange(1000, 2500);
  const readings = addTrend(baseReadings, date) + randomInRange(800, 2800);

  // Ensure minimum values while allowing for higher peaks
  const minValue = Math.round(activeAccounts * 2.0); // Minimum 200% of active accounts
  
  // Add occasional spikes (15% chance of a significant spike)
  const statementSpike = Math.random() < 0.15 ? randomInRange(2000, 3500) : 0;
  const readingSpike = Math.random() < 0.15 ? randomInRange(2000, 4000) : 0;

  return {
    accounts: accounts,
    bookValue: bookValue,
    statements: Math.max(statements + statementSpike, minValue),
    readings: Math.max(readings + readingSpike, minValue),
    date: format(date, isBefore(date, subMonths(new Date(), 1)) ? 'MMM yyyy' : 'dd MMM'),
    timestamp: date
  };
};

// Function to generate dummy data for a time range with proper intervals
const generateDummyData = (selectedRange: string): CombinedStats[] => {
  const today = new Date();
  const selectedTimeRange = timeRanges.find(r => r.key === selectedRange)?.days || 7;
  
  let dates: Date[];
  if (selectedRange.includes('m')) {
    // For monthly ranges
    const months = parseInt(selectedRange);
    const startDate = subMonths(today, months);
    dates = eachMonthOfInterval({ start: startDate, end: today });
  } else {
    // For daily ranges
    const startDate = subDays(today, selectedTimeRange);
    dates = eachDayOfInterval({ start: startDate, end: today });
  }

  // Generate data for each date with proper trends
  const data = dates.map(date => generateDummyDataForDate(date));

  // Ensure the data follows a logical progression
  return data.map((item, index, array) => {
    if (index === 0) return item;

    // Ensure values don't change too drastically between periods
    const maxChange = 0.1; // 10% maximum change between periods
    const prev = array[index - 1];

    return {
      ...item,
      accounts: Math.round(
        prev.accounts * (1 + randomInRange(-maxChange, maxChange))
      ),
      bookValue: Math.round(
        prev.bookValue * (1 + randomInRange(-maxChange, maxChange))
      ),
      statements: Math.round(
        prev.statements * (1 + randomInRange(-maxChange, maxChange))
      ),
      readings: Math.round(
        prev.readings * (1 + randomInRange(-maxChange, maxChange))
      ),
    };
  });
};

const valueFormatter = (number: number | undefined) =>
  number !== undefined ? `R ${Intl.NumberFormat('en-ZA').format(number).toString()}` : '0';

const waterUsageFormatter = (number: number | undefined) =>
  number !== undefined ? `${Intl.NumberFormat('en-ZA').format(number)} kL` : '0 kL';

const percentageFormatter = (number: number | undefined) =>
  number !== undefined ? `${number.toFixed(1)}%` : '0%';

export default function DashboardMetrics() {
  const metrics = useMetricsData();
  const customerStats = useCustomerStats();
  const [selectedRange, setSelectedRange] = useState('7d');
  const [combinedStats, setCombinedStats] = useState<CombinedStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const dummyData = generateDummyData(selectedRange);
      setCombinedStats(dummyData);
      setIsLoading(false);
    }, 500);

    // Comment out the Firebase listener for now
    // const selectedTimeRange = timeRanges.find(r => r.key === selectedRange)?.days || 7;
    // const startDate = startOfDay(
    //   selectedRange.includes('m') 
    //     ? subMonths(new Date(), parseInt(selectedRange))
    //     : subDays(new Date(), selectedTimeRange)
    // );

    // const statsRef = collection(db, 'statistics');
    // const statsQuery = query(
    //   statsRef,
    //   where('timestamp', '>=', Timestamp.fromDate(startDate)),
    //   orderBy('timestamp', 'desc'),
    //   limit(selectedTimeRange)
    // );

    // const unsubscribe = onSnapshot(statsQuery, (snapshot) => {
    //   const newStats = snapshot.docs.map(doc => {
    //     const data = doc.data();
    //     return {
    //       accounts: data.accounts || 0,
    //       bookValue: data.bookValue || 0,
    //       statements: data.statements || 0,
    //       readings: data.readings || 0,
    //       date: format(data.timestamp.toDate(), selectedTimeRange <= 30 ? 'dd MMM' : 'MMM yyyy'),
    //       timestamp: data.timestamp
    //     };
    //   });
    //   setCombinedStats(newStats.reverse());
    //   setIsLoading(false);
    // }, (error) => {
    //   console.error('Error fetching stats:', error);
    //   setIsLoading(false);
    // });

    // return () => unsubscribe();
  }, [selectedRange]);

  const isDarkMode = document.documentElement.classList.contains('dark');

  const barChartOptions = {
    chart: {
      type: 'bar',
      height: 350,
      background: 'transparent',
      foreColor: isDarkMode ? '#fff' : '#373d3f',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        borderRadius: 5,
      },
    },
    dataLabels: {
      enabled: false, // Disable the data labels on bars
    },
    grid: {
      show: true,
      borderColor: isDarkMode ? '#2d3748' : '#e2e8f0',
      strokeDashArray: 5,
      position: 'back',
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent']
    },
    xaxis: {
      categories: combinedStats.map((data) => data.date),
      labels: {
        style: {
          colors: isDarkMode ? '#fff' : '#373d3f',
          fontSize: '12px',
        },
      },
      axisBorder: {
        color: isDarkMode ? '#2d3748' : '#e2e8f0',
      },
      axisTicks: {
        color: isDarkMode ? '#2d3748' : '#e2e8f0',
      },
    },
    yaxis: [
      {
        title: {
          text: 'Number of Items',
          style: {
            color: isDarkMode ? '#fff' : '#373d3f',
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? '#fff' : '#373d3f',
          },
          formatter: function(val: number) {
            return val >= 1000 ? `${(val/1000).toFixed(1)}K` : val.toString();
          },
        },
      },
      {
        opposite: true,
        title: {
          text: 'Book Value (R)',
          style: {
            color: isDarkMode ? '#fff' : '#373d3f',
          },
        },
        labels: {
          style: {
            colors: isDarkMode ? '#fff' : '#373d3f',
          },
          formatter: function(val: number) {
            return `R${(val/1000).toFixed(1)}K`;
          },
        },
      }
    ],
    tooltip: {
      enabled: true,
      theme: isDarkMode ? 'dark' : 'light',
      shared: true,
      intersect: false,
      y: {
        formatter: function(val: number, opts: any) {
          const seriesName = opts.w.globals.seriesNames[opts.seriesIndex];
          if (seriesName === 'Book Value') {
            return `R${(val/1000).toFixed(1)}K`;
          }
          return val >= 1000 ? `${(val/1000).toFixed(1)}K` : val.toString();
        }
      },
      style: {
        fontSize: '12px',
      },
    },
    legend: {
      labels: {
        colors: isDarkMode ? '#fff' : '#373d3f',
      },
    },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'], // Blue, Green, Orange, Purple
  };

  const barChartSeries = [
    {
      name: 'Accounts',
      type: 'column',
      data: combinedStats.map((data) => data.accounts),
    },
    {
      name: 'Book Value',
      type: 'column',
      data: combinedStats.map((data) => data.bookValue),
    },
    {
      name: 'Statements',
      type: 'column',
      data: combinedStats.map((data) => data.statements),
    },
    {
      name: 'Meter Readings',
      type: 'column',
      data: combinedStats.map((data) => data.readings),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="New Users This Week"
          value={metrics.newUsers || 0}
          subtitle="Resets every Sunday at 00:00 SAST"
          loading={metrics.loading}
        />
        <MetricCard
          title="Total Customers"
          value={customerStats.totalCustomers || 0}
          subtitle="Total registered customers"
          loading={customerStats.loading}
          error={customerStats.error}
        />
        <MetricCard
          title="Active Services"
          value={customerStats.activeCustomers || 0}
          subtitle="Customers with active accounts"
          loading={customerStats.loading}
          error={customerStats.error}
        />
        <MetricCard
          title="Collection Rate"
          value={metrics.collectionRate || 0}
          subtitle="Average collection rate"
          valueFormatter={percentageFormatter}
          loading={metrics.loading}
        />
      </div>

      <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Combined Statistics
              {isLoading && (
                <span className="ml-2 text-sm font-normal text-gray-500">Loading...</span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedRange(range.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    selectedRange === range.key
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <ApexCharts 
              options={barChartOptions} 
              series={barChartSeries} 
              type="bar" 
              height={400} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}