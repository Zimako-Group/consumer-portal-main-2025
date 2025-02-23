import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from './components/LoadingSpinner';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

// Lazy load components
const Navbar = lazy(() => import('./components/Navbar'));
const Hero = lazy(() => import('./components/Hero'));
const Features = lazy(() => import('./components/Features'));
const BillingControl = lazy(() => import('./components/BillingControl'));
const QuerySection = lazy(() => import('./components/QuerySection'));
const SecuritySection = lazy(() => import('./components/SecuritySection'));
const CTASection = lazy(() => import('./components/CTASection'));
const Footer = lazy(() => import('./components/Footer'));
const ScrollToTop = lazy(() => import('./components/ScrollToTop'));
const FAQ = lazy(() => import('./components/FAQ'));
const Contact = lazy(() => import('./components/Contact'));
const About = lazy(() => import('./components/About'));
const FooterService = lazy(() => import('./components/FooterService'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const SuperAdminDashboard = lazy(() => import('./components/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const CustomerDashboard = lazy(() => import('./components/CustomerDashboard'));
const StatementGenerator = lazy(() => import('./components/StatementGenerator'));
const PaymentConfirmation = lazy(() => import('./components/PaymentConfirmation'));
const TrainingPage = lazy(() => import('./pages/train-model'));
const ModelTester = lazy(() => import('./chatbot-data/ModelTester'));
const ChatInterface = lazy(() => import('./chatbot-data/ChatInterface'));
const FloatingHelpButton = lazy(() => import('./components/FloatingHelpButton'));

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

  const handleLoginSuccess = (email: string) => {
    setIsLoggedIn(true);
    console.log('Login successful:', email);
  };

  const handleNewUserSignup = (email: string, name: string) => {
    console.log('New user signup:', email, name);
  };

  const LandingPage = () => (
    <Suspense fallback={<LoadingSpinner />}>
      <>
        <Navbar
          onLoginSuccess={handleLoginSuccess}
          onNewUserSignup={handleNewUserSignup}
        />
        <FloatingHelpButton onClick={() => {}} />
        <main className="flex flex-col min-h-screen">
          <Hero />
          <Features />
          <BillingControl />
          <QuerySection />
          <SecuritySection />
          <CTASection />
          <FAQ />
          <Contact />
          <About />
          <FooterService />
          <Footer />
          <ScrollToTop />
        </main>
      </>
    </Suspense>
  );

  const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    return isLoggedIn ? element : <Navigate to="/" />;
  };

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <ScrollToTop />
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
          {isLoading ? (
            <LoadingSpinner />
          ) : (
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
                  <Suspense fallback={<LoadingSpinner />}>
                    <>
                      <Navbar
                        onLoginSuccess={handleLoginSuccess}
                        onNewUserSignup={handleNewUserSignup}
                      />
                      <FooterService />
                      <Footer />
                      <ScrollToTop />
                    </>
                  </Suspense>
                }
              />
              
              <Route
                path="/about"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <>
                      <Navbar
                        onLoginSuccess={handleLoginSuccess}
                        onNewUserSignup={handleNewUserSignup}
                      />
                      <About />
                      <Footer />
                      <ScrollToTop />
                    </>
                  </Suspense>
                }
              />
              
              <Route
                path="/faq"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <>
                      <Navbar
                        onLoginSuccess={handleLoginSuccess}
                        onNewUserSignup={handleNewUserSignup}
                      />
                      <FAQ />
                      <Footer />
                      <ScrollToTop />
                    </>
                  </Suspense>
                }
              />
              
              <Route
                path="/contact"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <>
                      <Navbar
                        onLoginSuccess={handleLoginSuccess}
                        onNewUserSignup={handleNewUserSignup}
                      />
                      <Contact />
                      <Footer />
                      <ScrollToTop />
                    </>
                  </Suspense>
                }
              />

              <Route
                path="/dashboard/*"
                element={
                  <PrivateRoute
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        {!currentUser ? (
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
                      </Suspense>
                    }
                  />
                }
              />

              <Route
                path="/train-model"
                element={
                  <PrivateRoute
                    element={
                      <Suspense fallback={<LoadingSpinner />}>
                        {currentUser?.role === 'superadmin' ? (
                          <TrainingPage />
                        ) : (
                          <Navigate to="/dashboard" />
                        )
                      }
                      </Suspense>
                    }
                  />
                }
              />
            </Routes>
          )}
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default App;