import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Prism from './Prism.jsx';

function Login({ onLogin, users }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUser) {
      const user = users.find(u => u._id === selectedUser);
      onLogin(user.username);
    } else if (newUsername.trim()) {
      onLogin(newUsername.trim());
    }
  };

  return (
    <div className="bg-black h-screen w-screen relative flex items-center justify-center font-['Plus_Jakarta_Sans']">
      {/* <div className="login-form">
        <h2>Chat & Call App</h2>
        <form onSubmit={handleSubmit}>
          {users.length > 0 && (
            <div className="form-group">
              <label>Select existing user:</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="">-- Select User --</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label>Or create new user:</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username"
              disabled={!!selectedUser}
            />
          </div>
          
          <button type="submit" disabled={!selectedUser && !newUsername.trim()}>
            Login
          </button>
        </form>
      </div> */}

      <div className='w-full h-full flex flex-col gap-y-4 items-center justify-center text-white text-center z-20'>
        <h3 className='max-w-5xl px-4 text-3xl font-bold text-shadow-sm'>FraudSense is a smart voice security web app that helps you detect fraud calls in real time</h3>

        <form onSubmit={handleSubmit} className='border-white rounded-[12px] p-6 border-[1px] flex flex-col items-start gap-y-4 min-w-[400px] bg-black/16 backdrop-blur-lg mt-8'>
          {users.length > 0 && (
            <div className='flex flex-col items-start gap-y-2 w-full'>
              <label className='font-bold'>Use Existing User </label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className='p-2 border-[1px] border-white rounded-lg w-full'>
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>
          )}

          <div className='flex flex-col items-start gap-y-2 w-full'>
            <label className='font-bold'>Or Create New User</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Enter username"
              disabled={!!selectedUser}
              className='p-2 border-[1px] border-white rounded-lg w-full'
            />
          </div>

          <div className='flex flex-col items-start gap-y-2 w-full'>
            <label className='font-bold'>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className='p-2 border-[1px] border-white rounded-lg w-full'
            />
          </div>
          
          <button type="submit" disabled={!selectedUser && !newUsername.trim()} className='p-2 rounded-lg border-[1px] border-white w-full bg-white text-black cursor-pointer font-bold'>
            Login
          </button>
        </form>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className='group max-w-xs p-2 rounded-lg w-full bg-[#1C1C1C]/80 text-white cursor-pointer font-medium flex items-center justify-center gap-x-2 transition-transform duration-200'
        >
          <span className='inline-flex h-5 w-5 items-center justify-center'>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className='h-5 w-5 transition-transform duration-200 group-hover:rotate-6'
            >
              <path d="M12 2.25c-.41 0-.82.09-1.2.27l-6 2.67A2.25 2.25 0 003 7.27v4.23c0 5.23 3.4 9.98 8.4 11.52.38.12.82.12 1.2 0 5-1.54 8.4-6.29 8.4-11.52V7.27c0-.9-.54-1.7-1.33-2.08l-6-2.67c-.38-.18-.79-.27-1.2-.27zM8.25 12a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" />
            </svg>
          </span>
          Admin Dashboard
        </button>
      </div>

      {/* <div className='absolute inset-0 pointer-events-none'>
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div> */}
    </div>
  );
}

export default Login;