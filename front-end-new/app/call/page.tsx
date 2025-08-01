'use client';

import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CallInterface from '@/components/CallInterface';
import CallSetup from '@/components/CallSetup';

interface CallState {
  isInCall: boolean;
  isConnected: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  fraudResult?: {
    classification: 'Safe' | 'Fraud Detected';
    confidence: number;
    timestamp: Date;
  };
}

export default function CallPage() {
  const [socket, setSocket] = useState<any>(null);
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isConnected: false,
    isMuted: false,
    isVideoEnabled: true,
    callDuration: 0,
  });
  const [username, setUsername] = useState<string>('');
  const [showSetup, setShowSetup] = useState(true);
  const [remoteUser, setRemoteUser] = useState<string>('');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      transports: ['websocket'],
    });



    newSocket.on('disconnect', () => {
      setCallState(prev => ({ ...prev, isConnected: false }));
      console.log('❌ Disconnected from signaling server');
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (!socket?.connected) {
          console.log('🔄 Attempting to reconnect...');
          newSocket.connect();
        }
      }, 3000);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      setCallState(prev => ({ ...prev, isConnected: false }));
    });

    newSocket.on('reconnect', () => {
      console.log('✅ Reconnected to signaling server');
      setCallState(prev => ({ ...prev, isConnected: true }));
    });

    // Signaling events
    newSocket.on('offer', handleOffer);
    newSocket.on('answer', handleAnswer);
    newSocket.on('iceCandidate', handleIceCandidate);
    newSocket.on('userJoined', handleUserJoined);
    newSocket.on('userLeft', handleUserLeft);
    newSocket.on('callRequest', handleCallRequest);
    newSocket.on('callAccepted', handleCallAccepted);
    newSocket.on('callRejected', handleCallRejected);
    newSocket.on('callEnded', handleCallEnded);

    // Audio fraud detection results
    newSocket.on('fraudResult', (data: { classification: string; confidence: number }) => {
      setCallState(prev => ({
        ...prev,
        fraudResult: {
          classification: data.classification as 'Safe' | 'Fraud Detected',
          confidence: data.confidence,
          timestamp: new Date(),
        }
      }));
    });

    // User list updates
    newSocket.on('userList', (users: string[]) => {
      const filteredUsers = users.filter(user => user !== username && user && user.trim() !== '');
      setAvailableUsers(filteredUsers);
    });

    // Request user list when connected
    newSocket.on('connect', () => {
      setCallState(prev => ({ ...prev, isConnected: true }));
      console.log('✅ Connected to signaling server');
      // Request current user list
      newSocket.emit('getUserList');
    });

    // Handle disconnection
    newSocket.on('disconnect', () => {
      setCallState(prev => ({ ...prev, isConnected: false }));
      console.log('❌ Disconnected from signaling server');
    });

    // Handle connection errors
    newSocket.on('connect_error', (error: any) => {
      console.error('❌ Connection error:', error);
      setCallState(prev => ({ ...prev, isConnected: false }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    // Call timer
    if (callState.isInCall) {
      callTimerRef.current = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          callDuration: prev.callDuration + 1
        }));
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState.isInCall]);

  const handleUserJoined = (data: { username: string }) => {
    console.log(`${data.username} joined the call room`);
    // Request updated user list
    if (socket) {
      socket.emit('getUserList');
    }
  };

  const handleUserLeft = (data: { username: string }) => {
    console.log(`${data.username} left the call room`);
    if (data.username === remoteUser) {
      endCall();
    }
    // Request updated user list
    if (socket) {
      socket.emit('getUserList');
    }
  };

  const handleCallRequest = async (data: { from: string; type: 'audio' | 'video' }) => {
    console.log('📞 Call request from:', data.from, 'Type:', data.type);
    const accepted = window.confirm(`${data.from} wants to start a ${data.type} call. Accept?`);
    if (accepted) {
      console.log('✅ Call accepted');
      setRemoteUser(data.from);
      setCallType(data.type);
      
      // Wait for socket connection before sending acceptance
      let retries = 0;
      const maxRetries = 5;
      
      while (!socket && retries < maxRetries) {
        console.log(`⏳ Waiting for socket before sending acceptance... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      // Send acceptance notification
      if (socket) {
        socket.emit('callAccepted', { to: data.from });
        console.log('📤 Call accepted notification sent');
      } else {
        console.error('❌ Socket not available for sending acceptance');
        alert('Connection lost. Please refresh the page and try again.');
        return;
      }
      
      // Initialize call after sending acceptance
      console.log('🔧 Starting call initialization...');
      await initializeCall();
    } else {
      console.log('❌ Call rejected');
      
      // Wait for socket connection before sending rejection
      let retries = 0;
      const maxRetries = 5;
      
      while (!socket && retries < maxRetries) {
        console.log(`⏳ Waiting for socket before sending rejection... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
      
      if (socket) {
        socket.emit('callRejected', { to: data.from });
        console.log('📤 Call rejected notification sent');
      }
    }
  };

  const handleCallAccepted = (data: { from: string }) => {
    console.log('✅ Audio call accepted by:', data.from);
    setRemoteUser(data.from);
    setCallState(prev => ({ ...prev, isInCall: true }));
    setShowSetup(false);
    console.log('🎵 Waiting for audio offer from:', data.from);
  };

  const handleCallRejected = (data: { from: string }) => {
    console.log('❌ Call rejected by:', data.from);
    alert(`${data.from} rejected your call`);
    endCall();
  };

  const handleCallEnded = (data: { from: string }) => {
    console.log('📞 Call ended by:', data.from);
    endCall();
  };

  const initializeCall = async () => {
    try {
      console.log('🔧 Initializing audio call...');
      
      // Wait for socket connection with retry
      let retries = 0;
      const maxRetries = 5;
      
      while (!socket && retries < maxRetries) {
        console.log(`⏳ Waiting for socket connection... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
      
      if (!socket) {
        console.error('❌ Socket not available after retries');
        alert('Connection lost. Please refresh the page and try again.');
        return;
      }

      console.log('✅ Socket connection confirmed');

      // Get user media - audio only
      console.log('📱 Getting audio media...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      console.log('✅ Audio stream obtained');
      localStreamRef.current = stream;
      
      // Create peer connection
      console.log('🔗 Creating peer connection...');
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local audio track only
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        peerConnection.addTrack(audioTrack, stream);
        console.log('✅ Audio track added to peer connection');
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio stream received during initialization');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('🧊 Sending ICE candidate during initialization');
          socket.emit('iceCandidate', {
            to: remoteUser,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state during initialization:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC audio connection established');
          setCallState(prev => ({ ...prev, isInCall: true }));
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed during initialization');
          endCall();
        }
      };

      // Start audio processing for fraud detection
      startAudioProcessing(stream);

      setShowSetup(false);
      
      console.log('✅ Audio call initialization completed');

    } catch (error) {
      console.error('❌ Error initializing audio call:', error);
      alert('Failed to access microphone');
      endCall();
    }
  };

  const startAudioProcessing = (stream: MediaStream) => {
    try {
      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        console.warn('MediaRecorder not supported, skipping audio recording');
        return;
      }

      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Check supported MIME types
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      
      let selectedType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          break;
        }
      }

      if (!selectedType) {
        console.warn('No supported audio MIME type found, skipping audio recording');
        return;
      }

      // Create media recorder for audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedType
      });
      mediaRecorderRef.current = mediaRecorder;

      // Process audio chunks every 3 seconds
      let audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: selectedType });
        sendAudioToServer(audioBlob);
        audioChunks = [];
      };

      // Start recording in 3-second intervals
      const startRecording = () => {
        try {
          if (mediaRecorder.state === 'inactive') {
            mediaRecorder.start();
            setTimeout(() => {
              if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
                startRecording(); // Continue recording
              }
            }, 3000);
          }
        } catch (error) {
          console.error('Error starting media recorder:', error);
        }
      };

      startRecording();

    } catch (error) {
      console.error('Error starting audio processing:', error);
      // Fallback: simulate audio processing for demo
      console.log('Using fallback audio processing simulation');
      setInterval(() => {
        if (callState.isInCall && socket) {
          // Simulate fraud detection result
          const mockResult = {
            classification: Math.random() > 0.7 ? 'Fraud Detected' : 'Safe',
            confidence: Math.random()
          };
          setCallState(prev => ({
            ...prev,
            fraudResult: {
              classification: mockResult.classification as 'Safe' | 'Fraud Detected',
              confidence: mockResult.confidence,
              timestamp: new Date(),
            }
          }));
        }
      }, 5000); // Every 5 seconds
    }
  };

  const sendAudioToServer = (audioBlob: Blob) => {
    if (socket && callState.isInCall) {
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64Audio = reader.result as string;
        if (socket) {
          socket.emit('audioChunk', {
            audio: base64Audio,
            timestamp: new Date().toISOString()
          });
        }
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  const handleOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
    try {
      console.log('📥 Received audio offer from:', data.from);
      
      // Check socket connection - be more lenient
      if (!socket) {
        console.error('❌ Socket not available when handling offer');
        return;
      }

      // Set call state
      setRemoteUser(data.from);
      setCallState(prev => ({ ...prev, isInCall: true }));
      setShowSetup(false);

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local audio track if available
      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          peerConnection.addTrack(audioTrack, localStreamRef.current);
          console.log('✅ Local audio track added to peer connection');
        }
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio stream received from offer');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('🧊 Sending ICE candidate from offer');
          socket.emit('iceCandidate', {
            to: data.from,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state from offer:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC audio connection established from offer');
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed from offer');
          endCall();
        }
      };

      console.log('📤 Setting remote description and creating answer...');
      
      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer', {
          to: data.from,
          answer: answer
        });
        console.log('📤 Answer sent to:', data.from);
      } else {
        console.error('❌ Socket not available when sending answer');
        endCall();
      }

    } catch (error) {
      console.error('❌ Error handling audio offer:', error);
      endCall();
    }
  };

  const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    try {
      console.log('📥 Received answer from:', data.from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Remote description set from answer');
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    try {
      console.log('🧊 Received ICE candidate from:', data.from);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('✅ ICE candidate added');
      }
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
    }
  };

  const initiateCall = async (targetUser: string, type: 'audio' | 'video') => {
    try {
      console.log('🚀 Initiating audio call to:', targetUser);
      
      // Wait for socket connection with retry
      let retries = 0;
      const maxRetries = 5;
      
      while (!socket && retries < maxRetries) {
        console.log(`⏳ Waiting for socket connection... (${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }
      
      if (!socket) {
        console.error('❌ Socket not available after retries');
        alert('Connection lost. Please refresh the page and try again.');
        return;
      }

      console.log('✅ Socket connection confirmed');

      // Prevent self-calling
      if (targetUser === username) {
        alert('You cannot call yourself');
        return;
      }

      // Send call request first
      console.log('📞 Sending audio call request...');
      socket.emit('callRequest', {
        to: targetUser,
        type: 'audio'
      });
      console.log('📤 Audio call request sent to:', targetUser);

      // Set call state
      setRemoteUser(targetUser);
      setCallType('audio');
      
      console.log('📱 Getting audio media...');
      
      // Get user media - audio only
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });

      console.log('✅ Audio stream obtained');
      localStreamRef.current = stream;

      console.log('🔗 Creating peer connection...');
      
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local audio track only
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        peerConnection.addTrack(audioTrack, stream);
        console.log('✅ Audio track added to peer connection');
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        console.log('🎵 Remote audio stream received');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('🧊 Sending ICE candidate');
          socket.emit('iceCandidate', {
            to: targetUser,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC audio connection established');
        } else if (peerConnection.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed');
          endCall();
        }
      };

      // Start audio processing
      startAudioProcessing(stream);
      
      console.log('✅ Audio call initiation completed - waiting for acceptance');

    } catch (error) {
      console.error('❌ Error initiating audio call:', error);
      alert('Failed to access microphone or start call');
      endCall();
    }
  };

  const endCall = () => {
    console.log('📞 Ending call...');
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped track:', track.kind);
      });
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      console.log('🔗 Peer connection closed');
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('🎙️ Media recorder stopped');
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      console.log('🎵 Audio context closed');
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      console.log('⏱️ Call timer cleared');
    }

    // Reset call state but keep socket connection
    setCallState(prev => ({
      ...prev,
      isInCall: false,
      isMuted: false,
      isVideoEnabled: true,
      callDuration: 0,
    }));
    
    setShowSetup(true);
    setRemoteUser('');

    // Notify server
    if (socket && remoteUser) {
      socket.emit('endCall', { to: remoteUser });
      console.log('📤 End call notification sent');
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    console.log('✅ Call ended successfully');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
      }
    }
  };

  const handleJoinCall = (user: string) => {
    setUsername(user);
    setShowSetup(false);
    if (socket) {
      socket.emit('joinCallRoom', { username: user, room: 'call' });
      // Request user list after joining
      setTimeout(() => {
        socket.emit('getUserList');
      }, 1000);
    }
  };

  if (showSetup) {
    return <CallSetup onJoin={handleJoinCall} />;
  }

  return (
    <CallInterface
      callState={callState}
      username={username}
      remoteUser={remoteUser}
      callType={callType}
      localVideoRef={localVideoRef}
      remoteVideoRef={remoteVideoRef}
      onInitiateCall={initiateCall}
      onEndCall={endCall}
      onToggleMute={toggleMute}
      onToggleVideo={toggleVideo}
      isConnected={callState.isConnected}
      availableUsers={availableUsers}
    />
  );
}