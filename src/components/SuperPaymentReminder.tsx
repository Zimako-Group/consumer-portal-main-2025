import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp, query, orderBy, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Search, Mail, MessageSquare, Phone, Bell, Calendar, Clock, X, Plus, Edit, Trash, CheckCircle, XCircle, ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, Users, FileSpreadsheet } from 'lucide-react';
import { sendSMSAndRecord, sendEmailAndRecord } from '../services/communicationService';
import { useAuth } from '../contexts/AuthContext';
import { updateCommunicationStats } from '../services/communicationService';
import * as XLSX from 'xlsx';

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
  status: 'pending' | 'sent' | 'failed';
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
  batchId?: string;
}

interface BatchProgress {
  total: number;
  sent: number;
  failed: number;
  inProgress: boolean;
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
  const { currentUser } = useAuth();
  const [selectedAccounts, setSelectedAccounts] = useState<CustomerData[]>([]);
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
  const [isSearching, setIsSearching] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<TemplateMessage[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TemplateMessage>>({
    title: '',
    content: ''
  });
  const [editingTemplate, setEditingTemplate] = useState<TemplateMessage | null>(null);
  const [batchProgress, setBatchProgress] = useState<BatchProgress>({
    total: 0,
    sent: 0,
    failed: 0,
    inProgress: false
  });
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [allCustomers, setAllCustomers] = useState<CustomerData[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    accountStatus: '',
    accountType: '',
    balanceAbove: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortedCustomers, setSortedCustomers] = useState<CustomerData[]>([]);

  const formatCurrency = (amount: any): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const searchCustomers = async () => {
      setIsSearching(true);
      try {
        const customersRef = collection(db, 'customers');
        const searchTermLower = searchTerm.toLowerCase();
        
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
  }, [searchTerm]);

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
    setSelectedAccounts(prev => {
      const exists = prev.find(c => c.accountNumber === customer.accountNumber);
      if (exists) {
        return prev.filter(c => c.accountNumber !== customer.accountNumber);
      }
      return [...prev, customer];
    });
    setSearchResults([]);
    setSearchTerm(''); // Clear the search term
  };

  const clearSelectedCustomers = () => {
    setSelectedAccounts([]);
    setSearchTerm('');
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

    if (selectedAccounts.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }

    if (!selectedChannel) {
      toast.error('Please select a communication channel (SMS, Email, or WhatsApp)');
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
      setBatchProgress({ total: selectedAccounts.length, sent: 0, failed: 0, inProgress: true });
      
      const scheduledDateTime = new Date(scheduledDate + 'T' + scheduledTime);
      
      if (scheduledDateTime < new Date()) {
        toast.error('Please select a future date and time');
        return;
      }

      const batchId = Date.now().toString();
      let successCount = 0;
      let failedCount = 0;

      // Process each customer in the batch
      for (const customer of selectedAccounts) {
        // Validate contact info
        if (selectedChannel === 'email' && (!customer.emailAddress || customer.emailAddress === 'N/A')) {
          failedCount++;
          continue;
        }

        if (selectedChannel === 'sms' && 
            (!customer.communicationPreferences?.sms?.enabled || 
             !customer.cellNumber)) {
          failedCount++;
          continue;
        }

        // Create reminder data
        const reminderData = {
          message: message.replace('{name}', customer.accountHolderName)
                         .replace('{amount}', customer.outstandingTotalBalance.toFixed(2))
                         .replace('{account}', customer.accountNumber),
          timestamp: Timestamp.now(),
          scheduledDate: Timestamp.fromDate(scheduledDateTime),
          status: 'pending',
          channel: selectedChannel,
          accountNumber: customer.accountNumber,
          customerName: customer.accountHolderName,
          contactInfo: selectedChannel === 'email' 
            ? customer.emailAddress 
            : customer.cellNumber,
          department: 'billing',
          purpose: 'payment_reminder',
          amount: customer.outstandingTotalBalance,
          success: null,
          errorMessage: null,
          batchId
        };

        try {
          await addDoc(collection(db, 'paymentReminders'), reminderData);
          successCount++;
          setBatchProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
        } catch (error) {
          failedCount++;
          setBatchProgress(prev => ({ ...prev, failed: prev.failed + 1 }));
          console.error(`Failed to schedule reminder for ${customer.accountNumber}:`, error);
        }
      }

      toast.success(`Batch scheduled: ${successCount} successful, ${failedCount} failed`);
      
      // Reset form
      setMessage('');
      setScheduledDate('');
      setScheduledTime('');
      setSelectedChannel(null);
      clearSelectedCustomers();
      
      fetchReminders();
    } catch (error) {
      console.error('Error scheduling batch reminders:', error);
      toast.error(`Failed to schedule batch reminders: ${error.message}`);
    } finally {
      setLoading(false);
      setBatchProgress(prev => ({ ...prev, inProgress: false }));
    }
  };

