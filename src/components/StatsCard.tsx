import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  iconBgColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, icon, iconBgColor }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <div className={`flex items-center ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span className="ml-1 text-sm font-medium">{Math.abs(change)}%</span>
        </div>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    </div>
  );
};

export default StatsCard;
