function ConversationList({ 
  conversations, 
  users, 
  activeConversation, 
  onSelectConversation, 
  onCreateConversation,
  currentUserId
}) {
  const getParticipantId = (participant) => (typeof participant === 'string' ? participant : participant._id);
  const resolveUserName = (participant) => {
    if (!participant) return 'Unknown User';
    if (typeof participant === 'string') {
      const found = users.find(u => u._id === participant);
      return found?.username || 'Unknown User';
    }
    return participant.username || 'Unknown User';
  };

  const getOtherParticipant = (conversation, currentUserId) => {
    return conversation.participants.find(p => getParticipantId(p) !== currentUserId);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 min-h-0">
      <h4 className="m-0 mb-4 text-neutral-400 text-sm uppercase tracking-wide">Conversations</h4>
      <div>
        {conversations.map(conversation => {
          const otherUser = getOtherParticipant(conversation, currentUserId);
          return (
            <div
              key={conversation._id}
              className={
                `p-3 mb-2 rounded-lg cursor-pointer transition-all ` +
                (activeConversation?._id === conversation._id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700')
              }
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="font-medium mb-1">
                {resolveUserName(otherUser)}
              </div>
              <div className="text-sm opacity-70">
                {conversation.lastMessage || 'No messages yet'}
              </div>
            </div>
          );
        })}
      </div>
      
      <h4 className="mt-6 mb-3 text-neutral-400 text-sm uppercase tracking-wide">Start New Chat</h4>
      <div className="max-h-[200px] overflow-y-auto">
        {users.map(user => (
          <div
            key={user._id}
            className="flex justify-between items-center p-2 mb-1 bg-neutral-800 rounded"
            onClick={() => onCreateConversation(user._id)}
          >
            <span>{user.username}</span>
            <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm cursor-pointer">Chat</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConversationList;