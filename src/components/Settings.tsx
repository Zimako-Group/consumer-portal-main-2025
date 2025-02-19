import React from 'react';
import { Sun, Moon, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { isDark, toggleTheme, themeColor, setThemeColor } = useTheme();

  const themeColors = [
    { id: 'orange', label: 'Orange Theme', color: 'rgb(234, 88, 12)' },
    { id: 'blue', label: 'Blue Theme', color: 'rgba(39, 200, 245, 0.8)' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h2>
      
      <div className="space-y-6">
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
                  {isDark ? (
                    <Moon className="w-5 h-5 text-theme" />
                  ) : (
                    <Sun className="w-5 h-5 text-theme" />
                  )}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-theme focus:ring-offset-2"
                  style={{ backgroundColor: isDark ? 'var(--theme-color)' : '#D1D5DB' }}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isDark ? 'translate-x-5' : 'translate-x-0'
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