import React from 'react';

interface StatusIndicatorProps {
  isOnline: boolean;
  className?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isOnline, className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} mr-2`} />
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
};

export default StatusIndicator;
