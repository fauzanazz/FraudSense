function MessageList({ messages, currentUserId }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {messages.map((message, index) => {
        const isOwn = message.senderId === currentUserId || message.senderId._id === currentUserId;
        const senderName = message.senderId?.username || message.senderName || 'Unknown';
        
        return (
          <div
            key={message._id || index}
            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`${isOwn ? 'bg-indigo-600 text-white rounded-tr-[4px]' : 'bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-tl-[4px]'} max-w-[70%] p-3 rounded-[10px] break-words`}>
              <div className="mb-1">{message.content}</div>
              <div className="flex justify-between text-[0.7rem] opacity-70 space-x-2">
                <span>{isOwn ? 'You' : senderName}</span>
                <span>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default MessageList;