import React, { useState } from 'react';
import './Message.css';

function Message({ message, username, onRead }) {
    const [read, setRead] = useState(false);

    const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

    const handleRead = () => {
        if (!read && message.sender !== username) {
            setRead(true);
            onRead(message.id);
        }
    };

    return ( <
        div className = { `message ${message.isSystem ? 'system' : message.sender === username ? 'own' : 'other'}` }
        onClick = { handleRead } >
        {!message.isSystem && ( <
                div className = "message-header" >
                <
                span className = "sender" > { message.sender } < /span> <
                span className = "timestamp" > { formatTime(message.timestamp) } < /span> {
                    message.sender === username && ( <
                        span className = { `read-status ${read ? 'read' : 'unread'}` } > { read ? '✓✓' : '✓' } <
                        /span>
                    )
                } <
                /div>
            )
        } <
        div className = "message-content" > { message.message } < /div> <
        /div>
    );
}

export default Message;