import React from 'react';
import './UserList.css';

function UserList({ users, currentUser, onPrivateChat }) {
    return ( <
        div className = "user-list" >
        <
        h2 > Online Users < /h2> <
        ul > {
            users.length === 0 ? ( <
                p className = "empty" > No users connected < /p>
            ) : (
                    users.map((user) => ( <
                        li key = { user.username }
                        className = { user.username === currentUser ? "me" : "" }
                        onClick = {
                            () => user.username !== currentUser && onPrivateChat(user) } >
                        { user.username } {
                            user.username === currentUser && < span > (You) < /span>} <
                                span className = { `status ${user.online ? 'online' : 'offline'}` } > < /span> <
                                /li>
                        )))
                } <
                /ul> <
                /div>
        );
    }

    export default UserList;