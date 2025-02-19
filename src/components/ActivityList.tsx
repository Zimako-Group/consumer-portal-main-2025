import React from 'react';
import { format } from 'date-fns';
import type { Activity } from '../types/activity';

interface ActivityListProps {
  activities: Activity[];
  isLoading: boolean;
  error: Error | null;
}

export function ActivityList({ activities, isLoading, error }: ActivityListProps) {
  if (isLoading) {
    return <div className="animate-pulse">Loading activities...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading activities: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">{activity.type}</h3>
              <p className="text-gray-600">{activity.description}</p>
            </div>
            <span className="text-sm text-gray-500">
              {format(activity.timestamp, 'PPp')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}