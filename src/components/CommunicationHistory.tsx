import React, { useState, useEffect } from 'react';
import { X, Mail, MessageCircle, Clock, Calendar, Search, CheckCheck, AlertCircle } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';

interface Communication {
  id: string;
  type: 'sms' | 'email' | 'whatsapp';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed';
  recipient: string;
  sender: string;
}

interface CommunicationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  accountNumber: string;
  accountHolderName: string;
}

export default function CommunicationHistory({
  isOpen,
  onClose,
  accountNumber,
  accountHolderName,
}: CommunicationHistoryProps) {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'sms' | 'email' | 'whatsapp'>('all');
  const { isDarkMode } = useTheme();

  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        const q = query(
          collection(db, 'communications'),
          where('accountNumber', '==', accountNumber),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const comms = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate()
        })) as Communication[];
        setCommunications(comms);
      } catch (error) {
        console.error('Error fetching communications:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchCommunications();
    }
  }, [isOpen, accountNumber]);

  const filteredCommunications = communications.filter(comm => {
    const matchesSearch = comm.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || comm.type === filter;
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-5 h-5 text-blue-500" />;
      case 'sms':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case 'whatsapp':
        return <MessageCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-blue-500';
      case 'delivered':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const groupCommunicationsByDate = (communications: Communication[]) => {
    const groups = communications.reduce((acc, comm) => {
      const date = format(comm.timestamp, 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(comm);
      return acc;
    }, {} as Record<string, Communication[]>);

    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCheck className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className={`relative w-full max-w-4xl h-[80vh] ${isDarkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow-xl flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`p-6 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <span className="relative">
                  Communication History
                  <div className={`absolute -bottom-1 left-0 w-1/2 h-1 rounded-full ${isDarkMode ? 'bg-blue-500' : 'bg-blue-600'}`}></div>
                </span>
              </h2>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-2`}>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {accountHolderName}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                  {accountNumber}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-full hover:bg-gray-700/50 hover:text-red-400 transition-all duration-200 ease-in-out transform hover:scale-110 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Filter */}
          <div className="mt-6 flex gap-4">
            <div className="flex-1 relative group">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} group-hover:text-blue-500 transition-colors duration-200`} />
              <input
                type="text"
                placeholder="Search communications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border-2 transition-all duration-200 outline-none ${
                  isDarkMode 
                    ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500/50' 
                    : 'bg-white border-gray-200 focus:border-blue-500/30'
                } focus:ring-2 focus:ring-blue-500/20`}
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className={`px-4 py-3 rounded-xl border-2 outline-none appearance-none bg-no-repeat bg-right pr-10 cursor-pointer transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800/50 border-gray-700 text-white focus:border-blue-500/50' 
                  : 'bg-white border-gray-200 focus:border-blue-500/30'
              } focus:ring-2 focus:ring-blue-500/20`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${isDarkMode ? '%23718096' : '%236B7280'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="all">All Types</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
        </div>

        {/* Communication List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Loading communications...
              </p>
            </div>
          ) : filteredCommunications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 p-6">
              <div className={`p-4 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <MessageCircle className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No communications found
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                {searchQuery ? 'Try adjusting your search or filters' : 'No messages in the history yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {groupCommunicationsByDate(filteredCommunications).map(([date, comms]) => (
                <div key={date} className="px-6 py-4">
                  <div className="sticky top-0 z-10 -mx-6 px-6 py-2">
                    <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-3">
                    {comms.map((comm) => (
                      <div
                        key={comm.id}
                        className={`group p-4 rounded-xl border-2 transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700 hover:border-blue-500/30' 
                            : 'bg-white border-gray-100 hover:border-blue-500/20'
                        } hover:shadow-lg hover:shadow-blue-500/5`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-xl ${
                            isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                          } transition-colors group-hover:bg-blue-500/10`}>
                            {getTypeIcon(comm.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-x-4">
                              <div>
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {comm.type.toUpperCase()}
                                </p>
                                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap break-words`}>
                                  {comm.content}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <Clock className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {format(comm.timestamp, 'HH:mm')}
                                  </span>
                                </div>
                                <div className={`mt-2 flex items-center gap-1 text-sm ${getStatusColor(comm.status)}`}>
                                  {getStatusIcon(comm.status)}
                                  <span className="capitalize">{comm.status}</span>
                                </div>
                              </div>
                            </div>
                            <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                              {comm.type === 'email' ? 'To: ' : 'To: '}
                              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                {comm.recipient}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
