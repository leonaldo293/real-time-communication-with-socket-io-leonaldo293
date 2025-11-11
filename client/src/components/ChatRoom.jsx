import React, { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';
import Message from './Message';

function ChatRoom({
    rooms,
    currentRoom,
    messages,
    typingUsers,
    unreadCounts,
    username,
    onJoinRoom,
    onLeaveRoom,
    onSendMessage,
    onTyping,
    onStopTyping,
    onMarkAsRead
}) {
    const [message, setMessage] = useState('');
    const [newRoom, setNewRoom] = useState('');
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
        onMarkAsRead(currentRoom);
    }, [currentRoom, onMarkAsRead]);

    const handleSendMessage = () => {
        if (!message.trim()) return;
        onSendMessage(message, currentRoom);
        setMessage('');
        handleStopTyping();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSendMessage();
    };

    const handleTyping = () => {
        onTyping(currentRoom);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => handleStopTyping(), 1000);
    };

    const handleStopTyping = () => {
        onStopTyping(currentRoom);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };

    const handleJoinRoom = () => {
        if (!newRoom.trim()) return;
        onJoinRoom(newRoom);
        setNewRoom('');
    };

    const handleLeaveRoom = (room) => {
        onLeaveRoom(room);
    };

    return ( <
        div className = "chat-room" >
        <
        div className = "room-header" >
        <
        h2 > Room: { currentRoom } < /h2> <
        div className = "room-controls" >
        <
        input type = "text"
        placeholder = "New room name"
        value = { newRoom }
        onChange = {
            (e) => setNewRoom(e.target.value) }
        className = "new-room-input" /
        >
        <
        button onClick = { handleJoinRoom }
        className = "join-room-btn" > Join < /button> <
        /div> <
        /div>

        <
        div className = "rooms-list" > {
            rooms.map(room => ( <
                    div key = { room }
                    className = { `room-item ${room === currentRoom ? 'active' : ''}` }
                    onClick = {
                        () => onJoinRoom(room) } >
                    { room } {
                        unreadCounts[room] > 0 && < span className = "unread-count" > ({ unreadCounts[room] }) < /span>} {
                                room !== 'global' && ( <
                                    button onClick = {
                                        (e) => { e.stopPropagation();
                                            handleLeaveRoom(room); } }
                                    className = "leave-room-btn" > Leave < /button>
                                )
                            } <
                            /div>
                    ))
            } <
            /div>

            <
            div className = "messages-container" >
            <
            div className = "messages" > {
                messages.map(msg => ( <
                    Message key = { msg.id }
                    message = { msg }
                    username = { username }
                    onRead = {
                        () => {} } // Placeholder for read receipts
                    />
                ))
            } <
            div ref = { messagesEndRef }
            /> <
            /div>

            {
                typingUsers.length > 0 && ( <
                    div className = "typing-indicator" > { typingUsers.join(', ') } { typingUsers.length === 1 ? 'is' : 'are' }
                    typing... <
                    /div>
                )
            } <
            /div>

            <
            div className = "input-section" >
            <
            input
            type = "text"
            placeholder = "Type your message..."
            value = { message }
            onChange = {
                (e) => { setMessage(e.target.value);
                    handleTyping(); } }
            onKeyPress = { handleKeyPress }
            className = "message-input" /
            >
            <
            button onClick = { handleSendMessage }
            className = "send-btn" > Send < /button> <
            /div> <
            /div>
        );
    }

    export default ChatRoom;