import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend?: number;
  loading?: boolean;
  error?: string | null;
  description?: string;
  formatter?: (value: number) => string;
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  trend = 0, 
  loading = false, 
  error = null,
  description,
  formatter = (val) => val.toString()
}: MetricCardProps) {
  const isPositiveChange = trend > 0;
  
  return (
    <div className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 shadow-sm transition-all duration-300 hover:shadow-lg border border-gray-100 dark:border-gray-700">
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 dark:text-red-400">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
          </div>
          
          <div className="flex items-baseline space-x-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatter(value)}
            </h3>
            
            {trend !== 0 && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
                ${isPositiveChange 
                  ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' 
                  : 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'}`}>
                {isPositiveChange ? <ArrowUpIcon className="w-4 h-4 mr-1" /> : <ArrowDownIcon className="w-4 h-4 mr-1" />}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          
          {description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
          
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600 opacity-20"></div>
        </>
      )}
    </div>
  );
}