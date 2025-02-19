import React, { useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { X, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminPasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onPasswordChangeSuccess: () => void;
}

interface PasswordRequirement {
  regex: RegExp;
  label: string;
  met: boolean;
}

export default function AdminPasswordChangeModal({
  isOpen,
  onClose,
  email,
  onPasswordChangeSuccess
}: AdminPasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);

  const passwordRequirements: PasswordRequirement[] = [
    { regex: /.{8,}/, label: 'At least 8 characters', met: false },
    { regex: /[A-Z]/, label: 'One uppercase letter', met: false },
    { regex: /[a-z]/, label: 'One lowercase letter', met: false },
    { regex: /[0-9]/, label: 'One number', met: false },
    { regex: /[!@#$%^&*]/, label: 'One special character (!@#$%^&*)', met: false }
  ];

  const [requirements, setRequirements] = useState(passwordRequirements);

  useEffect(() => {
    const updatedRequirements = requirements.map(req => ({
      ...req,
      met: req.regex.test(newPassword)
    }));
    setRequirements(updatedRequirements);
  }, [newPassword]);

  const allRequirementsMet = requirements.every(req => req.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (!allRequirementsMet) {
      toast.error('Please meet all password requirements');
      return;
    }

    setLoading(true);
    try {
      // First, verify the current password by signing in
      const userCredential = await signInWithEmailAndPassword(auth, email, currentPassword);
      
      // Update the password
      await updatePassword(userCredential.user, newPassword);
      
      // Update the user document to mark password as changed
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        hasChangedPassword: true
      });

      onPasswordChangeSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Change Your Password
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          As a new admin user, you need to change your password before continuing.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setShowRequirements(true);
              }}
              onFocus={() => setShowRequirements(true)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter new password"
            />
            {showRequirements && !allRequirementsMet && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password Requirements:
                </p>
                <ul className="space-y-1">
                  {requirements.map((req, index) => (
                    <li
                      key={index}
                      className={`flex items-center text-sm ${
                        req.met ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {req.met ? (
                        <Check className="w-4 h-4 mr-2" />
                      ) : (
                        <X className="w-4 h-4 mr-2" />
                      )}
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !allRequirementsMet}
            className={`w-full py-2 px-4 rounded-md text-white font-medium ${
              loading || !allRequirementsMet
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors duration-200`}
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
