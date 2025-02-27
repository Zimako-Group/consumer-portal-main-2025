import React, { useState, useEffect, useRef } from 'react';
import { WhatsAppMessage as WhatsAppMessageType } from '../../services/whatsapp/whatsappService';
import WhatsAppMessage from './WhatsAppMessage';
import useWhatsAppController from '../../controllers/WhatsAppController';

interface WhatsAppConversationProps {
  phoneNumber: string;
  onBack?: () => void;
}

const WhatsAppConversation: React.FC<WhatsAppConversationProps> = ({ phoneNumber, onBack }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<WhatsAppMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');

  const {
    loading,
    error,
    loadConversation,
    sendTextMessage,
    sendImageMessage,
    sendDocumentMessage,
    formatPhoneNumber
  } = useWhatsAppController();

  // Format phone number for display
  const formattedPhoneNumber = phoneNumber.startsWith('whatsapp:') 
    ? phoneNumber.replace('whatsapp:', '') 
    : phoneNumber;

  // Load conversation on component mount
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      try {
        const formattedNumber = formatPhoneNumber(phoneNumber);
        const conversation = await loadConversation(formattedNumber);
        setMessages(conversation);
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
    
    // Set up polling to refresh messages every 10 seconds
    const intervalId = setInterval(loadMessages, 10000);
    
    return () => clearInterval(intervalId);
  }, [phoneNumber, loadConversation, formatPhoneNumber]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if ((!message && !selectedFile) || isLoading) return;

    setIsLoading(true);
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);

      if (selectedFile) {
        // Handle file upload and sending
        const fileUrl = await uploadFile(selectedFile);
        
        if (fileType.startsWith('image/')) {
          await sendImageMessage(formattedNumber, fileUrl, message);
        } else {
          await sendDocumentMessage(formattedNumber, fileUrl, selectedFile.name, message);
        }
        
        // Clear file selection
        setSelectedFile(null);
        setFilePreview(null);
        setFileType('');
      } else {
        // Send text message
        await sendTextMessage(formattedNumber, message);
      }
      
      // Clear message input
      setMessage('');
      
      // Refresh conversation
      const updatedConversation = await loadConversation(formattedNumber);
      setMessages(updatedConversation);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setSelectedFile(file);
    setFileType(file.type);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
    
    // Close attach menu
    setShowAttachMenu(false);
  };

  // Upload file to storage and get URL
  const uploadFile = async (file: File): Promise<string> => {
    // This is a placeholder for actual file upload logic
    // In a real implementation, you would upload to Firebase Storage or another service
    // and return the URL
    
    // Mock implementation for demonstration
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return a mock URL for demonstration
        if (file.type.startsWith('image/')) {
          resolve('https://via.placeholder.com/300');
        } else {
          resolve('https://example.com/document.pdf');
        }
      }, 1000);
    });
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Open file input
  const handleAttachClick = () => {
    setShowAttachMenu(!showAttachMenu);
  };

  // Handle selecting image attachment
  const handleImageAttach = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  // Handle selecting document attachment
  const handleDocumentAttach = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
      fileInputRef.current.click();
    }
    setShowAttachMenu(false);
  };

  // Cancel file selection
  const handleCancelFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="bg-gray-100 p-4 flex items-center border-b">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-3 text-gray-600 hover:text-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold">{formattedPhoneNumber}</h2>
          <p className="text-sm text-gray-500">WhatsApp Conversation</p>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 my-8">
                No messages yet. Start a conversation!
              </div>
            ) : (
              messages.map((msg) => (
                <WhatsAppMessage
                  key={msg.id}
                  message={msg}
                  isOutbound={msg.type === 'outbound'}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* File preview */}
      {selectedFile && (
        <div className="p-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center">
            {filePreview ? (
              <img 
                src={filePreview} 
                alt="Preview" 
                className="h-16 w-16 object-cover rounded"
              />
            ) : (
              <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div className="ml-2 flex-1">
              <div className="text-sm font-medium truncate">{selectedFile.name}</div>
              <div className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
            </div>
            <button 
              onClick={handleCancelFile}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center">
          <button 
            onClick={handleAttachClick}
            className="text-gray-500 hover:text-gray-700 mr-2"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          {/* Hidden file input */}
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          {/* Attachment menu */}
          {showAttachMenu && (
            <div className="absolute bottom-16 left-4 bg-white rounded-lg shadow-lg p-2 border border-gray-200">
              <button 
                onClick={handleImageAttach}
                className="flex items-center p-2 hover:bg-gray-100 rounded w-full text-left"
              >
                <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image
              </button>
              <button 
                onClick={handleDocumentAttach}
                className="flex items-center p-2 hover:bg-gray-100 rounded w-full text-left"
              >
                <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Document
              </button>
            </div>
          )}
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={(!message && !selectedFile) || isLoading}
            className={`ml-2 p-2 rounded-full ${
              (!message && !selectedFile) || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            type="button"
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConversation;
