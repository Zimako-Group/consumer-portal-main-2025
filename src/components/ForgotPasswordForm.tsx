import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBack: () => void;
  onResetRequest: (email: string) => Promise<void>;
}

export default function ForgotPasswordForm({ onBack, onResetRequest }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      // Call the onResetRequest function which now uses Firebase Auth
      await onResetRequest(email);
      setSuccessMessage('Password reset link has been sent to your email');
      setEmail('');
    } catch (err: any) {
      // Handle Firebase specific errors
      if (err?.code === 'auth/user-not-found') {
        setError('No account found with this email address');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many password reset attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
      console.error('Password reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <ArrowLeft size={20} />
          <span>Back to login</span>
        </button>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
        <p className="mt-2 text-gray-600">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg">
            {successMessage}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme"
            placeholder="Enter your email"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-theme text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}