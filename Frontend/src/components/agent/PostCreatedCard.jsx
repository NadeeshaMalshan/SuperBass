import React from 'react';
import './AgentCards.css';

export default function PostCreatedCard({ data, onAction }) {
  if (!data) return null;

  const { id, title, content, communityId, location, authorName, authorId, createdAt } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #000000' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge success">
            <i className="fa-solid fa-circle-check"></i> Post Published
          </span>
          <span className="agent-card-badge category">
            {communityId || 'General'}
          </span>
        </div>

        <h3 className="agent-card-title">{title}</h3>
        <p className="agent-card-content">{content}</p>

        <div className="agent-card-meta">
          <span><i className="fa-solid fa-location-dot"></i> {location || 'Colombo'}</span>
          <span><i className="fa-solid fa-user"></i> {authorName || authorId}</span>
          {createdAt && (
            <span><i className="fa-regular fa-clock"></i> {new Date(createdAt).toLocaleDateString()}</span>
          )}
        </div>

        <div className="agent-card-actions">
          <button
            className="agent-card-btn primary"
            onClick={() => onAction && onAction('view_community', { id, category: communityId })}
          >
            <i className="fa-solid fa-arrow-up-right-from-square"></i> View on Community
          </button>
          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('send_prompt', `Show details for post #${id}`)}
          >
            <i className="fa-regular fa-eye"></i> Inspect Post
          </button>
        </div>
      </div>
    </div>
  );
}
