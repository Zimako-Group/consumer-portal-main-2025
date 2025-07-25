import React, { useState, useEffect } from 'react';
import { Mail, Send, Users, CheckCircle, AlertCircle, Clock, Eye, History } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { sendBulkEmails as sendBulkEmailsService, BulkEmailData } from '../services/emailService';
import { logEmailBatch, generateBatchId, getEmailStats, EmailStats } from '../services/emailLogService';

interface Customer {
  accountNumber: string;
  email: string;
  fullName: string;
  phone: string;
  accountStatus: string;
}

interface EmailTemplate {
  id: string;
  subject: string;
  content: string;
  type: 'statement_notification' | 'payment_reminder' | 'custom';
}

const BulkEmailDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({
    id: 'statement_notification',
    subject: 'Your Monthly Statement is Ready for Download',
    content: `Dear Customer,

Please find attached your Mohokare Local Municipality statement of account.

Paying your municipal account in full and on time ensures the Municipality can continue delivering essential services to all residents.

Payment Options:
You may make payments using any of the following convenient methods:

Consumer Portal: www.consumerportal.co.za

EasyPay: Pay at popular retail outlets such as Pick n Pay and Shoprite Checkers

Debit Orders

Direct Deposits at all major banks

Internet and Cell Phone Banking

Council Pay-Points (Customer Service Centers)

Payment Arrangements:
If you're unable to pay in full, you can apply for a payment arrangement via the portal.
Visit www.consumerportal.co.za and click on "Make Arrangement."

Meter Readings:
To ensure accurate billing, you are encouraged to submit your monthly actual readings.
Simply visit the portal and click on "Meter Reading" at the end of each month.

Billing Queries:
For any billing or service-related issues, please log your query online.
Visit the portal and click on "Log Query", then provide a full description for quick resolution.

Should you have any further questions or require assistance, please don't hesitate to contact us.

Kind regards,
Mohokare Local Municipality`,
    type: 'statement_notification'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [emailStats, setEmailStats] = useState({
    totalCustomers: 0,
    customersWithEmail: 0,
    emailsSent: 0,
    selectedCount: 0
  });
  const [historicalStats, setHistoricalStats] = useState<EmailStats>({
    totalEmailsSent: 0,
    totalBatches: 0,
    successRate: 0,
    recentActivity: []
  });
  const [showHistory, setShowHistory] = useState(false);

  // Predefined email templates
  const templates: EmailTemplate[] = [
    {
      id: 'statement_notification',
      subject: 'Your Monthly Statement is Ready for Download',
      content: `Dear Customer,

Please find attached your Mohokare Local Municipality statement of account.

Paying your municipal account in full and on time ensures the Municipality can continue delivering essential services to all residents.

Payment Options:
You may make payments using any of the following convenient methods:

Consumer Portal: www.consumerportal.co.za

EasyPay: Pay at popular retail outlets such as Pick n Pay and Shoprite Checkers

Debit Orders

Direct Deposits at all major banks

Internet and Cell Phone Banking

Council Pay-Points (Customer Service Centers)

Payment Arrangements:
If you're unable to pay in full, you can apply for a payment arrangement via the portal.
Visit www.consumerportal.co.za and click on "Make Arrangement."

Meter Readings:
To ensure accurate billing, you are encouraged to submit your monthly actual readings.
Simply visit the portal and click on "Meter Reading" at the end of each month.

Billing Queries:
For any billing or service-related issues, please log your query online.
Visit the portal and click on "Log Query", then provide a full description for quick resolution.

Should you have any further questions or require assistance, please don't hesitate to contact us.

Kind regards,
Mohokare Local Municipality`,
      type: 'statement_notification'
    },
    {
      id: 'payment_reminder',
      subject: 'Payment Reminder - Account {{accountNumber}}',
      content: `Dear {{customerName}},

This is a friendly reminder that your account has an outstanding balance.

Account Number: {{accountNumber}}
Outstanding Amount: {{outstandingAmount}}

Please visit our customer portal to view your statement and make a payment:
https://consumerportal.co.za/statement

Thank you for your prompt attention to this matter.

Best regards,
The Zimako Team`,
      type: 'payment_reminder'
    },
    {
      id: 'custom',
      subject: 'Important Notice from Zimako',
      content: `Dear {{customerName}},

[Your custom message here]

Best regards,
The Zimako Team`,
      type: 'custom'
    }
  ];

  // Fetch customers and email stats from Firestore
  useEffect(() => {
    fetchCustomers();
    fetchEmailStats();
  }, []);

  // Update stats when customers or selection changes
  useEffect(() => {
    const customersWithEmail = customers.filter(c => c.email && c.email.trim() !== '');
    
    setEmailStats(prev => ({
      ...prev,
      customersWithEmail: customersWithEmail.length,
      selectedCount: selectedCustomers.length
    }));
  }, [customers, selectedCustomers]);

  const fetchEmailStats = async () => {
    try {
      console.log('🔄 Dashboard: Fetching email stats...');
      const stats = await getEmailStats();
      console.log('📊 Dashboard: Received stats:', stats);
      setHistoricalStats(stats);
      console.log('✅ Dashboard: Historical stats updated');
    } catch (error) {
      console.error('❌ Dashboard: Error fetching email stats:', error);
    }
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      if (!db) {
        toast.error('Database connection not available');
        return;
      }

      const customersRef = collection(db, 'customers');
      const querySnapshot = await getDocs(customersRef);
      
      const customerData: Customer[] = [];
      let totalCustomers = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const accountNumber = doc.id; // Document ID is the account number
        
        // Count all customers for total
        totalCustomers++;
        
        // Check if customer has an email address and it's a valid string
        const email = data.email;
        if (email && 
            typeof email === 'string' && 
            email.trim() !== '' && 
            email.trim().toLowerCase() !== 'n/a' &&
            email.includes('@')) {
          customerData.push({
            accountNumber: accountNumber,
            email: email.trim(),
            fullName: data.accountHolderName || data.fullName || data.name || 'Unknown',
            phone: (data.erfNumber || data.phone || '').toString(),
            accountStatus: data.accountStatus || 'Active'
          });
        } else {
          // Log customers without valid email for debugging
          console.log(`Customer ${accountNumber} has invalid email:`, email, typeof email);
        }
      });

      console.log('Fetched customers:', {
        total: totalCustomers,
        withEmail: customerData.length
      });
      
      setCustomers(customerData);
      
      // Update stats with correct counts
      setEmailStats(prev => ({
        ...prev,
        totalCustomers: totalCustomers,
        customersWithEmail: customerData.length
      }));
      
      toast.success(`Loaded ${customerData.length} customers with email addresses out of ${totalCustomers} total customers`);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setEmailTemplate(template);
    }
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.accountNumber));
    }
  };

  const handleSelectCustomer = (accountNumber: string) => {
    setSelectedCustomers(prev => 
      prev.includes(accountNumber) 
        ? prev.filter(id => id !== accountNumber)
        : [...prev, accountNumber]
    );
  };

  const handleSelectActiveOnly = () => {
    const activeCustomers = customers.filter(c => c.accountStatus === 'ACTIVE' || c.accountStatus === 'Active');
    setSelectedCustomers(activeCustomers.map(c => c.accountNumber));
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setIsSendingTest(true);
    const loadingToast = toast.loading('Sending test email...');
    
    try {
      // Get API key from environment variables
      const apiKey = import.meta.env.VITE_RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('Resend API key is not configured. Please set VITE_RESEND_API_KEY in your .env file.');
      }

      // Create test email content
      const testEmailContent = `Dear Test User,

This is a test email from your Zimako Bulk Email Dashboard!

Your monthly statement for ${getCurrentMonth()} would normally be available for download.

You can access your statement by visiting our customer portal at:
https://consumerportal.co.za/statement

This email was sent using Resend's sandbox domain for testing purposes.

Best regards,
The Zimako Team`;

      // Send test email using the email service
      const result = await sendBulkEmailsService({
        recipients: [{
          email: testEmail,
          name: 'Test User',
          accountNumber: 'TEST001'
        }],
        subject: `Test Email - Statement Notification for ${getCurrentMonth()}`,
        content: testEmailContent,
        templateType: 'statement_notification'
      }, apiKey);
      
      toast.dismiss(loadingToast);
      
      if (result.successful > 0) {
        toast.success(`Test email sent successfully to ${testEmail}!`);
        
        // Update emails sent count
        setEmailStats(prev => ({
          ...prev,
          emailsSent: prev.emailsSent + 1
        }));
        
        // Clear test email input
        setTestEmail('');
      } else {
        // Extract detailed error message from results
        const errorDetails = result.results && result.results.length > 0 
          ? result.results[0].error || 'Unknown error'
          : 'Failed to send test email';
        
        toast.error(`Test email failed: ${errorDetails}`);
        console.error('Test email failed:', result);
      }
      
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error sending test email:', error);
      
      if (error instanceof Error && error.message.includes('Resend API key')) {
        toast.error('Email service not configured. Please set up your Resend API key.');
      } else {
        toast.error('Failed to send test email. Please try again.');
      }
    } finally {
      setIsSendingTest(false);
    }
  };

  const previewEmail = (customer: Customer) => {
    let content = emailTemplate.content;
    let subject = emailTemplate.subject;
    
    // Replace placeholders
    content = content.replace(/{{customerName}}/g, customer.fullName);
    content = content.replace(/{{accountNumber}}/g, customer.accountNumber);
    content = content.replace(/{{currentMonth}}/g, getCurrentMonth());
    content = content.replace(/{{outstandingAmount}}/g, 'R 0.00'); // Placeholder
    
    subject = subject.replace(/{{customerName}}/g, customer.fullName);
    subject = subject.replace(/{{accountNumber}}/g, customer.accountNumber);
    subject = subject.replace(/{{currentMonth}}/g, getCurrentMonth());

    return { subject, content };
  };

  const sendBulkEmails = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select at least one customer');
      return;
    }

    setIsSending(true);
    const loadingToast = toast.loading('Sending emails...');
    
    try {
      // Get API key from environment variables
      const apiKey = import.meta.env.VITE_RESEND_API_KEY;
      if (!apiKey) {
        throw new Error('Resend API key is not configured. Please set VITE_RESEND_API_KEY in your .env file.');
      }

      const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.accountNumber));
      
      // Prepare bulk email data
      const bulkEmailData: BulkEmailData = {
        recipients: selectedCustomerData.map(customer => ({
          email: customer.email,
          name: customer.fullName,
          accountNumber: customer.accountNumber
        })),
        subject: emailTemplate.subject,
        content: emailTemplate.content,
        templateType: emailTemplate.type
      };
      
      // Send emails using the email service
      const result = await sendBulkEmailsService(bulkEmailData, apiKey);
      
      // Log email batch to Firestore
      try {
        console.log('💾 Starting email batch logging...');
        const batchId = generateBatchId();
        console.log('🏷️ Generated batch ID:', batchId);
        console.log('📧 Email results to log:', result.results);
        
        const emailLogs = result.results.map(emailResult => {
          const logEntry: any = {
            batchId,
            recipientEmail: emailResult.email,
            recipientName: selectedCustomerData.find(c => c.email === emailResult.email)?.fullName || 'Unknown',
            recipientAccountNumber: selectedCustomerData.find(c => c.email === emailResult.email)?.accountNumber || 'Unknown',
            subject: emailTemplate.subject,
            content: emailTemplate.content,
            templateType: emailTemplate.type,
            status: emailResult.success ? 'sent' as const : 'failed' as const
          };
          
          // Only add messageId if it exists (for successful emails)
          if (emailResult.messageId) {
            logEntry.messageId = emailResult.messageId;
          }
          
          // Only add error if it exists (for failed emails)
          if (emailResult.error) {
            logEntry.error = emailResult.error;
          }
          
          return logEntry;
        });
        
        console.log('📄 Prepared email logs:', emailLogs);
        console.log('📦 Logging batch with', emailLogs.length, 'email records');

        await logEmailBatch({
          batchId,
          templateType: emailTemplate.type,
          subject: emailTemplate.subject,
          totalRecipients: selectedCustomerData.length,
          successfulSends: result.successful,
          failedSends: result.failed,
          completed: true
        }, emailLogs);
        
        console.log('✅ Email batch logged successfully!');

        // Refresh email stats after logging
        console.log('🔄 Refreshing email stats after logging...');
        await fetchEmailStats();
      } catch (logError) {
        console.error('Error logging email batch:', logError);
        // Don't fail the entire operation if logging fails
      }
      
      toast.dismiss(loadingToast);
      
      if (result.successful > 0) {
        toast.success(`Successfully sent ${result.successful} emails!`);
        
        // Update emails sent count
        setEmailStats(prev => ({
          ...prev,
          emailsSent: prev.emailsSent + result.successful
        }));
        
        if (result.failed > 0) {
          const failedEmails = result.results.filter(r => !r.success);
          toast.error(`Failed to send ${result.failed} emails. Check console for details.`);
          console.error('Failed email results:', failedEmails);
          
          // Log detailed failure information
          failedEmails.forEach(failed => {
            console.error(`❌ Failed to send to ${failed.email}: ${failed.error}`);
          });
        }
        
        // Reset selection after successful send
        setSelectedCustomers([]);
      } else {
        toast.error('Failed to send any emails. Please check your configuration.');
        console.error('All emails failed:', result.results);
      }
      
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Error sending emails:', error);
      
      if (error instanceof Error && error.message.includes('Resend API key')) {
        toast.error('Email service not configured. Please set up your Resend API key.');
      } else {
        toast.error('Failed to send emails. Please try again.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'}`}>
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                Bulk Email Dashboard
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                Send bulk emails to customers about statement availability
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-500" />
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    Total Customers
                  </p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                    {emailStats.totalCustomers}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    Emails Sent
                  </p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                    {emailStats.emailsSent}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-purple-500" />
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    With Email
                  </p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                    {emailStats.customersWithEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center gap-3">
                <Send className="w-5 h-5 text-orange-500" />
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    Selected
                  </p>
                  <p className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                    {emailStats.selectedCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Email Stats */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                Email History & Analytics
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                    : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                }`}
              >
                <History className="w-4 h-4" />
                {showHistory ? 'Hide History' : 'Show History'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                      Total Emails Sent
                    </p>
                    <p className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                      {historicalStats.totalEmailsSent}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-green-500" />
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                      Total Batches
                    </p>
                    <p className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                      {historicalStats.totalBatches}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                  <div>
                    <p className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                      Success Rate
                    </p>
                    <p className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                      {historicalStats.successRate}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {showHistory && (
              <div className="mt-4">
                <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                  Recent Activity
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {historicalStats.recentActivity.length > 0 ? (
                    historicalStats.recentActivity.map((log, index) => (
                      <div key={index} className={`p-3 rounded-lg border ${isDarkMode ? 'bg-dark-bg border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                log.status === 'sent' ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                              <span className={`text-sm font-medium ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                                {log.recipientName}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                {log.templateType.replace('_', ' ')}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                              {log.recipientEmail} • {log.recipientAccountNumber}
                            </p>
                            {log.error && (
                              <p className="text-xs text-red-500 mt-1">
                                Error: {log.error}
                              </p>
                            )}
                          </div>
                          <div className={`text-xs ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>
                            {log.sentAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-4 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>
                      <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No email history available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Template Section */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
              Email Template
            </h2>

            {/* Template Selection */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                Select Template
              </label>
              <select
                value={emailTemplate.id}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full p-3 rounded-lg border bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: 'black' }}
              >
                <option value="statement_notification" style={{ color: 'black' }}>Statement Notification</option>
                <option value="payment_reminder" style={{ color: 'black' }}>Payment Reminder</option>
                <option value="custom" style={{ color: 'black' }}>Custom Message</option>
              </select>
            </div>

            {/* Subject Line */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                Subject Line
              </label>
              <input
                type="text"
                value={emailTemplate.subject}
                onChange={(e) => setEmailTemplate(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full p-3 rounded-lg border bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: 'black' }}
                placeholder="Enter email subject"
              />
            </div>

            {/* Email Content */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                Email Content
              </label>
              <textarea
                value={emailTemplate.content}
                onChange={(e) => setEmailTemplate(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
                className="w-full p-3 rounded-lg border bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ color: 'black' }}
                placeholder="Enter email content"
              />
            </div>

            {/* Available Placeholders */}
            <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} mb-4`}>
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                Available Placeholders:
              </p>
              <div className="flex flex-wrap gap-2">
                {['{{customerName}}', '{{accountNumber}}', '{{currentMonth}}', '{{outstandingAmount}}'].map(placeholder => (
                  <span
                    key={placeholder}
                    className={`px-2 py-1 text-xs rounded ${
                      isDarkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {placeholder}
                  </span>
                ))}
              </div>
            </div>

            {/* Test Email Section */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-50'} mb-4`}>
              <h3 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-700'}`}>
                Test Email (Sandbox Mode)
              </h3>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 p-2 text-sm rounded border bg-white border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ color: 'black' }}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={!testEmail || isSendingTest}
                  className={`px-4 py-2 text-sm rounded font-medium transition-colors ${
                    !testEmail || isSendingTest
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isSendingTest ? 'Sending...' : 'Test'}
                </button>
              </div>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>
                Uses Resend sandbox (you@resend.dev) - perfect for testing while DNS propagates
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={sendBulkEmails}
              disabled={selectedCustomers.length === 0 || isSending}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                selectedCustomers.length === 0 || isSending
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSending ? (
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 animate-spin" />
                  Sending Emails...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Send to {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          </div>

          {/* Customer Selection Section */}
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-dark-card' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                Customer Selection
              </h2>
              <button
                onClick={fetchCustomers}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded-lg ${
                  isDarkMode 
                    ? 'bg-dark-bg hover:bg-dark-hover text-dark-text-primary' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                } transition-colors`}
              >
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {/* Selection Controls */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className={`px-3 py-1 text-sm rounded-lg ${
                  isDarkMode 
                    ? 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/30' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } transition-colors`}
              >
                {selectedCustomers.length === customers.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleSelectActiveOnly}
                className={`px-3 py-1 text-sm rounded-lg ${
                  isDarkMode 
                    ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                } transition-colors`}
              >
                Select Active Only
              </button>
            </div>

            {/* Customer List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="w-6 h-6 animate-spin text-blue-500" />
                  <span className={`ml-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    Loading customers...
                  </span>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className={`${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                    No customers with email addresses found
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customers.map((customer, index) => (
                    <div
                      key={customer.accountNumber}
                      className={`p-3 rounded-lg border ${
                        selectedCustomers.includes(customer.accountNumber)
                          ? isDarkMode 
                            ? 'bg-blue-900/20 border-blue-500' 
                            : 'bg-blue-50 border-blue-300'
                          : isDarkMode 
                            ? 'bg-dark-bg border-dark-border hover:bg-dark-hover' 
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      } transition-colors cursor-pointer`}
                      onClick={() => handleSelectCustomer(customer.accountNumber)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {/* Customer Number */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                              selectedCustomers.includes(customer.accountNumber)
                                ? isDarkMode
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-600 text-white'
                                : isDarkMode
                                  ? 'bg-gray-600 text-gray-300'
                                  : 'bg-gray-300 text-gray-700'
                            }`}>
                              {index + 1}
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(customer.accountNumber)}
                              onChange={() => handleSelectCustomer(customer.accountNumber)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div>
                              <p className={`font-medium ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                                {customer.fullName}
                              </p>
                              <p className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                                {customer.accountNumber} • {customer.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            customer.accountStatus === 'ACTIVE' || customer.accountStatus === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {customer.accountStatus}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const preview = previewEmail(customer);
                              alert(`Subject: ${preview.subject}\n\nContent:\n${preview.content}`);
                            }}
                            className={`p-1 rounded ${
                              isDarkMode 
                                ? 'hover:bg-dark-hover text-dark-text-secondary' 
                                : 'hover:bg-gray-200 text-gray-600'
                            } transition-colors`}
                            title="Preview email"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmailDashboard;
