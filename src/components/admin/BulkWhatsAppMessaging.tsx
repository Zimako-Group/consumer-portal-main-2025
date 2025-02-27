import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import axios from 'axios';
import { toast } from 'react-toastify';

interface Template {
  name: string;
  id: string;
  language: string;
  status: string;
  category: string;
  components: any[];
  configured: boolean;
  inUse: boolean;
}

const BulkWhatsAppMessaging: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [messageType, setMessageType] = useState<'text' | 'template'>('text');
  const [textContent, setTextContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.name === selectedTemplate);
      if (template) {
        setCurrentTemplate(template);
        
        // Initialize template parameters
        const params: Record<string, string> = {};
        template.components?.forEach(component => {
          if (component.type === 'BODY' || component.type === 'HEADER') {
            component.parameters?.forEach((param: any, index: number) => {
              params[`${component.type.toLowerCase()}_param_${index + 1}`] = '';
            });
          }
        });
        setTemplateParams(params);
      }
    }
  }, [selectedTemplate, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/whatsapp/templates');
      setTemplates(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load WhatsApp templates');
      setLoading(false);
    }
  };

  const handleSendMessages = async () => {
    if (!validateForm()) return;
    
    setSending(true);
    setResult(null);
    
    try {
      // Format recipients
      const recipientList = recipients
        .split('\n')
        .map(r => r.trim())
        .filter(r => r.length > 0);
      
      // Prepare request body
      const requestBody: any = {
        recipients: recipientList,
        messageType
      };
      
      if (messageType === 'text') {
        requestBody.content = textContent;
      } else {
        requestBody.content = selectedTemplate;
        requestBody.templateParams = templateParams;
      }
      
      // Send request
      const response = await axios.post('/api/whatsapp/bulk-message', requestBody);
      setResult(response.data);
      
      // Show success message
      toast.success(`Successfully sent ${response.data.totalSent} messages`);
    } catch (error: any) {
      console.error('Error sending bulk messages:', error);
      toast.error(error.response?.data?.error || 'Failed to send bulk messages');
    } finally {
      setSending(false);
    }
  };

  const validateForm = (): boolean => {
    if (!recipients.trim()) {
      toast.error('Please enter at least one recipient');
      return false;
    }
    
    if (messageType === 'text' && !textContent.trim()) {
      toast.error('Please enter a message');
      return false;
    }
    
    if (messageType === 'template' && !selectedTemplate) {
      toast.error('Please select a template');
      return false;
    }
    
    return true;
  };

  const handleTemplateParamChange = (key: string, value: string) => {
    setTemplateParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className={`p-6 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
      <h2 className="text-2xl font-bold mb-6">Bulk WhatsApp Messaging</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className="text-lg font-semibold mb-4">Message Configuration</h3>
          
          {/* Message Type Selection */}
          <div className="mb-4">
            <label className="block mb-2 font-medium">Message Type</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="messageType"
                  value="text"
                  checked={messageType === 'text'}
                  onChange={() => setMessageType('text')}
                />
                <span className="ml-2">Text Message</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="messageType"
                  value="template"
                  checked={messageType === 'template'}
                  onChange={() => setMessageType('template')}
                />
                <span className="ml-2">Template Message</span>
              </label>
            </div>
          </div>
          
          {/* Text Message Content */}
          {messageType === 'text' && (
            <div className="mb-4">
              <label htmlFor="textContent" className="block mb-2 font-medium">Message Content</label>
              <textarea
                id="textContent"
                rows={5}
                className={`w-full p-2 rounded border ${
                  isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-800'
                }`}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Enter your message here..."
              />
            </div>
          )}
          
          {/* Template Selection */}
          {messageType === 'template' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="template" className="block mb-2 font-medium">Select Template</label>
                <select
                  id="template"
                  className={`w-full p-2 rounded border ${
                    isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-800'
                  }`}
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select a template</option>
                  {templates.map(template => (
                    <option 
                      key={template.name} 
                      value={template.name}
                      disabled={!template.configured || template.status !== 'APPROVED'}
                    >
                      {template.name} ({template.status})
                    </option>
                  ))}
                </select>
                {loading && <p className="text-sm mt-1">Loading templates...</p>}
              </div>
              
              {/* Template Parameters */}
              {currentTemplate && (
                <div>
                  <h4 className="font-medium mb-2">Template Parameters</h4>
                  {Object.keys(templateParams).length > 0 ? (
                    <div className="space-y-3">
                      {Object.keys(templateParams).map(key => (
                        <div key={key}>
                          <label htmlFor={key} className="block mb-1 text-sm font-medium">
                            {key.replace('_param_', ' Parameter ')}
                          </label>
                          <input
                            id={key}
                            type="text"
                            className={`w-full p-2 rounded border ${
                              isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-800'
                            }`}
                            value={templateParams[key]}
                            onChange={(e) => handleTemplateParamChange(key, e.target.value)}
                            placeholder={`Enter value for ${key}`}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">This template has no parameters</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Recipients */}
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className="text-lg font-semibold mb-4">Recipients</h3>
          
          <div className="mb-4">
            <label htmlFor="recipients" className="block mb-2 font-medium">
              Phone Numbers (one per line)
            </label>
            <textarea
              id="recipients"
              rows={10}
              className={`w-full p-2 rounded border ${
                isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-800'
              }`}
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="Enter phone numbers, one per line (e.g., +27123456789)"
            />
            <p className="text-sm mt-1">
              Enter phone numbers in international format (e.g., +27123456789)
            </p>
          </div>
          
          <button
            onClick={handleSendMessages}
            disabled={sending}
            className={`w-full py-2 px-4 rounded font-medium ${
              sending
                ? 'bg-gray-500 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {sending ? 'Sending...' : 'Send Messages'}
          </button>
        </div>
      </div>
      
      {/* Results */}
      {result && (
        <div className={`mt-6 p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <p className="text-sm">Total Sent</p>
              <p className="text-xl font-bold">{result.totalSent}</p>
            </div>
            <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <p className="text-sm">Total Failed</p>
              <p className="text-xl font-bold">{result.totalFailed}</p>
            </div>
            <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <p className="text-sm">Success Rate</p>
              <p className="text-xl font-bold">
                {result.totalSent + result.totalFailed > 0
                  ? `${((result.totalSent / (result.totalSent + result.totalFailed)) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>
            <div className={`p-3 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <p className="text-sm">Total Recipients</p>
              <p className="text-xl font-bold">{result.totalSent + result.totalFailed}</p>
            </div>
          </div>
          
          {result.failedMessages.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Failed Messages</h4>
              <div className={`max-h-60 overflow-y-auto rounded border ${
                isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
              }`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {result.failedMessages.map((msg: any, index: number) => (
                      <tr key={index} className={isDarkMode ? 'bg-gray-600' : 'bg-white'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {msg.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {msg.error}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkWhatsAppMessaging;
