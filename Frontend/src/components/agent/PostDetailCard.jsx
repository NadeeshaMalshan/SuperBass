import React from 'react';
import './AgentCards.css';

export default function PostDetailCard({ data, onAction }) {
  if (!data) return null;

  const {
    id,
    title,
    content,
    communityId,
    location,
    authorName,
    authorEmail,
    createdAt,
    likesCount = 0,
    commentsCount = 0,
    comments = []
  } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #FDC101' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge category">
            <i className="fa-solid fa-tag"></i> {communityId || 'General'}
          </span>
          <span style={{ fontSize: '0.785rem', color: '#64748b' }}>Post #{id}</span>
        </div>

        <h3 className="agent-card-title">{title}</h3>
        <p className="agent-card-content">{content}</p>

        <div className="agent-card-meta">
          <span><i className="fa-solid fa-location-dot"></i> {location || 'Colombo'}</span>
          <span><i className="fa-solid fa-user"></i> {authorName || authorEmail || 'Anonymous'}</span>
          {createdAt && <span><i className="fa-regular fa-clock"></i> {new Date(createdAt).toLocaleDateString()}</span>}
          <span><i className="fa-regular fa-thumbs-up"></i> {likesCount} Likes</span>
          <span><i className="fa-regular fa-comment"></i> {commentsCount} Comments</span>
        </div>

        {comments && comments.length > 0 && (
          <div style={{ marginTop: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Recent Comments:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              {comments.slice(0, 3).map((c, i) => (
                <div key={i} style={{ fontSize: '0.785rem', color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                  <strong>{c.userName || 'User'}:</strong> {c.text || c.comment || c.content}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="agent-card-actions">
          <button
            className="agent-card-btn primary"
            onClick={() => onAction && onAction('navigate', `/community?post=${id}`)}
          >
            <i className="fa-solid fa-up-right-from-square"></i> Open in Community
          </button>
          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('send_prompt', `Update post #${id} with new information`)}
          >
            <i className="fa-regular fa-pen-to-square"></i> Edit Post
          </button>
        </div>
      </div>
    </div>
  );
}
