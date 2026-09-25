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
      <div className="agent-base-card" style={{ borderLeft: '4px solid #f59e0b', background: '#fffdfa' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge" style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }}>
            <i className="fa-solid fa-clipboard-check"></i>
            {isUpdate ? ' Review Update Draft' : ' Review Draft & Confirm'}
          </span>
          <span className="agent-card-badge category">
            {communityId || 'General'}
          </span>
        </div>

        <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '10px 14px' }}>
          <div style={{ fontSize: '0.785rem', fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', marginBottom: '4px' }}>
            {validationNotes || 'Please review your post details before publishing:'}
          </div>
          <h4 style={{ margin: '4px 0', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
            {title}
          </h4>
          <p style={{ margin: '4px 0 8px 0', fontSize: '0.875rem', color: '#334155', lineHeight: '1.45' }}>
            {content}
          </p>
          <div className="agent-card-meta" style={{ color: '#713f12' }}>
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
