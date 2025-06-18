import { useState } from 'react';
import { Sun, Moon, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { CommunicationPreferences } from '../types';

// CommunicationPreferences now imported from ../types

interface SettingsProps {
  preferences: CommunicationPreferences;
  onSave: (newPreferences: CommunicationPreferences) => Promise<void>;
}

export default function Settings({ preferences, onSave }: SettingsProps) {
  const { isDarkMode, toggleTheme, themeColor, setThemeColor } = useTheme();
  const [localPreferences, setLocalPreferences] = useState<CommunicationPreferences>(preferences);
  const [isSaving, setIsSaving] = useState(false);

  const themeColors = [
    { id: 'orange', label: 'Orange Theme', color: 'rgb(234, 88, 12)' },
    { id: 'blue', label: 'Blue Theme', color: 'rgba(39, 200, 245, 0.8)' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
      
      <div className="space-y-6">
        {/* Communication Preferences */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-sm mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Communication Preferences</h3>
          
          <div className="space-y-4">
            {/* Email Preferences */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-gray-900 dark:text-white text-sm font-medium">
                  Email Notifications
                </label>
                <button
                  onClick={() => setLocalPreferences(prev => ({
                    ...prev,
                    email: { ...prev.email, enabled: !prev.email.enabled }
                  }))}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2"
                  style={{ backgroundColor: localPreferences.email.enabled ? 'var(--theme-color)' : '#D1D5DB' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      localPreferences.email.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <input
                type="email"
                value={localPreferences.email.value}
                onChange={(e) => setLocalPreferences((prev: CommunicationPreferences) => ({
                  ...prev,
                  email: { ...prev.email, value: e.target.value }
                }))}
                className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-card text-gray-900 dark:text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-theme transition-colors"
                placeholder="your@email.com"
              />
            </div>
            
            {/* SMS Preferences */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-gray-900 dark:text-white text-sm font-medium">
                  SMS Notifications
                </label>
                <button
                  onClick={() => setLocalPreferences(prev => ({
                    ...prev,
                    sms: { ...prev.sms, enabled: !prev.sms.enabled }
                  }))}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2"
                  style={{ backgroundColor: localPreferences.sms.enabled ? 'var(--theme-color)' : '#D1D5DB' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      localPreferences.sms.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <input
                type="tel"
                value={localPreferences.sms.value}
                onChange={(e) => setLocalPreferences((prev: CommunicationPreferences) => ({
                  ...prev,
                  sms: { ...prev.sms, value: e.target.value }
                }))}
                className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-card text-gray-900 dark:text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-theme transition-colors"
                placeholder="+27 123 456 7890"
              />
            </div>
            
            {/* WhatsApp Preferences */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-gray-900 dark:text-white text-sm font-medium">
                  WhatsApp Notifications
                </label>
                <button
                  onClick={() => setLocalPreferences(prev => ({
                    ...prev,
                    whatsapp: { ...prev.whatsapp, enabled: !prev.whatsapp.enabled }
                  }))}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2"
                  style={{ backgroundColor: localPreferences.whatsapp.enabled ? 'var(--theme-color)' : '#D1D5DB' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      localPreferences.whatsapp.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <input
                type="tel"
                value={localPreferences.whatsapp.value}
                onChange={(e) => setLocalPreferences((prev: CommunicationPreferences) => ({
                  ...prev,
                  whatsapp: { ...prev.whatsapp, value: e.target.value }
                }))}
                className="mt-2 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-card text-gray-900 dark:text-white py-2 px-3 focus:outline-none focus:ring-2 focus:ring-theme transition-colors"
                placeholder="+27 123 456 7890"
              />
            </div>
            
            <div className="pt-4">
              <button
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await onSave(localPreferences);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-lg bg-theme text-white hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-theme"
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-dark-card p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Appearance</h3>
          
          <div className="space-y-8">
            {/* Theme Color Selector */}
            <div>
              <label className="text-gray-900 dark:text-white text-sm font-medium mb-2 block">
                Theme Color
              </label>
              <div className="relative mt-2">
                <select
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value as 'orange' | 'blue')}
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-card text-gray-900 dark:text-white py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-theme transition-colors"
                >
                  {themeColors.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Choose your preferred color scheme for the dashboard
              </p>
            </div>

            {/* Theme Mode Toggle */}
            <div>
              <label className="text-gray-900 dark:text-white text-sm font-medium mb-2 block">
                Theme Mode
              </label>
              <div className="mt-2 flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-hover rounded-lg">
                <div className="flex items-center space-x-2">
                  {isDarkMode ? (
                    <Moon className="w-5 h-5 text-theme" />
                  ) : (
                    <Sun className="w-5 h-5 text-theme" />
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2"
                  style={{ backgroundColor: isDarkMode ? 'var(--theme-color)' : '#D1D5DB' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDarkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Switch between light and dark display modes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}