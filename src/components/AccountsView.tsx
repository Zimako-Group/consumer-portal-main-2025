import React, { useEffect, useState, useMemo } from 'react';
import { Search, UserPlus, Pencil, Loader2, Download, MessageSquare, Mail, MessageCircle, History } from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { generateStatement } from './StatementGenerator';
import toast from 'react-hot-toast';
import { sendSMSAndRecord, sendEmailAndRecord, sendWhatsAppAndRecord } from '../services/communicationService';
import CommunicationHistory from './CommunicationHistory';

interface ContactDetails {
  address: string;
  email: string;
  phoneNumber: string;
}

interface Profile {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  accountStatus: string;
  accountType: string;
  agreementOutstanding: number;
  agreementType: string;
  cellNumber: string;
  companyCoNumber: string;
  contactDetails: ContactDetails;
  creditInstruction: string;
}

interface AccountsViewProps {
  onCreateProfile: () => void;
  onEditProfile: (profile: Profile) => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  const { isDarkMode } = useTheme();
  
  const getStatusColor = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return isDarkMode 
          ? 'bg-green-900 text-green-100' 
          : 'bg-green-100 text-green-800';
      case 'inactive':
        return isDarkMode 
          ? 'bg-red-900 text-red-100' 
          : 'bg-red-100 text-red-800';
      default:
        return isDarkMode 
          ? 'bg-gray-700 text-gray-100' 
          : 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor()}`}>
      {status}
    </span>
  );
};

export default function AccountsView({ onCreateProfile, onEditProfile }: AccountsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<string | null>(null);
  const { isDarkMode } = useTheme();

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    try {
      const q = query(
        collection(db, 'customers'),
        orderBy('accountHolderName', 'asc')
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const customerData: Profile[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              accountHolderName: data.accountHolderName || '',
              accountNumber: data.accountNumber || '',
              accountStatus: data.accountStatus || '',
              accountType: data.accountType || '',
              agreementOutstanding: data.agreementOutstanding || 0,
              agreementType: data.agreementType || '',
              cellNumber: data.cellNumber || '',
              companyCoNumber: data.companyCoNumber || '',
              contactDetails: {
                address: data.contactDetails?.address || '',
                email: data.contactDetails?.email || '',
                phoneNumber: data.contactDetails?.phoneNumber || ''
              },
              creditInstruction: data.creditInstruction || ''
            };
          });
          setProfiles(customerData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching customers:', err);
          setError('Failed to load customer profiles. Please try again later.');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up snapshot listener:', err);
      setError('Failed to connect to the database. Please check your connection.');
      setLoading(false);
    }
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return profiles;
    
    const query = searchQuery.toLowerCase().trim();
    
    return profiles.filter(profile => {
      try {
        // Helper function to safely convert and check values
        const safeString = (value: any): string => {
          if (value === null || value === undefined || value === 'N/A') return '';
          return String(value).toLowerCase();
        };

        const accountHolder = safeString(profile.accountHolderName);
        const accountNumber = safeString(profile.accountNumber);
        const cellNumber = safeString(profile.cellNumber);
        const email = safeString(profile.contactDetails?.email);

        return accountHolder.includes(query) ||
               accountNumber.includes(query) ||
               cellNumber.includes(query) ||
               email.includes(query);
      } catch (err) {
        console.error('Error filtering profile:', err, profile);
        return false;
      }
    });
  }, [profiles, searchQuery]);

  const paginatedProfiles = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProfiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProfiles, currentPage]);

  const totalPages = Math.ceil(filteredProfiles.length / ITEMS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  useEffect(() => {
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchQuery]);

  const handleGenerateStatement = async (accountNumber: string) => {
    try {
      setGeneratingStatement(true);
      toast.loading('Generating statement...');

      // Get customer data from Firestore
      const customerQuery = query(
        collection(db, 'customers'),
        where('accountNumber', '==', accountNumber)
      );
      const customerSnapshot = await getDocs(customerQuery);
      
      if (customerSnapshot.empty) {
        throw new Error('Customer not found');
      }

      const customerData = customerSnapshot.docs[0].data();

      // Generate and download the statement
      await generateStatement(customerData);
      
      toast.dismiss();
      toast.success('Statement generated successfully');
    } catch (error) {
      console.error('Error generating statement:', error);
      toast.dismiss();
      toast.error('Failed to generate statement. Please try again.');
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleMessage = async (profile: Profile) => {
    const phoneNumber = profile.cellNumber || profile.contactDetails?.phoneNumber;
    if (!phoneNumber) {
      toast.error('No phone number available for this account');
      return;
    }

    setSendingMessage(true);
    try {
      const message = `Dear ${profile.accountHolderName}, this is a test message from the consumer portal.`;
      await sendSMSAndRecord(
        phoneNumber,
        message,
        profile.accountNumber,
        'System Admin'
      );
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleEmail = async (profile: Profile) => {
    if (!profile.contactDetails?.email) {
      toast.error('No email address available for this account');
      return;
    }

    setSendingMessage(true);
    try {
      const subject = 'Consumer Portal Notification';
      const message = `Dear ${profile.accountHolderName}, this is a test email from the consumer portal.`;
      await sendEmailAndRecord(
        profile.contactDetails.email,
        subject,
        message,
        profile.accountNumber,
        'System Admin'
      );
      toast.success('Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleWhatsApp = async (profile: Profile) => {
    const phoneNumber = profile.cellNumber || profile.contactDetails?.phoneNumber;
    if (!phoneNumber) {
      toast.error('No phone number available for this account');
      return;
    }

    setSendingMessage(true);
    try {
      const message = `Dear ${profile.accountHolderName}, this is a test WhatsApp message from the consumer portal.`;
      await sendWhatsAppAndRecord(
        phoneNumber,
        message,
        profile.accountNumber,
        'System Admin'
      );
      toast.success('WhatsApp message sent successfully');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Failed to send WhatsApp message');
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex items-center space-x-2 text-theme">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profiles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className={`p-4 rounded-lg ${
          isDarkMode 
            ? 'text-red-400 bg-red-900/20' 
            : 'text-red-500 bg-red-50'
        }`}>
          {error}
        </div>
      </div>
    );
  }

  const themeClasses = {
    container: isDarkMode ? 'bg-gray-900' : 'bg-white',
    text: isDarkMode ? 'text-white' : 'text-gray-900',
    secondaryText: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    tertiaryText: isDarkMode ? 'text-gray-500' : 'text-gray-400',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-300',
    divide: isDarkMode ? 'divide-gray-700' : 'divide-gray-200',
    hover: isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50',
    header: isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50',
  };

  return (
    <div className={`p-6 space-y-6 transition-colors duration-200 ${themeClasses.container}`}>
      {/* Header Section with Gradient Background */}
      <div className={`rounded-lg p-4 mb-4 bg-gradient-to-r from-theme/90 to-theme shadow-lg`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white mb-1">
              Client Accounts
            </h1>
            <p className="text-white/80 text-xs">
              Manage and view all client account information
            </p>
          </div>
          <button
            onClick={onCreateProfile}
            className="flex items-center px-4 py-2 bg-white text-theme rounded-full hover:bg-opacity-90 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Profile
          </button>
        </div>
      </div>

      {/* Search Section with Enhanced Design */}
      <div className="relative max-w-2xl mx-auto mb-8">
        <div className={`relative flex items-center ${themeClasses.container} rounded-full shadow-md hover:shadow-lg transition-shadow duration-200`}>
          <Search className={`absolute left-4 ${themeClasses.tertiaryText} w-5 h-5`} />
          <input
            type="text"
            placeholder="Search by name, account number, or cell number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-12 pr-4 py-3 w-full border-none rounded-full
                     focus:ring-2 focus:ring-theme/50 focus:outline-none
                     ${themeClasses.container} ${themeClasses.text}
                     placeholder-gray-400 transition-all duration-200`}
          />
        </div>
      </div>

      {/* Table Section with Enhanced Design */}
      <div className={`rounded-xl overflow-hidden shadow-xl transition-all duration-200 ${themeClasses.container} border ${themeClasses.border}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full divide-y ${themeClasses.divide}`}>
            <thead className={`${themeClasses.header}`}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider`}>
                  Account Holder
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider`}>
                  Account Number
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider`}>
                  Account Type
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-4 text-left text-xs font-semibold ${themeClasses.secondaryText} uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${themeClasses.divide}`}>
              {paginatedProfiles.map((profile) => (
                <tr key={profile.id} className={`${themeClasses.hover} transition-all duration-200 transform hover:scale-[0.999]`}>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm font-medium ${themeClasses.text}`}>
                      {profile.accountHolderName || 'N/A'}
                    </div>
                    <div className={`text-xs ${themeClasses.secondaryText}`}>
                      {profile.companyCoNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm ${themeClasses.text}`}>
                      {profile.accountNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className={`text-sm ${themeClasses.text}`}>
                      {profile.accountType || 'N/A'}
                    </div>
                    <div className={`text-xs ${themeClasses.secondaryText}`}>
                      Agreement: {profile.agreementType || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <StatusBadge status={profile.accountStatus || 'N/A'} />
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onEditProfile(profile)}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          transition-colors duration-200`}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleGenerateStatement(profile.accountNumber)}
                        disabled={generatingStatement}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          transition-colors duration-200`}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Statement
                      </button>

                      <button
                        onClick={() => handleMessage(profile)}
                        disabled={sendingMessage || (!profile.cellNumber && !profile.contactDetails?.phoneNumber)}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          ${(!profile.cellNumber && !profile.contactDetails?.phoneNumber) && 'opacity-50 cursor-not-allowed'}
                          transition-colors duration-200 text-purple-500`}
                        title={profile.cellNumber || profile.contactDetails?.phoneNumber ? "Send Message" : "No phone number available"}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleEmail(profile)}
                        disabled={sendingMessage || !profile.contactDetails?.email}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          ${!profile.contactDetails?.email && 'opacity-50 cursor-not-allowed'}
                          transition-colors duration-200 text-orange-500`}
                        title={profile.contactDetails?.email ? "Send Email" : "No email address available"}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleWhatsApp(profile)}
                        disabled={(!profile.cellNumber && !profile.contactDetails?.phoneNumber)}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          ${(!profile.cellNumber && !profile.contactDetails?.phoneNumber) && 'opacity-50 cursor-not-allowed'}
                          transition-colors duration-200 text-green-500`}
                        title={profile.cellNumber || profile.contactDetails?.phoneNumber ? "Send WhatsApp Message" : "No phone number available"}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedAccountForHistory(profile.accountNumber)}
                        className={`flex items-center text-xs px-2.5 py-1.5 rounded-full
                          ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}
                          transition-colors duration-200 text-purple-600`}
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedProfiles.length === 0 && (
                <tr>
                  <td colSpan={5} className={`px-6 py-12 text-center ${themeClasses.secondaryText}`}>
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <Search className="w-8 h-8 opacity-40" />
                      <div className="text-lg font-medium">
                        {searchQuery
                          ? "No profiles found matching your search"
                          : "No profiles available"}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced Pagination Section */}
      {filteredProfiles.length > 0 && (
        <div className={`mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 ${themeClasses.container}`}>
          {/* Results count with better styling */}
          <div className={`px-4 ${themeClasses.text} text-sm`}>
            Showing{' '}
            <span className="font-medium text-theme">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span>
            {' '}to{' '}
            <span className="font-medium text-theme">
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredProfiles.length)}
            </span>
            {' '}of{' '}
            <span className="font-medium text-theme">{filteredProfiles.length}</span>
            {' '}results
          </div>

          {/* Pagination with enhanced styling */}
          <div className="flex items-center justify-center">
            <nav className="isolate inline-flex rounded-full shadow-sm" aria-label="Pagination">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center rounded-l-full px-4 py-2 text-sm font-medium
                  ${currentPage === 1
                    ? `${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                    : `${isDarkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                  focus:z-20 focus:outline-offset-0 transition-colors duration-200`}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNumber;
                if (totalPages <= 7) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i < 5 ? i + 1 : i === 5 ? '...' : totalPages;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = i === 0 ? 1 : i === 1 ? '...' : totalPages - (5 - i);
                } else {
                  pageNumber = i === 0 ? 1 : i === 1 ? '...' : i === 5 ? '...' : i === 6 ? totalPages : currentPage + (i - 3);
                }

                if (pageNumber === '...') {
                  return (
                    <span
                      key={`ellipsis-${i}`}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-medium
                        ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white text-gray-700'}
                        ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}`}
                    >
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => typeof pageNumber === 'number' && setCurrentPage(pageNumber)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium transition-colors duration-200
                      ${pageNumber === currentPage
                        ? `${isDarkMode 
                            ? 'bg-theme text-white' 
                            : 'bg-theme text-white'} 
                          z-10`
                        : `${isDarkMode 
                            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                      focus:z-20 focus:outline-offset-0`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className={`relative inline-flex items-center rounded-r-full px-4 py-2 text-sm font-medium
                  ${currentPage >= totalPages
                    ? `${isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-400'} cursor-not-allowed`
                    : `${isDarkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                  ring-1 ring-inset ${isDarkMode ? 'ring-gray-700' : 'ring-gray-300'}
                  focus:z-20 focus:outline-offset-0 transition-colors duration-200`}
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}
      {selectedAccountForHistory && (
        <CommunicationHistory
          isOpen={true}
          onClose={() => setSelectedAccountForHistory(null)}
          accountNumber={selectedAccountForHistory}
          accountHolderName={profiles.find(p => p.accountNumber === selectedAccountForHistory)?.accountHolderName || ''}
        />
      )}
    </div>
  );
}