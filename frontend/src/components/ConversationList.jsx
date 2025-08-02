function ConversationList({ 
  conversations, 
  users, 
  activeConversation, 
  onSelectConversation, 
  onCreateConversation 
}) {
  const getOtherParticipant = (conversation, currentUserId) => {
    return conversation.participants.find(p => p._id !== currentUserId);
  };

  return (
    <div className="conversation-list">
      <h4>Conversations</h4>
      <div className="conversations">
        {conversations.map(conversation => {
          const otherUser = getOtherParticipant(conversation, conversation.participants[0]._id);
          return (
            <div
              key={conversation._id}
              className={`conversation-item ${
                activeConversation?._id === conversation._id ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation)}
            >
              <div className="conversation-name">
                {otherUser?.username || 'Unknown User'}
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