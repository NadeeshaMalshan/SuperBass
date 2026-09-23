import React from 'react';
import './AgentCards.css';

export default function PostUpdatedCard({ data, onAction }) {
  if (!data) return null;

  const { id, title, content, communityId, location, updatedAt } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #3b82f6' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge success" style={{ background: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' }}>
            <i className="fa-solid fa-pen-nib"></i> Post Updated
          </span>
          <span style={{ fontSize: '0.785rem', color: '#64748b' }}>Post #{id}</span>
        </div>

        <h3 className="agent-card-title">{title}</h3>
        {content && <p className="agent-card-content">{content}</p>}

        <div className="agent-card-meta">
          {communityId && <span><i className="fa-solid fa-tag"></i> {communityId}</span>}
          {location && <span><i className="fa-solid fa-location-dot"></i> {location}</span>}
          {updatedAt && <span><i className="fa-regular fa-clock"></i> {new Date(updatedAt).toLocaleTimeString()}</span>}
        </div>

        <div className="agent-card-actions">
          <button
            className="agent-card-btn primary"
            onClick={() => onAction && onAction('navigate', `/community?post=${id}`)}
          >
            <i className="fa-solid fa-arrow-up-right-from-square"></i> View Post
          </button>
        </div>
      </div>
    </div>
  );
}
