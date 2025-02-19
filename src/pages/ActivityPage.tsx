import React from 'react';
import UserActivityComponent from '../components/UserActivity';

const ActivityPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <UserActivityComponent limit={10} showPagination={true} />
      </div>
    </div>
  );
};

export default ActivityPage;
