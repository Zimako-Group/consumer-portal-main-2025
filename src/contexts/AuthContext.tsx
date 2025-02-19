import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { initializePresence, setUserOffline } from '../utils/presence';
import AdminPasswordChangeModal from '../components/AdminPasswordChangeModal';
import toast from 'react-hot-toast';
import { trackUserActivity } from '../utils/activityTracker'; // Assuming trackUserActivity is defined in this file

interface AuthContextType {
  currentUser: User | null;
  userData: any | null;
  loading: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  logout: async () => {},
  login: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      const userData = userDoc.data();

      // Track login activity
      await trackUserActivity(
        userCredential.user.uid,
        'login',
        'AuthContext',
        {
          email: email,
          timestamp: new Date().toISOString(),
          role: userData?.role || 'user'
        }
      );

      if (userData?.role === 'admin' && userData?.hasChangedPassword === false) {
        console.log('Showing password change modal for:', email);
        setLoginEmail(email);
        setShowPasswordChangeModal(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        await setUserOffline(uid);
      }
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  useEffect(() => {
    let presenceCleanup: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          // Check for admin requiring password change
          if (userData?.role === 'admin' && userData?.hasChangedPassword === false) {
            console.log('Auth state changed: showing password modal for:', user.email);
            setLoginEmail(user.email || '');
            setShowPasswordChangeModal(true);
          }

          // Update last login time
          await updateDoc(doc(db, 'users', user.uid), {
            lastLogin: new Date().toISOString()
          });

          // Initialize presence system
          presenceCleanup = initializePresence(user.uid);
          
          setCurrentUser({ ...user, role: userData?.role || 'user' });
          setUserData(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setCurrentUser(null);
          setUserData(null);
        }
      } else {
        if (presenceCleanup) {
          await presenceCleanup();
        }
        setCurrentUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => {
      if (presenceCleanup) {
        presenceCleanup();
      }
      unsubscribe();
    };
  }, []);

  const handlePasswordChangeSuccess = () => {
    console.log('Password change successful');
    setShowPasswordChangeModal(false);
    toast.success('Password changed successfully');
  };

  const value = {
    currentUser,
    userData,
    loading,
    logout,
    login
  };

  return (
    <AuthContext.Provider value={value}>
      {showPasswordChangeModal && loginEmail && (
        <AdminPasswordChangeModal
          isOpen={showPasswordChangeModal}
          onClose={() => {
            console.log('Closing password modal');
            setShowPasswordChangeModal(false);
            logout(); // Force logout if they don't change password
          }}
          email={loginEmail}
          onPasswordChangeSuccess={handlePasswordChangeSuccess}
        />
      )}
      {!loading && children}
    </AuthContext.Provider>
  );
}