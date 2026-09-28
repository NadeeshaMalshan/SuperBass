import React from 'react';
import { getCategoryIllustration } from '../ServiceCategories.jsx';
import './AgentCards.css';

export default function PostCreatedCard({ data, onAction }) {
  if (!data) return null;

  const { id, title, content, communityId, location, authorName, authorId, createdAt } = data;
  const displayCategory = communityId || 'General';
  const illustration = getCategoryIllustration(displayCategory) || getCategoryIllustration(title);

  return (
    <div className="agent-card-container">
      <div className="landing-service-chat-card">
        {/* Top bar */}
        <div className="landing-chat-card-topbar">
          <div className="landing-chat-badge-group">
            <span className="landing-card-category-badge">
              <i className="fa-solid fa-tag"></i> {displayCategory}
            </span>
            <span className="landing-card-draft-badge" style={{ background: '#16a34a' }}>
              <i className="fa-solid fa-circle-check"></i> Published Successfully
            </span>
            {(authorName || authorId) && (
              <span className="landing-card-category-badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                <i className="fa-solid fa-user-check"></i> {authorName || authorId}
              </span>
            )}
          </div>
          {location && (
            <span className="landing-card-location">
              <i className="fa-solid fa-location-dot"></i> {location}
            </span>
          )}
        </div>

        {/* Main body */}
        <div className="landing-chat-card-body">
          <div className="landing-chat-card-content">
            <h3 className="landing-chat-card-title">{title}</h3>
            <p className="landing-chat-card-desc">{content}</p>

            <div className="landing-chat-card-actions">
              <button
                type="button"
                className="landing-chat-btn-primary"
                onClick={() => onAction && onAction('view_community', { id, category: communityId })}
              >
                <span>View on Community</span>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '0.75rem' }}></i>
              </button>

              <button
                type="button"
                className="landing-chat-btn-secondary"
                onClick={() => onAction && onAction('send_prompt', `Show details for post #${id}`)}
              >
                <span>Inspect Post</span>
              </button>
            </div>
          </div>

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
