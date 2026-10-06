import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './BookingDetail.css';
import { API_BASE_URL } from './config.js';
import { showToast } from './utils/toast.js';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Material 3 Web Components
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/dialog/dialog.js';

// Leaflet default icons fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const userLocationIcon = L.divIcon({
  className: 'user-location-pin',
  html: `
    <div style="position: relative; width: 34px; height: 42px; transform: translate(-17px, -42px);">
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.38));">
        <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#E11D48"/>
        <circle cx="17" cy="17" r="7.5" fill="#FFFFFF"/>
        <circle cx="17" cy="17" r="4" fill="#E11D48"/>
      </svg>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  popupAnchor: [0, -42]
});

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (map && lat && lng) {
      setTimeout(() => {
        map.invalidateSize();
        map.setView([lat, lng], 15);
      }, 250);
    }
  }, [map, lat, lng]);
  return null;
}

const cleanDescription = (desc) => {
  if (!desc) return '';
  return desc
    .replace(/\n*📍?\s*GPS Location:\s*https?:\/\/[^\s]+/gi, '')
    .replace(/\n*\[GPS:[^\]]+\]/gi, '')
    .trim();
};

const cleanAddress = (addr) => {
  if (!addr) return 'Location not specified';
  return addr.replace(/\s*\[GPS:[^\]]+\]/gi, '').trim() || 'Location not specified';
};

const extractCoordinates = (booking) => {
  if (!booking) return null;
  const lat = booking.locationLat ?? booking.latitude ?? booking.lat;
  const lng = booking.locationLng ?? booking.longitude ?? booking.lng;
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);
    if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
      return { lat: pLat, lng: pLng };
    }
  }
  if (booking.locationAddress) {
    const match = booking.locationAddress.match(/\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]/i);
    if (match) {
      const pLat = parseFloat(match[1]);
      const pLng = parseFloat(match[2]);
      if (!isNaN(pLat) && !isNaN(pLng)) return { lat: pLat, lng: pLng };
    }
    const directCoordMatch = booking.locationAddress.match(/([-\d.]+)\s*,\s*([-\d.]+)/);
    if (directCoordMatch) {
      const pLat = parseFloat(directCoordMatch[1]);
      const pLng = parseFloat(directCoordMatch[2]);
      if (!isNaN(pLat) && !isNaN(pLng) && Math.abs(pLat) <= 90 && Math.abs(pLng) <= 180 && pLat !== 0 && pLng !== 0) {
        return { lat: pLat, lng: pLng };
      }
    }
  }
  return null;
};

const getGoogleMapsUrl = (booking) => {
  const coords = extractCoordinates(booking);
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  }
  const cleanAddr = cleanAddress(booking?.locationAddress);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddr)}`;
};

