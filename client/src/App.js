import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (socket) socket.disconnect();
    };
  }, [socket]);

  const connectToChat = () => {
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    const newSocket = io('http://localhost:5000/chat');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('user_join', username);
    });

    newSocket.on('receive_message', (messageData) => {
      setMessages(prev => [...prev, messageData]);
    });

    newSocket.on('user_joined', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        message: `${data.username} joined the chat`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    newSocket.on('user_left', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        message: `${data.username} left the chat`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    newSocket.on('user_joined_room', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        message: `${data.username} joined room ${data.room}`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    newSocket.on('user_left_room', (data) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        message: `${data.username} left room ${data.room}`,
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });

    newSocket.on('typing', (data) => {
      setTypingUsers(prev => {
        if (!prev.includes(data.username)) return [...prev, data.username];
        return prev;
      });
    });

    newSocket.on('stop_typing', (data) => {
      setTypingUsers(prev => prev.filter(user => user !== data.username));
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        message: 'Disconnected from chat',
        timestamp: new Date().toISOString(),
        isSystem: true
      }]);
    });
  };

  const joinRoom = () => {
    if (!room.trim() || !socket) return;
    socket.emit('join_room', room);
    setCurrentRoom(room);
    setRoom('');
  };

  const leaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leave_room', currentRoom);
      setCurrentRoom('');
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !socket) return;

    const messageData = { message: message.trim(), room: currentRoom || null };
    socket.emit('send_message', messageData);
    setMessage('');
    handleStopTyping();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const handleTyping = () => {
    if (!isTyping && socket) {
      socket.emit('typing', { username });
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping && socket) {
      socket.emit('stop_typing', { username });
      setIsTyping(false);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

  return (
    <div className="App">
      <div className="chat-container">
        <h1>Real-Time Chat</h1>

        {!isConnected ? (
          <div className="connection-section">
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="username-input"
            />
            <button onClick={connectToChat} className="connect-btn">Connect to Chat</button>
          </div>
        ) : (
          <>
            <div className="status">
              Connected as: <strong>{username}</strong>
              {currentRoom && <span> | Room: <strong>{currentRoom}</strong></span>}
            </div>

            <div className="room-section">
              <input
                type="text"
                placeholder="Enter room name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="room-input"
              />
              <button onClick={joinRoom} className="join-room-btn">Join Room</button>
              {currentRoom && <button onClick={leaveRoom} className="leave-room-btn">Leave Room</button>}
            </div>

            <div className="messages-container">
              <div className="messages">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.isSystem ? 'system-message' : ''} ${msg.sender === username ? 'own-message' : ''}`}
                  >
                    <div className="message-header">
                      <span className="sender">{msg.sender}</span>
                      <span className="timestamp">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="message-content">{msg.message}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </div>
              )}
            </div>

            <div className="input-section">
              <input
                type="text"
                placeholder="Type your message..."
                value={message}
                onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                onKeyPress={handleKeyPress}
                className="message-input"
              />
              <button onClick={sendMessage} className="send-btn">Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
