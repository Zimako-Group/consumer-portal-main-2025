import React, { useState } from 'react';
import { 
  ChevronRight, 
  Search, 
  Book, 
  Lightbulb, 
  Sparkles, 
  LayoutDashboard,
  Users,
  MessageSquare,
  Bell,
  FileBarChart,
  Gauge,
  Settings,
  ArrowRight,
  Star,
  Compass,
  History
} from 'lucide-react';
import ChangeLog from './ChangeLog';

const pulsingButtonClass = `
  relative inline-flex items-center px-4 py-2 rounded-full 
  bg-pink-100 dark:bg-pink-900/30 
  text-pink-600 dark:text-pink-300 
  text-sm font-medium 
  hover:bg-pink-200 dark:hover:bg-pink-900/50 
  transition-colors
  group
  animate-none
  hover:animate-none
  before:absolute
  before:inset-0
  before:rounded-full
  before:bg-pink-400/30
  before:animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]
  before:opacity-75
  dark:before:bg-pink-400/20
`;

interface HelpSection {
  title: string;
  content: string;
  icon?: React.ReactNode;
  color: string;
  subsections?: {
    title: string;
    content: string;
  }[];
}

interface AdminHelpProps {
  onNavigateToChangelog?: () => void;
}

const helpContent: HelpSection[] = [
  {
    title: 'Dashboard Overview',
    content: 'The dashboard provides a comprehensive view of your system\'s key metrics and activities.',
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: 'from-violet-500 to-purple-500',
    subsections: [
      {
        title: 'Key Metrics',
        content: 'View important statistics including total accounts, active queries, and payment status.'
      },
      {
        title: 'Activity Feed',
        content: 'Monitor recent activities and changes in real-time.'
      }
    ]
  },
  {
    title: 'Account Management',
    content: 'Manage customer profiles and account information.',
    icon: <Users className="w-6 h-6" />,
    color: 'from-emerald-500 to-teal-500',
    subsections: [
      {
        title: 'Creating Accounts',
        content: 'Create new customer profiles by clicking the "Create Profile" button and filling in the required information.'
      },
      {
        title: 'Editing Accounts',
        content: 'Edit existing accounts by clicking the edit icon next to any account in the accounts list.'
      }
    ]
  },
  {
    title: 'Query Management',
    content: 'Handle customer queries and support tickets efficiently.',
    icon: <MessageSquare className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-500',
    subsections: [
      {
        title: 'Query Status',
        content: 'Track and update query statuses (Open, Active, Resolved) using the status change options.'
      },
      {
        title: 'Assigning Queries',
        content: 'Assign queries to specific team members for resolution using the assign button.'
      }
    ]
  },
  {
    title: 'Payment Reminders',
    content: 'Manage payment notifications and reminders.',
    icon: <Bell className="w-6 h-6" />,
    color: 'from-orange-500 to-red-500',
    subsections: [
      {
        title: 'Setting Reminders',
        content: 'Create and schedule payment reminders for customers with outstanding balances.'
      },
      {
        title: 'Reminder Templates',
        content: 'Use pre-defined templates or create custom messages for payment reminders.'
      }
    ]
  },
  {
    title: 'Reports',
    content: 'Generate and view various system reports.',
    icon: <FileBarChart className="w-6 h-6" />,
    color: 'from-yellow-500 to-green-500',
    subsections: [
      {
        title: 'Available Reports',
        content: 'Access different report types including account summaries, query statistics, and payment history.'
      },
      {
        title: 'Export Options',
        content: 'Export reports in different formats (PDF, CSV) for further analysis.'
      }
    ]
  },
  {
    title: 'Meter Readings',
    content: 'Manage and track customer meter readings.',
    icon: <Gauge className="w-6 h-6" />,
    color: 'from-cyan-500 to-blue-500',
    subsections: [
      {
        title: 'Recording Readings',
        content: 'Input and update meter readings for customer accounts.'
      },
      {
        title: 'Reading History',
        content: 'View historical meter readings and consumption patterns.'
      }
    ]
  },
  {
    title: 'Settings',
    content: 'Configure system preferences and user settings.',
    icon: <Settings className="w-6 h-6" />,
    color: 'from-gray-500 to-gray-700',
    subsections: [
      {
        title: 'User Preferences',
        content: 'Customize your dashboard experience including theme and notification preferences.'
      },
      {
        title: 'System Settings',
        content: 'Configure global system settings and parameters.'
      }
    ]
  }
];

