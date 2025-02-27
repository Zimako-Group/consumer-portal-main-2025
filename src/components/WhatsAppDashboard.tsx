import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, getDocs, where, startAfter, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { format } from 'date-fns';
import { IoSend, IoRefresh, IoFilter, IoSearch, IoDownload, IoAnalytics, IoSettingsSharp, IoMailOutline, IoChatbubbles } from 'react-icons/io5';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { exportToCSV } from '../utils/exportUtils';
import WhatsAppAnalytics from './WhatsAppAnalytics';
import WhatsAppSetupGuide from './WhatsAppSetupGuide';
import WhatsAppMessage from './whatsapp/WhatsAppMessage';
import WhatsAppConversation from './whatsapp/WhatsAppConversation';
import useWhatsAppController from '../controllers/WhatsAppController';
import WhatsAppSettings from './WhatsAppSettings';

interface WhatsAppMessage {
  id: string;
  type: 'inbound' | 'outbound';
  sender?: string;
  recipient?: string;
  content: string;
  timestamp: any;
  status: string;
  messageId?: string;
  messageType?: string;
  isTemplate?: boolean;
  templateData?: any;
}

interface Customer {
  id: string;
  accountNumber: string;
  accountHolderName: string;
  phoneNumber: string;
}

const WhatsAppDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'analytics' | 'setup' | 'conversations' | 'settings'>('messages');
  
  // Initialize WhatsApp controller
  const whatsAppController = useWhatsAppController();

  const fetchMessages = async (customerPhoneNumber?: string, reset = false) => {
    try {
      setLoading(true);
      
      let messagesQuery;
      
      if (customerPhoneNumber) {
        // Query for a specific customer
        messagesQuery = query(
          collection(db, 'whatsappMessages'),
          where(filterType === 'inbound' ? 'sender' : filterType === 'outbound' ? 'recipient' : 'sender', 
                '==', `whatsapp:${customerPhoneNumber}`),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
      } else {
        // Query for all messages
        if (reset) {
          messagesQuery = query(
            collection(db, 'whatsappMessages'),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        } else if (lastVisible) {
          messagesQuery = query(
            collection(db, 'whatsappMessages'),
            orderBy('timestamp', 'desc'),
            startAfter(lastVisible),
            limit(20)
          );
        } else {
          messagesQuery = query(
            collection(db, 'whatsappMessages'),
            orderBy('timestamp', 'desc'),
            limit(20)
          );
        }
      }
      
      const querySnapshot = await getDocs(messagesQuery);
      
      if (querySnapshot.empty) {
        setHasMore(false);
      } else {
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
      
      const fetchedMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WhatsAppMessage[];
      
      if (reset) {
        setMessages(fetchedMessages);
      } else {
        setMessages(prev => [...prev, ...fetchedMessages]);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCustomers = async () => {
    try {
      const customersQuery = query(
        collection(db, 'customers'),
        where('phoneNumber', '!=', ''),
        orderBy('phoneNumber'),
        limit(100)
      );
      
      const querySnapshot = await getDocs(customersQuery);
      
      const fetchedCustomers = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(customer => customer.phoneNumber && customer.phoneNumber.trim() !== '') as Customer[];
      
      setCustomers(fetchedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };
  
  useEffect(() => {
    fetchCustomers();
    fetchMessages(undefined, true);
  }, []);
  
  useEffect(() => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer.phoneNumber, true);
    }
  }, [selectedCustomer, filterType]);
  
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedCustomer) return;
    
    try {
      setSending(true);
      
      // Use the WhatsApp controller to send the message
      await whatsAppController.sendTextMessage(
        selectedCustomer.phoneNumber,
        messageInput
      );
      
      // Add message to Firestore for record-keeping
      await addDoc(collection(db, 'whatsappMessages'), {
        type: 'outbound',
        recipient: `whatsapp:${selectedCustomer.phoneNumber}`,
        content: messageInput,
        timestamp: new Date(),
        status: 'sent',
        messageType: 'text'
      });
      
      setMessageInput('');
      fetchMessages(selectedCustomer.phoneNumber, true);
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };
  
  const handleLoadMore = () => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer.phoneNumber);
    } else {
      fetchMessages();
    }
  };
  
  const handleRefresh = () => {
    if (selectedCustomer) {
      fetchMessages(selectedCustomer.phoneNumber, true);
    } else {
      fetchMessages(undefined, true);
    }
  };
  
  const handleExport = () => {
    try {
      const dataToExport = messages.map(message => ({
        Type: message.type,
        From: message.sender || '',
        To: message.recipient || '',
        Content: message.content,
        Timestamp: format(message.timestamp.toDate(), 'yyyy-MM-dd HH:mm:ss'),
        Status: message.status,
        MessageID: message.messageId || ''
      }));
      
      exportToCSV(dataToExport, 'whatsapp_messages_export');
      toast.success('Messages exported successfully');
    } catch (error) {
      console.error('Error exporting messages:', error);
      toast.error('Failed to export messages');
    }
  };
  
  const filteredMessages = messages.filter(message => {
    if (searchTerm === '') return true;
    
    const searchLower = searchTerm.toLowerCase();
    return message.content.toLowerCase().includes(searchLower) ||
           (message.sender && message.sender.toLowerCase().includes(searchLower)) ||
           (message.recipient && message.recipient.toLowerCase().includes(searchLower));
  });
  
  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h1 className="text-2xl font-bold mb-6">WhatsApp Business Dashboard</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 mr-2 ${
            activeTab === 'messages'
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-500'
              : ''
          }`}
          onClick={() => setActiveTab('messages')}
        >
          <div className="flex items-center">
            <IoMailOutline className="mr-1" />
            Messages
          </div>
        </button>
        
        <button
          className={`px-4 py-2 mr-2 ${
            activeTab === 'conversations'
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-500'
              : ''
          }`}
          onClick={() => setActiveTab('conversations')}
        >
          <div className="flex items-center">
            <IoChatbubbles className="mr-1" />
            Conversations
          </div>
        </button>
        
        <button
          className={`px-4 py-2 mr-2 ${
            activeTab === 'analytics'
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-500'
              : ''
          }`}
          onClick={() => setActiveTab('analytics')}
        >
          <div className="flex items-center">
            <IoAnalytics className="mr-1" />
            Analytics
          </div>
        </button>
        
        <button
          className={`px-4 py-2 mr-2 ${
            activeTab === 'settings'
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-500'
              : ''
          }`}
          onClick={() => setActiveTab('settings')}
        >
          <div className="flex items-center">
            <IoSettingsSharp className="mr-1" />
            Settings
          </div>
        </button>
        
        <button
          className={`px-4 py-2 ${
            activeTab === 'setup'
              ? isDarkMode 
                ? 'border-b-2 border-blue-400 text-blue-400' 
                : 'border-b-2 border-blue-500 text-blue-500'
              : ''
          }`}
          onClick={() => setActiveTab('setup')}
        >
          <div className="flex items-center">
            <IoSettingsSharp className="mr-1" />
            Setup Guide
          </div>
        </button>
      </div>
      
      {/* Actions Bar */}
      {activeTab === 'messages' && (
        <div className="flex mb-6 space-x-2">
          <button
            onClick={() => fetchMessages(selectedCustomer?.phoneNumber, true)}
            className={`px-3 py-1 text-sm rounded-md flex items-center ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <IoRefresh className="mr-1" /> Refresh
          </button>
          
          <button
            onClick={handleExport}
            className={`px-3 py-1 text-sm rounded-md flex items-center ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            <IoDownload className="mr-1" /> Export
          </button>
        </div>
      )}
      
      {/* Tab Content */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Selection */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <label htmlFor="customerSelect" className="block text-sm font-medium mb-1">
                Select Customer
              </label>
              <select
                id="customerSelect"
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const customerId = e.target.value;
                  const customer = customers.find(c => c.id === customerId) || null;
                  setSelectedCustomer(customer);
                }}
                className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="">All Messages</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.accountHolderName} ({customer.phoneNumber})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="filterType" className="block text-sm font-medium mb-1">
                Filter by Type
              </label>
              <select
                id="filterType"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              >
                <option value="all">All Messages</option>
                <option value="inbound">Inbound Only</option>
                <option value="outbound">Outbound Only</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="searchMessages" className="block text-sm font-medium mb-1">
                Search Messages
              </label>
              <div className="relative">
                <input
                  id="searchMessages"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search message content..."
                  className={`w-full p-2 pl-10 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                />
                <IoSearch className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            {selectedCustomer && (
              <div className={`p-4 rounded-md mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-2">Selected Customer</h3>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Name:</span> {selectedCustomer.accountHolderName}
                </p>
                <p className="text-sm mb-1">
                  <span className="font-semibold">Account:</span> {selectedCustomer.accountNumber}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Phone:</span> {selectedCustomer.phoneNumber}
                </p>
              </div>
            )}
          </div>
          
          {/* Messages Display */}
          <div className="md:col-span-2">
            <div 
              className={`h-96 overflow-y-auto mb-4 p-4 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
            >
              {loading && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="flex justify-center items-center h-full text-gray-500">
                  No messages found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMessages.map(message => (
                    <WhatsAppMessage
                      key={message.id}
                      message={{
                        id: message.id,
                        type: message.type,
                        content: message.content,
                        timestamp: message.timestamp?.toDate(),
                        status: message.status,
                        mediaUrl: message.mediaUrl,
                        mediaType: message.messageType,
                        sender: message.sender,
                        recipient: message.recipient
                      }}
                      isOutbound={message.type === 'outbound'}
                    />
                  ))}
                  
                  {hasMore && (
                    <div className="flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className={`px-4 py-2 text-sm rounded-md ${
                          loading 
                            ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700' 
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </button>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {selectedCustomer && (
              <div className="flex">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className={`flex-1 p-3 border rounded-l-md ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !messageInput.trim()}
                  className={`px-4 rounded-r-md flex items-center justify-center ${
                    sending || !messageInput.trim()
                      ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {sending ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  ) : (
                    <IoSend className="h-5 w-5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
          {/* Customers List */}
          <div className="md:col-span-1 border rounded-md overflow-hidden">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 border-b font-medium">
              Active Conversations
            </div>
            <div className="overflow-y-auto h-[calc(100%-48px)]">
              {customers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No customers found
                </div>
              ) : (
                customers.map(customer => (
                  <div 
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedCustomer?.id === customer.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                    }`}
                  >
                    <div className="font-medium">{customer.accountHolderName}</div>
                    <div className="text-sm text-gray-500">{customer.phoneNumber}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Conversation Display */}
          <div className="md:col-span-3 border rounded-md overflow-hidden">
            {selectedCustomer ? (
              <WhatsAppConversation 
                phoneNumber={selectedCustomer.phoneNumber}
                onBack={() => setSelectedCustomer(null)}
              />
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                Select a customer to view conversation
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'analytics' && (
        <WhatsAppAnalytics />
      )}
      
      {activeTab === 'settings' && (
        <WhatsAppSettings />
      )}
      
      {activeTab === 'setup' && (
        <WhatsAppSetupGuide />
      )}
    </div>
  );
};

export default WhatsAppDashboard;
