import React from "react";
import "./Sidebar.css";

export default function Sidebar({ users, currentUser, onPrivateChat }) {
  return (
    <div className="sidebar">
      <h2>Online Users</h2>
      <ul className="user-list">
        {users.length === 0 ? (
          <p className="empty">No users connected</p>
        ) : (
          users.map((user) => (
            <li
              key={user.id}
              className={user.username === currentUser ? "me" : ""}
              onClick={() => user.username !== currentUser && onPrivateChat(user)}
            >
              {user.username} {user.username === currentUser && <span>(You)</span>}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
