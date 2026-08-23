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
        locationAddress: bookingForm.locationAddress || worker?.primaryServiceArea || '',
        contactPhone: bookingForm.contactPhone || '',
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
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: 'var(--font-body)' }}>
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
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          
          {/* Left Column: Worker Bio & Skills */}
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
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
                  overflow: 'hidden'
                }}>
                  {worker.profileImage ? (
                    <img src={worker.profileImage} alt={worker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    worker.name ? worker.name.charAt(0).toUpperCase() : 'W'
                  )}
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
                      {worker.completedJobs > 0 && worker.overallRating ? `★ ${worker.overallRating.toFixed(1)}` : 'No rating yet'}
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
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      {worker.completedJobs > 0 && worker.qualityRating ? `★ ${worker.qualityRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.qualityRating ? `${(worker.qualityRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#2563eb' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>Punctuality & Timeliness</span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      {worker.completedJobs > 0 && worker.punctualityRating ? `★ ${worker.punctualityRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.punctualityRating ? `${(worker.punctualityRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#0284c7' }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                    <span style={{ color: '#4b5563', fontWeight: 500 }}>Communication & Professionalism</span>
                    <span style={{ color: '#d97706', fontWeight: 700 }}>
                      {worker.completedJobs > 0 && worker.communicationRating ? `★ ${worker.communicationRating}/5.0` : 'N/A'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f3f4f6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: worker.completedJobs > 0 && worker.communicationRating ? `${(worker.communicationRating / 5) * 100}%` : '0%', height: '100%', backgroundColor: '#059669' }}></div>
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
                onClick={handleOpenHireModal}
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
                  transition: 'transform 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
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
            borderRadius: '20px',
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
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setIsHireModalOpen(false)}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1px solid #d1d5db',
                        backgroundColor: '#ffffff',
                        color: '#374151',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={{
                        flex: 2,
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#FDC101',
                        color: '#000000',
                        fontWeight: 800,
                        fontSize: '1rem',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(253,193,1,0.3)'
                      }}
                    >
                      Submit Hire Request ⚡
                    </button>
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
                    backgroundColor: '#ecfdf5',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '14px',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px'
                  }}>
                    <div style={{
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      fontWeight: 800
                    }}>
                      ✓
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: '#065f46', fontSize: '1.1rem', fontWeight: 800 }}>Booking Request Sent Successfully!</h4>
                      <p style={{ margin: '4px 0 0 0', color: '#047857', fontSize: '0.875rem' }}>
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
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
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
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Completed</span>
                        </div>
                      </div>

                      {/* Step 2: Worker Accepts / Rejects */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.85rem',
                          fontWeight: 800,
                          boxShadow: '0 0 0 4px rgba(37,99,235,0.2)'
                        }}>
                          2
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#2563eb', fontSize: '0.95rem' }}>2. Worker Accepts / Rejects</strong>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>In Progress (Worker notified)</span>
                        </div>
                      </div>

                      {/* Step 3: Confirmed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
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
                          borderRadius: '50%',
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
                          borderRadius: '50%',
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
                          borderRadius: '50%',
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
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setIsHireModalOpen(false);
                        navigate('/chats');
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: '1.5px solid #2563eb',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      💬 Chat with {worker.name}
                    </button>

                    <button
                      onClick={() => {
                        setIsHireModalOpen(false);
                        navigate('/account?tab=bookings');
                      }}
                      style={{
                        flex: 1,
                        padding: '14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      📋 View My Bookings
                    </button>
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
