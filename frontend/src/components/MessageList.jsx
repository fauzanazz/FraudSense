function MessageList({ messages, currentUserId }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="message-list">
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId || message.senderId._id === currentUserId;
        const senderName = message.senderId?.username || message.senderName || 'Unknown';
        
        return (
          <div
            key={message._id || index}
            className={`message ${isOwn ? 'message-own' : 'message-other'}`}
          >
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-meta">
                <span className="message-sender">{isOwn ? 'You' : senderName}</span>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;