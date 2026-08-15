import React from 'react';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import '@material/web/textfield/outlined-text-field.js';

export default function Find() {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [userPicture, setUserPicture] = React.useState('');

  React.useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserName(localStorage.getItem('userName') || '');
    setUserPicture(localStorage.getItem('userPicture') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
    setIsLoggedIn(false);
    setShowLogoutPopup(false);
    navigate('/');
  };

  const getFirstName = (name) => {
    if (!name) return 'Account';
    return name.split(' ')[0];
  };

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="app-container">
      {/* Navbar for Find Page */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {/* Logo */}
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
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

        {/* Conditional Buttons based on Auth State */}
        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <md-filled-button
                onClick={() => navigate('/create')}
                style={{
                  '--md-sys-color-primary': '#FDC101',
                  '--md-sys-color-on-primary': '#000000',
                  padding: '0 24px',
                  minWidth: '100px',
                  margin: '0 10px'
                }}
              >
                Create community post
              </md-filled-button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <md-filled-button
                  onClick={() => setShowLogoutPopup(!showLogoutPopup)}
                  style={{
                    '--md-sys-color-primary': '#000000',
                    '--md-sys-color-on-primary': '#ffffff',
                    padding: '0 16px',
                    minWidth: '100px',
                    margin: '0 10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {userPicture && <img slot="icon" src={userPicture} alt="User" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                  {getFirstName(userName)}
                </md-filled-button>
                {showLogoutPopup && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '10px',
                    marginTop: '8px',
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '8px 0',
                    zIndex: 1000,
                    minWidth: '150px',
                    textAlign: 'left'
                  }}>
                    <button 
                      onClick={() => { setShowLogoutPopup(false); navigate('/account'); }} 
                      style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '16px', color: '#000000' }}
                    >
                      My Account
                    </button>
                    <button 
                      onClick={handleLogout} 
                      style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '16px', color: '#EA4335' }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <md-filled-button
              onClick={() => navigate('/join')}
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
          )}
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
