import { ClockIcon } from '@heroicons/react/24/outline';

import React from 'react';

interface LastUpdatedProps {
  date: string;
}

export const LastUpdated: React.FC<LastUpdatedProps> = ({ date }) => {
  // Format the date to be more readable
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-4 mb-8">
      <ClockIcon className="h-4 w-4 mr-1.5" />
      <span>Last updated on {formatDate(date)}</span>
    </div>
  );
};
