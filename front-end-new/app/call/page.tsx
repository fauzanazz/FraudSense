'use client'
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';

export default function Home() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<any>(null);
  
  const [username, setUsername] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'receiving' | 'connected'>('idle');
  const [currentCaller, setCurrentCaller] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setIsInRoom(false);
      console.log('❌ Disconnected from server');
    });

    // Room events
    socket.on('joinedRoom', (data: { username: string; room: string; users: string[] }) => {
      setIsInRoom(true);
      setAvailableUsers(data.users.filter(user => user !== username));
      console.log('✅ Joined room successfully');
    });

    socket.on('userList', (users: string[]) => {
      setAvailableUsers(users);
      console.log('👥 Updated user list:', users);
    });

    socket.on('userJoined', (data: { username: string }) => {
      console.log('👋', data.username, 'joined the room');
    });

    socket.on('userLeft', (data: { username: string }) => {
      console.log('👋', data.username, 'left the room');
    });

    // Call events
    socket.on('receive-call', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      console.log('📞 Incoming call from:', data.from);
      setCurrentCaller(data.from);
      setCallStatus('receiving');
      
      const accept = window.confirm(`Incoming call from ${data.from}. Accept?`);
      if (accept) {
        await handleIncomingCall(data.from, data.offer);
      } else {
        setCallStatus('idle');
        setCurrentCaller('');
      }
    });

    socket.on('call-answered', async (data: { answer: RTCSessionDescriptionInit }) => {
      console.log('✅ Call answered');
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('connected');
      }
    });

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      console.log('🧊 Received ICE candidate');
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('call-ended', () => {
      console.log('📞 Call ended by remote user');
      endCall();
    });

    socket.on('call-failed', (data: { reason: string; targetUser: string }) => {
      console.log('❌ Call failed:', data.reason);
      alert(`Call failed: ${data.reason}`);
      setCallStatus('idle');
    });

    return () => {
      socket.close();
    };
  }, [username]);

  const createPeerConnection = () => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && targetUser) {
        console.log('🧊 Sending ICE candidate');
        socketRef.current.emit('ice-candidate', {
          to: targetUser,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('🎵 Received remote audio stream');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        // Auto-play remote audio
        remoteVideoRef.current.play().catch(e => console.log('Auto-play failed:', e));
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', peerConnection.connectionState);
      if (peerConnection.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        endCall();
      }
    };

    return peerConnection;
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: false, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      
      // Optional: Show local audio indicator
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Prevent echo
      }
      
      console.log('🎤 Audio stream initialized');
      return stream;
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
      throw error;
    }
  };

  const joinRoom = () => {
    if (username && socketRef.current) {
      socketRef.current.emit('joinRoom', { username, room: 'call' });
    }
  };

  const callUser = async () => {
    if (!targetUser || !socketRef.current || callStatus !== 'idle') {
      console.log('Cannot call: targetUser=', targetUser, 'socketRef.current=', !!socketRef.current, 'callStatus=', callStatus);
      return;
    }

    try {
      setCallStatus('calling');
      console.log('🚀 Initiating call to:', targetUser);

      // Initialize media and peer connection
      const stream = await initializeMedia();
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socketRef.current.emit('call-user', {
        to: targetUser,
        offer,
      });

      console.log('📤 Offer sent to:', targetUser);
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      setCallStatus('idle');
    }
  };

  const handleIncomingCall = async (from: string, offer: RTCSessionDescriptionInit) => {
    try {
      console.log('📥 Handling incoming call from:', from);
      setTargetUser(from);

      // Initialize media and peer connection
      const stream = await initializeMedia();
      const peerConnection = createPeerConnection();
      peerConnectionRef.current = peerConnection;

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      // Send answer
      socketRef.current.emit('answer-call', {
        to: from,
        answer,
      });

      setCallStatus('connected');
      console.log('📤 Answer sent to:', from);
    } catch (error) {
      console.error('❌ Error handling incoming call:', error);
      setCallStatus('idle');
    }
  };

  const endCall = () => {
    console.log('📞 Ending call');

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Notify remote user
    if (socketRef.current && targetUser) {
      socketRef.current.emit('end-call', { to: targetUser });
    }

    // Reset state
    setCallStatus('idle');
    setTargetUser('');
    setCurrentCaller('');
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'calling': return 'bg-yellow-100 text-yellow-800';
      case 'receiving': return 'bg-blue-100 text-blue-800';
      case 'connected': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling': return `📞 Calling ${targetUser}...`;
      case 'receiving': return `📞 Incoming call from ${currentCaller}`;
      case 'connected': return `🎵 Connected with ${targetUser || currentCaller}`;
      default: return '🔇 No active call';
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">🎵 Voice Call</h1>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-center mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      {/* Join Room */}
      {!isInRoom && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Join Call Room</h2>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={joinRoom}
              disabled={!username || !isConnected}
              className={`px-6 py-3 rounded-lg text-white font-medium transition ${
                username && isConnected
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Join Room
            </button>
          </div>
        </div>
      )}

      {/* Call Interface */}
      {isInRoom && (
        <>
          {/* Available Users */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Available Users ({availableUsers.length})</h2>
            {availableUsers.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {availableUsers.map((user) => (
                                     <button
                     key={user}
                     onClick={async () => {
                       setTargetUser(user);
                       await callUser();
                     }}
                     disabled={callStatus !== 'idle'}
                     className={`p-3 rounded-lg border text-left transition ${
                       callStatus === 'idle'
                         ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                         : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                     }`}
                   >
                    <div className="font-medium">👤 {user}</div>
                    <div className="text-sm text-gray-500">Click to call</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No other users in the room</p>
                <p className="text-sm">Open another browser tab to test calling</p>
              </div>
            )}
          </div>

          {/* Call Status */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-4 ${getStatusColor()}`}>
                {getStatusText()}
              </div>
              
              {callStatus === 'connected' && (
                <button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition"
                >
                  📞 End Call
                </button>
              )}
            </div>
          </div>

          {/* Audio Elements (hidden) */}
          <div className="hidden">
            <video ref={localVideoRef} autoPlay muted />
            <video ref={remoteVideoRef} autoPlay />
          </div>
        </>
      )}
    </div>
  );
}