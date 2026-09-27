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
          {recentReview ? (
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{recentReview.residentName || recentReview.residentEmail}</span>
                {recentReview.reviewRating && (
                  <span style={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.9rem' }}>★ {recentReview.reviewRating.toFixed(1)}</span>
                )}
              </div>
              <p style={{ fontSize: '0.875rem', color: '#475569', fontStyle: 'italic', margin: 0 }}>
                "{recentReview.reviewComment || 'No written comment.'}"
              </p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.9rem' }}>
              No resident reviews received yet.
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
