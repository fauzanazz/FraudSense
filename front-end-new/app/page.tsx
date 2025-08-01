'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Phone, Activity } from "lucide-react";

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">FraudSense</h1>
            <p className="text-xl text-gray-600">Real-Time Fraud Detection for Chat & Calls</p>
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
                    <span className="text-gray-700">Voice calls with WebRTC</span>
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
                    <Button className="w-full h-12 text-lg">
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Chat Room
                    </Button>
                  </Link>
                  <Link href="/call" className="flex-1">
                    <Button variant="secondary" className="w-full h-12 text-lg">
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
                  <li>• Enter target username and click call</li>
                  <li>• Allow microphone access</li>
                </ul>
              </div>

            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