const AdminHelp: React.FC<AdminHelpProps> = ({ onNavigateToChangelog }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showChangelog, setShowChangelog] = useState(false);

  const filteredContent = helpContent.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.subsections?.some(sub =>
      sub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleChangelogClick = () => {
    if (onNavigateToChangelog) {
      onNavigateToChangelog();
    } else {
      setShowChangelog(true);
    }
  };

  if (showChangelog) {
    return <ChangeLog />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Hero Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-purple-500 via-pink-500 to-orange-500 opacity-10 blur-3xl"></div>
          <div className="relative">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 text-sm font-medium">
                    <Compass className="w-4 h-4 mr-2" />
                    Help Center
                  </div>
                  <button
                    onClick={handleChangelogClick}
                    className={pulsingButtonClass}
                  >
                    <History className="w-4 h-4 mr-2" />
                    <span className="relative z-10">View Changelog</span>
                  </button>
                </div>
                <h1 className="text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                  How can we help you <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">succeed</span>?
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300">
                  Explore our guides and documentation to make the most of your admin dashboard
                </p>
                <div className="relative max-w-xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search for help..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
              <div className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl rotate-3 scale-95 opacity-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl -rotate-3 scale-95 opacity-10"></div>
                <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl">
                  <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="aspect-square rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 p-4 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 opacity-20"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: <Sparkles />, title: 'Quick Start', desc: 'Get started with essential features', gradient: 'from-amber-500 to-orange-500' },
            { icon: <Book />, title: 'Best Practices', desc: 'Learn recommended workflows', gradient: 'from-emerald-500 to-teal-500' },
            { icon: <Star />, title: 'Pro Tips', desc: 'Discover advanced features', gradient: 'from-blue-500 to-indigo-500' }
          ].map((card, idx) => (
            <div key={idx} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300`}></div>
              <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                    {React.cloneElement(card.icon as React.ReactElement, {
                      className: `w-6 h-6 ${card.gradient.includes('amber') ? 'text-amber-500' : 
                        card.gradient.includes('emerald') ? 'text-emerald-500' : 'text-blue-500'}`
                    })}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{card.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300">{card.desc}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Topics</h2>
              </div>
              <nav className="p-2">
                {filteredContent.map((section, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSection(section.title)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedSection === section.title
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedSection === section.title
                          ? 'bg-purple-100 dark:bg-purple-800/30'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {section.icon}
                      </div>
                      <span className="font-medium">{section.title}</span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Display */}
          <div className="lg:col-span-9">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              {selectedSection ? (
                <div className="p-8">
                  {filteredContent.map((section, index) => (
                    section.title === selectedSection && (
                      <div key={index} className="space-y-8">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${section.color} bg-opacity-10`}>
                            {section.icon}
                          </div>
                          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                            {section.title}
                          </h2>
                        </div>
                        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                          {section.content}
                        </p>
                        
                        {section.subsections && (
                          <div className="grid gap-6 mt-8">
                            {section.subsections.map((subsection, subIndex) => (
                              <div 
                                key={subIndex}
                                className="group relative"
                              >
                                <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-0 group-hover:opacity-5 rounded-xl transition-opacity duration-300`}></div>
                                <div className="relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
                                  <div className="flex items-start space-x-4">
                                    <div className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                                      <ChevronRight className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        {subsection.title}
                                      </h3>
                                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                        {subsection.content}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="inline-block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4">
                    <Compass className="w-12 h-12 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-xl text-gray-500 dark:text-gray-400">
                    Select a topic from the sidebar to view help content
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHelp;
