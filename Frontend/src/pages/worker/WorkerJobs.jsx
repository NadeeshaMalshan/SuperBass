import React, { useState, useEffect } from 'react';
import axios from 'axios';
import WorkerLayout from './WorkerLayout.jsx';

export default function WorkerJobs() {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'active' | 'history'
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reschedule Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const fetchBookings = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5237/api/bookings/worker?email=${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setBookings(res.data || []);
    } catch (err) {
      console.error('Error fetching worker bookings:', err);
      setError('Could not load bookings. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [userEmail]);

  // Status Filter Categories
  const requests = bookings.filter(b => b.status === 'Requested');
  const activeJobs = bookings.filter(b => b.status === 'Confirmed' || b.status === 'InProgress');
  const history = bookings.filter(b => ['Completed', 'Reviewed', 'Cancelled', 'Rejected'].includes(b.status));

  // 1. Accept Request -> Confirmed
  const handleAcceptRequest = async (id) => {
    try {
      setActionLoading(true);
      const res = await axios.post(`http://localhost:5237/api/bookings/${id}/accept`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('✓ Job Request Accepted! Status is now Confirmed.');
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
      setActiveTab('active');
    } catch (err) {
      console.error('Error accepting booking:', err);
      alert(err.response?.data?.message || 'Failed to accept booking.');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Decline / Reject Request -> Rejected
  const handleDeclineRequest = async (id) => {
    const reason = window.prompt('Please enter a reason for declining this request (optional):', 'Worker schedule unavailable');
    if (reason === null) return; // User cancelled prompt

    try {
      setActionLoading(true);
      const res = await axios.post(`http://localhost:5237/api/bookings/${id}/reject`, { reason }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('Booking request has been declined.');
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
    } catch (err) {
      console.error('Error rejecting booking:', err);
      alert(err.response?.data?.message || 'Failed to reject booking.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Start Job -> InProgress
  const handleStartJob = async (id) => {
    try {
      setActionLoading(true);
      const res = await axios.post(`http://localhost:5237/api/bookings/${id}/start`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('🚀 Job marked as In Progress!');
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
    } catch (err) {
      console.error('Error starting job:', err);
      alert(err.response?.data?.message || 'Failed to update job status.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Mark Completed -> Completed
  const handleCompleteJob = async (id) => {
    if (!window.confirm('Are you sure you have finished this job? This will notify the resident to rate and review.')) return;

    try {
      setActionLoading(true);
      const res = await axios.post(`http://localhost:5237/api/bookings/${id}/complete`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('🎉 Job marked as Completed! Resident has been requested for review.');
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
      setActiveTab('history');
    } catch (err) {
      console.error('Error completing job:', err);
      alert(err.response?.data?.message || 'Failed to complete job.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Reschedule Job
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking || !newDate) return;

    try {
      setActionLoading(true);
      const combinedDateTime = new Date(`${newDate}T${newTime}:00`);
      const res = await axios.post(`http://localhost:5237/api/bookings/${rescheduleBooking.id}/reschedule`, {
        scheduledDate: combinedDateTime.toISOString(),
        note: rescheduleNote
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert('📅 Booking rescheduled successfully!');
      setBookings(prev => prev.map(b => b.id === rescheduleBooking.id ? res.data : b));
      setRescheduleBooking(null);
    } catch (err) {
      console.error('Error rescheduling booking:', err);
      alert(err.response?.data?.message || 'Failed to reschedule.');
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Delete History Job
  const handleDeleteHistory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this job history record? This cannot be undone.')) return;

    try {
      setActionLoading(true);
      await axios.delete(`http://localhost:5237/api/bookings/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('🗑️ Job history record deleted successfully.');
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Error deleting job:', err);
      alert(err.response?.data?.message || 'Failed to delete job history.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <WorkerLayout activeTab="jobs">
      <div className="page-title-block" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">My Jobs & Booking Requests</h1>
          <p className="page-subtitle">Manage incoming hire requests, update live status for active work, and view completed job history.</p>
        </div>

        <button 
          onClick={fetchBookings} 
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 600,
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <i className="fa-solid fa-rotate-right"></i> Refresh
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="profile-tabs-nav">
        <button 
          className={`profile-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <i className="fa-solid fa-bell"></i>
          Booking Requests ({requests.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <i className="fa-solid fa-person-digging"></i>
          Active Jobs ({activeJobs.length})
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <i className="fa-solid fa-clock-rotate-left"></i>
          Job History ({history.length})
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
          Loading your bookings...
        </div>
      )}

      {error && !loading && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* ===================== TAB 1: BOOKING REQUESTS ===================== */}
      {!loading && activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {requests.length === 0 ? (
            <div className="worker-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📬</div>
              <strong>No pending booking requests right now.</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem' }}>New resident hire requests will appear here immediately.</p>
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="worker-card" style={{ marginBottom: 0, borderLeft: '4px solid #FDC101' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span className={`badge ${req.urgency === 'Emergency' || req.urgency === 'High' ? 'badge-warning' : 'badge-primary'}`} style={{
                        backgroundColor: req.urgency === 'Emergency' ? '#fee2e2' : req.urgency === 'High' ? '#fef3c7' : '#e0f2fe',
                        color: req.urgency === 'Emergency' ? '#991b1b' : req.urgency === 'High' ? '#92400e' : '#0369a1',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.8rem'
                      }}>
                        {req.urgency} Urgency
                      </span>

                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Requested #{req.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 8px 0' }}>
                      {req.jobTitle}
                    </h3>

                    {req.description && (
                      <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.5', margin: '0 0 10px 0', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        "{req.description}"
                      </p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.9rem', color: '#64748b' }}>
                      <div>
                        👤 Resident: <strong style={{ color: '#1e293b' }}>{req.residentName || req.residentEmail}</strong>
                      </div>
                      <div>
                        📍 Location: <strong style={{ color: '#1e293b' }}>{req.locationAddress}</strong>
                      </div>
                      <div>
                        📞 Phone: <strong style={{ color: '#2563eb' }}>{req.contactPhone || 'Available upon accept'}</strong>
                      </div>
                      <div>
                        📅 Scheduled: <strong style={{ color: '#2563eb' }}>{formatDateTime(req.scheduledDate)}</strong>
                      </div>
                    </div>

                    {req.estimatedPrice && (
                      <div style={{ marginTop: '10px', fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                        💰 Budget / Rate: Rs. {req.estimatedPrice.toLocaleString()} ({req.pricingModel})
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
                    <button 
                      className="worker-btn-primary" 
                      disabled={actionLoading}
                      onClick={() => handleAcceptRequest(req.id)}
                      style={{ width: '100%', padding: '12px 18px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ✓ Accept Job
                    </button>
                    <button 
                      className="worker-btn-outlined" 
                      disabled={actionLoading}
                      onClick={() => handleDeclineRequest(req.id)}
                      style={{ width: '100%', padding: '10px 18px', borderColor: '#ef4444', color: '#ef4444', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', background: 'none' }}
                    >
                      ✕ Decline
                    </button>
                    <button
                      onClick={() => navigate('/chats')}
                      style={{ width: '100%', padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      💬 Chat Resident
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===================== TAB 2: ACTIVE JOBS ===================== */}
      {!loading && activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeJobs.length === 0 ? (
            <div className="worker-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🛠️</div>
              <strong>No active jobs in progress right now.</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem' }}>Accept incoming booking requests to begin working on jobs.</p>
            </div>
          ) : (
            activeJobs.map(job => (
              <div key={job.id} className="worker-card" style={{ marginBottom: 0, borderLeft: job.status === 'InProgress' ? '4px solid #2563eb' : '4px solid #10b981' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        backgroundColor: job.status === 'InProgress' ? '#eff6ff' : '#ecfdf5',
                        color: job.status === 'InProgress' ? '#1d4ed8' : '#047857',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: job.status === 'InProgress' ? '#2563eb' : '#10b981'
                        }} />
                        {job.status === 'InProgress' ? 'In Progress' : 'Confirmed (Ready to start)'}
                      </span>

                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Job #{job.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
                      {job.jobTitle}
                    </h3>

                    {job.description && (
                      <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: '0 0 8px 0' }}>
                        {job.description}
                      </p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', fontSize: '0.9rem', color: '#64748b' }}>
                      <div>👤 Resident: <strong style={{ color: '#1e293b' }}>{job.residentName || job.residentEmail}</strong></div>
                      <div>📍 Location: <strong style={{ color: '#1e293b' }}>{job.locationAddress}</strong></div>
                      <div>📞 Phone: <strong style={{ color: '#2563eb' }}>{job.contactPhone || 'N/A'}</strong></div>
                      <div>📅 Scheduled: <strong style={{ color: '#2563eb' }}>{formatDateTime(job.scheduledDate)}</strong></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '170px' }}>
                    {job.status === 'Confirmed' ? (
                      <button 
                        disabled={actionLoading}
                        onClick={() => handleStartJob(job.id)}
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        🚀 Start Job
                      </button>
                    ) : (
                      <button 
                        disabled={actionLoading}
                        onClick={() => handleCompleteJob(job.id)}
                        style={{
                          width: '100%',
                          padding: '12px 18px',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        🎉 Mark Completed
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setRescheduleBooking(job);
                        setNewDate(new Date(job.scheduledDate).toISOString().split('T')[0]);
                      }}
                      style={{ width: '100%', padding: '8px 14px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      📅 Reschedule
                    </button>

                    <button
                      onClick={() => navigate('/chats')}
                      style={{ width: '100%', padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      💬 Chat Resident
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===================== TAB 3: JOB HISTORY ===================== */}
      {!loading && activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {history.length === 0 ? (
            <div className="worker-card" style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📜</div>
              <strong>No past job records found.</strong>
            </div>
          ) : (
            history.map(item => (
              <div key={item.id} className="worker-card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{
                        backgroundColor: item.status === 'Reviewed' ? '#fef3c7' : item.status === 'Completed' ? '#d1fae5' : '#fee2e2',
                        color: item.status === 'Reviewed' ? '#92400e' : item.status === 'Completed' ? '#065f46' : '#991b1b',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        {item.status}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        Job #{item.id}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827', margin: 0 }}>{item.jobTitle}</h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '4px', margin: '4px 0 0 0' }}>
                      {item.residentName || item.residentEmail} • {item.locationAddress} • Date: {formatDateTime(item.scheduledDate)}
                    </p>

                    {item.status === 'Reviewed' && item.reviewComment && (
                      <div style={{ marginTop: '8px', backgroundColor: '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef3c7', fontSize: '0.85rem', color: '#78350f' }}>
                        <strong>Resident Review:</strong> "{item.reviewComment}"
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {item.estimatedPrice && (
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#2563EB' }}>
                        Rs. {item.estimatedPrice.toLocaleString()}
                      </div>
                    )}
                    {item.reviewRating ? (
                      <div style={{ color: '#F59E0B', fontSize: '0.95rem', fontWeight: 800, marginTop: '4px' }}>
                        ★ {item.reviewRating.toFixed(1)}
                      </div>
                    ) : item.status === 'Completed' ? (
                      <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '4px' }}>
                        Awaiting Resident Review
                      </div>
                    ) : null}
                    
                    <button 
                      onClick={() => handleDeleteHistory(item.id)}
                      disabled={actionLoading}
                      style={{ marginTop: '12px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', width: '100%', fontWeight: 600 }}
                    >
                      <i className="fa-solid fa-trash-can"></i> Delete Record
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===================== RESCHEDULE MODAL ===================== */}
      {rescheduleBooking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 800 }}>Reschedule Job #{rescheduleBooking.id}</h3>
            
            <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>New Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>New Time</label>
                <input
                  type="time"
                  required
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>Note to Resident</label>
                <input
                  type="text"
                  placeholder="e.g. Traffic delay, moved to afternoon"
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRescheduleBooking(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
