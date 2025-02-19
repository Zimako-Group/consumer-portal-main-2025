import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AlertCircle, FileText, Send, Clock, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Query } from '../types/query';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { logUserActivity } from '../utils/activity';

const queryCategories = [
  'Billing Issue',
  'Technical Support',
  'Account Management',
  'Service Request',
  'Complaint',
  'General Inquiry'
];

const queryDepartmentMapping = {
  'Technical Support': 'Technical',
  'Billing Issue': 'Revenue',
  'Account Management': 'Customer Care',
  'Service Request': 'Technical',
  'Complaint': 'Customer Care',
  'General Inquiry': 'Customer Care'
};

const ITEMS_PER_PAGE = 5;

const departmentColorClasses = {
  'Technical': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Revenue': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Customer Care': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Credit Control': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
};

const StatusIndicator = ({ status }: { status: string }) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Open':
        return {
          icon: AlertTriangle,
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        };
      case 'Active':
        return {
          icon: Activity,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        };
      case 'Resolved':
        return {
          icon: CheckCircle2,
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        };
    }
  };

  const { icon: Icon, color } = getStatusInfo(status);

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status}
    </span>
  );
};

export default function QueryForm() {
  const { currentUser, userData } = useAuth();
  const [formData, setFormData] = useState({
    queryType: '',
    description: '',
    customerName: '',
    contactNumber: '',
    accountNumber: ''
  });

  const [recentQueries, setRecentQueries] = useState<Query[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalQueries, setTotalQueries] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch customer details when component mounts
  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        if (!currentUser || !userData?.accountNumber) {
          toast.error('Please log in to submit queries');
          setLoading(false);
          return;
        }

        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('accountNumber', '==', userData.accountNumber));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setFormData(prev => ({
            ...prev,
            customerName: customerData.accountHolderName || '',
            contactNumber: customerData.contactNumber || '',
            accountNumber: customerData.accountNumber || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast.error('Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [currentUser, userData]);

  // Fetch recent queries for the current customer
  useEffect(() => {
    if (!userData?.accountNumber) return;

    const q = query(
      collection(db, 'queries'),
      where('accountNumber', '==', userData.accountNumber),
      orderBy('submissionDate', 'desc'),
      limit(ITEMS_PER_PAGE)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const queriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Query[];
      setRecentQueries(queriesData);
      setTotalQueries(snapshot.size);
    });

    return () => unsubscribe();
  }, [userData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userData?.accountNumber) {
      toast.error('Please log in to submit queries');
      return;
    }

    if (formData.description.length < 20) {
      toast.error('Please provide more details (minimum 20 characters)');
      return;
    }

    try {
      const referenceId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const queryData = {
        referenceId,
        ...formData,
        userId: currentUser.uid,
        status: 'Open',
        submissionDate: new Date().toISOString(),
        resolutionMessage: '',
        lastUpdated: new Date().toISOString()
      };

      await addDoc(collection(db, 'queries'), queryData);
      await logUserActivity(
        currentUser.uid,
        'QUERY_SUBMISSION',
        `Submitted a ${formData.queryType} query (Ref: ${referenceId})`,
        {
          queryType: formData.queryType,
          queryId: referenceId,
          accountNumber: userData.accountNumber
        }
      );
      toast.success('Query submitted successfully');
      
      // Reset only description and queryType, keep customer details
      setFormData(prev => ({
        ...prev,
        queryType: '',
        description: ''
      }));
    } catch (error) {
      console.error('Error submitting query:', error);
      toast.error('Failed to submit query');
    }
  };

  if (!currentUser || !userData?.accountNumber) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-gray-500">Please log in to submit queries</p>
      </div>
    );
  }

  return (
    <div id="query-form" className="space-y-8">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Submit a Query</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Query Type
            </label>
            <select
              value={formData.queryType}
              onChange={(e) => setFormData(prev => ({ ...prev, queryType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-theme focus:border-theme"
              required
            >
              <option value="">Select a category</option>
              {queryCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {formData.queryType && (
              <p className="mt-2 text-sm">
                Department: {' '}
                <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${departmentColorClasses[queryDepartmentMapping[formData.queryType as keyof typeof queryDepartmentMapping]]}`}>
                  {queryDepartmentMapping[formData.queryType as keyof typeof queryDepartmentMapping]}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-theme focus:border-theme"
              placeholder="Please describe your query in detail..."
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-theme hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme disabled:opacity-50"
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Query
            </button>
          </div>
        </form>
      </div>

      {/* Recent Queries Section */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Queries</h3>
        <div className="space-y-4">
          {recentQueries.map((query) => (
            <div
              key={query.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Reference: {query.referenceId}
                  </p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(query.submissionDate), 'PPP')} | Time: {format(new Date(query.submissionDate), 'HH:mm')}
                  </p>
                </div>
                <StatusIndicator status={query.status} />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
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
          {recentQueries.length === 0 && (
            <p className="text-center text-gray-500 py-4">No recent queries</p>
          )}
        </div>
      </div>
    </div>
  );
}