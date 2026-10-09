import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './CommunityPostDetail.css';
import categoriesData from './data/categories.json';
import sriLankaDistricts from './data/sriLankaDistricts.json';
import ChatModal from './components/ChatModal.jsx';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';
import { BACKEND_URL } from './config.js';
import { showToast } from './utils/toast.js';

const API_BASE_URL = `${BACKEND_URL}/api/community-posts`;

export default function CommunityPostDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id') || urlParams.get('post');

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // State
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Related posts
  const [relatedPosts, setRelatedPosts] = useState([]);

  // Chat modal state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatPostContext, setChatPostContext] = useState(null);

  // Report modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editProvince, setEditProvince] = useState('Western Province');
  const [editDistrict, setEditDistrict] = useState('Colombo');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  // Auth context
  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;
  const currentUserEmail = localStorage.getItem('email') || localStorage.getItem('workerEmail');
  const currentUserName = localStorage.getItem('userName');
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getPostAuthorName = (p) => {
    if (!p) return 'Community Resident';
    if (currentUserEmail && p.userId && p.userId.toLowerCase() === currentUserEmail.toLowerCase()) {
      return currentUserName || (currentUserEmail.includes('@') ? currentUserEmail.split('@')[0] : 'You');
    }
    if (p.userName && p.userName !== 'Community Resident' && p.userName !== 'You (Resident)') {
      return p.userName;
    }
    if (p.userId && p.userId.includes('@')) {
      return p.userId.split('@')[0];
    }
    return p.userName || 'Community Resident';
  };

  const getPostAvatar = (p) => {
    if (!p) return 'https://api.dicebear.com/7.x/avataaars/svg?seed=Workio';
    if (currentUserEmail && p.userId && p.userId.toLowerCase() === currentUserEmail.toLowerCase()) {
      const pic = localStorage.getItem('userPicture');
      if (pic) return pic;
    }
    return p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.postId}`;
  };

  const isPostOwner = (p) => {
    if (!isLoggedIn || !p) return false;
    if (currentUserEmail && p.userId && currentUserEmail.toLowerCase() === p.userId.toLowerCase()) return true;
    if (currentUserEmail && p.userEmail && currentUserEmail.toLowerCase() === p.userEmail.toLowerCase()) return true;
    if (currentUserName && p.userName && currentUserName.toLowerCase() === p.userName.toLowerCase()) return true;
    return false;
  };

  // Fetch Post Details
  const fetchPostDetails = async () => {
    if (!postId) {
      setError("No post ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE_URL}/${postId}`);
      if (res.data) {
        setPost(res.data);
        if (res.data.images && res.data.images.length > 0) {
          setSelectedGalleryImage(res.data.images[0]);
        }
        // Fetch comments and related posts
        fetchComments(res.data.postId);
        fetchRelatedPosts(res.data.serviceCategoryId || res.data.category, res.data.postId);
      } else {
        setError("Community post not found.");
      }
    } catch (err) {
      console.error("Error fetching post:", err);
      // Fallback: check if we can fetch all posts and find it
      try {
        const allRes = await axios.get(API_BASE_URL);
        if (allRes.data && Array.isArray(allRes.data)) {
          const matched = allRes.data.find(p => p.postId.toString() === postId.toString());
          if (matched) {
            setPost(matched);
            if (matched.images && matched.images.length > 0) {
              setSelectedGalleryImage(matched.images[0]);
            }
            fetchComments(matched.postId);
            fetchRelatedPosts(matched.serviceCategoryId || matched.category, matched.postId);
            return;
          }
        }
      } catch (innerErr) {
        console.error("Fallback error:", innerErr);
      }
      setError("Unable to load community post. It may have been removed.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Comments
  const fetchComments = async (id) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/${id}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // Fetch Related Posts
  const fetchRelatedPosts = async (cat, currentId) => {
    try {
      const res = await axios.get(API_BASE_URL, {
        params: { category: cat || 'all' }
      });
      if (res.data && Array.isArray(res.data)) {
        const others = res.data.filter(p => p.postId.toString() !== currentId.toString()).slice(0, 3);
        setRelatedPosts(others);
      }
    } catch (err) {
      console.error("Error fetching related posts:", err);
    }
  };

  useEffect(() => {
    fetchPostDetails();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [postId]);

  // Handle Like
  const handleLike = async () => {
    if (!post) return;
    try {
      const res = await axios.post(`${API_BASE_URL}/${post.postId}/like`, {
        userEmail: currentUserEmail,
        userName: currentUserName
      });
      const newLikes = res.data.likesCount !== undefined ? res.data.likesCount : res.data.likes;
      const isLiked = res.data.isLiked;

      setPost(prev => ({
        ...prev,
        likesCount: newLikes,
        isLiked: isLiked
      }));
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Handle Add Comment
  const handleAddComment = async (e) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim() || !post) return;

    if (!isLoggedIn) {
      showToast("Please log in to leave a comment or inquiry.");
      return;
    }

    try {
      setSubmittingComment(true);
      const res = await axios.post(`${API_BASE_URL}/${post.postId}/comments`, {
        content: newCommentText.trim(),
        userName: currentUserName || "Community Member",
        userAvatar: localStorage.getItem('userPicture') || "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
        userEmail: currentUserEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setComments(prev => [...prev, res.data]);
      setPost(prev => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1
      }));
      setNewCommentText('');
      showToast("Comment submitted successfully!");
    } catch (err) {
      console.error("Error adding comment:", err);
      showToast("Failed to post comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Handle Open Chat
  const handleOpenChat = () => {
    if (!post) return;
    if (!isLoggedIn) {
      showToast("Please log in to chat with the poster.");
      return;
    }
    setChatRecipient({
      id: post.userEmail || post.userId || 'seller',
      name: getPostAuthorName(post),
      avatar: getPostAvatar(post),
      role: activeRole === 'Worker' ? 'Resident' : 'Worker'
    });
    setChatPostContext({
      postId: post.postId,
      title: post.title
    });
    setIsChatOpen(true);
  };

  // Handle Share Post
  const handleSharePost = async () => {
    const fullUrl = window.location.href;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast("Community post link copied to clipboard!");
        return;
      } catch (err) {
        console.error("Clipboard write error:", err);
      }
    }
    showToast("Share URL: " + fullUrl);
  };

  // Handle Delete Post
  const handleDeletePost = async () => {
    if (!post) return;
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/${post.postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          requesterEmail: currentUserEmail,
          requesterName: currentUserName,
          userEmail: currentUserEmail
        }
      });
      showToast("Post deleted successfully.");
      navigate('/community');
    } catch (err) {
      console.error("Error deleting post:", err);
      showToast("Failed to delete post.");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = () => {
    if (!post) return;
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
    setEditCategory(post.serviceCategoryId || post.category || 'plumbing');

    const loc = post.location || 'Colombo, Western Province';
    const parts = loc.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      setEditDistrict(parts[0]);
      setEditProvince(parts[1]);
    } else {
      setEditDistrict('Colombo');
      setEditProvince('Western Province');
    }
    setEditImages(post.images || []);
    setIsEditOpen(true);
  };

  // Save Edit Post
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!post || !editTitle.trim() || !editContent.trim()) return;

    try {
      setIsSubmittingEdit(true);
      const res = await axios.put(`${API_BASE_URL}/${post.postId}`, {
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: `${editDistrict}, ${editProvince}`,
        images: editImages,
        userEmail: currentUserEmail,
        userName: currentUserName
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setPost(res.data || {
        ...post,
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: `${editDistrict}, ${editProvince}`,
        images: editImages
      });
      setIsEditOpen(false);
      showToast("Post updated successfully!");
    } catch (err) {
      console.error("Error saving edit:", err);
      showToast("Failed to update post.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Report
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim() || !post) return;

    try {
      await axios.post(`${API_BASE_URL}/${post.postId}/report`, {
        reason: reportReason.trim()
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      showToast("Report submitted. Our moderation team will review it.");
      setIsReportOpen(false);
      setReportReason('');
    } catch (err) {
      console.error("Error submitting report:", err);
      showToast("Report submitted successfully.");
      setIsReportOpen(false);
    }
  };

  // Image Upload in Edit
  const handleEditImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const getCategoryName = (p) => {
    if (!p) return 'General';
    const cat = categoriesData.find(c => c.id === p.serviceCategoryId || c.id === p.category);
    return cat ? cat.name : (p.serviceCategoryName || p.category || 'General');
  };

  if (loading) {
    return (
      <div className="cpd-page-wrapper">
        <div className="cpd-loading-state">
          <div className="cpd-spinner"></div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', color: '#111827' }}>Loading Community Post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="cpd-page-wrapper">
        <div className="cpd-error-state">
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', marginBottom: '8px' }}>
            {error || "Post Not Found"}
          </h2>
          <p style={{ color: '#6b7280', maxWidth: '460px', marginBottom: '24px' }}>
            This post may have been fulfilled, deleted, or is temporarily unavailable.
          </p>
          <button
            type="button"
            className="cpd-back-btn"
            onClick={() => navigate('/community')}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Back to Community Feed</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cpd-page-wrapper">
      {/* Top Sticky Navigation Bar */}
      <div className="cpd-top-nav-bar">
        <div className="cpd-nav-inner">
          <button
            type="button"
            className="cpd-back-btn"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/community');
              }
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
            <span>Back to Community</span>
          </button>

          <div className="cpd-breadcrumbs">
            <span className="cpd-breadcrumb-item" onClick={() => navigate('/')}>Home</span>
            <span className="cpd-breadcrumb-sep">/</span>
            <span className="cpd-breadcrumb-item" onClick={() => navigate('/community')}>Community</span>
            <span className="cpd-breadcrumb-sep">/</span>
            <span className="cpd-breadcrumb-item" onClick={() => navigate(`/community`)}>
              {getCategoryName(post)}
            </span>
            <span className="cpd-breadcrumb-sep">/</span>
            <span className="cpd-breadcrumb-active" title={post.title}>{post.title}</span>
          </div>

          <div className="cpd-top-actions">
            <button
              type="button"
              className="cpd-share-btn"
              onClick={handleSharePost}
              title="Share post"
            >
              <i className="fa-solid fa-share-nodes"></i>
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Full Page Container */}
      <div className="cpd-container">
        {/* Left Column: Post Core & Details */}
        <div className="cpd-main-col">
          <div className="cpd-card">
            {/* Header info */}
            <div className="cpd-post-header">
              <div className="cpd-badge-row">
                <span className="cpd-category-pill">
                  <i className="fa-solid fa-tag"></i>
                  {getCategoryName(post)}
                </span>
                <span className="cpd-location-pill">
                  <i className="fa-solid fa-location-dot"></i>
                  {post.location || 'Sri Lanka'}
                </span>
                <span className="cpd-date-pill">
                  <i className="fa-regular fa-clock"></i>
                  {formatTimeAgo(post.createdAt)}
                </span>
              </div>
              <h1 className="cpd-post-title">{post.title}</h1>
            </div>

            {/* Media Gallery Showcase */}
            {post.images && post.images.length > 0 && (
              <div className="cpd-gallery-wrap">
                <img
                  src={selectedGalleryImage || post.images[0]}
                  alt={post.title}
                  className="cpd-gallery-main"
                  onClick={() => setIsLightboxOpen(true)}
                  title="Click to view full size"
                />
                {post.images.length > 1 && (
                  <div className="cpd-thumbnails">
                    {post.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`cpd-thumb-btn ${selectedGalleryImage === img ? 'active' : ''}`}
                        onClick={() => setSelectedGalleryImage(img)}
                      >
                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="cpd-thumb-img" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Author Quick Info Strip */}
            <div className="cpd-author-strip">
              <div className="cpd-author-left">
                <img
                  src={getPostAvatar(post)}
                  alt={getPostAuthorName(post)}
                  className="cpd-author-avatar"
                />
                <div>
                  <div className="cpd-author-name">{getPostAuthorName(post)}</div>
                  <div className="cpd-author-sub">
                    <span className="cpd-author-role-tag">Community Member</span>
                    <span>• Posted {formatTimeAgo(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="cpd-btn-outline"
                onClick={handleOpenChat}
              >
                <i className="fa-solid fa-comment-dots"></i>
                <span>Direct Message</span>
              </button>
            </div>

            {/* Post Description */}
            <div style={{ marginTop: '20px' }}>
              <h3 className="cpd-section-title">
                <i className="fa-solid fa-align-left" style={{ fontSize: '0.9rem', color: '#6b7280' }}></i>
                Task & Request Description
              </h3>
              <p className="cpd-desc-content">
                {post.content}
              </p>
            </div>

            {/* Community Engagement Bar */}
            <div className="cpd-actions-bar">
              <button
                type="button"
                className={`cpd-btn-like ${post.isLiked ? 'liked' : ''}`}
                onClick={handleLike}
                title="Express interest in this service request"
              >
                <i className={post.isLiked ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                <span>Interested ({post.likesCount || 0})</span>
              </button>

              {isPostOwner(post) && (
                <>
                  <button
                    type="button"
                    className="cpd-btn-outline"
                    onClick={handleOpenEdit}
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    <span>Edit Post</span>
                  </button>
                  <button
                    type="button"
                    className="cpd-btn-danger"
                    onClick={handleDeletePost}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    <span>Delete</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="cpd-btn-report"
                onClick={() => setIsReportOpen(true)}
              >
                <i className="fa-solid fa-flag"></i>
                <span>Report</span>
              </button>
            </div>
          </div>

          {/* Comments & Inquiries Section */}
          <div className="cpd-comments-card">
            <h3 className="cpd-section-title">
              <i className="fa-solid fa-comments" style={{ fontSize: '0.9rem', color: '#6b7280' }}></i>
              Community Inquiries & Comments ({comments.length})
            </h3>

            {comments.length === 0 ? (
              <div className="cpd-empty-comments">
                <i className="fa-regular fa-comment-dots" style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: '8px', display: 'block' }}></i>
                <p style={{ margin: 0, fontWeight: 600 }}>No comments yet.</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                  Have a question or can you provide this service? Leave a reply below.
                </p>
              </div>
            ) : (
              <div className="cpd-comments-list">
                {comments.map((comment) => (
                  <div key={comment.commentId} className="cpd-comment-item">
                    <img
                      src={comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.commentId}`}
                      alt={comment.userName}
                      className="cpd-comment-avatar"
                    />
                    <div className="cpd-comment-content">
                      <div className="cpd-comment-header">
                        <span className="cpd-comment-user">{comment.userName || 'Community Member'}</span>
                        <span className="cpd-comment-time">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="cpd-comment-text">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Composer */}
            {isLoggedIn ? (
              <form onSubmit={handleAddComment} className="cpd-composer">
                <input
                  type="text"
                  className="cpd-composer-input"
                  placeholder="Ask a question or offer assistance..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button
                  type="submit"
                  className="cpd-btn-send"
                  disabled={submittingComment || !newCommentText.trim()}
                >
                  <i className="fa-solid fa-paper-plane"></i>
                  <span>Send</span>
                </button>
              </form>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#4b5563' }}>
                  Log in to participate in the discussion or contact the author.
                </p>
                <button
                  type="button"
                  className="cpd-back-btn"
                  onClick={() => navigate('/login')}
                  style={{ background: '#000000', color: '#ffffff', borderColor: '#000000' }}
                >
                  Log In
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Poster Profile & Quick Actions Sidebar */}
        <div className="cpd-sidebar-col">
          {/* Poster Profile Card */}
          <div className="cpd-sidebar-card">
            <div className="cpd-poster-profile">
              <img
                src={getPostAvatar(post)}
                alt={getPostAuthorName(post)}
                className="cpd-poster-big-avatar"
              />
              <div className="cpd-poster-big-name">{getPostAuthorName(post)}</div>
              <span className="cpd-poster-badge">
                <i className="fa-solid fa-circle-check"></i>
                Verified Member
              </span>
            </div>

            <div className="cpd-poster-actions">
              <button
                type="button"
                className="cpd-btn-chat"
                onClick={handleOpenChat}
              >
                <i className="fa-solid fa-comments"></i>
                <span>Chat with Poster</span>
              </button>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div className="cpd-meta-row">
                <span className="cpd-meta-label">Category</span>
                <span className="cpd-meta-value">{getCategoryName(post)}</span>
              </div>
              <div className="cpd-meta-row">
                <span className="cpd-meta-label">Location</span>
                <span className="cpd-meta-value">{post.location || 'Sri Lanka'}</span>
              </div>
              <div className="cpd-meta-row">
                <span className="cpd-meta-label">Status</span>
                <span className="cpd-meta-value" style={{ color: '#059669' }}>Active / Open</span>
              </div>
              <div className="cpd-meta-row" style={{ borderBottom: 'none' }}>
                <span className="cpd-meta-label">Inquiries</span>
                <span className="cpd-meta-value">{comments.length} responses</span>
              </div>
            </div>
          </div>

          {/* Trust & Safety Guidance */}
          <div className="cpd-trust-card">
            <div className="cpd-trust-title">
              <i className="fa-solid fa-shield-halved" style={{ color: '#059669' }}></i>
              Workio Trust & Safety
            </div>
            <ul className="cpd-trust-list">
              <li>Always discuss project scope and costs clearly beforehand.</li>
              <li>Use Workio in-app chat for clear records of communication.</li>
              <li>Only release full payments once the work is satisfactorily completed.</li>
            </ul>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="cpd-related-card">
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                More in {getCategoryName(post)}
              </h4>
              <div>
                {relatedPosts.map((rp) => (
                  <div
                    key={rp.postId}
                    className="cpd-related-item"
                    onClick={() => navigate(`/community-post?id=${rp.postId}`)}
                  >
                    {rp.images && rp.images.length > 0 ? (
                      <img src={rp.images[0]} alt={rp.title} className="cpd-related-thumb" />
                    ) : (
                      <div className="cpd-related-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fa-solid fa-image" style={{ color: '#9ca3af' }}></i>
                      </div>
                    )}
                    <div className="cpd-related-info">
                      <div className="cpd-related-title">{rp.title}</div>
                      <div className="cpd-related-meta">
                        {rp.location || 'Sri Lanka'} • {formatTimeAgo(rp.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="cpd-lightbox" onClick={() => setIsLightboxOpen(false)}>
          <button
            type="button"
            className="cpd-lightbox-close"
            onClick={() => setIsLightboxOpen(false)}
          >
            ✕
          </button>
          <img
            src={selectedGalleryImage || (post.images && post.images[0])}
            alt={post.title}
            className="cpd-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Realtime Chat Modal */}
      {isChatOpen && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          recipient={chatRecipient}
          postContext={chatPostContext}
        />
      )}

      {/* Edit Post Modal */}
      {isEditOpen && (
        <div className="uber-modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="uber-modal-header">
              <div>
                <h2 className="uber-modal-title">Edit Community Post</h2>
                <p className="uber-modal-subtitle">Update your listing details, location, and photos</p>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setIsEditOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="uber-modal-body">
                <div className="uber-field-group">
                  <label className="uber-field-label">Post Title *</label>
                  <input
                    type="text"
                    className="uber-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="uber-form-row">
                  <div className="uber-field-group">
                    <label className="uber-field-label">Category</label>
                    <select
                      className="uber-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      {categoriesData.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="uber-field-group">
                    <label className="uber-field-label">Province *</label>
                    <select
                      className="uber-select"
                      value={editProvince}
                      onChange={(e) => {
                        const prov = e.target.value;
                        setEditProvince(prov);
                        const firstDist = (sriLankaDistricts[prov] && sriLankaDistricts[prov][0]) || 'Colombo';
                        setEditDistrict(firstDist);
                      }}
                    >
                      {Object.keys(sriLankaDistricts).map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  <div className="uber-field-group">
                    <label className="uber-field-label">District *</label>
                    <select
                      className="uber-select"
                      value={editDistrict}
                      onChange={(e) => setEditDistrict(e.target.value)}
                    >
                      {(sriLankaDistricts[editProvince] || []).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="uber-field-group">
                  <label className="uber-field-label">Description *</label>
                  <textarea
                    className="uber-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    required
                    rows={4}
                  />
                </div>

                {/* Photos */}
                <div className="uber-upload-box">
                  <div className="uber-upload-info">
                    <i className="fa-solid fa-camera uber-upload-icon"></i>
                    <div>
                      <div className="uber-upload-title">Photos ({editImages.length} attached)</div>
                      <div className="uber-upload-desc">Add or change photos for this post</div>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ref={editFileInputRef}
                    onChange={handleEditImageUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="uber-btn-secondary"
                    onClick={() => editFileInputRef.current && editFileInputRef.current.click()}
                  >
                    Select Photos
                  </button>
                </div>

                {editImages.length > 0 && (
                  <div className="uber-photo-previews">
                    {editImages.map((img, idx) => (
                      <div key={idx} className="uber-photo-thumb-wrap">
                        <img src={img} alt="preview" className="uber-photo-thumb" />
                        <button
                          type="button"
                          className="uber-photo-remove-btn"
                          onClick={() => setEditImages(prev => prev.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="uber-modal-footer">
                <button
                  type="button"
                  className="uber-btn-secondary"
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="uber-btn-primary"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportOpen && (
        <div className="uber-modal-backdrop" onClick={() => setIsReportOpen(false)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="uber-modal-header">
              <h2 className="uber-modal-title">Report Community Post</h2>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setIsReportOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitReport}>
              <div className="uber-modal-body">
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666666' }}>
                  Please describe why this post is inappropriate, misleading, or violates guidelines.
                </p>
                <textarea
                  className="uber-textarea"
                  rows={4}
                  placeholder="Reason for report..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                />
              </div>
              <div className="uber-modal-footer">
                <button
                  type="button"
                  className="uber-btn-secondary"
                  onClick={() => setIsReportOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="uber-btn-primary"
                  style={{ background: '#ef4444', borderColor: '#ef4444' }}
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
