import React from 'react';
import { HelpCircle, FileText, CreditCard, Activity, MessageSquare, User, LayoutDashboard, History } from 'lucide-react';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: 'new' | 'improvement' | 'fix';
    description: string;
  }[];
}

interface DashboardHelpProps {
  onNavigateToChangelog: () => void;
}

const changelogData: ChangelogEntry[] = [
  {
    version: '2.1.0',
    date: '18 Feb 2025',
    changes: [
      { type: 'new', description: 'Added Help Center with comprehensive guides' },
      { type: 'new', description: 'Introduced department-specific query routing' },
      { type: 'improvement', description: 'Enhanced dark mode support across all components' }
    ]
  },
  {
    version: '2.0.5',
    date: '10 Feb 2025',
    changes: [
      { type: 'improvement', description: 'Optimized payment processing speed' },
      { type: 'fix', description: 'Resolved statement download issues' },
      { type: 'new', description: 'Added real-time meter reading validation' }
    ]
  },
  {
    version: '2.0.0',
    date: '1 Feb 2025',
    changes: [
      { type: 'new', description: 'Complete UI redesign for better user experience' },
      { type: 'new', description: 'Introduced communication preferences management' },
      { type: 'improvement', description: 'Enhanced security measures' }
    ]
  }
];

export default function DashboardHelp({ onNavigateToChangelog }: DashboardHelpProps) {
  const helpSections = [
    {
      title: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-6 h-6 text-theme" />,
      description: 'View your account summary, recent activities, and important notifications at a glance.',
      tips: [
        'Check your current balance and due date',
        'Monitor recent transactions and activities',
        'View important announcements and notifications'
      ]
    },
    {
      title: 'Account Management',
      icon: <User className="w-6 h-6 text-theme" />,
      description: 'Manage your personal information and communication preferences.',
      tips: [
        'Update your contact information',
        'Set your preferred communication methods',
        'View and update your account details'
      ]
    },
    {
      title: 'Statements',
      icon: <FileText className="w-6 h-6 text-theme" />,
      description: 'Access and download your monthly statements.',
      tips: [
        'View monthly consumption history',
        'Download statements in PDF format',
        'Track billing history'
      ]
    },
    {
      title: 'Payments',
      icon: <CreditCard className="w-6 h-6 text-theme" />,
      description: 'Make payments and manage payment arrangements.',
      tips: [
        'Make secure online payments',
        'Set up payment arrangements',
        'View payment history'
      ]
    },
    {
      title: 'Meter Readings',
      icon: <Activity className="w-6 h-6 text-theme" />,
      description: 'Submit and track your meter readings.',
      tips: [
        'Submit monthly meter readings',
        'View reading history',
        'Understand consumption patterns'
      ]
    },
    {
      title: 'Query Management',
      icon: <MessageSquare className="w-6 h-6 text-theme" />,
      description: 'Submit and track queries or issues.',
      tips: [
        'Submit new queries',
        'Track query status',
        'View resolution messages'
      ]
    }
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <HelpCircle className="w-16 h-16 text-theme mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Help Center
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Welcome to our help center. Find information about using the portal features below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {helpSections.map((section, index) => (
          <div
            key={index}
            className="bg-white dark:bg-dark-card rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              {section.icon}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white ml-3">
                {section.title}
              </h2>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {section.description}
            </p>
            <ul className="space-y-2">
              {section.tips.map((tip, tipIndex) => (
                <li key={tipIndex} className="flex items-start">
                  <span className="text-theme mr-2">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center space-y-6">
        <button
          onClick={onNavigateToChangelog}
          className="inline-flex items-center px-6 py-3 bg-theme text-white rounded-full hover:bg-theme/90 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-transform"
        >
          <History className="w-5 h-5 mr-2" />
          View Changelog
        </button>

        <p className="text-gray-600 dark:text-gray-300">
          Need more help? Contact our support team at{' '}
          <a
            href="mailto:support@mohokare.gov.za"
            className="text-theme hover:underline"
          >
            support@mohokare.gov.za
          </a>
        </p>
      </div>
    </div>
  );
}
