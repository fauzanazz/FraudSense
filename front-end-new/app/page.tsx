'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Wifi, WifiOff, MessageCircle, Phone, Users, Activity } from "lucide-react";

interface ServerStatus {
  status: 'connected' | 'error';
  server?: {
    connectedUsers: number;
    chatRooms: number;
    callRooms: number;
  };
  message?: string;
}

export default function Home() {
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        setServerStatus(data);
      } catch (error) {
        setServerStatus({
          status: 'error',
          message: 'Failed to check server status'
        });
      } finally {
        setLoading(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">FraudSense</h1>
            <p className="text-xl text-gray-600">Real-Time Fraud Detection for Chat & Calls</p>
          </div>

          {/* Server Status */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              ) : serverStatus?.status === 'connected' ? (
                <Wifi className="h-6 w-6 text-green-500" />
              ) : (
                <WifiOff className="h-6 w-6 text-red-500" />
              )}
              <span className={`font-semibold ${
                serverStatus?.status === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {loading ? 'Checking...' : serverStatus?.status === 'connected' ? 'Server Connected' : 'Server Disconnected'}
              </span>
            </div>

            {serverStatus?.server && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{serverStatus.server.connectedUsers}</div>
                  <div className="text-sm text-blue-600">Connected Users</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">{serverStatus.server.chatRooms}</div>
                  <div className="text-sm text-green-600">Chat Rooms</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <Phone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{serverStatus.server.callRooms}</div>
                  <div className="text-sm text-purple-600">Call Rooms</div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Features</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-gray-700">Real-time chat with fraud detection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-green-600" />
                  <span className="text-gray-700">Audio/video calls with live monitoring</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Activity className="h-5 w-5 text-red-600" />
                  <span className="text-gray-700">Instant fraud alerts and classification</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900">Quick Start</h2>
              <div className="space-y-3">
                <p className="text-gray-600">Choose your preferred communication method:</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/chat" className="flex-1">
                    <Button className="w-full h-12 text-lg" disabled={serverStatus?.status !== 'connected'}>
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Chat Room
                    </Button>
                  </Link>
                  <Link href="/call" className="flex-1">
                    <Button variant="secondary" className="w-full h-12 text-lg" disabled={serverStatus?.status !== 'connected'}>
                      <Phone className="h-5 w-5 mr-2" />
                      Voice Call
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Testing Instructions */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-blue-900 mb-4">🧪 Testing Instructions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Chat Testing:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Open multiple browser tabs/windows</li>
                  <li>• Join with different usernames</li>
                  <li>• Try suspicious keywords: "password", "credit card", "ssn"</li>
                  <li>• Check real-time fraud detection results</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Call Testing:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Open another browser window/tab</li>
                  <li>• Join with different username</li>
                  <li>• Initiate audio or video call</li>
                  <li>• Speak during calls to test audio detection</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Server Info */}
          {serverStatus?.status === 'error' && (
            <div className="mt-6 bg-red-50 p-4 rounded-lg">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ Server Connection Issue</h4>
              <p className="text-sm text-red-700 mb-2">{serverStatus.message}</p>
              <p className="text-sm text-red-600">
                Make sure to run: <code className="bg-red-100 px-2 py-1 rounded">npm run dev:full</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
