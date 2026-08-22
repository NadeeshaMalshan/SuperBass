import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

export default function WorkerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const workerId = urlParams.get('id');

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    const fetchWorkerDetails = async () => {
      if (!workerId) {
        setError('No worker specified.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`http://localhost:5237/api/workers/${workerId}`);
        setWorker(res.data);
      } catch (err) {
        console.error('Error loading worker detail:', err);
        setError('Failed to load worker details.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerDetails();
  }, [workerId]);

  const handleHireClick = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login first to hire or contact workers.');
      navigate('/join');
      return;
    }
    setBookingSuccess(true);
    setTimeout(() => setBookingSuccess(false), 4000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#6b7280' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading worker profile...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#111827', padding: '20px', textAlign: 'center' }}>
        <h2>Worker Profile Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error || 'The requested worker could not be found.'}</p>
        <md-filled-button onClick={() => navigate('/find')}>Back to Services</md-filled-button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Navbar */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>

        <div className="nav-actions">
          <md-outlined-button 
            onClick={() => navigate('/find')}
            style={{
              '--md-sys-color-outline': '#2563eb',
              '--md-sys-color-primary': '#2563eb',
              color: '#2563eb',
              cursor: 'pointer'
            }}
          >
            ← Back to All Services
          </md-outlined-button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {bookingSuccess && (
          <div style={{ backgroundColor: '#10b981', color: '#ffffff', padding: '16px 24px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontWeight: 700 }}>
            ✓ Hiring Request Sent Successfully! The worker will review and respond to your request.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Worker Bio & What He Can Do */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Main Profile Header Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}>
                  {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#111827' }}>{worker.name}</h1>
                    <span style={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
                      VERIFIED PRO
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.95rem', color: '#6b7280' }}>
                    <span><i className="fa-solid fa-location-dot" style={{ color: '#d97706', marginRight: '6px' }}></i>{worker.primaryServiceArea || 'Colombo'}</span>
                    <span>•</span>
                    <span><i className="fa-solid fa-arrows-spin" style={{ color: '#2563eb', marginRight: '6px' }}></i>{worker.coverageRadiusKm || 10} km radius</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontWeight: 700, fontSize: '1.1rem' }}>
                      ★ {worker.overallRating ? worker.overallRating.toFixed(1) : '5.0'}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      ({worker.completedJobs || 0} jobs completed)
                    </div>
                    <div style={{
                      backgroundColor: worker.isAvailable !== false ? '#d1fae5' : '#fee2e2',
                      color: worker.isAvailable !== false ? '#065f46' : '#991b1b',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      {worker.isAvailable !== false ? '● Available for Hire' : '○ Currently Unavailable'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Description */}
              {worker.description && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700 }}>About {worker.name}</h4>
                  <p style={{ color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
                    {worker.description}
                  </p>
                </div>
              )}
            </div>

            {/* WHAT HE CAN DO (SKILLS) CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 16px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🛠️</span>
                What He Can Do (Trade Skills)
              </h2>

              {worker.skills && worker.skills.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {worker.skills.map((skill, idx) => (
                    <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>{skill.skillName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>{skill.experienceYears || 1}+ Years Experience</div>
                      </div>
                      <span style={{ color: '#059669', fontSize: '1.2rem', fontWeight: 800 }}>✓</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#6b7280', margin: 0 }}>General Handyman & Repair Services.</p>
              )}
            </div>

            {/* Performance Ratings Breakdown */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
                Client Ratings & Reliability
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>Quality & Craftsmanship</span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>★ {worker.qualityRating || 5}/5.0</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${((worker.qualityRating || 5) / 5) * 100}%`, height: '100%', backgroundColor: '#2563eb' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>Punctuality & Timeliness</span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>★ {worker.punctualityRating || 5}/5.0</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${((worker.punctualityRating || 5) / 5) * 100}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>Communication & Professionalism</span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>★ {worker.communicationRating || 5}/5.0</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${((worker.communicationRating || 5) / 5) * 100}%`, height: '100%', backgroundColor: '#059669' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Rates, Pricing & Hire CTA Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* RATES & PRICING CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 16px 0', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ backgroundColor: '#fef3c7', color: '#d97706', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800 }}>LKR</span>
                Service Rates & Pricing
              </h2>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Pricing Model</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{worker.pricingModel || 'Hourly / Daily'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                {/* Hourly Rate */}
                <div style={{ backgroundColor: '#fffbebfb', padding: '16px', borderRadius: '12px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Hourly Rate</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#d97706' }}>
                    {worker.hourlyRate ? `Rs. ${worker.hourlyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Per Hour</div>
                </div>

                {/* Daily Rate */}
                <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '4px' }}>Daily Rate</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb' }}>
                    {worker.dailyRate ? `Rs. ${worker.dailyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>Per Full Day</div>
                </div>
              </div>

              {/* Hire Button */}
              <button
                onClick={handleHireClick}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#FDC101',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(253,193,1,0.3)',
                  transition: 'transform 0.2s'
                }}
              >
                ⚡ Hire / Request Worker Now
              </button>
            </div>

            {/* Service Location Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
                Service Location & Area
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Primary Location:</span>
                  <strong style={{ color: '#111827' }}>{worker.primaryServiceArea || 'Colombo'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Travel Radius:</span>
                  <strong style={{ color: '#111827' }}>Up to {worker.coverageRadiusKm || 10} km</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
                  <span>Contact Phone:</span>
                  <strong style={{ color: '#2563eb' }}>{worker.phoneNo || 'Available upon booking'}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
