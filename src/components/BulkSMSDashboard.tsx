import React, { useState, useRef } from 'react';
import { sendBulkSMS } from '../services/bulkCommunicationService';
import toast from 'react-hot-toast';
import { BarChart3, TrendingUp, TrendingDown, Upload, FileText, Send, CheckCircle, AlertCircle, Wand2 } from 'lucide-react';

interface Recipient {
  phone?: string;
  accountNumber?: string;
  name?: string;
}

const BulkSMSDashboard: React.FC = () => {
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<(string | Recipient)[]>([]);
  const [isTemplate, setIsTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [currentStats, setCurrentStats] = useState({ sent: 0, successful: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Test section state
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  // Default template message
  const defaultTemplate = 'Dear Mohokare customer, your municipal statement is available for download. Click here to download and settle your account https://consumerportal.co.za/statement or visit: https://consumerportal.co.za to manage your account going forward.';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      // Parse CSV data - look for headers to determine format
      const parsedRecipients: (string | Recipient)[] = [];
      let hasHeaders = false;
      let phoneIndex = -1;
      let accountIndex = -1;
      let nameIndex = -1;
      
      lines.forEach((line, lineIndex) => {
        const parts = line.split(/[,;\t]/).map(part => part.trim());
        
        // Check if first line contains headers
        if (lineIndex === 0) {
          const lowerParts = parts.map(p => p.toLowerCase());
          phoneIndex = lowerParts.findIndex(p => p.includes('phone') || p.includes('mobile') || p.includes('cell'));
          accountIndex = lowerParts.findIndex(p => p.includes('account') || p.includes('number') || p.includes('id'));
          nameIndex = lowerParts.findIndex(p => p.includes('name') || p.includes('customer'));
          
          if (phoneIndex >= 0 || accountIndex >= 0) {
            hasHeaders = true;
            return; // Skip header line
          }
        }
        
        if (hasHeaders && parts.length > 1) {
          // Structured CSV with headers
          const recipient: Recipient = {};
          
          if (phoneIndex >= 0 && parts[phoneIndex]) {
            const cleaned = parts[phoneIndex].replace(/[^\d+]/g, '');
            if (cleaned.length >= 9 && cleaned.length <= 15) {
              recipient.phone = cleaned;
            }
          }
          
          if (accountIndex >= 0 && parts[accountIndex]) {
            recipient.accountNumber = parts[accountIndex];
          }
          
          if (nameIndex >= 0 && parts[nameIndex]) {
            recipient.name = parts[nameIndex];
          }
          
          // Only add if we have either phone or account number
          if (recipient.phone || recipient.accountNumber) {
            parsedRecipients.push(recipient);
          }
        } else {
          // Simple list format - try to extract phone numbers or account numbers
          parts.forEach(part => {
            const cleaned = part.replace(/[^\d+]/g, '');
            if (cleaned.length >= 9 && cleaned.length <= 15) {
              parsedRecipients.push(cleaned);
            } else if (part.length > 0 && /^[A-Za-z0-9]+$/.test(part)) {
              // Could be an account number
              parsedRecipients.push({ accountNumber: part });
            }
          });
        }
      });
      
      // Remove duplicates
      const uniqueRecipients = parsedRecipients.filter((recipient, index, arr) => {
        if (typeof recipient === 'string') {
          return arr.findIndex(r => typeof r === 'string' && r === recipient) === index;
        } else {
          return arr.findIndex(r => 
            typeof r === 'object' && 
            r.phone === recipient.phone && 
            r.accountNumber === recipient.accountNumber
          ) === index;
        }
      });
      
      setRecipients(uniqueRecipients);
      toast.success(`Loaded ${uniqueRecipients.length} unique recipients`);
    };
    reader.readAsText(file);
  };

  const handleSendSMS = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Please upload recipients or add phone numbers');
      return;
    }

    if (!window.confirm(`Send SMS to ${recipients.length} recipients?`)) {
      return;
    }

    setIsLoading(true);
    setSendingProgress(0);
    setCurrentStats({ sent: 0, successful: 0, failed: 0 });
    
    try {
      // Send bulk SMS - map recipients to the correct format
      const formattedRecipients = recipients.map(recipient => {
        if (typeof recipient === 'string') {
          return recipient; // String phone numbers are kept as is
        } else {
          // Map to the format expected by bulkCommunicationService
          return {
            phoneNumber: recipient.phone,
            accountNumber: recipient.accountNumber,
            name: recipient.name
          };
        }
      });
      
      // Filter for valid recipients
      const validRecipients = formattedRecipients.filter(recipient => {
        if (typeof recipient === 'string') {
          return true; // String phone numbers are valid
        } else {
          // For objects, we need either a phone number OR an account number
          return recipient.phoneNumber || recipient.accountNumber;
        }
      });
      
      if (validRecipients.length === 0) {
        toast.error('No valid recipients found');
        setIsLoading(false);
        return;
      }
      
      // Set up real-time progress tracking
      const totalCount = validRecipients.length;
      const batchSize = 100; // Same as in bulkCommunicationService
      const batchCount = Math.ceil(totalCount / batchSize);
      let currentBatch = 0;
      
      // Progress update function
      const updateProgress = () => {
        currentBatch++;
        const progress = Math.min(Math.floor((currentBatch / batchCount) * 100), 95);
        setSendingProgress(progress);
      };
      
      // Start progress updates
      const progressInterval = setInterval(() => {
        if (currentBatch < batchCount) {
          updateProgress();
        }
      }, 800);
      
      // Send the messages using Infobip directly
      const response = await sendBulkSMS(
        validRecipients, 
        message, 
        isTemplate, 
        'Admin Dashboard' // Sender identifier
      );
      
      // Clear progress interval and set final progress
      clearInterval(progressInterval);
      setSendingProgress(100);
      
      // Update final stats
      setCurrentStats({
        sent: response.totalRecipients || 0,
        successful: response.totalSent || 0,
        failed: response.totalFailed || 0
      });
      
      setResults(response);
      
      if (response.success) {
        toast.success(`Successfully sent ${response.totalSent} messages`);
      } else if (response.totalSent > 0 && response.totalFailed > 0) {
        toast(`Partially successful: ${response.totalSent} sent, ${response.totalFailed} failed`, {
          icon: '⚠️'
        });
      } else {
        toast.error('Failed to send messages');
      }
    } catch (error) {
      toast.error('Failed to send bulk SMS');
      console.error('Bulk SMS error:', error);
    } finally {
      setIsLoading(false);
    }  
  };

  const resetForm = () => {
    setMessage('');
    setRecipients([]);
    setIsTemplate(false);
    setResults(null);
    setSendingProgress(0);
    setCurrentStats({ sent: 0, successful: 0, failed: 0 });
    setTestPhoneNumber('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const useTemplate = () => {
    setIsTemplate(true);
    setMessage(defaultTemplate);
  };
  
  // Function to handle test SMS sending
  const handleTestSMS = async () => {
    if (!testPhoneNumber.trim()) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    setIsTesting(true);
    
    try {
      // Send a single SMS using the sendBulkSMS function
      const response = await sendBulkSMS(
        [testPhoneNumber], 
        message, 
        isTemplate, 
        'Test SMS'
      );
      
      if (response.success && response.totalSent > 0) {
        toast.success(`Test SMS sent successfully to ${testPhoneNumber}`);
      } else {
        toast.error(`Failed to send test SMS: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Error sending test SMS');
      console.error('Test SMS error:', error);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Bulk SMS Statement Distribution
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Send statement notifications to multiple customers via SMS
        </p>
      </div>

      {/* Statistics Dashboard - Always Visible */}
      <div className="mb-6 space-y-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Sent */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Recipients</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {recipients.length}
                </p>
                <p className="text-xs text-blue-500">
                  {recipients.length > 0 ? 'Ready to send' : 'Upload recipients'}
                </p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Successful */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Successful</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {currentStats.successful}
                </p>
                {currentStats.sent > 0 ? (
                  <p className="text-xs text-green-500">
                    {((currentStats.successful / currentStats.sent) * 100).toFixed(1)}% success rate
                  </p>
                ) : (
                  <p className="text-xs text-green-500">Awaiting results</p>
                )}
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Failed */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {currentStats.failed}
                </p>
                {currentStats.sent > 0 ? (
                  <p className="text-xs text-red-500">
                    {((currentStats.failed / currentStats.sent) * 100).toFixed(1)}% failure rate
                  </p>
                ) : (
                  <p className="text-xs text-red-500">No failures yet</p>
                )}
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress and Additional Details */}
        {(isLoading || results) && (
          <div className="space-y-4">
            {/* Progress Bar */}
            {isLoading && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Sending SMS Messages...</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {currentStats.sent} / {recipients.length} ({Math.round(sendingProgress)}%)
                </p>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${sendingProgress}%` }}
                ></div>
              </div>
            </div>
          )}

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Sent */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Sent</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {currentStats.sent}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                  <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Successful */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Successful</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {currentStats.successful}
                  </p>
                  {currentStats.sent > 0 && (
                    <p className="text-xs text-green-500">
                      {((currentStats.successful / currentStats.sent) * 100).toFixed(1)}% success rate
                    </p>
                  )}
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                  <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Failed */}
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {currentStats.failed}
                  </p>
                  {currentStats.sent > 0 && (
                    <p className="text-xs text-red-500">
                      {((currentStats.failed / currentStats.sent) * 100).toFixed(1)}% failure rate
                    </p>
                  )}
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                  <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
            </div>

            {/* Detailed Results */}
            {results && (
            <div className={`p-4 rounded-lg border ${
              results.success 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start">
                {results.success ? (
                  <CheckCircle className="mr-2 text-green-500" size={20} />
                ) : (
                  <AlertCircle className="mr-2 text-red-500" size={20} />
                )}
                <h3 className={`font-medium ${
                  results.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                  SMS Campaign Complete
                </h3>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {results.totalRecipients}
                  </div>
                  <div className="text-xs text-gray-500">Recipients</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {results.totalSent}
                  </div>
                  <div className="text-xs text-gray-500">Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {results.totalFailed}
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {results.totalRecipients > 0 ? ((results.totalSent / results.totalRecipients) * 100).toFixed(1) : 0}%
                  </div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
              </div>

              {/* Failed Messages Details */}
              {results.failedMessages && results.failedMessages.length > 0 && (
                <div className="mt-4">
                  <details className="group">
                    <summary className="cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
                      View Failed Messages ({results.failedMessages.length})
                    </summary>
                    <div className="mt-2 max-h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded border p-2">
                      {results.failedMessages.slice(0, 10).map((failed: any, index: number) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-400 py-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                          <span className="font-medium">
                            {typeof failed.recipient === 'string' 
                              ? failed.recipient 
                              : failed.recipient.accountNumber || failed.recipient.phone || 'Unknown'
                            }
                          </span>
                          <span className="text-red-500 ml-2">- {failed.error}</span>
                        </div>
                      ))}
                      {results.failedMessages.length > 10 && (
                        <div className="text-xs text-gray-500 italic pt-1">
                          ... and {results.failedMessages.length - 10} more failures
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {results.message && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 italic">
                  {results.message}
                </p>
              )}
            </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composition */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                SMS Message {isTemplate && <span className="text-blue-500">(Template Mode)</span>}
              </label>
              <button
                onClick={useTemplate}
                className="flex items-center px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-800"
                disabled={isLoading}
              >
                <Wand2 size={12} className="mr-1" />
                Use Template
              </button>
            </div>
            <textarea
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={isTemplate ? "Template with placeholders: {user_account_number}, {account_balance}, {customer_name}, {link to view statement}" : "Enter your SMS message here..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Characters: {message.length}</span>
              <span>{message.length > 160 ? `${Math.ceil(message.length / 160)} SMS parts` : '1 SMS'}</span>
            </div>
            {isTemplate && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                <strong>Template Placeholders:</strong> {'{user_account_number}'}, {'{account_balance}'}, {'{customer_name}'}, {'{link to view statement}'}
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-3">
              <div className="bg-blue-500 text-white rounded-lg p-3 max-w-xs ml-auto text-sm">
                {message || 'Your message will appear here...'}
              </div>
            </div>
          </div>
        </div>

        {/* Recipients Management */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Recipients (CSV/TXT)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                accept=".csv,.txt"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                disabled={isLoading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={isLoading}
              >
                <Upload size={16} className="mr-2" />
                Upload File
              </button>
              <span className="text-sm text-gray-500">
                {recipients.length} recipients loaded
              </span>
            </div>
            {isTemplate && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                For templates: Include columns for phone numbers and account numbers
              </p>
            )}
          </div>

          {/* Recipients List Preview */}
          {recipients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipients Preview (showing first 5)
              </label>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-32 overflow-y-auto">
                {recipients.slice(0, 5).map((recipient, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                    {typeof recipient === 'string' 
                      ? recipient 
                      : `${recipient.accountNumber || 'N/A'} - ${recipient.phone || 'Phone from account'} ${recipient.name ? `(${recipient.name})` : ''}`
                    }
                  </div>
                ))}
                {recipients.length > 5 && (
                  <div className="text-sm text-gray-500 italic">
                    ... and {recipients.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={handleSendSMS}
              disabled={isLoading || !message.trim() || recipients.length === 0}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} className="mr-2" />
              {isLoading ? 'Sending...' : 'Send SMS'}
            </button>
            
            <button
              onClick={resetForm}
              disabled={isLoading}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Test SMS Section */}
      <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-300 dark:border-green-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-green-800 dark:text-green-300 flex items-center">
            <Wand2 className="mr-2" size={16} />
            Test SMS Functionality
          </h3>
          <div className="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded">
            Temporary Testing Tool
          </div>
        </div>
        
        <div className="flex flex-col space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Phone Number
            </label>
            <input
              type="text"
              value={testPhoneNumber}
              onChange={(e) => setTestPhoneNumber(e.target.value)}
              placeholder="Enter your phone number (e.g., 0721234567)"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
              disabled={isTesting}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number will be formatted automatically (country code added if needed)
            </p>
          </div>
          
          <button
            onClick={handleTestSMS}
            disabled={isTesting || !testPhoneNumber.trim() || !message.trim()}
            className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Sending...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Send Test SMS
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start">
          <FileText className="mr-2 text-blue-500 mt-0.5" size={16} />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">File Format Instructions:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Upload a CSV or TXT file containing phone numbers or account numbers</li>
              <li>For templates: Include columns for phone, account, and name</li>
              <li>Supported phone formats: +27123456789, 27123456789, 0123456789</li>
              <li>Account numbers will fetch customer data automatically</li>
              <li>Invalid entries will be automatically filtered out</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


export default BulkSMSDashboard;
