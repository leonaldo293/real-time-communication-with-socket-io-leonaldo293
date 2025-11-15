// =====================
// IMPORTS & SETUP
// =====================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// =====================
// STORAGE (em memória)
// =====================
const chatUsers = {};
const chatMessages = {}; 
const chatTypingUsers = {}; 
const messageReactions = {}; 
const messageReadStatus = {}; 
const messageDeliveryStatus = {}; 

// =====================
// NAMESPACE DO CHAT
// =====================
const chatNamespace = io.of('/chat');

chatNamespace.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // USER JOIN
    socket.on('user_join', (username) => {
        chatUsers[socket.id] = { username, rooms: [] };
        chatNamespace.emit('user_joined', { username });
        console.log(`${username} joined the chat`);
    });

    // JOIN ROOM
    socket.on('join_room', (roomName) => {
        socket.join(roomName);

        if (!chatUsers[socket.id].rooms.includes(roomName)) {
            chatUsers[socket.id].rooms.push(roomName);
        }

        if (!chatMessages[roomName]) chatMessages[roomName] = [];

        chatNamespace.to(roomName).emit('user_joined_room', {
            username: chatUsers[socket.id].username,
            room: roomName
        });

        console.log(`${chatUsers[socket.id].username} joined room ${roomName}`);
    });

    // LEAVE ROOM
    socket.on('leave_room', (roomName) => {
        socket.leave(roomName);
        chatUsers[socket.id].rooms =
            chatUsers[socket.id].rooms.filter(r => r !== roomName);

        chatNamespace.to(roomName).emit('user_left_room', {
            username: chatUsers[socket.id].username,
            room: roomName
        });

        console.log(`${chatUsers[socket.id].username} left room ${roomName}`);
    });

    // SEND MESSAGE
    socket.on('send_message', (data) => {
        const message = {
            id: Date.now(),
            sender: chatUsers[socket.id]?.username || 'Anonymous',
            message: data.message,
            room: data.room || null,
            timestamp: new Date().toISOString()
        };

        const targetRoom = data.room || 'global';
        if (!chatMessages[targetRoom]) chatMessages[targetRoom] = [];
        chatMessages[targetRoom].push(message);
        if (chatMessages[targetRoom].length > 100) chatMessages[targetRoom].shift();

        if (data.room) chatNamespace.to(data.room).emit('receive_message', message);
        else chatNamespace.emit('receive_message', message);
    });

    // TYPING
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

    // SEND FILE
    socket.on('send_file', (data) => {
        const fileMessage = {
            id: Date.now(),
            sender: chatUsers[socket.id]?.username || 'Anonymous',
            message: data.message || '',
            file: {
                name: data.fileName,
                type: data.fileType,
                data: data.fileData
            },
            room: data.room || null,
            timestamp: new Date().toISOString(),
            type: 'file'
        };

        const targetRoom = data.room || 'global';
        if (!chatMessages[targetRoom]) chatMessages[targetRoom] = [];
        chatMessages[targetRoom].push(fileMessage);

        if (chatMessages[targetRoom].length > 100) chatMessages[targetRoom].shift();

        if (data.room) chatNamespace.to(data.room).emit('receive_message', fileMessage);
        else chatNamespace.emit('receive_message', fileMessage);

        messageDeliveryStatus[fileMessage.id] = true;
        socket.emit('message_delivered', { messageId: fileMessage.id });
    });

    // ADD REACTION
    socket.on('add_reaction', (data) => {
        const { messageId, reaction } = data;
        const username = chatUsers[socket.id]?.username;
        if (!username) return;

        if (!messageReactions[messageId]) messageReactions[messageId] = {};
        if (!messageReactions[messageId][reaction]) messageReactions[messageId][reaction] = [];

        if (!messageReactions[messageId][reaction].includes(username)) {
            messageReactions[messageId][reaction].push(username);
        }

        const room = data.room || 'global';
        chatNamespace.to(room).emit('reaction_added', {
            messageId,
            reaction,
            username
        });
    });

    // REMOVE REACTION
    socket.on('remove_reaction', (data) => {
        const { messageId, reaction } = data;
        const username = chatUsers[socket.id]?.username;
        if (!username) return;

        if (
            messageReactions[messageId] &&
            messageReactions[messageId][reaction]
        ) {
            messageReactions[messageId][reaction] =
                messageReactions[messageId][reaction].filter(u => u !== username);

            if (messageReactions[messageId][reaction].length === 0) {
                delete messageReactions[messageId][reaction];
            }
        }

        const room = data.room || 'global';
        chatNamespace.to(room).emit('reaction_removed', {
            messageId,
            reaction,
            username
        });
    });

    // MARK AS READ
    socket.on('mark_as_read', (data) => {
        const username = chatUsers[socket.id]?.username;
        if (!username) return;

        const { messageId } = data;
        if (!messageReadStatus[messageId]) messageReadStatus[messageId] = {};
        messageReadStatus[messageId][username] = true;

        const room = data.room || 'global';
        chatNamespace.to(room).emit('message_read', {
            messageId,
            username
        });
    });

    // PAGINATION
    socket.on('get_messages', (data) => {
        const { room, offset = 0, limit = 20 } = data;
        const msgs = chatMessages[room] || [];

        const paginated = msgs
            .slice(-offset - limit, -offset || undefined)
            .reverse();

        socket.emit('messages_page', {
            messages: paginated,
            room,
            hasMore: offset + limit < msgs.length
        });
    });

    // SEARCH
    socket.on('search_messages', (data) => {
        const { query, room } = data;
        const msgs = chatMessages[room] || [];

        const results = msgs.filter(m =>
            m.message?.toLowerCase().includes(query.toLowerCase()) ||
            m.sender?.toLowerCase().includes(query.toLowerCase())
        );

        socket.emit('search_results', { results, room });
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        const user = chatUsers[socket.id];

        if (user) {
            user.rooms.forEach(room => {
                chatNamespace.to(room).emit('user_left_room', {
                    username: user.username,
                    room
                });
            });

            chatNamespace.emit('user_left', {
                username: user.username
            });

            delete chatUsers[socket.id];
        }

        Object.keys(chatTypingUsers).forEach(room => {
            delete chatTypingUsers[room][socket.id];
        });

        console.log(`User disconnected: ${socket.id}`);
    });
});

// =====================
// ROUTE ROOT
// =====================
app.get("/", (req, res) => {
    res.send("Socket.io Chat Server running");
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Export for testing (optional)
module.exports = { app, server, io };
