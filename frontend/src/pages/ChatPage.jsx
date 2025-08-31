import React from 'react';
import ChatLayout from '../components/ChatLayout';

function ChatPage({ user, socket, users }) {
  return (
    <div className="h-screen">
      <ChatLayout user={user} socket={socket} users={users} />
    </div>
  );
}

export default ChatPage;
