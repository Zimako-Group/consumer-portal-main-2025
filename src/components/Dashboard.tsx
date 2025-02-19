import React, { useEffect, useState } from 'react';
import { FileText, CreditCard, Activity, MessageSquare, Menu, HandshakeIcon, HelpCircle, UserPlus } from 'lucide-react';
import { getGreeting, getSASTHour } from '../utils/timeUtils';
import { db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { format, lastDayOfMonth } from 'date-fns';
import Sidebar from './Sidebar';
import Settings from './Settings';
import UserAccount from './UserAccount';
import MeterReadings from './MeterReadings';
import QueryForm from './QueryForm';
import Payment from './Payment';
import Statement from './Statement';
import UserActivityComponent from './UserActivity';
import IndigentApplication from './IndigentApplication';
import DashboardHelp from './DashboardHelp';
import DashboardChangelog from './DashboardChangelog';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardProps {
  onLogout: () => void;
  userEmail: string;
  userName: string;
  accountNumber: string;
}

interface CustomerData {
  accountNumber: string;
  accountHolderName: string;
  accountStatus: string;
  accountType: string;
  outstandingTotalBalance: number;
  lastPaymentAmount: number;
  lastPaymentDate: string;
  dueDate: string;
  communicationPreferences?: CommunicationPreferences;
}

interface RecentActivity {
  type: string;
  description: string;
  date: string;
}

interface CommunicationPreferences {
  sms: { enabled: boolean; value: string };
  whatsapp: { enabled: boolean; value: string };
  email: { enabled: boolean; value: string };
}

export default function Dashboard({ onLogout, userEmail, userName, accountNumber }: DashboardProps) {
  const [greeting, setGreeting] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [currentDueDate, setCurrentDueDate] = useState('');
  const [preferences, setPreferences] = useState<CommunicationPreferences>({
    sms: { enabled: false, value: '' },
    whatsapp: { enabled: false, value: '' },
    email: { enabled: false, value: '' }
  });
  const [showIndigentModal, setShowIndigentModal] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = getSASTHour();
      setGreeting(`${getGreeting(hour)}, ${userName}`);
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000);

    return () => clearInterval(interval);
  }, [userName]);

  useEffect(() => {
    const updateDueDate = () => {
      const lastDay = lastDayOfMonth(new Date());
      const formattedDate = format(lastDay, 'dd MMM yyyy');
      setCurrentDueDate(formattedDate);
    };

    // Update due date immediately
    updateDueDate();

    // Set up an interval to check and update the due date daily
    const interval = setInterval(updateDueDate, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        console.log('Fetching data for account:', accountNumber);
        const customerDoc = await getDoc(doc(db, 'customers', accountNumber));
        if (customerDoc.exists()) {
          const data = customerDoc.data() as CustomerData;
          console.log('Customer data fetched:', data);
          setCustomerData(data);
          // Initialize preferences from Firebase data
          if (data.communicationPreferences) {
            setPreferences(data.communicationPreferences);
          }
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [accountNumber]);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const activitiesRef = collection(db, 'activities');
        const q = query(activitiesRef, where('accountNumber', '==', accountNumber), orderBy('date', 'desc'), limit(3));
        const querySnapshot = await getDocs(q);
        const activities: RecentActivity[] = [];
        querySnapshot.forEach((doc) => {
          activities.push({
            type: doc.data().type,
            description: doc.data().description,
            date: format(doc.data().date.toDate(), 'dd MMM yyyy')
          });
        });
        setRecentActivities(activities);
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      }
    };

    fetchRecentActivities();
  }, [accountNumber]);

  useEffect(() => {
    // Handle redirects from payment gateway
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');
    
    if (tab === 'payments' && action === 'arrangement') {
      setCurrentView('payments');
      // Add a small delay to ensure the Payment component is mounted
      setTimeout(() => {
        const paymentSection = document.getElementById('payment-arrangements');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (tab === 'query' && action === 'billing') {
      setCurrentView('query');
      // Add a small delay to ensure the QueryForm component is mounted
      setTimeout(() => {
        const queryForm = document.getElementById('query-form');
        if (queryForm) {
          queryForm.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location.search]);

  const handlePreferencesSave = async (newPreferences: CommunicationPreferences) => {
    try {
      await updateDoc(doc(db, 'customers', accountNumber), {
        communicationPreferences: newPreferences
      });
      
      setPreferences(newPreferences);
      
      const today = new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      const newActivity = {
        type: 'Preferences',
        description: 'Communication Preferences Updated',
        date: today
      };

      setRecentActivities(prev => [newActivity, ...prev]);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error updating preferences:', error);
      return Promise.reject(error);
    }
  };

  const navigateToReadings = () => {
    trackUserActivity(accountNumber, 'navigation', 'Dashboard', { destination: 'readings' });
    setCurrentView('readings');
  };

  const navigateToQuery = () => {
    trackUserActivity(accountNumber, 'navigation', 'Dashboard', { destination: 'query' });
    setCurrentView('query');
  };

  const navigateToPayment = () => {
    trackUserActivity(accountNumber, 'navigation', 'Dashboard', { destination: 'payment' });
    setCurrentView('payment');
  };

  const formatFirestoreDate = (dateStr: string | null | undefined) => {
    console.log('Formatting date:', dateStr);
    // Check if dateStr is valid
    if (!dateStr || typeof dateStr !== 'string') {
      console.log('Date string is invalid:', dateStr);
      return 'N/A';
    }
    
    try {
      // Parse the date string from YYYYMMDD format
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const formatted = `${year}/${month}/${day}`;
      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const stats = loading ? [
    { label: 'Current Balance', value: 'Loading...' },
    { label: 'Due Date', value: 'Loading...' },
    { label: 'Last Payment', value: 'Loading...' },
    { label: 'Last Payment Date', value: 'Loading...' }
  ] : customerData ? [
    { label: 'Current Balance', value: `R ${customerData.outstandingTotalBalance.toLocaleString()}` },
    { label: 'Due Date', value: currentDueDate },
    { label: 'Last Payment', value: `R ${customerData.lastPaymentAmount.toLocaleString()}` },
    { label: 'Last Payment Date', value: formatFirestoreDate(customerData.lastPaymentDate.toString()) }
  ] : [
    { label: 'Current Balance', value: 'No data' },
    { label: 'Due Date', value: currentDueDate },
    { label: 'Last Payment', value: 'No data' },
    { label: 'Last Payment Date', value: 'No data' }
  ];

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        {currentView === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Settings preferences={preferences} onSave={handlePreferencesSave} />
          </motion.div>
        ) : currentView === 'account' ? (
          <motion.div
            key="account"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <UserAccount
              userName={userName}
              accountNumber={accountNumber}
              accountType={customerData?.accountType || 'N/A'}
              lastPaymentDate={customerData?.lastPaymentDate}
              lastAmountPaid={customerData?.lastPaymentAmount}
              arrangements={[
                {
                  accountNumber: accountNumber,
                  arrangementDate: "2024-03-15",
                  amountArranged: "1,200.00"
                }
              ]}
              preferences={preferences}
              onPreferencesSave={handlePreferencesSave}
            />
          </motion.div>
        ) : currentView === 'statements' ? (
          <motion.div
            key="statements"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Statement />
          </motion.div>
        ) : currentView === 'readings' ? (
          <motion.div
            key="readings"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <MeterReadings />
          </motion.div>
        ) : currentView === 'query' ? (
          <motion.div
            key="query"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <QueryForm />
          </motion.div>
        ) : currentView === 'payment' ? (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Payment />
          </motion.div>
        ) : currentView === 'activities' ? (
          <motion.div
            key="activities"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="bg-white dark:bg-dark-card shadow-sm rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 dark:text-white">Recent Activities</h2>
              <UserActivityComponent itemLimit={5} showPagination={true} />
            </div>
          </motion.div>
        ) : currentView === 'help' ? (
          <motion.div
            key="help"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <DashboardHelp 
              onNavigateToChangelog={() => setCurrentView('changelog')} 
            />
          </motion.div>
        ) : currentView === 'changelog' ? (
          <motion.div
            key="changelog"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <DashboardChangelog 
              onBackToHelp={() => setCurrentView('help')} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <>
              <div className="mb-8 mt-16 lg:mt-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{greeting}</h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
                {stats.map((stat, index) => (
                  <div key={index} className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{stat.value}</p>
                  </div>
                ))}
                <button 
                  onClick={() => setCurrentView('statements')}
                  className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">View Statement</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 mb-6">
                <button 
                  onClick={() => setCurrentView('payment')}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">Settle Account</span>
                </button>
                <button 
                  onClick={() => setCurrentView('payment')}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <HandshakeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">Make Arrangement</span>
                </button>
                <button
                  onClick={() => setCurrentView('readings')}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">Submit Reading</span>
                </button>
                <button
                  onClick={() => setCurrentView('query')}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">Log Query</span>
                </button>
                <button
                  onClick={() => setShowIndigentModal(true)}
                  className="flex flex-col items-center p-4 sm:p-6 bg-white dark:bg-dark-card rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
                  <span className="text-sm sm:text-base text-gray-900 dark:text-white mt-2">Apply for Indigent</span>
                </button>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
                <div className="bg-white dark:bg-dark-card shadow-sm rounded-lg">
                  <UserActivityComponent itemLimit={3} showPagination={false} />
                </div>
              </div>
            </>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex flex-col">
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-white dark:bg-dark-card shadow-md"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={onLogout}
        onNavigate={(view) => setCurrentView(view)}
      />

      <main className="lg:ml-64 transition-all duration-300 flex-grow">
        <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="animate-pulse">
              <div className="mb-8 mt-16 lg:mt-0">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-8">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-sm">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
      
      {showIndigentModal && (
        <IndigentApplication onClose={() => setShowIndigentModal(false)} />
      )}
      
      <footer className="lg:ml-64 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Powered By: {' '}
            <a 
              href="https://zimako.co.za/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-800 dark:hover:text-blue-400 transition-colors"
            >
              Zimako Group
            </a>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Version 1.0.0-beta3
          </div>
        </div>
      </footer>
    </div>
  );
}