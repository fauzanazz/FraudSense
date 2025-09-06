import { useState, useRef, useEffect } from 'react';

const VideoCall = ({ socket, callData, user, onEndCall }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [audioFormat, setAudioFormat] = useState('wav');
  const [isRecording, setIsRecording] = useState(false);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [activeFraudWarning, setActiveFraudWarning] = useState(null);
  const [fraudScore, setFraudScore] = useState(0);
  const [callSessionId, setCallSessionId] = useState(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [isSavingAudio, setIsSavingAudio] = useState(false);
  const [autoAudioInterval, setAutoAudioInterval] = useState(null);
  const [isAutoSending, setIsAutoSending] = useState(false);
  const [nextAudioSendTime, setNextAudioSendTime] = useState(null);
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [savedRecordings, setSavedRecordings] = useState([]);
  const [showStorageManager, setShowStorageManager] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef(null);
  const remoteMediaStreamRef = useRef(null);
  const pendingRemoteIceCandidatesRef = useRef([]);
  const localAudioContextRef = useRef(null);
  const remoteAudioContextRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const initializedRef = useRef(false);
  const hasCleanedUpRef = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoke in dev
    if (!initializedRef.current) {
      initializedRef.current = true;
      initializeCall();
    }
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Set up socket listeners
    console.log('🔌 Setting up socket listeners');
    socket.on('call-answer', handleCallAnswer);
    socket.on('call-ended', handleCallEnded);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('fraud-alert', handleFraudAlert);
    socket.on('audio-saved', handleAudioSaved);
    
    return () => {
      console.log('🔌 Cleaning up socket listeners');
      socket.off('call-answer', handleCallAnswer);
      socket.off('call-ended', handleCallEnded);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('fraud-alert', handleFraudAlert);
      socket.off('audio-saved', handleAudioSaved);
    };
  }, []);

  useEffect(() => {
    console.log(audioFormat)
  }, [audioFormat]);

  // Auto-start audio recording when call is accepted
  useEffect(() => {
    if (callAccepted && localStream) {
      // Start automatic audio recording immediately when call is accepted
      const startTimer = setTimeout(() => {
        startAutoAudioSending();
        console.log('🚀 Auto-started audio recording when call accepted');
      }, 2000); // 2 second delay to ensure call is stable
      
      return () => clearTimeout(startTimer);
    }
  }, [callAccepted, localStream]);

  // Load saved recordings when component mounts
  useEffect(() => {
    loadSavedRecordings();
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    if (!isAutoSending || !nextAudioSendTime) return;
    
    const timer = setInterval(() => {
      // Force re-render to update countdown
      setNextAudioSendTime(prev => prev);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isAutoSending, nextAudioSendTime]);

  // Monitor fraud alerts changes (simplified)
  useEffect(() => {
    if (fraudAlerts.length > 0) {
      console.log('🚨 Fraud alerts updated:', fraudAlerts.length, 'alerts');
    }
  }, [fraudAlerts]);

  // Clean up old alerts every 30 seconds
  useEffect(() => {
    if (!isAutoSending) return;
    
    const cleanupTimer = setInterval(() => {
      setFraudAlerts(prev => {
        const now = new Date();
        const filtered = prev.filter(alert => {
          const alertTime = new Date(alert.timestamp);
          const ageMinutes = (now - alertTime) / (1000 * 60);
          return ageMinutes < 5; // Keep alerts for 5 minutes
        });
        
        if (filtered.length !== prev.length) {
          console.log(`🧹 Cleaned up ${prev.length - filtered.length} old alerts`);
        }
        
        return filtered;
      });
    }, 30000); // Clean up every 30 seconds
    
    return () => clearInterval(cleanupTimer);
  }, [isAutoSending]);

  // Handle local stream attachment to video element
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('✅ Attaching local stream to video element');
      localVideoRef.current.srcObject = localStream;
      
      // Add video element event listeners
      const videoElement = localVideoRef.current;
      videoElement.addEventListener('loadstart', () => console.log('📺 Local video load start'));
      videoElement.addEventListener('loadeddata', () => console.log('📺 Local video data loaded'));
      videoElement.addEventListener('canplay', () => console.log('📺 Local video can play'));
      videoElement.addEventListener('playing', () => console.log('📺 Local video playing'));
      videoElement.addEventListener('error', (e) => console.log('📺 Local video error:', e));
      
      // Start playing the video
      videoElement.play().catch(e => console.error('Local video play failed:', e));
    }
  }, [localStream]);

  // Handle remote stream attachment to video element
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      console.log('✅ Attaching remote stream to video element');
      remoteVideoRef.current.srcObject = remoteStream;
      
      // Add video element event listeners
      const videoElement = remoteVideoRef.current;
      videoElement.addEventListener('loadstart', () => console.log('📺 Remote video load start'));
      videoElement.addEventListener('loadeddata', () => console.log('📺 Remote video data loaded'));
      videoElement.addEventListener('canplay', () => console.log('📺 Remote video can play'));
      videoElement.addEventListener('playing', () => console.log('📺 Remote video playing'));
      videoElement.addEventListener('error', (e) => console.log('📺 Remote video error:', e));
      
      // Start playing the video
      videoElement.play().catch(e => console.error('Remote video play failed:', e));
    }
  }, [remoteStream]);

  const initializeCall = async () => {
    try {
      console.log('🚀 Initializing call:', callData);
      
      // Create a consistent call session ID for both participants
      const sessionId = callData.conversationId || `call_${user._id}_${callData.targetUserId || callData.fromUserId}_${Date.now()}`;
      setCallSessionId(sessionId);
      
      // Join the call session room for fraud alerts
      socket.emit('joinRoom', sessionId);
      console.log('🏠 Joined call session room:', sessionId);
      
      // Check if we're in a secure context
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available. Please use HTTPS or localhost.');
      }

      // Get user media
      console.log('📹 Requesting media access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });
      
      console.log('✅ Media access granted, tracks:', stream.getTracks().length);
      
      // Log detailed track information
      stream.getTracks().forEach((track, index) => {
        console.log(`Track ${index}:`, {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          constraints: track.getConstraints(),
          settings: track.getSettings()
        });
      });
      
      setLocalStream(stream);
      
      // Set up audio level monitoring for local stream
      setupAudioLevelMonitoring(stream, 'local');
      
      // Set up audio recording for fraud detection
      setupAudioRecording(stream);

      // Get TURN configuration from backend with retry logic
      console.log('🧊 Requesting TURN configuration from backend...');
      let rtcConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 2,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      };

      let configAttempts = 0;
      const maxConfigAttempts = 3;

      while (configAttempts < maxConfigAttempts) {
        try {
          // Request TURN config from backend with increased timeout
          const turnConfig = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('TURN config timeout')), 8000);
            socket.emit('get-turn-config', (config) => {
              clearTimeout(timeout);
              if (config && config.iceServers && config.iceServers.length > 0) {
                resolve(config);
              } else {
                reject(new Error('Invalid TURN config received'));
              }
            });
          });

          rtcConfig = turnConfig;
          console.log('✅ Using TURN configuration from backend:', JSON.stringify(rtcConfig, null, 2));
          break;
          
        } catch (error) {
          configAttempts++;
          console.warn(`⚠️ TURN config attempt ${configAttempts}/${maxConfigAttempts} failed:`, error);
          
          if (configAttempts >= maxConfigAttempts) {
            console.warn('⚠️ All TURN config attempts failed, using fallback');
            
            // Enhanced fallback to environment variables
            const turnUrl = import.meta.env.VITE_TURN_SERVER;
            const turnUser = import.meta.env.VITE_TURN_USER || 'turnuser';
            const turnSecret = import.meta.env.VITE_TURN_SECRET || 'turnpassword';
            
            if (turnUrl) {
              rtcConfig.iceServers.push({
                urls: [
                  `turn:${turnUrl}:3478?transport=udp`,
                  `turn:${turnUrl}:3478?transport=tcp`
                ],
                username: turnUser,
                credential: turnSecret,
                credentialType: 'password'
              });
              console.log('🧊 Using TURN server from environment variables');
            }
          } else {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * configAttempts));
          }
        }
      }

      const forceRelayOnly = import.meta.env.VITE_ICE_RELAY_ONLY === '1';
      if (forceRelayOnly) {
        rtcConfig.iceTransportPolicy = 'relay';
        console.log('🧊 Forcing relay-only via TURN for connectivity testing');
      }
      
      const pc = new RTCPeerConnection(rtcConfig);

      // Enhanced connection state monitoring with error handling
      let connectionTimeout = null;
      let iceTimeout = null;
      
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
            connectionTimeout = null;
          }
        } else if (pc.connectionState === 'failed') {
          console.error('❌ WebRTC connection failed');
          handleConnectionFailure();
        } else if (pc.connectionState === 'disconnected') {
          console.warn('⚠️ WebRTC connection disconnected');
          // Try to reconnect
          setTimeout(() => {
            if (pc.connectionState === 'disconnected') {
              console.log('🔄 Attempting to restart ICE...');
              pc.restartIce();
            }
          }, 2000);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
        setIceConnectionState(pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('✅ ICE connection established');
          if (iceTimeout) {
            clearTimeout(iceTimeout);
            iceTimeout = null;
          }
        } else if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed');
          handleConnectionFailure();
        } else if (pc.iceConnectionState === 'checking') {
          // Set timeout for ICE connection
          if (iceTimeout) clearTimeout(iceTimeout);
          iceTimeout = setTimeout(() => {
            if (pc.iceConnectionState === 'checking') {
              console.warn('⏰ ICE connection timeout, restarting ICE');
              pc.restartIce();
            }
          }, 10000); // 30 second timeout
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log('🔍 ICE gathering state:', pc.iceGatheringState);
      };

      pc.onicecandidateerror = (event) => {
        console.warn('🧊 ICE candidate error:', {
          errorCode: event.errorCode,
          errorText: event.errorText,
          url: event.url,
          address: event.address,
          port: event.port
        });

        // Better mapping of common error codes
        switch (event.errorCode) {
          case 701:
            if (event.errorText?.toLowerCase().includes('timed out')) {
              console.warn('⏰ TURN allocate timed out - check firewall/NAT and external-ip');
            } else {
              console.warn('🔒 TURN server auth/lookup issue - verify username/secret and realm');
            }
            break;
          case 300:
            console.warn('🌐 STUN/TURN server unreachable - check DNS/network');
            break;
          default:
            break;
        }
      };

      // Add signaling state monitoring
      pc.onsignalingstatechange = () => {
        console.log('📡 Signaling state:', pc.signalingState);
      };

      const handleConnectionFailure = () => {
        console.error('🚨 Connection failed - attempting recovery');
        
        // Clear any pending timeouts
        if (connectionTimeout) clearTimeout(connectionTimeout);
        if (iceTimeout) clearTimeout(iceTimeout);
        
        // You could implement retry logic here or show user an error
        alert('Connection failed. Please check your network and try again.');
        onEndCall();
      };

      // Add local stream to peer connection
      console.log('📤 Adding local tracks to peer connection...');
      stream.getTracks().forEach((track, index) => {
        console.log(`Adding track ${index}:`, track.kind, track.enabled);
        pc.addTrack(track, stream);
      });

      // Handle remote tracks using a persistent MediaStream (more robust across browsers)
      pc.ontrack = (event) => {
        console.log('📥 Received remote track:', event.track.kind, {
          hasStreamsArray: Array.isArray(event.streams),
          streamsLength: event.streams?.length || 0
        });

        if (!remoteMediaStreamRef.current) {
          remoteMediaStreamRef.current = new MediaStream();
        }

        // Avoid duplicate tracks
        const inboundStream = remoteMediaStreamRef.current;
        const exists = inboundStream.getTracks().some(t => t.id === event.track.id);
        if (!exists) {
          inboundStream.addTrack(event.track);
          console.log('➕ Added remote track to aggregated stream. Total tracks:', inboundStream.getTracks().length);
        }

        setRemoteStream(inboundStream);

        // Set up audio level monitoring for remote stream
        setupAudioLevelMonitoring(inboundStream, 'remote');
        setCallAccepted(true);
      };

      // Enhanced ICE candidate handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Generated ICE candidate:', {
            type: event.candidate.type,
            protocol: event.candidate.protocol,
            address: event.candidate.address,
            port: event.candidate.port,
            priority: event.candidate.priority
          });
          
          const targetUserId = callData.type === 'outgoing' ? callData.targetUserId : callData.fromUserId;
          
          // Send with retry logic
          const sendCandidateWithRetry = (attempt = 1) => {
            const maxAttempts = 3;
            
            try {
              socket.emit('ice-candidate', {
                to: targetUserId,
                candidate: event.candidate
              });
              
              console.log(`✅ ICE candidate sent (attempt ${attempt})`);
            } catch (error) {
              console.error(`❌ Failed to send ICE candidate (attempt ${attempt}):`, error);
              
              if (attempt < maxAttempts) {
                setTimeout(() => {
                  sendCandidateWithRetry(attempt + 1);
                }, 1000 * attempt);
              }
            }
          };
          
          sendCandidateWithRetry();
        } else {
          console.log('🧊 ICE gathering complete - all candidates sent');
        }
      };

      peerConnectionRef.current = pc;

      // If this is an outgoing call, create offer
      if (callData.type === 'outgoing') {
        console.log('📞 Creating offer for outgoing call...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        console.log('📤 Sending offer');
        
        socket.emit('call-offer', {
          to: callData.targetUserId,
          from: user.username,
          fromUserId: user._id,
          offer: offer,
          conversationId: callSessionId
        });
      }

      // If this is an incoming call, handle the offer
      if (callData.type === 'incoming' && callData.offer) {
        console.log('📞 Handling incoming call offer...');
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));

        // Apply any ICE candidates that arrived before remoteDescription was set
        if (pendingRemoteIceCandidatesRef.current.length > 0) {
          console.log(`🧊 Applying buffered ICE candidates: ${pendingRemoteIceCandidatesRef.current.length}`);
          for (const candidate of pendingRemoteIceCandidatesRef.current) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('❌ Error applying buffered ICE candidate:', err);
            }
          }
          pendingRemoteIceCandidatesRef.current = [];
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('📤 Sending answer');
        
        socket.emit('call-answer', {
          to: callData.fromUserId,
          answer: answer
        });
      }

    } catch (error) {
      console.error('❌ Error initializing call:', error);
      alert('Failed to access camera/microphone: ' + error.message);
      onEndCall();
    }
  };

  const handleCallAnswer = async (data) => {
    console.log('📥 Received call answer');
    if (peerConnectionRef.current && data.answer) {
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Remote description set successfully');

        // Apply any ICE candidates that arrived before remoteDescription was set
        if (pendingRemoteIceCandidatesRef.current.length > 0) {
          console.log(`🧊 Applying buffered ICE candidates (answer): ${pendingRemoteIceCandidatesRef.current.length}`);
          for (const candidate of pendingRemoteIceCandidatesRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error('❌ Error applying buffered ICE candidate after answer:', err);
            }
          }
          pendingRemoteIceCandidatesRef.current = [];
        }
      } catch (error) {
        console.error('❌ Error setting remote description:', error);
      }
    } else {
      console.warn('⚠️ No peer connection or answer data', {
        hasPeerConnection: !!peerConnectionRef.current,
        hasAnswer: !!data.answer
      });
    }
  };

  const handleIceCandidate = async (data) => {
    console.log('📥 Received ICE candidate:', {
      type: data.candidate?.type,
      protocol: data.candidate?.protocol,
      hasRemoteDescription: !!peerConnectionRef.current?.remoteDescription
    });
    
    if (peerConnectionRef.current && data.candidate) {
      try {
        const pc = peerConnectionRef.current;
        
        if (pc.remoteDescription && pc.remoteDescription.type) {
          // Remote description is set, add candidate immediately
          const candidate = new RTCIceCandidate(data.candidate);
          await pc.addIceCandidate(candidate);
          console.log('✅ ICE candidate added successfully');
        } else {
          // Buffer until remote description is set
          pendingRemoteIceCandidatesRef.current.push(data.candidate);
          console.log(`🧊 Buffered ICE candidate (total buffered: ${pendingRemoteIceCandidatesRef.current.length})`);
          
          // Set a timeout to prevent indefinite buffering
          setTimeout(() => {
            const index = pendingRemoteIceCandidatesRef.current.findIndex(c => c === data.candidate);
            if (index !== -1) {
              pendingRemoteIceCandidatesRef.current.splice(index, 1);
              console.warn('⏰ Removed expired buffered ICE candidate');
            }
          }, 10000); // 30 second timeout for buffered candidates
        }
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', {
          error: error.message,
          candidateType: data.candidate?.type,
          signalingState: peerConnectionRef.current?.signalingState,
          iceConnectionState: peerConnectionRef.current?.iceConnectionState
        });
        
        // Don't fail the entire call for a single candidate error
        if (error.name === 'OperationError' && error.message.includes('remote description')) {
          console.log('🧊 Will retry when remote description is available');
          pendingRemoteIceCandidatesRef.current.push(data.candidate);
        }
      }
    } else {
      console.warn('⚠️ Invalid ICE candidate data', {
        hasPeerConnection: !!peerConnectionRef.current,
        hasCandidate: !!data.candidate,
        candidateData: data
      });
    }
  };

  const handleCallEnded = () => {
    cleanup();
    onEndCall();
  };

  const handleFraudAlert = (alertData) => {
    console.log('🚨 Fraud alert received:', alertData);
    
    setFraudAlerts(prev => [...prev, alertData]);
    setFraudScore(alertData.fraudScore);
    
    // Show warning modal for fraud
    if (alertData.fraudScore === 1) {
      setActiveFraudWarning(alertData.fraudScore);
    }
  };


  const handleAudioSaved = (result) => {
    console.log('💾 Audio save result:', result);
    if (result.success) {
      console.log('✅ Audio recording saved successfully to server');
      // Refresh saved recordings list
      loadSavedRecordings();
    } else {
      console.error('❌ Failed to save audio recording:', result.error);
    }
  };

  const loadSavedRecordings = async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/audio/recordings`);
      const data = await response.json();
      
      if (data.success) {
        setSavedRecordings(data.recordings);
      }
    } catch (error) {
      console.error('Error loading saved recordings:', error);
    }
  };

  const downloadRecording = async (filename) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/audio/recordings/${filename}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading recording:', error);
    }
  };

  const deleteRecording = async (filename) => {
    if (!confirm(`Delete ${filename}?`)) return;
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE}/api/audio/recordings/${filename}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSavedRecordings(prev => prev.filter(r => r.filename !== filename));
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const dismissAlert = (alertTimestamp) => {
    setFraudAlerts(prev => prev.filter(alert => alert.timestamp !== alertTimestamp));
  };

  const dismissFraudWarning = () => {
    setActiveFraudWarning(null);
  };

  const endCall = () => {
    socket.emit('call-ended', {
      to: callData.type === 'outgoing' ? callData.targetUserId : callData.fromUserId
    });
    handleCallEnded();
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const setupAudioLevelMonitoring = (stream, type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      if (type === 'local') {
        localAudioContextRef.current = audioContext;
        localAnalyserRef.current = analyser;
      } else {
        remoteAudioContextRef.current = audioContext;
        remoteAnalyserRef.current = analyser;
      }
      
      const updateAudioLevel = () => {
        if ((type === 'local' && localAnalyserRef.current) || 
            (type === 'remote' && remoteAnalyserRef.current)) {
          analyser.getByteFrequencyData(dataArray);
          
          // Calculate average volume
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;
          const percentage = (average / 255) * 100;
          
          if (type === 'local') {
            setLocalAudioLevel(Math.round(percentage));
          } else {
            setRemoteAudioLevel(Math.round(percentage));
          }
          
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      console.log(`🔊 Audio level monitoring setup for ${type} stream`);
    } catch (error) {
      console.error(`❌ Error setting up audio monitoring for ${type}:`, error);
    }
  };

  const setupAudioRecording = (stream) => {
    try {
      const audioOnlyStream = new MediaStream(stream.getAudioTracks());
  
      // Pilih MIME yang stabil (ogg/webm opus)
      const prefer = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm'];
      let chosen = prefer.find(m => MediaRecorder.isTypeSupported(m)) || '';
  
      const mediaRecorder = chosen
        ? new MediaRecorder(audioOnlyStream, { mimeType: chosen })
        : new MediaRecorder(audioOnlyStream);
  
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
  
      mediaRecorder.ondataavailable = async (event) => {
        if (!event.data || event.data.size === 0) return;
  
        // simpan chunk
        audioChunksRef.current.push(event.data);
  
        // Bikin BLOB kumulatif (header ikut dari chunk awal)
        // Batasi ke window terakhir 5 menit: potong array saat terlalu panjang
        // contoh pembatasan: jika total size > ~50MB, hapus chunk terlama
        let totalSize = audioChunksRef.current.reduce((s, c) => s + c.size, 0);
        while (totalSize > 50 * 1024 * 1024 && audioChunksRef.current.length > 1) {
          totalSize -= audioChunksRef.current.shift().size;
        }
  
        const cumulativeBlob = new Blob(audioChunksRef.current, { type: event.data.type || 'audio/webm' });
  
        // Read as base64 (fix stack overflow for large buffers)
        const arrayBuf = await cumulativeBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuf);
        let binary = '';
        const chunkSize = 8192; // Process in chunks to avoid stack overflow
        
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, chunk);
        }
        const base64Data = btoa(binary);
  
        // Derive real format from MIME
        const t = (cumulativeBlob.type || '').toLowerCase();
        const fmt = t.includes('ogg') ? 'ogg'
                  : t.includes('webm') ? 'webm'
                  : t.includes('wav') ? 'wav'
                  : t.includes('mpeg') || t.includes('mp3') ? 'mp3'
                  : 'unknown';
  
        const audioChunkData = {
          conversationId: callSessionId,
          audioData: base64Data,
          userId: user._id,
          format: fmt
        };
        
        console.log('🎙️ Sending audio chunk to backend:', {
          conversationId: audioChunkData.conversationId,
          userId: audioChunkData.userId,
          format: audioChunkData.format,
          dataSize: base64Data.length,
          blobType: cumulativeBlob.type,
          chunkCount: audioChunksRef.current.length,
          totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
          timestamp: new Date().toISOString()
        });
        
        socket.emit('audio-chunk', audioChunkData);
      };
  
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
      };
  
      console.log('🎙️ Audio recording setup complete. Using mime:', mediaRecorder.mimeType);
    } catch (error) {
      console.error('❌ Error setting up audio recording:', error);
    }
  };

  // Recreate MediaRecorder when audio format changes
  useEffect(() => {
    if (localStream && mediaRecorderRef.current) {
      console.log(`🔄 Audio format changed to ${audioFormat}, recreating MediaRecorder`);
      setupAudioRecording(localStream);
    }
  }, [audioFormat]);

  const startAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start(10000); // Record in 30-second chunks
      setIsRecording(true);
      console.log('🔴 Started audio recording for fraud detection');
    }
  };

  const stopAudioRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('⏹️ Stopped audio recording');
      
      // Create final audio blob from all chunks
      if (audioChunksRef.current.length > 0) {
        const finalBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType || 'audio/webm' 
        });
        setRecordedAudioBlob(finalBlob);
        console.log('💾 Final audio blob created:', {
          size: finalBlob.size,
          type: finalBlob.type
        });
        
        // Immediately send audio for fraud detection
        try {
          const arrayBuffer = await finalBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192; // Process in chunks to avoid stack overflow
          
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
          }
          const base64Data = btoa(binary);
          
          const audioChunkData = {
            conversationId: callSessionId,
            audioData: base64Data,
            userId: user._id,
            format: audioFormat,
            isImmediateCheck: true // Flag for immediate fraud check
          };
          
          console.log('🚨 Sending audio for immediate fraud detection:', {
            conversationId: audioChunkData.conversationId,
            userId: audioChunkData.userId,
            format: audioChunkData.format,
            dataSize: base64Data.length
          });
          
          socket.emit('audio-chunk', audioChunkData);
        } catch (error) {
          console.error('❌ Error sending audio for immediate fraud check:', error);
        }
      }
    }
  };

  const downloadRecordedAudio = () => {
    if (recordedAudioBlob) {
      const url = URL.createObjectURL(recordedAudioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call-recording-${callSessionId || Date.now()}.${audioFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('📥 Audio download initiated');
    }
  };

  const saveAudioToBackend = async () => {
    if (!recordedAudioBlob) return;
    
    setIsSavingAudio(true);
    try {
      // Convert blob to base64 (fix stack overflow for large buffers)
      const arrayBuffer = await recordedAudioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 8192; // Process in chunks to avoid stack overflow
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
      }
      const base64Data = btoa(binary);
      
      const audioData = {
        conversationId: callSessionId,
        audioData: base64Data,
        userId: user._id,
        format: audioFormat,
        isCompleteRecording: true,
        recordingDuration: recordedAudioBlob.size / 1000, // Rough estimate
        timestamp: new Date().toISOString()
      };
      
      // Send complete audio to backend
      socket.emit('save-complete-audio', audioData);
      console.log('💾 Complete audio sent to backend for permanent storage');
      
    } catch (error) {
      console.error('❌ Error saving audio to backend:', error);
    } finally {
      setIsSavingAudio(false);
    }
  };

  const startAutoAudioSending = () => {
    if (autoAudioInterval) {
      clearInterval(autoAudioInterval);
    }
    
    setIsAutoSending(true);
    console.log('🔄 Starting automatic audio sending every 15 seconds');
    
    // Set initial next send time
    const now = new Date();
    const nextSend = new Date(now.getTime() + 15000);
    setNextAudioSendTime(nextSend);
    
    // Start recording immediately with longer chunks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start(15000); // 15-second chunks
      setIsRecording(true);
      console.log('🔴 Started continuous audio recording for fraud detection');
    }
    
    // Set up interval to send audio every 15 seconds
    const interval = setInterval(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('⏰ 15-second interval reached, sending audio chunk');
        
        // Stop current recording to trigger data available event
        mediaRecorderRef.current.stop();
        
        // Update next send time
        const nextSend = new Date(Date.now() + 15000);
        setNextAudioSendTime(nextSend);
        
        // Restart recording with retry mechanism to handle ICE candidate conflicts
        const restartRecording = (attempt = 1) => {
          setTimeout(() => {
            // Check if ICE is still processing - delay recording if so
            if (iceConnectionState === 'checking' || iceConnectionState === 'connecting') {
              console.log('🧊 ICE candidate processing, delaying audio recording restart');
              if (attempt < 5) { // Allow more attempts for ICE conflicts
                restartRecording(attempt + 1);
                return;
              }
            }
            
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              try {
                mediaRecorderRef.current.start(15000);
                console.log('🔄 Restarted audio recording for next 15-second chunk');
              } catch (error) {
                console.warn(`⚠️ Failed to restart recording (attempt ${attempt}):`, error);
                if (attempt < 5) { // Increased attempts for ICE conflicts
                  // Retry with longer delay if ICE candidate is being processed
                  restartRecording(attempt + 1);
                } else {
                  console.error('❌ Failed to restart recording after 5 attempts');
                }
              }
            } else if (attempt < 5) {
              // MediaRecorder not ready, retry
              restartRecording(attempt + 1);
            }
          }, attempt * 1000); // Longer delay: 1s, 2s, 3s, 4s, 5s
        };
        
        restartRecording();
      }
    }, 15000); // 15 seconds
    
    setAutoAudioInterval(interval);
  };

  const stopAutoAudioSending = () => {
    if (autoAudioInterval) {
      clearInterval(autoAudioInterval);
      setAutoAudioInterval(null);
    }
    
    setIsAutoSending(false);
    setNextAudioSendTime(null);
    
    // Stop recording if it's still active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    
    console.log('⏹️ Stopped automatic audio sending');
  };

  const cleanup = () => {
    if (hasCleanedUpRef.current) {
      return;
    }
    hasCleanedUpRef.current = true;
    console.log('🧹 Cleaning up call resources');

    // Immediately detach media from elements to release capture indicators
    if (remoteVideoRef.current) {
      try { remoteVideoRef.current.srcObject = null; } catch (_) {}
    }
    if (localVideoRef.current) {
      try { localVideoRef.current.srcObject = null; } catch (_) {}
    }

    // Stop audio recording and auto-sending
    stopAutoAudioSending();

    // Proactively stop and remove senders/transceivers
    if (peerConnectionRef.current) {
      try {
        const pc = peerConnectionRef.current;
        pc.getSenders?.().forEach((sender) => {
          try { sender.replaceTrack?.(null); } catch (_) {}
          if (sender.track) {
            try { sender.track.stop(); } catch (_) {}
          }
          try { pc.removeTrack?.(sender); } catch (_) {}
        });
        pc.getTransceivers?.().forEach((t) => {
          try { t.direction = 'inactive'; } catch (_) {}
          try { t.stop?.(); } catch (_) {}
        });
      } catch (_) {}
    }

    // Stop local media tracks
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => {
          try { track.stop(); } catch (_) {}
        });
      }
    } catch (_) {}

    // Close peer connection and clear handlers
    if (peerConnectionRef.current) {
      try {
        const pc = peerConnectionRef.current;
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.onconnectionstatechange = null;
        pc.oniceconnectionstatechange = null;
        pc.onicegatheringstatechange = null;
        pc.onicecandidateerror = null;
        pc.close();
      } catch (_) {}
    }

    // Clean up audio contexts
    try { localAudioContextRef.current?.close?.(); } catch (_) {}
    try { remoteAudioContextRef.current?.close?.(); } catch (_) {}

    setLocalStream(null);
    setRemoteStream(null);
    peerConnectionRef.current = null;
    remoteMediaStreamRef.current = null;
    pendingRemoteIceCandidatesRef.current = [];
    localAudioContextRef.current = null;
    remoteAudioContextRef.current = null;
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setCallAccepted(false);
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
    setIsRecording(false);
    setFraudAlerts([]);
    setActiveFraudWarning(null);
    setFraudScore(0);
    // Note: recordedAudioBlob is preserved for download/save functionality
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[1000]">
      <div className="w-[90%] max-w-[800px] h-[80%] bg-neutral-900 rounded-[10px] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-neutral-800 text-white rounded-t-[10px]">
          <div className="flex items-center gap-4">
            <h3 className="m-0 text-[1.2rem]">
              {callData.type === 'outgoing' ? 'Calling...' : `Call from ${callData.from}`}
            </h3>
            {fraudScore > 0 && (
              <div className="text-sm font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-300">
                🚨 FRAUD DETECTED
              </div>
            )}
          </div>
          <button onClick={endCall} className="bg-transparent border-0 text-white text-[1.5rem] cursor-pointer p-0 w-[30px] h-[30px] flex items-center justify-center hover:bg-white/10 rounded-full">×</button>
        </div>
        
        <div className="flex-1 bg-black">
          <div className="flex-1 grid grid-cols-2 gap-[10px] p-5">
            {localStream && (
              <div className="relative bg-[#333] rounded-[8px] overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="transform -scale-x-100 w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('📺 Local video metadata loaded')}
                  onCanPlay={() => console.log('📺 Local video can play')}
                />
                <span className="absolute bottom-[10px] left-[10px] text-white bg-black/70 px-2 py-1 rounded text-[0.8rem]">
                  You
                  <div className="text-[0.7rem] mt-1">
                    🎤 {localAudioLevel}%
                    <div className="w-[60px] h-[4px] bg-white/30 rounded mt-[2px] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#28a745] via-[#ffc107] to-[#dc3545] transition-[width] duration-100 ease-linear" 
                        style={{width: `${Math.min(localAudioLevel, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </span>
              </div>
            )}
            
            {callAccepted && remoteStream && (
              <div className="relative bg-[#333] rounded-[8px] overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log('📺 Remote video metadata loaded')}
                  onCanPlay={() => console.log('📺 Remote video can play')}
                />
                <span className="absolute bottom-[10px] left-[10px] text-white bg-black/70 px-2 py-1 rounded text-[0.8rem]">
                  {callData.type === 'outgoing' ? 'Remote User' : callData.from}
                  <div className="text-[0.7rem] mt-1">
                    🔊 {remoteAudioLevel}%
                    <div className="w-[60px] h-[4px] bg-white/30 rounded mt-[2px] overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#28a745] via-[#ffc107] to-[#dc3545] transition-[width] duration-100 ease-linear" 
                        style={{width: `${Math.min(remoteAudioLevel, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </span>
              </div>
            )}
          </div>
          
          {/* Debug info */}
          <div className="bg-black/70 text-white p-2 text-[0.8rem] absolute top-[10px] right-[10px] rounded min-w-[200px]">
            <p className="m-0">Local stream tracks: {localStream?.getTracks().length || 0}</p>
            <p className="m-0">Remote stream tracks: {remoteStream?.getTracks().length || 0}</p>
            <p className="m-0">Video enabled: {isVideoEnabled ? '✅' : '❌'}</p>
            <p className="m-0">Audio enabled: {isAudioEnabled ? '✅' : '❌'}</p>
            <p className="m-0">Recording: {isRecording ? '🔴' : '⭕'}</p>
            <p className="m-0">Auto Record: {isAutoSending ? '🔄' : '⏹️'}</p>
            <p className="m-0">Call Status: {callAccepted ? '✅' : '⏳'}</p>
            <p className="m-0">ICE State: {iceConnectionState}</p>
            <p className="m-0">Fraud Status: {fraudScore > 0 ? 'DETECTED' : 'NORMAL'}</p>
            <p className="m-0">Active Alerts: {fraudAlerts.length}</p>
          </div>
        </div>

        {/* Fraud Warning Modal */}
        {activeFraudWarning != null && (
          <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 w-[90%] max-w-md text-center shadow-2xl">
              <div className="text-sm text-neutral-600 mb-2">⚠️ Call Warning</div>
              <div className="text-2xl font-semibold mb-3 text-red-600">🚨 FRAUD DETECTED</div>
              <p className="text-neutral-700 mb-6">Our system detected suspicious patterns in this call. Proceed with extreme caution.</p>
              <button onClick={dismissFraudWarning} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white cursor-pointer">Understood</button>
            </div>
          </div>
        )}

        {/* Fraud Alerts */}
        {fraudAlerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 m-0 p-0">
            <div className="flex items-center justify-between p-2 bg-amber-100 border-b border-amber-200">
              <span className="text-[0.8rem] text-amber-700 font-semibold">
                🚨 Fraud Detection Alerts ({fraudAlerts.length})
              </span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[0.7rem] text-amber-600">Auto-refresh active</span>
              </div>
            </div>
            {fraudAlerts.map((alert, index) => (
              <div key={`${alert.timestamp}-${index}`} className={`${alert.severity === 'high' ? 'bg-red-50 border-l-4 border-red-400' : 'bg-amber-50 border-l-4 border-amber-400'} m-0 p-0 animate-[slideIn_0.3s_ease-out]`}>
                <div className="flex items-start p-3 gap-2">
                  <span className="text-[1.2rem] text-red-500 shrink-0 mt-[0.1rem]">🚨</span>
                  <div className="flex-1 min-w-0">
                    <strong className="text-neutral-800 text-[0.9rem] mb-1 block">Call Fraud Alert ({alert.type})</strong>
                    <p className="m-1 my-1 text-neutral-700 text-[0.85rem] leading-[1.3]">{alert.message}</p>
                    <small className="text-neutral-600 text-[0.75rem] block mt-1">
                      Score: {alert.fraudScore}, Confidence: {(alert.confidence * 100).toFixed(1)}%
                      <span className="ml-2 text-[0.7rem] text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </small>
                  </div>
                  <button 
                    className="text-neutral-500 text-[1.2rem] w-5 h-5 shrink-0 flex items-center justify-center rounded-full hover:bg-black/5 hover:text-red-500 cursor-pointer"
                    onClick={() => dismissAlert(alert.timestamp)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved Recordings List */}
        {showStorageManager && (
          <div className="bg-neutral-800 border-t border-neutral-700 max-h-48 overflow-y-auto">
            <div className="p-3 border-b border-neutral-700">
              <h4 className="text-white text-sm font-semibold mb-2">📁 Saved Recordings ({savedRecordings.length})</h4>
            </div>
            <div className="p-3">
              {savedRecordings.length === 0 ? (
                <p className="text-neutral-400 text-sm">No saved recordings found</p>
              ) : (
                <div className="space-y-2">
                  {savedRecordings.slice(0, 5).map((recording, index) => (
                    <div key={index} className="flex items-center justify-between bg-neutral-700 rounded p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{recording.filename}</p>
                        <p className="text-neutral-400 text-xs">
                          {formatFileSize(recording.size)} • {new Date(recording.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => downloadRecording(recording.filename)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs"
                          title="Download"
                        >
                          📥
                        </button>
                        <button
                          onClick={() => deleteRecording(recording.filename)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {savedRecordings.length > 5 && (
                    <p className="text-neutral-400 text-xs text-center">
                      ... and {savedRecordings.length - 5} more recordings
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-5 flex justify-center">
          {/* Audio Format Selection */}
          <div className="flex items-center gap-2 my-2 p-2 bg-neutral-800 rounded border border-neutral-700">
            <label className="text-[0.85rem] text-neutral-300 m-0">Audio Format:</label>
            <select 
              value={audioFormat} 
              onChange={(e) => setAudioFormat(e.target.value)}
              disabled={isRecording || isAutoSending}
              className="px-2 py-1 border border-neutral-600 rounded text-[0.85rem] bg-neutral-900 text-neutral-100"
            >
              <option value="webm">WebM</option>
              <option value="wav">WAV</option>
              <option value="ogg">OGG</option>
            </select>
            {/* Manual record button hidden - auto recording is enabled */}
            {!isAutoSending && (
            <button 
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
              className={`px-4 py-2 bg-[#6c757d] text-white rounded ${isRecording ? 'bg-[#dc3545] opacity-70' : ''} cursor-pointer`}
                title="Manual fraud detection recording"
            >
              {isRecording ? '🔴 Recording' : '⭕ Record'}
            </button>
            )}
            {/* Auto recording runs continuously - no manual control needed */}
          </div>

          {/* Auto Audio Status */}
          {isAutoSending && (
            <div className="flex items-center gap-2 my-2 p-2 bg-blue-900/20 rounded border border-blue-700">
              <span className="text-[0.85rem] text-blue-300 m-0">
                🔄 Auto-recording & fraud detection active (every 15s)
              </span>
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              {nextAudioSendTime && (
                <span className="text-[0.75rem] text-blue-200 m-0">
                  Next: {Math.max(0, Math.ceil((nextAudioSendTime - new Date()) / 1000))}s
                </span>
              )}
            </div>
          )}

          {/* Auto Start Notice */}
          {callAccepted && !isAutoSending && (
            <div className="flex items-center gap-2 my-2 p-2 bg-green-900/20 rounded border border-green-700">
              <span className="text-[0.85rem] text-green-300 m-0">
                ✅ Auto-recording & fraud detection will start in 2 seconds
              </span>
            </div>
          )}

          {/* Audio Recording Controls */}
          {recordedAudioBlob && (
            <div className="flex items-center gap-2 my-2 p-2 bg-green-900/20 rounded border border-green-700">
              <span className="text-[0.85rem] text-green-300 m-0">
                📁 Recording saved ({Math.round(recordedAudioBlob.size / 1024)}KB)
              </span>
              <button 
                onClick={downloadRecordedAudio}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-[0.8rem] cursor-pointer"
                title="Download recorded audio"
              >
                📥 Download
              </button>
              <button 
                onClick={saveAudioToBackend}
                disabled={isSavingAudio}
                className={`px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[0.8rem] cursor-pointer ${isSavingAudio ? 'opacity-50' : ''}`}
                title="Save to backend permanently"
              >
                {isSavingAudio ? '💾 Saving...' : '💾 Save to Server'}
              </button>
            </div>
          )}

          {/* Saved Recordings Manager */}
          <div className="flex items-center gap-2 my-2 p-2 bg-purple-900/20 rounded border border-purple-700">
            <button 
              onClick={() => setShowStorageManager(!showStorageManager)}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[0.8rem] cursor-pointer"
              title="Manage saved recordings"
            >
              {showStorageManager ? '📁 Hide Storage' : '📁 Saved Recordings'} ({savedRecordings.length})
            </button>
            <button 
              onClick={loadSavedRecordings}
              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-[0.8rem] cursor-pointer"
              title="Refresh recordings list"
            >
              🔄 Refresh
            </button>
          </div>

          {!callAccepted && callData.type === 'outgoing' && (
            <div className="text-center text-neutral-200">
              <p className="m-0">Connecting...</p>
            </div>
          )}

          {callAccepted && (
            <div className="flex gap-4 justify-center items-center">
              <button 
                onClick={toggleVideo} 
                className={`px-4 py-2 bg-[#6c757d] text-white rounded ${!isVideoEnabled ? 'bg-[#dc3545] opacity-70' : ''} cursor-pointer`}
              >
                {isVideoEnabled ? '📹' : '📹̶'} Video
              </button>
              <button 
                onClick={toggleAudio} 
                className={`px-4 py-2 bg-[#6c757d] text-white rounded ${!isAudioEnabled ? 'bg-[#dc3545] opacity-70' : ''} cursor-pointer`}
              >
                {isAudioEnabled ? '🎤' : '🎤̶'} Audio
              </button>
              <button onClick={endCall} className="px-4 py-2 bg-[#dc3545] text-white rounded cursor-pointer">
                End Call
              </button>
            </div>
          )}

          {!callAccepted && callData.type === 'incoming' && (
            <div className="flex gap-4 justify-center items-center">
              <button onClick={endCall} className="px-4 py-2 bg-[#dc3545] text-white rounded cursor-pointer">
                End Call
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall;