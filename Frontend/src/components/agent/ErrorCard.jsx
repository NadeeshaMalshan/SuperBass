import React from 'react';
import './AgentCards.css';

export default function ErrorCard({ data, onAction }) {
  if (!data) return null;

  const { errorCode, message, actionRequired } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card agent-error-card">
        <div className="agent-card-header">
          <span className="agent-card-badge removed">
            <i className="fa-solid fa-triangle-exclamation"></i> {errorCode || 'Notice'}
          </span>
        </div>

        <p className="agent-card-content" style={{ color: '#991b1b', fontWeight: 500 }}>
          {message || 'An unexpected condition occurred.'}
        </p>

        {actionRequired && (
          <div style={{ fontSize: '0.8rem', color: '#7f1d1d', background: '#fee2e2', padding: '6px 10px', borderRadius: '6px' }}>
            <strong>Action:</strong> {actionRequired}
          </div>
        )}

        <div className="agent-card-actions">
          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('retry')}
          >
            <i className="fa-solid fa-rotate-right"></i> Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
