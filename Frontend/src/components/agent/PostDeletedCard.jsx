import React from 'react';
import './AgentCards.css';

export default function PostDeletedCard({ data, onAction }) {
  if (!data) return null;

  const { id, message, deletedAt } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #ef4444' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge removed">
            <i className="fa-solid fa-trash-can"></i> Post Removed
          </span>
          <span style={{ fontSize: '0.785rem', color: '#64748b' }}>Post #{id}</span>
        </div>

        <p className="agent-card-content" style={{ fontWeight: 500, color: '#334155' }}>
          {message || 'The community post has been removed successfully.'}
        </p>

        {deletedAt && (
          <div className="agent-card-meta">
            <span><i className="fa-regular fa-clock"></i> Removed at {new Date(deletedAt).toLocaleTimeString()}</span>
          </div>
        )}

        <div className="agent-card-actions">
          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('send_prompt', 'Show my remaining community posts')}
          >
            <i className="fa-solid fa-list"></i> My Posts
          </button>
        </div>
      </div>
    </div>
  );
}
