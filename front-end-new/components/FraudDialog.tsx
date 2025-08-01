'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FraudDialogProps {
  isOpen: boolean;
  onClose: () => void;
  fraudData: {
    message: string;
    username: string;
    confidence: number;
    timestamp: Date | string;
  } | null;
}

export default function FraudDialog({ isOpen, onClose, fraudData }: FraudDialogProps) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (isOpen && fraudData) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Use setTimeout to avoid setState during render
            setTimeout(() => {
              onClose();
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, fraudData, onClose]);

  if (!fraudData) return null;

  const confidencePercentage = Math.round(fraudData.confidence * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-red-200 bg-red-50">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <DialogTitle className="text-red-800">⚠️ Fraud Detected!</DialogTitle>
          </div>
          <DialogDescription className="text-red-700">
            Our AI has detected suspicious activity in this conversation.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Fraud Details */}
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">From:</span>
                <span className="text-sm font-semibold text-gray-900">{fraudData.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Confidence:</span>
                <span className="text-sm font-bold text-red-600">{confidencePercentage}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Time:</span>
                <span className="text-sm text-gray-600">
                  {new Date(fraudData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Message Content */}
          <div className="bg-white p-4 rounded-lg border border-red-200">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Suspicious Message:</h4>
            <p className="text-sm text-gray-900 italic">"{fraudData.message}"</p>
          </div>

          {/* Warning */}
          <div className="bg-red-100 p-4 rounded-lg border border-red-300">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">⚠️ Warning</p>
                <p>This message contains patterns commonly associated with fraud. Please be cautious and verify any requests for personal information, financial details, or urgent actions.</p>
              </div>
            </div>
          </div>

          {/* Countdown */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Dialog will close automatically in <span className="font-bold text-red-600">{countdown}</span> seconds
            </p>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 