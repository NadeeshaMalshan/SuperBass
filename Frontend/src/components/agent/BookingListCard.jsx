import React from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import './AgentCards.css';

export default function BookingListCard({ data, onAction }) {
  if (!data) return null;

  const { totalCount, statusFilter = 'Upcoming', bookings = [] } = data;

  const getStatusBadge = (status) => {
    const s = String(status || 'Requested').toLowerCase();
    if (s.includes('confirm')) {
      return (
        <span className="booking-status-pill pill-confirmed">
          <i className="fa-solid fa-calendar-check"></i> Confirmed
        </span>
      );
    }
    if (s.includes('progress') || s.includes('ongoing')) {
      return (
        <span className="booking-status-pill pill-inprogress">
          <i className="fa-solid fa-wrench"></i> In Progress
        </span>
      );
    }
    if (s.includes('complete') || s.includes('done')) {
      return (
        <span className="booking-status-pill pill-completed">
          <i className="fa-solid fa-circle-check"></i> Completed
        </span>
      );
    }
    if (s.includes('cancel') || s.includes('reject')) {
      return (
        <span className="booking-status-pill pill-cancelled">
          <i className="fa-solid fa-ban"></i> {status}
        </span>
      );
    }
    return (
      <span className="booking-status-pill pill-requested">
        <i className="fa-regular fa-clock"></i> Requested
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Scheduled upcoming';
    try {
      if (dateStr.includes('T') || dateStr.includes('-')) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }
    } catch {
      // Fallback to raw string
    }
    return dateStr;
  };

  return (
    <div className="agent-card-container">
      <div className="agent-base-card booking-list-card-wrapper" style={{ borderLeft: '4px solid #10b981' }}>
        {/* Header */}
        <div className="agent-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="agent-card-badge" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }}>
              <i className="fa-solid fa-calendar-days"></i> {statusFilter} Bookings
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              {totalCount || bookings.length} total
            </span>
          </div>
          <button
            type="button"
            className="agent-card-btn secondary"
            style={{ padding: '5px 12px', fontSize: '0.78rem', borderRadius: '8px', cursor: 'pointer' }}
            onClick={() => onAction && onAction('navigate', '/bookings')}
          >
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: '4px' }}></i> Full View
          </button>
        </div>

        {/* Empty State */}
        {bookings.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '2rem', marginBottom: '8px', display: 'block', color: '#cbd5e1' }}></i>
            No upcoming bookings found.
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="agent-card-btn primary"
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                onClick={() => onAction && onAction('send_prompt', 'Find a verified technician near me')}
              >
                Book a Technician
              </button>
            </div>
          </div>
        ) : (
          /* Bookings List */
          <div className="agent-bookings-grid">
            {bookings.map((booking, idx) => {
              const bId = booking.id || booking.bookingId || idx + 1;
              const workerName = booking.workerName || 'Verified Technician';
              const workerImg = booking.workerProfileImage || craftsmanAvatar;
              const formattedTime = formatDate(booking.scheduledDate);
              const jobTitle = booking.jobTitle || 'Service Request';
              const priceDisplay = booking.agreedPrice
                ? `Rs. ${Number(booking.agreedPrice).toLocaleString()}`
                : booking.estimatedPrice
                ? `Rs. ${Number(booking.estimatedPrice).toLocaleString()} (Est.)`
                : null;

              return (
                <div key={bId} className="agent-booking-card-item">
                  {/* Top Bar: ID and Status */}
                  <div className="agent-booking-top-bar">
                    <span className="booking-id-tag">
                      <i className="fa-solid fa-hashtag"></i> Booking #{bId}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  {/* Main Info Row: Technician + Service */}
                  <div className="agent-booking-body-row">
                    <div className="agent-booking-worker-avatar-wrap">
                      <img
                        src={workerImg}
                        alt={workerName}
                        className="agent-booking-worker-avatar-img"
                        onError={(e) => {
                          e.target.src = craftsmanAvatar;
                        }}
                      />
                    </div>

                    <div className="agent-booking-info-col">
                      <h4 className="agent-booking-service-title">{jobTitle}</h4>
                      <div className="agent-booking-worker-name">
                        <i className="fa-solid fa-user-gear" style={{ color: '#64748b', fontSize: '0.8rem' }}></i>
                        <span>{workerName}</span>
                        <span className="agent-worker-verified-mini" title="Verified Worker">
                          <i className="fa-solid fa-check"></i>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Schedule & Location Details */}
                  <div className="agent-booking-details-box">
                    <div className="agent-booking-detail-chip">
                      <i className="fa-regular fa-calendar-check" style={{ color: '#2563eb' }}></i>
                      <span>{formattedTime}</span>
                    </div>

                    {booking.locationAddress && (
                      <div className="agent-booking-detail-chip">
                        <i className="fa-solid fa-location-dot" style={{ color: '#e11d48' }}></i>
                        <span>{booking.locationAddress}</span>
                      </div>
                    )}

                    {priceDisplay && (
                      <div className="agent-booking-detail-chip">
                        <i className="fa-solid fa-wallet" style={{ color: '#059669' }}></i>
                        <span>{priceDisplay}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="agent-booking-actions-row">
                    <button
                      type="button"
                      className="booking-action-btn primary"
                      onClick={() => onAction && onAction('send_prompt', `Show details for booking #${bId}`)}
                      title="View full booking details"
                    >
                      <i className="fa-regular fa-eye"></i> Details
                    </button>

                    <button
                      type="button"
                      className="booking-action-btn secondary"
                      onClick={() => onAction && onAction('send_prompt', `I would like to reschedule booking #${bId}`)}
                      title="Reschedule this appointment"
                    >
                      <i className="fa-regular fa-clock"></i> Reschedule
                    </button>

                    {booking.workerId && (
                      <button
                        type="button"
                        className="booking-action-btn chat"
                        onClick={() => onAction && onAction('navigate', `/chats?workerId=${booking.workerId}`)}
                        title="Chat with this technician"
                      >
                        <i className="fa-regular fa-comment-dots"></i> Chat
                      </button>
                    )}

                    <button
                      type="button"
                      className="booking-action-btn danger"
                      onClick={() => onAction && onAction('send_prompt', `I would like to cancel booking #${bId}`)}
                      title="Cancel this booking"
                    >
                      <i className="fa-solid fa-xmark"></i> Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
