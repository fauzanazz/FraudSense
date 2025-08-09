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
    <div className="conversation-list">
      <h4>Conversations</h4>
      <div className="conversations">
        {conversations.map(conversation => {
          const otherUser = getOtherParticipant(conversation, currentUserId);
          return (
            <div
              key={conversation._id}
              className={`conversation-item ${
                activeConversation?._id === conversation._id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-name">
                {resolveUserName(otherUser)}
              </div>
              <div className="last-message">
                {conversation.lastMessage || 'No messages yet'}
              </div>
            </div>
          );
        })}
      </div>
      
      <h4>Start New Chat</h4>
      <div className="user-list">
        {users.map(user => (
          <div
            key={user._id}
            className="user-item"
            onClick={() => onCreateConversation(user._id)}
          >
            <span className="username">{user.username}</span>
            <button className="chat-btn">Chat</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConversationList;