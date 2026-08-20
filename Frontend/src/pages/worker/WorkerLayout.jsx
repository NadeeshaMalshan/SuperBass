import React, { useState } from 'react';
import './worker.css';

export default function WorkerLayout({ children, activeTab = 'dashboard' }) {
  const [isOnline, setIsOnline] = useState(true);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const toggleStatus = () => {
    setIsOnline(!isOnline);
  };

  return (
    <div className="worker-app-wrapper">
      {/* Top Header Navbar */}
      <header className="worker-navbar">
        <div className="worker-brand" onClick={() => navigate('/worker/dashboard')}>
          <img src="/iconWithText-cropped.png" alt="SuperBass Logo" className="worker-brand-logo" />
          <span className="worker-badge-pill">Worker Portal</span>
        </div>

        <div className="worker-navbar-actions">
          {/* Live Availability Switch */}
          <div className="status-toggle-container" onClick={toggleStatus} title="Click to toggle availability">
            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
            <span className="status-text">{isOnline ? 'Available for Work' : 'Currently Offline'}</span>
          </div>

          <button className="worker-btn-outlined" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => navigate('/join')}>
            <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Area with Sidebar */}
      <div className="worker-main-layout">
        {/* Navigation Sidebar */}
        <aside className="worker-sidebar">
          <div 
            className={`worker-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => navigate('/worker/dashboard')}
          >
            <i className="fa-solid fa-chart-pie"></i>
            <span>Dashboard</span>
          </div>

          <div 
            className={`worker-nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => navigate('/worker/jobs')}
          >
            <i className="fa-solid fa-briefcase"></i>
            <span>My Jobs</span>
          </div>

          <div 
            className={`worker-nav-item ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => navigate('/worker/performance')}
          >
            <i className="fa-solid fa-star"></i>
            <span>Performance</span>
          </div>

          <div 
            className={`worker-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => navigate('/worker/profile')}
          >
            <i className="fa-solid fa-user-gear"></i>
            <span>Profile & Settings</span>
          </div>
        </aside>

        {/* Dynamic Page Content */}
        <main className="worker-content">
          {children}
        </main>
      </div>
    </div>
  );
}
