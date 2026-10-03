import React from 'react';
import './AgentCards.css';

export default function BookingConfirmedCard({ data = {}, onAction }) {
  const {
    bookingId = 'new',
    workerId = '',
    workerName = 'Verified Technician',
    jobTitle = 'Service Appointment',
    scheduledDate = '',
    locationAddress = 'Colombo',
    contactPhone = '',
    status = 'Confirmed'
  } = data;

  let formattedDate = scheduledDate;
  try {
    if (scheduledDate) {
      formattedDate = new Date(scheduledDate).toLocaleDateString([], {
        dateStyle: 'medium',
      });
    }
  } catch (err) {
    formattedDate = scheduledDate;
  }

  return (
    <div className="agent-card-container">
      <div className="agent-base-card booking-confirmed-card" style={{ borderLeft: '4px solid #10b981' }}>
        <div className="booking-confirmed-header">
          <div className="booking-confirmed-icon-circle">
            <i className="fa-solid fa-calendar-check"></i>
          </div>
          <div>
            <h3 className="booking-confirmed-title">
              {data.cardTitle || (status === 'Confirmed' ? 'Appointment Confirmed!' : `Booking #${bookingId} Details`)}
            </h3>
            <p className="booking-confirmed-subtitle">
              {data.cardSubtitle || `Booking #${bookingId} with ${workerName}.`}
            </p>
          </div>
        </div>

        <div className="booking-confirmed-details-box">
          <div className="booking-confirmed-detail-row">
            <span className="detail-key"><i className="fa-solid fa-user-gear"></i> Technician:</span>
            <span className="detail-val">{workerName} (Worker #{workerId})</span>
          </div>
          <div className="booking-confirmed-detail-row">
            <span className="detail-key"><i className="fa-regular fa-calendar"></i> Scheduled Date:</span>
            <span className="detail-val">{formattedDate || 'Upcoming appointment'}</span>
          </div>
          <div className="booking-confirmed-detail-row">
            <span className="detail-key"><i className="fa-solid fa-briefcase"></i> Service:</span>
            <span className="detail-val">{jobTitle}</span>
          </div>
          <div className="booking-confirmed-detail-row">
            <span className="detail-key"><i className="fa-solid fa-location-dot"></i> Location:</span>
            <span className="detail-val">{locationAddress}</span>
          </div>
          {contactPhone && (
            <div className="booking-confirmed-detail-row">
              <span className="detail-key"><i className="fa-solid fa-phone"></i> Contact Phone:</span>
              <span className="detail-val">{contactPhone}</span>
            </div>
          )}
          <div className="booking-confirmed-detail-row">
            <span className="detail-key"><i className="fa-solid fa-shield-halved"></i> Status:</span>
            <span className="detail-val status-badge-confirmed">{status}</span>
          </div>
        </div>

        <div className="booking-confirmed-actions-row">
          <button
            type="button"
            className="booking-view-appointments-btn"
            onClick={() => onAction && onAction('send_prompt', 'Show all my upcoming resident bookings')}
          >
            <span>View My Bookings</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
