import React from "react";
import "./ChatWindow.css";

export default function ChatWindow({ messages, username, typingUsers, message, setMessage, sendMessage, handleTyping }) {
  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

  return (
    <div className="chat-window">
      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.isSystem ? "system" : msg.sender === username ? "me" : "other"}`}
          >
            {!msg.isSystem && (
              <div className="header">
                <span className="sender">{msg.sender}</span>
                <span className="time">{formatTime(msg.timestamp)}</span>
              </div>
            )}
            <div className="content">{msg.message}</div>
          </div>
        ))}
      </div>
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
        </div>
      )}
      <div className="input-section">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
