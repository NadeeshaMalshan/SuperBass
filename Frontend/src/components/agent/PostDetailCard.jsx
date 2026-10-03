import React, { useState, useEffect } from 'react';
import axios from 'axios';
import craftsmanAvatar from '../../assets/carftman.png';
import { SERVICE_CATEGORIES } from '../ServiceCategories.jsx';
import { API_BASE_URL } from '../../config.js';
import './AgentCards.css';

const CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((cat) => ({
  id: cat.name,
  code: cat.id,
  label: cat.name,
  icon: cat.illustration,
}));

export default function PostDetailCard({ data, onAction }) {
  if (!data) return null;

  const {
    id,
    title = 'Community Service Request',
    content = '',
    communityId = 'General',
    location = 'Colombo',
    authorName = '',
    authorEmail = '',
    createdAt,
    likesCount = 0,
    commentsCount = 0,
    comments = []
  } = data;

  const effectivePostId = id || data.postId || data.PostId;
  const postImages = Array.isArray(data.images) && data.images.length > 0
    ? data.images
    : Array.isArray(data.photos) ? data.photos.map(p => typeof p === 'string' ? p : p.url) : [];

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

  // Interactive state
  const [likes, setLikes] = useState(likesCount);
  const [isLiked, setIsLiked] = useState(Boolean(data.isLiked));
  const [likeLoading, setLikeLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState(Array.isArray(comments) ? comments : []);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [copied, setCopied] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  // Sync if props update
  useEffect(() => {
    if (typeof likesCount === 'number') setLikes(likesCount);
    if (Array.isArray(comments) && comments.length > 0) setCommentsList(comments);
  }, [likesCount, comments]);

  const handleLike = async () => {
    if (likeLoading) return;
    const prevLiked = isLiked;
    const prevCount = likes;
    setIsLiked(!prevLiked);
    setLikes(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLikeLoading(true);

    try {
      const userEmail = localStorage.getItem('email') || 'resident@workio.lk';
      const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'Community Resident';
      const res = await axios.post(`${API_BASE_URL}/community-posts/${effectivePostId}/like`, {
        userEmail,
        userName
      });
      if (res.data) {
        if (typeof res.data.likesCount === 'number') setLikes(res.data.likesCount);
        if (typeof res.data.isLiked === 'boolean') setIsLiked(res.data.isLiked);
      }
    } catch (err) {
      console.error('Like toggle failed:', err);
      setIsLiked(prevLiked);
      setLikes(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleToggleComments = async () => {
    const nextShow = !showComments;
    setShowComments(nextShow);
    if (nextShow && commentsList.length === 0) {
      try {
        const res = await axios.get(`${API_BASE_URL}/community-posts/${effectivePostId}/comments`);
        if (Array.isArray(res.data)) {
          setCommentsList(res.data);
        }
      } catch (err) {
        console.error('Fetch comments failed:', err);
      }
    }
  };

  const handleAddComment = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || commentSubmitting) return;
    setCommentSubmitting(true);

    try {
      const userEmail = localStorage.getItem('email') || 'resident@workio.lk';
      const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'Community Resident';
      const res = await axios.post(`${API_BASE_URL}/community-posts/${effectivePostId}/comments`, {
        content: newComment.trim(),
        userEmail,
        userName
      });
      const createdComment = res.data?.comment || res.data || {
        userName,
        content: newComment.trim(),
        createdAt: new Date().toISOString()
      };
      setCommentsList((prev) => [...prev, createdComment]);
      setNewComment('');
    } catch (err) {
      console.error('Add comment failed:', err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/community?post=${effectivePostId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleFindWorkers = () => {
    const categoryName = categoryObj.label || communityId || 'service';
    const loc = location || 'Colombo';
    onAction && onAction('send_prompt', `Find verified technicians for this ${categoryName} request in ${loc}`);
  };

  const handleEdit = () => {
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

  const displayName = authorName || (authorEmail ? authorEmail.split('@')[0] : 'Community Resident');
  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently Posted';

  return (
    <div className="post-detail-card-root">
      {/* 1. Header with Craftsman Avatar and Post ID */}
      <div className="post-detail-header">
        <div className="post-detail-avatar-wrapper">
          <img src={craftsmanAvatar} alt="Workio Assistant" className="post-detail-avatar-img" />
        </div>
        <div className="post-detail-header-text">
          <div className="post-detail-header-top">
            <span className="post-detail-id-pill">Post #{effectivePostId}</span>
            <span className="post-detail-status-pill">
              <span className="post-detail-pulsing-dot"></span> Active Request
            </span>
          </div>
          <h2 className="post-detail-card-main-title">Community Service Post</h2>
        </div>
      </div>

      {/* 2. Category & Author Meta Banner */}
      <div className="post-detail-meta-banner">
        <div className="post-detail-category-badge">
          {categoryObj.icon && (
            <img src={categoryObj.icon} alt={categoryObj.label} className="post-detail-cat-icon" />
          )}
          <span>{categoryObj.label}</span>
        </div>

        <div className="post-detail-meta-tags">
          <span className="post-detail-meta-item">
            <i className="fa-solid fa-location-dot"></i> {location}
          </span>
          <span className="post-detail-meta-item">
            <i className="fa-regular fa-clock"></i> {formattedDate}
          </span>
        </div>
      </div>

      {/* 3. Author Info Pill */}
      <div className="post-detail-author-row">
        <div className="post-detail-author-avatar">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="post-detail-author-info">
          <span className="post-detail-author-name">{displayName}</span>
          <span className="post-detail-author-role">Community Member</span>
        </div>
      </div>

      {/* 4. Title and Description Content */}
      <div className="post-detail-body">
        <h3 className="post-detail-title">{title}</h3>
        <p className="post-detail-description">{content}</p>
      </div>

      {/* 5. Attached Photos Gallery */}
      {postImages.length > 0 && (
        <div className="post-detail-photos-section">
          <div className="post-detail-photos-header">
            <i className="fa-regular fa-image"></i>
            <span>Attached Photos ({postImages.length})</span>
          </div>
          <div className="post-detail-photos-grid">
            {postImages.map((imgUrl, idx) => (
              <div
                key={idx}
                className="post-detail-photo-card"
                onClick={() => setLightboxImg(imgUrl)}
                title="Click to view photo"
              >
                <img src={imgUrl} alt={`Attachment ${idx + 1}`} className="post-detail-thumb-img" />
                <div className="post-detail-photo-hover-overlay">
                  <i className="fa-solid fa-magnifying-glass-plus"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Interactive Engagement Row (Like, Comment Toggle, Share) */}
      <div className="post-detail-engagement-bar">
        <button
          type="button"
          className={`post-detail-engage-btn ${isLiked ? 'active-like' : ''}`}
          onClick={handleLike}
          disabled={likeLoading}
          title={isLiked ? 'Unlike post' : 'Like post'}
        >
          <i className={isLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart'}></i>
          <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
        </button>

        <button
          type="button"
          className={`post-detail-engage-btn ${showComments ? 'active-comment' : ''}`}
          onClick={handleToggleComments}
          title="Toggle discussion comments"
        >
          <i className="fa-regular fa-comment-dots"></i>
          <span>{commentsList.length} {commentsList.length === 1 ? 'Comment' : 'Comments'}</span>
          <i className={`fa-solid fa-chevron-${showComments ? 'up' : 'down'} chevron-sm`}></i>
        </button>

        <button
          type="button"
          className={`post-detail-engage-btn ${copied ? 'active-share' : ''}`}
          onClick={handleShare}
          title="Copy post link"
        >
          <i className={copied ? 'fa-solid fa-check' : 'fa-solid fa-share-nodes'}></i>
          <span>{copied ? 'Link Copied!' : 'Share'}</span>
        </button>
      </div>

      {/* 7. Interactive Comments Accordion */}
      {showComments && (
        <div className="post-detail-comments-container">
          <div className="post-detail-comments-title">
            <i className="fa-regular fa-comments"></i>
            <span>Discussion & Comments</span>
          </div>

          <div className="post-detail-comments-list">
            {commentsList.length === 0 ? (
              <div className="post-detail-no-comments">
                <i className="fa-regular fa-message"></i>
                <span>No comments yet. Be the first to reply or offer assistance!</span>
              </div>
            ) : (
              commentsList.map((c, idx) => (
                <div key={c.id || idx} className="post-detail-comment-item">
                  <div className="post-detail-comment-av">
                    {(c.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="post-detail-comment-content">
                    <div className="post-detail-comment-header">
                      <span className="post-detail-comment-author">{c.userName || 'Community Member'}</span>
                      {c.createdAt && (
                        <span className="post-detail-comment-time">
                          {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="post-detail-comment-text">{c.content || c.text || c.comment}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Input Form */}
          <form onSubmit={handleAddComment} className="post-detail-comment-composer">
            <input
              type="text"
              placeholder="Write a comment or offer assistance..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="post-detail-comment-input"
              disabled={commentSubmitting}
            />
            <button
              type="submit"
              className="post-detail-comment-submit-btn"
              disabled={!newComment.trim() || commentSubmitting}
              title="Post comment"
            >
              {commentSubmitting ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-paper-plane"></i>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 8. Bottom Action Buttons */}
      <div className="post-detail-actions-row">
        {/* Find Matching Technicians (Prominent Quick Action) */}
        <button
          type="button"
          className="post-detail-action-primary"
          onClick={handleFindWorkers}
        >
          <i className="fa-solid fa-user-gear"></i>
          <span>Find Technicians</span>
        </button>

        {/* Edit Post */}
        <button
          type="button"
          className="post-detail-action-secondary"
          onClick={handleEdit}
        >
          <i className="fa-regular fa-pen-to-square"></i>
          <span>Edit Post</span>
        </button>

        {/* View in Community Feed */}
        <button
          type="button"
          className="post-detail-action-tertiary"
          onClick={() => onAction && onAction('navigate', `/community?post=${effectivePostId}`)}
          title="Open in full community feed"
        >
          <i className="fa-solid fa-arrow-up-right-from-square"></i>
          <span>Open Feed</span>
        </button>
      </div>

      {/* 9. Lightbox Photo Modal */}
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
