import React from 'react';
import './AgentCards.css';

export default function ReviewSubmittedCard({ data = {}, onAction }) {
  const {
    bookingId = '8',
    workerId = '',
    workerName = 'Verified Technician',
    overallRating = 5.0,
    qualityRating = 5,
    punctualityRating = 5,
    communicationRating = 5,
    comment = 'Great job!',
    submittedAt
  } = data;

  const formattedDate = submittedAt ? new Date(submittedAt).toLocaleDateString([], {
    dateStyle: 'medium',
    timeStyle: 'short'
  }) : 'Just now';

  return (
    <div className="agent-card-container">
      <div className="agent-base-card review-submitted-card" style={{ borderLeft: '4px solid #10b981' }}>
        <div className="review-submitted-header">
          <div className="review-submitted-icon-circle">
            <i className="fa-solid fa-star"></i>
          </div>
          <div className="review-submitted-header-text">
            <h3 className="review-submitted-title">Review Published!</h3>
            <p className="review-submitted-subtitle">
              Thank you for sharing your feedback on Booking #{bookingId}.
            </p>
          </div>
        </div>

        <div className="review-submitted-badge-box">
          <div className="review-submitted-score-row">
            <div className="review-submitted-stars">
              {'★'.repeat(Math.round(overallRating))}
              {'☆'.repeat(5 - Math.round(overallRating))}
            </div>
            <span className="review-submitted-score-val">{Number(overallRating).toFixed(1)} / 5.0</span>
          </div>

          <div className="review-submitted-metrics-grid">
            <div className="review-metric-pill">
              <span className="metric-name">Quality</span>
              <span className="metric-score">{qualityRating}/5 ★</span>
            </div>
            <div className="review-metric-pill">
              <span className="metric-name">Punctuality</span>
              <span className="metric-score">{punctualityRating}/5 ★</span>
            </div>
            <div className="review-metric-pill">
              <span className="metric-name">Communication</span>
              <span className="metric-score">{communicationRating}/5 ★</span>
            </div>
          </div>
        </div>

        {comment && (
          <div className="review-submitted-comment-quote">
            <i className="fa-solid fa-quote-left quote-icon"></i>
            <p className="quote-text">"{comment}"</p>
            <span className="quote-author">— Review for {workerName} • {formattedDate}</span>
          </div>
        )}

        <div className="review-submitted-footer-actions">
          {workerId && (
            <button
              type="button"
              className="review-view-worker-btn"
              onClick={() => onAction && onAction('navigate', `/workers/${workerId}`)}
            >
              <i className="fa-solid fa-user-check"></i> View {workerName}'s Profile
            </button>
          )}
          <button
            type="button"
            className="review-book-again-btn"
            onClick={() => onAction && onAction('send_prompt', `Book an appointment with ${workerName}`)}
          >
            <i className="fa-solid fa-calendar-plus"></i> Book Another Service
          </button>
        </div>
      </div>
    </div>
  );
}
