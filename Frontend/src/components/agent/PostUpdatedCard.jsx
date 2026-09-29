import React from 'react';
import { getCategoryIllustration } from '../ServiceCategories.jsx';
import './AgentCards.css';

export default function PostUpdatedCard({ data, onAction }) {
  if (!data) return null;

  const { id, title, content, communityId, location, authorName, authorId, updatedAt } = data;
  const displayCategory = communityId || 'General';
  const illustration = getCategoryIllustration(displayCategory) || getCategoryIllustration(title);

  // Clean description if it contains boilerplate draft prefixes from historical text
  let cleanContent = content || '';
  if (cleanContent.toLowerCase().includes('here is your draft') && cleanContent.includes(':')) {
    cleanContent = cleanContent.split(/:\s*/).slice(1).join(': ').trim();
  }

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
              <i className="fa-solid fa-circle-check"></i> Updated Successfully
            </span>
            <span
              className="landing-card-category-badge"
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#6366f1',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <i className="fa-solid fa-hashtag"></i> Post #{id}
            </span>
            {(authorName || authorId) && (
              <span
                className="landing-card-category-badge"
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                }}
              >
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
            {cleanContent && <p className="landing-chat-card-desc">{cleanContent}</p>}

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

              <button
                type="button"
                className="landing-chat-btn-secondary"
                style={{ borderColor: '#e2e8f0', color: '#475569' }}
                onClick={() => onAction && onAction('send_prompt', `Update post #${id} with new information`)}
              >
                <i className="fa-solid fa-pen-to-square" style={{ fontSize: '0.75rem', marginRight: '4px' }}></i>
                <span>Edit Again</span>
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
