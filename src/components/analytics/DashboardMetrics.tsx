import React, { useState, useEffect } from 'react';
import ApexCharts from 'react-apexcharts';
import { format, subDays, subMonths, startOfDay, eachDayOfInterval, eachMonthOfInterval, isBefore } from 'date-fns';
import { MetricCard } from '../metrics/MetricCard';
import { useMetricsData } from '../metrics/useMetricsData';
import { useCustomerStats } from '../../hooks/useCustomerStats';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { UsersIcon, UserGroupIcon, BoltIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

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
  const { totalCustomers, activeCustomers, loading: statsLoading, error: statsError } = useCustomerStats();
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
  }, [selectedRange]);

  // Calculate metrics for display
  const newUsersThisWeek = 0; // This will be implemented later
  const collectionRate = 0; // This will be implemented later

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="New Users This Week"
          value={newUsersThisWeek}
          icon={<UsersIcon className="h-6 w-6" />}
          trend={0}
          loading={statsLoading}
          error={statsError}
          description="Resets every Sunday at 00:00 SAST"
        />
        <MetricCard
          title="Total Customers"
          value={totalCustomers}
          icon={<UserGroupIcon className="h-6 w-6" />}
          trend={0}
          loading={statsLoading}
          error={statsError}
          description="Total registered customers"
        />
        <MetricCard
          title="Active Services"
          value={activeCustomers}
          icon={<BoltIcon className="h-6 w-6" />}
          trend={0}
          loading={statsLoading}
          error={statsError}
          description="Customers with active accounts"
        />
        <MetricCard
          title="Collection Rate"
          value={collectionRate}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
          trend={0}
          loading={statsLoading}
          error={statsError}
          description="Average collection rate"
          formatter={percentageFormatter}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Combined Statistics
          </h3>
          <div className="flex items-center space-x-2">
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${selectedRange === range.key
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ApexCharts
              options={{
                chart: {
                  type: 'bar',
                  height: 400,
                  fontFamily: 'Inter, sans-serif',
                  toolbar: {
                    show: true,
                    tools: {
                      download: true,
                      selection: false,
                      zoom: false,
                      zoomin: false,
                      zoomout: false,
                      pan: false,
                    }
                  },
                  animations: {
                    enabled: true,
                    easing: 'easeinout',
                    speed: 800,
                    animateGradually: {
                      enabled: true,
                      delay: 150
                    },
                    dynamicAnimation: {
                      enabled: true,
                      speed: 350
                    }
                  }
                },
                plotOptions: {
                  bar: {
                    borderRadius: 6,
                    columnWidth: '60%',
                    rangeBarOverlap: true,
                    colors: {
                      ranges: [{
                        from: 0,
                        to: Infinity,
                        color: '#3B82F6'
                      }]
                    }
                  }
                },
                grid: {
                  show: true,
                  borderColor: '#E5E7EB',
                  strokeDashArray: 4,
                  position: 'back'
                },
                dataLabels: {
                  enabled: false
                },
                xaxis: {
                  categories: combinedStats.map(stat => stat.date),
                  labels: {
                    style: {
                      colors: '#6B7280',
                      fontSize: '12px'
                    }
                  },
                  axisBorder: {
                    show: false
                  },
                  axisTicks: {
                    show: false
                  }
                },
                yaxis: {
                  labels: {
                    style: {
                      colors: '#6B7280',
                      fontSize: '12px'
                    },
                    formatter: (value: number) => Intl.NumberFormat('en-ZA').format(value)
                  }
                },
                theme: {
                  mode: 'light',
                  palette: 'palette1'
                }
              }}
              series={[
                {
                  name: 'Accounts',
                  data: combinedStats.map(stat => stat.accounts)
                },
                {
                  name: 'Statements',
                  data: combinedStats.map(stat => stat.statements)
                }
              ]}
              type="bar"
              height={400}
            />
          )}
        </div>
      </div>
    </div>
  );
}