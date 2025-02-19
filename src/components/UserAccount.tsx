import React from 'react';
import { Calendar, DollarSign, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { logUserActivity } from '../utils/activity';

interface UserAccountProps {
  userName: string;
  accountNumber: string;
  lastPaymentDate: string;
  lastAmountPaid: string;
  accountType: string;
  preferences: {
    sms: { enabled: boolean; value: string };
    whatsapp: { enabled: boolean; value: string };
    email: { enabled: boolean; value: string };
  };
  onPreferencesSave: (preferences: {
    sms: { enabled: boolean; value: string };
    whatsapp: { enabled: boolean; value: string };
    email: { enabled: boolean; value: string };
  }) => void;
}

export default function UserAccount({
  userName,
  accountNumber,
  lastPaymentDate,
  lastAmountPaid,
  accountType,
  preferences,
  onPreferencesSave
}: UserAccountProps) {
  const { currentUser } = useAuth();
  const [localPreferences, setLocalPreferences] = React.useState(preferences);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  const handlePreferenceChange = (type: 'sms' | 'whatsapp' | 'email', field: 'enabled' | 'value', value: boolean | string) => {
    setLocalPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  const validatePreferences = () => {
    const validators = {
      email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      sms: (value: string) => /^\+?[\d\s-]{10,}$/.test(value),
      whatsapp: (value: string) => /^\+?[\d\s-]{10,}$/.test(value)
    };

    return Object.entries(localPreferences).every(([key, value]) => {
      if (value.enabled) {
        return validators[key as keyof typeof validators](value.value);
      }
      return true;
    });
  };

  const getChangedPreferences = () => {
    const changes: string[] = [];
    if (localPreferences.sms.enabled !== preferences.sms.enabled || 
        (localPreferences.sms.enabled && localPreferences.sms.value !== preferences.sms.value)) {
      changes.push('SMS');
    }
    if (localPreferences.whatsapp.enabled !== preferences.whatsapp.enabled || 
        (localPreferences.whatsapp.enabled && localPreferences.whatsapp.value !== preferences.whatsapp.value)) {
      changes.push('WhatsApp');
    }
    if (localPreferences.email.enabled !== preferences.email.enabled || 
        (localPreferences.email.enabled && localPreferences.email.value !== preferences.email.value)) {
      changes.push('Email');
    }
    return changes;
  };

  const handleSavePreferences = async () => {
    if (!currentUser) {
      toast.error('Please log in to update preferences');
      return;
    }

    if (!validatePreferences()) {
      toast.error('Please check your input values. Email should be valid and phone numbers should be at least 10 digits.');
      return;
    }

    setIsSaving(true);
    try {
      await onPreferencesSave(localPreferences);
      
      const changedMethods = getChangedPreferences();
      if (changedMethods.length > 0) {
        await logUserActivity(
          currentUser.uid,
          'COMMUNICATION_UPDATE',
          `Updated communication preferences: ${changedMethods.join(', ')}`,
          {
            smsEnabled: localPreferences.sms.enabled,
            whatsappEnabled: localPreferences.whatsapp.enabled,
            emailEnabled: localPreferences.email.enabled,
            changedMethods
          }
        );
      }
      
      toast.success('Communication preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">User Profile</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Name:</span>
            <span className="font-medium text-gray-900 dark:text-white">{userName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
            <span className="font-medium text-gray-900 dark:text-white">{accountNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Account Type:</span>
            <span className="font-medium text-gray-900 dark:text-white">{accountType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Last Payment Date:</span>
            <span className="font-medium text-gray-900 dark:text-white">{lastPaymentDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Last Amount Paid:</span>
            <span className="font-medium text-gray-900 dark:text-white">R {lastAmountPaid}</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Select Preferred Communication Method(s)</h2>
        <div className="space-y-6">
          {/* SMS Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localPreferences.sms.enabled}
                  onChange={(e) => handlePreferenceChange('sms', 'enabled', e.target.checked)}
                  className="w-4 h-4 text-theme border-gray-300 rounded focus:ring-theme"
                />
                <label className="text-gray-700 dark:text-gray-300">SMS Notifications</label>
              </div>
            </div>
            {localPreferences.sms.enabled && (
              <input
                type="tel"
                value={localPreferences.sms.value}
                onChange={(e) => handlePreferenceChange('sms', 'value', e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-1 focus:ring-theme"
              />
            )}
          </div>

          {/* WhatsApp Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localPreferences.whatsapp.enabled}
                  onChange={(e) => handlePreferenceChange('whatsapp', 'enabled', e.target.checked)}
                  className="w-4 h-4 text-theme border-gray-300 rounded focus:ring-theme"
                />
                <label className="text-gray-700 dark:text-gray-300">WhatsApp Notifications</label>
              </div>
            </div>
            {localPreferences.whatsapp.enabled && (
              <input
                type="tel"
                value={localPreferences.whatsapp.value}
                onChange={(e) => handlePreferenceChange('whatsapp', 'value', e.target.value)}
                placeholder="Enter WhatsApp number"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-1 focus:ring-theme"
              />
            )}
          </div>

          {/* Email Preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localPreferences.email.enabled}
                  onChange={(e) => handlePreferenceChange('email', 'enabled', e.target.checked)}
                  className="w-4 h-4 text-theme border-gray-300 rounded focus:ring-theme"
                />
                <label className="text-gray-700 dark:text-gray-300">Email Notifications</label>
              </div>
            </div>
            {localPreferences.email.enabled && (
              <input
                type="email"
                value={localPreferences.email.value}
                onChange={(e) => handlePreferenceChange('email', 'value', e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-1 focus:ring-theme"
              />
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="px-4 py-2 bg-theme text-white rounded-md hover:bg-theme/90 focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}