import React from 'react';
import './AgentCards.css';

export default function DisputeTicketCard({ data = {}, onAction }) {
  const {
    ticketId = 'TICKET-9481',
    workerId = '',
    workerName = '',
    bookingId = '',
    reason = 'Service dispute or complaint',
    urgencyLevel = 'Medium',
    status = 'Open',
    resolutionSla = 'Support team responds within 2 hours',
    supportHotline = '+94 11 234 5678'
  } = data;

  const isUrgent = urgencyLevel.toLowerCase() === 'high' || urgencyLevel.toLowerCase() === 'critical';

  return (
    <div className="agent-card-container">
      <div
        className="agent-base-card dispute-ticket-card"
        style={{ borderLeft: `4px solid ${isUrgent ? '#ef4444' : '#f59e0b'}` }}
      >
        <div className="dispute-ticket-header">
          <div className={`dispute-icon-circle ${isUrgent ? 'urgent' : ''}`}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div className="dispute-header-content">
            <div className="dispute-title-row">
              <h3 className="dispute-card-title">Support Ticket Registered</h3>
              <span className={`dispute-urgency-pill ${urgencyLevel.toLowerCase()}`}>
                {urgencyLevel} Urgency
              </span>
            </div>
            <p className="dispute-ticket-id-tag">Case ID: <strong>#{ticketId}</strong></p>
          </div>
        </div>

        <div className="dispute-ticket-body">
          <div className="dispute-field-group">
            <span className="dispute-field-label">Issue Summary</span>
            <p className="dispute-field-value">{reason}</p>
          </div>

          {(workerName || bookingId) && (
            <div className="dispute-meta-row">
              {workerName && (
                <div className="dispute-meta-item">
                  <i className="fa-solid fa-user-gear"></i>
                  <span>Worker: <strong>{workerName}</strong></span>
                </div>
              )}
              {bookingId && (
                <div className="dispute-meta-item">
                  <i className="fa-solid fa-calendar"></i>
                  <span>Booking: <strong>#{bookingId}</strong></span>
                </div>
              )}
            </div>
          )}

          <div className="dispute-sla-box">
            <div className="dispute-sla-icon">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div className="dispute-sla-text">
              <span className="dispute-sla-title">Guaranteed Response SLA</span>
              <p className="dispute-sla-desc">{resolutionSla}</p>
            </div>
          </div>
        </div>

        <div className="dispute-ticket-actions">
          <a
            href={`tel:${supportHotline.replace(/\s+/g, '')}`}
            className="dispute-call-hotline-btn"
          >
            <i className="fa-solid fa-phone"></i> Call Hotline ({supportHotline})
          </a>
          <button
            type="button"
            className="dispute-escalate-btn"
            onClick={() => onAction && onAction('send_prompt', `Escalate ticket #${ticketId} to human support lead immediately.`)}
          >
            <i className="fa-solid fa-headset"></i> Connect Human Supervisor
          </button>
        </div>
      </div>
    </div>
  );
}
