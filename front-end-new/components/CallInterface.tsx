'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Users } from 'lucide-react';

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

interface CallInterfaceProps {
  callState: CallState;
  username: string;
  remoteUser: string;
  callType: 'audio' | 'video';
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  onInitiateCall: (targetUser: string, type: 'audio' | 'video') => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  isConnected: boolean;
  availableUsers: string[];
}

export default function CallInterface({
  callState,
  username,
  remoteUser,
  callType,
  localVideoRef,
  remoteVideoRef,
  onInitiateCall,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  isConnected,
  availableUsers
}: CallInterfaceProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedCallType, setSelectedCallType] = useState<'audio' | 'video'>(callType);
  const audioVisualizerRef = useRef<HTMLCanvasElement>(null);



  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFraudBadgeColor = (classification: 'Safe' | 'Fraud Detected') => {
    return classification === 'Safe' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getFraudIcon = (classification: 'Safe' | 'Fraud Detected') => {
    return classification === 'Safe' ? '✅' : '⚠️';
  };

  // Simple audio visualizer
  useEffect(() => {
    if (audioVisualizerRef.current && callState.isInCall) {
      const canvas = audioVisualizerRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const animate = () => {
        if (!callState.isInCall) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw simple waveform
        ctx.strokeStyle = callState.fraudResult?.classification === 'Fraud Detected' 
          ? '#ef4444' 
          : '#10b981';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let i = 0; i < canvas.width; i++) {
          const y = canvas.height / 2 + Math.sin(i * 0.1 + Date.now() * 0.01) * 20;
          if (i === 0) {
            ctx.moveTo(i, y);
          } else {
            ctx.lineTo(i, y);
          }
        }
        ctx.stroke();

        requestAnimationFrame(animate);
      };

      animate();
    }
  }, [callState.isInCall, callState.fraudResult]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Video Call</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-300">
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </span>
            </div>
            <div className="text-sm text-gray-300">
              Logged in as: <span className="font-semibold">{username}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Main Call Area */}
        <div className="flex-1 flex flex-col">
          {callState.isInCall ? (
            <>
              {/* Remote Video */}
              <div className="flex-1 relative bg-black">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                
                {/* Fraud Detection Alert */}
                {callState.fraudResult && (
                  <div className="absolute top-4 left-4 z-10">
                    <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border text-sm font-medium ${getFraudBadgeColor(callState.fraudResult.classification)}`}>
                      <span>{getFraudIcon(callState.fraudResult.classification)}</span>
                      <span>{callState.fraudResult.classification}</span>
                      <span className="font-bold">
                        {Math.round(callState.fraudResult.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Call Timer */}
                <div className="absolute top-4 right-4 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
                  {formatTime(callState.callDuration)}
                </div>

                {/* Audio Visualizer */}
                <div className="absolute bottom-4 left-4">
                  <canvas
                    ref={audioVisualizerRef}
                    width={200}
                    height={60}
                    className="bg-black bg-opacity-50 rounded-lg"
                  />
                </div>
              </div>

              {/* Local Video */}
              <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            /* Call Setup Interface */
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="text-center max-w-md">
                <div className="mb-8">
                  <Users size={64} className="mx-auto text-gray-400 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Start a Call</h2>
                  <p className="text-gray-400">Select a user and call type to begin</p>
                </div>

                {/* User Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Select User</label>
                  {availableUsers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-400 mb-2">No other users available</p>
                      <p className="text-sm text-gray-500">
                        Open another browser tab/window and join with a different username to test calls
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Choose a user...</option>
                      {availableUsers.map(user => (
                        <option key={user} value={user}>{user}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Call Type Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Call Type</label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setSelectedCallType('audio')}
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        selectedCallType === 'audio'
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Audio
                    </button>
                    <button
                      onClick={() => setSelectedCallType('video')}
                      className={`flex-1 px-4 py-2 rounded-lg border ${
                        selectedCallType === 'video'
                          ? 'bg-blue-600 border-blue-500'
                          : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </button>
                  </div>
                </div>

                {/* Start Call Button */}
                <button
                  onClick={() => selectedUser && onInitiateCall(selectedUser, selectedCallType)}
                  disabled={!selectedUser || !isConnected || availableUsers.length === 0}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed font-medium"
                >
                  <Phone className="w-5 h-5 mr-2 inline" />
                  {availableUsers.length === 0 ? 'No Users Available' : 'Start Call'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls */}
        {callState.isInCall && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className={`p-4 rounded-full ${
                callState.isMuted 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {callState.isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* Video Toggle Button */}
            {callType === 'video' && (
              <button
                onClick={onToggleVideo}
                className={`p-4 rounded-full ${
                  !callState.isVideoEnabled 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {callState.isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
            )}

            {/* End Call Button */}
            <button
              onClick={onEndCall}
              className="p-4 bg-red-600 hover:bg-red-700 rounded-full"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 