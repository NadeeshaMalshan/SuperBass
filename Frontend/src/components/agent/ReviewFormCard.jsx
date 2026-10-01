import React, { useState } from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import './AgentCards.css';

export default function ReviewFormCard({ data = {}, onAction }) {
  const bookingId = data.bookingId || data.id || '8';
  const workerId = data.workerId || '44';
  const workerName = data.workerName || 'Verified Technician';
  const workerAvatar = data.workerAvatar || data.workerProfileImage || craftsmanAvatar;
  const jobTitle = data.jobTitle || 'Completed Service Appointment';

  const [quality, setQuality] = useState(data.defaultQuality || 5);
  const [punctuality, setPunctuality] = useState(data.defaultPunctuality || 5);
  const [communication, setCommunication] = useState(data.defaultCommunication || 5);
  const [comment, setComment] = useState('');
  const [hoverQuality, setHoverQuality] = useState(0);
  const [hoverPunctuality, setHoverPunctuality] = useState(0);
  const [hoverCommunication, setHoverCommunication] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const suggestedChips = data.suggestedComments || [
    'Punctual, professional, and resolved the issue quickly!',
    'Great workmanship and left the work area clean.',
    'Polite communication and fair pricing. Highly recommended!',
    'Arrived on time with all necessary tools. Very satisfied.'
  ];

  const overallRating = Math.round(((quality + punctuality + communication) / 3) * 10) / 10;

  const handleChipClick = (chipText) => {
    if (!comment) {
      setComment(chipText);
    } else if (!comment.includes(chipText)) {
      setComment(`${comment.trim()} ${chipText}`);
    }
  };

  const handleSubmit = () => {
    setSubmitting(true);
    const feedbackComment = comment.trim() || 'Excellent service provided on time with great quality.';
    const promptToExecute = `Submit review for booking #${bookingId}: worker #${workerId} (${workerName}). Rating ${overallRating} stars. Quality: ${quality}, Punctuality: ${punctuality}, Communication: ${communication}. Feedback: "${feedbackComment}"`;

    const payloadObj = {
      prompt: promptToExecute,
      action: 'submit_review',
      reviewData: {
        bookingId: String(bookingId),
        workerId: String(workerId),
        workerName,
        overallRating,
        qualityRating: quality,
        punctualityRating: punctuality,
        communicationRating: communication,
        comment: feedbackComment
      }
    };

    onAction && onAction('send_prompt', payloadObj);
  };

  const renderStarSelector = (value, hoverVal, setVal, setHover, label, icon) => {
    const activeVal = hoverVal || value;
    return (
      <div className="review-dimension-row">
        <div className="review-dimension-label">
          <i className={icon}></i>
          <span>{label}</span>
        </div>
        <div className="review-stars-group">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              className={`review-star-btn ${star <= activeVal ? 'active' : ''}`}
              onClick={() => setVal(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${star} stars for ${label}`}
            >
              ★
            </button>
          ))}
          <span className="review-score-text">{activeVal}/5</span>
        </div>
      </div>
    );
  };

  return (
    <div className="agent-card-container">
      <div className="agent-base-card review-form-card" style={{ borderLeft: '4px solid #f59e0b' }}>
        {/* Worker Header */}
        <div className="review-card-header">
          <div className="review-worker-avatar-wrap">
            <img src={workerAvatar} alt={workerName} className="review-worker-avatar-img" />
            <div className="review-verified-badge" title="Verified Worker">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <div className="review-worker-info">
            <div className="review-title-badge-row">
              <h3 className="review-worker-name">{workerName}</h3>
              <span className="review-booking-pill">Booking #{bookingId}</span>
            </div>
            <p className="review-job-title">
              <i className="fa-solid fa-briefcase"></i> {jobTitle}
            </p>
          </div>
        </div>

        {/* Overall Rating Banner */}
        <div className="review-score-banner">
          <div className="review-score-stars">
            {'★'.repeat(Math.round(overallRating))}
            {'☆'.repeat(5 - Math.round(overallRating))}
          </div>
          <div className="review-score-meta">
            <span className="review-score-num">{overallRating.toFixed(1)}</span>
            <span className="review-score-caption">Overall Experience</span>
          </div>
        </div>

        {/* 3 Rating Dimensions */}
        <div className="review-dimensions-container">
          {renderStarSelector(
            quality,
            hoverQuality,
            setQuality,
            setHoverQuality,
            'Quality of Work',
            'fa-solid fa-award'
          )}
          {renderStarSelector(
            punctuality,
            hoverPunctuality,
            setPunctuality,
            setHoverPunctuality,
            'Punctuality & Timing',
            'fa-regular fa-clock'
          )}
          {renderStarSelector(
            communication,
            hoverCommunication,
            setCommunication,
            setHoverCommunication,
            'Communication & Courtesy',
            'fa-regular fa-comments'
          )}
        </div>

        {/* AI Quick Feedback Chips */}
        <div className="review-quick-chips-section">
          <label className="review-chips-label">
            <i className="fa-solid fa-wand-magic-sparkles"></i> Quick Feedback Templates
          </label>
          <div className="review-chips-cloud">
            {suggestedChips.map((chip, index) => (
              <button
                key={index}
                type="button"
                className="review-chip-btn"
                onClick={() => handleChipClick(chip)}
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Comment Textarea */}
        <div className="review-comment-field">
          <label className="review-comment-label">
            <i className="fa-solid fa-pen-nib"></i> Detailed Review
          </label>
          <textarea
            className="review-comment-textarea"
            rows="3"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share details about the technician's punctuality, work quality, and service..."
          />
        </div>

        {/* Submit Actions */}
        <div className="review-actions-row">
          <button
            type="button"
            className="review-submit-btn"
            disabled={submitting}
            onClick={handleSubmit}
          >
            <span>{submitting ? 'Submitting Review...' : 'Submit Verified Review'}</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
