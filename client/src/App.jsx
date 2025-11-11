import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';
import ChatRoom from './components/ChatRoom';
import UserList from './components/UserList';
import notificationSound from './notification.wav';

function App() {
    const [socket, setSocket] = useState(null);
    const [username, setUsername] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [users, setUsers] = useState([]);
    const [rooms, setRooms] = useState(['global']);
    const [currentRoom, setCurrentRoom] = useState('global');
    const [messages, setMessages] = useState({ global: [] });
    const [unreadCounts, setUnreadCounts] = useState({ global: 0 });
    const [typingUsers, setTypingUsers] = useState({ global: [] });
    const [privateChats, setPrivateChats] = useState({});

    const audioRef = useRef(null);

    useEffect(() => {
        if ("Notification" in window && Notification.permission !== "granted") {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        return () => {
            if (socket) {
                socket.disconnect();
            }
        };
    }, [socket]);

    const playNotification = () => {
        if (audioRef.current) {
            audioRef.current.play();
        }
    };

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

        newSocket.on('receive_message', (msg) => {
            const room = msg.room || 'global';
            setMessages(prev => ({
                ...prev,
                [room]: [...(prev[room] || []), msg]
            }));

            if (msg.sender !== username) {
                if (room !== currentRoom) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [room]: (prev[room] || 0) + 1
                    }));
                }
                playNotification();
                if (document.hidden && Notification.permission === "granted") {
                    new Notification(msg.sender, { body: msg.message, icon: '/favicon.ico' });
                }
            }
        });

        newSocket.on('user_joined', (data) => {
            setUsers(prev => [...prev, { username: data.username, online: true }]);
            const systemMsg = {
                id: Date.now(),
                sender: 'System',
                message: `${data.username} joined the chat`,
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            setMessages(prev => ({
                ...prev,
                global: [...(prev.global || []), systemMsg]
            }));
        });

        newSocket.on('user_left', (data) => {
            setUsers(prev => prev.filter(u => u.username !== data.username));
            const systemMsg = {
                id: Date.now(),
                sender: 'System',
                message: `${data.username} left the chat`,
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            setMessages(prev => ({
                ...prev,
                global: [...(prev.global || []), systemMsg]
            }));
        });

        newSocket.on('user_joined_room', (data) => {
            const systemMsg = {
                id: Date.now(),
                sender: 'System',
                message: `${data.username} joined room ${data.room}`,
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            setMessages(prev => ({
                ...prev,
                [data.room]: [...(prev[data.room] || []), systemMsg]
            }));
        });

        newSocket.on('user_left_room', (data) => {
            const systemMsg = {
                id: Date.now(),
                sender: 'System',
                message: `${data.username} left room ${data.room}`,
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            setMessages(prev => ({
                ...prev,
                [data.room]: [...(prev[data.room] || []), systemMsg]
            }));
        });

        newSocket.on('typing', (data) => {
            const room = data.room || 'global';
            setTypingUsers(prev => ({
                ...prev,
                [room]: prev[room] ? (prev[room].includes(data.username) ? prev[room] : [...prev[room], data.username]) : [data.username]
            }));
        });

        newSocket.on('stop_typing', (data) => {
            const room = data.room || 'global';
            setTypingUsers(prev => ({
                ...prev,
                [room]: prev[room] ? prev[room].filter(u => u !== data.username) : []
            }));
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            setUsers([]);
            const systemMsg = {
                id: Date.now(),
                sender: 'System',
                message: 'Disconnected from chat',
                timestamp: new Date().toISOString(),
                isSystem: true
            };
            setMessages(prev => ({
                ...prev,
                global: [...(prev.global || []), systemMsg]
            }));
        });
    };

    const joinRoom = (roomName) => {
        if (!socket || !roomName.trim()) return;
        socket.emit('join_room', roomName);
        setCurrentRoom(roomName);
        setUnreadCounts(prev => ({...prev, [roomName]: 0 }));
        if (!rooms.includes(roomName)) {
            setRooms(prev => [...prev, roomName]);
        }
    };

    const leaveRoom = (roomName) => {
        if (socket && roomName !== 'global') {
            socket.emit('leave_room', roomName);
            setRooms(prev => prev.filter(r => r !== roomName));
            if (currentRoom === roomName) {
                setCurrentRoom('global');
            }
        }
    };

    const sendMessage = (message, room) => {
        if (!message.trim() || !socket) return;
        const messageData = { message: message.trim(), room: room || currentRoom };
        socket.emit('send_message', messageData);
    };

    const handleTyping = (room) => {
        if (socket) {
            socket.emit('typing', { username, room: room || currentRoom });
        }
    };

    const handleStopTyping = (room) => {
        if (socket) {
            socket.emit('stop_typing', { username, room: room || currentRoom });
        }
    };

    const startPrivateChat = (user) => {
        const privateRoom = `private-${[username, user.username].sort().join('-')}`;
        joinRoom(privateRoom);
        setPrivateChats(prev => ({...prev, [privateRoom]: user.username }));
    };

    const markAsRead = (room) => {
        setUnreadCounts(prev => ({...prev, [room]: 0 }));
    };

    return ( <
        div className = "App" >
        <
        audio ref = { audioRef }
        src = { notificationSound }
        preload = "auto" / > {!isConnected ? ( <
                div className = "connection-section" >
                <
                input type = "text"
                placeholder = "Enter your username"
                value = { username }
                onChange = {
                    (e) => setUsername(e.target.value) }
                className = "username-input" /
                >
                <
                button onClick = { connectToChat }
                className = "connect-btn" > Connect to Chat < /button> <
                /div>
            ) : ( <
                div className = "chat-layout" >
                <
                UserList users = { users }
                currentUser = { username }
                onPrivateChat = { startPrivateChat }
                /> <
                ChatRoom rooms = { rooms }
                currentRoom = { currentRoom }
                messages = { messages[currentRoom] || [] }
                typingUsers = { typingUsers[currentRoom] || [] }
                unreadCounts = { unreadCounts }
                username = { username }
                onJoinRoom = { joinRoom }
                onLeaveRoom = { leaveRoom }
                onSendMessage = { sendMessage }
                onTyping = { handleTyping }
                onStopTyping = { handleStopTyping }
                onMarkAsRead = { markAsRead }
                /> <
                /div>
            )
        } <
        /div>
    );
}

export default App;