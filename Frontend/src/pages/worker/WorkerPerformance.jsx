import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';
import { API_BASE_URL } from '../../config.js';

export default function WorkerPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [worker, setWorker] = useState(null);

  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchPerformanceData = async () => {
      if (!userEmail) return;
      try {
        const meRes = await axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (meRes.data && meRes.data.worker) {
          const w = meRes.data.worker;
          setWorker(w);
          const workerId = w.id;
          const perfRes = await axios.get(`${API_BASE_URL}/workers/${workerId}/performance`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (perfRes.data) {
            setMetrics(perfRes.data);
          }

          const bookingsRes = await axios.get(`${API_BASE_URL}/bookings/worker?email=${encodeURIComponent(userEmail)}`, {
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

  const getInitials = (name) => {
    if (!name) return 'R';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <WorkerLayout activeTab="performance">
      {/* Top Hero Showcase Banner (Uber Pitch Black Aesthetic) */}
      <div style={{
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
            WORKIO PRO NETWORK • PERFORMANCE & REPUTATION
          </span>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 12px 0'
          }}>
            Performance Analytics & Reviews
          </h1>
          <p style={{
            fontSize: '0.98rem',
            color: '#a3a3a3',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '680px'
          }}>
            Track your client satisfaction ratings, punctuality, completion reliability, and verified customer feedback history in real-time.
          </p>
        </div>
      </div>

      {/* Top Ratings Grid (Uber Pitch Black & White Aesthetic) */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-star"></i>
          </div>
          <div>
            <div className="metric-val">
              {metrics?.overallRating != null ? `★ ${metrics.overallRating.toFixed(1)}` : 'New Worker'}
            </div>
            <div className="metric-label">Overall Rating</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-square-check"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.completionRate || '100%'}</div>
            <div className="metric-label">Completion Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-handshake-angle"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.acceptanceRate || '100%'}</div>
            <div className="metric-label">Acceptance Rate</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box">
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <div className="metric-val">{metrics?.cancellationRate || '0%'}</div>
            <div className="metric-label">Cancellation Rate</div>
          </div>
        </div>
      </div>

      {/* Detailed Ratings Breakdown Card (Uber Design System) */}
      <div className="worker-card" style={{ padding: '30px', marginBottom: '28px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Rating Breakdown by Category
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#737373', margin: 0 }}>
              Calculated from verified post-booking ratings submitted by residents.
            </p>
          </div>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#000000',
            backgroundColor: '#f5f5f5',
            padding: '6px 14px',
            borderRadius: '9999px',
            border: '1px solid #e5e5e5'
          }}>
            Max 5.0 Scale
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Quality Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}>
                  <i className="fa-solid fa-award"></i>
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000000' }}>
                  Work Quality & Craftsmanship
                </span>
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#000000',
                backgroundColor: '#f5f5f5',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid #e5e5e5'
              }}>
                {metrics?.qualityRating != null ? `★ ${metrics.qualityRating.toFixed(1)} / 5.0` : 'No reviews yet'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#f0f0f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: calcPercent(metrics?.qualityRating),
                height: '100%',
                backgroundColor: '#000000',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }}></div>
            </div>
          </div>

          {/* Punctuality Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}>
                  <i className="fa-solid fa-clock"></i>
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000000' }}>
                  Punctuality & Arrival Time
                </span>
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#000000',
                backgroundColor: '#f5f5f5',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid #e5e5e5'
              }}>
                {metrics?.punctualityRating != null ? `★ ${metrics.punctualityRating.toFixed(1)} / 5.0` : 'No reviews yet'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#f0f0f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: calcPercent(metrics?.punctualityRating),
                height: '100%',
                backgroundColor: '#000000',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }}></div>
            </div>
          </div>

          {/* Communication Rating */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}>
                  <i className="fa-solid fa-comments"></i>
                </div>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#000000' }}>
                  Communication & Professionalism
                </span>
              </div>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#000000',
                backgroundColor: '#f5f5f5',
                padding: '3px 10px',
                borderRadius: '9999px',
                border: '1px solid #e5e5e5'
              }}>
                {metrics?.communicationRating != null ? `★ ${metrics.communicationRating.toFixed(1)} / 5.0` : 'No reviews yet'}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#f0f0f0', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{
                width: calcPercent(metrics?.communicationRating),
                height: '100%',
                backgroundColor: '#000000',
                borderRadius: '9999px',
                transition: 'width 0.4s ease'
              }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Feed (Community Card Aesthetic) */}
      <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#000000', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Resident Reviews & Ratings History
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#737373', margin: 0 }}>
              Feedback verified from authentic customer bookings on the SuperBass platform.
            </p>
          </div>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: '5px 14px',
            borderRadius: '9999px'
          }}>
            {reviews.length} Verified {reviews.length === 1 ? 'Review' : 'Reviews'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reviews.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: '#f9f9f9',
              borderRadius: '16px',
              border: '1px dashed #d4d4d4'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#000000',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                marginBottom: '16px'
              }}>
                <i className="fa-solid fa-comment-dots"></i>
              </div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#000000', margin: '0 0 6px 0' }}>
                No Resident Reviews Yet
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#737373', margin: 0, maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                When customers complete bookings with you and submit reviews, their verified ratings and testimonials will be showcased here.
              </p>
            </div>
          ) : (
            reviews.map(item => (
              <div
                key={item.id}
                style={{
                  padding: '22px 24px',
                  borderRadius: '16px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e5e5',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Resident Monogram Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      flexShrink: 0
                    }}>
                      {getInitials(item.residentName || item.residentEmail)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.98rem', fontWeight: 800, color: '#000000' }}>
                          {item.residentName || item.residentEmail}
                        </strong>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#16a34a',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '9999px',
                          padding: '2px 8px'
                        }}>
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '0.65rem' }}></i>
                          Verified Resident
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', fontSize: '0.8rem', color: '#737373' }}>
                        <span style={{
                          backgroundColor: '#f5f5f5',
                          color: '#262626',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.74rem'
                        }}>
                          {item.jobTitle || 'Service Request'}
                        </span>
                        <span>•</span>
                        <span>{item.reviewedAt ? new Date(item.reviewedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Reviewed'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Stars Pill */}
                  {item.reviewRating != null && (
                    <div style={{
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '5px 12px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                    }}>
                      <i className="fa-solid fa-star" style={{ color: '#ffffff', fontSize: '0.75rem' }}></i>
                      <span>{item.reviewRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#fbfbfb',
                  borderRadius: '12px',
                  border: '1px solid #f0f0f0'
                }}>
                  <p style={{
                    fontSize: '0.92rem',
                    color: '#262626',
                    margin: 0,
                    lineHeight: 1.55,
                    fontStyle: item.reviewComment ? 'italic' : 'normal'
                  }}>
                    {item.reviewComment ? `"${item.reviewComment}"` : 'No written feedback was provided with this rating.'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}

