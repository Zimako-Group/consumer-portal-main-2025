import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TrendData {
  data: number[];
  labels: string[];
}

interface DashboardCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: string;
  trendData: TrendData;
  changeType: 'increase' | 'decrease' | 'neutral';
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  icon,
  title,
  value,
  trend,
  trendData,
  changeType
}) => {
  const { isDarkMode, themeColor } = useTheme();

  const getTrendIcon = () => {
    const iconClass = `w-4 h-4 ${
      changeType === 'increase'
        ? 'text-green-500'
        : changeType === 'decrease'
        ? 'text-red-500'
        : `text-${themeColor}-500`
    }`;

    switch (changeType) {
      case 'increase':
        return <ArrowUp className={iconClass} />;
      case 'decrease':
        return <ArrowDown className={iconClass} />;
      default:
        return <Minus className={iconClass} />;
    }
  };

  const getTrendColor = () => {
    switch (changeType) {
      case 'increase':
        return '#22c55e'; // green-500
      case 'decrease':
        return '#ef4444'; // red-500
      default:
        return themeColor === 'orange' ? '#f97316' : '#3b82f6'; // orange-500 or blue-500
    }
  };

  const chartOptions = {
    chart: {
      type: 'area' as const,
      sparkline: {
        enabled: true
      },
      toolbar: {
        show: false
      }
    },
    stroke: {
      curve: 'smooth' as const,
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [50, 100]
      }
    },
    colors: [getTrendColor()],
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      fixed: {
        enabled: false
      },
      x: {
        show: false
      },
      y: {
        title: {
          formatter: function () {
            return '';
          }
        }
      }
    }
  };

  const series = [{
    name: title,
    data: trendData.data
  }];

  return (
    <div className={`${
      isDarkMode ? 'bg-dark-card' : 'bg-white'
    } p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 bg-${themeColor}-100 rounded-lg`}>
          {React.cloneElement(icon as React.ReactElement, {
            className: `w-6 h-6 text-${themeColor}-600`
          })}
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${
            changeType === 'increase'
              ? 'text-green-500'
              : changeType === 'decrease'
              ? 'text-red-500'
              : `text-${themeColor}-500`
          }`}>
            {trend}%
          </span>
        </div>
      </div>

      <h3 className={`${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'} text-sm mb-1`}>
        {title}
      </h3>
      <p className={`text-2xl font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} mb-4`}>
        {value}
      </p>

      <div className="h-16">
        <ReactApexChart
          options={chartOptions}
          series={series}
          type="area"
          height="100%"
        />
      </div>
    </div>
  );
};

export default DashboardCard;