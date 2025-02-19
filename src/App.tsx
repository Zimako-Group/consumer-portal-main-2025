import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import BillingControl from './components/BillingControl';
import QuerySection from './components/QuerySection';
import SecuritySection from './components/SecuritySection';
import CTASection from './components/CTASection';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import FAQ from './components/FAQ';
import Contact from './components/Contact';
import About from './components/About';
import FooterService from './components/FooterService';
import Dashboard from './components/Dashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AdminDashboard from './components/AdminDashboard';
import CustomerDashboard from './components/CustomerDashboard';
import LoadingSpinner from './components/LoadingSpinner';
import StatementGenerator from './components/StatementGenerator';
import PaymentConfirmation from './components/PaymentConfirmation';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import TrainingPage from './pages/train-model';
import ModelTester from './chatbot-data/ModelTester';
import ChatInterface from './chatbot-data/ChatInterface';
import toast from 'react-hot-toast';

interface User {
  email: string;
  name: string;
  role: 'user' | 'superadmin' | 'admin' | 'customer';
  accountNumber?: string;
  department?: string;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          console.log('User authenticated:', user.uid);
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User data from Firestore:', userData);
            
            // Ensure account number is properly formatted
            const formattedAccountNumber = userData.accountNumber ? userData.accountNumber.trim() : '';
            console.log('Formatted account number:', formattedAccountNumber);
            
            setCurrentUser({
              email: userData.email,
              name: userData.fullName || userData.name,
              role: userData.role || 'user',
              accountNumber: formattedAccountNumber,
              department: userData.department,
            });
            setIsLoggedIn(true);
          } else {
            console.error('User document not found in Firestore');
            setIsLoggedIn(false);
            setCurrentUser(null);
          }
        } else {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsLoggedIn(false);
        setCurrentUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      setIsLoading(true);
      await auth.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
      console.log('Logout successful, redirecting to home...');
      // Clear any stored state if needed
      localStorage.removeItem('lastView');
      sessionStorage.clear();
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Force a reload to ensure clean state
      window.location.href = '/';
      
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error logging out. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (email: string) => {
    console.log('Login success for:', email);
    toast.success('Logged in successfully');
  };

  const handleNewUserSignup = async (email: string, name: string) => {
    console.log('New user signup:', email, name);
  };

  const LandingPage = () => (
    <>
      <Navbar
        onLoginSuccess={handleLoginSuccess}
        onNewUserSignup={handleNewUserSignup}
      />
      <main className="flex flex-col min-h-screen">
        <Hero />
        <Features />
        <BillingControl />
        <QuerySection />
        <SecuritySection />
        <CTASection />
        <Footer />
        <ScrollToTop />
      </main>
    </>
  );

  const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    return isLoggedIn ? element : <Navigate to="/" />;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#333',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route
              path="/"
              element={
                isLoggedIn ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <LandingPage />
                )
              }
            />
            
            <Route
              path="/services"
              element={
                <>
                  <Navbar
                    onLoginSuccess={handleLoginSuccess}
                    onNewUserSignup={handleNewUserSignup}
                  />
                  <FooterService />
                  <Footer />
                  <ScrollToTop />
                </>
              }
            />
            
            <Route
              path="/about"
              element={
                <>
                  <Navbar
                    onLoginSuccess={handleLoginSuccess}
                    onNewUserSignup={handleNewUserSignup}
                  />
                  <About />
                  <Footer />
                  <ScrollToTop />
                </>
              }
            />
            
            <Route
              path="/faq"
              element={
                <>
                  <Navbar
                    onLoginSuccess={handleLoginSuccess}
                    onNewUserSignup={handleNewUserSignup}
                  />
                  <FAQ />
                  <Footer />
                  <ScrollToTop />
                </>
              }
            />
            
            <Route
              path="/contact"
              element={
                <>
                  <Navbar
                    onLoginSuccess={handleLoginSuccess}
                    onNewUserSignup={handleNewUserSignup}
                  />
                  <Contact />
                  <Footer />
                  <ScrollToTop />
                </>
              }
            />

            <Route
              path="/dashboard/*"
              element={
                <PrivateRoute
                  element={
                    !currentUser ? (
                      <Navigate to="/" />
                    ) : currentUser.role === 'superadmin' ? (
                      <SuperAdminDashboard onLogout={handleLogout} />
                    ) : currentUser.role === 'admin' ? (
                      <AdminDashboard
                        onLogout={handleLogout}
                        userEmail={currentUser.email || ''}
                        userName={currentUser.name || ''}
                        department={currentUser.department || ''}
                      />
                    ) : currentUser.role === 'customer' ? (
                      <CustomerDashboard 
                        onLogout={handleLogout}
                        userEmail={currentUser.email || ''}
                        userName={currentUser.name || ''}
                        accountNumber={currentUser.accountNumber || ''}
                      />
                    ) : (
                      <Dashboard 
                        onLogout={handleLogout}
                        userEmail={currentUser.email || ''}
                        userName={currentUser.name || ''}
                        accountNumber={currentUser.accountNumber || ''}
                      />
                    )
                  }
                />
              }
            />

            <Route
              path="/train-model"
              element={
                <PrivateRoute
                  element={
                    currentUser?.role === 'superadmin' ? (
                      <TrainingPage />
                    ) : (
                      <Navigate to="/dashboard" />
                    )
                  }
                />
              }
            />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;