import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';

export default function WorkerDashboard() {
  const [performance, setPerformance] = useState({
    overallRating: 4.8,
    completionRate: '97.0%',
    acceptanceRate: '94.0%',
    completedJobs: 33,
    cancelledJobs: 1
  });

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const userEmail = localStorage.getItem('email');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchWorkerOverview = async () => {
      if (!userEmail) return;
      try {
        const meRes = await axios.get(`http://localhost:5237/api/workers/me?email=${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (meRes.data && meRes.data.worker) {
          const workerId = meRes.data.worker.id;
          const perfRes = await axios.get(`http://localhost:5237/api/workers/${workerId}/performance`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (perfRes.data) {
            setPerformance(perfRes.data);
          }
        }
      } catch (err) {
        console.log('Using default mock stats for worker dashboard');
      }
    };

    fetchWorkerOverview();
  }, [userEmail, token]);

  return (
    <WorkerLayout activeTab="dashboard">
      <div className="page-title-block">
        <h1 className="page-title">Worker Overview</h1>
        <p className="page-subtitle">Welcome back! Here is a summary of your work, ratings, and active requests.</p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-star"></i>
          </div>
          <div>
            <div className="metric-val">★ {performance.overallRating || 4.8}</div>
            <div className="metric-label">Overall Rating</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div className="metric-val">{performance.completionRate || '97%'}</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-briefcase"></i>
          </div>
          <div>
            <div className="metric-val">{performance.completedJobs || 33}</div>
            <div className="metric-label">Completed Jobs</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-user-check"></i>
          </div>
          <div>
            <div className="metric-val">{performance.acceptanceRate || '94%'}</div>
            <div className="metric-label">Acceptance Rate</div>
          </div>
        </div>
      </div>

      {/* Pending Job Alerts Section */}
      <div className="worker-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111' }}>
            <i className="fa-solid fa-bell" style={{ color: '#2563EB', marginRight: '8px' }}></i>
            Pending Booking Requests (2)
          </h3>
          <span className="badge badge-warning">Requires Response</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Request Card 1 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111111' }}>
                Leaking Pipe Repair — Colombo 03
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
                Resident: <strong style={{ color: '#1E293B' }}>Kamal Perera</strong> • Scheduled: Tomorrow, 10:00 AM
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="worker-btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => navigate('/worker/jobs')}>
                Accept
              </button>
              <button className="worker-btn-outlined" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Decline
              </button>
            </div>
          </div>

          {/* Request Card 2 */}
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111111' }}>
                Main Switch Board Inspection — Rajagiriya
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px' }}>
                Resident: <strong style={{ color: '#1E293B' }}>Nimal Silva</strong> • Scheduled: Saturday, 2:00 PM
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="worker-btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => navigate('/worker/jobs')}>
                Accept
              </button>
              <button className="worker-btn-outlined" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="worker-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111111', marginBottom: '12px' }}>
            <i className="fa-solid fa-sliders" style={{ color: '#2563EB', marginRight: '8px' }}></i>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="worker-btn-outlined" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => navigate('/worker/profile')}>
              <i className="fa-solid fa-wrench" style={{ marginRight: '8px', color: '#2563EB' }}></i>
              Update Skills & Rates
            </button>
            <button className="worker-btn-outlined" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => navigate('/worker/profile')}>
              <i className="fa-solid fa-calendar-days" style={{ marginRight: '8px', color: '#2563EB' }}></i>
              Set Working Hours
            </button>
            <button className="worker-btn-outlined" style={{ textAlign: 'left', justifyContent: 'flex-start' }} onClick={() => navigate('/worker/performance')}>
              <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', color: '#2563EB' }}></i>
              View Rating Breakdown
            </button>
          </div>
        </div>

        <div className="worker-card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111111', marginBottom: '12px' }}>
            <i className="fa-solid fa-comment-dots" style={{ color: '#2563EB', marginRight: '8px' }}></i>
            Recent Resident Review
          </h3>
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Anura Wickramasinghe</span>
              <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.9rem' }}>★ 5.0</span>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#475569', fontStyle: 'italic', margin: 0 }}>
              "Fixed our bathroom plumbing issue very quickly and cleanly. Arrived right on time!"
            </p>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
