import React from 'react';
import { Sun, Moon, LayoutDashboard, User, FileText, CreditCard, Activity, MessageSquare, LogOut, Settings, Clock, Home, DollarSign, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import sidebarLogo from '../assets/sidebar-logo.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ isOpen, onClose, onLogout, onNavigate }: SidebarProps) {
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    { icon: <Home size={15} />, label: 'Dashboard', path: 'dashboard' },
    { icon: <User size={15} />, label: 'My Account', path: 'account' },
    { icon: <FileText size={15} />, label: 'Statements', path: 'statements' },
    { icon: <CreditCard size={15} />, label: 'Payment', path: 'payment' },
    { icon: <Activity size={15} />, label: 'Meter Readings', path: 'readings' },
    { icon: <Clock size={15} />, label: 'Activities', path: 'activities' },
    { icon: <MessageSquare size={15} />, label: 'Query', path: 'query' },
    { icon: <HelpCircle size={15} />, label: 'Help', path: 'help' },
    { icon: <Settings size={15} />, label: 'Settings', path: 'settings' },
  ];

  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100 z-40' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-bg transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <img
                src={sidebarLogo}
                alt="Mohokare Municipality"
                className="h-12 w-auto object-contain"
                />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-hover transition-colors"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-theme" />
                ) : (
                  <Moon className="w-5 h-5 text-theme" />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <nav className="px-2 py-3">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-base transition-colors
                    ${false
                      ? 'bg-theme text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors group"
            >
              <span className="text-gray-500 dark:text-gray-400 group-hover:text-theme">
                <LogOut size={20} />
              </span>
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}