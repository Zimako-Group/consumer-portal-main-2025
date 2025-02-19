import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
      await auth.signOut();
      setIsLoggedIn(false);
      setCurrentUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLoginSuccess = async (email: string) => {
    console.log('Login success for:', email);
  };

  const handleNewUserSignup = async (email: string, name: string) => {
    console.log('New user signup:', email, name);
  };

  const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    return isLoggedIn ? element : <Navigate to="/" />;
  };

  if (isLoading && !currentUser && !isLoggedIn) {
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
              element={isLoggedIn ? <Navigate to="/dashboard" /> : (
                <div className="flex flex-col min-h-screen">
                  <Navbar
                    onLoginSuccess={handleLoginSuccess}
                    onNewUserSignup={handleNewUserSignup}
                  />
                  <main>
                    <Hero />
                    <Features />
                    <BillingControl />
                    <QuerySection />
                    <SecuritySection />
                    <CTASection />
                  </main>
                  <Footer />
                  <ScrollToTop />
                </div>
              )}
            />
            <Route
              path="/services"
              element={
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <FooterService />
                  <Footer />
                  <ScrollToTop />
                </div>
              }
            />
            <Route
              path="/about"
              element={
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <About />
                  <Footer />
                  <ScrollToTop />
                </div>
              }
            />
            <Route
              path="/faq"
              element={
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <FAQ />
                  <Footer />
                  <ScrollToTop />
                </div>
              }
            />
            <Route
              path="/contact"
              element={
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <Contact />
                  <Footer />
                  <ScrollToTop />
                </div>
              }
            />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute
                  element={
                    currentUser?.role === 'superadmin' ? (
                      <SuperAdminDashboard
                        onLogout={handleLogout}
                        userEmail={currentUser.email}
                        userName={currentUser.name}
                      />
                    ) : currentUser?.role === 'admin' ? (
                      <AdminDashboard
                        onLogout={handleLogout}
                        userEmail={currentUser.email}
                        userName={currentUser.name}
                        department={currentUser.department}
                      />
                    ) : (
                      <Dashboard
                        onLogout={handleLogout}
                        userEmail={currentUser.email}
                        userName={currentUser.name}
                        accountNumber={currentUser.accountNumber}
                      />
                    )
                  }
                />
              }
            />
            <Route path="/statement" element={<StatementGenerator />} />
            <Route path="/payment/confirm" element={<PaymentConfirmation />} />
            <Route path="/train-model" element={<TrainingPage />} />
            <Route path="/test-model" element={<ModelTester />} />
            <Route path="/model-chat" element={<ChatInterface />} />
          </Routes>
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;