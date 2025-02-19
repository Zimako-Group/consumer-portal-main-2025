import React, { useEffect } from 'react';
import { History, ArrowLeft, Sparkles, Zap, Wrench } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'new' | 'improvement' | 'fix';
    description: string;
  }[];
}

const changelogData: ChangelogEntry[] = [
  {
    version: '1.0.0-beta3',
    date: '18 Feb 2025',
    changes: [
      { type: 'new', description: 'Added comprehensive Help Center with user guides' },
      { type: 'new', description: 'Introduced department-specific query routing system' },
      { type: 'new', description: 'Added changelog tracking system' },
      { type: 'improvement', description: 'Enhanced query form with department color indicators' },
      { type: 'improvement', description: 'Improved mobile responsiveness across all components' }
    ]
  },
  {
    version: '1.0.0-beta2',
    date: '10 Feb 2025',
    changes: [
      { type: 'improvement', description: 'Enhanced user authentication system' },
      { type: 'improvement', description: 'Optimized data loading performance' },
      { type: 'fix', description: 'Resolved customer data fetching issues' },
      { type: 'new', description: 'Added dark mode support' }
    ]
  },
  {
    version: '1.0.0-beta1',
    date: '1 Feb 2025',
    changes: [
      { type: 'new', description: 'Initial beta release' },
      { type: 'new', description: 'Basic query management system' },
      { type: 'new', description: 'Customer account dashboard' },
      { type: 'new', description: 'Payment and statement viewing functionality' }
    ]
  }
];

interface DashboardChangelogProps {
  onBackToHelp: () => void;
}

export default function DashboardChangelog({ onBackToHelp }: DashboardChangelogProps) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const getChangeTypeIcon = (type: 'new' | 'improvement' | 'fix') => {
    switch (type) {
      case 'new':
        return <Sparkles className="w-4 h-4" />;
      case 'improvement':
        return <Zap className="w-4 h-4" />;
      case 'fix':
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getChangeTypeColor = (type: 'new' | 'improvement' | 'fix') => {
    switch (type) {
      case 'new':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'improvement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'fix':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="mb-4 sm:mb-8 flex justify-between items-center">
        <button
          onClick={onBackToHelp}
          className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:text-theme dark:hover:text-theme transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Back to Help Center
        </button>
      </div>

      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-theme/10 mb-3 sm:mb-4">
          <History className="w-6 h-6 sm:w-8 sm:h-8 text-theme" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-4">
          Changelog
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4">
          Track our latest updates and improvements
        </p>
      </div>

      <div className="space-y-6 sm:space-y-12">
        {changelogData.map((entry, index) => (
          <div
            key={index}
            className="relative bg-white dark:bg-dark-card rounded-xl shadow-sm p-4 sm:p-6 transition-all hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                <span className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-theme/10">
                  <span className="text-base sm:text-lg font-semibold text-theme">{entry.version.split('.')[0]}</span>
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                    Version {entry.version}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    Released on {entry.date}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {entry.changes.map((change, changeIndex) => (
                <div
                  key={changeIndex}
                  className="flex flex-col sm:flex-row sm:items-start p-3 rounded-lg bg-gray-50 dark:bg-dark-hover transition-colors"
                >
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mb-2 sm:mb-0 sm:mr-3 ${getChangeTypeColor(change.type)}`}>
                    {getChangeTypeIcon(change.type)}
                    <span className="ml-1.5">{change.type}</span>
                  </span>
                  <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 flex-1">
                    {change.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Mobile date display */}
            <div className="block sm:hidden mt-4 pt-3 border-t dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Released on {entry.date}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile-friendly bottom spacing */}
      <div className="h-4 sm:h-8"></div>
    </div>
  );
}
