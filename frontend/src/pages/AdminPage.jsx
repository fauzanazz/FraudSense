import { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart, ResponsiveContainer, Tooltip } from 'recharts';

// Mock data function - replace with actual API call
const getOverviewMetrics = async () => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    totalRequests24h: 15420,
    avgLatencyMs: 245,
    errorRate: 0.023,
    estimatedSpendCents: 12500,
    requestsByHour: [
      { hour: '00:00', requests: 120 },
      { hour: '01:00', requests: 95 },
      { hour: '02:00', requests: 78 },
      { hour: '03:00', requests: 65 },
      { hour: '04:00', requests: 45 },
      { hour: '05:00', requests: 55 },
      { hour: '06:00', requests: 89 },
      { hour: '07:00', requests: 156 },
      { hour: '08:00', requests: 234 },
      { hour: '09:00', requests: 345 },
      { hour: '10:00', requests: 456 },
      { hour: '11:00', requests: 567 },
      { hour: '12:00', requests: 678 },
      { hour: '13:00', requests: 789 },
      { hour: '14:00', requests: 890 },
      { hour: '15:00', requests: 987 },
      { hour: '16:00', requests: 876 },
      { hour: '17:00', requests: 765 },
      { hour: '18:00', requests: 654 },
      { hour: '19:00', requests: 543 },
      { hour: '20:00', requests: 432 },
      { hour: '21:00', requests: 321 },
      { hour: '22:00', requests: 210 },
      { hour: '23:00', requests: 145 }
    ],
    latencyP95ByHour: [
      { hour: '00:00', latency: 180 },
      { hour: '01:00', latency: 165 },
      { hour: '02:00', latency: 155 },
      { hour: '03:00', latency: 145 },
      { hour: '04:00', latency: 140 },
      { hour: '05:00', latency: 150 },
      { hour: '06:00', latency: 170 },
      { hour: '07:00', latency: 200 },
      { hour: '08:00', latency: 250 },
      { hour: '09:00', latency: 280 },
      { hour: '10:00', latency: 300 },
      { hour: '11:00', latency: 320 },
      { hour: '12:00', latency: 340 },
      { hour: '13:00', latency: 360 },
      { hour: '14:00', latency: 380 },
      { hour: '15:00', latency: 400 },
      { hour: '16:00', latency: 380 },
      { hour: '17:00', latency: 360 },
      { hour: '18:00', latency: 340 },
      { hour: '19:00', latency: 320 },
      { hour: '20:00', latency: 300 },
      { hour: '21:00', latency: 280 },
      { hour: '22:00', latency: 260 },
      { hour: '23:00', latency: 220 }
    ]
  };
};

// Card Component
const Card = ({ children, className = '' }) => (
  <div className={`bg-black/16 backdrop-blur-lg border border-white/20 rounded-[12px] p-6 ${className}`}>
    {children}
  </div>
);

// Card Header Component
const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

// Card Title Component
const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-white font-bold text-lg ${className}`}>
    {children}
  </h3>
);

// Card Content Component
const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
);

export default function AdminPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getOverviewMetrics();
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="bg-black h-screen w-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-black h-screen w-screen flex items-center justify-center text-white">
        <div className="text-center">
          <p>Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  const reqData = metrics.requestsByHour;
  const latencyData = metrics.latencyP95ByHour;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg p-3 text-white">
          <p className="font-bold">{label}</p>
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

  return (
    <div className="w-full min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">FraudSense Dashboard</h1>
          <p className="text-white/70">Real-time analytics and monitoring</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Requests (24h)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {metrics.totalRequests24h.toLocaleString()}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {Math.round(metrics.avgLatencyMs)} ms
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {(metrics.errorRate * 100).toFixed(2)}%
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Est. Spend (MTD)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              ${(metrics.estimatedSpendCents / 100).toFixed(2)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Requests by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={reqData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="hour" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
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
                <BarChart data={latencyData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="hour" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis 
                    hide 
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="latency" 
                    fill="#764ba2" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
