import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Star, Bug, Zap, Trash2, Plus } from 'lucide-react';

interface ChangeLogEntry {
  version: string;
  date: string;
  featured?: boolean;
  introMessage?: string; // Optional introductory message
  changes: {
    type: 'added' | 'fixed' | 'changed' | 'removed';
    description: string;
    important?: boolean;
  }[];
}

const changeLogData: ChangeLogEntry[] = [
  {
    version: '1.0.0-beta3',
    date: 'February 17, 2025',
    featured: true,
    introMessage: "Major improvements to Query Management System! 🎉",
    changes: [
      { type: 'added', description: 'New Query Assignment system with admin user selection', important: true },
      { type: 'added', description: 'Real-time query status tracking and updates' },
      { type: 'added', description: 'Comprehensive notification system to admin dashboard users' },
      { type: 'fixed', description: 'Query filtering and sorting functionality' },
      { type: 'fixed', description: 'Admin user selection in assignment modal' },
      { type: 'changed', description: 'Enhanced table UI with improved pagination and filtering' },
    ]
  },
  {
    version: '1.0.0-beta2',
    date: 'November 19, 2024',
    featured: true,
    changes: [
      { type: 'added', description: 'Dark mode support with seamless transitions', important: true },
      { type: 'added', description: 'Added React Hot Toast notifications ' },
      { type: 'added', description: 'Advanced dashboard analytics with real-time updates' },
      { type: 'fixed', description: 'Mobile navigation responsiveness and touch interactions' },
      { type: 'changed', description: 'Optimized database queries for faster performance' },
    ]
  },
  {
    version: '1.0.0-beta1',
    date: 'November 17, 2024',
    changes: [
      { type: 'added', description: 'Theme color customization with preset palettes', important: true },
      { type: 'changed', description: 'Enhanced UI performance with React memo and useMemo' },
      { type: 'fixed', description: 'Data loading and caching mechanisms' },
      { type: 'removed', description: 'Legacy reporting system' },
    ]
  },
  {
    version: '1.0.0-beta',
    date: 'November 15, 2024',
    featured: true,
    introMessage: "Initial beta release of Zimako Consumer Portal v1.0! Lots more coming soon though 😁",
    changes: [
      { type: 'added', description: 'Initial release with core functionality', important: true },
      { type: 'added', description: 'Comprehensive dashboard with key metrics' },
      { type: 'added', description: 'Secure user authentication and authorization' },
    ]
  }
];

const ChangeLog: React.FC = () => {
  const { isDarkMode, themeColor } = useTheme();
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="w-4 h-4" />;
      case 'fixed':
        return <Bug className="w-4 h-4" />;
      case 'changed':
        return <Zap className="w-4 h-4" />;
      case 'removed':
        return <Trash2 className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'added':
        return 'bg-green-100/10 text-green-400';
      case 'fixed':
        return 'bg-blue-100/10 text-blue-400';
      case 'changed':
        return 'bg-yellow-100/10 text-yellow-400';
      case 'removed':
        return 'bg-red-100/10 text-red-400';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
          Changelog
        </h1>
        <p className={`mt-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
          Track our progress and latest improvements
        </p>
      </div>

      <div className="space-y-6">
        {changeLogData.map((release) => (
          <motion.div
            key={release.version}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative ${
              isDarkMode ? 'bg-dark-card' : 'bg-white'
            } rounded-lg shadow-sm overflow-hidden`}
          >
            {/* Version header */}
            <button
              onClick={() => setExpandedVersion(
                expandedVersion === release.version ? null : release.version
              )}
              className={`w-full p-6 text-left transition-colors duration-200 ${
                isDarkMode ? 'hover:bg-dark-hover' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {release.featured && (
                    <Star
                      className={`w-5 h-5 text-gold animate-glow`}
                      style={{ color: '#FFD700' }}
                    />
                  )}
                  <div>
                    <h2 className={`text-xl font-semibold ${
                      isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'
                    }`}>
                      Version {release.version}
                    </h2>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'
                    }`}>
                      {release.date}
                    </p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedVersion === release.version ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className={`w-5 h-5 ${
                    isDarkMode ? 'text-dark-text-secondary' : 'text-gray-400'
                  }`} />
                </motion.div>
              </div>
            </button>

            {/* Changes list */}
            <AnimatePresence>
              {expandedVersion === release.version && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-6 pb-6">
                    <div className="space-y-4 pt-4">
                      {release.introMessage && (
                        <p className={`text-sm font-bold ${
                          isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'
                        }`}>
                          {release.introMessage}
                        </p>
                      )}
                      {release.changes.map((change, index) => (
                        <motion.div
                          key={index}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-3"
                        >
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTypeStyles(change.type)}`}>
                            {getTypeIcon(change.type)}
                            <span className="ml-1 capitalize">{change.type}</span>
                          </span>
                          <p className={`flex-1 text-sm ${
                            isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'
                          }`}>
                            {change.description}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ChangeLog;