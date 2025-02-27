import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

const WhatsAppSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [settings, setSettings] = useState({
    enabled: false,
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
    templates: [
      { name: 'payment_reminder', status: 'pending', id: '' },
      { name: 'statement_notification', status: 'pending', id: '' },
      { name: 'payment_confirmation', status: 'pending', id: '' },
      { name: 'query_response', status: 'pending', id: '' },
      { name: 'service_interruption', status: 'pending', id: '' }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'whatsapp'));
        if (settingsDoc.exists()) {
          // Ensure templates array exists in the data
          const data = settingsDoc.data() as any;
          if (!data.templates) {
            data.templates = settings.templates; // Use default templates if not in database
          }
          setSettings(data);
        }
      } catch (error) {
        console.error('Error fetching WhatsApp settings:', error);
        toast.error('Failed to load WhatsApp settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleTemplateChange = (index: number, field: string, value: string) => {
    setSettings(prev => {
      const updatedTemplates = [...prev.templates];
      updatedTemplates[index] = {
        ...updatedTemplates[index],
        [field]: value
      };
      return {
        ...prev,
        templates: updatedTemplates
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Ensure templates array exists before saving
      const dataToSave = {
        ...settings,
        templates: settings.templates || []
      };
      
      await setDoc(doc(db, 'settings', 'whatsapp'), dataToSave);
      toast.success('WhatsApp settings saved successfully');
      
      // Update environment variables on the server
      try {
        const response = await fetch('/api/admin/update-whatsapp-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settings)
        });
        
        if (response.ok) {
          toast.success('Server environment variables updated');
        } else {
          toast.error('Failed to update server environment variables');
        }
      } catch (error) {
        console.error('Error updating server environment:', error);
        toast.error('Failed to update server configuration');
      }
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error);
      toast.error('Failed to save WhatsApp settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">WhatsApp Business API Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure your WhatsApp Business API integration settings. These settings are required for the WhatsApp functionality to work properly.
        </p>
      </div>

      <div className={`rounded-lg shadow-sm p-6 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="mb-4">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="enabled"
              name="enabled"
              checked={settings.enabled}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enabled" className="ml-2 block text-sm font-medium">
              Enable WhatsApp Integration
            </label>
          </div>
          
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            To set up WhatsApp Business API integration, you need to create a Meta Developer account, set up a WhatsApp Business app, and obtain the necessary credentials.
          </p>
          
          <a 
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 text-sm inline-flex items-center mb-4"
          >
            Learn how to set up WhatsApp Business API →
          </a>
        </div>
        
        <div className="mb-4">
          <label htmlFor="phoneNumberId" className="block text-sm font-medium mb-1">
            Phone Number ID
          </label>
          <input
            type="text"
            id="phoneNumberId"
            name="phoneNumberId"
            value={settings.phoneNumberId}
            onChange={handleChange}
            placeholder="e.g., 601196339736755"
            className={`w-full p-2 border rounded-md ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Found in Meta Developer Portal under WhatsApp &gt; API Setup
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="businessAccountId" className="block text-sm font-medium mb-1">
            Business Account ID
          </label>
          <input
            type="text"
            id="businessAccountId"
            name="businessAccountId"
            value={settings.businessAccountId}
            onChange={handleChange}
            placeholder="e.g., 3974832606133297"
            className={`w-full p-2 border rounded-md ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Found in Meta Developer Portal under WhatsApp &gt; API Setup
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="accessToken" className="block text-sm font-medium mb-1">
            Access Token
          </label>
          <input
            type="password"
            id="accessToken"
            name="accessToken"
            value={settings.accessToken}
            onChange={handleChange}
            placeholder="Enter your WhatsApp API access token"
            className={`w-full p-2 border rounded-md ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <p className="text-xs text-gray-500 mt-1">
            Generate this in Meta Developer Portal under System Users or App Dashboard
          </p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="webhookVerifyToken" className="block text-sm font-medium mb-1">
            Webhook Verify Token
          </label>
          <input
            type="text"
            id="webhookVerifyToken"
            name="webhookVerifyToken"
            value={settings.webhookVerifyToken}
            onChange={handleChange}
            placeholder="e.g., mohokare_whatsapp_webhook_verify_token"
            className={`w-full p-2 border rounded-md ${
              isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
            }`}
          />
          <p className="text-xs text-gray-500 mt-1">
            This is a custom token you create to verify webhook requests from Meta.
          </p>
        </div>
      </div>
      
      <div className={`rounded-lg shadow-sm p-6 mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}>
        <h3 className="text-lg font-medium mb-4">Message Templates</h3>
        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Message templates must be approved by WhatsApp before they can be used.
          Create these templates in your Meta Business Manager and enter their IDs below.
        </p>
        
        <div className={`border rounded-md overflow-hidden ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={isDarkMode ? 'bg-gray-600' : 'bg-gray-50'}>
              <tr>
                <th className="px-4 py-2 text-left">Template ID</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {settings.templates && settings.templates.map((template, index) => (
                <tr key={template.name} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td className="px-4 py-2">{template.name.replace('_', ' ')}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={template.id || ''}
                      onChange={(e) => handleTemplateChange(index, 'id', e.target.value)}
                      placeholder="Enter template ID"
                      className={`p-1 border rounded w-full ${
                        isDarkMode ? 'bg-gray-600 border-gray-500' : 'bg-white border-gray-300'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 rounded-md text-white ${
            saving
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {saving ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </span>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
