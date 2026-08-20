import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';

export default function WorkerPerformance() {
  const [metrics, setMetrics] = useState({
    overallRating: 4.8,
    qualityRating: 4.9,
    punctualityRating: 4.7,
    communicationRating: 4.8,
    completedJobs: 33,
    cancelledJobs: 1,
    acceptanceRate: '94.0%',
    completionRate: '97.0%',
    cancellationRate: '3.0%'
  });

  useEffect(() => {
    axios.get('http://localhost:5237/api/workers/1/performance')
      .then(res => {
        if (res.data) setMetrics(res.data);
      })
      .catch(err => console.log('Loaded mock performance data'));
  }, []);

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
            <div className="metric-val">★ {metrics.overallRating || 4.8}</div>
            <div className="metric-label">Overall Rating</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-square-check"></i>
          </div>
          <div>
            <div className="metric-val">{metrics.completionRate || '97.0%'}</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-handshake-angle"></i>
          </div>
          <div>
            <div className="metric-val">{metrics.acceptanceRate || '94.0%'}</div>
            <div className="metric-label">Acceptance Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: '#FEF2F2', color: '#EF4444' }}>
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div className="metric-val">{metrics.cancellationRate || '3.0%'}</div>
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
              <span style={{ color: '#F59E0B' }}>★ {metrics.qualityRating || 4.9} / 5.0</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '98%', height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
            </div>
          </div>

          {/* Punctuality Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Punctuality & Arrival Time</span>
              <span style={{ color: '#F59E0B' }}>★ {metrics.punctualityRating || 4.7} / 5.0</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '94%', height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
            </div>
          </div>

          {/* Communication Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem', fontWeight: 600 }}>
              <span>Communication & Professionalism</span>
              <span style={{ color: '#F59E0B' }}>★ {metrics.communicationRating || 4.8} / 5.0</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: '96%', height: '100%', backgroundColor: '#2563EB', borderRadius: '9999px' }}></div>
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
          {/* Review 1 */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: '#111111' }}>Anura Wickramasinghe</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Plumbing Repair • 2 days ago</div>
              </div>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ 5.0</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
              "Fixed our bathroom pipe leak very cleanly and explained the repair process. Excellent work!"
            </p>
          </div>

          {/* Review 2 */}
          <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '1rem', color: '#111111' }}>Dilini Senanayake</strong>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Electrical Switch Replacement • 1 week ago</div>
              </div>
              <span style={{ color: '#F59E0B', fontWeight: 700 }}>★ 4.8</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
              "Punctual and very knowledgeable electrician. Will hire again!"
            </p>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
