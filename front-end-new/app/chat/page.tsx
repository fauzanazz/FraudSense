'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import UserJoinModal from '@/components/UserJoinModal';
import FraudDialog from '@/components/FraudDialog';

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

export default function ChatPage() {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [username, setUsername] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [showFraudDialog, setShowFraudDialog] = useState(false);
  const [fraudData, setFraudData] = useState<{
    message: string;
    username: string;
    confidence: number;
    timestamp: Date;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    });

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('fraudResult', (data: { messageId: string; result: any }) => {
      setMessages(prev => {
        const updatedMessages = prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, fraudResult: data.result }
            : msg
        );

        // Show fraud dialog if confidence > 50%
        if (data.result.confidence > 0.5) {
          console.log('🚨 Fraud detected with confidence:', data.result.confidence);
          const message = updatedMessages.find(msg => msg.id === data.messageId);
          if (message) {
            console.log('📝 Found message:', message.content);
            setFraudData({
              message: message.content,
              username: message.username,
              confidence: data.result.confidence,
              timestamp: message.timestamp
            });
            setShowFraudDialog(true);
            console.log('🔔 Dialog should be shown now');
          }
        }

        return updatedMessages;
      });
    });

    newSocket.on('feedbackUpdate', (data: { messageId: string; feedback: any }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, feedback: data.feedback }
            : msg
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoinRoom = (user: string) => {
    setUsername(user);
    setShowJoinModal(false);
    if (socket) {
      socket.emit('joinRoom', { username: user, room: 'general' });
    }
  };

  const handleSendMessage = (content: string) => {
    if (socket && content.trim()) {
      const message: Omit<Message, 'id' | 'timestamp'> = {
        username,
        content: content.trim(),
      };
      socket.emit('sendMessage', message);
    }
  };

  const handleCloseFraudDialog = useCallback(() => {
    console.log('🔒 Closing fraud dialog');
    setShowFraudDialog(false);
    setFraudData(null);
  }, []);

  // Debug effect to monitor dialog state
  useEffect(() => {
    console.log('🔍 Dialog state:', { showFraudDialog, fraudData });
  }, [showFraudDialog, fraudData]);

  if (showJoinModal) {
    return <UserJoinModal onJoin={handleJoinRoom} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Real-time Chat</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Logged in as: <span className="font-semibold">{username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isOwnMessage={message.username === username}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <ChatInput onSendMessage={handleSendMessage} disabled={!isConnected} />
      </div>

      {/* Fraud Dialog */}
      <FraudDialog
        isOpen={showFraudDialog}
        onClose={handleCloseFraudDialog}
        fraudData={fraudData}
      />
    </div>
  );
}