import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import ChatLayout from './components/ChatLayout';
import Login from './components/Login';
import './App.css';

const socket = io('http://localhost:3001');

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleLogin = async (username) => {
    try {
      const response = await axios.post('http://localhost:3001/api/users', { username });
      setUser(response.data);
      socket.emit('user-login', response.data._id);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} users={users} />;
  }

  return (
    <div className="App">
      <ChatLayout user={user} socket={socket} users={users} />
    </div>
  );
}

export default App;