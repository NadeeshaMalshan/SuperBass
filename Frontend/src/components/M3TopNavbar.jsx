import React, { useState, useEffect } from 'react';
import './M3Navbar.css';
import UserMenu from './UserMenu.jsx';
import '@material/web/icon/icon.js';

export default function M3TopNavbar({
  activePage = '',
  searchValue = '',
  onSearchChange = null,
  onSearchSubmit = null,
  onSearchFocus = null,
  searchPlaceholder = 'Search superබාස්...',
  showSearch = true,
  showSidebarToggle = false,
  isSidebarCollapsed = false,
  onToggleSidebar = null,
  searchDropdown = null,
}) {
  const [internalSearch, setInternalSearch] = useState(searchValue || '');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  useEffect(() => {
    setInternalSearch(searchValue);
  }, [searchValue]);

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInternalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleClear = () => {
    setInternalSearch('');
    if (onSearchChange) {
      onSearchChange('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
    } else if (e.key === 'Enter') {
      if (onSearchSubmit) {
        onSearchSubmit(internalSearch);
      } else if (!onSearchChange && internalSearch.trim()) {
        navigate(`/find?q=${encodeURIComponent(internalSearch.trim())}`);
      }
    }
  };

  return (
    <header className="m3-top-navbar">
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
          title="superබාස් - Home"
        >
          <img src="/icon.png" alt="superබාස්" className="m3-brand-logo-img" />
          <span className="m3-brand-title">
            super<span className="m3-brand-accent">බාස්</span>
          </span>
        </a>
      </div>

      {/* Center: Search Pill ("Ask SuperBass" like "Ask Gmail") */}
      {showSearch && (
        <div className="m3-navbar-center">
          <div className="m3-search-pill">
            <div className="m3-search-leading-icon" title="Search">
              <md-icon>search</md-icon>
            </div>

            <input
              type="text"
              className="m3-search-input"
              placeholder={searchPlaceholder}
              value={internalSearch}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={onSearchFocus}
            />

            {internalSearch && (
              <button
                type="button"
                className="m3-search-clear-btn"
                onClick={handleClear}
                title="Clear search"
                aria-label="Clear search"
              >
                <md-icon>close</md-icon>
              </button>
            )}
          </div>
          {searchDropdown}
        </div>
      )}

      {/* Right: Navigation Buttons & User Avatar */}
      <div className="m3-navbar-right">
        {/* 1. Services / Find Workers */}
        <button
          type="button"
          className={`m3-nav-btn ${activePage === 'find' ? 'active' : ''}`}
          onClick={() => navigate('/find')}
          title="Find Craftsmen & Workers"
        >
          <md-icon>handyman</md-icon>
          <span>Services</span>
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
          onClick={() => navigate('/ai-chat')}
          title="AI Home Assistant"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="topNavGeminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="35%" stopColor="#9B72CB" />
                <stop offset="70%" stopColor="#D96570" />
                <stop offset="100%" stopColor="#F4B400" />
              </linearGradient>
            </defs>
            <path
              d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
              fill="url(#topNavGeminiGrad)"
            />
          </svg>
          <span>AI</span>
        </button>

        {/* 4. Messages Button */}
        <button
          type="button"
          className={`m3-nav-btn ${activePage === 'chats' ? 'active' : ''}`}
          onClick={() => navigate('/chats')}
          title="Direct Messages"
        >
          <md-icon>chat</md-icon>
          <span>Messages</span>
        </button>

        {/* 5. Bookings Button */}
        <button
          type="button"
          className={`m3-nav-btn ${activePage === 'bookings' ? 'active' : ''}`}
          onClick={() => navigate('/bookings')}
          title="My Bookings"
        >
          <md-icon>calendar_today</md-icon>
          <span>Bookings</span>
        </button>

        {/* 6. User Profile Avatar or Sign In */}
        {isLoggedIn ? (
          <UserMenu variant="m3-google" />
        ) : (
          <button
            type="button"
            className="m3-signin-btn"
            onClick={() => navigate('/join')}
            title="Sign in to superබාස්"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
