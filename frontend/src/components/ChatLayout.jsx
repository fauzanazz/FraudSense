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

  // Keep conversation previews in sync when messages arrive in real time
  useEffect(() => {
    const handleReceiveMessageForList = (message) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c._id === message.conversationId);
        if (index === -1) return prev;
        const updated = {
          ...prev[index],
          lastMessage: message.content || prev[index].lastMessage,
          lastMessageTime: message.timestamp || new Date(),
        };
        const next = [...prev];
        next.splice(index, 1);
        return [updated, ...next];
      });
    };

    socket.on('receiveMessage', handleReceiveMessageForList);
    return () => socket.off('receiveMessage', handleReceiveMessageForList);
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
        incomingCall: { 
          offer: data.offer, 
          from: data.from, 
          fromUserId: data.fromUserId,
          conversationId: data.conversationId
        }
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
      fromUserId: incomingCall.fromUserId,
      conversationId: incomingCall.conversationId
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
    const callSessionId = `call_${user._id}_${targetUserId}_${Date.now()}`;
    setCallState({
      isInCall: true,
      callData: { type: 'outgoing', targetUserId, conversationId: callSessionId },
      incomingCall: null
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-900 text-neutral-200">
      <div className="w-[300px] bg-neutral-900 border-r border-neutral-800 flex flex-col min-h-0">
        <div className="p-4 border-b border-neutral-800 bg-neutral-800 text-neutral-100">
          <h3 className="m-0 text-[1.1rem] font-medium">Welcome, {user.username}!</h3>
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
      <div className="flex-1 flex flex-col min-h-0">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            user={user}
            socket={socket}
            onStartCall={startCall}
            users={users}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-400 text-[1.1rem]">
            <p className="m-0">Select a conversation or create a new one</p>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000]">
          <div className="bg-white p-8 rounded-2xl shadow-2xl text-center min-w-[300px]">
            <h3 className="m-0 mb-4 text-[#333] text-[1.5rem]">Incoming Call</h3>
            <p className="m-0 mb-8 text-[#666]">Someone is calling you...</p>
            <div className="flex gap-4 justify-center items-center">
              <button className="px-6 py-3 bg-[#28a745] text-white rounded-full text-[1rem] font-medium min-w-[100px]" onClick={acceptCall}>
                Accept
              </button>
              <button className="px-6 py-3 bg-[#dc3545] text-white rounded-full text-[1rem] font-medium min-w-[100px]" onClick={rejectCall}>
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