import { useState } from 'react';

function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-neutral-900 border-t border-neutral-800">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            rows="1"
            className="flex-1 p-3 bg-neutral-800 text-neutral-100 placeholder:text-neutral-500 border border-neutral-700 rounded-[20px] resize-none font-inherit text-base focus:outline-none focus:border-indigo-500"
          />
          <button type="submit" disabled={!message.trim()} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;