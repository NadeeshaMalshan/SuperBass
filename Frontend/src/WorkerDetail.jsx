import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css';
import './Community.css';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/dialog/dialog.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import Loader from './components/Loader.jsx';
import M3TopNavbar from './components/M3TopNavbar.jsx';
import M3DatePickerDialog from './components/M3DatePickerDialog.jsx';
import { showToast } from './utils/toast.js';
import './components/M3Navbar.css';
import { API_BASE_URL } from './config.js';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

function ModalLocationMarker({ lat, lng, onSelect }) {
  const map = useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15);
    }
  }, [lat, lng, map]);

  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}


export default function WorkerDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const workerId = urlParams.get('id');

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  // Ensure page always starts scrolled to the very top on navigation
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    scrollToTop();
    const frameId = requestAnimationFrame(scrollToTop);
    const timer = setTimeout(scrollToTop, 80);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(timer);
    };
  }, [workerId]);

  // Keep view at the top once profile loading finishes and DOM content settles
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    }
  }, [loading]);

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
  const hireDialogRef = useRef(null);

  useEffect(() => {
    const dialog = hireDialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setIsHireModalOpen(false);
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  useEffect(() => {
    const dialog = hireDialogRef.current;
    if (dialog) {
      if (isHireModalOpen) {
        dialog.show();
      } else {
        dialog.close();
      }
    }
  }, [isHireModalOpen]);
  const [hireStep, setHireStep] = useState('form'); // 'form' | 'submitting' | 'success'
  const [createdBooking, setCreatedBooking] = useState(null);
  const [hireError, setHireError] = useState(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    jobTitle: '',
    description: '',
    urgency: 'Medium',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    locationAddress: '',
    locationLat: null,
    locationLng: null,
    shareGps: true,
    contactPhone: '',
    pricingModel: 'Hourly',
    estimatedPrice: ''
  });

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setBookingForm(prev => ({
            ...prev,
            locationLat: userLat,
            locationLng: userLng,
            shareGps: true
          }));
        },
        (err) => {
          console.warn('Geolocation error:', err);
          alert('Could not access current GPS location. Please check browser permissions.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported in this browser.');
    }
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
        const res = await axios.get(`${API_BASE_URL}/workers/${workerId}`);
        setWorker(res.data);
        if (res.data) {
          setBookingForm(prev => ({
            ...prev,
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

  // Fetch current logged-in resident's profile for phone, address & GPS autofill
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email');
    if (!userEmail) return;

    const fetchUserProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data) {
          const userPhone = res.data.phoneNo || localStorage.getItem('phoneNo') || localStorage.getItem('userPhone') || '';
          const userAddr = res.data.address || localStorage.getItem('address') || localStorage.getItem('userAddress') || '';
          const userLat = res.data.locationLat || (localStorage.getItem('locationLat') ? parseFloat(localStorage.getItem('locationLat')) : null);
          const userLng = res.data.locationLng || (localStorage.getItem('locationLng') ? parseFloat(localStorage.getItem('locationLng')) : null);

          setBookingForm(prev => ({
            ...prev,
            contactPhone: prev.contactPhone || userPhone,
            locationAddress: prev.locationAddress || userAddr,
            locationLat: prev.locationLat || userLat,
            locationLng: prev.locationLng || userLng,
            shareGps: (userLat && userLng) ? true : prev.shareGps
          }));
        }
      } catch (err) {
        const fallbackPhone = localStorage.getItem('phoneNo') || localStorage.getItem('userPhone') || '';
        const fallbackAddr = localStorage.getItem('address') || localStorage.getItem('userAddress') || '';
        const fallbackLat = localStorage.getItem('locationLat') ? parseFloat(localStorage.getItem('locationLat')) : null;
        const fallbackLng = localStorage.getItem('locationLng') ? parseFloat(localStorage.getItem('locationLng')) : null;
        if (fallbackPhone || fallbackAddr || fallbackLat) {
          setBookingForm(prev => ({
            ...prev,
            contactPhone: prev.contactPhone || fallbackPhone,
            locationAddress: prev.locationAddress || fallbackAddr,
            locationLat: prev.locationLat || fallbackLat,
            locationLng: prev.locationLng || fallbackLng,
            shareGps: (fallbackLat && fallbackLng) ? true : prev.shareGps
          }));
        }
      }
    };

    fetchUserProfile();
  }, [isLoggedIn]);

  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const isWorker = activeRole.toLowerCase() === 'worker' || localStorage.getItem('workerAuth') === 'true';

  const handleChatWithWorker = () => {
    if (isWorker) {
      alert('Workers cannot initiate direct chats with other workers. Chatting is only available between residents and workers.');
      return;
    }
    navigate(`/chats?workerId=${workerId}`);
  };

  const handleOpenHireModal = async () => {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email');
    if (!token) {
      alert('Please sign in or register to hire verified professionals.');
      navigate('/join');
      return;
    }

    if (isWorker) {
      alert('Workers are not permitted to hire or request services from other workers. Please switch to a Resident account to hire professionals.');
      return;
    }

    // Refresh autofill values from user profile (localStorage or API)
    const localPhone = localStorage.getItem('phoneNo') || localStorage.getItem('userPhone') || '';
    const localAddr = localStorage.getItem('address') || localStorage.getItem('userAddress') || '';
    const localLat = localStorage.getItem('locationLat') ? parseFloat(localStorage.getItem('locationLat')) : null;
    const localLng = localStorage.getItem('locationLng') ? parseFloat(localStorage.getItem('locationLng')) : null;

    let userPhone = localPhone;
    let userAddr = localAddr;
    let userLat = localLat;
    let userLng = localLng;

    if (userEmail) {
      try {
        const res = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          userPhone = res.data.phoneNo || userPhone;
          userAddr = res.data.address || userAddr;
          userLat = res.data.locationLat ?? userLat;
          userLng = res.data.locationLng ?? userLng;
        }
      } catch (e) {
        console.warn('Profile autofill fallback applied', e);
      }
    }

    setBookingForm(prev => ({
      ...prev,
      contactPhone: userPhone,
      locationAddress: userAddr,
      locationLat: userLat,
      locationLng: userLng,
      shareGps: (userLat && userLng) ? true : false
    }));

    setHireStep('form');
    setHireError(null);
    setIsHireModalOpen(true);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setHireStep('submitting');
    setHireError(null);

    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('email') || localStorage.getItem('userEmail') || 'resident@workio.lk';

    // Validation: Date cannot be before today
    const todayStr = new Date().toISOString().split('T')[0];
    if (!bookingForm.scheduledDate || bookingForm.scheduledDate < todayStr) {
      setHireError('You cannot select a date in the past. Please choose today or an upcoming date.');
      setHireStep('form');
      return;
    }

    try {
      const scheduledDateTime = new Date(`${bookingForm.scheduledDate}T00:00:00Z`);

      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test((bookingForm.contactPhone || '').trim())) {
        setHireError('Phone number must be exactly 10 digits starting with 0 (e.g., 0771234567).');
        setHireStep('form');
        return;
      }

      let finalAddress = bookingForm.locationAddress || '';
      let updatedDesc = bookingForm.description;

      const payload = {
        workerId: parseInt(workerId),
        residentEmail: userEmail,
        jobTitle: bookingForm.jobTitle,
        description: updatedDesc,
        urgency: bookingForm.urgency,
        scheduledDate: scheduledDateTime.toISOString(),
        locationAddress: finalAddress,
        locationLat: bookingForm.shareGps ? bookingForm.locationLat : null,
        locationLng: bookingForm.shareGps ? bookingForm.locationLng : null,
        contactPhone: bookingForm.contactPhone || '',
        pricingModel: bookingForm.pricingModel,
        estimatedPrice: bookingForm.estimatedPrice ? parseFloat(bookingForm.estimatedPrice) : null
      };

      let res;
      try {
        res = await axios.post(`${API_BASE_URL}/bookings`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } catch (postErr) {
        if (postErr.response?.status === 401) {
          // Retry without stale/expired token
          res = await axios.post(`${API_BASE_URL}/bookings`, payload);
        } else {
          throw postErr;
        }
      }

      setCreatedBooking(res.data);
      showToast('Booking request sent successfully!');
      setHireStep('success');
    } catch (err) {
      console.error('Error submitting booking request:', err);
      const msg = err.response?.data?.message || 'Failed to submit booking request. Please try again.';
      setHireError(msg);
      setHireStep('form');
    }
  };

  const renderGoogleRatingBar = (label, iconName, rating) => {
    const hasData = rating != null && rating > 0;
    const scoreVal = hasData ? Number(rating) : null;
    const scoreText = hasData ? scoreVal.toFixed(1) : 'Not rated';
    const percentage = hasData ? Math.min(100, Math.max(0, (scoreVal / 5) * 100)) : 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <md-icon style={{ fontSize: '18px', color: '#ffffff' }}>{iconName}</md-icon>
            </div>
            <span style={{ color: '#000000', fontWeight: 700, fontSize: '0.95rem' }}>{label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 5 Stars */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const diff = (scoreVal || 0) - star;
                const isFull = diff >= 0;
                const isHalf = !isFull && diff >= -0.5;

                return (
                  <i
                    key={star}
                    className="fa-solid fa-star"
                    style={{
                      fontSize: '14px',
                      color: hasData && (isFull || isHalf) ? '#f59e0b' : '#e5e7eb'
                    }}
                  />
                );
              })}
            </div>

            <span style={{ color: hasData ? '#000000' : '#737373', fontWeight: 800, fontSize: '0.88rem', minWidth: '40px', textAlign: 'right' }}>
              {scoreText}
            </span>
          </div>
        </div>

        {/* Uber/Community Style Progress Bar */}
        <div style={{ width: '100%', height: '7px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: '#000000',
              borderRadius: '9999px',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="community-page-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#6b7280' }}>
        <Loader />
        <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#000000' }}>Loading worker profile...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="community-page-wrapper" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', textAlign: 'center' }}>
        <h2 style={{ fontWeight: 800, fontSize: '1.8rem', color: '#000000' }}>Worker Profile Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error || 'The requested worker could not be found.'}</p>
        <button className="uber-btn-primary" onClick={() => navigate('/find')}>
          <i className="fa-solid fa-arrow-left"></i>
          <span>Back to Services</span>
        </button>
      </div>
    );
  }

  return (
    <div className="community-page-wrapper">
      {/* 1. Community-Style Pitch Black Hero Showcase Banner */}
      <section className="community-hero-banner" style={{ padding: '40px 32px 48px', marginBottom: '32px' }}>
        <div className="community-hero-container" style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <div className="community-hero-left" style={{ maxWidth: '720px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="community-hero-secondary-btn"
                onClick={() => navigate('/find')}
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-arrow-left"></i>
                <span>Back to Services</span>
              </button>
              <span className="community-hero-overline" style={{ margin: 0 }}>
                WORKIO PRO NETWORK • CRAFTSMAN PROFILE
              </span>
            </div>

            <h1 className="community-hero-title" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.1rem)', margin: '0 0 12px 0' }}>
              {worker.name}
            </h1>

            <p className="community-hero-desc" style={{ margin: '0 0 24px 0', maxWidth: '640px' }}>
              {worker.description || `Certified professional handyman & craftsman serving ${worker.primaryServiceArea || 'Colombo'} and nearby regions.`}
            </p>

            <div className="community-hero-actions">
              {!isWorker && isLoggedIn && (
                <button
                  type="button"
                  className="community-hero-primary-btn"
                  onClick={handleOpenHireModal}
                >
                  <i className="fa-solid fa-handshake"></i>
                  <span>Hire / Request Worker</span>
                </button>
              )}

              {!isWorker && isLoggedIn && (
                <button
                  type="button"
                  className="community-hero-secondary-btn"
                  onClick={handleChatWithWorker}
                >
                  <i className="fa-regular fa-comment-dots"></i>
                  <span>Chat with {getFirstName(worker.name)}</span>
                </button>
              )}

              {/* Status pill in Hero */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                padding: '8px 16px',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: worker.isAvailable !== false ? '#4ade80' : '#facc15'
                }}></span>
                <span>{worker.isAvailable !== false ? 'Available for Hire' : 'Currently on Job'}</span>
              </div>
            </div>
          </div>

          <div className="community-hero-right" style={{ flex: '0 0 280px', maxWidth: '300px', display: 'flex', justifyContent: 'center' }}>
            <div style={{
              width: '160px',
              height: '160px',
              borderRadius: '28px',
              backgroundColor: '#1f1f1f',
              border: '3px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '4rem',
              fontWeight: 800
            }}>
              {(worker.profileImage && !imgError) ? (
                <img 
                  src={worker.profileImage} 
                  alt={worker.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={() => setImgError(true)} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                worker.name ? worker.name.charAt(0).toUpperCase() : 'W'
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '28px', alignItems: 'start' }}>

          {/* Left Column: Worker Bio & Skills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* Main Profile Header Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '20px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {(worker.profileImage && !imgError) ? (
                    <img 
                      src={worker.profileImage} 
                      alt={worker.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      onError={() => setImgError(true)} 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    worker.name ? worker.name.charAt(0).toUpperCase() : 'W'
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, color: '#000000', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {worker.name}
                      {worker.isVerified && (
                        <md-icon style={{ fontSize: '20px', color: '#000000' }} title="Verified Home Craftsman">verified</md-icon>
                      )}
                    </h2>
                    {worker.isVerified ? (
                      <span style={{
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}>
                        <md-icon style={{ fontSize: '15px', color: '#ffffff' }}>verified</md-icon>
                        VERIFIED PRO
                      </span>
                    ) : (
                      <span style={{
                        backgroundColor: '#f5f5f5',
                        color: '#737373',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        border: '1px solid #e5e5e5'
                      }}>
                        <i className="fa-regular fa-clock" style={{ color: '#737373' }}></i>
                        PENDING VERIFICATION
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', fontSize: '0.92rem', color: '#737373', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: '#000000' }}></i>
                      {worker.primaryServiceArea || 'Colombo'}
                    </span>
                    <span style={{ color: '#d4d4d4' }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-bullseye" style={{ color: '#737373' }}></i>
                      {worker.coverageRadiusKm || 10} km service radius
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
                    {/* Rating Pill */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#f5f5f5',
                      border: '1px solid #e5e5e5',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                      color: '#000000',
                      fontSize: '0.9rem'
                    }}>
                      {worker.overallRating != null && worker.overallRating > 0 ? (
                        <>
                          <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
                          <span>{worker.overallRating.toFixed(1)}</span>
                          <span style={{ color: '#737373', fontWeight: 600, borderLeft: '1px solid #d4d4d4', paddingLeft: '8px', marginLeft: '2px', fontSize: '0.82rem' }}>
                            {worker.completedJobs > 0 ? `${worker.completedJobs} jobs` : 'Verified Pro'}
                          </span>
                        </>
                      ) : (
                        <>
                          <i className="fa-regular fa-star" style={{ color: '#9ca3af' }}></i>
                          <span style={{ color: '#525252' }}>No ratings yet</span>
                          <span style={{ color: '#737373', fontWeight: 600, borderLeft: '1px solid #d4d4d4', paddingLeft: '8px', marginLeft: '2px', fontSize: '0.82rem' }}>
                            {worker.completedJobs > 0 ? `${worker.completedJobs} jobs` : 'New Pro'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Availability Pill */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: worker.isAvailable !== false ? '#ecfdf5' : '#fef2f2',
                      color: worker.isAvailable !== false ? '#047857' : '#b91c1c',
                      border: worker.isAvailable !== false ? '1px solid #a7f3d0' : '1px solid #fecaca',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 700
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: worker.isAvailable !== false ? '#10b981' : '#ef4444'
                      }}></span>
                      {worker.isAvailable !== false ? 'Available for Hire' : 'Currently Busy'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Description */}
              {worker.description && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '20px', marginTop: '20px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#a3a3a3',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'block',
                    marginBottom: '8px'
                  }}>
                    ABOUT {worker.name}
                  </span>
                  <p style={{ color: '#374151', fontSize: '0.98rem', lineHeight: '1.65', margin: 0 }}>
                    {worker.description}
                  </p>
                </div>
              )}
            </div>

            {/* WHAT HE CAN DO (SKILLS) CARD */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px 0', color: '#000000', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem'
                }}>
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </span>
                What He Can Do (Trade Skills)
              </h2>

              {worker.skills && worker.skills.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {worker.skills.map((skill, idx) => {
                    const serviceTitle = skill.serviceName || skill.skillName;
                    const subSkills = Array.isArray(skill.skills) ? skill.skills : [];

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#fafafa',
                          border: '1px solid #e5e5e5',
                          padding: '18px',
                          borderRadius: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#000000', fontSize: '1.05rem' }}>{serviceTitle}</div>
                            <div style={{ fontSize: '0.82rem', color: '#737373', marginTop: '2px', fontWeight: 600 }}>
                              {skill.experienceYears <= 0 ? 'Less than 1 Year Experience' : `${skill.experienceYears || 1}+ Years Experience`}
                            </div>
                          </div>
                          <span style={{
                            backgroundColor: '#000000',
                            color: '#ffffff',
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 800
                          }}>
                            ✓
                          </span>
                        </div>

                        {subSkills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
                            {subSkills.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  fontSize: '0.78rem',
                                  backgroundColor: '#ffffff',
                                  color: '#000000',
                                  border: '1px solid #d4d4d4',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  fontWeight: 600
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#737373', margin: 0, fontSize: '0.95rem' }}>General Handyman & Repair Services.</p>
              )}
            </div>

            {/* Google-Style Client Ratings & Reliability Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.95rem'
                    }}>
                      <i className="fa-solid fa-star"></i>
                    </span>
                    Client Ratings & Reliability
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#737373' }}>
                    Verified community performance & satisfaction metrics
                  </span>
                </div>

                {/* Aggregate Rating Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  backgroundColor: '#fafafa',
                  border: '1px solid #e5e5e5',
                  padding: '12px 20px',
                  borderRadius: '16px'
                }}>
                  {worker.overallRating != null && worker.overallRating > 0 ? (
                    <>
                      <div style={{ fontSize: '2rem', fontWeight: 900, color: '#000000', lineHeight: 1 }}>
                        {worker.overallRating.toFixed(1)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i
                              key={star}
                              className="fa-solid fa-star"
                              style={{
                                fontSize: '15px',
                                color: (worker.overallRating >= star || worker.overallRating >= star - 0.5) ? '#f59e0b' : '#e5e7eb'
                              }}
                            />
                          ))}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#737373', marginTop: '4px' }}>
                          Verified Rating • {worker.completedJobs || 0} Jobs Done
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#737373', lineHeight: 1 }}>
                        —
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <i key={star} className="fa-solid fa-star" style={{ fontSize: '15px', color: '#e5e7eb' }}></i>
                          ))}
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#737373', marginTop: '4px' }}>
                          No reviews yet • {worker.completedJobs > 0 ? `${worker.completedJobs} jobs completed` : 'New Professional'}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rating Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderGoogleRatingBar('Quality & Craftsmanship', 'handyman', worker.qualityRating)}
                {renderGoogleRatingBar('Punctuality & Timeliness', 'schedule', worker.punctualityRating)}
                {renderGoogleRatingBar('Communication & Professionalism', 'forum', worker.communicationRating)}
              </div>
            </div>

          </div>

          {/* Right Column: Rates, Pricing & Hire CTA Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* RATES & PRICING CARD */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 20px 0', color: '#000000', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem'
                }}>
                  <i className="fa-solid fa-receipt"></i>
                </span>
                Service Rates & Pricing
              </h2>

              <div style={{ backgroundColor: '#fafafa', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e5e5e5', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.75rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px', fontWeight: 800 }}>Pricing Model</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000' }}>{worker.pricingModel || 'Hourly / Daily'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '28px' }}>
                {/* Hourly Rate */}
                <div style={{ backgroundColor: '#fafafa', padding: '18px 14px', borderRadius: '16px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#737373', marginBottom: '6px', fontWeight: 700 }}>Hourly Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.02em' }}>
                    {worker.hourlyRate ? `Rs. ${worker.hourlyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#a3a3a3', marginTop: '4px', fontWeight: 600 }}>Per Hour</div>
                </div>

                {/* Daily Rate */}
                <div style={{ backgroundColor: '#fafafa', padding: '18px 14px', borderRadius: '16px', border: '1px solid #e5e5e5', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#737373', marginBottom: '6px', fontWeight: 700 }}>Daily Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.02em' }}>
                    {worker.dailyRate ? `Rs. ${worker.dailyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#a3a3a3', marginTop: '4px', fontWeight: 600 }}>Per Full Day</div>
                </div>
              </div>

              {/* Hire and Chat Buttons or Worker Notice */}
              {isWorker ? (
                <div style={{
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e5e5e5',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#000000', fontWeight: 800, fontSize: '0.95rem' }}>
                    <i className="fa-solid fa-id-badge"></i>
                    Worker Profile Active
                  </div>
                  <p style={{ margin: 0, color: '#525252', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    You are viewing this profile as a <strong>Worker</strong>. Direct hiring and chatting are restricted between workers and are exclusively available for <strong>Resident</strong> accounts.
                  </p>
                  <button
                    type="button"
                    className="uber-btn-outline"
                    onClick={() => navigate('/bookings')}
                    style={{ width: '100%', marginTop: '6px' }}
                  >
                    <i className="fa-regular fa-calendar"></i>
                    <span>View My Jobs & Bookings</span>
                  </button>
                </div>
              ) : !isLoggedIn ? (
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e5e5',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  textAlign: 'center'
                }}>
                  <p style={{ margin: 0, color: '#737373', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    Please sign in to your account to book services or chat with {getFirstName(worker.name)}.
                  </p>
                  <button
                    type="button"
                    className="uber-btn-primary"
                    onClick={() => navigate('/find')}
                    style={{ width: '100%' }}
                  >
                    Sign In to Book
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <button
                    type="button"
                    className="uber-btn-primary"
                    onClick={handleOpenHireModal}
                    style={{
                      width: '100%',
                      padding: '16px 24px',
                      fontSize: '1.02rem',
                      fontWeight: 800,
                      borderRadius: '9999px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: '1.5px solid #000000',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-handshake"></i>
                    <span>Hire / Request Worker Now</span>
                  </button>

                  <button
                    type="button"
                    className="uber-btn-outline"
                    onClick={handleChatWithWorker}
                    style={{
                      width: '100%',
                      padding: '14px 24px',
                      fontSize: '1rem',
                      fontWeight: 700,
                      borderRadius: '9999px',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      border: '1.5px solid #000000',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-regular fa-comment-dots"></i>
                    <span>Chat with {getFirstName(worker.name)}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Service Location Card */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid #e5e5e5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.95rem'
                }}>
                  <i className="fa-solid fa-location-dot"></i>
                </span>
                Service Location & Area
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#737373' }}>
                  <span>Primary Location:</span>
                  <strong style={{ color: '#000000' }}>{worker.primaryServiceArea || 'Colombo'}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#737373' }}>
                  <span>Travel Radius:</span>
                  <strong style={{ color: '#000000' }}>Up to {worker.coverageRadiusKm || 10} km</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#737373' }}>
                  <span>Contact Phone:</span>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: '#059669', 
                    backgroundColor: '#ecfdf5', 
                    border: '1px solid #a7f3d0', 
                    padding: '3px 10px', 
                    borderRadius: '8px', 
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}>
                    <i className="fa-solid fa-lock" style={{ fontSize: '0.75rem' }}></i>
                    Private • Shared via chat upon booking
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* ===================== HIRE & BOOKING MODAL ===================== */}
      {createPortal(
        <md-dialog ref={hireDialogRef} style={{
          '--md-dialog-container-color': '#ffffff',
          '--md-dialog-container-shape': '28px',
          fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
          position: 'fixed',
          inset: 0,
          margin: 'auto',
          zIndex: 10000,
          minWidth: '320px',
          maxWidth: '620px',
          width: '100%'
        }}>
          {/* Modal Header */}
          <div slot="headline" style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '24px 24px 16px 24px',
            boxSizing: 'border-box',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#111827', lineHeight: 1.2, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                Request Service from {worker?.name}
              </h2>
            </div>

            <md-icon-button onClick={() => setIsHireModalOpen(false)} style={{ margin: '-4px -8px 0 0' }}>
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>

          {/* Modal Body */}
          <div slot="content" style={{ padding: '20px 24px 24px 24px', boxSizing: 'border-box', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>

            {/* STEP 1: FORM */}
            {hireStep === 'form' && (
              <form onSubmit={handleBookingSubmit} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '20px',
                '--md-sys-color-primary': '#0f172a',
                '--md-sys-color-outline': '#cbd5e1',
                '--md-sys-color-on-surface': '#111827',
                '--md-sys-color-on-surface-variant': '#475569'
              }}>

                {hireError && (
                  <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <md-icon style={{ fontSize: '18px', color: '#991b1b' }}>error</md-icon>
                    {hireError}
                  </div>
                )}

                {/* Job Title */}
                <md-outlined-text-field
                  type="text"
                  label="Job Title"
                  required
                  value={bookingForm.jobTitle}
                  onInput={(e) => setBookingForm({ ...bookingForm, jobTitle: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <md-icon slot="leading-icon">work_outline</md-icon>
                </md-outlined-text-field>

                {/* Description */}
                <md-outlined-text-field
                  type="textarea"
                  label="Description / Scope of Work"
                  required
                  rows="3"
                  value={bookingForm.description}
                  onInput={(e) => setBookingForm({ ...bookingForm, description: e.target.value })}
                  style={{ width: '100%' }}
                />

                {/* Urgency & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <md-outlined-select
                    label="Urgency"
                    required
                    value={bookingForm.urgency}
                    onInput={(e) => setBookingForm({ ...bookingForm, urgency: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <md-icon slot="leading-icon">priority_high</md-icon>
                    <md-select-option value="Low">
                      <div slot="headline">Low (Flexible)</div>
                    </md-select-option>
                    <md-select-option value="Medium">
                      <div slot="headline">Medium (Standard)</div>
                    </md-select-option>
                    <md-select-option value="High">
                      <div slot="headline">High (Urgent)</div>
                    </md-select-option>
                  </md-outlined-select>

                  <md-outlined-text-field
                    type="tel"
                    label="Contact Phone (10 digits)"
                    required
                    maxLength={10}
                    value={bookingForm.contactPhone}
                    error={bookingForm.contactPhone ? !/^0\d{9}$/.test(bookingForm.contactPhone) : false}
                    error-text={bookingForm.contactPhone && !/^0\d{9}$/.test(bookingForm.contactPhone) ? "Must be 10 digits starting with 0" : ""}
                    onInput={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setBookingForm({ ...bookingForm, contactPhone: clean });
                    }}
                    style={{ width: '100%' }}
                  >
                    <md-icon slot="leading-icon">phone</md-icon>
                  </md-outlined-text-field>
                </div>

                {/* Preferred Date (M3 Picker) */}
                <div
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => setIsDatePickerOpen(true)}
                  title="Click to select date"
                >
                  <md-outlined-text-field
                    type="text"
                    label="Preferred Date"
                    required
                    readOnly
                    value={formatDisplayDate(bookingForm.scheduledDate)}
                    style={{ width: '100%' }}
                  >
                    <md-icon slot="leading-icon">calendar_today</md-icon>
                    <md-icon slot="trailing-icon">edit_calendar</md-icon>
                  </md-outlined-text-field>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDatePickerOpen(true);
                    }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 10,
                      cursor: 'pointer'
                    }}
                  />
                </div>

                {/* Location */}
                <md-outlined-text-field
                  type="text"
                  label="Location Address"
                  required
                  value={bookingForm.locationAddress}
                  onInput={(e) => setBookingForm({ ...bookingForm, locationAddress: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <md-icon slot="leading-icon">location_on</md-icon>
                </md-outlined-text-field>

                {/* GPS Location Share & Map Picker (M3 Component) */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const newShare = !bookingForm.shareGps;
                        setBookingForm(prev => ({ ...prev, shareGps: newShare }));
                        if (newShare && (!bookingForm.locationLat || !bookingForm.locationLng)) {
                          setShowMapPicker(true);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        margin: 0,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: bookingForm.shareGps ? '2px solid #0f172a' : '2px solid #cbd5e1',
                          backgroundColor: bookingForm.shareGps ? '#0f172a' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        {bookingForm.shareGps && (
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#ffffff', fontWeight: 'bold' }}>
                            check
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <md-icon style={{ fontSize: '18px', color: '#0f172a' }}>my_location</md-icon>
                          Share saved GPS location
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {bookingForm.locationLat && bookingForm.locationLng ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <md-icon style={{ fontSize: '15px', color: '#0f172a' }}>pin_drop</md-icon>
                              Saved Pin: <strong>{bookingForm.locationLat.toFixed(5)}, {bookingForm.locationLng.toFixed(5)}</strong>
                            </span>
                          ) : (
                            <span>No GPS coordinates saved. Pick on map to attach.</span>
                          )}
                        </div>
                      </div>
                    </button>

                    <md-text-button
                      type="button"
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      style={{
                        '--md-sys-color-primary': '#0f172a',
                        '--md-text-button-label-text-weight': '700',
                        '--md-text-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)"
                      }}
                    >
                      <md-icon slot="icon">{showMapPicker ? 'expand_less' : 'map'}</md-icon>
                      {showMapPicker ? 'Hide Map' : (bookingForm.locationLat ? 'View / Change Pin' : 'Pick on Map')}
                    </md-text-button>
                  </div>

                  {/* Expandable Interactive Map & Geolocation */}
                  {showMapPicker && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.82rem', color: '#64748b' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <md-icon style={{ fontSize: '15px', color: '#0f172a' }}>touch_app</md-icon>
                          Tap / click anywhere on the map to change coordinates
                        </span>
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
                          }}
                        >
                          <md-icon style={{ fontSize: '15px' }}>gps_fixed</md-icon>
                          Use Device GPS
                        </button>
                      </div>

                      <div style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', position: 'relative' }}>
                        <MapContainer
                          center={[bookingForm.locationLat || 6.9271, bookingForm.locationLng || 79.8612]}
                          zoom={bookingForm.locationLat ? 15 : 11}
                          style={{ height: '100%', width: '100%', zIndex: 1 }}
                        >
                          <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          />
                          <ModalLocationMarker
                            lat={bookingForm.locationLat}
                            lng={bookingForm.locationLng}
                            onSelect={(lat, lng) => {
                              setBookingForm(prev => ({
                                ...prev,
                                locationLat: lat,
                                locationLng: lng,
                                shareGps: true
                              }));
                            }}
                          />
                        </MapContainer>
                      </div>

                      {bookingForm.locationLat && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ color: '#0f172a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <md-icon style={{ fontSize: '16px', color: '#0f172a' }}>location_on</md-icon>
                            Selected: <strong>{bookingForm.locationLat.toFixed(6)}</strong>, <strong>{bookingForm.locationLng.toFixed(6)}</strong>
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${bookingForm.locationLat},${bookingForm.locationLng}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            Open in Google Maps <md-icon style={{ fontSize: '14px' }}>open_in_new</md-icon>
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Pricing Info (Read-only) */}
                <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <md-icon style={{ fontSize: '18px', color: '#0f172a' }}>payments</md-icon>
                    Pricing Model
                  </span>
                  <strong style={{ color: '#111827' }}>{bookingForm.pricingModel} {bookingForm.estimatedPrice ? `(${bookingForm.estimatedPrice})` : ''}</strong>
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', marginTop: '8px' }}>
                  <md-filled-button
                    type="submit"
                    style={{
                      width: '100%',
                      '--md-sys-color-primary': '#000000',
                      '--md-sys-color-on-primary': '#ffffff',
                      '--md-filled-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)",
                      '--md-filled-button-label-text-weight': '800',
                      '--md-filled-button-container-height': '48px'
                    }}
                  >
                    <md-icon slot="icon">send</md-icon>
                    Submit Hire Request
                  </md-filled-button>
                </div>
              </form>
            )}

            {/* STEP: SUBMITTING */}
            {hireStep === 'submitting' && (
              <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <md-circular-progress indeterminate style={{ '--md-circular-progress-size': '48px', '--md-sys-color-primary': '#FDC101' }}></md-circular-progress>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>Sending Hire Request...</h3>
                  <p style={{ color: '#6b7280', marginTop: '8px', fontSize: '0.95rem' }}>Setting up booking record and direct chat channel with {worker.name}.</p>
                </div>
              </div>
            )}

            {/* STEP: SUCCESS & LIFECYCLE STEPPER */}
            {hireStep === 'success' && createdBooking && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Top Success Banner */}
                <div style={{
                  backgroundColor: '#000000',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px'
                }}>
                  <div style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <md-icon style={{ fontSize: '24px', color: '#000000' }}>check_circle</md-icon>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: '#ffffff', fontSize: '1.1rem', fontWeight: 800, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>Booking Request Sent Successfully!</h4>
                    <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>
                      Booking #{createdBooking.id} is now queued for <strong>{worker.name}</strong> to review and accept.
                    </p>
                  </div>
                </div>

                {/* Interactive Booking Lifecycle Stepper */}
                <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
                  <h5 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', fontWeight: 700, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                    Service Status
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Step 1: Requested */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <md-icon style={{ fontSize: '18px', color: '#ffffff' }}>check</md-icon>
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#000000', fontSize: '0.95rem' }}>1. Booking Requested</strong>
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#000000', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Completed</span>
                      </div>
                    </div>

                    {/* Step 2: Worker Accepts / Rejects */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        boxShadow: '0 0 0 4px rgba(0,0,0,0.1)'
                      }}>
                        2
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#000000', fontSize: '0.95rem' }}>2. Worker Accepts / Rejects</strong>
                        <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#000000', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>In Progress (Worker notified)</span>
                      </div>
                    </div>

                    {/* Step 3: Confirmed */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.6 }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
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
                        borderRadius: '8px',
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
                        borderRadius: '8px',
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
                        borderRadius: '8px',
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
                      '--md-sys-color-primary': '#111827',
                      '--md-outlined-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)"
                    }}
                  >
                    <md-icon slot="icon">chat</md-icon>
                    Chat
                  </md-outlined-button>

                  <md-filled-button
                    onClick={() => {
                      setIsHireModalOpen(false);
                      navigate('/bookings');
                    }}
                    style={{
                      flex: 1,
                      '--md-sys-color-primary': '#111827',
                      '--md-sys-color-on-primary': '#ffffff',
                      '--md-filled-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)",
                      '--md-filled-button-label-text-weight': '800'
                    }}
                  >
                    <md-icon slot="icon">receipt_long</md-icon>
                    View Bookings
                  </md-filled-button>
                </div>

              </div>
            )}

            {/* ===================== MATERIAL 3 DATE & TIME PICKERS ===================== */}
            <M3DatePickerDialog
              isOpen={isDatePickerOpen}
              onClose={() => setIsDatePickerOpen(false)}
              selectedDate={bookingForm.scheduledDate}
              minDate={new Date().toISOString().split('T')[0]}
              onSelectDate={(newDate) => {
                setBookingForm(prev => ({ ...prev, scheduledDate: newDate }));
                setHireError(null);
              }}
            />

          </div>
        </md-dialog>,
        document.body
      )}

    </div>
  );
}
