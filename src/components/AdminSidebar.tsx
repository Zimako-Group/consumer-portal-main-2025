import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileBarChart,
  Users,
  Bell,
  MessageSquare,
  Gauge,
  Settings,
  Menu,
  X,
  LogOut,
  HelpCircle,
  MessageCircle
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import sidebarLogo from '../assets/sidebar-logo.png';

interface SidebarItem {
  name: string;
  icon: React.ReactNode;
  view: string;
}

interface AdminSidebarProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onLogout: () => void;
  userName: string;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, view: 'dashboard' },
  { name: 'Reports', icon: <FileBarChart className="w-5 h-5" />, view: 'reports' },
  { name: 'Accounts', icon: <Users className="w-5 h-5" />, view: 'accounts' },
  { name: 'Payment Reminders', icon: <Bell className="w-5 h-5" />, view: 'reminders' },
  { name: 'Queries', icon: <MessageSquare className="w-5 h-5" />, view: 'queries' },
  { name: 'Meter Readings', icon: <Gauge className="w-5 h-5" />, view: 'meters' },
  { name: 'WhatsApp', icon: <MessageCircle className="w-5 h-5" />, view: 'whatsapp' },
  { name: 'Help', icon: <HelpCircle className="w-5 h-5" />, view: 'help' },
  { name: 'Settings', icon: <Settings className="w-5 h-5" />, view: 'settings' },
];

function AdminSidebar({ onNavigate, currentView, onLogout, userName }: AdminSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-dark-card shadow-md"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6 dark:text-dark-text-primary" /> : <Menu className="w-6 h-6 dark:text-dark-text-primary" />}
      </button>

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-dark-card shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b dark:border-dark-border flex items-center justify-between">
        <img
                src={sidebarLogo}
                alt="Mohokare Municipality"
                className="h-12 w-auto object-contain"
                />
          <ThemeToggle isDark={isDarkTheme} onToggle={toggleTheme} />
        </div>

        <nav className="mt-6 px-3 flex-grow">
          <ul className="space-y-1">
            {sidebarItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => {
                    onNavigate(item.view);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${
                    currentView === item.view
                      ? 'text-theme dark:text-theme-dark'
                      : 'text-gray-700 dark:text-dark-text-primary hover:text-theme dark:hover:text-theme-dark'
                  }`}
                >
                  <span className="text-theme dark:text-theme-dark">{item.icon}</span>
                  <span className="ml-3">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Version info */}
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
          version 1.0.0-beta3
        </div>

        <div className="border-t dark:border-dark-border p-4">
          {/* Logout button */}
          <button
            onClick={onLogout}
            className="w-full flex items-center px-4 py-3 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

export default AdminSidebar;