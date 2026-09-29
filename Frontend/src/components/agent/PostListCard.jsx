import React from 'react';
import './AgentCards.css';

export default function PostListCard({ data, onAction }) {
  if (!data) return null;

  const { category, totalCount, posts = [] } = data;

  return (
    <div className="agent-card-container">
      <div className="agent-base-card">
        <div className="agent-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="agent-card-badge category">
              <i className="fa-solid fa-list-check"></i> {category || 'All'} Posts
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              {totalCount || posts.length} found
            </span>
          </div>
          <button
            className="agent-card-btn secondary"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
            onClick={() => onAction && onAction('navigate', '/community')}
          >
            Open Feed
          </button>
        </div>

        {posts.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '1.5rem', marginBottom: '6px', display: 'block' }}></i>
            No community posts found for this query.
          </div>
        ) : (
          <div className="agent-post-list">
            {posts.map((post, idx) => (
              <div
                key={post.id || idx}
                className="agent-post-item"
                onClick={() => onAction && onAction('send_prompt', `Show details for post #${post.id}`)}
              >
                <div className="agent-post-item-top">
                  <span className="agent-post-item-title">{post.title}</span>
                  <span className="agent-post-item-cat">{post.communityId || 'General'}</span>
                </div>
                <div className="agent-post-item-body">{post.content}</div>
                <div className="agent-card-meta" style={{ marginTop: '2px', fontSize: '0.75rem' }}>
                  <span><i className="fa-solid fa-location-dot"></i> {post.location || 'Colombo'}</span>
                  {post.authorName && <span><i className="fa-regular fa-user"></i> {post.authorName}</span>}
                  <span><i className="fa-regular fa-thumbs-up"></i> {post.likesCount || 0}</span>
                  <span><i className="fa-regular fa-comment"></i> {post.commentsCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
