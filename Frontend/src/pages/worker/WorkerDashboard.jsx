import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';
import { API_BASE_URL } from '../../config.js';

export default function WorkerDashboard() {
  const [performance, setPerformance] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [recentReview, setRecentReview] = useState(null);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchWorkerOverview = async () => {
      if (!userEmail) return;
      try {
        const meRes = await axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (meRes.data && meRes.data.worker) {
          const workerId = meRes.data.worker.id;
          const perfRes = await axios.get(`${API_BASE_URL}/workers/${workerId}/performance`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (perfRes.data) {
            setPerformance(perfRes.data);
          }

          const bookingsRes = await axios.get(`${API_BASE_URL}/bookings/worker?email=${encodeURIComponent(userEmail)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (bookingsRes.data) {
            setPendingRequests(bookingsRes.data.filter(b => b.status === 'Requested'));
            const reviewed = bookingsRes.data.filter(b => b.status === 'Reviewed' && (b.reviewComment || b.reviewRating));
            if (reviewed.length > 0) {
              setRecentReview(reviewed[0]);
            }
          }
        }
      } catch (err) {
        console.log('Worker profile/performance data unavailable');
      }
    };

    fetchWorkerOverview();
  }, [userEmail, token]);

  return (
    <WorkerLayout activeTab="dashboard">
      {/* 1. Community-Style Pitch Black Hero Showcase Banner */}
      <section style={{
        width: '100%',
        backgroundColor: '#000000',
        borderRadius: '20px',
        padding: '36px 36px 40px',
        marginBottom: '28px',
        border: '1px solid #1f1f1f',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
      }}>
        {/* Subtle decorative glow overlay */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '-10%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#a3a3a3',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            Workio Pro Network • Worker Dashboard
          </span>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 12px 0'
          }}>
            Worker Overview & Operations Hub
          </h1>
          <p style={{
            fontSize: '0.98rem',
            color: '#a3a3a3',
            lineHeight: 1.5,
            margin: '0 0 24px 0',
            maxWidth: '680px'
          }}>
            Track incoming customer bookings, monitor live availability, check performance ratings, and manage your trade specializations in real-time.
          </p>

          {/* Worker Profile & Overall Score Status Bar */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '20px',
            backgroundColor: '#121212',
            border: '1px solid #282828',
            borderRadius: '16px',
            padding: '12px 20px',
            flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Worker Profile Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: '#262626',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.95rem',
                fontWeight: 700
              }}>
                <i className="fa-solid fa-user-gear"></i>
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.92rem' }}>
                  {userEmail ? (userEmail.includes('@') ? userEmail.split('@')[0] : userEmail) : 'Worker Pro'}
                </div>
                <div style={{ color: '#a3a3a3', fontSize: '0.75rem' }}>
                  {performance?.completedJobs ?? 0} Completed Jobs
                </div>
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', backgroundColor: '#282828' }} />

            {/* Overall Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#a3a3a3', fontSize: '0.78rem' }}>Overall Score:</span>
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.9rem' }}>
                {performance?.overallRating != null ? `★ ${performance.overallRating.toFixed(1)} / 5.0` : 'New Worker'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pending Job Requests Alert (if any) */}
      {pendingRequests.length > 0 && (
        <div style={{
          backgroundColor: '#000000',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '18px 24px',
          marginBottom: '24px',
          border: '1px solid #1f1f1f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: '#262626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              color: '#ffffff'
            }}>
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                You have {pendingRequests.length} pending booking request{pendingRequests.length > 1 ? 's' : ''}!
              </div>
              <div style={{ fontSize: '0.82rem', color: '#a3a3a3' }}>
                Residents are waiting for your confirmation. Review details to accept or decline.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="worker-btn-primary"
            onClick={() => navigate('/worker/jobs')}
            style={{ backgroundColor: '#ffffff', color: '#000000', border: 'none', padding: '9px 20px', fontSize: '0.85rem' }}
          >
            Review Requests
          </button>
        </div>
      )}

      {/* 2. Key Performance Metrics Row (Uber Black & White Style) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-star"></i>
          </div>
          <div>
            <div className="metric-val">
              {performance?.overallRating != null ? `★ ${performance.overallRating.toFixed(1)}` : 'No rating'}
            </div>
            <div className="metric-label">Overall Rating</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="metric-val">{performance?.completionRate || 'N/A'}</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-briefcase"></i>
          </div>
          <div>
            <div className="metric-val">{performance?.completedJobs ?? 0}</div>
            <div className="metric-label">Completed Jobs</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div className="metric-val">{performance?.acceptanceRate || 'N/A'}</div>
            <div className="metric-label">Acceptance Rate</div>
          </div>
        </div>
      </div>

      {/* 3. Quick Access Grid (Uber Style Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="worker-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}>
              <i className="fa-solid fa-sliders"></i>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#000000', margin: 0 }}>
              Quick Actions & Tools
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => navigate('/worker/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7f7f7'; e.currentTarget.style.borderColor = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e5e5e5'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-wrench" style={{ color: '#000000', fontSize: '1rem', width: '20px', textAlign: 'center' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>Update Trade Skills & Rates</div>
                  <div style={{ fontSize: '0.78rem', color: '#737373' }}>Edit your services, sub-skill chips, and pricing</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#a3a3a3', fontSize: '0.8rem' }}></i>
            </button>

            <button
              onClick={() => navigate('/worker/profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7f7f7'; e.currentTarget.style.borderColor = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e5e5e5'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-calendar-days" style={{ color: '#000000', fontSize: '1rem', width: '20px', textAlign: 'center' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>Working Hours & Availability</div>
                  <div style={{ fontSize: '0.78rem', color: '#737373' }}>Configure daily schedules and booking slots</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#a3a3a3', fontSize: '0.8rem' }}></i>
            </button>

            <button
              onClick={() => navigate('/worker/performance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7f7f7'; e.currentTarget.style.borderColor = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e5e5e5'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-chart-line" style={{ color: '#000000', fontSize: '1rem', width: '20px', textAlign: 'center' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>Performance Analytics</div>
                  <div style={{ fontSize: '0.78rem', color: '#737373' }}>Detailed ratings, response times, and stats</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#a3a3a3', fontSize: '0.8rem' }}></i>
            </button>

            <button
              onClick={() => navigate('/community')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid #e5e5e5',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7f7f7'; e.currentTarget.style.borderColor = '#000000'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#e5e5e5'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-comments" style={{ color: '#000000', fontSize: '1rem', width: '20px', textAlign: 'center' }}></i>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>Workio Community Classifieds</div>
                  <div style={{ fontSize: '0.78rem', color: '#737373' }}>Offer services or answer resident repair requests</div>
                </div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: '#a3a3a3', fontSize: '0.8rem' }}></i>
            </button>
          </div>
        </div>

        <div className="worker-card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.85rem'
            }}>
              <i className="fa-solid fa-comment-dots"></i>
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#000000', margin: 0 }}>
              Recent Resident Review
            </h3>
          </div>

          {recentReview ? (
            <div style={{ backgroundColor: '#f7f7f7', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e5e5e5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {(recentReview.residentName || recentReview.residentEmail || 'R').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#000000' }}>
                    {recentReview.residentName || recentReview.residentEmail}
                  </span>
                </div>
                {recentReview.reviewRating && (
                  <span style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    padding: '3px 10px',
                    borderRadius: '9999px'
                  }}>
                    ★ {recentReview.reviewRating.toFixed(1)}
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.88rem', color: '#525252', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
                "{recentReview.reviewComment || 'Great service and quick response time!'}"
              </p>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#f7f7f7',
              padding: '32px 20px',
              borderRadius: '14px',
              border: '1px dashed #e5e5e5',
              color: '#737373',
              fontSize: '0.9rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fa-solid fa-star" style={{ fontSize: '1.8rem', color: '#d4d4d4' }}></i>
              <div>No resident reviews received yet. Completed bookings will appear here.</div>
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
