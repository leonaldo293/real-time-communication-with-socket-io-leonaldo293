// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());

// Store users, rooms, and messages
const chatUsers = {};
const chatMessages = {};      // { roomName: [messages] }
const chatTypingUsers = {};   // { roomName: { socketId: username } }

// Chat namespace
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // User joins chat
    socket.on('user_join', (username) => {
        chatUsers[socket.id] = { username, rooms: [] };
        chatNamespace.emit('user_joined', { username });
        console.log(`${username} joined the chat`);
    });

    // User joins room
    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        if (!chatUsers[socket.id].rooms.includes(roomName)) {
            chatUsers[socket.id].rooms.push(roomName);
        }
        if (!chatMessages[roomName]) chatMessages[roomName] = [];
        chatNamespace.to(roomName).emit('user_joined_room', { username: chatUsers[socket.id].username, room: roomName });
        console.log(`${chatUsers[socket.id].username} joined room ${roomName}`);
    });

    // User leaves room
    socket.on('leave_room', (roomName) => {
        socket.leave(roomName);
        chatUsers[socket.id].rooms = chatUsers[socket.id].rooms.filter(r => r !== roomName);
        chatNamespace.to(roomName).emit('user_left_room', { username: chatUsers[socket.id].username, room: roomName });
        console.log(`${chatUsers[socket.id].username} left room ${roomName}`);
    });

    // Send message
    socket.on('send_message', (data) => {
        const message = {
            id: Date.now(),
            sender: chatUsers[socket.id]?.username || 'Anonymous',
            message: data.message,
            room: data.room || null,
            timestamp: new Date().toISOString()
        };

        if (data.room) {
            if (!chatMessages[data.room]) chatMessages[data.room] = [];
            chatMessages[data.room].push(message);
            if (chatMessages[data.room].length > 100) chatMessages[data.room].shift();
            chatNamespace.to(data.room).emit('receive_message', message);
        } else {
            if (!chatMessages['global']) chatMessages['global'] = [];
            chatMessages['global'].push(message);
            if (chatMessages['global'].length > 100) chatMessages['global'].shift();
            chatNamespace.emit('receive_message', message);
        }
    });

    // Typing indicator
    socket.on('typing', ({ username, room }) => {
        const key = room || 'global';
        if (!chatTypingUsers[key]) chatTypingUsers[key] = {};
        chatTypingUsers[key][socket.id] = username;
        if (room) chatNamespace.to(room).emit('typing', { username });
        else chatNamespace.emit('typing', { username });
    });

    socket.on('stop_typing', ({ username, room }) => {
        const key = room || 'global';
        if (chatTypingUsers[key]) delete chatTypingUsers[key][socket.id];
        if (room) chatNamespace.to(room).emit('stop_typing', { username });
        else chatNamespace.emit('stop_typing', { username });
    });

    // Disconnect
    socket.on('disconnect', () => {
        const user = chatUsers[socket.id];
        if (user) {
            user.rooms.forEach(room => {
                chatNamespace.to(room).emit('user_left_room', { username: user.username, room });
            });
            chatNamespace.emit('user_left', { username: user.username });
            delete chatUsers[socket.id];
        }
        Object.keys(chatTypingUsers).forEach(room => {
            delete chatTypingUsers[room][socket.id];
        });
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Simple API route to check server
app.get('/', (req, res) => {
    res.send('Socket.io Chat Server running');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
