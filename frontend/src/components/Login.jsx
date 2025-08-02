import { useState } from 'react';

function Login({ onLogin, users }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [newUsername, setNewUsername] = useState('');

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
    <div className="login-container">
      <div className="login-form">
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
      </div>
    </div>
  );
}

export default Login;