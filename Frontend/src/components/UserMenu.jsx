import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './UserMenu.css';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);

  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName') || 'Resident User';
  const userEmail = localStorage.getItem('email') || 'resident@superbass.lk';
  const userPicture = localStorage.getItem('userPicture');

  const navigate = (newPath) => {
    setIsOpen(false);
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('email');
    localStorage.removeItem('userPicture');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    setIsOpen(false);
    navigate('/');
  };

  const getFirstName = (name) => {
    if (!name) return 'Account';
    return name.split(' ')[0];
  };

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch unread count for badge
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await axios.get('http://localhost:5237/api/conversations/unread-count', {
          params: { userEmail }
        });
        if (res.data && typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch (err) {
        // Silently ignore if backend offline
      }
    };
    fetchUnread();
  }, [userEmail]);

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      {/* Anchor Trigger Button */}
      <button
        type="button"
        className="user-menu-trigger-btn"
        onClick={() => setIsOpen(prev => !prev)}
        title="User menu"
      >
        {userPicture ? (
          <img src={userPicture} alt="User" className="user-menu-avatar" />
        ) : (
          <div className="user-menu-avatar">{getInitial(userName)}</div>
        )}
        <span className="user-menu-name">{getFirstName(userName)}</span>
        <i className={`fa-solid fa-chevron-down user-menu-arrow ${isOpen ? 'open' : ''}`}></i>
      </button>

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="user-menu-dropdown">
          {/* Header */}
          <div className="user-menu-header">
            {userPicture ? (
              <img src={userPicture} alt="Avatar" className="user-menu-header-avatar" />
            ) : (
              <div className="user-menu-header-avatar">{getInitial(userName)}</div>
            )}
            <div className="user-menu-header-info">
              <div className="user-menu-header-name">{userName}</div>
              <div className="user-menu-header-email">{userEmail}</div>
            </div>
          </div>

          {/* Action Items */}
          <div className="user-menu-items">
            <button
              type="button"
              className="user-menu-item"
              onClick={() => navigate('/account')}
            >
              <i className="fa-regular fa-user user-menu-item-icon"></i>
              <span>Manage Account</span>
            </button>

            <button
              type="button"
              className="user-menu-item"
              onClick={() => navigate('/chats')}
            >
              <i className="fa-regular fa-comments user-menu-item-icon"></i>
              <span>Chats / Messages</span>
              {unreadCount > 0 && <span className="user-menu-badge">{unreadCount}</span>}
            </button>

            <div className="user-menu-divider"></div>

            <button
              type="button"
              className="user-menu-item logout"
              onClick={handleLogout}
            >
              <i className="fa-solid fa-arrow-right-from-bracket user-menu-item-icon"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
