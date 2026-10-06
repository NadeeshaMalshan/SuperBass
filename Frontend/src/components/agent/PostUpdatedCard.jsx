import React, { useState } from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import { SERVICE_CATEGORIES } from '../ServiceCategories.jsx';
import './AgentCards.css';

const CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((cat) => ({
  id: cat.name,
  code: cat.id,
  label: cat.name,
  icon: cat.illustration,
}));

export default function PostUpdatedCard({ data, onAction }) {
  if (!data) return null;

  const {
    id,
    title = 'Updated Service Request',
    content = '',
    communityId = 'General',
    location = 'Colombo',
    updatedAt
  } = data;

  const effectivePostId = id || data.postId || data.PostId;
  const postImages = Array.isArray(data.images) && data.images.length > 0
    ? data.images
    : Array.isArray(data.photos) ? data.photos.map(p => typeof p === 'string' ? p : p.url) : [];

  const [lightboxImg, setLightboxImg] = useState(null);

  // Match category illustration icon
  const categoryObj = CATEGORY_OPTIONS.find((c) => {
    const target = (communityId || '').toLowerCase().trim();
    if (!target) return false;
    const cId = (c.id || '').toLowerCase();
    const cCode = (c.code || '').toLowerCase();
    const cLabel = (c.label || '').toLowerCase();
    return (
      cId === target ||
      cCode === target ||
      cLabel === target ||
      (target.length > 2 && (cId.includes(target) || target.includes(cId))) ||
      (target.length > 2 && (cCode.includes(target) || target.includes(cCode)))
    );
  }) || { id: communityId || 'General', label: communityId || 'General', icon: null };

  const formattedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleInspect = () => {
    onAction && onAction('send_prompt', `Show details for post #${effectivePostId}`);
  };

  const handleFindWorkers = () => {
    const catName = categoryObj.label || communityId || 'service';
    const loc = location || 'Colombo';
    onAction && onAction('send_prompt', `Find verified technicians for this ${catName} request in ${loc}`);
  };

  const handleEditAgain = () => {
    onAction && onAction('edit_post', {
      postId: effectivePostId,
      id: effectivePostId,
      title,
      content,
      communityId: categoryObj.label || communityId,
      location,
      photos: postImages,
      images: postImages
    });
  };

  return (
    <div className="post-updated-card-root">
      {/* 1. Header with Craftsman Avatar and Success Status */}
      <div className="post-updated-header">
        <div className="post-updated-avatar-wrapper">
          <img src={craftsmanAvatar} alt="Workio Assistant" className="post-updated-avatar-img" />
          <div className="post-updated-check-badge">
            <i className="fa-solid fa-check"></i>
          </div>
        </div>

        <div className="post-updated-header-text">
          <div className="post-updated-header-top">
            <span className="post-updated-id-pill">Post #{effectivePostId}</span>
            <span className="post-updated-status-pill">
              <i className="fa-solid fa-circle-check"></i> Updated & Live
            </span>
          </div>
          <h2 className="post-updated-main-title">Post Updated Successfully!</h2>
        </div>
      </div>

      {/* 2. Category & Meta Banner */}
      <div className="post-updated-meta-banner">
        <div className="post-updated-category-badge">
          {categoryObj.icon && (
            <img src={categoryObj.icon} alt={categoryObj.label} className="post-updated-cat-icon" />
          )}
          <span>{categoryObj.label}</span>
        </div>

        <div className="post-updated-meta-tags">
          <span className="post-updated-meta-item">
            <i className="fa-solid fa-location-dot"></i> {location}
          </span>
          <span className="post-updated-meta-item">
            <i className="fa-regular fa-clock"></i> {formattedTime}
          </span>
        </div>
      </div>

      {/* 3. Updated Content Box */}
      <div className="post-updated-body">
        <h3 className="post-updated-title">{title}</h3>
        {content && <p className="post-updated-description">{content}</p>}
      </div>

      {/* 4. Attached Photos Gallery (if any) */}
      {postImages.length > 0 && (
        <div className="post-updated-photos-section">
          <div className="post-updated-photos-header">
            <i className="fa-regular fa-image"></i>
            <span>Attached Photos ({postImages.length})</span>
          </div>
          <div className="post-updated-photos-grid">
            {postImages.map((imgUrl, idx) => (
              <div
                key={idx}
                className="post-updated-photo-card"
                onClick={() => setLightboxImg(imgUrl)}
                title="Click to view photo"
              >
                <img src={imgUrl} alt={`Attachment ${idx + 1}`} className="post-updated-thumb-img" />
                <div className="post-updated-photo-hover-overlay">
                  <i className="fa-solid fa-magnifying-glass-plus"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Rich Action Buttons */}
      <div className="post-updated-actions-row">
        {/* Inspect Details / Open Interactive View */}
        <button
          type="button"
          className="post-updated-action-primary"
          onClick={handleInspect}
          title="Open interactive post view with comments & likes"
        >
          <i className="fa-solid fa-eye"></i>
          <span>View Post Details</span>
        </button>

        {/* Find Matching Technicians */}
        <button
          type="button"
          className="post-updated-action-highlight"
          onClick={handleFindWorkers}
          title="Find local verified craftsmen for this request"
        >
          <i className="fa-solid fa-user-gear"></i>
          <span>Find Technicians</span>
        </button>

        {/* Edit Again */}
        <button
          type="button"
          className="post-updated-action-secondary"
          onClick={handleEditAgain}
          title="Make further changes to this post"
        >
          <i className="fa-regular fa-pen-to-square"></i>
          <span>Edit</span>
        </button>

        {/* Open in Community Board */}
        <button
          type="button"
          className="post-updated-action-tertiary"
          onClick={() => onAction && onAction('navigate', `/community-post?id=${effectivePostId}`)}
          title="Open community post full page"
        >
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
          <span>Feed</span>
        </button>
      </div>

      {/* 6. Lightbox Photo Modal */}
      {lightboxImg && (
        <div className="post-detail-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="post-detail-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImg} alt="Enlarged view" className="post-detail-lightbox-img" />
            <button
              type="button"
              className="post-detail-lightbox-close"
              onClick={() => setLightboxImg(null)}
              title="Close image"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
