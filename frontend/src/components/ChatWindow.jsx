import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

function ChatWindow({ conversation, user, socket, onStartCall }) {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      socket.emit('joinRoom', conversation._id);
    }
  }, [conversation]);

  useEffect(() => {
    socket.on('receiveMessage', handleReceiveMessage);
    return () => socket.off('receiveMessage');
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/messages/${conversation._id}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleReceiveMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSendMessage = (content) => {
    const messageData = {
      conversationId: conversation._id,
      senderId: user._id,
      senderName: user.username,
      content,
      timestamp: new Date()
    };

    socket.emit('sendMessage', messageData);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = () => {
    return conversation.participants.find(p => p._id !== user._id);
  };

  if (!conversation) {
    return <div>Loading...</div>;
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-info">
          <h3>{otherUser?.username || 'Unknown User'}</h3>
        </div>
        <div className="chat-actions">
          <button className="call-btn" onClick={() => onStartCall(otherUser._id)}>
            📞 Call
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        <MessageList messages={messages} currentUserId={user._id} />
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;