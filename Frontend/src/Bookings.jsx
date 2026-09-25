import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css'; // Leveraging existing App.css for styles
import M3TopNavbar from './components/M3TopNavbar.jsx';
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

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [bookingSearch, setBookingSearch] = useState('');
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
    communicationRating: 5,
    comment: ''
  });

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
      communicationRating: 5,
      comment: ''
    });
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
      await axios.post(`${API_BASE_URL}/bookings/${selectedBooking.id}/review`, reviewForm, {
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
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{category}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Select rating (1 to 5 stars)</div>
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
                  color: isFilled ? '#FDC101' : '#cbd5e1',
                  fontVariationSettings: isFilled ? "'FILL' 1" : "'FILL' 0",
                  transition: 'color 0.2s'
                }}>
                  {isFilled ? 'star' : 'star'}
                </md-icon>
              </button>
            );
          })}
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginLeft: '6px', minWidth: '32px', textAlign: 'right' }}>
            {value} / 5
          </span>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (status) => {
    const statusStyles = {
      Requested: isWorker ? { bg: '#dbeafe', text: '#1e40af' } : { bg: '#fef3c7', text: '#d97706' },
      Confirmed: { bg: '#dbeafe', text: '#1e40af' },
      InProgress: { bg: '#e0e7ff', text: '#4338ca' },
      Completed: { bg: '#d1fae5', text: '#065f46' },
      Reviewed: { bg: '#ecfdf5', text: '#047857' },
      Rejected: { bg: '#fee2e2', text: '#991b1b' },
      Cancelled: { bg: '#f3f4f6', text: '#374151' },
    };
    const style = statusStyles[status] || { bg: '#f3f4f6', text: '#374151' };

    return (
      <span style={{ backgroundColor: style.bg, color: style.text, padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
        {status}
      </span>
    );
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
    <div className="find-page-container">
      {/* Google Workspace / Material 3 Top Navbar */}
      <M3TopNavbar
        activePage="bookings"
        searchValue={bookingSearch}
        onSearchChange={setBookingSearch}
        searchPlaceholder="Search bookings by job, worker, location, status..."
        showSidebarToggle={true}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
      />

      <div className="find-layout">
        {/* Left Sidebar Navigation */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
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

        <main className="find-main" style={{ flex: 1, minWidth: 0 }}>
          <div className="find-main-header">
            <div>
              <h1 className="find-results-title">My Bookings ({activeRole})</h1>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                Manage your home service requests and appointments
              </p>
            </div>
          </div>

          {/* Worker Busy / In Progress Status Banner */}
          {hasInProgressJob && (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 340px' }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563EB',
                  flexShrink: 0
                }}>
                  <md-icon style={{ fontSize: '26px' }}>engineering</md-icon>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                      Status: Busy (Active Job In Progress)
                    </span>
                    <span style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.05em'
                    }}>
                      LOCKED
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '4px', lineHeight: 1.5 }}>
                    You are currently working on <strong style={{ color: '#0f172a' }}>"{activeJob?.jobTitle}"</strong>. New requests and other job starts are paused until this active job is completed.
                  </div>
                </div>
              </div>


            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
              <Loader size={56} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>Loading your bookings...</span>
            </div>
          ) : error ? (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px' }}>{error}</div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', padding: '48px 24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <md-icon style={{ fontSize: '28px' }}>inbox</md-icon>
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#111827' }}>{bookingSearch ? 'No matching bookings found' : 'No bookings found'}</h2>
              <p style={{ color: '#6b7280', margin: 0 }}>{bookingSearch ? 'Try a different search term.' : "You don't have any bookings yet."}</p>
              {activeRole === 'Resident' && (
                <md-filled-button
                  onClick={() => navigate('/find')}
                  style={{
                    marginTop: '20px',
                    '--md-sys-color-primary': '#FDC101',
                    '--md-sys-color-on-primary': '#000000',
                    fontWeight: 700
                  }}
                >
                  Find a Worker
                </md-filled-button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredBookings.map((booking) => (
                <div key={booking.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {booking.jobTitle}
                        {booking.urgency && (
                          <span style={{
                            backgroundColor: booking.urgency.toLowerCase() === 'high' || booking.urgency.toLowerCase() === 'urgent' ? '#fee2e2' : '#f1f5f9',
                            color: booking.urgency.toLowerCase() === 'high' || booking.urgency.toLowerCase() === 'urgent' ? '#dc2626' : '#475569',
                            padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}>
                            <md-icon style={{ fontSize: '14px' }}>flag</md-icon>
                            {booking.urgency} Priority
                          </span>
                        )}
                      </h3>
                      <div style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><md-icon style={{ fontSize: '16px' }}>calendar_today</md-icon>{new Date(booking.scheduledDate).toLocaleString()}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><md-icon style={{ fontSize: '16px' }}>location_on</md-icon>{booking.locationAddress}</span>
                      </div>
                      {booking.description && (
                        <p style={{ margin: '12px 0 0 0', color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {booking.description}
                        </p>
                      )}
                    </div>
                    <div>
                      {renderStatusBadge(booking.status)}
                    </div>
                  </div>

                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                        {activeRole === 'Resident' ? 'Worker Details' : 'Client Details'}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {activeRole === 'Resident' ? booking.workerName : booking.residentName}
                      </div>
                      <div style={{ color: '#4b5563', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <md-icon style={{ fontSize: '15px' }}>call</md-icon>
                        {activeRole === 'Resident' ? booking.workerPhone || 'N/A' : booking.residentPhone || booking.contactPhone}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Price</div>
                      <div style={{ fontWeight: 800, color: isWorker ? '#2563eb' : '#d97706', fontSize: '1.1rem' }}>
                        {booking.estimatedPrice ? `Rs. ${booking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px', flexWrap: 'wrap' }}>
                    <md-outlined-button
                      onClick={() => openViewModal(booking)}
                      style={{
                        '--md-sys-color-primary': '#111827',
                        '--md-outlined-button-label-text-color': '#111827',
                        '--md-outlined-button-outline-color': '#cbd5e1',
                        color: '#111827',
                        fontWeight: 700,
                        padding: '0 24px',
                        minWidth: '100px'
                      }}
                    >
                      View
                    </md-outlined-button>

                    <md-outlined-button
                      onClick={() => navigate('/chats')}
                      style={{
                        '--md-sys-color-primary': '#111827',
                        '--md-outlined-button-label-text-color': '#111827',
                        '--md-outlined-button-outline-color': '#cbd5e1',
                        color: '#111827',
                        fontWeight: 700,
                        padding: '0 24px',
                        minWidth: '100px'
                      }}
                    >
                      Message
                    </md-outlined-button>

                    {activeRole === 'Resident' && ['Requested', 'Pending'].includes(booking.status) && (
                      <md-filled-button
                        onClick={() => promptCancelBooking(booking)}
                        style={{
                          '--md-sys-color-primary': '#dc2626',
                          '--md-sys-color-on-primary': '#ffffff',
                          fontWeight: 700,
                          padding: '0 24px',
                          minWidth: '100px'
                        }}
                      >
                        Cancel Booking
                      </md-filled-button>
                    )}

                    {activeRole === 'Worker' && booking.status === 'Requested' && (
                      <>
                        <md-filled-button onClick={() => handleAction(booking.id, 'reject')} style={{ '--md-sys-color-primary': '#dc2626', '--md-sys-color-on-primary': '#ffffff', fontWeight: 700, padding: '0 24px', minWidth: '100px' }}>Reject</md-filled-button>
                        <md-filled-button
                          onClick={() => handleAction(booking.id, 'accept')}
                          disabled={hasInProgressJob}
                          title={hasInProgressJob ? "You cannot accept new requests while an active job is in progress." : ""}
                          style={{
                            '--md-sys-color-primary': '#2563eb',
                            '--md-sys-color-on-primary': '#ffffff',
                            fontWeight: 700,
                            padding: '0 24px',
                            minWidth: '100px',
                            opacity: hasInProgressJob ? 0.5 : 1,
                            cursor: hasInProgressJob ? 'not-allowed' : 'pointer'
                          }}
                        >
                          Accept Request
                        </md-filled-button>
                      </>
                    )}

                    {activeRole === 'Worker' && booking.status === 'Confirmed' && (
                      <md-filled-button
                        onClick={() => handleAction(booking.id, 'start')}
                        disabled={hasInProgressJob}
                        title={hasInProgressJob ? "Finish your current in-progress job before starting another." : ""}
                        style={{
                          '--md-sys-color-primary': '#4338ca',
                          padding: '0 24px',
                          minWidth: '100px',
                          opacity: hasInProgressJob ? 0.5 : 1,
                          cursor: hasInProgressJob ? 'not-allowed' : 'pointer'
                        }}
                      >
                        Start Job
                      </md-filled-button>
                    )}

                    {activeRole === 'Worker' && booking.status === 'InProgress' && (
                      <md-filled-button
                        onClick={() => handleAction(booking.id, 'complete')}
                        style={{
                          '--md-sys-color-primary': '#059669',
                          padding: '0 24px',
                          minWidth: '100px',
                          boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        <md-icon slot="icon">check_circle</md-icon>
                        Mark Completed
                      </md-filled-button>
                    )}

                    {activeRole === 'Resident' && booking.status === 'Completed' && (
                      <md-filled-button onClick={() => openReviewModal(booking)} style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000', padding: '0 24px', minWidth: '100px' }}>⭐ Leave a Review</md-filled-button>
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
            borderBottom: '1px solid #f1f5f9',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#fef3c7',
              color: '#000000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <md-icon style={{ fontSize: '24px', color: '#000000' }}>rate_review</md-icon>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#111827', lineHeight: 1.2, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>
                Review {selectedBooking?.workerName || 'Worker'}
              </h3>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Rate your experience for {selectedBooking?.jobTitle}</span>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
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
                      border: 'none',
                      backgroundColor: '#f8fafc',
                      fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
                      fontSize: '0.95rem',
                      color: '#1e293b',
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
          <div slot="actions" style={{ padding: '16px 28px 24px 28px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9' }}>
            <md-outlined-button
              type="button"
              onClick={() => setReviewModalOpen(false)}
              style={{
                '--md-outlined-button-label-text-color': '#111827',
                '--md-outlined-button-outline-color': '#cbd5e1',
                color: '#111827',
                fontWeight: 700,
                padding: '0 24px',
                minWidth: '100px'
              }}
            >
              Cancel
            </md-outlined-button>

            <md-filled-button
              type="button"
              onClick={submitReview}
              style={{
                '--md-sys-color-primary': '#FDC101',
                '--md-sys-color-on-primary': '#000000',
                fontWeight: 800,
                padding: '0 24px',
                minWidth: '130px'
              }}
            >
              Submit Review
            </md-filled-button>
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
            borderBottom: '1px solid #f1f5f9',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#fef3c7',
                color: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <md-icon style={{ fontSize: '22px' }}>assignment</md-icon>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#111827', lineHeight: 1.2, fontFamily: "var(--font-heading, 'DM Sans', sans-serif)" }}>Booking Details</h3>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Reference ID: #{selectedViewBooking?.id}</span>
              </div>
            </div>
          </div>

          {/* Modal Content */}
          <div slot="content" style={{ padding: '20px 28px', fontFamily: "var(--font-body, 'DM Sans', sans-serif)" }}>
            {selectedViewBooking && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>

                {/* Left Column: Booking Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Title</label>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{selectedViewBooking.jobTitle}</div>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Status</label>
                      {renderStatusBadge(selectedViewBooking.status)}
                    </div>

                    {selectedViewBooking.urgency && (
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>Priority</label>
                        <span style={{
                          backgroundColor: selectedViewBooking.urgency.toLowerCase() === 'high' || selectedViewBooking.urgency.toLowerCase() === 'urgent' ? '#fee2e2' : '#f1f5f9',
                          color: selectedViewBooking.urgency.toLowerCase() === 'high' || selectedViewBooking.urgency.toLowerCase() === 'urgent' ? '#dc2626' : '#475569',
                          padding: '5px 12px', borderRadius: '12px', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                          display: 'inline-flex', alignItems: 'center', gap: '6px'
                        }}>
                          <md-icon style={{ fontSize: '15px' }}>flag</md-icon>
                          {selectedViewBooking.urgency}
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <md-icon style={{ color: '#FDC101', fontSize: '20px', marginTop: '2px' }}>calendar_today</md-icon>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Date & Time</label>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{new Date(selectedViewBooking.scheduledDate).toLocaleString()}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <md-icon style={{ color: '#FDC101', fontSize: '20px', marginTop: '2px' }}>location_on</md-icon>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Location</label>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{selectedViewBooking.locationAddress}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>{activeRole === 'Resident' ? 'Worker' : 'Client'}</label>
                      <div style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', marginTop: '2px' }}>{activeRole === 'Resident' ? selectedViewBooking.workerName : selectedViewBooking.residentName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <md-icon style={{ fontSize: '14px' }}>call</md-icon>
                        {activeRole === 'Resident' ? selectedViewBooking.workerPhone || 'N/A' : selectedViewBooking.residentPhone || selectedViewBooking.contactPhone}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Estimated Price</label>
                      <div style={{ fontWeight: 900, color: isWorker ? '#2563eb' : '#d97706', fontSize: '1.25rem', marginTop: '2px' }}>
                        {selectedViewBooking.estimatedPrice ? `Rs. ${selectedViewBooking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                      </div>
                    </div>
                  </div>

                  {selectedViewBooking.description && (
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes / Description</label>
                      <div style={{ fontSize: '0.95rem', color: '#334155', padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '14px', whiteSpace: 'pre-wrap', marginTop: '6px', lineHeight: 1.5 }}>
                        {selectedViewBooking.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Interactive Booking Lifecycle Stepper */}
                <div>
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '20px', padding: '22px' }}>
                    <h5 style={{ margin: '0 0 18px 0', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 800 }}>
                      Service Lifecycle Status
                    </h5>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                      {/* Step 1: Requested */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: '#000000', color: '#FDC101',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: '#111827', fontSize: '0.95rem' }}>1. Booking Requested</strong>
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#000000', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Completed</span>
                        </div>
                      </div>

                      {/* Step 2: Worker Accepts / Rejects */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: ['Requested', 'Rejected', 'Cancelled'].includes(selectedViewBooking.status) ? 1 : 0.9 }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'Requested' ? '#FDC101' : (['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#fee2e2'),
                          color: selectedViewBooking.status === 'Requested' ? '#000000' : (['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#FDC101' : '#dc2626'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800,
                          boxShadow: selectedViewBooking.status === 'Requested' ? '0 0 0 4px rgba(253,193,1,0.2)' : 'none'
                        }}>
                          {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                          ) : (['Rejected', 'Cancelled'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#dc2626' }}>close</md-icon>
                          ) : '2')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <strong style={{ color: selectedViewBooking.status === 'Requested' ? '#000000' : '#111827', fontSize: '0.95rem' }}>2. Worker Accepts / Rejects</strong>
                          {selectedViewBooking.status === 'Requested' && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>In Progress (Worker notified)</span>}
                          {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#000000', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Accepted</span>}
                          {['Rejected', 'Cancelled'].includes(selectedViewBooking.status) && <span style={{ marginLeft: '8px', fontSize: '0.75rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>{selectedViewBooking.status}</span>}
                        </div>
                      </div>

                      {/* Step 3: Confirmed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.5 }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'Confirmed' ? '#FDC101' : (['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#cbd5e1'),
                          color: selectedViewBooking.status === 'Confirmed' ? '#000000' : (['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#FDC101' : '#475569'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800,
                          boxShadow: selectedViewBooking.status === 'Confirmed' ? '0 0 0 4px rgba(253,193,1,0.2)' : 'none'
                        }}>
                          {['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                          ) : '3'}
                        </div>
                        <div>
                          <strong style={{ color: ['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#111827' : '#475569', fontSize: '0.95rem' }}>3. Confirmed</strong>
                        </div>
                      </div>

                      {/* Step 4: In Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: ['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.5 }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'InProgress' ? '#FDC101' : (['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#000000' : '#cbd5e1'),
                          color: selectedViewBooking.status === 'InProgress' ? '#000000' : (['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#FDC101' : '#475569'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800,
                          boxShadow: selectedViewBooking.status === 'InProgress' ? '0 0 0 4px rgba(253,193,1,0.2)' : 'none'
                        }}>
                          {['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? (
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                          ) : '4'}
                        </div>
                        <div>
                          <strong style={{ color: ['InProgress', 'Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#111827' : '#475569', fontSize: '0.95rem' }}>4. In Progress</strong>
                        </div>
                      </div>

                      {/* Step 5: Completed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: ['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? 1 : 0.5 }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'Completed' ? '#FDC101' : (selectedViewBooking.status === 'Reviewed' ? '#000000' : '#cbd5e1'),
                          color: selectedViewBooking.status === 'Completed' ? '#000000' : (selectedViewBooking.status === 'Reviewed' ? '#FDC101' : '#475569'),
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800,
                          boxShadow: selectedViewBooking.status === 'Completed' ? '0 0 0 4px rgba(253,193,1,0.2)' : 'none'
                        }}>
                          {selectedViewBooking.status === 'Reviewed' ? (
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                          ) : '5'}
                        </div>
                        <div>
                          <strong style={{ color: ['Completed', 'Reviewed'].includes(selectedViewBooking.status) ? '#111827' : '#475569', fontSize: '0.95rem' }}>5. Completed</strong>
                        </div>
                      </div>

                      {/* Step 6: Reviewed */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', opacity: selectedViewBooking.status === 'Reviewed' ? 1 : 0.5 }}>
                        <div style={{
                          width: '32px', height: '32px',
                          clipPath: 'polygon(50% 0%, 82% 12%, 99% 41%, 93% 75%, 67% 97%, 33% 97%, 7% 75%, 1% 41%, 18% 12%)',
                          backgroundColor: selectedViewBooking.status === 'Reviewed' ? '#000000' : '#cbd5e1',
                          color: selectedViewBooking.status === 'Reviewed' ? '#FDC101' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 800
                        }}>
                          {selectedViewBooking.status === 'Reviewed' ? (
                            <md-icon style={{ fontSize: '16px', color: '#FDC101' }}>check</md-icon>
                          ) : '6'}
                        </div>
                        <div>
                          <strong style={{ color: selectedViewBooking.status === 'Reviewed' ? '#111827' : '#475569', fontSize: '0.95rem' }}>6. Reviewed</strong>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div slot="actions" style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 28px 24px 28px',
            borderTop: '1px solid #f1f5f9',
            boxSizing: 'border-box',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            <md-filled-button
              onClick={() => setViewModalOpen(false)}
              style={{
                '--md-sys-color-primary': '#000000',
                '--md-sys-color-on-primary': '#FDC101',
                padding: '0 28px',
                fontWeight: 700,
                borderRadius: '24px'
              }}
            >
              Close Window
            </md-filled-button>
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
            <md-icon style={{ fontSize: '40px', color: '#dc2626' }}>
              cancel
            </md-icon>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', lineHeight: 1.25 }}>
              Cancel Booking Request?
            </span>
          </div>

          {/* Content */}
          <div slot="content" style={{
            textAlign: 'center',
            fontSize: '0.95rem',
            color: '#475569',
            lineHeight: 1.6,
            padding: '8px 24px 20px 24px',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)"
          }}>
            Are you sure you want to cancel the request for <strong style={{ color: '#111827' }}>"{bookingToCancel?.jobTitle}"</strong>? This will notify the worker that the job has been cancelled.
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
            <md-text-button
              onClick={() => { setCancelDialogOpen(false); setBookingToCancel(null); }}
              disabled={cancelLoading}
              style={{
                '--md-sys-color-primary': '#475569',
                fontWeight: 700,
                padding: '0 16px'
              }}
            >
              Keep Booking
            </md-text-button>

            <md-filled-button
              onClick={confirmCancelBooking}
              disabled={cancelLoading}
              style={{
                '--md-sys-color-primary': '#dc2626',
                '--md-sys-color-on-primary': '#ffffff',
                fontWeight: 700,
                padding: '0 24px',
                borderRadius: '20px'
              }}
            >
              {cancelLoading ? 'Cancelling...' : 'Yes, Cancel'}
            </md-filled-button>
          </div>
        </md-dialog>,
        document.body
      )}
    </div>
  );
}