export default function BookingDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('id') || urlParams.get('bookingId');

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth Context
  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const isWorker = activeRole.toLowerCase() === 'worker' || localStorage.getItem('workerAuth') === 'true';
  const currentUserEmail = isWorker
    ? (localStorage.getItem('workerEmail') || localStorage.getItem('email'))
    : localStorage.getItem('email');
  const token = localStorage.getItem('token');

  // Cancel Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const cancelDialogRef = useRef(null);

  // Review Dialog State
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5
  });
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewDialogRef = useRef(null);

  useEffect(() => {
    if (cancelDialogOpen) {
      cancelDialogRef.current?.show();
    } else {
      cancelDialogRef.current?.close();
    }
  }, [cancelDialogOpen]);

  useEffect(() => {
    if (reviewDialogOpen) {
      reviewDialogRef.current?.show();
    } else {
      reviewDialogRef.current?.close();
    }
  }, [reviewDialogOpen]);

  const fetchBooking = async () => {
    if (!bookingId) {
      setError("No booking ID specified.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try GET /api/bookings/{id}
      const res = await axios.get(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.data) {
        setBooking(res.data);
      } else {
        setError("Booking not found.");
      }
    } catch (err) {
      console.warn("Direct booking fetch error, trying role list fallback:", err);
      // Fallback: fetch user's booking list and find by ID
      try {
        const endpoint = isWorker
          ? `${API_BASE_URL}/bookings/worker?email=${encodeURIComponent(currentUserEmail || '')}`
          : `${API_BASE_URL}/bookings/resident?email=${encodeURIComponent(currentUserEmail || '')}`;

        const listRes = await axios.get(endpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (listRes.data && Array.isArray(listRes.data)) {
          const matched = listRes.data.find(b => b.id.toString() === bookingId.toString());
          if (matched) {
            setBooking(matched);
            return;
          }
        }
      } catch (listErr) {
        console.error("List fallback failed:", listErr);
      }
      setError("Unable to load booking details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [bookingId]);

  // Actions
  const handleAction = async (action) => {
    if (!booking) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/bookings/${booking.id}/${action}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      showToast(`Booking ${action}ed successfully!`);
      fetchBooking();

      if (action === 'accept') {
        const convId = res.data?.conversationId;
        if (convId) {
          navigate(`/chats?conversationId=${convId}&bookingId=${booking.id}`);
        } else {
          navigate(`/chats?bookingId=${booking.id}`);
        }
      }
    } catch (err) {
      console.error(`Error performing action ${action}:`, err);
      alert(err.response?.data?.message || `Failed to ${action} booking.`);
    }
  };

  const confirmCancel = async () => {
    if (!booking) return;
    setCancelLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/bookings/${booking.id}/cancel`, {
        reason: cancelReason || (activeRole === 'Resident' ? 'Cancelled by resident' : 'Cancelled by worker')
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCancelDialogOpen(false);
      setCancelReason('');
      showToast('Booking cancelled successfully.');
      fetchBooking();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!booking) return;

    setReviewLoading(true);
    try {
      const averageRating = (
        (reviewForm.qualityRating + reviewForm.punctualityRating + reviewForm.communicationRating) / 3
      );
      const roundedRating = Math.round(averageRating * 10) / 10;

      const payload = {
        rating: roundedRating,
        qualityRating: reviewForm.qualityRating,
        punctualityRating: reviewForm.punctualityRating,
        communicationRating: reviewForm.communicationRating,
        comment: reviewComment
      };

      await axios.post(`${API_BASE_URL}/bookings/${booking.id}/review`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setReviewDialogOpen(false);
      showToast('Thank you! Your review has been recorded.');
      fetchBooking();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleCopyRef = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`#BK-${booking?.id}`);
      showToast(`Reference ID #BK-${booking?.id} copied to clipboard!`);
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Requested':
        return <span className="bd-badge-status bd-status-requested"><md-icon style={{ fontSize: '15px' }}>schedule</md-icon>Requested</span>;
      case 'Confirmed':
        return <span className="bd-badge-status bd-status-confirmed"><md-icon style={{ fontSize: '15px' }}>thumb_up</md-icon>Confirmed</span>;
      case 'InProgress':
        return <span className="bd-badge-status bd-status-inprogress"><md-icon style={{ fontSize: '15px' }}>sync</md-icon>In Progress</span>;
      case 'Completed':
        return <span className="bd-badge-status bd-status-completed"><md-icon style={{ fontSize: '15px' }}>check_circle</md-icon>Completed</span>;
      case 'Reviewed':
        return <span className="bd-badge-status bd-status-reviewed"><md-icon style={{ fontSize: '15px' }}>star</md-icon>Reviewed</span>;
      case 'Rejected':
        return <span className="bd-badge-status bd-status-rejected"><md-icon style={{ fontSize: '15px' }}>cancel</md-icon>Rejected</span>;
      case 'Cancelled':
        return <span className="bd-badge-status bd-status-cancelled"><md-icon style={{ fontSize: '15px' }}>block</md-icon>Cancelled</span>;
      default:
        return <span className="bd-badge-status bd-status-confirmed">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="bd-page-wrapper">
        <div className="bd-loading-state">
          <div className="bd-spinner"></div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>Loading Booking Details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bd-page-wrapper">
        <div className="bd-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
            {error || "Booking Not Found"}
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '460px', marginBottom: '24px' }}>
            The requested booking could not be found or you may not have permission to view it.
          </p>
          <button
            type="button"
            className="bd-back-btn"
            onClick={() => navigate('/bookings')}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Back to All Bookings</span>
          </button>
        </div>
      </div>
    );
  }

  const isResident = activeRole === 'Resident';
  const otherPartyName = isResident ? booking.workerName : booking.residentName;
  const otherPartyPhone = isResident
    ? (booking.workerPhone || (booking.isContactShared ? 'Shared in chat' : 'Private • Shared in chat'))
    : (booking.residentPhone || booking.contactPhone);
  const otherPartyAvatar = isResident
    ? (booking.workerProfileImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.workerId || 'Worker'}`)
    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.residentEmail || 'Resident'}`;

  const coords = extractCoordinates(booking);
  const defaultCenter = [6.74016, 80.38114];
  const pinPos = coords ? [coords.lat, coords.lng] : defaultCenter;

  return (
    <div className="bd-page-wrapper">
      {/* Top Sticky Navigation Bar */}
      <div className="bd-top-nav-bar">
        <div className="bd-nav-inner">
          <button
            type="button"
            className="bd-back-btn"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/bookings');
              }
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Back to Bookings</span>
          </button>

          <div className="bd-breadcrumbs">
            <span className="bd-breadcrumb-item" onClick={() => navigate('/')}>Home</span>
            <span className="bd-breadcrumb-sep">/</span>
            <span className="bd-breadcrumb-item" onClick={() => navigate('/bookings')}>Bookings</span>
            <span className="bd-breadcrumb-sep">/</span>
            <span className="bd-breadcrumb-active">#{booking.id} - {booking.jobTitle}</span>
          </div>

          <div className="bd-top-actions">
            <button
              type="button"
              className="bd-action-chip"
              onClick={handleCopyRef}
              title="Copy Reference ID"
            >
              <i className="fa-regular fa-copy"></i>
              <span>Ref #{booking.id}</span>
            </button>

            <button
              type="button"
              className="bd-action-chip"
              onClick={() => navigate('/chats')}
            >
              <i className="fa-solid fa-comments"></i>
              <span>Open Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Full Page Content Container */}
      <div className="bd-container">
        {/* Left Column: Booking Primary Information */}
        <div className="bd-main-col">
          {/* Main Card */}
          <div className="bd-card">
            <div className="bd-header-strip">
              <div>
                <span className="bd-ref-label">Booking Reference #BK-{booking.id}</span>
                <h1 className="bd-job-title">{booking.jobTitle}</h1>
                <div className="bd-badges-row">
                  {renderStatusBadge(booking.status)}
                  {booking.urgency && (
                    <span className="bd-badge-priority">
                      <md-icon style={{ fontSize: '14px' }}>flag</md-icon>
                      {booking.urgency} Priority
                    </span>
                  )}
                  <span className="bd-badge-date">
                    <md-icon style={{ fontSize: '15px' }}>calendar_today</md-icon>
                    {new Date(booking.scheduledDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Metrics & Overview Grid */}
            <div className="bd-info-grid">
              <div className="bd-info-block">
                <span className="bd-info-label">Estimated Price</span>
                <span className="bd-info-val-large">
                  {booking.estimatedPrice ? `Rs. ${booking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                </span>
              </div>
              <div className="bd-info-block">
                <span className="bd-info-label">Scheduled Date</span>
                <span className="bd-info-val">
                  {new Date(booking.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <div className="bd-info-block">
                <span className="bd-info-label">{isResident ? 'Assigned Worker' : 'Client Name'}</span>
                <span className="bd-info-val">{otherPartyName}</span>
              </div>
              <div className="bd-info-block">
                <span className="bd-info-label">Contact</span>
                <span className="bd-info-val">{otherPartyPhone}</span>
              </div>
            </div>

            {/* Notes / Description */}
            {cleanDescription(booking.description) && (
              <div>
                <h3 className="bd-section-title">
                  <i className="fa-solid fa-align-left" style={{ fontSize: '0.9rem', color: '#6b7280' }}></i>
                  Task Requirements & Notes
                </h3>
                <div className="bd-desc-box">
                  {cleanDescription(booking.description)}
                </div>
              </div>
            )}

            {/* Cancellation / Rejection Note if applicable */}
            {(booking.rejectionReason || booking.cancellationReason) && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 800, marginBottom: '4px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {booking.rejectionReason ? 'Rejection Reason' : 'Cancellation Reason'}
                </div>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#7f1d1d' }}>
                  {booking.rejectionReason || booking.cancellationReason}
                </p>
              </div>
            )}
          </div>

          {/* Stepper Card */}
          <div className="bd-stepper-card">
            <h3 className="bd-section-title">
              <i className="fa-solid fa-timeline" style={{ fontSize: '0.9rem', color: '#6b7280' }}></i>
              Service Lifecycle Status
            </h3>

            <div className="bd-stepper-list">
              {/* Step 1: Requested */}
              <div className="bd-step-item">
                <div className="bd-step-icon-wrap bd-step-completed">
                  <md-icon style={{ fontSize: '18px' }}>check</md-icon>
                </div>
                <div className="bd-step-content">
                  <div className="bd-step-header">
                    <span className="bd-step-name">1. Booking Requested</span>
                    <span className="bd-step-status-tag" style={{ background: '#dcfce7', color: '#15803d' }}>Completed</span>
                  </div>
                  <p className="bd-step-desc">Service requested and details submitted to worker.</p>
                </div>
              </div>

              {/* Step 2: Confirmed */}
              <div className="bd-step-item">
                <div className={`bd-step-icon-wrap ${
                  ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? 'bd-step-completed' :
                  booking.status === 'Requested' ? 'bd-step-active' :
                  ['Rejected', 'Cancelled'].includes(booking.status) ? 'bd-step-rejected' : 'bd-step-pending'
                }`}>
                  <md-icon style={{ fontSize: '18px' }}>
                    {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? 'check' :
                     ['Rejected', 'Cancelled'].includes(booking.status) ? 'close' : 'thumb_up'}
                  </md-icon>
                </div>
                <div className="bd-step-content">
                  <div className="bd-step-header">
                    <span className="bd-step-name">2. Worker Confirmation</span>
                    <span className="bd-step-status-tag" style={{
                      background: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? '#dcfce7' :
                                  booking.status === 'Requested' ? '#fef3c7' : '#fee2e2',
                      color: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? '#15803d' :
                             booking.status === 'Requested' ? '#b45309' : '#b91c1c'
                    }}>
                      {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? 'Confirmed' :
                       booking.status === 'Requested' ? 'Awaiting Worker' : booking.status}
                    </span>
                  </div>
                  <p className="bd-step-desc">
                    {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(booking.status) ? 'Service request accepted by worker.' :
                     booking.status === 'Requested' ? 'Waiting for worker to accept or decline.' : 'Booking not confirmed.'}
                  </p>
                </div>
              </div>

              {/* Step 3: In Progress */}
              <div className="bd-step-item">
                <div className={`bd-step-icon-wrap ${
                  ['Completed', 'Reviewed'].includes(booking.status) ? 'bd-step-completed' :
                  booking.status === 'InProgress' ? 'bd-step-active' : 'bd-step-pending'
                }`}>
                  <md-icon style={{ fontSize: '18px' }}>
                    {['Completed', 'Reviewed'].includes(booking.status) ? 'check' : 'build'}
                  </md-icon>
                </div>
                <div className="bd-step-content">
                  <div className="bd-step-header">
                    <span className="bd-step-name">3. Service In Progress</span>
                    <span className="bd-step-status-tag" style={{
                      background: ['Completed', 'Reviewed'].includes(booking.status) ? '#dcfce7' :
                                  booking.status === 'InProgress' ? '#dbeafe' : '#f3f4f6',
                      color: ['Completed', 'Reviewed'].includes(booking.status) ? '#15803d' :
                             booking.status === 'InProgress' ? '#1d4ed8' : '#9ca3af'
                    }}>
                      {['Completed', 'Reviewed'].includes(booking.status) ? 'Finished' :
                       booking.status === 'InProgress' ? 'Active Now' : 'Pending'}
                    </span>
                  </div>
                  <p className="bd-step-desc">
                    {booking.status === 'InProgress' ? 'Worker is actively performing the service.' :
                     ['Completed', 'Reviewed'].includes(booking.status) ? 'Job was executed on-site.' : 'Work will commence on scheduled date.'}
                  </p>
                </div>
              </div>

              {/* Step 4: Completed */}
              <div className="bd-step-item">
                <div className={`bd-step-icon-wrap ${
                  ['Completed', 'Reviewed'].includes(booking.status) ? 'bd-step-completed' : 'bd-step-pending'
                }`}>
                  <md-icon style={{ fontSize: '18px' }}>
                    {['Completed', 'Reviewed'].includes(booking.status) ? 'check' : 'done_all'}
                  </md-icon>
                </div>
                <div className="bd-step-content">
                  <div className="bd-step-header">
                    <span className="bd-step-name">4. Job Completed</span>
                    <span className="bd-step-status-tag" style={{
                      background: ['Completed', 'Reviewed'].includes(booking.status) ? '#dcfce7' : '#f3f4f6',
                      color: ['Completed', 'Reviewed'].includes(booking.status) ? '#15803d' : '#9ca3af'
                    }}>
                      {['Completed', 'Reviewed'].includes(booking.status) ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  <p className="bd-step-desc">Worker has finished task and resident has verified work.</p>
                </div>
              </div>

              {/* Step 5: Reviewed */}
              <div className="bd-step-item">
                <div className={`bd-step-icon-wrap ${
                  booking.status === 'Reviewed' ? 'bd-step-completed' : 'bd-step-pending'
                }`}>
                  <md-icon style={{ fontSize: '18px' }}>star</md-icon>
                </div>
                <div className="bd-step-content">
                  <div className="bd-step-header">
                    <span className="bd-step-name">5. Feedback & Review</span>
                    <span className="bd-step-status-tag" style={{
                      background: booking.status === 'Reviewed' ? '#f3e8ff' : '#f3f4f6',
                      color: booking.status === 'Reviewed' ? '#7e22ce' : '#9ca3af'
                    }}>
                      {booking.status === 'Reviewed' ? 'Reviewed' : 'Optional'}
                    </span>
                  </div>
                  <p className="bd-step-desc">Resident leaves rating and feedback for the professional.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Preview Card */}
          <div className="bd-map-card">
            <div className="bd-map-header">
              <div>
                <h3 className="bd-section-title" style={{ margin: 0 }}>
                  <i className="fa-solid fa-map-location-dot" style={{ fontSize: '0.9rem', color: '#6b7280' }}></i>
                  Service Location & Map
                </h3>
                <span style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  {cleanAddress(booking.locationAddress)}
                </span>
              </div>

              <a
                href={getGoogleMapsUrl(booking)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <button type="button" className="bd-btn-secondary" style={{ width: 'auto', padding: '8px 18px' }}>
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Open in Google Maps</span>
                </button>
              </a>
            </div>

            <div className="bd-map-container">
              <MapContainer
                center={pinPos}
                zoom={coords ? 15 : 13}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={pinPos} icon={userLocationIcon}>
                  <Popup autoPan={true}>
                    <div style={{ padding: '4px 2px' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#e11d48' }}>
                        Service Location
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: '#000000', display: 'block', marginTop: '2px' }}>
                        {booking.jobTitle}
                      </strong>
                      <div style={{ fontSize: '0.85rem', color: '#52525b', marginTop: '3px' }}>
                        {cleanAddress(booking.locationAddress)}
                      </div>
                    </div>
                  </Popup>
                </Marker>
                <RecenterMap lat={pinPos[0]} lng={pinPos[1]} />
              </MapContainer>
            </div>
          </div>

          {/* Review Card (if reviewed) */}
          {booking.status === 'Reviewed' && (
            <div className="bd-review-card">
              <h3 className="bd-section-title">
                <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
                Client Review & Feedback
              </h3>

              <div className="bd-rating-grid">
                <div>
                  <span className="bd-info-label">Overall Rating</span>
                  <div className="bd-rating-stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i key={star} className={`fa-star ${star <= Math.round(booking.reviewRating || 5) ? 'fa-solid' : 'fa-regular'}`}></i>
                    ))}
                    <span style={{ fontWeight: 800, color: '#000000', marginLeft: '6px' }}>{booking.reviewRating || 5} / 5</span>
                  </div>
                </div>

                {booking.qualityRating && (
                  <div>
                    <span className="bd-info-label">Quality of Work</span>
                    <span className="bd-info-val">{booking.qualityRating} / 5</span>
                  </div>
                )}

                {booking.punctualityRating && (
                  <div>
                    <span className="bd-info-label">Punctuality</span>
                    <span className="bd-info-val">{booking.punctualityRating} / 5</span>
                  </div>
                )}

                {booking.communicationRating && (
                  <div>
                    <span className="bd-info-label">Communication</span>
                    <span className="bd-info-val">{booking.communicationRating} / 5</span>
                  </div>
                )}
              </div>

              {booking.reviewComment && (
                <div style={{ background: '#f9fafb', borderRadius: '12px', padding: '16px', border: '1px solid #e5e7eb' }}>
                  <span className="bd-info-label" style={{ display: 'block', marginBottom: '6px' }}>Client Comment</span>
                  <p style={{ margin: 0, fontStyle: 'italic', color: '#374151', lineHeight: 1.5 }}>
                    "{booking.reviewComment}"
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Party Info & Role Actions */}
        <div className="bd-sidebar-col">
          {/* Party Profile Card */}
          <div className="bd-sidebar-card">
            <div className="bd-party-profile">
              <img
                src={otherPartyAvatar}
                alt={otherPartyName}
                className="bd-party-avatar"
              />
              <div className="bd-party-name">{otherPartyName}</div>
              <span className="bd-party-role-tag">
                {isResident ? 'Assigned Worker' : 'Client Resident'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="bd-btn-primary"
                onClick={() => navigate('/chats')}
              >
                <i className="fa-solid fa-comments"></i>
                <span>Message in Chat</span>
              </button>

              {otherPartyPhone && otherPartyPhone.includes('+') && (
                <a
                  href={`tel:${otherPartyPhone}`}
                  style={{ textDecoration: 'none' }}
                >
                  <button type="button" className="bd-btn-secondary">
                    <i className="fa-solid fa-phone"></i>
                    <span>Call {otherPartyPhone}</span>
                  </button>
                </a>
              )}
            </div>

            <div style={{ marginTop: '20px' }}>
              <div className="bd-meta-row">
                <span className="bd-meta-label">Phone</span>
                <span className="bd-meta-val">{otherPartyPhone}</span>
              </div>
              <div className="bd-meta-row">
                <span className="bd-meta-label">Booking ID</span>
                <span className="bd-meta-val">#{booking.id}</span>
              </div>
              <div className="bd-meta-row">
                <span className="bd-meta-label">Current Status</span>
                <span className="bd-meta-val">{booking.status}</span>
              </div>
              <div className="bd-meta-row" style={{ borderBottom: 'none' }}>
                <span className="bd-meta-label">Payment Type</span>
                <span className="bd-meta-val">Direct / Negotiable</span>
              </div>
            </div>
          </div>

          {/* Action Management Card */}
          <div className="bd-sidebar-card">
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Manage Booking
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Worker Actions */}
              {isWorker && booking.status === 'Requested' && (
                <>
                  <button
                    type="button"
                    className="bd-btn-primary"
                    onClick={() => handleAction('accept')}
                  >
                    <i className="fa-solid fa-check"></i>
                    <span>Accept Request</span>
                  </button>
                  <button
                    type="button"
                    className="bd-btn-danger"
                    onClick={() => handleAction('reject')}
                  >
                    <i className="fa-solid fa-xmark"></i>
                    <span>Reject Request</span>
                  </button>
                </>
              )}

              {isWorker && booking.status === 'Confirmed' && (
                <>
                  <button
                    type="button"
                    className="bd-btn-primary"
                    onClick={() => handleAction('start')}
                  >
                    <i className="fa-solid fa-play"></i>
                    <span>Start Job Now</span>
                  </button>
                  <button
                    type="button"
                    className="bd-btn-danger"
                    onClick={() => {
                      setCancelReason('');
                      setCancelDialogOpen(true);
                    }}
                  >
                    <i className="fa-solid fa-ban"></i>
                    <span>Cancel Job</span>
                  </button>
                </>
              )}

              {isWorker && booking.status === 'InProgress' && (
                <button
                  type="button"
                  className="bd-btn-primary"
                  onClick={() => handleAction('complete')}
                  style={{ background: '#16a34a' }}
                >
                  <i className="fa-solid fa-circle-check"></i>
                  <span>Mark Completed</span>
                </button>
              )}

              {/* Resident Actions */}
              {isResident && ['Requested', 'Pending', 'Confirmed'].includes(booking.status) && (
                <button
                  type="button"
                  className="bd-btn-danger"
                  onClick={() => {
                    setCancelReason('');
                    setCancelDialogOpen(true);
                  }}
                >
                  <i className="fa-solid fa-ban"></i>
                  <span>Cancel Booking</span>
                </button>
              )}

              {isResident && booking.status === 'Completed' && (
                <button
                  type="button"
                  className="bd-btn-primary"
                  onClick={() => setReviewDialogOpen(true)}
                  style={{ background: '#f59e0b', color: '#000000' }}
                >
                  <i className="fa-solid fa-star"></i>
                  <span>Leave a Review</span>
                </button>
              )}

              <button
                type="button"
                className="bd-btn-secondary"
                onClick={() => navigate('/bookings')}
              >
                <i className="fa-solid fa-list"></i>
                <span>View All Bookings</span>
              </button>
            </div>
          </div>

          {/* Workio Guarantee Box */}
          <div style={{
            background: '#f9fafb',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px' }}>
              <i className="fa-solid fa-shield-halved"></i>
              Workio Service Protection
            </div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#4b5563', lineHeight: 1.5 }}>
              All interactions are logged for your safety. Inspect the work before settling final payments.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <md-dialog
        ref={cancelDialogRef}
        onClose={() => setCancelDialogOpen(false)}
        style={{
          '--md-dialog-container-color': '#ffffff',
          '--md-dialog-container-shape': '24px',
          maxWidth: '500px',
          width: '90vw'
        }}
      >
        <div slot="headline" style={{ padding: '24px 24px 12px 24px', fontWeight: 800, fontSize: '1.25rem' }}>
          Cancel Booking
        </div>
        <div slot="content" style={{ padding: '0 24px 20px 24px' }}>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#6b7280' }}>
            Are you sure you want to cancel this booking? Please provide a brief reason.
          </p>
          <textarea
            rows={3}
            placeholder="Reason for cancellation..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              fontFamily: 'inherit',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div slot="actions" style={{ padding: '12px 24px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="bd-btn-secondary"
            onClick={() => setCancelDialogOpen(false)}
            style={{ width: 'auto' }}
          >
            Go Back
          </button>
          <button
            type="button"
            className="bd-btn-danger"
            onClick={confirmCancel}
            disabled={cancelLoading}
            style={{ width: 'auto' }}
          >
            {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </md-dialog>

      {/* Review Dialog */}
      <md-dialog
        ref={reviewDialogRef}
        onClose={() => setReviewDialogOpen(false)}
        style={{
          '--md-dialog-container-color': '#ffffff',
          '--md-dialog-container-shape': '24px',
          maxWidth: '560px',
          width: '90vw'
        }}
      >
        <div slot="headline" style={{ padding: '24px 24px 12px 24px', fontWeight: 800, fontSize: '1.25rem' }}>
          Rate & Review Service
        </div>
        <form onSubmit={handleReviewSubmit}>
          <div slot="content" style={{ padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Quality of Work</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, qualityRating: s }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: s <= reviewForm.qualityRating ? '#f59e0b' : '#d1d5db' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Punctuality</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, punctualityRating: s }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: s <= reviewForm.punctualityRating ? '#f59e0b' : '#d1d5db' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Communication</label>
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setReviewForm(prev => ({ ...prev, communicationRating: s }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', color: s <= reviewForm.communicationRating ? '#f59e0b' : '#d1d5db' }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>Feedback Comments</label>
              <textarea
                rows={3}
                placeholder="Share your experience..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  marginTop: '6px'
                }}
              />
            </div>
          </div>
          <div slot="actions" style={{ padding: '12px 24px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="bd-btn-secondary"
              onClick={() => setReviewDialogOpen(false)}
              style={{ width: 'auto' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bd-btn-primary"
              disabled={reviewLoading}
              style={{ width: 'auto' }}
            >
              {reviewLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </md-dialog>

      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
