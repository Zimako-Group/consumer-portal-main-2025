import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Query } from '../types/query';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

interface QueryListProps {
  accountNumber?: string;
}

export default function QueryList({ accountNumber }: QueryListProps) {
  const { currentUser, userData } = useAuth();
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no accountNumber provided, use the one from userData
    const userAccountNumber = accountNumber || userData?.accountNumber;
    
    if (!userAccountNumber) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'queries'),
      where('accountNumber', '==', userAccountNumber)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
      
      setQueries(queriesData.sort((a, b) => 
        new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()
      ));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [accountNumber, userData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme"></div>
      </div>
    );
  }

  if (!accountNumber && !userData?.accountNumber) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view your queries
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-4">Your Queries</h2>
      <div className="space-y-4">
        {queries.map((query) => (
          <div
            key={query.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Reference: {query.referenceId}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {format(new Date(query.submissionDate), 'PPP')}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  query.status === 'Open'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
                    : query.status === 'Active'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                    : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                }`}
              >
                {query.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {query.description}
            </p>
            {query.resolutionMessage && query.status === 'Resolved' && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Resolution:</span>{' '}
                  {query.resolutionMessage}
                </p>
              </div>
            )}
          </div>
        ))}
        {queries.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No queries found
          </p>
        )}
      </div>
    </div>
  );
}