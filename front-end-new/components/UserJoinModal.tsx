'use client';

import { useState, KeyboardEvent } from 'react';

interface UserJoinModalProps {
  onJoin: (username: string) => void;
}

export default function UserJoinModal({ onJoin }: UserJoinModalProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleJoin = () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username');
      return;
    }
    if (trimmedUsername.length < 2) {
      setError('Username must be at least 2 characters long');
      return;
    }
    if (trimmedUsername.length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }
    setError('');
    onJoin(trimmedUsername);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Chat Room</h2>
          <p className="text-gray-600 mb-6">Enter your username to start chatting</p>
          
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError('');
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter your username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>
            
            <button
              onClick={handleJoin}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
            >
              Join Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 