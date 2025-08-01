'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  id: string;
  username: string;
  content: string;
  timestamp: Date;
  fraudResult?: {
    classification: 'Safe' | 'Fraud';
    confidence: number;
  };
  feedback?: {
    type: 'thumbsUp' | 'thumbsDown';
    count: number;
  };
}

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
  onFeedback?: (messageId: string, type: 'thumbsUp' | 'thumbsDown') => void;
}

export default function ChatMessage({ message, isOwnMessage, onFeedback }: ChatMessageProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getFraudBadgeColor = (classification: 'Safe' | 'Fraud') => {
    return classification === 'Safe' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div 
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}
      onAnimationEnd={() => setIsAnimating(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
        <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
          <span className="text-sm font-medium text-gray-900">{message.username}</span>
          <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
        </div>
        
        <div className={`relative ${isOwnMessage ? 'order-2' : 'order-1'}`}>
          <div className={`rounded-lg px-4 py-2 shadow-sm ${
            isOwnMessage 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-900 border border-gray-200'
          }`}>
            <p className="text-sm">{message.content}</p>
          </div>
          
          {/* Fraud Detection Indicator (only show if fraud detected) */}
          {message.fraudResult && message.fraudResult.classification === 'Fraud' && (
            <div className="mt-2 inline-flex items-center space-x-1 px-2 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-medium text-red-700">
              <span>⚠️ Fraud Detected</span>
            </div>
          )}
          
          {/* Feedback Buttons (only show if onFeedback is provided) */}
          {message.fraudResult && onFeedback && (
            <div className="mt-2 flex items-center space-x-2">
              <button
                onClick={() => onFeedback(message.id, 'thumbsUp')}
                className={`p-1 rounded-full transition-colors ${
                  message.feedback?.type === 'thumbsUp'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="This classification is correct"
              >
                <ThumbsUp size={16} />
              </button>
              <button
                onClick={() => onFeedback(message.id, 'thumbsDown')}
                className={`p-1 rounded-full transition-colors ${
                  message.feedback?.type === 'thumbsDown'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title="This classification is incorrect"
              >
                <ThumbsDown size={16} />
              </button>
              {message.feedback && (
                <span className="text-xs text-gray-500">
                  {message.feedback.count} feedback
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 