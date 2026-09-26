import React from 'react';
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

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #000000', background: '#fafafa' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge success">
            <i className="fa-solid fa-clipboard-check"></i>
            {isUpdate ? ' Review Update Draft' : ' Review Draft & Confirm'}
          </span>
          <span className="agent-card-badge category">
            {communityId || 'General'}
          </span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#757575', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.04em' }}>
            {validationNotes || 'Please review your post details before publishing:'}
          </div>
          <h4 style={{ margin: '4px 0', fontSize: '1.05rem', color: '#000000', fontWeight: 800 }}>
            {title}
          </h4>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.885rem', color: '#333333', lineHeight: '1.45' }}>
            {content}
          </p>
          <div className="agent-card-meta">
            <span><i className="fa-solid fa-location-dot"></i> {location || 'Colombo'}</span>
            <span><i className="fa-solid fa-tag"></i> {communityId || 'General'}</span>
            {postId && <span><i className="fa-solid fa-hashtag"></i> Post #{postId}</span>}
          </div>
        </div>

        <div className="agent-card-actions" style={{ marginTop: '6px' }}>
          <button
            className="agent-card-btn primary"
            style={{ padding: '8px 16px', fontSize: '0.875rem', fontWeight: 700 }}
            onClick={() => {
              const promptToExecute = confirmPrompt || (
                isUpdate
                  ? `CONFIRM_UPDATE: Yes, please update post #${postId} with title='${title}' and content='${content}'.`
                  : `CONFIRM_PUBLISH: Yes, please publish the post '${title}' in ${communityId} for ${location}.`
              );
              onAction && onAction('confirm_post', promptToExecute);
            }}
          >
            <i className="fa-solid fa-check"></i>
            {isUpdate ? ' Confirm & Update Post' : ' Confirm & Publish Post'}
          </button>

          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('cancel_post', 'Cancelled. I will not publish this post.')}
          >
            <i className="fa-solid fa-xmark"></i> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
