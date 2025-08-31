import React from 'react';

// UI Components (reusing from other pages)
const Card = ({ children, className = "" }) => (
  <div className={`bg-black/16 backdrop-blur-lg border border-white/20 rounded-[12px] p-6 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ children, className = "" }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-white font-bold text-lg ${className}`}>
    {children}
  </h3>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>
    {children}
  </div>
);

// Code block component with syntax highlighting
const CodeBlock = ({ children, language = "bash", className = "" }) => (
  <pre className={`rounded-lg bg-black/40 border border-white/10 p-4 text-xs overflow-auto font-mono ${className}`}>
    <code className="text-green-300">{children}</code>
  </pre>
);

// Main DocsPage Component
export default function DocsPage() {
  return (
    <div className="bg-black h-screen w-screen relative font-['Plus_Jakarta_Sans']">
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Developer API</h1>
          <p className="text-white/70">Integrate FraudSense into your applications</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">
              Authenticate requests using the x-api-key header. Replace YOUR_API_KEY with a key from the API Keys page.
            </p>
            <CodeBlock language="bash">
{`curl -X POST https://api.fraudsense.com/api/v1/fraud/detect \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"audio_url":"https://example.com/audio.mp3"}'`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Fraud Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">Endpoint: POST /api/v1/fraud/detect</p>
            <CodeBlock language="javascript">
{`// JavaScript
const res = await fetch("https://api.fraudsense.com/api/v1/fraud/detect", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json", 
    "x-api-key": "YOUR_API_KEY" 
  },
  body: JSON.stringify({ 
    audio_url: "https://example.com/audio.mp3",
    threshold: 0.8
  })
})
const data = await res.json()
console.log(data)`}
            </CodeBlock>
            <CodeBlock language="python">
{`# Python
import requests

r = requests.post("https://api.fraudsense.com/api/v1/fraud/detect",
  headers={"x-api-key": "YOUR_API_KEY"},
  json={
    "audio_url": "https://example.com/audio.mp3",
    "threshold": 0.8
  })
print(r.json())`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Audio Processing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">Endpoint: POST /api/v1/audio/process</p>
            <CodeBlock language="bash">
{`curl -X POST https://api.fraudsense.com/api/v1/audio/process \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"audio_file":"base64_encoded_audio"}'`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Response Format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">Example response from fraud detection API:</p>
            <CodeBlock language="json">
{`{
  "success": true,
  "fraud_score": 0.85,
  "risk_level": "high",
  "confidence": 0.92,
  "analysis": {
    "voice_patterns": "suspicious",
    "background_noise": "normal",
    "speech_rate": "abnormal",
    "emotion_detection": "anxiety"
  },
  "recommendations": [
    "Verify caller identity",
    "Request additional documentation",
    "Escalate to supervisor"
  ],
  "timestamp": "2024-01-25T14:30:00Z"
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Error Handling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">Common error responses:</p>
            <CodeBlock language="json">
{`// 401 Unauthorized
{
  "error": "Invalid API key",
  "code": "AUTH_ERROR"
}

// 400 Bad Request
{
  "error": "Invalid audio format",
  "code": "INVALID_INPUT"
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT"
}`}
            </CodeBlock>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-white font-medium mb-2">Free Plan</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• 100 requests/day</li>
                  <li>• 10MB audio files</li>
                  <li>• Basic fraud detection</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Pro Plan</h4>
                <ul className="text-sm text-white/70 space-y-1">
                  <li>• 10,000 requests/day</li>
                  <li>• 50MB audio files</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">SDK Libraries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <h4 className="text-white font-medium mb-2">JavaScript</h4>
                <CodeBlock language="bash" className="text-xs">
{`npm install fraudsense-js`}
                </CodeBlock>
              </div>
              <div className="text-center">
                <h4 className="text-white font-medium mb-2">Python</h4>
                <CodeBlock language="bash" className="text-xs">
{`pip install fraudsense`}
                </CodeBlock>
              </div>
              <div className="text-center">
                <h4 className="text-white font-medium mb-2">Go</h4>
                <CodeBlock language="bash" className="text-xs">
{`go get github.com/fraudsense/go`}
                </CodeBlock>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/70">
              Configure webhooks to receive real-time fraud detection alerts:
            </p>
            <CodeBlock language="json">
{`{
  "url": "https://your-domain.com/webhooks/fraud",
  "events": ["fraud.detected", "fraud.analyzed"],
  "secret": "your_webhook_secret"
}`}
            </CodeBlock>
          </CardContent>
        </Card>
      </div>

      {/* Background effect similar to other pages */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
