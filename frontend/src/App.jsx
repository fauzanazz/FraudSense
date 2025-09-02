import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import ChatPage from './pages/ChatPage';
import Login from './components/Login';
import AdminPage from './pages/AdminPage';
import UserPage from './pages/UserPage';
import APIKeysPage from './pages/APIKeysPage';
import MonitoringPage from './pages/MonitoringPage';
import BillingPage from './pages/BillingPage';
import DocsPage from './pages/DocsPage';
import { AdminLayout } from './components/AdminLayout';
import './App.css';

const socket = io(import.meta.env.VITE_API_BASE_URL);

function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleLogin = async (username) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/users`, { username });
      setUser(response.data);
      socket.emit('user-login', response.data._id);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/admin" element={<AdminLayout><AdminPage /></AdminLayout>} />
          <Route path="/admin/users" element={<AdminLayout><UserPage /></AdminLayout>} />
          <Route path="/admin/api-keys" element={<AdminLayout><APIKeysPage /></AdminLayout>} />
          <Route path="/admin/monitoring" element={<AdminLayout><MonitoringPage /></AdminLayout>} />
          <Route path="/admin/billing" element={<AdminLayout><BillingPage /></AdminLayout>} />
          <Route path="/admin/docs" element={<AdminLayout><DocsPage /></AdminLayout>} />
        
          <Route 
            path="/chat" 
            element={
              user ? (
                <ChatPage user={user} socket={socket} users={users} />
              ) : (
                <Login onLogin={handleLogin} users={users} />
              )
            } 
          />
          
          <Route 
            path="/" 
            element={
              user ? (
                <Navigate to="/chat" replace />
              ) : (
                <Login onLogin={handleLogin} users={users} />
              )
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;