  const handleExportToExcel = () => {
    try {
      // Prepare the data for export
      const exportData = sortedCustomers.map(customer => ({
        'Account Holder': customer.accountHolderName || 'N/A',
        'Account Number': customer.accountNumber || 'N/A',
        'Account Status': customer.accountStatus || 'N/A',
        'Account Type': customer.accountType || 'N/A',
        'Cell Number': customer.cellNumber || 'N/A',
        'Email Address': customer.emailAddress || 'N/A',
        'Outstanding Balance': typeof customer.outstandingTotalBalance === 'number' 
          ? customer.outstandingTotalBalance.toFixed(2) 
          : '0.00',
        'Last Payment Amount': typeof customer.lastPaymentAmount === 'number' 
          ? customer.lastPaymentAmount.toFixed(2) 
          : '0.00',
        'Last Payment Date': customer.lastPaymentDate 
          ? formatDateWithSlashes(customer.lastPaymentDate) 
          : 'N/A',
        'SMS Enabled': customer.communicationPreferences?.sms?.enabled ? 'Yes' : 'No',
        'Email Enabled': customer.communicationPreferences?.email?.enabled ? 'Yes' : 'No'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Generate file name with current date
      const date = new Date().toISOString().split('T')[0];
      const fileName = `top_owing_customers_${date}.xlsx`;

      // Create workbook and save
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Top Owing Customers');
      XLSX.writeFile(wb, fileName);

      toast.success('Successfully exported customer data to Excel');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export data to Excel');
    }
  };

  const getChannelButtonClass = (channel: 'sms' | 'email' | 'whatsapp') => {
    const isDisabled = channel === 'email' 
      ? !selectedAccounts.every(customer => customer.emailAddress && customer.emailAddress !== 'N/A')
      : channel === 'sms'
      ? !selectedAccounts.every(customer => customer.communicationPreferences?.sms?.enabled && customer.cellNumber)
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
      content: `Dear {name},\n\nThis is a friendly reminder that your outstanding balance of R{amount} is due for payment.\n\nPlease make the payment at your earliest convenience.\n\nThank you for your cooperation.`
    },
    {
      id: 'payment-overdue',
      title: 'Payment Overdue Notice',
      content: `Dear {name},\n\nYour account ({account}) has an outstanding balance of R{amount}.\n\nPlease settle this amount as soon as possible to avoid any service interruptions.\n\nIf you have already made the payment, please disregard this notice.`
    },
    {
      id: 'payment-urgent',
      title: 'Urgent Payment Required',
      content: `Dear {name},\n\nYour account requires immediate attention. The outstanding balance of R{amount} needs to be settled urgently.\n\nPlease contact our office if you need to discuss payment arrangements.`
    },
    {
      id: 'payment-arrangement',
      title: 'Payment Arrangement Reminder',
      content: `Dear {name},\n\nAs per our payment arrangement, please remember to settle the amount of R{amount}.\n\nYour last payment of R${selectedAccounts[0]?.lastPaymentAmount.toFixed(2)} was received on ${formatDateWithSlashes(selectedAccounts[0]?.lastPaymentDate)}.\n\nThank you for your commitment to maintaining your account.`
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

  const fetchAllCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(customersRef);
      const customers = snapshot.docs.map(doc => doc.data() as CustomerData);
      
      // Sort customers by outstanding balance (highest to lowest)
      const sorted = customers
        .sort((a, b) => b.outstandingTotalBalance - a.outstandingTotalBalance)
        .slice(0, 100); // Get top 100 owing customers
      
      setAllCustomers(sorted);
      setSortedCustomers(sorted);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleBulkSelection = () => {
    let filteredCustomers = [...currentCustomers];
    
    // Apply filters
    if (selectedFilters.accountStatus) {
      filteredCustomers = filteredCustomers.filter(
        customer => customer.accountStatus === selectedFilters.accountStatus
      );
    }
    
    if (selectedFilters.accountType) {
      filteredCustomers = filteredCustomers.filter(
        customer => customer.accountType === selectedFilters.accountType
      );
    }
    
    if (selectedFilters.balanceAbove > 0) {
      filteredCustomers = filteredCustomers.filter(
        customer => customer.outstandingTotalBalance >= selectedFilters.balanceAbove
      );
    }
    
    // Only select customers with valid SMS preferences
    const validCustomers = filteredCustomers.filter(
      customer => customer.communicationPreferences?.sms?.enabled && customer.cellNumber
    );
    
    setSelectedAccounts(validCustomers);
    if (validCustomers.length < filteredCustomers.length) {
      toast.warning(`${filteredCustomers.length - validCustomers.length} customers were excluded due to invalid SMS preferences`);
    }
    toast.success(`Selected ${validCustomers.length} customers for bulk SMS`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = sortedCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);

  const PaginationControls = () => (
    <div className="flex items-center justify-between mt-4 bg-[#2a334d] p-3 rounded-lg">
      <span className="text-sm text-gray-400">
        Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedCustomers.length)} of {sortedCustomers.length} customers
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234]"
        >
          Previous
        </button>
        <span className="px-4 py-1 bg-[#1a2234] text-white rounded">
          {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234]"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-6 p-6">
      {/* Main Content Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Reminder Form */}
        <div className="bg-[#1a2234] rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">
              Schedule Payment Reminder
            </h2>
            <button
              onClick={() => {
                setIsBulkMode(!isBulkMode);
                if (!isBulkMode) {
                  fetchAllCustomers();
                } else {
                  setSelectedAccounts([]);
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isBulkMode 
                  ? 'bg-[#ff6b00] text-white' 
                  : 'bg-[#1a2234] text-gray-400 hover:text-white border border-gray-600'
              }`}
            >
              {isBulkMode ? 'Exit Bulk Mode' : 'Bulk SMS Mode'}
            </button>
          </div>
          
          {/* Bulk Mode UI */}
          {isBulkMode && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Account Status
                  </label>
                  <select
                    value={selectedFilters.accountStatus}
                    onChange={(e) => setSelectedFilters(prev => ({
                      ...prev,
                      accountStatus: e.target.value
                    }))}
                    className="w-full p-2 bg-[#2a334d] text-white rounded-lg border border-gray-600"
                  >
                    <option value="">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Account Type
                  </label>
                  <select
                    value={selectedFilters.accountType}
                    onChange={(e) => setSelectedFilters(prev => ({
                      ...prev,
                      accountType: e.target.value
                    }))}
                    className="w-full p-2 bg-[#2a334d] text-white rounded-lg border border-gray-600"
                  >
                    <option value="">All Types</option>
                    <option value="personal">Personal</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Balance Above (R)
                  </label>
                  <input
                    type="number"
                    value={selectedFilters.balanceAbove}
                    onChange={(e) => setSelectedFilters(prev => ({
                      ...prev,
                      balanceAbove: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full p-2 bg-[#2a334d] text-white rounded-lg border border-gray-600"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  {isLoadingCustomers ? 'Loading customers...' : `Top ${sortedCustomers.length} highest owing customers`}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportToExcel}
                    disabled={isLoadingCustomers || sortedCustomers.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileSpreadsheet size={16} />
                    Export to Excel
                  </button>
                  <button
                    onClick={handleBulkSelection}
                    disabled={isLoadingCustomers || currentCustomers.length === 0}
                    className="px-4 py-2 bg-[#ff6b00] text-white rounded-lg hover:bg-[#ff6b00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Select Matching Customers
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Regular Search Input - Only show if not in bulk mode */}
          {!isBulkMode && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search customer by name or account..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#2a334d] text-white rounded-lg border border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin text-gray-400">⌛</div>
                </div>
              )}
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && searchTerm && (
                <div className="absolute z-50 w-full mt-1 bg-[#2a334d] rounded-lg border border-gray-600 shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map((customer) => (
                    <button
                      key={customer.accountNumber}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-2 text-left hover:bg-[#1a2234] transition-colors flex justify-between items-center group"
                    >
                      <div>
                        <div className="text-white font-medium">{customer.accountHolderName}</div>
                        <div className="text-sm text-gray-400">{customer.accountNumber}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#ff6b00] font-medium">R {formatCurrency(customer.outstandingTotalBalance)}</div>
                        <div className="text-xs text-gray-400">{customer.accountStatus}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Only show "No customers found" when there's a search term, not searching, and no results */}
              {searchTerm && !isSearching && searchResults.length === 0 && !selectedAccounts.find(acc => acc.accountNumber === searchTerm) && (
                <div className="absolute z-50 w-full mt-1 bg-[#2a334d] rounded-lg border border-gray-600 shadow-lg p-4 text-center text-gray-400">
                  No customers found
                </div>
              )}
            </div>
          )}
          
          {/* Selected Customers Info */}
          {selectedAccounts.length > 0 && (
            <div className="flex justify-between items-center mb-4 p-4 bg-[#2a334d] rounded-lg border border-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-[#ff6b00]" size={20} />
                <span className="text-white font-medium">
                  {selectedAccounts.length} Customer{selectedAccounts.length !== 1 ? 's' : ''} Selected
                </span>
              </div>
              <button
                onClick={clearSelectedCustomers}
                className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          )}
          
          {/* Selected Customers */}
          {selectedAccounts.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                {selectedAccounts.map(customer => (
                  <div
                    key={customer.accountNumber}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2a334d] rounded-lg border border-gray-600 m-1"
                  >
                    <span className="text-sm text-white">{customer.accountHolderName}</span>
                    <span className="text-xs text-gray-400">{customer.accountNumber}</span>
                    <button
                      onClick={() => handleCustomerSelect(customer)}
                      className="ml-1 text-gray-400 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Communication Channels */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={() => {
                if (selectedAccounts.every(customer => customer.communicationPreferences?.sms?.enabled)) {
                  setSelectedChannel('sms');
                  setShowTemplateModal(true);
                } else {
                  toast.error('SMS communication is not enabled for all selected customers');
                }
              }}
              disabled={!selectedAccounts.every(customer => customer.communicationPreferences?.sms?.enabled)}
              className={getChannelButtonClass('sms')}
            >
              <Phone className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">SMS</span>
              {!selectedAccounts.every(customer => customer.communicationPreferences?.sms?.enabled) && (
                <span className="text-xs text-gray-400 mt-1">Not available</span>
              )}
            </button>

            <button
              onClick={() => {
                if (selectedAccounts.every(customer => customer.emailAddress && customer.emailAddress !== 'N/A')) {
                  setSelectedChannel('email');
                  setShowTemplateModal(true);
                } else {
                  toast.error('Email communication is not available for all selected customers');
                }
              }}
              disabled={!selectedAccounts.every(customer => customer.emailAddress && customer.emailAddress !== 'N/A')}
              className={getChannelButtonClass('email')}
            >
              <Mail className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">Email</span>
              {!selectedAccounts.every(customer => customer.emailAddress && customer.emailAddress !== 'N/A') && (
                <span className="text-xs text-gray-400 mt-1">Not available</span>
              )}
            </button>

            <button
              onClick={() => {
                if (selectedAccounts.every(customer => customer.cellNumber)) {
                  setSelectedChannel('whatsapp');
                  setShowTemplateModal(true);
                } else {
                  toast.error('WhatsApp communication requires a valid phone number for all selected customers');
                }
              }}
              disabled={!selectedAccounts.every(customer => customer.cellNumber)}
              className={getChannelButtonClass('whatsapp')}
            >
              <MessageSquare className="text-[#ff6b00] mb-2" size={24} />
              <span className="text-white text-sm">WhatsApp</span>
              {!selectedAccounts.every(customer => customer.cellNumber) && (
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
                  !selectedAccounts.length 
                    ? 'border-gray-600 opacity-50'
                    : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                } placeholder-gray-400`}
                rows={4}
                placeholder={selectedAccounts.length ? "Enter your reminder message..." : "Select customers first..."}
                disabled={!selectedAccounts.length}
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
                    !selectedAccounts.length 
                      ? 'border-gray-600 opacity-50'
                      : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                  }`}
                  disabled={!selectedAccounts.length}
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
                    !selectedAccounts.length 
                      ? 'border-gray-600 opacity-50'
                      : 'border-gray-600 focus:ring-2 focus:ring-[#ff6b00] focus:border-transparent'
                  }`}
                  disabled={!selectedAccounts.length}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedAccounts.length || loading}
              className={`w-full bg-[#ff6b00] text-white py-2.5 px-4 rounded-lg transition-colors font-medium ${
                !selectedAccounts.length || loading
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
                      : reminder.status === 'failed'
                      ? 'bg-red-900 text-red-100'
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

      {/* Progress Tracker */}
      {batchProgress.inProgress && (
        <div className="mb-6 p-4 bg-[#2a334d] rounded-lg border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white font-medium">Processing Batch</span>
            <span className="text-gray-400">
              {batchProgress.sent + batchProgress.failed} / {batchProgress.total}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-gray-700 rounded-full mb-3">
            <div
              className="h-full bg-[#ff6b00] rounded-full transition-all duration-300"
              style={{
                width: `${((batchProgress.sent + batchProgress.failed) / batchProgress.total) * 100}%`
              }}
            />
          </div>
          
          {/* Stats */}
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-green-400">{batchProgress.sent} Sent</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="text-red-500" size={16} />
              <span className="text-red-400">{batchProgress.failed} Failed</span>
            </div>
          </div>
        </div>
      )}

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
      
      {/* Bulk Mode Customer List */}
      {isBulkMode && (
        <div className="mb-6 space-y-4">
          {/* Table Header */}
          <div className="bg-[#2a334d] rounded-lg border border-gray-600 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-600 text-sm font-medium text-gray-400">
              <div className="col-span-3">Customer Details</div>
              <div className="col-span-2">Account Type</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Contact Info</div>
              <div className="col-span-2 text-right">Outstanding Balance</div>
            </div>
            
            {/* Customer List */}
            <div className="divide-y divide-gray-600">
              {currentCustomers.map((customer) => (
                <div
                  key={customer.accountNumber}
                  className="grid grid-cols-12 gap-4 p-4 hover:bg-[#1a2234] transition-colors items-center"
                >
                  {/* Customer Details */}
                  <div className="col-span-3">
                    <p className="text-white font-medium">{customer.accountHolderName}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {customer.accountNumber}
                    </p>
                  </div>
                  
                  {/* Account Type */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                      ${customer.accountType === 'business' 
                        ? 'bg-purple-900/30 text-purple-400'
                        : 'bg-blue-900/30 text-blue-400'}`}
                    >
                      {customer.accountType === 'business' ? 'Business' : 'Personal'}
                    </span>
                  </div>
                  
                  {/* Account Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                      ${customer.accountStatus === 'active'
                        ? 'bg-green-900/30 text-green-400'
                        : customer.accountStatus === 'inactive'
                        ? 'bg-red-900/30 text-red-400'
                        : 'bg-yellow-900/30 text-yellow-400'}`}
                    >
                      {customer.accountStatus.charAt(0).toUpperCase() + customer.accountStatus.slice(1)}
                    </span>
                  </div>
                  
                  {/* Contact Info */}
                  <div className="col-span-3">
                    <div className="flex flex-col gap-1">
                      {customer.cellNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-gray-400" />
                          <span className="text-gray-300">{customer.cellNumber}</span>
                        </div>
                      )}
                      {customer.emailAddress && customer.emailAddress !== 'N/A' && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-gray-400" />
                          <span className="text-gray-300 truncate">{customer.emailAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Outstanding Balance */}
                  <div className="col-span-2 text-right">
                    <p className="text-[#ff6b00] font-medium">
                      R {typeof customer.outstandingTotalBalance === 'number' 
                          ? customer.outstandingTotalBalance.toFixed(2) 
                          : '0.00'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Last Payment: R {typeof customer.lastPaymentAmount === 'number' 
                          ? customer.lastPaymentAmount.toFixed(2) 
                          : '0.00'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Pagination Controls */}
          <div className="bg-[#2a334d] rounded-lg border border-gray-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, sortedCustomers.length)} of {sortedCustomers.length} customers
                </span>
                <span className="text-sm text-[#ff6b00]">
                  Total Outstanding: R {sortedCustomers.reduce((sum, customer) => {
                    const amount = typeof customer.outstandingTotalBalance === 'number' 
                      ? customer.outstandingTotalBalance 
                      : 0;
                    return sum + amount;
                  }, 0).toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-2 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234] transition-colors"
                >
                  <ChevronFirst size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-1 px-4">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = currentPage - 2 + i;
                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded ${
                            currentPage === pageNum
                              ? 'bg-[#ff6b00] text-white'
                              : 'bg-[#1a2234] text-gray-400 hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-[#1a2234] text-white rounded hover:bg-[#ff6b00] disabled:opacity-50 disabled:hover:bg-[#1a2234] transition-colors"
                >
                  <ChevronLast size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleBulkSelection}
              disabled={isLoadingCustomers || currentCustomers.length === 0}
              className="px-6 py-3 bg-[#ff6b00] text-white rounded-lg hover:bg-[#ff6b00]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Users size={20} />
              Select {currentCustomers.length} Customers
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperPaymentReminder;
