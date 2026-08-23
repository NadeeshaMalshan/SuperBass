import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

import '@material/web/button/filled-button.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/progress/circular-progress.js';
import Loader from './components/Loader.jsx';

export default function WorkerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const workerId = urlParams.get('id');

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nav State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPicture, setUserPicture] = useState('');

  const getFirstName = (fullName) => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0];
  };

  // Hire / Booking Modal State
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [hireStep, setHireStep] = useState('form'); // 'form' | 'submitting' | 'success'
  const [createdBooking, setCreatedBooking] = useState(null);
  const [hireError, setHireError] = useState(null);

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    jobTitle: '',
    description: '',
    urgency: 'Medium',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '10:00',
    locationAddress: '',
    contactPhone: '',
    pricingModel: 'Hourly',
    estimatedPrice: ''
  });

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserName(localStorage.getItem('userName') || '');
    setUserPicture(localStorage.getItem('userPicture') || '');

    const fetchWorkerDetails = async () => {
      if (!workerId) {
        setError('No worker specified.');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`http://localhost:5237/api/workers/${workerId}`);
        setWorker(res.data);
        if (res.data) {
          const defaultTitle = res.data.skills && res.data.skills.length > 0
            ? `${res.data.skills[0].skillName} Service / Repair`
            : 'General Home Service';
          setBookingForm(prev => ({
            ...prev,
            jobTitle: defaultTitle,
            pricingModel: res.data.pricingModel || 'Hourly',
            estimatedPrice: res.data.hourlyRate || res.data.dailyRate || ''
          }));
        }
      } catch (err) {
        console.error('Error loading worker detail:', err);
        setError('Failed to load worker details.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkerDetails();
  }, [workerId]);

  const handleOpenHireModal = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please sign in or register to hire verified professionals.');
      navigate('/join');
      return;
    }
    setHireStep('form');
    setHireError(null);
    setIsHireModalOpen(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setHireStep('submitting');
    setHireError(null);

    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email');

    try {
      const combinedDateTime = new Date(`${bookingForm.scheduledDate}T${bookingForm.scheduledTime}:00`);

      const payload = {
        workerId: parseInt(workerId),
        residentEmail: userEmail,
        jobTitle: bookingForm.jobTitle,
        description: bookingForm.description,
        urgency: bookingForm.urgency,
        scheduledDate: combinedDateTime.toISOString(),
        locationAddress: bookingForm.locationAddress || 'Colombo, Sri Lanka',
        contactPhone: bookingForm.contactPhone || '0771234567',
        pricingModel: bookingForm.pricingModel,
        estimatedPrice: bookingForm.estimatedPrice ? parseFloat(bookingForm.estimatedPrice) : null
      };

      const res = await axios.post('http://localhost:5237/api/bookings', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setCreatedBooking(res.data);
      setHireStep('success');
    } catch (err) {
      console.error('Error submitting booking request:', err);
      const msg = err.response?.data?.message || 'Failed to submit booking request. Please try again.';
      setHireError(msg);
      setHireStep('form');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#6b7280' }}>
        <Loader />
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
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: 'var(--font-body)' }}>
      {/* Top Navbar */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>

        {/* Nav Actions */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center' }}>
          {isLoggedIn ? (
            <>
              <md-filled-button
                onClick={() => navigate('/community')}
                style={{
                  '--md-sys-color-primary': '#FDC101',
                  '--md-sys-color-on-primary': '#000000',
                  padding: '0 20px',
                  minWidth: '100px',
                  margin: '0 8px'
                }}
              >
                Community
              </md-filled-button>
              <md-filled-button
                onClick={() => navigate('/account')}
                style={{
                  '--md-sys-color-primary': '#111827',
                  '--md-sys-color-on-primary': '#ffffff',
                  padding: '0 16px',
                  margin: '0 0 0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {userPicture && <img slot="icon" src={userPicture} alt="User" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                {getFirstName(userName)}
              </md-filled-button>
            </>
          ) : (
            <md-filled-button
              onClick={() => navigate('/join')}
              style={{
                '--md-sys-color-primary': '#FDC101',
                '--md-sys-color-on-primary': '#000000',
                padding: '0 24px',
                margin: '0 0 0 8px'
              }}
            >
              Join
            </md-filled-button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>

          {/* Left Column: Worker Bio & Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Main Profile Header Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '32px',
                  backgroundColor: '#FDC101',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '3rem',
                  fontWeight: 800,
                  overflow: 'hidden'
                }}>
                  {worker.profileImage ? (
                    <img src={worker.profileImage} alt={worker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    worker.name ? worker.name.charAt(0).toUpperCase() : 'W'
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>{worker.name}</h1>
                    <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fef08a', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '16px', fontWeight: 700 }}>
                      <i className="fa-solid fa-shield-check" style={{ marginRight: '4px' }}></i> VERIFIED PRO
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '1rem', color: '#475569' }}>
                    <span><i className="fa-solid fa-location-dot" style={{ color: '#FDC101', marginRight: '6px' }}></i>{worker.primaryServiceArea || 'Colombo'}</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span><i className="fa-solid fa-arrows-spin" style={{ color: '#FDC101', marginRight: '6px' }}></i>{worker.coverageRadiusKm || 10} km radius</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#ca8a04', fontWeight: 800, fontSize: '1.1rem' }}>
                        {worker.completedJobs > 0 && worker.overallRating ? `★ ${worker.overallRating.toFixed(1)}` : 'New'}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, borderLeft: '1px solid #e2e8f0', paddingLeft: '8px', marginLeft: '4px' }}>
                        {worker.completedJobs || 0} jobs
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: worker.isAvailable !== false ? '#ecfccb' : '#fee2e2',
                      color: worker.isAvailable !== false ? '#4d7c0f' : '#991b1b',
                      padding: '8px 16px',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}>
                      {worker.isAvailable !== false ? '✓ Available for Hire' : '○ Currently Unavailable'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Description */}
              {worker.description && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800 }}>About {worker.name}</h4>
                  <p style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.7', margin: 0 }}>
                    {worker.description}
                  </p>
                </div>
              )}
            </div>

            {/* WHAT HE CAN DO (SKILLS) CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: '#fffbeb', color: '#b45309', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🛠️</span>
                What He Can Do (Trade Skills)
              </h2>

              {worker.skills && worker.skills.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {worker.skills.map((skill, idx) => (
                    <div key={idx} style={{ backgroundColor: '#ffffff', border: '1.5px solid #e2e8f0', padding: '16px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>{skill.skillName}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>{skill.experienceYears || 1}+ Years Experience</div>
                      </div>
                      <span style={{ backgroundColor: '#ecfccb', color: '#4d7c0f', width: '32px', height: '32px', clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>✓</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>General Handyman & Repair Services.</p>
              )}
            </div>

            {/* Performance Ratings Breakdown */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', marginBottom: '24px' }}>
                Client Ratings & Reliability
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                    <span style={{ color: '#334155', fontWeight: 700 }}>Quality & Craftsmanship</span>
                    <span style={{ color: '#b45309', fontWeight: 800 }}>
                      {worker.completedJobs > 0 && worker.qualityRating ? `★ ${worker.qualityRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.qualityRating ? `${(worker.qualityRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#FDC101', borderRadius: '9999px' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                    <span style={{ color: '#334155', fontWeight: 700 }}>Punctuality & Timeliness</span>
                    <span style={{ color: '#b45309', fontWeight: 800 }}>
                      {worker.completedJobs > 0 && worker.punctualityRating ? `★ ${worker.punctualityRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.punctualityRating ? `${(worker.punctualityRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#fde047', borderRadius: '9999px' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
                    <span style={{ color: '#334155', fontWeight: 700 }}>Communication & Professionalism</span>
                    <span style={{ color: '#b45309', fontWeight: 800 }}>
                      {worker.completedJobs > 0 && worker.communicationRating ? `★ ${worker.communicationRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.communicationRating ? `${(worker.communicationRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#fef08a', borderRadius: '9999px' }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Rates, Pricing & Hire CTA Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* RATES & PRICING CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800 }}>LKR</span>
                Service Rates & Pricing
              </h2>

              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700 }}>Pricing Model</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{worker.pricingModel || 'Hourly / Daily'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                {/* Hourly Rate */}
                <div style={{ backgroundColor: '#fffbebfb', padding: '20px', borderRadius: '20px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Hourly Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309' }}>
                    {worker.hourlyRate ? `Rs. ${worker.hourlyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Per Hour</div>
                </div>

                {/* Daily Rate */}
                <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Daily Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8' }}>
                    {worker.dailyRate ? `Rs. ${worker.dailyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Per Full Day</div>
                </div>
              </div>

              {/* Hire Button */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <md-filled-button
                  onClick={handleOpenHireModal}
                  style={{
                    width: '100%',
                    '--md-sys-color-primary': '#FDC101',
                    '--md-sys-color-on-primary': '#000000',
                    '--md-filled-button-container-height': '56px',
                    '--md-filled-button-label-text-font': 'inherit',
                    '--md-filled-button-label-text-size': '1.1rem',
                    '--md-filled-button-label-text-weight': '800'
                  }}
                >
                  Hire / Request Worker Now
                </md-filled-button>
              </div>
            </div>

            {/* Service Location Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px' }}>
                Service Location & Area
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Primary Location:</span>
                  <strong style={{ color: '#0f172a' }}>{worker.primaryServiceArea || 'Colombo'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Travel Radius:</span>
                  <strong style={{ color: '#0f172a' }}>Up to {worker.coverageRadiusKm || 10} km</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                  <span>Contact Phone:</span>
                  <strong style={{ color: '#1d4ed8' }}>{worker.phoneNo || 'Available upon booking'}</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ===================== HIRE & BOOKING MODAL ===================== */}
      {isHireModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            maxWidth: '620px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e5e7eb',
            position: 'relative'
          }}>

            {/* Modal Header */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafbfc'
            }}>
              <div>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ca8a04', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  SuperBass Verified Hire
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '4px 0 0 0', color: '#111827' }}>
                  Request Service from {worker.name}
                </h2>
              </div>

              <button
                onClick={() => setIsHireModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px 28px' }}>

              {/* STEP 1: FORM */}
              {hireStep === 'form' && (
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {hireError && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}>
                      ⚠ {hireError}
                    </div>
                  )}

                  {/* Preferred Date & Time */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.scheduledDate}
                        onChange={(e) => setBookingForm({ ...bookingForm, scheduledDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #d1d5db',
                          fontSize: '0.95rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                        Preferred Time
                      </label>
                      <input
                        type="time"
                        required
                        value={bookingForm.scheduledTime}
                        onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1.5px solid #d1d5db',
                          fontSize: '0.95rem',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingBottom: '8px' }}>
                    <md-outlined-button
                      type="button"
                      onClick={() => setIsHireModalOpen(false)}
                      style={{
                        flex: 1,
                        '--md-sys-color-primary': '#334155'
                      }}
                    >
                      Cancel
                    </md-outlined-button>
                    <md-filled-button
                      type="submit"
                      style={{
                        flex: 2,
                        '--md-sys-color-primary': '#FDC101',
                        '--md-sys-color-on-primary': '#000000',
                        '--md-filled-button-label-text-weight': '800'
                      }}
                    >
                      Submit Hire Request
                    </md-filled-button>
                  </div>
                </form>
              )}

              {/* STEP: SUBMITTING */}
              {hireStep === 'submitting' && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>Sending Hire Request...</h3>
                  <p style={{ color: '#6b7280', marginTop: '8px' }}>Setting up booking record and direct chat channel with {worker.name}.</p>
                </div>
              )}

              {/* STEP: SUCCESS & LIFECYCLE STEPPER */}
              {hireStep === 'success' && createdBooking && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Top Success Banner */}
                  <div style={{
                    backgroundColor: '#111827',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      backgroundColor: '#FDC101',
                      color: '#000000',
                      width: '40px',
                      height: '40px',
                      clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      fontWeight: 800
                    }}>
                      ✓
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: 800 }}>Booking Request Sent Successfully!</h4>
                      <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>
                        Booking #{createdBooking.id} is now queued for <strong>{worker.name}</strong> to review and accept.
                      </p>
                    </div>
                  </div>

                  {/* Interactive Booking Lifecycle Stepper */}
                  <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
                    <h5 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 700 }}>
                      Service Lifecycle Status
                    </h5>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                      {/* Step 1: Requested */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#000000',
                          color: '#FDC101',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800
                        }}>
                          ✓
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#111827', fontSize: '0.95rem' }}>1. Booking Requested</strong>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#000000', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Completed</span>
                        </div>
                      </div>

                      {/* Step 2: Worker Accepts / Rejects */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#FDC101',
                          color: '#000000',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          boxShadow: '0 0 0 4px rgba(253,193,1,0.2)'
                        }}>
                          2
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#000000', fontSize: '0.95rem' }}>2. Worker Accepts / Rejects</strong>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>In Progress (Worker notified)</span>
                        </div>
                      </div>

                      {/* Step 3: Confirmed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#cbd5e1',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          3
                        </div>
                        <div>
                          <strong style={{ color: '#475569', fontSize: '0.95rem' }}>3. Confirmed</strong>
                        </div>
                      </div>

                      {/* Step 4: In Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#cbd5e1',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          4
                        </div>
                        <div>
                          <strong style={{ color: '#475569', fontSize: '0.95rem' }}>4. In Progress</strong>
                        </div>
                      </div>

                      {/* Step 5: Completed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#cbd5e1',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          5
                        </div>
                        <div>
                          <strong style={{ color: '#475569', fontSize: '0.95rem' }}>5. Completed</strong>
                        </div>
                      </div>

                      {/* Step 6: Reviewed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#cbd5e1',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}>
                          6
                        </div>
                        <div>
                          <strong style={{ color: '#475569', fontSize: '0.95rem' }}>6. Reviewed</strong>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Direct Action Buttons */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <md-outlined-button
                      onClick={() => {
                        setIsHireModalOpen(false);
                        navigate('/chats');
                      }}
                      style={{
                        flex: 1,
                        '--md-sys-color-primary': '#111827'
                      }}
                    >
                      <i slot="icon" className="fa-regular fa-comment"></i>
                      Chat
                    </md-outlined-button>

                    <md-filled-button
                      onClick={() => {
                        setIsHireModalOpen(false);
                        navigate('/account?tab=bookings');
                      }}
                      style={{
                        flex: 1,
                        '--md-sys-color-primary': '#FDC101',
                        '--md-sys-color-on-primary': '#000000',
                        '--md-filled-button-label-text-weight': '800'
                      }}
                    >
                      <i slot="icon" className="fa-solid fa-list-check"></i>
                      View Bookings
                    </md-filled-button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
