import { useState, useEffect } from 'react';
import { Sun, Moon, User, FileText, CreditCard, Activity, MessageSquare, LogOut, Settings, Clock, Home, HelpCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import sidebarLogo from '../assets/sidebar-logo.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onNavigate: (view: string) => void;
}

export default function Sidebar({ isOpen, onClose, onLogout, onNavigate }: SidebarProps) {
  const { isDarkMode: isDark, toggleTheme } = useTheme();
  const [activeItem, setActiveItem] = useState('dashboard');
  
  // Set active item based on URL path on component mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('dashboard')) setActiveItem('dashboard');
    else if (path.includes('account')) setActiveItem('account');
    else if (path.includes('statements')) setActiveItem('statements');
    // Add other path checks as needed
  }, []);

  const menuItems = [
    { icon: <Home size={16} />, label: 'Dashboard', path: 'dashboard' },
    { icon: <User size={16} />, label: 'My Account', path: 'account' },
    { icon: <FileText size={16} />, label: 'Statements', path: 'statements' },
    { icon: <CreditCard size={16} />, label: 'Payment', path: 'payment' },
    { icon: <Activity size={16} />, label: 'Meter Readings', path: 'readings' },
    { icon: <Clock size={16} />, label: 'Activities', path: 'activities' },
    { icon: <MessageSquare size={16} />, label: 'Query', path: 'query' },
    { icon: <HelpCircle size={16} />, label: 'Help', path: 'help' },
    { icon: <Settings size={16} />, label: 'Settings', path: 'settings' },
  ];

  const handleNavigation = (path: string) => {
    setActiveItem(path);
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
        className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-white to-gray-50 dark:from-dark-bg dark:to-gray-900 shadow-xl transform transition-transform duration-200 ease-in-out z-50 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex-1 relative">
                <div className="absolute -left-1 -top-1 w-12 h-12 bg-blue-500/20 rounded-full blur-md"></div>
                <img
                src={sidebarLogo}
                alt="Mohokare Municipality"
                className="h-12 w-auto object-contain relative z-10"
                />
              </div>
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-500" />
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            <nav className="px-2 py-1 space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 relative group
                    ${activeItem === item.path
                      ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                    }`}
                >
                  <div className={`p-1.5 rounded-md ${activeItem === item.path ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                    <div className={activeItem === item.path ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}>
                      {item.icon}
                    </div>
                  </div>
                  <span>{item.label}</span>
                  {activeItem === item.path && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-3 mt-1 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={onLogout}
              className="flex items-center w-full px-3 py-2 text-gray-700 dark:text-gray-200 rounded-lg text-sm bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/30 transition-all duration-200 group shadow-sm hover:shadow"
            >
              <div className="p-1.5 rounded-md bg-red-100 dark:bg-red-900/30 mr-2 group-hover:scale-110 transition-transform duration-200">
                <LogOut size={16} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}