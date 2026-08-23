import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';

export default function WorkerPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [reviews, setReviews] = useState([]);

  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPerformanceData = async () => {
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
            setMetrics(perfRes.data);
          }

          const bookingsRes = await axios.get(`http://localhost:5237/api/bookings/worker?email=${encodeURIComponent(userEmail)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (bookingsRes.data) {
            const reviewedList = bookingsRes.data.filter(b => b.status === 'Reviewed' || b.reviewRating != null);
            setReviews(reviewedList);
          }
        }
      } catch (err) {
        console.log('Error fetching performance analytics', err);
      }
    };

    fetchPerformanceData();
  }, [userEmail, token]);

  const calcPercent = (val) => {
    if (!val || val <= 0) return '0%';
    return `${Math.min(100, Math.round((val / 5) * 100))}%`;
  };

  return (
    <WorkerLayout activeTab="performance">
      <div className="page-title-block">
        <h1 className="page-title">Performance Analytics & Reviews</h1>
        <p className="page-subtitle">Track your client ratings, punctuality, completion rates, and feedback history.</p>
      </div>

      {/* Top Ratings Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}>
            <i className="fa-solid fa-star"></i>
          </div>
          <div>
            <div className="metric-val">
              {metrics?.overallRating != null ? `★ ${metrics.overallRating.toFixed(1)}` : 'No rating'}
            </div>
            <div className="metric-label">Overall Rating</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-square-check"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.completionRate || 'N/A'}</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-handshake-angle"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.acceptanceRate || 'N/A'}</div>
            <div className="metric-label">Acceptance Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.cancellationRate || 'N/A'}</div>
            <div className="metric-label">Cancellation Rate</div>
          </div>
        </div>
      </div>

      {/* Detailed Ratings Breakdown Card */}
      <div className="worker-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '20px' }}>
          Rating Breakdown by Category
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Quality Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Work Quality & Craftsmanship</span>
              <span style={{ color: '#F59E0B' }}>
                {metrics?.qualityRating != null ? `★ ${metrics.qualityRating.toFixed(1)} / 5.0` : 'N/A'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: calcPercent(metrics?.qualityRating), height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
            </div>
          </div>

          {/* Punctuality Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Punctuality & Arrival Time</span>
              <span style={{ color: '#F59E0B' }}>
                {metrics?.punctualityRating != null ? `★ ${metrics.punctualityRating.toFixed(1)} / 5.0` : 'N/A'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: calcPercent(metrics?.punctualityRating), height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
            </div>
          </div>

          {/* Communication Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Communication & Professionalism</span>
              <span style={{ color: '#F59E0B' }}>
                {metrics?.communicationRating != null ? `★ ${metrics.communicationRating.toFixed(1)} / 5.0` : 'N/A'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: calcPercent(metrics?.communicationRating), height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Feed */}
      <div className="worker-card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '20px' }}>
          Resident Reviews & Ratings History
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.length === 0 ? (
            <p style={{ color: '#64748B', margin: 0 }}>No resident reviews received yet.</p>
          ) : (
            reviews.map(item => (
              <div key={item.id} style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#111111' }}>{item.residentName || item.residentEmail}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {item.jobTitle} • {item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString() : 'Reviewed'}
                    </div>
                  </div>
                  {item.reviewRating && (
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ {item.reviewRating.toFixed(1)}</span>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
                  "{item.reviewComment || 'No written comment provided.'}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
