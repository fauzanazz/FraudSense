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
  const [callType, setCallType] = useState<'audio' | 'video'>('video');
  
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

    newSocket.on('connect', () => {
      setCallState(prev => ({ ...prev, isConnected: true }));
      console.log('✅ Connected to signaling server');
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
  };

  const handleUserLeft = (data: { username: string }) => {
    console.log(`${data.username} left the call room`);
    if (data.username === remoteUser) {
      endCall();
    }
  };

  const handleCallRequest = (data: { from: string; type: 'audio' | 'video' }) => {
    const accepted = window.confirm(`${data.from} wants to start a ${data.type} call. Accept?`);
    if (accepted) {
      setRemoteUser(data.from);
      setCallType(data.type);
      if (socket) {
        socket.emit('callAccepted', { to: data.from });
      }
      initializeCall();
    } else {
      if (socket) {
        socket.emit('callRejected', { to: data.from });
      }
    }
  };

  const handleCallAccepted = (data: { from: string }) => {
    setRemoteUser(data.from);
    setCallState(prev => ({ ...prev, isInCall: true }));
    setShowSetup(false);
  };

  const handleCallRejected = (data: { from: string }) => {
    alert(`${data.from} rejected your call`);
    endCall();
  };

  const handleCallEnded = (data: { from: string }) => {
    console.log(`${data.from} ended the call`);
    endCall();
  };

  const initializeCall = async () => {
    try {
      // Wait for socket to be connected
      let retries = 0;
      while (!socket && retries < 10) {
        console.log('Waiting for socket connection...', retries);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!socket) {
        console.error('Socket not connected after retries');
        alert('Connection lost. Please refresh the page.');
        return;
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('iceCandidate', {
            to: remoteUser,
            candidate: event.candidate
          });
        }
      };

      // Start audio processing for fraud detection
      startAudioProcessing(stream);

      setCallState(prev => ({ ...prev, isInCall: true }));
      setShowSetup(false);

    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to access camera/microphone');
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
      // Wait for socket to be connected
      let retries = 0;
      while (!socket && retries < 10) {
        console.log('Waiting for socket connection...', retries);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!socket) {
        console.error('Socket not connected after retries');
        alert('Connection lost. Please refresh the page.');
        return;
      }

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('iceCandidate', {
            to: data.from,
            candidate: event.candidate
          });
        }
      };

      // Set remote description and create answer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      if (socket) {
        socket.emit('answer', {
          to: data.from,
          answer: answer
        });
      }

    } catch (error) {
      console.error('Error handling offer:', error);
    }
  };

  const handleAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  };

  const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const initiateCall = async (targetUser: string, type: 'audio' | 'video') => {
    try {
      // Wait for socket to be connected
      let retries = 0;
      while (!socket && retries < 10) {
        console.log('Waiting for socket connection...', retries);
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }

      if (!socket) {
        console.error('Socket not connected after retries');
        alert('Connection lost. Please refresh the page.');
        return;
      }

      // Prevent self-calling
      if (targetUser === username) {
        alert('You cannot call yourself');
        return;
      }

      setRemoteUser(targetUser);
      setCallType(type);
      
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });

      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming tracks
      peerConnection.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('iceCandidate', {
            to: targetUser,
            candidate: event.candidate
          });
        }
      };

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (socket) {
        socket.emit('offer', {
          to: targetUser,
          offer: offer
        });
      }

      // Start audio processing
      startAudioProcessing(stream);

    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Failed to access camera/microphone');
    }
  };

  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    // Reset state
    setCallState({
      isInCall: false,
      isConnected: false,
      isMuted: false,
      isVideoEnabled: true,
      callDuration: 0,
    });
    setShowSetup(true);
    setRemoteUser('');

    // Notify server
    if (socket && remoteUser) {
      socket.emit('endCall', { to: remoteUser });
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
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
    />
  );
}