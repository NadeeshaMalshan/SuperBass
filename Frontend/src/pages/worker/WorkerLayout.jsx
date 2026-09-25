import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './worker.css';
import { API_BASE_URL } from '../../config.js';

export default function WorkerLayout({ children, activeTab = 'dashboard' }) {
  const savedAvailable = localStorage.getItem('workerIsAvailable');
  const [isOnline, setIsOnline] = useState(savedAvailable !== null ? savedAvailable === 'true' : true);
  const [workerId, setWorkerId] = useState(null);
  const [toggling, setToggling] = useState(false);

  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    if (!userEmail) return;
    axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.data && res.data.worker) {
          setWorkerId(res.data.worker.id);
          const dbAvailable = res.data.worker.isAvailable !== false;
          setIsOnline(dbAvailable);
          localStorage.setItem('workerIsAvailable', dbAvailable ? 'true' : 'false');
        }
      })
      .catch(err => console.log('Could not fetch worker navbar availability'));

    // Listen for availability changes from WorkerProfile save
    const handleAvailabilityChange = (e) => {
      setIsOnline(e.detail.isAvailable);
    };
    window.addEventListener('workerAvailabilityChanged', handleAvailabilityChange);
    return () => window.removeEventListener('workerAvailabilityChanged', handleAvailabilityChange);
  }, [userEmail, token]);

  const toggleStatus = async () => {
    if (toggling) return;
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    localStorage.setItem('workerIsAvailable', newStatus ? 'true' : 'false');
    // Also notify WorkerProfile if it's open on the same page
    window.dispatchEvent(new CustomEvent('workerAvailabilityChanged', { detail: { isAvailable: newStatus } }));

    if (workerId) {
      try {
        setToggling(true);
        await axios.put(`${API_BASE_URL}/workers/${workerId}/availability`, {
          isAvailable: newStatus
        }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (err) {
        console.error('Failed to update availability in database:', err);
      } finally {
        setToggling(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate('/join');
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
          <div className="status-toggle-container" onClick={toggleStatus} title="Click to toggle real database availability">
            <span className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></span>
            <span className="status-text">{isOnline ? 'Available for Work' : 'Currently Offline'}</span>
          </div>

          <button className="worker-btn-outlined" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={handleLogout}>
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
