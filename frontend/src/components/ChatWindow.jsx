import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

function ChatWindow({ conversation, user, socket, onStartCall, users = [] }) {
  const [messages, setMessages] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [fraudAnalysisResults, setFraudAnalysisResults] = useState([]);
  const messagesEndRef = useRef(null);
  const [simulatedFraudScore, setSimulatedFraudScore] = useState(0);
  const [shownFraudThresholds, setShownFraudThresholds] = useState(new Set());
  const [activeFraudWarning, setActiveFraudWarning] = useState(null);

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

  // Simple simulation: update fraud score every 5s (random, stabilized)
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedFraudScore(() => {
        const base = Math.random() * 100;
        // Nudge score up a bit if there are recent fraud alerts
        const hasRecentAlert = fraudAlerts.length > 0;
        const adjusted = Math.min(100, Math.max(0, base + (hasRecentAlert ? 15 : 0)));
        return Math.round(adjusted);
      });
    }, 5000);
    // Initialize immediately
    setSimulatedFraudScore(Math.round(Math.random() * 100));
    return () => clearInterval(interval);
  }, [fraudAlerts.length]);

  // Trigger warning modal when passing configured thresholds
  useEffect(() => {
    const thresholds = [50, 75, 80, 90];
    for (const t of thresholds) {
      if (simulatedFraudScore >= t && !shownFraudThresholds.has(t)) {
        setActiveFraudWarning(t);
        break;
      }
    }
  }, [simulatedFraudScore, shownFraudThresholds]);

  const dismissFraudWarning = () => {
    if (activeFraudWarning == null) return;
    setShownFraudThresholds(prev => new Set(prev).add(activeFraudWarning));
    setActiveFraudWarning(null);
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/messages/${conversation._id}`);
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
    // conversation.participants may contain ObjectIds (strings) or populated user objects
    const participant = conversation.participants.find(p => (typeof p === 'string' ? p : p._id) !== user._id);
    if (!participant) return null;
    if (typeof participant === 'string') {
      return users.find(u => u._id === participant) || { _id: participant, username: 'Unknown User' };
    }
    return participant;
  };

  if (!conversation) {
    return <div className="p-4">Loading...</div>;
  }

  const otherUser = getOtherParticipant();

  return (
    <div className="flex-1 flex flex-col bg-neutral-900 min-h-0">
      <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="m-0 text-neutral-100 truncate">{otherUser?.username || 'Unknown User'}</h3>
          <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 whitespace-nowrap">Do not share passwords, PIN, OTP, or sensitive info</span>
        </div>
        <div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer" onClick={() => onStartCall(otherUser._id)}>
            📞 Call
          </button>
        </div>
      </div>

      {/* Simulated Fraud Indicator */}
      <div className={`px-4 py-2 border-b border-neutral-800 bg-neutral-900`}> 
        <div className="flex items-center gap-3">
          <div className="text-sm text-neutral-400">Fraud likelihood</div>
          <div className={`text-sm font-semibold px-2 py-1 rounded-full 
            ${simulatedFraudScore >= 70 ? 'bg-red-500/20 text-red-300' : simulatedFraudScore >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}
          >
            {simulatedFraudScore}% this is fraud
          </div>
        </div>
      </div>

      {/* Fraud Warning Modal */}
      {activeFraudWarning != null && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-[90%] max-w-md text-center shadow-2xl">
            <div className="text-sm text-neutral-400 mb-2">Warning</div>
            <div className="text-2xl font-semibold mb-3 text-red-300">{simulatedFraudScore}% likely fraud</div>
            <p className="text-neutral-300 mb-6">Our system detected patterns often associated with scam conversations. Proceed with caution.</p>
            <button onClick={dismissFraudWarning} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer">Understood</button>
          </div>
        </div>
      )}

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <div className="bg-amber-100/5 border border-amber-400/20 m-0 p-0">
          {fraudAlerts.map((alert, index) => (
            <div key={index} className={`${alert.severity === 'high' ? 'bg-red-400/10 border-l-4 border-red-500/70' : 'bg-amber-400/10 border-l-4 border-amber-500/70'} m-0 p-0 animate-[slideIn_0.3s_ease-out]`}>
              <div className="flex items-start p-3 gap-2">
                <span className="text-[1.2rem] text-red-400 shrink-0 mt-[0.1rem]">🚨</span>
                <div className="flex-1 min-w-0">
                  <strong className="text-neutral-200 text-[0.9rem] mb-1 block">Fraud Alert ({alert.type})</strong>
                  <p className="m-1 my-1 text-neutral-300 text-[0.85rem] leading-[1.3]">{alert.message}</p>
                  <small className="text-neutral-400 text-[0.75rem] block mt-1">Score: {alert.fraudScore}, Confidence: {(alert.confidence * 100).toFixed(1)}%</small>
                </div>
                <button 
                  className="text-neutral-400 text-[1.2rem] w-5 h-5 shrink-0 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-red-400 cursor-pointer"
                  onClick={() => dismissAlert(alert.timestamp)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 bg-neutral-900">
        <MessageList messages={messages} currentUserId={user._id} />
        <div ref={messagesEndRef} />
      </div>
      
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  );
}

export default ChatWindow;