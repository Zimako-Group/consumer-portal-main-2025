import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot } from 'lucide-react';
import { chatbotService } from '../services/chatbotService';

interface Message {
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const ZimakoAIChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose, userName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
      const initialMessage = `${greeting}, ${userName}! I am Zimako AI ChatBot, your AI ChatBot Assistant. How may I assist you today?`;
      setMessages([{ type: 'bot', content: initialMessage, timestamp: new Date() }]);
      
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, userName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, { 
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // Process query using chatbot service
      const response = await chatbotService.processQuery(userMessage);

      // Add bot response to chat
      setMessages(prev => [...prev, {
        type: 'bot',
        content: response.response,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('ChatBot Error:', error);
      // Handle error
      setMessages(prev => [...prev, {
        type: 'bot',
        content: "I apologize, but I encountered an error while processing your request. Please try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center" style={{ zIndex: 9999 }}>
      <div 
        className="bg-[#1a1f2e] w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-slideIn flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between border-b border-gray-700 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Bot className="w-8 h-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Zimako AI ChatBot</h2>
              <p className="text-sm text-blue-100 opacity-90">Your AI Assistant</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#1a1f2e]">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-[#2a2f3e] text-white'
                }`}>
                  <p className="text-base">{msg.content}</p>
                  <span className="text-xs opacity-75 mt-1 inline-block">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-700 bg-[#1a1f2e] sticky bottom-0">
          <div className="max-w-3xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-base rounded-xl border border-gray-700 bg-[#2a2f3e] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ZimakoAIChatBot;
