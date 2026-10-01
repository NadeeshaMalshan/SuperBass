import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import M3TopNavbar from '../../components/M3TopNavbar.jsx';
import '../../App.css';
import './worker.css';
import { API_BASE_URL } from '../../config.js';
import { showToast } from '../../utils/toast.js';
import '@material/web/icon/icon.js';
import '@material/web/dialog/dialog.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/text-button.js';

export default function WorkerLayout({ children, activeTab = 'dashboard' }) {
  const savedAvailable = localStorage.getItem('workerIsAvailable');
  const [isOnline, setIsOnline] = useState(savedAvailable !== null ? savedAvailable === 'true' : true);
  const [workerId, setWorkerId] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Availability Confirmation Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const confirmDialogRef = useRef(null);

  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    if (confirmModalOpen) {
      confirmDialogRef.current?.show();
    } else {
      confirmDialogRef.current?.close();
    }
  }, [confirmModalOpen]);

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

  const handleStatusCardClick = () => {
    if (toggling) return;
    setPendingStatus(!isOnline);
    setConfirmModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (pendingStatus === null) return;
    const newStatus = pendingStatus;
    setConfirmModalOpen(false);
    setPendingStatus(null);
    await applyAvailabilityChange(newStatus);
  };

  const handleCancelToggle = () => {
    setConfirmModalOpen(false);
    setPendingStatus(null);
  };

  const applyAvailabilityChange = async (newStatus) => {
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
        showToast(newStatus ? '✓ You are now Available for Work' : '✓ You are now Currently Offline');
      } catch (err) {
        console.error('Failed to update availability in database:', err);
        showToast('Failed to update status on server.');
      } finally {
        setToggling(false);
      }
    }
  };

  return (
    <div className="find-page-container community-page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f7f7f7', fontFamily: "var(--font-heading, 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)" }}>
      {/* High-Contrast Pitch Black Top Navbar matching Community (Rendered Globally) */}

      {/* Main Content Area with Community-Themed Sidebar */}
      <div className="find-layout" style={{ flex: 1, display: 'flex' }}>
        {/* Navigation Sidebar */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`} style={{ backgroundColor: '#ffffff', borderRight: '1px solid #e5e5e5' }}>
          {/* Live Availability Status Card in Sidebar */}
          <div
            onClick={handleStatusCardClick}
            style={{
              margin: '8px 12px 16px 12px',
              padding: isSidebarCollapsed ? '10px 6px' : '12px 14px',
              backgroundColor: isOnline ? '#ffffff' : '#f5f5f5',
              border: `1.5px solid ${isOnline ? '#22c55e' : '#e5e5e5'}`,
              borderRadius: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
              gap: '10px',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              boxShadow: isOnline ? '0 2px 8px rgba(34, 197, 94, 0.12)' : 'none'
            }}
            title="Click to toggle availability"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: isOnline ? '#22c55e' : '#9ca3af',
                boxShadow: isOnline ? '0 0 0 3px rgba(34, 197, 94, 0.25)' : 'none',
                flexShrink: 0
              }} />
              {!isSidebarCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isOnline ? '#15803d' : '#525252' }}>
                    {isOnline ? 'Available for Work' : 'Currently Offline'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: isOnline ? '#16a34a' : '#737373' }}>
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

            <div
              className={`m3-drawer-item ${activeTab === 'community-posts' ? 'active' : ''}`}
              onClick={() => navigate('/worker/community-posts')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">dynamic_feed</md-icon>
                <span className="m3-drawer-label">My Community Posts</span>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#e5e5e5', margin: '12px 16px' }} />

            <div
              className="m3-drawer-item"
              onClick={() => navigate('/community')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">forum</md-icon>
                <span className="m3-drawer-label">Community Feed</span>
              </div>
            </div>

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
        <main className="find-main" style={{ flex: 1, minWidth: 0, padding: '28px 36px', backgroundColor: '#f7f7f7' }}>
          {children}
        </main>
      </div>

      {/* Confirmation Modal for Toggling Availability Status */}
      {createPortal(
        <md-dialog
          ref={confirmDialogRef}
          style={{
            '--md-dialog-container-color': '#ffffff',
            '--md-dialog-container-shape': '24px',
            fontFamily: "var(--font-heading, 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
            position: 'fixed',
            inset: 0,
            margin: 'auto',
            zIndex: 10000,
            minWidth: '340px',
            maxWidth: '460px'
          }}
          onClosed={handleCancelToggle}
        >
          <div slot="headline" style={{ color: '#0f172a', fontWeight: 800, padding: '24px 24px 12px 24px', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>{pendingStatus ? '🟢 Go Online?' : '⚫ Go Offline?'}</span>
          </div>

          <div slot="content" style={{ color: '#475569', padding: '0 24px 24px 24px', fontSize: '0.95rem', lineHeight: '1.55' }}>
            {pendingStatus ? (
              <div>
                Are you sure you want to switch your status to <strong>Available for Work</strong>?
                <br /><br />
                You will be visible to residents in search results and eligible to receive new hire requests.
              </div>
            ) : (
              <div>
                Are you sure you want to switch your status to <strong>Currently Offline</strong>?
                <br /><br />
                You will be temporarily hidden from search results and won't receive new booking requests until you turn it back on.
              </div>
            )}
          </div>

          <div slot="actions" style={{ padding: '0 24px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <md-text-button
              onClick={handleCancelToggle}
              style={{ '--md-sys-color-primary': '#64748b', fontWeight: 600, padding: '0 16px' }}
            >
              Cancel
            </md-text-button>
            <md-filled-button
              onClick={handleConfirmToggle}
              style={{
                '--md-sys-color-primary': pendingStatus ? '#16a34a' : '#000000',
                '--md-sys-color-on-primary': '#ffffff',
                fontWeight: 700,
                padding: '0 20px'
              }}
            >
              {pendingStatus ? 'Yes, Go Online' : 'Yes, Go Offline'}
            </md-filled-button>
          </div>
        </md-dialog>,
        document.body
      )}
    </div>
  );
}
