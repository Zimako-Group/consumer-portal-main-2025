import React, { useState, useEffect, useRef } from 'react';
import { doc, collection, addDoc, onSnapshot, updateDoc, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, realtimeDb } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import AdminSidebar from './AdminSidebar';
import AccountsView from './AccountsView';
import CreateProfileModal from './CreateProfileModal';
import EditProfileModal from './EditProfileModal';
import DashboardOverview from './analytics/DashboardOverview';
import AdminReports from './AdminReports';
import AdminPaymentReminder from './AdminPaymentReminder';
import QueryManagement from './QueryManagement';
import AdminMeterReadings from './AdminMeterReadings';
import StatusIndicator from './StatusIndicator';
import AdminSettings from './AdminSettings';
import AdminHelp from './AdminHelp';
import NotificationBell from './NotificationBell';
import ChangeLog from './ChangeLog';
import { trackUserActivity } from '../utils/activityTracker';
import { Notification } from '../types/notification';
import SessionManager from '../utils/sessionManager';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  fullName: string;
  surname: string;
  idNumber: string;
  customerNumber: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
}

interface AdminDashboardProps {
  onLogout: () => void;
  userEmail: string;
  userName: string;
  department?: string;
}

function AdminDashboard({ onLogout, userEmail, userName, department }: AdminDashboardProps) {
  const { currentUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [userDepartment, setUserDepartment] = useState<string>(department || '');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const sessionManagerRef = useRef<SessionManager | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const presenceRef = ref(realtimeDb, `status/${currentUser.uid}`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      const status = snapshot.val();
      setIsOnline(status?.state === 'online');
      if (status?.lastChanged) {
        setLastActivity(new Date(status.lastChanged).toLocaleString());
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Initialize session timeout manager
  useEffect(() => {
    // Create session manager with 5 minute timeout
    sessionManagerRef.current = new SessionManager(handleSessionTimeout, 5 * 60 * 1000);
    
    // Start monitoring user activity
    sessionManagerRef.current.startMonitoring();
    
    console.log('AdminDashboard: Session timeout monitoring initialized');
    
    // Clean up on component unmount
    return () => {
      if (sessionManagerRef.current) {
        sessionManagerRef.current.stopMonitoring();
        console.log('AdminDashboard: Session timeout monitoring stopped on unmount');
      }
    };
  }, []);

  // Handle session timeout
  const handleSessionTimeout = async () => {
    console.log('AdminDashboard: Session timed out due to inactivity');
    
    // Track the timeout event
    if (currentUser?.uid) {
      try {
        await trackUserActivity(currentUser.uid, 'session', 'AdminDashboard', {
          action: 'timeout',
          reason: 'inactivity',
          duration: '5 minutes',
          userRole: 'admin',
          department: userDepartment
        });
      } catch (error) {
        console.error('Error tracking session timeout:', error);
      }
    }
    
    // Show a toast notification
    toast.error('Your session has expired due to inactivity. You will be logged out.');
    
    // Perform logout after a short delay to allow the toast to be seen
    setTimeout(async () => {
      await handleLogout();
    }, 1500);
  };

  // Replace the existing activity tracking with our SessionManager
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const updateActivity = () => {
      if (currentUser?.uid) {
        const presenceRef = ref(realtimeDb, `status/${currentUser.uid}`);
        updateDoc(doc(db, 'users', currentUser.uid), {
          lastActivity: new Date().toISOString(),
          currentView
        });
      }
      
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
      
      activityTimeout = setTimeout(() => {
        if (currentUser?.uid) {
          updateDoc(doc(db, 'users', currentUser.uid), {
            lastActivity: new Date().toISOString(),
            status: 'idle'
          });
        }
      }, 300000); 
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);

    updateActivity();

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
      if (activityTimeout) {
        clearTimeout(activityTimeout);
      }
    };
  }, [currentUser, currentView]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const fetchedProfiles = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Profile[];
      setProfiles(fetchedProfiles);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('No current user, skipping notification setup');
      return;
    }

    console.log('Setting up notification listener for user:', currentUser.uid);

    try {
      // First verify if we can read from the notifications collection
      const verifyNotificationsAccess = async () => {
        try {
          const notificationsRef = collection(db, 'notifications');
          // Try a simple query first
          const basicQuery = query(
            notificationsRef,
            where('recipientId', '==', currentUser.uid)
          );
          
          console.log('Testing basic notification query');
          const basicSnapshot = await getDocs(basicQuery);
          console.log('Basic query test result:', {
            empty: basicSnapshot.empty,
            size: basicSnapshot.size,
            exists: !basicSnapshot.empty
          });

          // If we have any notifications, log them
          if (!basicSnapshot.empty) {
            console.log('Found notifications in basic query:', 
              basicSnapshot.docs.map(doc => ({
                id: doc.id,
                data: doc.data()
              }))
            );
          }
        } catch (error) {
          console.error('Error in notification access test:', error);
        }
      };

      // Run our verification
      verifyNotificationsAccess();
      
      // Set up the actual notification listener
      const notificationsRef = collection(db, 'notifications');
      
      // Try setting up the listener without orderBy first
      const basicQuery = query(
        notificationsRef,
        where('recipientId', '==', currentUser.uid)
      );

      console.log('Setting up basic notification query');

      const unsubscribe = onSnapshot(basicQuery, 
        (snapshot) => {
          console.log('Notification snapshot received:', {
            size: snapshot.size,
            empty: snapshot.empty,
            docs: snapshot.docs.length
          });
          
          const newNotifications = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log('Processing notification:', {
              id: doc.id,
              data: data
            });
            return {
              id: doc.id,
              ...data
            };
          }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Notification[];

          console.log('Final processed notifications:', newNotifications);
          setNotifications(newNotifications);
          setHasUnreadNotifications(newNotifications.some(n => !n.read));
        },
        (error) => {
          console.error('Error in notification listener:', error);
          if (error.code === 'permission-denied') {
            console.error('Permission denied accessing notifications. Current user:', currentUser.uid);
          } else if (error.code === 'failed-precondition') {
            console.error('Missing index for notification query');
          }
          toast.error('Failed to load notifications');
        }
      );

      return () => {
        console.log('Cleaning up notification listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up notification listener:', error);
      toast.error('Failed to set up notifications');
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchUserDepartment = async () => {
      if (!currentUser?.uid) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserDepartment(userData.department || department || '');
        }
      } catch (error) {
        console.error('Error fetching user department:', error);
      }
    };

    fetchUserDepartment();
  }, [currentUser, department]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!currentUser?.uid || !notification.id) {
      console.log('Missing user or notification ID');
      return;
    }

    try {
      console.log('Handling notification click:', notification);

      // Update notification read status
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, {
        read: true
      });
      console.log('Marked notification as read');

      // Navigate to the query view and select the assigned query
      setCurrentView('queries');
      
      // Track activity
      if (currentUser?.uid) {
        trackUserActivity(currentUser.uid, 'notification', 'AdminDashboard', {
          action: 'view_notification',
          notificationId: notification.id,
          queryId: notification.queryId
        });
      }
      console.log('Activity tracked');
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!currentUser?.uid) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      const batch = db.batch();

      unreadNotifications.forEach(notification => {
        if (notification.id) {
          const notificationRef = doc(db, 'notifications', notification.id);
          batch.update(notificationRef, { read: true });
        }
      });

      await batch.commit();

      // Track activity
      if (currentUser?.uid) {
        trackUserActivity(currentUser.uid, 'notification', 'AdminDashboard', {
          action: 'mark_all_read',
          count: unreadNotifications.length
        });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleCreateProfile = async (profileData: Omit<Profile, 'id' | 'createdAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'profiles'), {
        ...profileData,
        createdAt: new Date().toISOString(),
      });
      if (currentUser?.uid) {
        trackUserActivity(currentUser.uid, 'create', 'AdminDashboard', { 
          action: 'create_profile',
          profileId: docRef.id 
        });
      }
      setIsCreateProfileModalOpen(false);
    } catch (error) {
      console.error('Error adding profile:', error);
    }
  };

  const handleEditProfile = (profile: Profile) => {
    if (currentUser?.uid) {
      trackUserActivity(currentUser.uid, 'edit', 'AdminDashboard', { 
        action: 'edit_profile',
        profileId: profile.id 
      });
    }
    setSelectedProfile(profile);
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async (updatedProfile: Profile) => {
    try {
      const profileRef = doc(db, 'profiles', updatedProfile.id);
      await updateDoc(profileRef, { ...updatedProfile });
      setIsEditProfileModalOpen(false);
      setSelectedProfile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const renderCurrentView = () => {
    // Track view changes
    if (currentUser?.uid) {
      trackUserActivity(currentUser.uid, 'navigation', 'AdminDashboard', { view: currentView });
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'reports':
        return <AdminReports />;
      case 'accounts':
        return (
          <AccountsView
            profiles={profiles}
            onCreateProfile={() => setIsCreateProfileModalOpen(true)}
            onEditProfile={handleEditProfile}
          />
        );
      case 'reminders':
        return <AdminPaymentReminder />;
      case 'queries':
        return <QueryManagement />;
      case 'meters':
        return <AdminMeterReadings />;
      case 'help':
        return <AdminHelp onNavigateToChangelog={() => setCurrentView('changelog')} />;
      case 'changelog':
        return <ChangeLog />;
      case 'settings':
        return <AdminSettings />;
      default:
        return <DashboardOverview />;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Initiating logout from AdminDashboard...');
      
      // Stop session monitoring
      if (sessionManagerRef.current) {
        sessionManagerRef.current.stopMonitoring();
      }
      
      // Call the onLogout prop function
      await onLogout();
      console.log('Logout successful');
      
      // Track logout activity
      if (currentUser?.uid) {
        await trackUserActivity(currentUser.uid, 'logout', 'AdminDashboard', {
          method: 'user_initiated',
          department: userDepartment
        });
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-dark-bg">
      <AdminSidebar 
        onNavigate={setCurrentView} 
        currentView={currentView} 
        onLogout={handleLogout}
        userName={userName}
      />
      
      <div className="lg:ml-64">
        <div className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <StatusIndicator isOnline={isOnline} />
                {lastActivity && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Last activity: {lastActivity}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {userEmail}
                </span>
                <NotificationBell 
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                />
                {userDepartment && (
                  <div className="flex items-center">
                    <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {userDepartment}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderCurrentView()}
        </main>
      </div>

      <CreateProfileModal
        isOpen={isCreateProfileModalOpen}
        onClose={() => setIsCreateProfileModalOpen(false)}
        onCreateProfile={handleCreateProfile}
      />

      {selectedProfile && (
        <EditProfileModal
          isOpen={isEditProfileModalOpen}
          onClose={() => {
            setIsEditProfileModalOpen(false);
            setSelectedProfile(null);
          }}
          onSave={handleSaveProfile}
          profile={selectedProfile}
        />
      )}
    </div>
  );
}

export default AdminDashboard;