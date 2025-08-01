'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';

interface FraudDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fraudData: {
    message: string;
    username: string;
    confidence: number;
    timestamp: Date;
  } | null;
}

export default function FraudDialog({ isOpen, onClose, fraudData }: FraudDialogProps) {
  if (!fraudData) return null;

  const confidencePercentage = Math.round(fraudData.confidence * 100);
  const isHighConfidence = fraudData.confidence > 0.7;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className={`w-6 h-6 ${isHighConfidence ? 'text-red-500' : 'text-yellow-500'}`} />
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Fraud Detection Alert
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Confidence Level</span>
                <span className={`text-sm font-bold ${
                  isHighConfidence ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {confidencePercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isHighConfidence ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${confidencePercentage}%` }}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Suspicious Message</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 mb-1">
                  <span className="font-medium">From:</span> {fraudData.username}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Message:</span> "{fraudData.message}"
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Timestamp</h4>
              <p className="text-sm text-gray-600">
                {fraudData.timestamp.toLocaleString()}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Recommendation</h4>
              <p className="text-sm text-blue-700">
                {isHighConfidence 
                  ? "This message has been flagged as potentially fraudulent. Please review carefully before responding."
                  : "This message shows some suspicious patterns. Please exercise caution."
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                // Here you could add logic to report the user or take action
                console.log('Report user:', fraudData.username);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Report User
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
} 