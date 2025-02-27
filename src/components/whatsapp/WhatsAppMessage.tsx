import React from 'react';
import { WhatsAppMessage as WhatsAppMessageType } from '../../services/whatsapp/whatsappService';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface WhatsAppMessageProps {
  message: WhatsAppMessageType;
  isOutbound: boolean;
}

const WhatsAppMessage: React.FC<WhatsAppMessageProps> = ({ message, isOutbound }) => {
  // Format timestamp
  const formatTimestamp = (timestamp: Date | Timestamp) => {
    if (timestamp instanceof Timestamp) {
      return format(timestamp.toDate(), 'MMM d, h:mm a');
    }
    return format(timestamp, 'MMM d, h:mm a');
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓✓';
      case 'failed':
        return '⚠️';
      default:
        return '';
    }
  };

  // Render media content if available
  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (message.type === 'image' || message.mediaUrl.includes('image')) {
      return (
        <div className="mb-2">
          <img 
            src={message.mediaUrl} 
            alt={message.caption || "Image"} 
            className="rounded-lg max-w-full max-h-64 object-contain"
          />
          {message.caption && <p className="text-sm mt-1">{message.caption}</p>}
        </div>
      );
    }

    if (message.type === 'document' || message.mediaUrl.includes('document')) {
      return (
        <div className="mb-2 flex items-center bg-gray-100 p-2 rounded-lg">
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <a 
            href={message.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {message.content || "Document"}
          </a>
        </div>
      );
    }

    if (message.type === 'audio' || message.mediaUrl.includes('audio')) {
      return (
        <div className="mb-2">
          <audio controls className="w-full">
            <source src={message.mediaUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    }

    if (message.type === 'video' || message.mediaUrl.includes('video')) {
      return (
        <div className="mb-2">
          <video controls className="rounded-lg max-w-full max-h-64 object-contain">
            <source src={message.mediaUrl} type="video/mp4" />
            Your browser does not support the video element.
          </video>
          {message.caption && <p className="text-sm mt-1">{message.caption}</p>}
        </div>
      );
    }

    return null;
  };

  // Render template message if applicable
  const renderTemplate = () => {
    if (!message.templateName) return null;

    return (
      <div className="text-xs text-gray-500 mt-1">
        Template: {message.templateName}
      </div>
    );
  };

  return (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 ${
          isOutbound 
            ? 'bg-green-100 text-green-900' 
            : 'bg-gray-200 text-gray-900'
        }`}
      >
        {renderMedia()}
        <div className="text-sm">{message.content}</div>
        {renderTemplate()}
        <div className="flex justify-end items-center mt-1 text-xs text-gray-500">
          <span>{formatTimestamp(message.timestamp)}</span>
          {isOutbound && (
            <span className="ml-1" title={message.status}>
              {getStatusIcon(message.status)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMessage;
