import React, { useState, useEffect } from 'react';

// Mock data - replace with actual API call
const mockBillingOverview = {
  plan: "Pro",
  tokensThisMonth: 1542000,
  estimatedCents: 12500,
  nextInvoiceDate: "2024-02-01T00:00:00Z"
};

const mockInvoices = [
  {
    id: "1",
    periodStart: "2024-01-01T00:00:00Z",
    periodEnd: "2024-01-31T23:59:59Z",
    amountCents: 12500,
    status: "paid"
  },
  {
    id: "2",
    periodStart: "2023-12-01T00:00:00Z",
    periodEnd: "2023-12-31T23:59:59Z",
    amountCents: 11800,
    status: "paid"
  },
  {
    id: "3",
    periodStart: "2023-11-01T00:00:00Z",
    periodEnd: "2023-11-30T23:59:59Z",
    amountCents: 11200,
    status: "paid"
  },
  {
    id: "4",
    periodStart: "2024-02-01T00:00:00Z",
    periodEnd: "2024-02-29T23:59:59Z",
    amountCents: 0,
    status: "pending"
  }
];

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

const Table = ({ children, className = "" }) => (
  <table className={`w-full ${className}`}>
    {children}
  </table>
);

const TableHeader = ({ children }) => (
  <thead className="border-b border-white/10">
    {children}
  </thead>
);

const TableBody = ({ children }) => (
  <tbody>
    {children}
  </tbody>
);

const TableRow = ({ children, className = "" }) => (
  <tr className={`border-b border-white/5 hover:bg-white/5 transition-colors ${className}`}>
    {children}
  </tr>
);

const TableHead = ({ children, className = "" }) => (
  <th className={`text-left py-3 px-4 text-sm font-medium text-white/60 ${className}`}>
    {children}
  </th>
);

const TableCell = ({ children, className = "" }) => (
  <td className={`py-3 px-4 text-sm text-white/80 ${className}`}>
    {children}
  </td>
);

const Badge = ({ children, variant = "outline", className = "" }) => {
  const variants = {
    outline: "border border-white/20 bg-transparent text-white/80",
    secondary: "bg-blue-600/20 border border-blue-500/30 text-blue-300",
    success: "bg-green-600/20 border border-green-500/30 text-green-300",
    warning: "bg-yellow-600/20 border border-yellow-500/30 text-yellow-300"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Icons
const CreditCard = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const Eye = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// Main BillingPage Component
export default function BillingPage() {
  const [overview, setOverview] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Mock API calls - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setOverview(mockBillingOverview);
      setInvoices(mockInvoices);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success">Paid</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="bg-black h-screen w-screen flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading billing information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black h-screen w-screen relative font-['Plus_Jakarta_Sans']">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Billing & Usage</h1>
          <p className="text-white/70">Manage your subscription and view billing history</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Billing</h2>
          <Button variant="outline">
            <CreditCard className="mr-2" />
            Add Payment Method
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {overview?.plan}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Usage (MTD)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {overview?.tokensThisMonth.toLocaleString()} tokens
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              ${(overview?.estimatedCents / 100).toFixed(2)}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Next Invoice</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-white">
              {overview?.nextInvoiceDate ? new Date(overview.nextInvoiceDate).toLocaleDateString() : '—'}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        {new Date(invoice.periodStart).toLocaleDateString()} – {new Date(invoice.periodEnd).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(invoice.amountCents / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!invoices.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-white/60">
                        No invoices
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Additional billing information */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Current Plan Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Plan Name:</span>
                  <span className="text-white font-medium">{overview?.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Monthly Tokens:</span>
                  <span className="text-white font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">API Calls:</span>
                  <span className="text-white font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Support:</span>
                  <span className="text-white font-medium">Priority</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Usage Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/60">Tokens Used (MTD):</span>
                  <span className="text-white font-medium">{overview?.tokensThisMonth.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">API Calls (MTD):</span>
                  <span className="text-white font-medium">15,420</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Storage Used:</span>
                  <span className="text-white font-medium">2.4 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Estimated Cost:</span>
                  <span className="text-white font-medium">${(overview?.estimatedCents / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Background effect similar to other pages */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
