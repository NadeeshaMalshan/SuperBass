import React from 'react';
import { getCategoryIllustration } from '../ServiceCategories.jsx';
import './AgentCards.css';

export default function PostConfirmationCard({ data, onAction }) {
  if (!data) return null;

  const {
    action = 'create',
    postId,
    title,
    content,
    communityId,
    location,
    validationStatus = 'valid',
    validationNotes,
    confirmPrompt
  } = data;

  const isUpdate = action === 'update';
  const displayCategory = communityId || 'Plumbing';
  const illustration = getCategoryIllustration(displayCategory) || getCategoryIllustration(title);

  return (
    <div className="agent-card-container">
      <div className="landing-service-chat-card">
        {/* Top bar with category & status badge */}
        <div className="landing-chat-card-topbar">
          <div className="landing-chat-badge-group">
            <span className="landing-card-category-badge">
              <i className="fa-solid fa-tag"></i> {displayCategory}
            </span>
            <span className="landing-card-draft-badge">
              <i className="fa-solid fa-file-pen"></i> {isUpdate ? 'Review Update' : 'Review Draft & Confirm'}
            </span>
          </div>
          {location && (
            <span className="landing-card-location">
              <i className="fa-solid fa-location-dot"></i> {location}
            </span>
          )}
        </div>

        {/* Main body: Left Content + Right 3D Illustration (Matches landing page card exactly) */}
        <div className="landing-chat-card-body">
          <div className="landing-chat-card-content">
            <h3 className="landing-chat-card-title">{title}</h3>
            <p className="landing-chat-card-desc">{content}</p>

            {/* Pill Action Buttons */}
            <div className="landing-chat-card-actions">
              <button
                type="button"
                className="landing-chat-btn-primary"
                onClick={() => {
                  const promptToExecute = confirmPrompt || (
                    isUpdate
                      ? `CONFIRM_UPDATE: Yes, please update post #${postId} with title='${title}' and content='${content}'.`
                      : `CONFIRM_PUBLISH: Yes, please publish the post '${title}' in ${communityId || 'Plumbing'} for ${location || 'Colombo'}.`
                  );
                  onAction && onAction('confirm_post', promptToExecute);
                }}
              >
                <span>{isUpdate ? 'Confirm & Update Post' : 'Confirm & Publish Post'}</span>
                <i className="fa-solid fa-chevron-right landing-chevron"></i>
              </button>

              <button
                type="button"
                className="landing-chat-btn-secondary"
                onClick={() => onAction && onAction('cancel_post', 'Cancelled. I will not publish this post.')}
              >
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Right Illustration Column */}
          {illustration && (
            <div className="landing-chat-card-image-wrap">
              <img
                src={illustration}
                alt={displayCategory}
                className="landing-chat-card-img"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
