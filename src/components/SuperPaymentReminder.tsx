import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp, query, orderBy, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Mail, MessageSquare, Phone, Bell, Calendar, Clock, X, Plus, Edit, Trash } from 'lucide-react';
import { sendSMSAndRecord, sendEmailAndRecord } from '../services/communicationService';
import { useAuth } from '../contexts/AuthContext';
import { updateCommunicationStats } from '../services/communicationService';

interface CustomerData {
  accountHolderName: string;
  accountNumber: string;
  accountStatus: string;
  accountType: string;
  cellNumber: string;
  emailAddress: string;
  outstandingTotalBalance: number;
  lastPaymentAmount: number;
  lastPaymentDate: string | number;
  communicationPreferences: {
    email: {
      enabled: boolean;
      value: string;
    };
    sms: {
      enabled: boolean;
      value: string;
    };
  };
}

interface ReminderData {
  id: string;
  message: string;
  timestamp: Timestamp;
  scheduledDate: Timestamp;
  status: 'pending' | 'sent';
  accountNumber?: string;
  customerName?: string;
  channel?: 'sms' | 'email' | 'whatsapp';
  contactInfo?: string;
  department?: string;
  purpose?: string;
  sentDate?: string;
  amount?: number;
  success?: boolean;
  errorMessage?: string;
}

