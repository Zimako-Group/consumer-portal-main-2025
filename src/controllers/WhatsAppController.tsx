import React, { useState, useEffect } from 'react';
import { whatsAppService, WhatsAppMessage, WhatsAppTemplate, WhatsAppBusinessProfile } from '../services/whatsapp/whatsappService';

// WhatsApp Controller Hook
export const useWhatsAppController = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [businessProfile, setBusinessProfile] = useState<WhatsAppBusinessProfile | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Load recent messages
  const loadRecentMessages = async (limit: number = 20) => {
    setLoading(true);
    setError(null);
    try {
      const recentMessages = await whatsAppService.getRecentMessages(limit);
      setMessages(recentMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to load recent messages');
      console.error('Error loading recent messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load conversation with a specific user
  const loadConversation = async (phoneNumber: string, limit: number = 50) => {
    setLoading(true);
    setError(null);
    try {
      const conversation = await whatsAppService.getConversation(phoneNumber, limit);
      setMessages(conversation);
      return conversation;
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
      console.error('Error loading conversation:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Send a text message
  const sendTextMessage = async (to: string, message: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsAppService.sendTextMessage(to, message);
      // Refresh messages after sending
      await loadRecentMessages();
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send a template message
  const sendTemplateMessage = async (to: string, templateName: string, components: any[] = []) => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsAppService.sendTemplateMessage(to, templateName, components);
      // Refresh messages after sending
      await loadRecentMessages();
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send template message');
      console.error('Error sending template message:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send an image message
  const sendImageMessage = async (to: string, imageUrl: string, caption: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsAppService.sendImageMessage(to, imageUrl, caption);
      // Refresh messages after sending
      await loadRecentMessages();
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send image message');
      console.error('Error sending image message:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Send a document message
  const sendDocumentMessage = async (to: string, documentUrl: string, filename: string, caption: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsAppService.sendDocumentMessage(to, documentUrl, filename, caption);
      // Refresh messages after sending
      await loadRecentMessages();
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to send document message');
      console.error('Error sending document message:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load message templates
  const loadMessageTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const templateList = await whatsAppService.getMessageTemplates();
      setTemplates(templateList);
      return templateList;
    } catch (err: any) {
      setError(err.message || 'Failed to load message templates');
      console.error('Error loading message templates:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load business profile
  const loadBusinessProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await whatsAppService.getBusinessProfile();
      setBusinessProfile(profile);
      return profile;
    } catch (err: any) {
      setError(err.message || 'Failed to load business profile');
      console.error('Error loading business profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update business profile
  const updateBusinessProfile = async (profileData: Partial<WhatsAppBusinessProfile>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await whatsAppService.updateBusinessProfile(profileData);
      // Refresh business profile after update
      await loadBusinessProfile();
      return response;
    } catch (err: any) {
      setError(err.message || 'Failed to update business profile');
      console.error('Error updating business profile:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load message analytics
  const loadMessageAnalytics = async (days: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const analyticsData = await whatsAppService.getMessageAnalytics(days);
      setAnalytics(analyticsData);
      return analyticsData;
    } catch (err: any) {
      setError(err.message || 'Failed to load message analytics');
      console.error('Error loading message analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Format phone number for WhatsApp API
  const formatPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Check if the number already has a country code
    if (digitsOnly.startsWith('27')) {
      return digitsOnly;
    }
    
    // Add South Africa country code if not present
    if (digitsOnly.startsWith('0')) {
      return '27' + digitsOnly.substring(1);
    }
    
    // Default to adding South Africa country code
    return '27' + digitsOnly;
  };

  return {
    loading,
    error,
    messages,
    templates,
    businessProfile,
    analytics,
    loadRecentMessages,
    loadConversation,
    sendTextMessage,
    sendTemplateMessage,
    sendImageMessage,
    sendDocumentMessage,
    loadMessageTemplates,
    loadBusinessProfile,
    updateBusinessProfile,
    loadMessageAnalytics,
    formatPhoneNumber
  };
};

export default useWhatsAppController;
