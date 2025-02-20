import React, { useCallback, memo } from 'react';
import { Calendar, DollarSign, Phone, Mail, User, CreditCard, Bell, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { logUserActivity } from '../utils/activity';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

interface UserAccountProps {
  userName: string;
  accountNumber: string;
  lastPaymentDate: string;
  lastAmountPaid: string;
  accountType: string;
  preferences: {
    sms: { enabled: boolean; value: string };
    whatsapp: { enabled: boolean; value: string };
    email: { enabled: boolean; value: string };
  };
  onPreferencesSave: (preferences: {
    sms: { enabled: boolean; value: string };
    whatsapp: { enabled: boolean; value: string };
    email: { enabled: boolean; value: string };
  }) => void;
}

const InputField = memo(({ 
  type, 
  value, 
  onChange, 
  placeholder 
}: { 
  type: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder: string; 
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full px-3 py-2 bg-[#1E1E1E] border border-gray-700 text-white rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
  />
));

const TabButton = memo(({ 
  tab, 
  icon: Icon, 
  label, 
  activeTab,
  onClick 
}: { 
  tab: 'profile' | 'preferences';
  icon: any;
  label: string;
  activeTab: string;
  onClick: (tab: 'profile' | 'preferences') => void;
}) => (
  <button
    onClick={() => onClick(tab)}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
      activeTab === tab
        ? 'bg-orange-500 text-white'
        : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
    }`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </button>
));

const ProfileCard = memo(({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="bg-[#1E1E1E] p-6 rounded-xl border border-gray-700">
    <div className="flex items-center gap-3 mb-4">
      <div className="bg-orange-500/10 p-2 rounded-lg">
        <Icon className="text-orange-500" size={24} />
      </div>
      <h3 className="text-gray-400">{label}</h3>
    </div>
    <p className="text-xl text-white font-medium">{value}</p>
  </div>
));

const NotificationsSection = memo(({ 
  localPreferences,
  isSaving,
  handleToggle,
  smsValue,
  whatsappValue,
  emailValue,
  setSmsValue,
  setWhatsappValue,
  setEmailValue,
  handleSavePreferences,
  showSuccessAnimation
}: {
  localPreferences: any;
  isSaving: boolean;
  handleToggle: (type: 'sms' | 'whatsapp' | 'email', enabled: boolean) => void;
  smsValue: string;
  whatsappValue: string;
  emailValue: string;
  setSmsValue: (value: string) => void;
  setWhatsappValue: (value: string) => void;
  setEmailValue: (value: string) => void;
  handleSavePreferences: () => void;
  showSuccessAnimation: boolean;
}) => (
  <motion.div
    key="preferences"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-6"
  >
    <div className="bg-[#1E1E1E] p-6 rounded-xl">
      <h2 className="text-xl font-semibold text-white mb-4">Communication Preferences</h2>
      <p className="text-gray-400 mb-6">Choose how you'd like to receive notifications about your account updates, payments, and important alerts.</p>
      
      <div className="space-y-6">
        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/10 p-2 rounded-lg">
                <Phone className="text-orange-500" size={24} />
              </div>
              <div>
                <h3 className="text-white font-medium">SMS Notifications</h3>
                <p className="text-sm text-gray-400">Receive updates via text message</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPreferences.sms.enabled}
                onChange={(e) => handleToggle('sms', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500" />
            </label>
          </div>
          {localPreferences.sms.enabled && (
            <InputField
              type="tel"
              value={smsValue}
              onChange={(e) => setSmsValue(e.target.value)}
              placeholder="Enter phone number"
            />
          )}
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/10 p-2 rounded-lg">
                <MessageCircle className="text-green-500" size={24} />
              </div>
              <div>
                <h3 className="text-white font-medium">WhatsApp Notifications</h3>
                <p className="text-sm text-gray-400">Get instant updates via WhatsApp</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPreferences.whatsapp.enabled}
                onChange={(e) => handleToggle('whatsapp', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500" />
            </label>
          </div>
          {localPreferences.whatsapp.enabled && (
            <InputField
              type="tel"
              value={whatsappValue}
              onChange={(e) => setWhatsappValue(e.target.value)}
              placeholder="Enter WhatsApp number"
            />
          )}
        </div>

        <div className="bg-[#2A2A2A] rounded-xl p-5 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <Mail className="text-blue-500" size={24} />
              </div>
              <div>
                <h3 className="text-white font-medium">Email Notifications</h3>
                <p className="text-sm text-gray-400">Receive detailed updates via email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localPreferences.email.enabled}
                onChange={(e) => handleToggle('email', e.target.checked)}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500" />
            </label>
          </div>
          {localPreferences.email.enabled && (
            <InputField
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="Enter email address"
            />
          )}
        </div>
      </div>
    </div>

    <div className="flex justify-end mt-6">
      <button
        onClick={handleSavePreferences}
        disabled={isSaving}
        className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            <span>Saving...</span>
          </>
        ) : (
          <>
            {showSuccessAnimation ? <CheckCircle2 size={20} /> : null}
            <span>Save Preferences</span>
          </>
        )}
      </button>
    </div>
  </motion.div>
));

const UserAccount = memo(({
  userName,
  accountNumber,
  lastPaymentDate,
  lastAmountPaid,
  accountType,
  preferences,
  onPreferencesSave
}: UserAccountProps) => {
  const { currentUser } = useAuth();
  const [localPreferences, setLocalPreferences] = React.useState(preferences);
  const [isSaving, setIsSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'preferences'>('profile');
  const [showSuccessAnimation, setShowSuccessAnimation] = React.useState(false);

  const [smsValue, setSmsValue] = React.useState(preferences.sms.value || '');
  const [whatsappValue, setWhatsappValue] = React.useState(preferences.whatsapp.value || '');
  const [emailValue, setEmailValue] = React.useState(preferences.email.value || '');

  const handleToggle = useCallback((type: 'sms' | 'whatsapp' | 'email', enabled: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled
      }
    }));
  }, []);

  const handleTabChange = useCallback((tab: 'profile' | 'preferences') => {
    setActiveTab(tab);
  }, []);

  const handleSavePreferences = useCallback(async () => {
    if (!currentUser || isSaving) {
      toast.error('Please try again');
      return;
    }

    try {
      setIsSaving(true);
      const updatedPreferences = {
        ...localPreferences,
        sms: { ...localPreferences.sms, value: smsValue },
        whatsapp: { ...localPreferences.whatsapp, value: whatsappValue },
        email: { ...localPreferences.email, value: emailValue }
      };
      await onPreferencesSave(updatedPreferences);
      setLocalPreferences(updatedPreferences);
      toast.success('Preferences saved successfully');
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, isSaving, localPreferences, smsValue, whatsappValue, emailValue, onPreferencesSave]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex space-x-4 mb-8">
        <TabButton 
          tab="profile" 
          icon={User} 
          label="Profile" 
          activeTab={activeTab}
          onClick={handleTabChange}
        />
        <TabButton 
          tab="preferences" 
          icon={Bell} 
          label="Notifications" 
          activeTab={activeTab}
          onClick={handleTabChange}
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <ProfileCard icon={User} label="Name" value={userName} />
            <ProfileCard icon={CreditCard} label="Account Number" value={accountNumber} />
            <ProfileCard icon={DollarSign} label="Account Type" value={accountType} />
            <ProfileCard 
              icon={Calendar} 
              label="Last Payment" 
              value={`${format(new Date(lastPaymentDate), 'PP')} - R${lastAmountPaid}`} 
            />
          </motion.div>
        ) : (
          <NotificationsSection 
            localPreferences={localPreferences}
            isSaving={isSaving}
            handleToggle={handleToggle}
            smsValue={smsValue}
            whatsappValue={whatsappValue}
            emailValue={emailValue}
            setSmsValue={setSmsValue}
            setWhatsappValue={setWhatsappValue}
            setEmailValue={setEmailValue}
            handleSavePreferences={handleSavePreferences}
            showSuccessAnimation={showSuccessAnimation}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

export default UserAccount;