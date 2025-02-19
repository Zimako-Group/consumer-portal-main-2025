import React, { useState, useRef, useEffect } from 'react';
import { chatbotService } from '../services/firebase';
import { analyzeSentiment } from './sentimentAnalyzer';
import { IoSend, IoChatbubble, IoPerson } from 'react-icons/io5';
import { BsEmojiSmile } from 'react-icons/bs';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sentiment?: {
    score: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    emotions: {
      anger: number;
      frustration: number;
      satisfaction: number;
      urgency: number;
    };
  };
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmojis, setShowEmojis] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "👋 Hi! I'm ZimakoAI, your friendly assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Analyze sentiment
      const sentiment = analyzeSentiment(inputText);
      userMessage.sentiment = sentiment;

      // Get bot response
      const prediction = await chatbotService.predictIntent(inputText);
      console.log('Prediction result:', prediction);
      
      // Add typing delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Select a random response from the available responses
      const response = prediction.responses && prediction.responses.length > 0
        ? prediction.responses[Math.floor(Math.random() * prediction.responses.length)]
        : "I'm not sure how to respond to that. Could you please rephrase?";

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSentimentColor = (sentiment?: Message['sentiment']) => {
    if (!sentiment) return '';
    switch (sentiment.sentiment) {
      case 'positive': return 'border-green-500';
      case 'negative': return 'border-red-500';
      case 'neutral': return 'border-gray-500';
      default: return '';
    }
  };

  const getEmotionEmoji = (emotion: string) => {
    switch (emotion) {
      case 'anger': return '😠';
      case 'frustration': return '😤';
      case 'satisfaction': return '😊';
      case 'urgency': return '⚡';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto bg-gray-900 rounded-lg shadow-2xl border border-gray-700">
      {/* Chat Header */}
      <div className="px-6 py-4 bg-gray-800 rounded-t-lg border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <IoChatbubble className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">ZimakoAI</h2>
            <p className="text-sm text-gray-400">Powered by advanced sentiment analysis</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-900 custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 ${
              message.sender === 'user' ? 'flex justify-end' : 'flex justify-start'
            }`}
          >
            <div className="flex items-start max-w-[80%] space-x-2">
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                <IoChatbubble className="w-5 h-5 text-white" />
              </div>
              )}
              <div
                className={`p-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white ml-2'
                    : 'bg-gray-800 text-gray-100'
                } ${getSentimentColor(message.sentiment)} border-2 shadow-lg transform hover:scale-[1.02] transition-transform duration-200`}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                {message.sentiment && (
                  <div className="mt-2 pt-2 border-t border-gray-600/30">
                    <p className="text-xs text-gray-300">
                      Sentiment: {message.sentiment.sentiment} 
                      {message.sentiment.score > 0 ? ' 📈' : message.sentiment.score < 0 ? ' 📉' : ' 📊'}
                    </p>
                    <div className="mt-1 text-xs text-gray-300">
                      {Object.entries(message.sentiment.emotions)
                        .filter(([_, score]) => score > 0.3)
                        .map(([emotion, score]) => (
                          <span key={emotion} className="inline-block mr-2">
                            {getEmotionEmoji(emotion)} {score.toFixed(2)}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <IoPerson className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <IoChatbubble className="w-5 h-5 text-white" />
            </div>
            <div className="bg-gray-800 rounded-2xl px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 rounded-b-lg">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full p-3 bg-gray-900 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-500 resize-none"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            <button
              onClick={() => setShowEmojis(!showEmojis)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            >
              <BsEmojiSmile className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <IoSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
