import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css'; // Leveraging existing App.css for styles
import './Bookings.css';
import UserMenu from './components/UserMenu.jsx';
import Loader from './components/Loader.jsx';
import { API_BASE_URL } from './config.js';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/divider/divider.js';
import '@material/web/elevation/elevation.js';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Custom colored SVG pin marker for service location
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
  if (booking.description) {
    const match = booking.description.match(/maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)/i);
    if (match) {
      const pLat = parseFloat(match[1]);
      const pLng = parseFloat(match[2]);
      if (!isNaN(pLat) && !isNaN(pLng)) return { lat: pLat, lng: pLng };
    }
    const gpsMatch = booking.description.match(/\[GPS:\s*([-\d.]+),\s*([-\d.]+)\]/i);
    if (gpsMatch) {
      const pLat = parseFloat(gpsMatch[1]);
      const pLng = parseFloat(gpsMatch[2]);
      if (!isNaN(pLat) && !isNaN(pLng)) return { lat: pLat, lng: pLng };
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

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
    const [bookingSearch, setBookingSearch] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const reviewDialogRef = useRef(null);

  useEffect(() => {
    if (reviewModalOpen && selectedBooking) {
      reviewDialogRef.current?.show();
    } else {
      reviewDialogRef.current?.close();
    }
  }, [reviewModalOpen, selectedBooking]);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedViewBooking, setSelectedViewBooking] = useState(null);
  const viewDialogRef = useRef(null);

  useEffect(() => {
    if (viewModalOpen && selectedViewBooking) {
      viewDialogRef.current?.show();
    } else {
      viewDialogRef.current?.close();
    }
  }, [viewModalOpen, selectedViewBooking]);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const cancelDialogRef = useRef(null);

  useEffect(() => {
    if (cancelDialogOpen && bookingToCancel) {
      cancelDialogRef.current?.show();
    } else {
      cancelDialogRef.current?.close();
    }
  }, [cancelDialogOpen, bookingToCancel]);

  const [reviewForm, setReviewForm] = useState({
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5
  });
  const [reviewComment, setReviewComment] = useState('');

  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const isWorker = activeRole.toLowerCase() === 'worker' || localStorage.getItem('workerAuth') === 'true';
  const currentUserEmail = isWorker
    ? (localStorage.getItem('workerEmail') || localStorage.getItem('email'))
    : localStorage.getItem('email');
  const token = localStorage.getItem('token');

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchBookings = async () => {
    if (!currentUserEmail) {
      setError('Please sign in to view your bookings.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const endpoint = isWorker
        ? `${API_BASE_URL}/bookings/worker?email=${encodeURIComponent(currentUserEmail)}`
        : `${API_BASE_URL}/bookings/resident?email=${encodeURIComponent(currentUserEmail)}`;

      const res = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setBookings(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [activeRole, currentUserEmail]);

  const hasInProgressJob = isWorker && bookings.some(b => b.status === 'InProgress');
  const activeJob = isWorker ? bookings.find(b => b.status === 'InProgress') : null;

  const handleAction = async (bookingId, action) => {
    try {
      await axios.post(`${API_BASE_URL}/bookings/${bookingId}/${action}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchBookings(); // Refresh list after action
    } catch (err) {
      console.error(`Error performing action ${action}:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} booking.`;
      alert(msg);
    }
  };

  const promptCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    setCancelLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/bookings/${bookingToCancel.id}/cancel`, {
        reason: 'Cancelled by resident'
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      fetchBookings();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      const msg = err.response?.data?.message || 'Failed to cancel booking.';
      alert(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  const openReviewModal = (booking) => {
    setSelectedBooking(booking);
    setReviewForm({
      qualityRating: 5,
      punctualityRating: 5,
      communicationRating: 5
    });
    setReviewComment('');
    setReviewModalOpen(true);
  };

  const openViewModal = (booking) => {
    setSelectedViewBooking(booking);
    setViewModalOpen(true);
  };

  const submitReview = async (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!selectedBooking) return;

    try {
      const payload = {
        ...reviewForm,
        reviewComment: reviewComment
      };
      await axios.post(`${API_BASE_URL}/bookings/${selectedBooking.id}/review`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setReviewModalOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review.');
    }
  };

  const renderStarRating = (category, value, onChange) => {
    return (
      <div style={{ backgroundColor: '#f7f7f8', borderRadius: '16px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', border: '1px solid #e4e4e7' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#000000' }}>{category}</div>
          <div style={{ fontSize: '0.75rem', color: '#71717a' }}>Select rating (1 to 5 stars)</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= value;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.15s ease',
                  borderRadius: '50%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.25)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                aria-label={`${star} of 5 stars for ${category}`}
              >
                <md-icon style={{
                  fontSize: '28px',
                  color: isFilled ? '#000000' : '#d4d4d8',
                  fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
                  transition: 'color 0.2s'
                }}>
                  star
                </md-icon>
              </button>
            );
          })}
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#000000', marginLeft: '6px', minWidth: '32px', textAlign: 'right' }}>
            {value} / 5
          </span>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Requested':
        return (
          <span className="booking-badge booking-badge-requested">
            <md-icon style={{ fontSize: '14px' }}>schedule</md-icon>
            Requested
          </span>
        );
      case 'Confirmed':
        return (
          <span className="booking-badge booking-badge-confirmed">
            <md-icon style={{ fontSize: '14px' }}>thumb_up</md-icon>
            Confirmed
          </span>
        );
      case 'InProgress':
        return (
          <span className="booking-badge booking-badge-inprogress">
            <md-icon style={{ fontSize: '14px' }}>sync</md-icon>
            In Progress
          </span>
        );
      case 'Completed':
        return (
          <span className="booking-badge booking-badge-completed">
            <md-icon style={{ fontSize: '14px' }}>check_circle</md-icon>
            Completed
          </span>
        );
      case 'Reviewed':
        return (
          <span className="booking-badge booking-badge-reviewed">
            <md-icon style={{ fontSize: '14px' }}>star</md-icon>
            Reviewed
          </span>
        );
      case 'Rejected':
        return (
          <span className="booking-badge booking-badge-rejected">
            <md-icon style={{ fontSize: '14px' }}>cancel</md-icon>
            Rejected
          </span>
        );
      case 'Cancelled':
      default:
        return (
          <span className="booking-badge booking-badge-cancelled">
            <md-icon style={{ fontSize: '14px' }}>block</md-icon>
            {status || 'Cancelled'}
          </span>
        );
    }
  };

  const filteredBookings = bookings.filter(b => {
    // 1. Status Filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'Requested' && b.status !== 'Requested') return false;
      if (statusFilter === 'Active' && !['Confirmed', 'InProgress'].includes(b.status)) return false;
      if (statusFilter === 'Completed' && !['Completed', 'Reviewed'].includes(b.status)) return false;
      if (statusFilter === 'Cancelled' && !['Cancelled', 'Rejected'].includes(b.status)) return false;
      if (statusFilter !== 'Requested' && statusFilter !== 'Active' && statusFilter !== 'Completed' && statusFilter !== 'Cancelled' && b.status !== statusFilter) return false;
    }

    // 2. Search Text
    if (!bookingSearch.trim()) return true;
    const q = bookingSearch.toLowerCase();
    return (
      (b.jobTitle && b.jobTitle.toLowerCase().includes(q)) ||
      (b.workerName && b.workerName.toLowerCase().includes(q)) ||
      (b.residentName && b.residentName.toLowerCase().includes(q)) ||
      (b.locationAddress && b.locationAddress.toLowerCase().includes(q)) ||
      (b.status && b.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bookings-page-container">
      {/* Google Workspace / Material 3 Top Navbar */}
      

      <div className="bookings-layout">
        {/* Left Sidebar Navigation */}
        <aside className={`bookings-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
          <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(prev => !prev)} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <md-icon>{isSidebarCollapsed ? 'chevron_right' : 'chevron_left'}</md-icon>
          </button>

          <nav className="m3-drawer-nav">
            <div
              className={`m3-drawer-item ${statusFilter === 'All' ? 'active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">inbox</md-icon>
                <span className="m3-drawer-label">All Bookings</span>
              </div>
              <span className="m3-drawer-badge">{bookings.length}</span>
            </div>

            <div
              className={`m3-drawer-item ${statusFilter === 'Requested' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Requested')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">pending_actions</md-icon>
                <span className="m3-drawer-label">Requests</span>
              </div>
              <span className="m3-drawer-badge">{bookings.filter(b => b.status === 'Requested').length}</span>
            </div>

            <div
              className={`m3-drawer-item ${statusFilter === 'Active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Active')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">bolt</md-icon>
                <span className="m3-drawer-label">Active / Ongoing</span>
              </div>
              <span className="m3-drawer-badge">{bookings.filter(b => ['Confirmed', 'InProgress'].includes(b.status)).length}</span>
            </div>

            <div
              className={`m3-drawer-item ${statusFilter === 'Completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Completed')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">check_circle</md-icon>
                <span className="m3-drawer-label">Completed</span>
              </div>
              <span className="m3-drawer-badge">{bookings.filter(b => ['Completed', 'Reviewed'].includes(b.status)).length}</span>
            </div>

            <div
              className={`m3-drawer-item ${statusFilter === 'Cancelled' ? 'active' : ''}`}
              onClick={() => setStatusFilter('Cancelled')}
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">cancel</md-icon>
                <span className="m3-drawer-label">Cancelled</span>
              </div>
              <span className="m3-drawer-badge">{bookings.filter(b => ['Cancelled', 'Rejected'].includes(b.status)).length}</span>
            </div>
          </nav>
        </aside>

        <main className="bookings-main">
                    {/* Main Controls Search & Filter Bar */}
          <div className="uber-search-card" id="find-search-main" style={{ marginTop: '0', marginBottom: '16px' }}>
            <div className="uber-search-input-wrap">
              <i className="fa-solid fa-magnifying-glass uber-search-icon"></i>
              <input
                type="text"
                className="uber-search-input"
                placeholder="Search bookings by job, worker, location, status..."
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
              />
              {bookingSearch && (
                <button
                  type="button"
                  onClick={() => setBookingSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#757575', padding: '4px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="uber-toolbar-actions">
              <select
                className="uber-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>

              {/* Grid View Mode Switcher Button Group (Icon Only) */}
              <div className="uber-view-mode-group" role="group" aria-label="Card grid view mode">
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'large' ? 'active' : ''}`}
                  onClick={() => setViewMode('large')}
                  title="Large Cards View"
                >
                  <i className="fa-solid fa-table-cells-large"></i>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'small' ? 'active' : ''}`}
                  onClick={() => setViewMode('small')}
                  title="Small Cards View"
                >
                  <i className="fa-solid fa-grip"></i>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                >
                  <i className="fa-solid fa-list-ul"></i>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', margin: '4px 0 16px 0' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: 0, letterSpacing: '-0.02em' }}>
              My Bookings ({activeRole})
            </h2>
          </div>

          {/* Worker Busy / In Progress Status Banner */}
          {hasInProgressJob && (
            <div className="worker-busy-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 340px' }}>
                <div className="worker-busy-icon">
                  <md-icon style={{ fontSize: '24px' }}>engineering</md-icon>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#000000', fontSize: '1.05rem', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                      Status: Busy (Active Job In Progress)
                    </span>
                    <span className="worker-busy-tag">
                      LOCKED
                    </span>
                  </div>
                  <div style={{ color: '#71717a', fontSize: '0.88rem', marginTop: '4px', lineHeight: 1.5 }}>
                    You are currently working on <strong style={{ color: '#000000' }}>"{activeJob?.jobTitle}"</strong>. New requests and other job starts are paused until this active job is completed.
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
              <Loader size={56} />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#71717a' }}>Loading your bookings...</span>
            </div>
          ) : error ? (
            <div style={{ backgroundColor: '#f4f4f5', color: '#000000', padding: '16px 20px', borderRadius: '14px', border: '1.5px solid #000000', fontWeight: 600 }}>{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', padding: '48px 24px', borderRadius: '18px', textAlign: 'center', border: '1px solid #e4e4e7', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f4f4f5',
                color: '#000000',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <md-icon style={{ fontSize: '28px' }}>inbox</md-icon>
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 800, color: '#000000' }}>{bookingSearch ? 'No matching bookings found' : 'No bookings found'}</h2>
              <p style={{ color: '#71717a', margin: 0, fontSize: '0.92rem' }}>{bookingSearch ? 'Try a different search term.' : "You don't have any bookings yet."}</p>
              {activeRole === 'Resident' && (
                <button
                  type="button"
                  className="booking-btn-black"
                  onClick={() => navigate('/find')}
                  style={{ marginTop: '20px' }}
                >
                  Find a Worker
                </button>
              )}
            </div>
          ) : (
            <div className={`community-cards-grid view-${viewMode}`}>
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-card-header">
                    <div>
                      <h3 className="booking-card-title">
                        {booking.jobTitle}
                        {booking.urgency && (
                          <span className="booking-priority-badge">
                            <md-icon style={{ fontSize: '13px' }}>flag</md-icon>
                            {booking.urgency} Priority
                          </span>
                        )}
                      </h3>
                      <div className="booking-meta-row">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <md-icon style={{ fontSize: '16px', color: '#000000' }}>calendar_today</md-icon>
                          {new Date(booking.scheduledDate).toLocaleString()}
                        </span>
                      </div>
                      {cleanDescription(booking.description) && (
                        <p className="booking-description">
                          {cleanDescription(booking.description)}
                        </p>
                      )}
                    </div>
                    <div>
                      {renderStatusBadge(booking.status)}
                    </div>
                  </div>

                  <div className="booking-details-box">
                    <div>
                      <div className="booking-details-label">
                        {activeRole === 'Resident' ? 'Worker Details' : 'Client Details'}
                      </div>
                      <div className="booking-details-name">
                        {activeRole === 'Resident' ? booking.workerName : booking.residentName}
                      </div>
                      <div className="booking-details-phone">
                        <md-icon style={{ fontSize: '14px', color: '#000000' }}>call</md-icon>
                        {activeRole === 'Resident' ? booking.workerPhone || 'N/A' : booking.residentPhone || booking.contactPhone}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="booking-details-label">Estimated Price</div>
                      <div className="booking-price-amount">
                        {booking.estimatedPrice ? `Rs. ${booking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="booking-btn-outlined"
                      onClick={() => openViewModal(booking)}
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="booking-btn-outlined"
                      onClick={() => navigate('/chats')}
                    >
                      Message
                    </button>

                    {activeRole === 'Resident' && ['Requested', 'Pending'].includes(booking.status) && (
                      <button
                        type="button"
                        className="booking-btn-secondary"
                        onClick={() => promptCancelBooking(booking)}
                      >
                        Cancel Booking
                      </button>
                    )}

                    {activeRole === 'Worker' && booking.status === 'Requested' && (
                      <>
                        <button
                          type="button"
                          className="booking-btn-secondary"
                          onClick={() => handleAction(booking.id, 'reject')}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="booking-btn-black"
                          onClick={() => handleAction(booking.id, 'accept')}
                          disabled={hasInProgressJob}
                          title={hasInProgressJob ? "You cannot accept new requests while an active job is in progress." : ""}
                          style={{
                            opacity: hasInProgressJob ? 0.4 : 1,
                            cursor: hasInProgressJob ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Accept Request
                        </button>
                      </>
                    )}

                    {activeRole === 'Worker' && booking.status === 'Confirmed' && (
                      <button
                        type="button"
                        className="booking-btn-black"
                        onClick={() => handleAction(booking.id, 'start')}
                        disabled={hasInProgressJob}
                        title={hasInProgressJob ? "Finish your current in-progress job before starting another." : ""}
                        style={{
                          opacity: hasInProgressJob ? 0.4 : 1,
                          cursor: hasInProgressJob ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Start Job
                      </button>
                    )}

                    {activeRole === 'Worker' && booking.status === 'InProgress' && (
                      <button
                        type="button"
                        className="booking-btn-black"
                        onClick={() => handleAction(booking.id, 'complete')}
                      >
                        <md-icon style={{ fontSize: '18px' }}>check_circle</md-icon>
                        Mark Completed
                      </button>
                    )}

                    {activeRole === 'Resident' && booking.status === 'Completed' && (
                      <button
                        type="button"
                        className="booking-btn-black"
                        onClick={() => openReviewModal(booking)}
                      >
                        ★ Leave a Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      {/* Review Modal (Material 3 md-dialog Web Component) */}
      {createPortal(
        <md-dialog
          ref={reviewDialogRef}
          onClose={() => setReviewModalOpen(false)}
          style={{
            '--md-dialog-container-color': '#ffffff',
            '--md-dialog-container-shape': '28px',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
            position: 'fixed',
            inset: 0,
            margin: 'auto',
            zIndex: 9999,
            minWidth: '320px',
            maxWidth: '560px',
            width: 'min(560px, calc(100vw - 32px))'
          }}
        >
          {/* Modal Header */}
          <div slot="headline" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '24px 28px 16px 28px',
            boxSizing: 'border-box',
            borderBottom: '1px solid #e4e4e7',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#000000',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <md-icon style={{ fontSize: '24px', color: '#ffffff' }}>rate_review</md-icon>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#000000', lineHeight: 1.2, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                Review {selectedBooking?.workerName || 'Worker'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Rate your experience for {selectedBooking?.jobTitle}</span>
            </div>
          </div>

          {/* Modal Content */}
          <div slot="content" style={{ padding: '20px 28px', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
            {selectedBooking && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {renderStarRating(
                  'Quality & Craftsmanship',
                  reviewForm.qualityRating,
                  (val) => setReviewForm(prev => ({ ...prev, qualityRating: val }))
                )}

                {renderStarRating(
                  'Punctuality',
                  reviewForm.punctualityRating,
                  (val) => setReviewForm(prev => ({ ...prev, punctualityRating: val }))
                )}

                {renderStarRating(
                  'Communication',
                  reviewForm.communicationRating,
                  (val) => setReviewForm(prev => ({ ...prev, communicationRating: val }))
                )}

                <div style={{ marginTop: '4px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Comment / Feedback
                  </label>
                  <textarea
                    rows="3"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="How was the service? Mention quality, timeliness, or notes..."
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '14px',
                      border: '1px solid #e4e4e7',
                      backgroundColor: '#f7f7f8',
                      fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
                      fontSize: '0.95rem',
                      color: '#000000',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div slot="actions" style={{ padding: '16px 28px 24px 28px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #e4e4e7' }}>
            <button
              type="button"
              className="booking-btn-outlined"
              onClick={() => setReviewModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="booking-btn-black"
              onClick={submitReview}
            >
              Submit Review
            </button>
          </div>
        </md-dialog>,
        document.body
      )}

      {/* View Booking Details Modal (Material 3 md-dialog Web Component) */}
      {createPortal(
        <md-dialog
          ref={viewDialogRef}
          onClose={() => setViewModalOpen(false)}
          style={{
            '--md-dialog-container-color': '#ffffff',
            '--md-dialog-container-shape': '28px',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
            position: 'fixed',
            inset: 0,
            margin: 'auto',
            zIndex: 9999,
            minWidth: '320px',
            maxWidth: '900px',
            width: 'min(900px, calc(100vw - 32px))'
          }}
        >
          {/* Modal Header */}
          <div slot="headline" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px 16px 28px',
            boxSizing: 'border-box',
            borderBottom: '1px solid #e4e4e7',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#000000',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <md-icon style={{ fontSize: '22px', color: '#ffffff' }}>assignment</md-icon>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#000000', lineHeight: 1.2, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>Booking Details</h3>
                <span style={{ fontSize: '0.85rem', color: '#71717a' }}>Reference ID: #{selectedViewBooking?.id}</span>
              </div>
            </div>

            <md-icon-button onClick={() => setViewModalOpen(false)}>
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>

          {/* Modal Content */}
          <div slot="content" style={{ padding: '20px 28px', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
            {selectedViewBooking && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>

                {/* Left Column: Booking Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Title</label>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#000000', marginTop: '2px' }}>{selectedViewBooking.jobTitle}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Status</label>
                      {renderStatusBadge(selectedViewBooking.status)}
                    </div>

                    {selectedViewBooking.urgency && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Priority</label>
                        <span className="booking-priority-badge">
                          <md-icon style={{ fontSize: '13px' }}>flag</md-icon>
                          {selectedViewBooking.urgency}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#f7f7f8', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e4e4e7' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <md-icon style={{ color: '#000000', fontSize: '20px', marginTop: '2px' }}>calendar_today</md-icon>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Date & Time</label>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#000000' }}>{new Date(selectedViewBooking.scheduledDate).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <md-icon style={{ color: '#000000', fontSize: '20px', marginTop: '2px' }}>location_on</md-icon>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Location</label>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#000000' }}>{cleanAddress(selectedViewBooking.locationAddress)}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '16px', backgroundColor: '#f7f7f8', borderRadius: '16px', border: '1px solid #e4e4e7' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>{activeRole === 'Resident' ? 'Worker' : 'Client'}</label>
                      <div style={{ fontWeight: 700, color: '#000000', fontSize: '1rem', marginTop: '2px' }}>{activeRole === 'Resident' ? selectedViewBooking.workerName : selectedViewBooking.residentName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#71717a', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <md-icon style={{ fontSize: '14px', color: '#000000' }}>call</md-icon>
                        {activeRole === 'Resident' ? selectedViewBooking.workerPhone || 'N/A' : selectedViewBooking.residentPhone || selectedViewBooking.contactPhone}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase' }}>Estimated Price</label>
                      <div style={{ fontWeight: 900, color: '#000000', fontSize: '1.25rem', marginTop: '2px' }}>
                        {selectedViewBooking.estimatedPrice ? `Rs. ${selectedViewBooking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {cleanDescription(selectedViewBooking.description) && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#71717a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes / Description</label>
                      <div style={{ fontSize: '0.95rem', color: '#000000', padding: '14px 16px', backgroundColor: '#f7f7f8', borderRadius: '14px', whiteSpace: 'pre-wrap', marginTop: '6px', lineHeight: 1.5, border: '1px solid #e4e4e7' }}>
                        {cleanDescription(selectedViewBooking.description)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Interactive Booking Lifecycle Stepper */}
                <div>
                  <div style={{ backgroundColor: '#f7f7f8', borderRadius: '20px', padding: '24px 20px', border: '1px solid #e4e4e7' }}>
                    <h5 style={{ margin: '0 0 20px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#71717a', fontWeight: 800 }}>
                      Service Lifecycle Status
                    </h5>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                      {/* Step 1: Requested */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>1. Booking Requested</strong>
                            <span style={{
                              fontSize: '0.72rem',
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              padding: '2px 9px',
                              borderRadius: '9999px',
                              fontWeight: 800,
                              whiteSpace: 'nowrap'
                            }}>Completed</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Request submitted by resident</div>
                        </div>
                      </div>

                      {/* Step 2: Worker Accepts / Rejects */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        opacity: ['Requested', 'Rejected', 'Cancelled'].includes(selectedViewBooking.status) ? 1 : 0.95
                      }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: ['Confirmed', 'InProgress', 'Completed', 'Reviewed', 'Requested'].includes(selectedViewBooking.status) ? '#000000' : '#e4e4e7',
                          color: ['Confirmed', 'InProgress', 'Completed', 'Reviewed', 'Requested'].includes(selectedViewBooking.status) ? '#ffffff' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                          ) : (['Rejected', 'Cancelled'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#000000' }}>close</md-icon>
                          ) : '2')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>2. Worker Accepts / Rejects</strong>
                            {selectedViewBooking.status === 'Requested' && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#f4f4f5',
                                color: '#000000',
                                border: '1.5px solid #000000',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                In Progress
                              </span>
                            )}
                            {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Accepted
                              </span>
                            )}
                            {['Rejected', 'Cancelled'].includes(selectedViewBooking.status) && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#e4e4e7',
                                color: '#71717a',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                {selectedViewBooking.status}
                              </span>
                            )}
                          </div>
                          {selectedViewBooking.status === 'Requested' && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Worker notified & awaiting confirmation</div>
                          )}
                          {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Worker accepted the booking</div>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Confirmed */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        opacity: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.4
                      }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#e4e4e7',
                          color: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#ffffff' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                          ) : '3'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>3. Confirmed</strong>
                            {selectedViewBooking.status === 'Confirmed' && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Ready to Start
                              </span>
                            )}
                            {['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Done
                              </span>
                            )}
                          </div>
                          {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Schedule locked in</div>
                          )}
                        </div>
                      </div>

                      {/* Step 4: In Progress */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        opacity: ['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.4
                      }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: ['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#e4e4e7',
                          color: ['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#ffffff' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                          ) : '4'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>4. In Progress</strong>
                            {selectedViewBooking.status === 'InProgress' && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Active Now
                              </span>
                            )}
                            {['Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Done
                              </span>
                            )}
                          </div>
                          {selectedViewBooking.status === 'InProgress' && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Work actively being carried out</div>
                          )}
                        </div>
                      </div>

                      {/* Step 5: Completed */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        opacity: ['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.4
                      }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: ['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#e4e4e7',
                          color: ['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#ffffff' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {selectedViewBooking.status === 'Reviewed' ? (
                            <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                          ) : '5'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>5. Completed</strong>
                            {['Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Finished
                              </span>
                            )}
                          </div>
                          {['Completed', 'Reviewed'].includes(selectedViewBooking.status) && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Service finished successfully</div>
                          )}
                        </div>
                      </div>

                      {/* Step 6: Reviewed */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '14px',
                        opacity: selectedViewBooking.status === 'Reviewed' ? 1 : 0.4
                      }}>
                        <div style={{
                          width: '32px', height: '32px', flexShrink: 0,
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'Reviewed' ? '#000000' : '#e4e4e7',
                          color: selectedViewBooking.status === 'Reviewed' ? '#ffffff' : '#71717a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {selectedViewBooking.status === 'Reviewed' ? (
                            <md-icon style={{ fontSize: '16px', color: '#ffffff' }}>check</md-icon>
                          ) : '6'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            <strong style={{ color: '#000000', fontSize: '0.92rem' }}>6. Reviewed</strong>
                            {selectedViewBooking.status === 'Reviewed' && (
                              <span style={{
                                fontSize: '0.72rem',
                                backgroundColor: '#000000',
                                color: '#ffffff',
                                padding: '2px 9px',
                                borderRadius: '9999px',
                                fontWeight: 800,
                                whiteSpace: 'nowrap'
                              }}>
                                Reviewed
                              </span>
                            )}
                          </div>
                          {selectedViewBooking.status === 'Reviewed' && (
                            <div style={{ fontSize: '0.78rem', color: '#71717a' }}>Feedback & rating submitted</div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Full-width Map Preview & Google Maps Action */}
                <div style={{
                  gridColumn: '1 / -1',
                  backgroundColor: '#f7f7f8',
                  borderRadius: '20px',
                  padding: '20px',
                  border: '1px solid #e4e4e7',
                  marginTop: '4px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <md-icon style={{ fontSize: '20px', color: '#ffffff' }}>map</md-icon>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#000000', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                          Service Location & Map Preview
                        </h4>
                        <span style={{ fontSize: '0.85rem', color: '#71717a' }}>
                          {cleanAddress(selectedViewBooking.locationAddress)}
                        </span>
                      </div>
                    </div>

                    <a
                      href={getGoogleMapsUrl(selectedViewBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', display: 'inline-flex' }}
                    >
                      <button
                        type="button"
                        className="booking-btn-black"
                      >
                        <md-icon style={{ fontSize: '18px', display: 'flex', alignItems: 'center' }}>open_in_new</md-icon>
                        <span>View on Google Maps</span>
                      </button>
                    </a>
                  </div>

                  {/* Leaflet Map */}
                  {(() => {
                    const coords = extractCoordinates(selectedViewBooking);
                    const defaultCenter = [6.74016, 80.38114];
                    const pinPos = coords ? [coords.lat, coords.lng] : defaultCenter;

                    return (
                      <div style={{
                        height: '270px',
                        width: '100%',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid #e4e4e7',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                        position: 'relative',
                        zIndex: 1
                      }}>
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
                              <div style={{ fontFamily: "var(--font-body, 'DM Sans', sans-serif)", padding: '4px 2px' }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#e11d48', letterSpacing: '0.05em' }}>
                                  Service Location
                                </div>
                                <strong style={{ fontSize: '0.95rem', color: '#000000', display: 'block', marginTop: '2px' }}>
                                  {selectedViewBooking.jobTitle}
                                </strong>
                                <div style={{ fontSize: '0.85rem', color: '#52525b', marginTop: '3px' }}>
                                  {cleanAddress(selectedViewBooking.locationAddress)}
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                          <RecenterMap lat={pinPos[0]} lng={pinPos[1]} />
                        </MapContainer>
                      </div>
                    );
                  })()}
                </div>

              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div slot="actions" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 28px 24px 28px',
            borderTop: '1px solid #e4e4e7',
            boxSizing: 'border-box',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <button
              type="button"
              className="booking-btn-black"
              onClick={() => setViewModalOpen(false)}
            >
              Close Window
            </button>
          </div>
        </md-dialog>,
        document.body
      )}

      {/* Material 3 Cancel Confirmation Dialog with Hero Icon */}
      {createPortal(
        <md-dialog
          ref={cancelDialogRef}
          onClose={() => { setCancelDialogOpen(false); setBookingToCancel(null); }}
          style={{
            '--md-dialog-container-color': '#ffffff',
            '--md-dialog-container-shape': '28px',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
            position: 'fixed',
            inset: 0,
            margin: 'auto',
            zIndex: 10000,
            minWidth: '320px',
            maxWidth: '460px',
            width: 'min(460px, calc(100vw - 32px))'
          }}
        >
          {/* Headline with centered Hero Icon */}
          <div slot="headline" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            padding: '28px 20px 6px 20px',
            textAlign: 'center',
            fontFamily: "var(--font-heading, 'DM Sans', sans-serif)"
          }}>
            <md-icon style={{ fontSize: '40px', color: '#000000' }}>
              cancel
            </md-icon>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#000000', lineHeight: 1.25 }}>
              Cancel Booking Request?
            </span>
          </div>

          {/* Content */}
          <div slot="content" style={{
            textAlign: 'center',
            fontSize: '0.95rem',
            color: '#52525b',
            lineHeight: 1.6,
            padding: '8px 24px 20px 24px',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            Are you sure you want to cancel the request for <strong style={{ color: '#000000' }}>"{bookingToCancel?.jobTitle}"</strong>? This will notify the worker that the job has been cancelled.
          </div>

          {/* Actions */}
          <div slot="actions" style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            padding: '0 20px 20px 20px',
            boxSizing: 'border-box',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <button
              type="button"
              className="booking-btn-outlined"
              onClick={() => { setCancelDialogOpen(false); setBookingToCancel(null); }}
              disabled={cancelLoading}
            >
              Keep Booking
            </button>

            <button
              type="button"
              className="booking-btn-black"
              onClick={confirmCancelBooking}
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
            </button>
          </div>
        </md-dialog>,
        document.body
      )}
    </div>
  );
}

