import React, { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Database,
  Mail,
  Phone,
  Lock,
  Save,
  RefreshCw,
  Sliders
} from 'lucide-react';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

export default function AdminSettings() {
  const [activeSection, setActiveSection] = useState('account');
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [notificationSMS, setNotificationSMS] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  const AccountSettings = (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Account Management</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Admin Email
          </label>
          <input
            type="email"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Contact Number
          </label>
          <input
            type="tel"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="+27 123 456 789"
          />
        </div>
      </div>
    </div>
  );

  const NotificationSettings = (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notification Preferences</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">Email Notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-theme/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme"></div>
          </label>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">SMS Notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={notificationSMS}
              onChange={(e) => setNotificationSMS(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-theme/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const SecuritySettings = (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Security Settings</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">Two-Factor Authentication</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={twoFactorAuth}
              onChange={(e) => setTwoFactorAuth(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-theme/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme"></div>
          </label>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-theme hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme">
          Change Password
        </button>
      </div>
    </div>
  );

  const BackupSettings = (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Backup & Data Management</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">Automatic Backup</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={autoBackup}
              onChange={(e) => setAutoBackup(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-theme/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-theme"></div>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Backup Frequency
          </label>
          <select
            value={backupFrequency}
            onChange={(e) => setBackupFrequency(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-theme focus:ring-theme sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-theme hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme">
          Backup Now
        </button>
      </div>
    </div>
  );

  const sections: SettingsSection[] = [
    {
      id: 'account',
      title: 'Account Management',
      icon: <User className="w-5 h-5" />,
      component: AccountSettings,
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      component: NotificationSettings,
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield className="w-5 h-5" />,
      component: SecuritySettings,
    },
    {
      id: 'backup',
      title: 'Backup & Data',
      icon: <Database className="w-5 h-5" />,
      component: BackupSettings,
    },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Navigation */}
          <div className="w-full md:w-64 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === section.id
                    ? 'bg-theme text-white'
                    : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {section.icon}
                <span className="text-gray-900 dark:text-white">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {sections.find((section) => section.id === activeSection)?.component}
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="mt-6 flex justify-end">
          <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-theme hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