interface TemplateMessage {
  id: string;
  title: string;
  content: string;
  isCustom?: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const SuperPaymentReminder: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<'sms' | 'email' | 'whatsapp' | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateMessage | null>(null);
  const [searchResults, setSearchResults] = useState<CustomerData[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<TemplateMessage[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TemplateMessage>>({
    title: '',
    content: ''
  });
  const [editingTemplate, setEditingTemplate] = useState<TemplateMessage | null>(null);

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    if (!selectedAccount) {
      setSearchResults([]);
      return;
    }

    const searchCustomers = async () => {
      setIsSearching(true);
      try {
        const customersRef = collection(db, 'customers');
        const searchTermLower = selectedAccount.toLowerCase();
        
        const snapshot = await getDocs(customersRef);
        const results = snapshot.docs
          .map(doc => doc.data() as CustomerData)
          .filter(customer => 
            customer.accountHolderName?.toLowerCase().includes(searchTermLower) ||
            customer.accountNumber?.toLowerCase().includes(searchTermLower)
          );

        setSearchResults(results);
      } catch (error) {
        console.error('Error searching customers:', error);
        toast.error('Failed to search customers');
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [selectedAccount]);

  useEffect(() => {
    const fetchCustomTemplates = async () => {
      try {
        const templatesRef = collection(db, 'messageTemplates');
        const q = query(templatesRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const templates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as TemplateMessage));
        setCustomTemplates(templates);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast.error('Failed to load custom templates');
      }
    };

    fetchCustomTemplates();
  }, []);

  const handleCustomerSelect = (customer: CustomerData) => {
    setSelectedCustomer(customer);
    setSelectedAccount(customer.accountHolderName);
    setSearchResults([]);
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setSelectedAccount('');
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const remindersQuery = query(
        collection(db, 'paymentReminders'),
        orderBy('scheduledDate', 'desc')
      );
      const snapshot = await getDocs(remindersQuery);
      const remindersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReminderData[];
      setReminders(remindersList);
    } catch (error) {
      console.error('Error fetching reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }

    if (!selectedChannel) {
      toast.error('Please select a communication channel (SMS, Email, or WhatsApp)');
      return;
    }

    if (selectedChannel === 'email' && (!selectedCustomer.emailAddress || selectedCustomer.emailAddress === 'N/A')) {
      toast.error('Selected customer does not have a valid email address');
      return;
    }

    if (selectedChannel === 'sms' && 
        (!selectedCustomer.communicationPreferences?.sms?.enabled || 
         !selectedCustomer.cellNumber)) {
      toast.error('Selected customer does not have a valid phone number');
      return;
    }

    if (!message) {
      toast.error('Please enter a reminder message');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      toast.error('Please select both date and time for the reminder');
      return;
    }

    try {
      setLoading(true);
      const scheduledDateTime = new Date(scheduledDate + 'T' + scheduledTime);
      
      if (scheduledDateTime < new Date()) {
        toast.error('Please select a future date and time');
        return;
      }

      // Store the reminder in Firestore with pending status for scheduled delivery
      const reminderData = {
        message,
        timestamp: Timestamp.now(),
        scheduledDate: Timestamp.fromDate(scheduledDateTime),
        status: 'pending', // Set as pending for scheduled messages
        channel: selectedChannel,
        accountNumber: selectedCustomer.accountNumber,
        customerName: selectedCustomer.accountHolderName,
        contactInfo: selectedChannel === 'email' 
          ? selectedCustomer.emailAddress 
          : selectedCustomer.cellNumber,
        department: 'billing',
        purpose: 'payment_reminder',
        amount: selectedCustomer.outstandingTotalBalance,
        success: null,
        errorMessage: null
      };

      await addDoc(collection(db, 'paymentReminders'), reminderData);
      
      toast.success(`Reminder scheduled for ${scheduledDateTime.toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`);
      
      // Reset form
      setMessage('');
      setScheduledDate('');
      setScheduledTime('');
      setSelectedChannel(null);
      setSelectedCustomer(null);
      setSelectedAccount('');
      
      fetchReminders();
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      toast.error(`Failed to schedule reminder: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getChannelButtonClass = (channel: 'sms' | 'email' | 'whatsapp') => {
    const isDisabled = channel === 'email' 
      ? !selectedCustomer?.emailAddress || selectedCustomer?.emailAddress === 'N/A'
      : channel === 'sms'
      ? !selectedCustomer?.communicationPreferences?.sms?.enabled
      : false;

    return `flex flex-col items-center p-4 bg-[#2a334d] rounded-lg border ${
      selectedChannel === channel
        ? 'border-[#ff6b00]'
        : isDisabled
        ? 'border-gray-600 opacity-50 cursor-not-allowed'
        : 'border-gray-600 hover:border-[#ff6b00] transition-colors'
    }`;
  };

  const filteredReminders = reminders.filter(reminder => {
    if (!searchTerm) return true;
    return reminder.message.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Function to format date string from YYYYMMDD to YYYY/MM/DD
  const formatDateWithSlashes = (dateString: string | number | undefined) => {
    if (!dateString) return 'N/A';
    
    // Convert to string and ensure we only have numbers
    const cleanDate = String(dateString).replace(/[^0-9]/g, '');
    
    // Check if we have a valid 8-digit date
    if (cleanDate.length !== 8) {
      console.log('Invalid date format:', dateString);
      return 'Invalid Date';
    }
    
    const year = cleanDate.substring(0, 4);
    const month = cleanDate.substring(4, 6);
    const day = cleanDate.substring(6, 8);
    return `${year}/${month}/${day}`;
  };

  const messageTemplates: TemplateMessage[] = [
    {
      id: 'payment-due',
      title: 'Payment Due Reminder',
      content: `Dear ${selectedCustomer?.accountHolderName},\n\nThis is a friendly reminder that your outstanding balance of R${selectedCustomer?.outstandingTotalBalance.toFixed(2)} is due for payment.\n\nPlease make the payment at your earliest convenience.\n\nThank you for your cooperation.`
    },
    {
      id: 'payment-overdue',
      title: 'Payment Overdue Notice',
      content: `Dear ${selectedCustomer?.accountHolderName},\n\nYour account (${selectedCustomer?.accountNumber}) has an outstanding balance of R${selectedCustomer?.outstandingTotalBalance.toFixed(2)}.\n\nPlease settle this amount as soon as possible to avoid any service interruptions.\n\nIf you have already made the payment, please disregard this notice.`
    },
    {
      id: 'payment-urgent',
      title: 'Urgent Payment Required',
      content: `Dear ${selectedCustomer?.accountHolderName},\n\nYour account requires immediate attention. The outstanding balance of R${selectedCustomer?.outstandingTotalBalance.toFixed(2)} needs to be settled urgently.\n\nPlease contact our office if you need to discuss payment arrangements.`
    },
    {
      id: 'payment-arrangement',
      title: 'Payment Arrangement Reminder',
      content: `Dear ${selectedCustomer?.accountHolderName},\n\nAs per our payment arrangement, please remember to settle the amount of R${selectedCustomer?.outstandingTotalBalance.toFixed(2)}.\n\nYour last payment of R${selectedCustomer?.lastPaymentAmount.toFixed(2)} was received on ${formatDateWithSlashes(selectedCustomer?.lastPaymentDate)}.\n\nThank you for your commitment to maintaining your account.`
    }
  ];

  // Function to handle template selection
  const handleTemplateSelect = (template: TemplateMessage) => {
    setSelectedTemplate(template);
    setMessage(template.content);
    setShowTemplateModal(false);
  };

  // Save new template
  const handleSaveTemplate = async () => {
    try {
      if (!newTemplate.title || !newTemplate.content) {
        toast.error('Please fill in both title and content');
        return;
      }

      const templatesRef = collection(db, 'messageTemplates');
      const templateData = {
        ...newTemplate,
        isCustom: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(templatesRef, templateData);
      const savedTemplate = {
        id: docRef.id,
        ...templateData
      } as TemplateMessage;

      setCustomTemplates(prev => [savedTemplate, ...prev]);
      setShowCreateTemplate(false);
      setNewTemplate({ title: '', content: '' });
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  // Update existing template
  const handleUpdateTemplate = async (template: TemplateMessage) => {
    try {
      const templateRef = doc(db, 'messageTemplates', template.id);
      const updateData = {
        ...template,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(templateRef, updateData);
      setCustomTemplates(prev => 
        prev.map(t => t.id === template.id ? {...t, ...updateData} : t)
      );
      setEditingTemplate(null);
      toast.success('Template updated successfully');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    }
  };

  // Delete template
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteDoc(doc(db, 'messageTemplates', templateId));
      setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Main Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Reminder Form */}
        <div className="bg-[#1a2234] rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Schedule Payment Reminder
          </h2>
          
          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search customer by name or account..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#2a334d] text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent placeholder-gray-400"
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
            />
            {selectedCustomer && (
              <button
                onClick={clearSelectedCustomer}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && !selectedCustomer && (
              <div className="absolute z-10 w-full mt-1 bg-[#2a334d] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((customer, index) => (
                  <button
                    key={customer.accountNumber}
                    onClick={() => handleCustomerSelect(customer)}
                    className={`w-full text-left px-4 py-3 hover:bg-[#1a2234] text-white ${
                      index !== searchResults.length - 1 ? 'border-b border-gray-600' : ''
                    }`}
                  >
                    <div className="font-medium">{customer.accountHolderName}</div>
                    <div className="text-sm text-gray-400">
                      Account: {customer.accountNumber} • {customer.accountType}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Customer Info */}
          {selectedCustomer && (
            <div className="bg-[#2a334d] p-4 rounded-lg mb-6 border border-gray-600">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedCustomer.accountHolderName}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Account: {selectedCustomer.accountNumber}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  selectedCustomer.accountStatus === 'ACTIVE' 
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-red-900/50 text-red-400'
                }`}>
                  {selectedCustomer.accountStatus}
                </span>
              </div>
              
              {/* Contact Information */}
              <div className="space-y-1 mb-4">
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Phone className="text-[#ff6b00]" size={14} />
                  Cell: {selectedCustomer.cellNumber}
                </p>
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Mail className="text-[#ff6b00]" size={14} />
                  Email: {selectedCustomer.emailAddress || 'N/A'}
                </p>
              </div>

              {/* Financial Information */}
              <div className="border-t border-gray-600 pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Outstanding Balance:</span>
                  <span className="text-sm font-medium text-red-400">
                    R {selectedCustomer.outstandingTotalBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Last Payment:</span>
                  <span className="text-sm font-medium text-green-400">
                    R {selectedCustomer.lastPaymentAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Payment Date:</span>
                  <span className="text-sm text-gray-300">
                    {formatDateWithSlashes(selectedCustomer?.lastPaymentDate)}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Communication Channels */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => {
                if (selectedCustomer?.communicationPreferences?.sms?.enabled) {
                  setSelectedChannel('sms');
                  setShowTemplateModal(true);
                } else {
                  toast.error('SMS communication is not enabled for this customer');
                }
              }}
              disabled={!selectedCustomer || !selectedCustomer.communicationPreferences?.sms?.enabled}
              className={getChannelButtonClass('sms')}
            >
              <Phone className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">SMS</span>
              {selectedCustomer && !selectedCustomer.communicationPreferences?.sms?.enabled && (
                <span className="text-xs text-gray-400 mt-1">Not available</span>
              )}
            </button>

            <button
              onClick={() => {
                if (selectedCustomer?.emailAddress && selectedCustomer.emailAddress !== 'N/A') {
                  setSelectedChannel('email');
                  setShowTemplateModal(true);
                } else {
                  toast.error('Email communication is not available for this customer');
                }
              }}
              disabled={!selectedCustomer || !selectedCustomer.emailAddress || selectedCustomer.emailAddress === 'N/A'}
              className={getChannelButtonClass('email')}
            >
              <Mail className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">Email</span>
              {selectedCustomer && (!selectedCustomer.emailAddress || selectedCustomer.emailAddress === 'N/A') && (
                <span className="text-xs text-gray-400 mt-1">Not available</span>
              )}
            </button>

            <button
              onClick={() => {
                if (selectedCustomer?.cellNumber) {
                  setSelectedChannel('whatsapp');
                  setShowTemplateModal(true);
                } else {
                  toast.error('WhatsApp communication requires a valid phone number');
                }
              }}
              disabled={!selectedCustomer || !selectedCustomer.cellNumber}
              className={getChannelButtonClass('whatsapp')}
            >
              <MessageSquare className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">WhatsApp</span>
              {selectedCustomer && !selectedCustomer.cellNumber && (
                <span className="text-xs text-gray-400 mt-1">Not available</span>
              )}
            </button>
          </div>

          {/* Message Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Reminder Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`w-full p-3 bg-[#2a334d] text-white rounded-lg border ${
                  !selectedCustomer 
                    ? 'border-gray-600 opacity-50'
                    : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                } placeholder-gray-400`}
                rows={4}
                placeholder={selectedCustomer ? "Enter your reminder message..." : "Select a customer first..."}
                disabled={!selectedCustomer}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                  <Calendar className="text-[#ff6b00]" size={16} />
                  Schedule Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={`w-full p-2.5 bg-[#2a334d] text-white rounded-lg border ${
                    !selectedCustomer 
                      ? 'border-gray-600 opacity-50'
                      : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                  }`}
                  disabled={!selectedCustomer}
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                  <Clock className="text-[#ff6b00]" size={16} />
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className={`w-full p-2.5 bg-[#2a334d] text-white rounded-lg border ${
                    !selectedCustomer 
                      ? 'border-gray-600 opacity-50'
                      : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                  }`}
                  disabled={!selectedCustomer}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedCustomer || loading}
              className={`w-full bg-[#ff6b00] text-white py-2.5 px-4 rounded-lg transition-colors font-medium ${
                !selectedCustomer || loading
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-[#ff6b00]/90'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  Scheduling... <span className="animate-spin">⌛</span>
                </span>
              ) : (
                'Schedule Reminder'
              )}
            </button>
          </form>
        </div>

        {/* Right Column - Reminders List */}
        <div className="bg-[#1a2234] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-xl font-semibold">Scheduled Reminders</h2>
          </div>

          {/* Search Reminders */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search reminders..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#2a334d] text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent placeholder-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Reminders List */}
          <div className="space-y-4">
            {filteredReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="p-4 bg-[#2a334d] rounded-lg border border-gray-600"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium">{reminder.message}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    reminder.status === 'sent'
                      ? 'bg-green-900 text-green-100'
                      : 'bg-[#ff6b00] bg-opacity-20 text-[#ff6b00]'
                  }`}>
                    {reminder.status}
                  </span>
                </div>
                <div className="text-gray-400 text-sm">
                  Scheduled for: {reminder.scheduledDate.toDate().toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a2234] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Select Message Template</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateTemplate(true)}
                  className="text-[#ff6b00] hover:text-[#ff6b00]/80"
                >
                  <Plus size={24} />
                </button>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Default Templates */}
            <div className="mb-6">
              <h4 className="text-gray-400 text-sm font-medium mb-3">Default Templates</h4>
              <div className="grid grid-cols-1 gap-4">
                {messageTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 bg-[#2a334d] rounded-lg border border-gray-600 hover:border-[#ff6b00] transition-colors text-left"
                  >
                    <h4 className="text-white font-medium mb-2">{template.title}</h4>
                    <p className="text-gray-400 text-sm whitespace-pre-line">
                      {template.content}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Templates */}
            {customTemplates.length > 0 && (
              <div>
                <h4 className="text-gray-400 text-sm font-medium mb-3">Custom Templates</h4>
                <div className="grid grid-cols-1 gap-4">
                  {customTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="p-4 bg-[#2a334d] rounded-lg border border-gray-600 group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-white font-medium">{template.title}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="text-gray-400 hover:text-[#ff6b00]"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-gray-400 hover:text-red-400"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm whitespace-pre-line mb-2">
                        {template.content}
                      </p>
                      <button
                        onClick={() => handleTemplateSelect(template)}
                        className="text-sm text-[#ff6b00] hover:text-[#ff6b00]/80"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {(showCreateTemplate || editingTemplate) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a2234] rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateTemplate(false);
                  setEditingTemplate(null);
                  setNewTemplate({ title: '', content: '' });
                }}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Template Title
                </label>
                <input
                  type="text"
                  value={editingTemplate?.title || newTemplate.title}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({...editingTemplate, title: e.target.value});
                    } else {
                      setNewTemplate({...newTemplate, title: e.target.value});
                    }
                  }}
                  className="w-full p-2.5 bg-[#2a334d] text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent"
                  placeholder="Enter template title"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Template Content
                </label>
                <textarea
                  value={editingTemplate?.content || newTemplate.content}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({...editingTemplate, content: e.target.value});
                    } else {
                      setNewTemplate({...newTemplate, content: e.target.value});
                    }
                  }}
                  className="w-full p-2.5 bg-[#2a334d] text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent"
                  rows={6}
                  placeholder="Enter template content"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateTemplate(false);
                    setEditingTemplate(null);
                    setNewTemplate({ title: '', content: '' });
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (editingTemplate) {
                      handleUpdateTemplate(editingTemplate);
                    } else {
                      handleSaveTemplate();
                    }
                  }}
                  className="px-4 py-2 bg-[#ff6b00] text-white rounded-lg hover:bg-[#ff6b00]/90"
                >
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperPaymentReminder;
