import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './UserMenu.css';
import { API_BASE_URL, BACKEND_URL } from '../config.js';

export default function UserMenu({ variant = 'default' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef(null);

  const token = localStorage.getItem('token');
  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const isWorker = (activeRole || '').toLowerCase() === 'worker';
  const userEmail = (isWorker
    ? (localStorage.getItem('workerEmail') || localStorage.getItem('email'))
    : (localStorage.getItem('email') || localStorage.getItem('workerEmail'))) || '';

  const [userName, setUserName] = useState(localStorage.getItem('userName') || (userEmail ? userEmail.split('@')[0] : 'Account'));
  const [userPicture, setUserPicture] = useState(localStorage.getItem('userPicture'));

  if (!token) return null;

  const navigate = (newPath) => {
    setIsOpen(false);
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
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

  const getValidUrl = (url) => {
    if (!url || url === 'null' || typeof url !== 'string' || url.trim() === '') return null;
    if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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

  // Fetch profile photo directly from database table (Residents or Workers) on mount & sync to localStorage
  useEffect(() => {
    const fetchUserProfileFromTable = async () => {
      if (!userEmail) return;
      const authToken = localStorage.getItem('token');
      try {
        if (isWorker) {
          const res = await axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          });
          const w = res.data?.worker;
          if (w) {
            if (w.name) {
              setUserName(w.name);
              localStorage.setItem('userName', w.name);
            }
            if (w.profileImage) {
              setUserPicture(w.profileImage);
              localStorage.setItem('userPicture', w.profileImage);
              setAvatarFailed(false);
            }
          }
        } else {
          const res = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
          });
          if (res.data) {
            if (res.data.name) {
              setUserName(res.data.name);
              localStorage.setItem('userName', res.data.name);
            }
            if (res.data.profileImage) {
              setUserPicture(res.data.profileImage);
              localStorage.setItem('userPicture', res.data.profileImage);
              setAvatarFailed(false);
            }
          }
        }
      } catch (err) {
        // Silently ignore if offline
      }
    };

    fetchUserProfileFromTable();
  }, [userEmail, isWorker]);

  // Listen for profile updates from ResidentProfile/WorkerProfile
  useEffect(() => {
    const handleProfileUpdate = () => {
      const currentPic = localStorage.getItem('userPicture');
      const currentName = localStorage.getItem('userName') || (userEmail ? userEmail.split('@')[0] : 'Account');
      setUserName(currentName);
      setUserPicture(currentPic);
      setAvatarFailed(false);
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [userEmail]);

  // Fetch unread count for badge
  useEffect(() => {
    const fetchUnread = async () => {
      if (!userEmail) return;
      const token = localStorage.getItem('token');
      try {
        const res = await axios.get(`${API_BASE_URL}/conversations/unread-count`, {
          params: { userEmail },
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data && typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      } catch {
        // Silently ignore if unauthenticated or backend offline
      }
    };
    fetchUnread();
  }, [userEmail]);

  const avatarUrl = getValidUrl(userPicture);

  return (
    <div className="user-menu-wrapper" ref={menuRef}>
      {/* Anchor Trigger Button */}
      {variant === 'm3-google' ? (
        <button
          type="button"
          className="m3-google-avatar-trigger"
          onClick={() => setIsOpen(prev => !prev)}
          title={`${isWorker ? 'Worker' : 'Resident'} Account: ${userName} (${userEmail})`}
          aria-label="User Account Menu"
        >
          <div className={`m3-google-avatar-ring ${isWorker ? 'worker-ring' : 'resident-ring'}`}>
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="m3-google-avatar-img"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <div className="m3-google-avatar-letter">{getInitial(userName)}</div>
            )}
          </div>
        </button>
      ) : (
        <button
          type="button"
          className="user-menu-trigger-btn"
          onClick={() => setIsOpen(prev => !prev)}
          title="User menu"
        >
          {avatarUrl && !avatarFailed ? (
            <img
              src={avatarUrl}
              alt="User"
              className="user-menu-avatar"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <div className="user-menu-avatar">{getInitial(userName)}</div>
          )}
          <span className="user-menu-name">{getFirstName(userName)}</span>
          <i className={`fa-solid fa-chevron-down user-menu-arrow ${isOpen ? 'open' : ''}`}></i>
        </button>
      )}

      {/* Dropdown Popup */}
      {isOpen && (
        <div className="user-menu-dropdown">
          {/* Header */}
          <div
            className="user-menu-header"
            onClick={() => navigate(isWorker ? '/worker/profile' : '/account?tab=edit')}
            style={{ cursor: 'pointer' }}
            title="Open Account Settings"
          >
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="user-menu-header-avatar"
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
              />
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
            {activeRole === 'Worker' && (
              <button
                type="button"
                className="user-menu-item"
                onClick={() => navigate('/worker/dashboard')}
              >
                <i className="fa-solid fa-chart-pie user-menu-item-icon"></i>
                <span>Worker Dashboard</span>
              </button>
            )}

            <button
              type="button"
              className="user-menu-item"
              onClick={() => navigate(isWorker ? '/worker/profile' : '/account?tab=edit')}
            >
              <i className="fa-solid fa-gear user-menu-item-icon"></i>
              <span>Account Settings</span>
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
