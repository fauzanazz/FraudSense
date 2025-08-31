function MessageList({ messages, currentUserId, typingUsers = [] }) {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const highlightSensitive = (text) => {
    const keywords = ['password', 'pin', 'otp', 'ssn', 'credit card', 'cvv', 'bank', 'account number'];
    const escaped = keywords.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const pattern = new RegExp(`(${escaped.join('|')})`, 'ig');
    const parts = text.split(pattern);
    return parts.map((part, idx) =>
      pattern.test(part) ? (
        <mark key={idx} className="bg-red-500/30 text-red-200 rounded px-1">{part}</mark>
      ) : (
        <span key={idx}>{part}</span>
      )
    );
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
              <div className="mb-1 leading-relaxed">{highlightSensitive(message.content)}</div>
              <div className="flex justify-between text-[0.7rem] opacity-70 space-x-2">
                <span>{isOwn ? 'You' : senderName}</span>
                <span>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        );
      })}
      {typingUsers.length > 0 && (
        <div className="flex justify-start">
          <div className="bg-neutral-800 text-neutral-300 border border-neutral-700 max-w-[70%] p-3 rounded-[10px] rounded-tl-[4px]">
            <div className="flex items-center gap-2 text-[0.8rem]">
              <span>Typing</span>
              <span className="inline-flex gap-[2px]">
                <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-.2s]"></span>
                <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce [animation-delay:-.1s]"></span>
                <span className="w-1 h-1 bg-neutral-400 rounded-full animate-bounce"></span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MessageList;