import React, { useState, useEffect } from 'react';
import './M3Navbar.css';
import UserMenu from './UserMenu.jsx';
import '@material/web/icon/icon.js';
import workioLogoWhite from '../assets/Workio_Logo/Workio_Logo_White_With_Text.png';

export default function M3TopNavbar({
  activePage = '',
  showSidebarToggle = false,
  isSidebarCollapsed = false,
  onToggleSidebar = null,
  theme = 'light',
  alwaysShowLinks = false,
}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('popstate', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('popstate', checkAuth);
    };
  }, []);

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <header className={`m3-top-navbar ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {/* Left: App Logo & Name with Optional Hamburger Toggle */}
      <div className="m3-navbar-brand-group">
        {showSidebarToggle && (
          <button
            type="button"
            className="m3-hamburger-btn"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Expand panel" : "Collapse panel"}
            aria-label="Toggle navigation drawer"
          >
            <md-icon>menu</md-icon>
          </button>
        )}

        <a
          href="/"
          onClick={(e) => { e.preventDefault(); navigate('/'); }}
          className="m3-brand-link"
          title="Workio - Home"
        >
          <img src={workioLogoWhite} alt="Workio" className="m3-brand-logo-img" />
        </a>
      </div>

      {/* Right: Navigation Buttons & User Avatar */}
      <div className="m3-navbar-right">
        {/* 1. Workers / Find Workers */}
        <button
          type="button"
          className={`m3-nav-btn ${activePage === 'find' || activePage === 'services' || activePage === 'workers' ? 'active' : ''}`}
          onClick={() => navigate('/find')}
          title="Find Craftsmen & Workers"
        >
          <md-icon>engineering</md-icon>
          <span>Workers</span>
        </button>

        {/* 2. Community Button */}
        <button
          type="button"
          className={`m3-nav-btn ${activePage === 'community' ? 'active' : ''}`}
          onClick={() => navigate('/community')}
          title="Community Discussions"
        >
          <md-icon>groups</md-icon>
          <span>Community</span>
        </button>

        {/* 3. AI Assistant Button */}
        <button
          type="button"
          className={`m3-nav-btn m3-nav-btn-ai ${activePage === 'ai' ? 'active' : ''}`}
          onClick={() => navigate('/ai/chat')}
          title="AI Home Assistant"
        >
          <md-icon style={{ fontSize: '18px' }}>auto_awesome</md-icon>
          <span>AI</span>
        </button>

        {/* 4. Messages Button */}
        {(isLoggedIn || alwaysShowLinks) && (
          <button
            type="button"
            className={`m3-nav-btn ${activePage === 'chats' ? 'active' : ''}`}
            onClick={() => navigate(isLoggedIn ? '/chats' : '/join')}
            title="Direct Messages"
          >
            <md-icon>chat</md-icon>
            <span>Messages</span>
          </button>
        )}

        {/* 5. Bookings Button */}
        {(isLoggedIn || alwaysShowLinks) && (
          <button
            type="button"
            className={`m3-nav-btn ${activePage === 'bookings' ? 'active' : ''}`}
            onClick={() => navigate(isLoggedIn ? '/bookings' : '/join')}
            title="My Bookings"
          >
            <md-icon>calendar_today</md-icon>
            <span>Bookings</span>
          </button>
        )}

        {/* 6. User Profile Avatar or Sign In button */}
        {isLoggedIn ? (
          <UserMenu variant="m3-google" />
        ) : (
          <button
            type="button"
            className="m3-signin-btn"
            onClick={() => navigate('/join')}
            title="Sign in to Workio"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
