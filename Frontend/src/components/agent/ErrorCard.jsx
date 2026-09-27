import React from 'react';
import './AgentCards.css';

export default function ErrorCard({ data, onAction }) {
  if (!data) return null;

  const { errorCode, message, actionRequired } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card agent-error-card">
        <div className="agent-card-header">
          <span className="agent-card-badge error">
            <i className="fa-solid fa-triangle-exclamation"></i> {errorCode || 'Notice'}
          </span>
        </div>

        <p className="agent-card-content" style={{ color: '#991b1b', fontWeight: 700 }}>
          {message || 'An unexpected condition occurred.'}
        </p>

        {actionRequired && (
          <div style={{ fontSize: '0.825rem', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', lineHeight: '1.45' }}>
            <strong style={{ color: '#7f1d1d' }}>Action:</strong> {actionRequired}
          </div>
        )}

        <div className="agent-card-actions">
          <button
            className="agent-card-btn primary"
            onClick={() => onAction && onAction('retry')}
          >
            <i className="fa-solid fa-rotate-right"></i> Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
