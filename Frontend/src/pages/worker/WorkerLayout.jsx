import React, { useState, useEffect } from 'react';
import axios from 'axios';
import M3TopNavbar from '../../components/M3TopNavbar.jsx';
import '../../App.css';
import './worker.css';
import { API_BASE_URL } from '../../config.js';
import '@material/web/icon/icon.js';

export default function WorkerLayout({ children, activeTab = 'dashboard' }) {
  const savedAvailable = localStorage.getItem('workerIsAvailable');
  const [isOnline, setIsOnline] = useState(savedAvailable !== null ? savedAvailable === 'true' : true);
  const [workerId, setWorkerId] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  return (
    <div className="find-page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Google Workspace / Material 3 Top Navbar */}
      <M3TopNavbar
        activePage="worker-dashboard"
        showSearch={true}
        searchPlaceholder="Search jobs, requests, or tools..."
        showSidebarToggle={true}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content Area with Material 3 Sidebar */}
      <div className="find-layout" style={{ flex: 1, display: 'flex' }}>
        {/* Navigation Sidebar */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
          {/* Live Availability Status Card in Sidebar */}
          <div
            onClick={toggleStatus}
            style={{
              margin: '8px 12px 16px 12px',
              padding: isSidebarCollapsed ? '10px 6px' : '12px 14px',
              backgroundColor: isOnline ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${isOnline ? '#bfdbfe' : '#e2e8f0'}`,
              borderRadius: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              gap: '10px',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
            title="Click to toggle availability"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isOnline ? '#16a34a' : '#94a3b8',
                boxShadow: isOnline ? '0 0 0 3px rgba(22, 163, 74, 0.25)' : 'none',
                flexShrink: 0
              }} />
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isOnline ? '#1e40af' : '#475569' }}>
                    {isOnline ? 'Available for Work' : 'Currently Offline'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isOnline ? '#3b82f6' : '#94a3b8' }}>
                    {isOnline ? 'Ready for bookings' : 'Tap to go online'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <nav className="m3-drawer-nav">
            <div
              className={`m3-drawer-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => navigate('/worker/dashboard')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">dashboard</md-icon>
                <span className="m3-drawer-label">Dashboard</span>
              </div>
            </div>

            <div
              className={`m3-drawer-item ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => navigate('/worker/jobs')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">work</md-icon>
                <span className="m3-drawer-label">My Jobs</span>
              </div>
            </div>

            <div
              className={`m3-drawer-item ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => navigate('/worker/performance')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">star</md-icon>
                <span className="m3-drawer-label">Performance</span>
              </div>
            </div>

            <div
              className={`m3-drawer-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => navigate('/worker/profile')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">person</md-icon>
                <span className="m3-drawer-label">Profile & Skills</span>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '12px 16px' }} />

            <div
              className="m3-drawer-item"
              onClick={() => navigate('/bookings')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">inbox</md-icon>
                <span className="m3-drawer-label">Bookings View</span>
              </div>
            </div>
          </nav>
        </aside>

        {/* Dynamic Page Content */}
        <main className="find-main" style={{ flex: 1, minWidth: 0, padding: '28px 36px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
