import React from 'react';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import '@material/web/textfield/outlined-text-field.js';

export default function Find() {
  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="app-container">
      {/* Navbar for Find Page */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Logo */}
        <a href="/" onClick={(e) => { e.preventDefault(); goHome(); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" className="brand-logo-img" />
        </a>

        {/* Material 3 Search Bar */}
        <div style={{ flex: 1, maxWidth: '600px', margin: '0 2rem' }}>
          <md-outlined-text-field
            label="Search for services or pros..."
            style={{ width: '100%', '--md-outlined-field-container-shape': '24px' }}
          >
            <md-icon slot="trailing-icon">search</md-icon>
          </md-outlined-text-field>
        </div>

        {/* Join Button */}
        <div className="nav-actions">
          <md-filled-button 
            style={{ 
              '--md-sys-color-primary': '#FDC101', 
              '--md-sys-color-on-primary': '#000000',
              padding: '0 24px',
              minWidth: '100px',
              margin: '0 10px'
            }}
          >
            Join
          </md-filled-button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>
        <h1>Find Services</h1>
        <p>This is the find page.</p>
      </main>
    </div>
  );
}
