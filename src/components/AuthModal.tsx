import React, { useState } from 'react';
import { X } from 'lucide-react';
import { signIn, signUp } from '../services/authService';
import ForgotPasswordForm from './ForgotPasswordForm';
import AccountNumberInput from './AccountNumberInput';
import PasswordInput, { isPasswordValid } from './PasswordInput';
import { verifyCustomerAccount } from '../services/customerService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'login' | 'signup';
  onLoginSuccess: (email: string) => void;
  onNewUserSignup: (email: string, name: string) => void;
}

type View = 'login' | 'signup' | 'forgot-password';

interface FormErrors {
  fullName?: string;
  email?: string;
  idNumber?: string;
  cellphone?: string;
  accountNumber?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const WelcomeMessage = () => (
  <div className="bg-theme/10 p-6 rounded-lg">
    <h3 className="text-xl font-bold text-theme mb-4">Welcome to Mohokare Municipality</h3>
    <p className="text-gray-800 mb-4">Access your municipal services with ease:</p>
    <ul className="space-y-2 text-gray-700">
      <li>✓ Check your municipal statement</li>
      <li>✓ Pay your account</li>
      <li>✓ Submit meter readings</li>
      <li>✓ Log queries online</li>
      <li>✓ Available 24/7 for your convenience</li>
    </ul>
  </div>
);

export default function AuthModal({
  isOpen,
  onClose,
  initialView = 'login',
  onLoginSuccess,
  onNewUserSignup
}: AuthModalProps) {
  const [view, setView] = useState<View>(initialView);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    idNumber: '',
    cellphone: '',
    accountNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [isAccountValid, setIsAccountValid] = useState(false);
  const [customerName, setCustomerName] = useState<string>('');
  const [verificationMessage, setVerificationMessage] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'fullName':
        return !value ? 'Full name is required' : '';
      case 'email':
        return !value
          ? 'Email is required'
          : !/\S+@\S+\.\S+/.test(value)
          ? 'Invalid email format'
          : '';
      case 'idNumber':
        return !value
          ? 'ID Number is required'
          : !/^\d{13}$/.test(value)
          ? 'ID Number must be exactly 13 digits'
          : '';
      case 'cellphone':
        return !value
          ? 'Cellphone number is required'
          : !/^\d{10}$/.test(value)
          ? 'Invalid cellphone number'
          : '';
      case 'accountNumber':
        return !value ? 'Account number is required' : !isAccountValid ? 'Invalid account number' : '';
      case 'password':
        return !value
          ? 'Password is required'
          : !isPasswordValid(value)
          ? 'Password does not meet requirements'
          : '';
      case 'confirmPassword':
        return !value
          ? 'Please confirm your password'
          : value !== formData.password
          ? 'Passwords do not match'
          : '';
      default:
        return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'idNumber' && value.length > 13) return;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value)
    }));
  };

  const handleAccountNumberChange = async (value: string) => {
    setFormData(prev => ({ ...prev, accountNumber: value }));
    
    if (value.length > 0) {
      const result = await verifyCustomerAccount(value);
      setIsAccountValid(result.isValid);
      
      if (result.isValid && result.customerName) {
        setCustomerName(result.customerName);
        setVerificationMessage(`Verified: ${result.customerName}`);
      } else {
        setCustomerName('');
        setVerificationMessage(result.error || 'Invalid account number');
      }
    } else {
      setIsAccountValid(false);
      setCustomerName('');
      setVerificationMessage('');
    }
    
    setErrors(prev => ({
      ...prev,
      accountNumber: validateField('accountNumber', value)
    }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: FormErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0 && isAccountValid) {
      try {
        await signUp(
          formData.email,
          formData.password,
          formData.fullName,
          formData.accountNumber
        );
        
        // Clear form and show success message
        setFormData({
          fullName: '',
          email: '',
          idNumber: '',
          cellphone: '',
          accountNumber: '',
          password: '',
          confirmPassword: ''
        });
        
        onNewUserSignup(formData.email, formData.fullName);
        setView('login');
      } catch (error) {
        console.error('Signup error:', error);
        setErrors(prev => ({
          ...prev,
          general: 'Error creating account. Please try again.'
        }));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);

    try {
      const userData = await signIn(loginEmail, loginPassword);
      console.log('Login successful:', userData);
      onLoginSuccess(userData.email);
      onClose();
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetRequest = (email: string) => {
    console.log('Password reset requested for:', email);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-end p-4">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {view === 'forgot-password' ? (
              <ForgotPasswordForm
                onBack={() => setView('login')}
                onResetRequest={handleResetRequest}
              />
            ) : view === 'login' ? (
              <>
                <h2 className="text-3xl font-bold text-gray-900">Login</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                  {loginError && (
                    <div className="bg-red-50 text-red-500 p-3 rounded-lg">
                      {loginError}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme"
                      placeholder="Enter your email"
                    />
                  </div>
                  <PasswordInput
                    value={loginPassword}
                    onChange={(value) => setLoginPassword(value)}
                    name="loginPassword"
                    label="Password"
                    placeholder="Enter your password"
                    showRequirements={false}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setView('forgot-password')}
                      className="text-theme hover:opacity-90 text-sm"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-theme text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </button>
                  <p className="text-center text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setView('signup')}
                      className="text-theme hover:opacity-90"
                    >
                      Sign up
                    </button>
                  </p>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-900">Sign Up</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-theme focus:border-theme ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-theme focus:border-theme ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">ID Number</label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-theme focus:border-theme ${
                        errors.idNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your 13-digit ID number"
                      maxLength={13}
                    />
                    {errors.idNumber && (
                      <p className="mt-1 text-sm text-red-500">{errors.idNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cellphone Number</label>
                    <input
                      type="text"
                      name="cellphone"
                      value={formData.cellphone}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-theme focus:border-theme ${
                        errors.cellphone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your cellphone number"
                    />
                    {errors.cellphone && (
                      <p className="mt-1 text-sm text-red-500">{errors.cellphone}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => handleAccountNumberChange(e.target.value)}
                      className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm ${
                        isAccountValid ? 'border-green-500' : errors.accountNumber ? 'border-red-500' : ''
                      }`}
                    />
                    {verificationMessage && (
                      <p className={`mt-2 text-sm ${isAccountValid ? 'text-green-600' : 'text-red-600'}`}>
                        {verificationMessage}
                      </p>
                    )}
                  </div>

                  <PasswordInput
                    value={formData.password}
                    onChange={(value) => 
                      handleInputChange({ 
                        target: { name: 'password', value } 
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                    name="password"
                    label="Password"
                    error={errors.password}
                    placeholder="Create a password"
                    showRequirements={true}
                  />

                  <PasswordInput
                    value={formData.confirmPassword}
                    onChange={(value) =>
                      handleInputChange({
                        target: { name: 'confirmPassword', value }
                      } as React.ChangeEvent<HTMLInputElement>)
                    }
                    name="confirmPassword"
                    label="Confirm Password"
                    error={errors.confirmPassword}
                    placeholder="Confirm your password"
                    showRequirements={false}
                  />

                  {errors.general && (
                    <p className="mt-2 text-sm text-red-600">{errors.general}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-theme text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity mt-6"
                  >
                    Sign Up
                  </button>

                  <p className="text-center text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setView('login')}
                      className="text-theme hover:opacity-90"
                    >
                      Login
                    </button>
                  </p>
                </form>
              </>
            )}
          </div>
          <div>
            <WelcomeMessage />
          </div>
        </div>
      </div>
    </div>
  );
}