import React, { useState, useEffect } from 'react';

// Mock data - replace with actual API call
const mockUsers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "admin",
    active: true,
    createdAt: "2024-01-15T10:30:00Z"
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "member",
    active: true,
    createdAt: "2024-01-20T14:45:00Z"
  },
  {
    id: "3",
    name: "Bob Wilson",
    email: "bob@example.com",
    role: "owner",
    active: false,
    createdAt: "2024-01-10T09:15:00Z"
  }
];

// UI Components
const Button = ({ children, variant = "primary", size = "md", className = "", onClick, disabled = false }) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    outline: "border border-white/20 bg-transparent hover:bg-white/10 text-white focus:ring-white/20",
    ghost: "bg-transparent hover:bg-white/10 text-white",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
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

const DropdownMenu = ({ children }) => (
  <div className="relative">
    {children}
  </div>
);

const DropdownMenuTrigger = ({ children, onClick }) => (
  <div onClick={onClick}>
    {children}
  </div>
);

const DropdownMenuContent = ({ children, className = "" }) => (
  <div className={`absolute right-0 top-full mt-1 bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg py-1 min-w-[160px] z-10 ${className}`}>
    {children}
  </div>
);

const DropdownMenuItem = ({ children, onClick, className = "" }) => (
  <div 
    onClick={onClick}
    className={`px-3 py-2 text-sm text-white/80 hover:bg-white/10 cursor-pointer transition-colors ${className}`}
  >
    {children}
  </div>
);

// Icons
const Plus = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const MoreHorizontal = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

const Trash2 = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const Pencil = ({ className = "" }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

// Toast hook
const useToast = () => {
  const toast = ({ title }) => {
    // Simple alert for now - can be replaced with proper toast library
    alert(title);
  };
  return { toast };
};

// Create User Dialog Component
function CreateUserDialog({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2" />
        New User
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Jane Doe" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Mock API call
                console.log("Creating user:", { name, email, role });
                setOpen(false);
                setName("");
                setEmail("");
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

// Edit User Dialog Component
function EditUserDialog({ user, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [active, setActive] = useState(user.active);

  return (
    <>
      <DropdownMenuItem
        onClick={() => setOpen(true)}
        className="cursor-pointer"
      >
        <Pencil className="mr-2" />
        Edit
      </DropdownMenuItem>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="name-e">Name</Label>
              <Input id="name-e" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-e">Email</Label>
              <Input id="email-e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-e">Role</Label>
              <select
                id="role-e"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status-e">Status</Label>
              <select
                id="status-e"
                value={active ? "active" : "disabled"}
                onChange={(e) => setActive(e.target.value === "active")}
                className="w-full px-3 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Mock API call
                console.log("Updating user:", { name, email, role, active });
                setOpen(false);
                await onUpdated();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Main UserPage Component
export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    // Mock API call - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 500));
    setUsers(mockUsers);
  };

  useEffect(() => {
    setLoading(true);
    fetchUsers().finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full min-h-screen p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
          <p className="text-white/70">Manage users and their permissions</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Users</h2>
          <CreateUserDialog
            onCreated={async () => {
              await fetchUsers();
              toast({ title: "User created" });
            }}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="text-white/60">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "secondary" : "outline"}>
                          {user.active ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/60">
                        {new Date(user.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <EditUserDialog
                              user={user}
                              onUpdated={async () => {
                                await fetchUsers();
                                toast({ title: "User updated" });
                              }}
                            />
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={async () => {
                                if (!confirm("Delete this user?")) return;
                                // Mock API call
                                console.log("Deleting user:", user.id);
                                await fetchUsers();
                                toast({ title: "User deleted" });
                              }}
                            >
                              <Trash2 className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!users.length && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-white/60">
                        No users yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
