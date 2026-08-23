import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Leveraging existing App.css for styles
import UserMenu from './components/UserMenu.jsx';

import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5,
    comment: ''
  });

  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const currentUserEmail = localStorage.getItem('email');
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
      const endpoint = activeRole === 'Worker' 
        ? `http://localhost:5237/api/bookings/worker?email=${encodeURIComponent(currentUserEmail)}`
        : `http://localhost:5237/api/bookings/resident?email=${encodeURIComponent(currentUserEmail)}`;

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

  const handleAction = async (bookingId, action) => {
    try {
      await axios.post(`http://localhost:5237/api/bookings/${bookingId}/${action}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchBookings(); // Refresh list after action
    } catch (err) {
      console.error(`Error performing action ${action}:`, err);
      alert(`Failed to ${action} booking.`);
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

  const submitReview = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;

    try {
      await axios.post(`http://localhost:5237/api/bookings/${selectedBooking.id}/review`, reviewForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setReviewModalOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review.');
    }
  };

  const renderStatusBadge = (status) => {
    const statusStyles = {
      Requested: { bg: '#fef3c7', text: '#d97706' },
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

  return (
    <div className="app-container" style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827' }}>
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>
        <ul className="nav-links">
          <li className="nav-link" onClick={() => navigate('/')}>Home</li>
          <li className="nav-link" onClick={() => navigate('/find')}>Services</li>
          <li className="nav-link active" style={{ color: '#00d26a', fontWeight: 600 }}>Bookings</li>
          <li className="nav-link" onClick={() => navigate('/community')}>Community</li>
          <li className="nav-link" onClick={() => navigate('/chats')}>Messages</li>
        </ul>
        <div className="nav-actions">
          <UserMenu />
        </div>
      </header>

      <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>My Bookings ({activeRole})</h1>
        </div>

        {loading ? (
          <p>Loading bookings...</p>
        ) : error ? (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px' }}>{error}</div>
        ) : bookings.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
            <h2>No bookings found</h2>
            <p style={{ color: '#6b7280' }}>You don't have any bookings yet.</p>
            {activeRole === 'Resident' && (
              <md-filled-button onClick={() => navigate('/find')} style={{ marginTop: '16px' }}>Find a Worker</md-filled-button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {bookings.map((booking) => (
              <div key={booking.id} style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>{booking.jobTitle}</h3>
                    <div style={{ color: '#6b7280', fontSize: '0.9rem', display: 'flex', gap: '16px' }}>
                      <span><i className="fa-regular fa-calendar" style={{ marginRight: '6px' }}></i>{new Date(booking.scheduledDate).toLocaleString()}</span>
                      <span><i className="fa-solid fa-location-dot" style={{ marginRight: '6px' }}></i>{booking.locationAddress}</span>
                    </div>
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
                    <div style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                      <i className="fa-solid fa-phone" style={{ marginRight: '6px' }}></i>
                      {activeRole === 'Resident' ? booking.workerPhone || 'N/A' : booking.residentPhone || booking.contactPhone}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Estimated Price</div>
                    <div style={{ fontWeight: 800, color: '#d97706', fontSize: '1.1rem' }}>
                      {booking.estimatedPrice ? `Rs. ${booking.estimatedPrice.toLocaleString()}` : 'Negotiable'}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <md-outlined-button onClick={() => navigate('/chats')}>Message</md-outlined-button>

                  {activeRole === 'Worker' && booking.status === 'Requested' && (
                    <>
                      <md-outlined-button onClick={() => handleAction(booking.id, 'reject')} style={{ '--md-sys-color-primary': '#dc2626' }}>Reject</md-outlined-button>
                      <md-filled-button onClick={() => handleAction(booking.id, 'accept')}>Accept Request</md-filled-button>
                    </>
                  )}

                  {activeRole === 'Worker' && booking.status === 'Confirmed' && (
                    <md-filled-button onClick={() => handleAction(booking.id, 'start')} style={{ '--md-sys-color-primary': '#4338ca' }}>Start Job</md-filled-button>
                  )}

                  {activeRole === 'Worker' && booking.status === 'InProgress' && (
                    <md-filled-button onClick={() => handleAction(booking.id, 'complete')} style={{ '--md-sys-color-primary': '#059669' }}>Mark Completed</md-filled-button>
                  )}

                  {activeRole === 'Resident' && booking.status === 'Completed' && (
                    <md-filled-button onClick={() => openReviewModal(booking)} style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000' }}>⭐ Leave a Review</md-filled-button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedBooking && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginTop: 0 }}>Review {selectedBooking.workerName}</h2>
            
            <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Quality & Craftsmanship</label>
                <input type="range" min="1" max="5" value={reviewForm.qualityRating} onChange={(e) => setReviewForm({...reviewForm, qualityRating: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <div style={{ textAlign: 'center', fontWeight: 800 }}>{reviewForm.qualityRating} / 5</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Punctuality</label>
                <input type="range" min="1" max="5" value={reviewForm.punctualityRating} onChange={(e) => setReviewForm({...reviewForm, punctualityRating: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <div style={{ textAlign: 'center', fontWeight: 800 }}>{reviewForm.punctualityRating} / 5</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Communication</label>
                <input type="range" min="1" max="5" value={reviewForm.communicationRating} onChange={(e) => setReviewForm({...reviewForm, communicationRating: parseInt(e.target.value)})} style={{ width: '100%' }} />
                <div style={{ textAlign: 'center', fontWeight: 800 }}>{reviewForm.communicationRating} / 5</div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px' }}>Comment</label>
                <textarea rows="4" value={reviewForm.comment} onChange={(e) => setReviewForm({...reviewForm, comment: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} placeholder="How was the service?"></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <md-outlined-button type="button" onClick={() => setReviewModalOpen(false)}>Cancel</md-outlined-button>
                <md-filled-button type="submit" style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000' }}>Submit Review</md-filled-button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
