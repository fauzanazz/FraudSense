import React, { useState, useEffect, useMemo } from 'react';

// Mock data - replace with actual API call
const mockApiKeys = [
  {
    id: "1",
    key: "fraud_sk_live_abc123def456ghi789",
    userId: "1",
    label: "Production Key",
    scopes: ["read", "write"],
    active: true,
    createdAt: "2024-01-15T10:30:00Z",
    lastUsedAt: "2024-01-25T14:20:00Z",
    rateLimitPerMin: 60,
    requests: 15420
  },
  {
    id: "2",
    key: "fraud_sk_test_xyz789uvw456rst123",
    userId: "2",
    label: "Development Key",
    scopes: ["read"],
    active: true,
    createdAt: "2024-01-20T14:45:00Z",
    lastUsedAt: null,
    rateLimitPerMin: 30,
    requests: 2340
  },
  {
    id: "3",
    key: "fraud_sk_revoked_def456ghi789jkl012",
    userId: "3",
    label: "Old Production Key",
    scopes: ["read", "write", "admin"],
    active: false,
    createdAt: "2024-01-10T09:15:00Z",
    lastUsedAt: "2024-01-22T16:30:00Z",
    rateLimitPerMin: 100,
    requests: 45670
  }
];

const mockUsers = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
  { id: "3", name: "Bob Wilson" }
];

// UI Components (reusing from UserPage)
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

const Input = ({ id, type = "text", value, onChange, placeholder, className = "" }) => (
  <input
    id={id}
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
  />
);

const Label = ({ htmlFor, children, className = "" }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-white/80 mb-2 ${className}`}>
    {children}
  </label>
);

const Badge = ({ children, variant = "outline", className = "" }) => {
  const variants = {
    outline: "border border-white/20 bg-transparent text-white/80",
    secondary: "bg-blue-600/20 border border-blue-500/30 text-blue-300",
    destructive: "bg-red-600/20 border border-red-500/30 text-red-300"
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

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

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className = "" }) => (
  <div className={className}>
    {children}
  </div>
);

const DialogHeader = ({ children, className = "" }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
);

const DialogTitle = ({ children, className = "" }) => (
  <h2 className={`text-xl font-bold text-white ${className}`}>
    {children}
  </h2>
);

const DialogFooter = ({ children, className = "" }) => (
  <div className={`flex justify-end gap-3 mt-6 ${className}`}>
    {children}
  </div>
);

const DialogTrigger = ({ children, onClick }) => (
  <div onClick={onClick}>
    {children}
  </div>
);

// Icons
const Plus = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const Copy = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const RotateCcw = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
  </svg>
);

const Shield = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const Trash2 = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// Toast hook
const useToast = () => {
  const toast = ({ title }) => {
    alert(title);
  };
  return { toast };
};

// Create API Key Dialog Component
function CreateKeyDialog({ users, onCreated }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [userId, setUserId] = useState(users[0]?.id || "");
  const [scopes, setScopes] = useState("read,write");
  const [rateLimit, setRateLimit] = useState(60);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2" />
        New API Key
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="label">Label</Label>
              <Input 
                id="label" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
                placeholder="Production key" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user">User</Label>
              <select
                id="user"
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="scopes">Scopes (comma separated)</Label>
              <Input 
                id="scopes" 
                value={scopes} 
                onChange={(e) => setScopes(e.target.value)} 
                placeholder="read,write" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rl">Rate Limit per minute</Label>
              <Input
                id="rl"
                type="number"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number.parseInt(e.target.value || "0"))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Mock API call
                console.log("Creating API key:", {
                  label,
                  userId,
                  scopes: scopes.split(",").map((s) => s.trim()).filter(Boolean),
                  rateLimitPerMin: rateLimit,
                });
                setOpen(false);
                setLabel("");
                await onCreated();
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Main APIKeysPage Component
export default function APIKeysPage() {
  const [keys, setKeys] = useState([]);
  const [users, setUsers] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    // Mock API calls - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 500));
    setKeys(mockApiKeys);
    setUsers(mockUsers);
  };

  useEffect(() => {
    load();
  }, []);

  const userMap = useMemo(() => 
    Object.fromEntries(users.map((u) => [u.id, u.name])), 
    [users]
  );

  return (
    <div className="bg-black h-screen w-screen relative font-['Plus_Jakarta_Sans']">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">API Keys Management</h1>
          <p className="text-white/70">Manage API keys and their permissions</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">API Keys</h2>
          <CreateKeyDialog
            users={users}
            onCreated={async () => {
              await load();
              toast({ title: "Key created" });
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">API Key Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Requests</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-32" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.label}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center">
                          <span className="truncate max-w-[200px]">{key.key}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1 h-7 w-7 p-0"
                            onClick={async () => {
                              await navigator.clipboard.writeText(key.key);
                              toast({ title: "Key copied to clipboard" });
                            }}
                            aria-label="Copy key"
                          >
                            <Copy />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{userMap[key.userId] || "—"}</TableCell>
                      <TableCell className="space-x-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline">
                            {scope}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>{key.rateLimitPerMin}/min</TableCell>
                      <TableCell>{key.requests.toLocaleString()}</TableCell>
                      <TableCell className="text-white/60">
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Mock API call
                            console.log("Rotating key:", key.id);
                            await load();
                            toast({ title: "Key rotated" });
                          }}
                        >
                          <RotateCcw className="mr-2" /> Rotate
                        </Button>
                        <Button
                          variant={key.active ? "outline" : "secondary"}
                          size="sm"
                          onClick={async () => {
                            // Mock API call
                            console.log(`${key.active ? "Revoking" : "Activating"} key:`, key.id);
                            await load();
                            toast({ title: key.active ? "Key revoked" : "Key activated" });
                          }}
                        >
                          <Shield className="mr-2" /> {key.active ? "Revoke" : "Activate"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400"
                          onClick={async () => {
                            if (!confirm("Delete this key?")) return;
                            // Mock API call
                            console.log("Deleting key:", key.id);
                            await load();
                            toast({ title: "Key deleted" });
                          }}
                        >
                          <Trash2 className="mr-2" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!keys.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-white/60">
                        No API keys yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
