import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const CustomerGrowthCard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [customerCount, setCustomerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listener for customers collection
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomerCount(snapshot.size);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching customers:', error);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const chartOptions = {
    chart: {
      type: 'area' as const,
      height: 160,
      sparkline: {
        enabled: true
      },
      toolbar: {
        show: false
      },
      background: 'transparent'
    },
    colors: ['#F97316'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [50, 100],
        colorStops: [
          {
            offset: 0,
            color: '#F97316',
            opacity: 0.45
          },
          {
            offset: 100,
            color: '#F97316',
            opacity: 0.05
          }
        ]
      }
    },
    stroke: {
      width: 2,
      curve: 'smooth' as const,
      colors: ['#F97316']
    },
    tooltip: {
      fixed: {
        enabled: true,
        position: 'topRight' as const,
      },
      y: {
        formatter: function(value: number) {
          return value.toLocaleString();
        }
      },
      theme: isDarkMode ? 'dark' : 'light'
    },
    grid: {
      show: false
    },
    xaxis: {
      labels: {
        show: false
      }
    },
    yaxis: {
      labels: {
        show: false
      }
    }
  };

  const series = [{
    name: 'Total Customers',
    data: [0, customerCount] // Show growth from 0 to current count
  }];

  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
            <Users className={`h-6 w-6 text-orange-500`} />
          </div>
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Total Accounts
          </h3>
        </div>
      </div>

      <div className="mb-2">
        <h4 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {customerCount.toLocaleString()}
        </h4>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Active customer accounts
        </p>
      </div>

      {isLoading ? (
        <div className="h-[160px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : customerCount === 0 ? (
        <div className={`h-[160px] flex items-center justify-center ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          No customer data available
        </div>
      ) : (
        <div className="h-[160px]">
          <ReactApexChart
            options={chartOptions}
            series={series}
            type="area"
            height="100%"
            width="100%"
          />
        </div>
      )}
    </div>
  );
};

export default CustomerGrowthCard;