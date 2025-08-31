import React, { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis, Bar, BarChart, ResponsiveContainer, Tooltip } from 'recharts';

// Mock data - replace with actual API call
const generateMockData = (range) => {
  const is1h = range === "1h";
  const dataPoints = is1h ? 60 : 24 * 60; // 60 minutes or 24 hours * 60 minutes
  const interval = is1h ? 1 : 60; // 1 minute or 1 hour intervals
  
  const requestsByMinute = [];
  const latencyP95ByMinute = [];
  
  for (let i = 0; i < dataPoints; i += interval) {
    const timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() - (dataPoints - i));
    
    requestsByMinute.push({
      ts: timestamp.toISOString(),
      requests: Math.floor(Math.random() * 100) + 50
    });
    
    latencyP95ByMinute.push({
      ts: timestamp.toISOString(),
      latency: Math.floor(Math.random() * 200) + 100
    });
  }
  
  return {
    requestsByMinute,
    latencyP95ByMinute,
    topEndpoints: [
      { endpoint: "/api/fraud/detect", count: 15420 },
      { endpoint: "/api/audio/process", count: 12340 },
      { endpoint: "/api/users", count: 8900 },
      { endpoint: "/api/conversations", count: 6700 },
      { endpoint: "/api/analytics", count: 4500 }
    ],
    errorRate: 0.023
  };
};

// UI Components (reusing from other pages)
const Button = ({ children, variant = "primary", size = "md", className = "", onClick, disabled = false }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    outline: "border border-white/20 bg-transparent hover:bg-white/10 text-white focus:ring-white/20",
    ghost: "bg-transparent hover:bg-white/10 text-white",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    secondary: "bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/30"
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

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

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-white">
        <p className="font-bold">{new Date(label).toLocaleString()}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Main MonitoringPage Component
export default function MonitoringPage() {
  const [metrics, setMetrics] = useState(null);
  const [range, setRange] = useState("1h");
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      const data = generateMockData(range);
      setMetrics(data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [range]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [live, range]);

  if (loading && !metrics) {
    return (
      <div className="bg-black h-screen w-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black h-screen w-screen relative font-['Plus_Jakarta_Sans']">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">System Monitoring</h1>
          <p className="text-white/70">Real-time system performance and analytics</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Monitoring</h2>
          <div className="flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="1h">Last 1h</option>
              <option value="24h">Last 24h</option>
            </select>
            <Button 
              variant={live ? "secondary" : "outline"} 
              onClick={() => setLive((v) => !v)}
            >
              {live ? "Live: On" : "Live: Off"}
            </Button>
          </div>
        </div>

        {!metrics ? (
          <div className="text-white/60 text-center">No data available</div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Requests / minute</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={metrics.requestsByMinute} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="ts" 
                        tick={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        hide 
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="requests"
                        stroke="#667eea"
                        fill="#667eea"
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">P95 Latency (ms)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={metrics.latencyP95ByMinute} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis 
                        dataKey="ts" 
                        tick={false} 
                        axisLine={false} 
                      />
                      <YAxis 
                        hide 
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        dataKey="latency" 
                        stroke="#764ba2" 
                        strokeWidth={2} 
                        dot={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Top Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={metrics.topEndpoints} layout="vertical" margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                      <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.1)" />
                      <YAxis 
                        dataKey="endpoint" 
                        type="category" 
                        width={120} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }}
                      />
                      <XAxis 
                        type="number" 
                        hide 
                        tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="count" 
                        fill="#f39c12" 
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold text-white">
                    {(metrics.errorRate * 100).toFixed(2)}%
                  </div>
                  <div className="text-white/60 text-sm mt-2">
                    Rolling window over selected range
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${metrics.errorRate * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-white/60 mt-1">
                      <span>0%</span>
                      <span>5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Background effect similar to other pages */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
