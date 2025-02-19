import React from 'react';

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  valueFormatter?: (value: number | undefined) => string;
  loading?: boolean;
  error?: string | null;
}

export function MetricCard({
  title,
  value,
  subtitle,
  valueFormatter = (val) => (val !== undefined ? val.toString() : '0'),
  loading = false,
  error = null,
}: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden rounded-lg shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {title}
            </p>
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          ) : error ? (
            <div className="text-red-500 dark:text-red-400 text-sm">{error}</div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {valueFormatter(value)}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}