import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import yebopayLogo from '../assets/bank-logos/yebopay-logo.png';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import PaymentModal from './PaymentModal';
import CardPaymentForm from './CardPaymentForm';

const PaymentConfirmation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const accountNo = searchParams.get('account_no');
  const customerName = searchParams.get('name');
  const amount = searchParams.get('amount');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCardPaymentOpen, setIsCardPaymentOpen] = useState(false);

  const handleSettleAccount = () => {
    setIsPaymentModalOpen(true);
  };

  const handleCardPayment = () => {
    setIsPaymentModalOpen(false);
    setIsCardPaymentOpen(true);
  };

  const handleEFTOptions = () => {
    // For EFT, we'll show the bank details section and close the modal
    setIsPaymentModalOpen(false);
    // Scroll to bank details section smoothly
    const bankDetailsSection = document.querySelector('.bank-details-section');
    if (bankDetailsSection) {
      bankDetailsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePaymentArrangement = () => {
    if (!currentUser) {
      // Store the return URL in sessionStorage
      sessionStorage.setItem('redirectAfterLogin', '/dashboard?tab=payments&action=arrangement');
      setIsAuthModalOpen(true);
    } else {
      // User is logged in, redirect to dashboard payment section
      navigate('/dashboard?tab=payments&action=arrangement');
    }
  };

  const handleBillingIssue = () => {
    if (!currentUser) {
      // Store the return URL in sessionStorage
      sessionStorage.setItem('redirectAfterLogin', '/dashboard?tab=query&action=billing');
      setIsAuthModalOpen(true);
    } else {
      // User is logged in, redirect to dashboard query section
      navigate('/dashboard?tab=query&action=billing');
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthModalOpen(false);
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    if (redirectUrl) {
      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block mb-4">
          <img 
            src={yebopayLogo}
            alt="YeboPay Logo"
            className="h-12 w-auto object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Mohokare Local Municipality</h2>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left Side - Customer Details */}
          <div className="flex-1 p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <h3 className="text-xl font-semibold mb-6 text-blue-100">Customer Details</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-blue-200">Account Number</label>
                <div className="mt-1 text-lg font-semibold">{accountNo}</div>
              </div>
              
              <div>
                <label className="block text-sm text-blue-200">Account Holder</label>
                <div className="mt-1 text-lg font-semibold">{customerName}</div>
              </div>
              
              <div>
                <label className="block text-sm text-blue-200">Outstanding Amount</label>
                <div className="mt-1 text-3xl font-bold">R {amount}</div>
              </div>
            </div>
          </div>

          {/* Right Side - Municipality Banking Details */}
          <div className="flex-1 p-8 bg-gray-50 bank-details-section">
            <h3 className="text-xl font-semibold mb-6 text-gray-900">Municipality Banking Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600">Bank Name</label>
                <div className="mt-1 text-lg font-medium text-gray-900">ABSA Bank</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600">Account Number</label>
                <div className="mt-1 text-lg font-medium text-gray-900">4052 654 487</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600">Branch Code</label>
                <div className="mt-1 text-lg font-medium text-gray-900">632 005</div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-600">Reference</label>
                <div className="mt-1 text-lg font-medium text-gray-900">{accountNo}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={handleSettleAccount}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-sm transition-colors duration-200"
            >
              Settle Account
            </button>
            
            <button
              onClick={handlePaymentArrangement}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors duration-200"
            >
              Payment Arrangements
            </button>
            
            <button
              onClick={handleBillingIssue}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors duration-200"
            >
              Report Billing Issue
            </button>
          </div>
        </div>
      </div>

      {/* Close Button */}
      <div className="mt-6 text-center">
        <button
          onClick={() => window.close()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Close Window
        </button>
      </div>

      {/* AuthModal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialView="login"
      />

      {/* PaymentModal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onCardPayment={handleCardPayment}
        onEFTOptions={handleEFTOptions}
      />

      {/* CardPaymentForm */}
      <CardPaymentForm
        isOpen={isCardPaymentOpen}
        onClose={() => setIsCardPaymentOpen(false)}
        amount={amount || '0'}
      />
    </div>
  );
};

export default PaymentConfirmation;