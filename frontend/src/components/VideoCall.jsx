import { useState, useRef, useEffect } from 'react';

const VideoCall = ({ socket, callData, user, onEndCall }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerConnectionRef = useRef(null);
  const localAudioContextRef = useRef(null);
  const remoteAudioContextRef = useRef(null);
  const localAnalyserRef = useRef(null);
  const remoteAnalyserRef = useRef(null);

  useEffect(() => {
    initializeCall();
    
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
    
    return () => {
      console.log('🔌 Cleaning up socket listeners');
      socket.off('call-answer', handleCallAnswer);
      socket.off('call-ended', handleCallEnded);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, []);

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

      // Create RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      // Add connection state logging
      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE connection state:', pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log('🔍 ICE gathering state:', pc.iceGatheringState);
      };

      // Add local stream to peer connection
      console.log('📤 Adding local tracks to peer connection...');
      stream.getTracks().forEach((track, index) => {
        console.log(`Adding track ${index}:`, track.kind, track.enabled);
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('📥 Received remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        console.log('🎬 Remote stream tracks:', remoteStream.getTracks().length);
        setRemoteStream(remoteStream);
        
        // Set up audio level monitoring for remote stream
        setupAudioLevelMonitoring(remoteStream, 'remote');
        setCallAccepted(true);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          socket.emit('ice-candidate', {
            to: callData.type === 'outgoing' ? callData.targetUserId : callData.fromUserId,
            candidate: event.candidate
          });
        } else {
          console.log('🧊 ICE gathering complete');
        }
      };

      peerConnectionRef.current = pc;

      // If this is an outgoing call, create offer
      if (callData.type === 'outgoing') {
        console.log('📞 Creating offer for outgoing call...');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(offer);
        console.log('📤 Sending offer');
        
        socket.emit('call-offer', {
          to: callData.targetUserId,
          from: user.username,
          fromUserId: user._id,
          offer: offer
        });
      }

      // If this is an incoming call, handle the offer
      if (callData.type === 'incoming' && callData.offer) {
        console.log('📞 Handling incoming call offer...');
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
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
    console.log('📥 Received ICE candidate');
    if (peerConnectionRef.current && data.candidate) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('✅ ICE candidate added successfully');
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    } else {
      console.warn('⚠️ No peer connection or candidate data', {
        hasPeerConnection: !!peerConnectionRef.current,
        hasCandidate: !!data.candidate
      });
    }
  };

  const handleCallEnded = () => {
    cleanup();
    onEndCall();
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

  const cleanup = () => {
    console.log('🧹 Cleaning up call resources');
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Clean up audio contexts
    if (localAudioContextRef.current) {
      localAudioContextRef.current.close();
    }
    if (remoteAudioContextRef.current) {
      remoteAudioContextRef.current.close();
    }
    
    setLocalStream(null);
    setRemoteStream(null);
    peerConnectionRef.current = null;
    localAudioContextRef.current = null;
    remoteAudioContextRef.current = null;
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;
    setCallAccepted(false);
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
  };

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        <div className="video-call-header">
          <h3>
            {callData.type === 'outgoing' ? 'Calling...' : `Call from ${callData.from}`}
          </h3>
          <button onClick={endCall} className="close-btn">×</button>
        </div>
        
        <div className="video-container">
          <div className="video-grid">
            {localStream && (
              <div className="video-wrapper">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="my-video"
                  onLoadedMetadata={() => console.log('📺 Local video metadata loaded')}
                  onCanPlay={() => console.log('📺 Local video can play')}
                />
                <span className="video-label">
                  You
                  <div className="audio-level">
                    🎤 {localAudioLevel}%
                    <div className="level-bar">
                      <div 
                        className="level-fill" 
                        style={{width: `${Math.min(localAudioLevel, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </span>
              </div>
            )}
            
            {callAccepted && remoteStream && (
              <div className="video-wrapper">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="user-video"
                  onLoadedMetadata={() => console.log('📺 Remote video metadata loaded')}
                  onCanPlay={() => console.log('📺 Remote video can play')}
                />
                <span className="video-label">
                  {callData.type === 'outgoing' ? 'Remote User' : callData.from}
                  <div className="audio-level">
                    🔊 {remoteAudioLevel}%
                    <div className="level-bar">
                      <div 
                        className="level-fill" 
                        style={{width: `${Math.min(remoteAudioLevel, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </span>
              </div>
            )}
          </div>
          
          {/* Debug info */}
          <div className="debug-info">
            <p>Local stream tracks: {localStream?.getTracks().length || 0}</p>
            <p>Remote stream tracks: {remoteStream?.getTracks().length || 0}</p>
            <p>Video enabled: {isVideoEnabled ? '✅' : '❌'}</p>
            <p>Audio enabled: {isAudioEnabled ? '✅' : '❌'}</p>
          </div>
        </div>

        <div className="call-controls">
          {!callAccepted && callData.type === 'outgoing' && (
            <div className="connecting">
              <p>Connecting...</p>
            </div>
          )}

          {callAccepted && (
            <div className="call-actions">
              <button 
                onClick={toggleVideo} 
                className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
              >
                {isVideoEnabled ? '📹' : '📹̶'} Video
              </button>
              <button 
                onClick={toggleAudio} 
                className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
              >
                {isAudioEnabled ? '🎤' : '🎤̶'} Audio
              </button>
              <button onClick={endCall} className="call-btn end-call">
                End Call
              </button>
            </div>
          )}

          {!callAccepted && callData.type === 'incoming' && (
            <div className="call-actions">
              <button onClick={endCall} className="call-btn end-call">
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