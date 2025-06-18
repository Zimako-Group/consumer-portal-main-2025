import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface UserActivity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: any;
  metadata?: {
    amount?: number;
    meterNumber?: string;
    queryType?: string;
    statementMonth?: string;
  };
}

interface ActivityItemProps {
  activity: UserActivity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'PAYMENT':
      case 'payment':
        return '💰';
      case 'METER_READING':
      case 'meter_reading':
        return '📊';
      case 'statement':
      case 'STATEMENT_DOWNLOAD':
        return '📄';
      case 'QUERY_SUBMISSION':
      case 'QUERY_UPDATE':
      case 'query':
        return '❓';
      case 'payment_arrangement':
        return '📅';
      case 'COMMUNICATION_UPDATE':
      case 'COMMUNICATION_LOG':
      case 'communication_preference':
        return '✉️';
      case 'REPORT_DOWNLOAD':
        return '📊';
      case 'ACCOUNT_MANAGEMENT':
        return '⚙️';
      case 'PAYMENT_REMINDER':
        return '⏰';
      default:
        return '📝';
    }
  };

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <div className="flex items-center space-x-3">
        <span className="text-xl">{getActivityIcon(activity.type)}</span>
        <div className="flex-1">
          <p className="text-gray-900 dark:text-white">{activity.description}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(
              typeof activity.timestamp === 'object' && 'toDate' in activity.timestamp
                ? activity.timestamp.toDate()
                : new Date(activity.timestamp),
              'PPpp'
            )}
          </p>
          {activity.metadata && (
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {activity.metadata.amount && (
                <p>Amount: R{activity.metadata.amount.toFixed(2)}</p>
              )}
              {activity.metadata.meterNumber && (
                <p>Meter Number: {activity.metadata.meterNumber}</p>
              )}
              {activity.metadata.queryType && (
                <p>Query Type: {activity.metadata.queryType}</p>
              )}
              {activity.metadata.statementMonth && (
                <p>Statement Month: {activity.metadata.statementMonth}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface UserActivityProps {
  itemLimit?: number;
  showPagination?: boolean;
  externalActivities?: Array<{
    type: string;
    description: string;
    date: string;
  }>;
}

const UserActivityComponent: React.FC<UserActivityProps> = ({
  itemLimit = 5,
  showPagination = true,
  externalActivities = [],
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser } = useAuth();
  const [pageQueries, setPageQueries] = useState<any[]>([]);

  const createBaseQuery = () => {
    if (!currentUser) return null;
    return query(
      collection(db, 'userActivities'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(itemLimit)
    );
  };

  const fetchActivities = async (pageQuery: any | null) => {
    try {
      setLoading(true);
      if (!pageQuery) {
        setLoading(false);
        return;
      }

      const querySnapshot = await getDocs(pageQuery);
      const fetchedActivities: UserActivity[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as {
          userId: string;
          type: string;
          description: string;
          timestamp: any;
          metadata?: {
            amount?: number;
            meterNumber?: string;
            queryType?: string;
            statementMonth?: string;
          };
        };

        fetchedActivities.push({
          id: doc.id,
          userId: data.userId,
          type: data.type,
          description: data.description,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp),
          metadata: data.metadata
        });
      });

      setActivities(fetchedActivities);
      setHasMore(querySnapshot.docs.length === itemLimit);

      // Store query for next page if there are more items
      if (querySnapshot.docs.length === itemLimit) {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        const nextPageQuery = currentUser ? query(
          collection(db, 'userActivities'),
          where('userId', '==', currentUser.uid),
          orderBy('timestamp', 'desc'),
          startAfter(lastDoc),
          limit(itemLimit)
        ) : null;
        setPageQueries(prev => {
          const newQueries = [...prev];
          newQueries[currentPage] = nextPageQuery;
          return newQueries;
        });
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Convert external activities to UserActivity format if provided
    if (externalActivities && externalActivities.length > 0) {
      const formattedExternalActivities: UserActivity[] = externalActivities.map((activity, index) => ({
        id: `external-${index}`,
        userId: currentUser ? currentUser.uid : 'external',
        type: activity.type,
        description: activity.description,
        timestamp: new Date(activity.date),
      }));
      
      setActivities(formattedExternalActivities);
      setLoading(false);
      return;
    }
    
    // Otherwise fetch from Firebase as usual
    const baseQuery = createBaseQuery();
    if (baseQuery) {
      setPageQueries([baseQuery]);
      fetchActivities(baseQuery);
    }
  }, [currentUser, itemLimit, externalActivities]);

  const handleNextPage = async () => {
    if (hasMore && pageQueries[currentPage]) {
      setCurrentPage(prev => prev + 1);
      await fetchActivities(pageQueries[currentPage]);
    }
  };

  const handlePrevPage = async () => {
    if (currentPage > 1) {
      const newPage = currentPage - 2;
      setCurrentPage(prev => prev - 1);
      await fetchActivities(pageQueries[newPage]);
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(itemLimit)].map((_, index) => (
          <div key={index} className="flex items-start space-x-4 p-4 bg-white dark:bg-dark-card rounded-lg">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <Clock className="h-8 w-8 text-gray-600 dark:text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Activities</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          No recent activities found for your account.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>

      {showPagination && activities.length > 0 && (
        <div className="flex justify-between items-center p-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage}
          </span>

          <button
            onClick={handleNextPage}
            disabled={!hasMore}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              !hasMore
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900'
            }`}
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default UserActivityComponent;
