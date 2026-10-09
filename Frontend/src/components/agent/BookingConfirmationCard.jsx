import React, { useState } from 'react';
import './AgentCards.css';

export default function BookingConfirmationCard({ data = {}, onAction }) {
  const {
    bookingId = '',
    workerId = '',
    workerName = 'Verified Technician',
    workerAvatar = '',
    category = 'Home Service',
    jobTitle = 'Service Appointment',
    scheduledDate = '',
    locationAddress = 'Colombo',
    contactPhone = '',
    hourlyRate = 2800,
    estimatedPrice = null,
    priority: rawPriority = 'Medium',
    description = '',
    notes = '',
    confirmPrompt = '',
    cancelPrompt = '',
  } = data;

  const priority = ['high', 'urgent', 'emergency'].includes((rawPriority || '').toLowerCase())
    ? 'High'
    : (rawPriority || '').toLowerCase() === 'low'
    ? 'Low'
    : 'Medium';

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date nicely as 'Oct 9, 2026' to match the screenshot
  let formattedDate = scheduledDate;
  try {
    if (scheduledDate) {
      const d = new Date(scheduledDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }
  } catch (err) {
    formattedDate = scheduledDate;
  }

  const handleYesConfirm = () => {
    setIsSubmitting(true);
    const promptToSend =
      confirmPrompt ||
      `CONFIRM_BOOKING: Please book worker ID ${workerId} (${workerName}) for ${scheduledDate}. Service: ${jobTitle}. Priority: ${priority}. Description: ${description || notes || 'Service request'}. Location: ${locationAddress}. Phone: ${contactPhone}. Notes: ${notes || 'Standard booking'}`;

    const payloadObj = {
      prompt: promptToSend,
      action: 'create_booking',
      workerId,
      bookingData: {
        workerId,
        workerName,
        workerAvatar,
        category,
        date: scheduledDate,
        scheduledDate: scheduledDate.includes('T') ? scheduledDate : `${scheduledDate}T09:00:00`,
        jobTitle,
        locationAddress,
        contactPhone,
        priority,
        urgency: priority,
        description: description || notes,
        notes,
        hourlyRate,
        estimatedPrice: estimatedPrice || hourlyRate,
      },
    };

    onAction && onAction('send_prompt', payloadObj);
  };

  const handleNoCancel = () => {
    const promptToSend =
      cancelPrompt ||
      `CANCEL_BOOKING: Cancel this booking request for ${workerName}. I do not want to proceed.`;

    onAction && onAction('send_prompt', {
      prompt: promptToSend,
      action: 'cancel_booking_request',
      workerId,
    });
  };

  const getPriorityStyle = (lvl) => {
    switch (lvl?.toLowerCase()) {
      case 'high':
      case 'emergency':
      case 'urgent':
        return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
      case 'low':
        return { bg: '#f1f5f9', text: '#64748b', border: '#cbd5e1' };
      case 'medium':
      default:
        return { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' };
    }
  };
  const pStyle = getPriorityStyle(priority);

  return (
    <div className="agent-card-container">
      <div className="agent-base-card booking-confirmed-card" style={{ borderLeft: '4px solid #10b981' }}>
        {/* Header Matching Screenshot */}
        <div className="booking-confirmed-header">
          <div className="booking-confirmed-icon-circle">
            <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#10b981' }}>
              event_available
            </span>
          </div>
          <div>
            <h3 className="booking-confirmed-title">
              {data.cardTitle || (bookingId ? `Booking #${bookingId} Details` : 'Booking Details')}
            </h3>
            <p className="booking-confirmed-subtitle">
              {data.cardSubtitle || `Booking ${bookingId ? `#${bookingId} ` : ''}with ${workerName}.`}
            </p>
          </div>
        </div>

        {/* Details Box Matching Screenshot */}
        <div className="booking-confirmed-details-box">
          <div className="booking-confirmed-detail-row">
            <span className="detail-key">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                engineering
              </span>{' '}
              Technician:
            </span>
            <span className="detail-val">
              {workerName}{workerId ? ` (Worker #${workerId})` : ''}
            </span>
          </div>

          <div className="booking-confirmed-detail-row">
            <span className="detail-key">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                calendar_today
              </span>{' '}
              Scheduled Date:
            </span>
            <span className="detail-val">{formattedDate || 'Upcoming appointment'}</span>
          </div>

          <div className="booking-confirmed-detail-row">
            <span className="detail-key">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                construction
              </span>{' '}
              Service:
            </span>
            <span className="detail-val">{jobTitle || category || 'Service Request'}</span>
          </div>

          {/* Priority Row */}
          {priority && (
            <div className="booking-confirmed-detail-row">
              <span className="detail-key">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  flag
                </span>{' '}
                Priority:
              </span>
              <span
                className="detail-val"
                style={{
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  backgroundColor: pStyle.bg,
                  color: pStyle.text,
                  border: `1px solid ${pStyle.border}`,
                }}
              >
                {priority}
              </span>
            </div>
          )}

          {/* Problem Details */}
          {description && (
            <div className="booking-confirmed-detail-row" style={{ alignItems: 'flex-start' }}>
              <span className="detail-key">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  notes
                </span>{' '}
                Problem Details:
              </span>
              <span
                className="detail-val"
                style={{
                  maxWidth: '65%',
                  textAlign: 'right',
                  wordBreak: 'break-word',
                  fontSize: '13px',
                  color: '#1e293b',
                  fontWeight: 500,
                }}
              >
                {description}
              </span>
            </div>
          )}

          <div className="booking-confirmed-detail-row">
            <span className="detail-key">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                location_on
              </span>{' '}
              Location:
            </span>
            <span className="detail-val">{locationAddress || 'Colombo'}</span>
          </div>

          {contactPhone && (
            <div className="booking-confirmed-detail-row">
              <span className="detail-key">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  call
                </span>{' '}
                Contact Phone:
              </span>
              <span className="detail-val">{contactPhone}</span>
            </div>
          )}

          {hourlyRate && (
            <div className="booking-confirmed-detail-row">
              <span className="detail-key">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  payments
                </span>{' '}
                Technician Rate:
              </span>
              <span className="detail-val">
                Rs. {Number(hourlyRate).toLocaleString()} / hr
              </span>
            </div>
          )}

          {notes && (
            <div className="booking-confirmed-detail-row">
              <span className="detail-key">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  description
                </span>{' '}
                Notes:
              </span>
              <span className="detail-val" style={{ maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>
                {notes}
              </span>
            </div>
          )}

          <div className="booking-confirmed-detail-row">
            <span className="detail-key">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                pending_actions
              </span>{' '}
              Status:
            </span>
            <span className="detail-val status-badge-pending">Pending Confirmation</span>
          </div>
        </div>

        {/* Prompt Question */}
        <div className="booking-confirmation-question">
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#0f172a' }}>
            help
          </span>
          <span>Do you want to confirm and send this booking request to {workerName}?</span>
        </div>

        {/* Action Buttons: YES and NO */}
        <div className="booking-confirmation-actions">
          <button
            type="button"
            className="booking-btn-yes"
            onClick={handleYesConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}
                >
                  progress_activity
                </span>
                <span>Booking...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  check_circle
                </span>
                <span>Yes, Confirm Booking</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="booking-btn-no"
            onClick={handleNoCancel}
            disabled={isSubmitting}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              cancel
            </span>
            <span>No, Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
