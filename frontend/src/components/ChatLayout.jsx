import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import VideoCall from './VideoCall';

function ChatLayout({ user, socket, users }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  
  // Single state object to prevent prop flicker during call acceptance
  const [callState, setCallState] = useState({
    isInCall: false,
    callData: null,
    incomingCall: null
  });
  
  // Legacy individual state for backward compatibility
  const isInCall = callState.isInCall;
  const callData = callState.callData;
  const incomingCall = callState.incomingCall;

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    socket.on('call-offer', handleCallOffer);
    socket.on('call-rejected', handleCallRejected);

    return () => {
      socket.off('call-offer');
      socket.off('call-rejected');
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/conversations/${user._id}`);
      setConversations(response.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const createOrSelectConversation = async (otherUserId) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/conversations`, {
        participants: [user._id, otherUserId]
      });
      
      setActiveConversation(response.data);
      fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleCallOffer = (data) => {
    console.log('Received call offer:', data);
    // Prevent duplicate incoming calls
    if (!incomingCall && !isInCall) {
      setCallState(prev => ({
        ...prev,
        incomingCall: { offer: data.offer, from: data.from, fromUserId: data.fromUserId }
      }));
    } else {
      console.log('Ignoring duplicate call offer - already in call or has pending call');
    }
  };

  const handleHangUp = () => {
    setCallState({
      isInCall: false,
      callData: null,
      incomingCall: null
    });
  };

  const handleCallRejected = () => {
    setCallState({
      isInCall: false,
      callData: null,
      incomingCall: null
    });
    alert('Call was rejected');
  };

  const acceptCall = () => {
    console.log('Accepting call...');
    const callDataToSet = { 
      type: 'incoming', 
      offer: incomingCall.offer, 
      from: incomingCall.from,
      fromUserId: incomingCall.fromUserId 
    };
    
    // CRITICAL FIX: Single atomic state update to prevent prop flicker
    console.log('🔄 Using atomic state update to prevent prop flicker');
    setCallState({
      incomingCall: null,
      callData: callDataToSet,
      isInCall: true
    });
  };

  const rejectCall = () => {
    socket.emit('call-rejected', { to: incomingCall.fromUserId });
    setCallState(prev => ({
      ...prev,
      incomingCall: null
    }));
  };

  const startCall = (targetUserId) => {
    console.log('Starting call to user:', targetUserId);
    setCallState({
      isInCall: true,
      callData: { type: 'outgoing', targetUserId },
      incomingCall: null
    });
  };

  return (
    <div className="chat-layout">
      <div className="sidebar">
        <div className="user-info">
          <h3>Welcome, {user.username}!</h3>
        </div>
        <ConversationList
          conversations={conversations}
          users={users.filter(u => u._id !== user._id)}
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
          onCreateConversation={createOrSelectConversation}
          currentUserId={user._id}
        />
      </div>
      <div className="main-content">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            user={user}
            socket={socket}
            onStartCall={startCall}
          />
        ) : (
          <div className="no-conversation">
            <p>Select a conversation or create a new one</p>
          </div>
        )}
      </div>
      {isInCall && callData && (
        <VideoCall
          key={`video-call-${callData.type}-${callData.fromUserId || callData.targetUserId}`}
          socket={socket}
          callData={callData}
          user={user}
          onEndCall={handleHangUp}
        />
      )}
      {incomingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-modal">
            <h3>Incoming Call</h3>
            <p>Someone is calling you...</p>
            <div className="call-actions">
              <button className="accept-btn" onClick={acceptCall}>
                Accept
              </button>
              <button className="reject-btn" onClick={rejectCall}>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatLayout;