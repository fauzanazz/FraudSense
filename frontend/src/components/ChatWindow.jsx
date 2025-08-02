import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

function ChatWindow({ conversation, user, socket, onStartCall }) {
  const [messages, setMessages] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudAnalysisResults, setFraudAnalysisResults] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (conversation) {
      fetchMessages();
      socket.emit('joinRoom', conversation._id);
    }
  }, [conversation]);

  useEffect(() => {
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('fraud-alert', handleFraudAlert);
    socket.on('fraud-analysis-result', handleFraudAnalysisResult);
    
    return () => {
      socket.off('receiveMessage');
      socket.off('fraud-alert');
      socket.off('fraud-analysis-result');
    };
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

  const handleFraudAlert = (alertData) => {
    console.log('🚨 Fraud alert received:', alertData);
    setFraudAlerts(prev => [...prev, alertData]);
    
    // Auto-dismiss alert after 10 seconds
    setTimeout(() => {
      setFraudAlerts(prev => prev.filter(alert => alert.timestamp !== alertData.timestamp));
    }, 10000);
  };

  const handleFraudAnalysisResult = (result) => {
    console.log('📊 Fraud analysis result:', result);
    setFraudAnalysisResults(prev => [...prev.slice(-9), result]); // Keep last 10 results
  };

  const dismissAlert = (alertTimestamp) => {
    setFraudAlerts(prev => prev.filter(alert => alert.timestamp !== alertTimestamp));
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

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <div className="fraud-alerts">
          {fraudAlerts.map((alert, index) => (
            <div key={index} className={`fraud-alert ${alert.severity}`}>
              <div className="alert-content">
                <span className="alert-icon">🚨</span>
                <div className="alert-text">
                  <strong>Fraud Alert ({alert.type})</strong>
                  <p>{alert.message}</p>
                  <small>Score: {alert.fraudScore}, Confidence: {(alert.confidence * 100).toFixed(1)}%</small>
                </div>
                <button 
                  className="alert-dismiss" 
                  onClick={() => dismissAlert(alert.timestamp)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="messages-container">
        <MessageList messages={messages} currentUserId={user._id} />
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;