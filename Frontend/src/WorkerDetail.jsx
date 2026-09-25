import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css';

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
import M3TimePickerDialog from './components/M3TimePickerDialog.jsx';
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
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    jobTitle: '',
    description: '',
    urgency: 'Medium',
    scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    scheduledTime: '10:00',
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
    navigate('/chats');
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

    // Refresh autofill values from localStorage or API
    const localPhone = localStorage.getItem('phoneNo') || localStorage.getItem('userPhone') || '';
    const localAddr = localStorage.getItem('address') || localStorage.getItem('userAddress') || '';
    const localLat = localStorage.getItem('locationLat') ? parseFloat(localStorage.getItem('locationLat')) : null;
    const localLng = localStorage.getItem('locationLng') ? parseFloat(localStorage.getItem('locationLng')) : null;

    setBookingForm(prev => ({
      ...prev,
      contactPhone: prev.contactPhone || localPhone,
      locationAddress: prev.locationAddress || localAddr,
      locationLat: prev.locationLat || localLat,
      locationLng: prev.locationLng || localLng
    }));

    if (userEmail && (!bookingForm.contactPhone || !bookingForm.locationAddress || !bookingForm.locationLat)) {
      try {
        const res = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data) {
          setBookingForm(prev => ({
            ...prev,
            contactPhone: prev.contactPhone || res.data.phoneNo || localPhone,
            locationAddress: prev.locationAddress || res.data.address || localAddr,
            locationLat: prev.locationLat || res.data.locationLat || localLat,
            locationLng: prev.locationLng || res.data.locationLng || localLng,
            shareGps: (res.data.locationLat && res.data.locationLng) ? true : prev.shareGps
          }));
        }
      } catch (e) {
        console.warn('Profile autofill fallback applied', e);
      }
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

    // Validation: Date cannot be before today
    const todayStr = new Date().toISOString().split('T')[0];
    if (!bookingForm.scheduledDate || bookingForm.scheduledDate < todayStr) {
      setHireError('You cannot select a date in the past. Please choose today or an upcoming date.');
      setHireStep('form');
      return;
    }

    try {
      const combinedDateTime = new Date(`${bookingForm.scheduledDate}T${bookingForm.scheduledTime}:00`);
      if (isNaN(combinedDateTime.getTime())) {
        setHireError('Please select a valid date and time.');
        setHireStep('form');
        return;
      }

      if (combinedDateTime < new Date()) {
        setHireError('The selected appointment time is in the past. Please select an upcoming time.');
        setHireStep('form');
        return;
      }

      let finalAddress = bookingForm.locationAddress || worker?.primaryServiceArea || '';
      let updatedDesc = bookingForm.description;

      if (bookingForm.shareGps && bookingForm.locationLat && bookingForm.locationLng) {
        const gpsTag = ` [GPS: ${bookingForm.locationLat.toFixed(5)}, ${bookingForm.locationLng.toFixed(5)}]`;
        if (!finalAddress.includes('GPS:')) {
          finalAddress = `${finalAddress}${gpsTag}`;
        }
        updatedDesc = `${updatedDesc}\n\n📍 GPS Location: https://maps.google.com/?q=${bookingForm.locationLat},${bookingForm.locationLng}`;
      }

      const payload = {
        workerId: parseInt(workerId),
        residentEmail: userEmail,
        jobTitle: bookingForm.jobTitle,
        description: updatedDesc,
        urgency: bookingForm.urgency,
        scheduledDate: combinedDateTime.toISOString(),
        locationAddress: finalAddress,
        locationLat: bookingForm.shareGps ? bookingForm.locationLat : null,
        locationLng: bookingForm.shareGps ? bookingForm.locationLng : null,
        contactPhone: bookingForm.contactPhone || '',
        pricingModel: bookingForm.pricingModel,
        estimatedPrice: bookingForm.estimatedPrice ? parseFloat(bookingForm.estimatedPrice) : null
      };

      const res = await axios.post(`${API_BASE_URL}/bookings`, payload, {
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

  const renderGoogleRatingBar = (label, iconName, rating, completedJobs) => {
    const hasData = completedJobs > 0 && rating != null && rating > 0;
    const scoreVal = hasData ? rating : (worker?.overallRating || 5.0);
    const scoreText = hasData ? scoreVal.toFixed(1) : `${scoreVal.toFixed(1)}`;
    const percentage = hasData ? Math.min(100, Math.max(0, (scoreVal / 5) * 100)) : 100;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: '#fef3c7',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <md-icon style={{ fontSize: '18px', color: '#000000' }}>{iconName}</md-icon>
            </div>
            <span style={{ color: '#1e293b', fontWeight: 700, fontSize: '0.95rem' }}>{label}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 5 Google Stars */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const diff = scoreVal - star;
                const isFull = diff >= 0;
                const isHalf = !isFull && diff >= -0.5;

                return (
                  <md-icon
                    key={star}
                    style={{
                      fontSize: '18px',
                      color: isFull || isHalf ? '#FDC101' : '#e2e8f0',
                      fontVariationSettings: isFull ? "'FILL' 1" : "'FILL' 0"
                    }}
                  >
                    {isHalf ? 'star_half' : 'star'}
                  </md-icon>
                );
              })}
            </div>

            <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '0.95rem', minWidth: '40px', textAlign: 'right' }}>
              {scoreText}
            </span>
          </div>
        </div>

        {/* Google Style Progress Bar */}
        <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: '#FDC101',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#6b7280' }}>
        <Loader />
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading worker profile...</div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#111827', padding: '20px', textAlign: 'center', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
        <h2 style={{ fontFamily: "var(--font-heading, 'DM Sans', sans-serif)", fontWeight: 800 }}>Worker Profile Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error || 'The requested worker could not be found.'}</p>
        <md-filled-button onClick={() => navigate('/find')}>
          <md-icon slot="icon">arrow_back</md-icon>
          Back to Services
        </md-filled-button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
      {/* Google Workspace / Material 3 Top Navbar */}
      <M3TopNavbar
        activePage="services"
        showSearch={true}
        showSidebarToggle={false}
        searchPlaceholder="Search services, skills, or workers..."
      />

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
                  overflow: 'hidden',
                  fontFamily: "var(--font-heading, 'DM Sans', sans-serif)"
                }}>
                  {worker.profileImage ? (
                    <img src={worker.profileImage} alt={worker.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    worker.name ? worker.name.charAt(0).toUpperCase() : 'W'
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>{worker.name}</h1>
                    <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fef08a', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '16px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <md-icon style={{ fontSize: '16px', color: '#b45309' }}>verified</md-icon> VERIFIED PRO
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '1rem', color: '#475569' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <md-icon style={{ fontSize: '18px', color: '#b45309' }}>location_on</md-icon>
                      {worker.primaryServiceArea || 'Colombo'}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <md-icon style={{ fontSize: '18px', color: '#b45309' }}>radar</md-icon>
                      {worker.coverageRadiusKm || 10} km radius
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fffbeb', border: '1px solid #fef08a', padding: '6px 12px', borderRadius: '12px' }}>
                      <md-icon style={{ fontSize: '18px', color: '#FDC101', fontVariationSettings: "'FILL' 1" }}>star</md-icon>
                      <span style={{ color: '#0f172a', fontWeight: 800, fontSize: '1.05rem' }}>
                        {worker.completedJobs > 0 && worker.overallRating ? worker.overallRating.toFixed(1) : (worker.overallRating ? worker.overallRating.toFixed(1) : '5.0')}
                      </span>
                      <span style={{ color: '#b45309', fontSize: '0.85rem', fontWeight: 700, borderLeft: '1px solid #fde047', paddingLeft: '8px', marginLeft: '4px' }}>
                        {worker.completedJobs > 0 ? `${worker.completedJobs} jobs` : 'New Pro'}
                      </span>
                    </div>

                    <div style={{
                      backgroundColor: worker.isAvailable !== false ? '#ecfccb' : '#fef3c7',
                      color: worker.isAvailable !== false ? '#4d7c0f' : '#b45309',
                      border: worker.isAvailable !== false ? '1px solid #d9f99d' : '1px solid #fde047',
                      padding: '8px 16px',
                      borderRadius: '16px',
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <md-icon style={{ fontSize: '16px' }}>{worker.isAvailable !== false ? 'check_circle' : 'engineering'}</md-icon>
                      {worker.isAvailable !== false ? 'Available for Hire' : 'Currently Busy (On Job)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Description */}
              {worker.description && (
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', fontWeight: 800, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>About {worker.name}</h4>
                  <p style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.7', margin: 0 }}>
                    {worker.description}
                  </p>
                </div>
              )}
            </div>

            {/* WHAT HE CAN DO (SKILLS) CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                <span style={{ backgroundColor: '#fffbeb', color: '#b45309', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <md-icon style={{ fontSize: '22px', color: '#b45309' }}>construction</md-icon>
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
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          padding: '18px',
                          borderRadius: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'border-color 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>{serviceTitle}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
                              {skill.experienceYears <= 0 ? 'Less than 1 Year Experience' : `${skill.experienceYears || 1}+ Years Experience`}
                            </div>
                          </div>
                          <span style={{ backgroundColor: '#ecfccb', color: '#4d7c0f', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800 }}>
                            ✓
                          </span>
                        </div>

                        {subSkills.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px', borderTop: '1px dashed #f1f5f9' }}>
                            {subSkills.map((sub, sIdx) => (
                              <span key={sIdx} style={{ fontSize: '0.78rem', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 9px', borderRadius: '8px', fontWeight: 600 }}>
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
                <p style={{ color: '#64748b', margin: 0, fontSize: '1rem' }}>General Handyman & Repair Services.</p>
              )}
            </div>

            {/* Google-Style Client Ratings & Reliability Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)", display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ backgroundColor: '#fef3c7', color: '#000000', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <md-icon style={{ fontSize: '20px', color: '#000000' }}>star</md-icon>
                    </span>
                    Client Ratings & Reliability
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Verified community performance & satisfaction metrics
                  </span>
                </div>

                {/* Google Aggregate Rating Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '12px 20px',
                  borderRadius: '20px'
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', lineHeight: 1, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                    {worker.completedJobs > 0 && worker.overallRating ? worker.overallRating.toFixed(1) : (worker.overallRating ? worker.overallRating.toFixed(1) : '5.0')}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <md-icon key={star} style={{ fontSize: '18px', color: '#FDC101', fontVariationSettings: "'FILL' 1" }}>
                          star
                        </md-icon>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', marginTop: '2px' }}>
                      {worker.completedJobs > 0 ? `${worker.completedJobs} Verified Review${worker.completedJobs > 1 ? 's' : ''}` : 'Verified SuperBass Pro'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rating Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {renderGoogleRatingBar('Quality & Craftsmanship', 'handyman', worker.qualityRating, worker.completedJobs)}
                {renderGoogleRatingBar('Punctuality & Timeliness', 'schedule', worker.punctualityRating, worker.completedJobs)}
                {renderGoogleRatingBar('Communication & Professionalism', 'forum', worker.communicationRating, worker.completedJobs)}
              </div>
            </div>

          </div>

          {/* Right Column: Rates, Pricing & Hire CTA Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* RATES & PRICING CARD */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 20px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                <span style={{ backgroundColor: '#fef3c7', color: '#b45309', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <md-icon style={{ fontSize: '22px', color: '#b45309' }}>payments</md-icon>
                </span>
                Service Rates & Pricing
              </h2>

              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '20px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700 }}>Pricing Model</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>{worker.pricingModel || 'Hourly / Daily'}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                {/* Hourly Rate */}
                <div style={{ backgroundColor: '#fffbebfb', padding: '20px', borderRadius: '20px', border: '1px solid #fef3c7', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Hourly Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#b45309', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                    {worker.hourlyRate ? `Rs. ${worker.hourlyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Per Hour</div>
                </div>

                {/* Daily Rate */}
                <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '20px', border: '1px solid #dbeafe', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Daily Rate</div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#1d4ed8', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                    {worker.dailyRate ? `Rs. ${worker.dailyRate.toLocaleString()}` : 'Negotiable'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>Per Full Day</div>
                </div>
              </div>

              {/* Hire and Chat Buttons or Worker Notice */}
              {isWorker ? (
                <div style={{
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '20px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1d4ed8', fontWeight: 800, fontSize: '1rem' }}>
                    <md-icon style={{ fontSize: '22px' }}>badge</md-icon>
                    Worker Profile Active
                  </div>
                  <p style={{ margin: 0, color: '#334155', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    You are viewing this profile as a <strong>Worker</strong>. Direct hiring and chatting are restricted between workers and are exclusively available for <strong>Resident</strong> accounts.
                  </p>
                  <md-outlined-button
                    onClick={() => navigate('/bookings')}
                    style={{
                      marginTop: '4px',
                      '--md-sys-color-primary': '#1d4ed8',
                      fontWeight: 700
                    }}
                  >
                    <md-icon slot="icon">calendar_today</md-icon>
                    View My Jobs & Bookings
                  </md-outlined-button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center' }}>
                  <md-filled-button
                    onClick={handleOpenHireModal}
                    style={{
                      width: '100%',
                      '--md-sys-color-primary': '#FDC101',
                      '--md-sys-color-on-primary': '#000000',
                      '--md-filled-button-container-height': '56px',
                      '--md-filled-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)",
                      '--md-filled-button-label-text-size': '1.05rem',
                      '--md-filled-button-label-text-weight': '800'
                    }}
                  >
                    <md-icon slot="icon">handyman</md-icon>
                    Hire / Request Worker Now
                  </md-filled-button>

                  <md-outlined-button
                    onClick={handleChatWithWorker}
                    style={{
                      width: '100%',
                      '--md-sys-color-primary': '#111827',
                      '--md-outlined-button-container-height': '56px',
                      '--md-outlined-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)",
                      '--md-outlined-button-label-text-size': '1.05rem',
                      '--md-outlined-button-label-text-weight': '800'
                    }}
                  >
                    <md-icon slot="icon">chat</md-icon>
                    Chat with {getFirstName(worker.name)}
                  </md-outlined-button>
                </div>
              )}
            </div>

            {/* Service Location Card */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '28px', padding: '32px', border: '1px solid #f1f5f9', boxShadow: 'none' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                <md-icon style={{ fontSize: '22px', color: '#b45309' }}>pin_drop</md-icon>
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
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
                    label="Contact Phone"
                    required
                    value={bookingForm.contactPhone}
                    onInput={(e) => setBookingForm({ ...bookingForm, contactPhone: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <md-icon slot="leading-icon">phone</md-icon>
                  </md-outlined-text-field>
                </div>

                {/* Preferred Date & Time (M3 Pickers) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

                  <div
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setIsTimePickerOpen(true)}
                    title="Click to select time"
                  >
                    <md-outlined-text-field
                      type="text"
                      label="Preferred Time"
                      required
                      readOnly
                      value={formatDisplayTime(bookingForm.scheduledTime)}
                      style={{ width: '100%' }}
                    >
                      <md-icon slot="leading-icon">schedule</md-icon>
                      <md-icon slot="trailing-icon">access_time</md-icon>
                    </md-outlined-text-field>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsTimePickerOpen(true);
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        cursor: 'pointer'
                      }}
                    />
                  </div>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none', margin: 0 }}>
                      <md-checkbox
                        checked={bookingForm.shareGps ? true : undefined}
                        touch-target="wrapper"
                        onChange={(e) => setBookingForm(prev => ({ ...prev, shareGps: e.target.checked }))}
                      ></md-checkbox>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <md-icon style={{ fontSize: '18px', color: '#FDC101' }}>my_location</md-icon>
                          Share saved GPS location
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {bookingForm.locationLat && bookingForm.locationLng ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <md-icon style={{ fontSize: '15px', color: '#b45309' }}>pin_drop</md-icon>
                              Saved Pin: <strong>{bookingForm.locationLat.toFixed(5)}, {bookingForm.locationLng.toFixed(5)}</strong>
                            </span>
                          ) : (
                            <span>No GPS coordinates saved. Pick on map to attach.</span>
                          )}
                        </div>
                      </div>
                    </label>

                    <md-text-button
                      type="button"
                      onClick={() => setShowMapPicker(!showMapPicker)}
                      style={{
                        '--md-sys-color-primary': '#b45309',
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
                          <md-icon style={{ fontSize: '15px', color: '#b45309' }}>touch_app</md-icon>
                          Tap / click anywhere on the map to change coordinates
                        </span>
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          style={{
                            background: '#fffbeb',
                            border: '1px solid #fde68a',
                            color: '#b45309',
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
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>location_on</md-icon>
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
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <md-icon style={{ fontSize: '18px', color: '#ca8a04' }}>payments</md-icon>
                    Pricing Model
                  </span>
                  <strong style={{ color: '#111827' }}>{bookingForm.pricingModel} {bookingForm.estimatedPrice ? `(${bookingForm.estimatedPrice})` : ''}</strong>
                </div>

                {/* Submit Button */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <md-text-button
                    type="button"
                    onClick={() => setIsHireModalOpen(false)}
                    style={{ flex: 1, '--md-sys-color-primary': '#475569', '--md-text-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)" }}
                  >
                    Cancel
                  </md-text-button>
                  <md-filled-button
                    type="submit"
                    style={{
                      flex: 2,
                      '--md-sys-color-primary': '#FDC101',
                      '--md-sys-color-on-primary': '#000000',
                      '--md-filled-button-label-text-font': "var(--font-body, 'DM Sans', sans-serif)",
                      '--md-filled-button-label-text-weight': '800'
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
                  backgroundColor: '#111827',
                  borderRadius: '16px',
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
                <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px' }}>
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
                        color: '#FDC101',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <md-icon style={{ fontSize: '18px', color: '#FDC101' }}>check</md-icon>
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
                        borderRadius: '8px',
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
                      '--md-sys-color-primary': '#FDC101',
                      '--md-sys-color-on-primary': '#000000',
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

            <M3TimePickerDialog
              isOpen={isTimePickerOpen}
              onClose={() => setIsTimePickerOpen(false)}
              selectedTime={bookingForm.scheduledTime}
              onSelectTime={(newTime) => {
                setBookingForm(prev => ({ ...prev, scheduledTime: newTime }));
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
