import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import categoriesData from './data/categories.json';

// Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

const API_BASE_URL = "http://localhost:5237/api/community-posts";

export default function Community() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Active Tab: 'feed' or 'moderation'
  const [activeTab, setActiveTab] = useState('feed');
  const [moderationPosts, setModerationPosts] = useState([]);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('plumbing');
  const [newLocation, setNewLocation] = useState('Colombo 05');
  const [newImages, setNewImages] = useState([]);
  const fileInputRef = useRef(null);

  // Expanded Comments State (postId -> boolean)
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsMap, setCommentsMap] = useState({}); // postId -> array of comments
  const [commentInputs, setCommentInputs] = useState({}); // postId -> text

  // Report Modal State
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  // Fetch Posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedLocation !== 'all') params.location = selectedLocation;
      if (sortBy) params.sort = sortBy;

      const res = await axios.get(API_BASE_URL, { params });
      setPosts(res.data);
    } catch (err) {
      console.error("Error fetching community posts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Moderation Queue
  const fetchModerationQueue = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/moderation`);
      setModerationPosts(res.data);
    } catch (err) {
      console.error("Error fetching moderation queue:", err);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [searchTerm, selectedCategory, selectedLocation, sortBy]);

  useEffect(() => {
    if (activeTab === 'moderation') {
      fetchModerationQueue();
    }
  }, [activeTab]);

  // Handle Like
  const handleLike = async (postId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/${postId}/like`);
      setPosts(prev => prev.map(p => {
        if (p.postId === postId) {
          return { ...p, likesCount: res.data.likesCount, isLiked: res.data.isLiked };
        }
        return p;
      }));
    } catch (err) {
      console.error("Error toggling like:", err);
    }
  };

  // Toggle Comment Section
  const toggleComments = async (postId) => {
    const isExpanded = !!expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !commentsMap[postId]) {
      try {
        const res = await axios.get(`${API_BASE_URL}/${postId}/comments`);
        setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
      } catch (err) {
        console.error("Error fetching comments:", err);
      }
    }
  };

  // Submit Comment
  const handleAddComment = async (postId) => {
    const content = commentInputs[postId];
    if (!content || !content.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/${postId}/comments`, {
        content,
        userName: "You (Resident)",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser"
      });

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data]
      }));

      setCommentInputs(prev => ({ ...prev, [postId]: '' }));

      // Update comment count on post
      setPosts(prev => prev.map(p => p.postId === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // Image Upload for New Post
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit Create Post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await axios.post(API_BASE_URL, {
        title: newTitle,
        content: newContent,
        serviceCategoryId: newCategory,
        location: newLocation,
        images: newImages,
        userName: "You (Resident)",
        userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser"
      });

      setPosts(prev => [res.data, ...prev]);
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
    } catch (err) {
      console.error("Error creating post:", err);
    }
  };

  // Submit Report
  const handleReportSubmit = async () => {
    if (!reportingPostId || !reportReason.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/${reportingPostId}/report`, { reason: reportReason });
      alert("Thank you. The post has been reported for admin moderation.");
      setReportingPostId(null);
      setReportReason('');
      fetchPosts();
    } catch (err) {
      console.error("Error reporting post:", err);
    }
  };

  // Moderate Post (Admin Action)
  const handleModerateStatus = async (postId, status) => {
    try {
      await axios.put(`${API_BASE_URL}/${postId}/status`, { status });
      setModerationPosts(prev => prev.filter(p => p.postId !== postId));
      fetchPosts();
    } catch (err) {
      console.error("Error updating post status:", err);
    }
  };

  // Helper for formatting time
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#1a1a1a' }}>
      {/* Navbar Header */}
      <header className="navbar" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 2rem' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" className="brand-logo-img" style={{ height: '48px' }} />
        </a>

        <ul className="nav-links">
          <li className="nav-link" onClick={() => navigate('/')}>Home</li>
          <li className="nav-link" onClick={() => navigate('/find')}>Find Workers</li>
          <li className="nav-link active" style={{ color: '#FDC101', fontWeight: 600 }}>Community</li>
        </ul>

        <div className="nav-actions" style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab(activeTab === 'feed' ? 'moderation' : 'feed')}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #d1d5db',
              backgroundColor: activeTab === 'moderation' ? '#111827' : '#ffffff',
              color: activeTab === 'moderation' ? '#ffffff' : '#374151',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {activeTab === 'feed' ? 'Admin Moderation' : 'Back to Feed'}
          </button>
          <md-filled-button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              '--md-filled-button-container-shape': '50px',
              '--md-sys-color-primary': '#FDC101',
              '--md-sys-color-on-primary': '#000000',
              height: '42px',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            + Create Post
          </md-filled-button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
        
        {/* Title & Banner */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0, color: '#111827' }}>
              {activeTab === 'feed' ? 'Community Posts & Discussions' : 'Moderation Queue'}
            </h1>
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0 0', fontSize: '1rem' }}>
              {activeTab === 'feed' 
                ? 'Share home-service questions, recommendations, or warnings with neighbors' 
                : 'Review flagged posts reported by community members'}
            </p>
          </div>
        </div>

        {activeTab === 'feed' && (
          <>
            {/* Search & Location Bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '1.25rem',
              backgroundColor: '#ffffff',
              padding: '12px 16px',
              borderRadius: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              {/* Search Bar */}
              <div style={{ flex: 1, minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="Search community posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="all">All Locations</option>
                <option value="Colombo 03">Colombo 03</option>
                <option value="Colombo 05">Colombo 05</option>
                <option value="Rajagiriya">Rajagiriya</option>
                <option value="Nugegoda">Nugegoda</option>
                <option value="Dehiwala">Dehiwala</option>
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Category Filter Chips */}
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '1.5rem',
              scrollbarWidth: 'none'
            }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '25px',
                  border: selectedCategory === 'all' ? 'none' : '1px solid #e5e7eb',
                  backgroundColor: selectedCategory === 'all' ? '#FDC101' : '#ffffff',
                  color: selectedCategory === 'all' ? '#000000' : '#4b5563',
                  fontWeight: selectedCategory === 'all' ? '700' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontSize: '14px',
                  boxShadow: selectedCategory === 'all' ? '0 2px 6px rgba(253,193,1,0.4)' : 'none'
                }}
              >
                All Categories
              </button>
              {categoriesData.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '25px',
                    border: selectedCategory === cat.id ? 'none' : '1px solid #e5e7eb',
                    backgroundColor: selectedCategory === cat.id ? '#FDC101' : '#ffffff',
                    color: selectedCategory === cat.id ? '#000000' : '#4b5563',
                    fontWeight: selectedCategory === cat.id ? '700' : '500',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className={`fa-solid ${cat.icon}`}></i>
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Feed Posts Listing */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <p style={{ fontSize: '1.1rem' }}>Loading posts...</p>
          </div>
        ) : (activeTab === 'feed' ? posts : moderationPosts).length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '3rem 1.5rem',
            textAlign: 'center',
            border: '1px solid #e5e7eb'
          }}>
            <p style={{ fontSize: '1.2rem', color: '#4b5563', fontWeight: '600' }}>
              {activeTab === 'feed' ? 'No community posts found matching your criteria.' : 'No posts currently flagged for moderation.'}
            </p>
            {activeTab === 'feed' && (
              <md-filled-button 
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  '--md-filled-button-container-shape': '50px',
                  '--md-sys-color-primary': '#FDC101',
                  '--md-sys-color-on-primary': '#000000',
                  marginTop: '1rem'
                }}
              >
                Be the first to post
              </md-filled-button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(activeTab === 'feed' ? posts : moderationPosts).map(post => (
              <div 
                key={post.postId}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                  border: '1px solid #f0f0f0'
                }}
              >
                {/* Author Info & Category Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img 
                      src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`} 
                      alt={post.userName}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #FDC101' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: '#111827' }}>
                        {post.userName}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{post.location}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <span style={{
                    backgroundColor: '#fffbeb',
                    color: '#b45309',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.825rem',
                    fontWeight: '600',
                    border: '1px solid #fef3c7'
                  }}>
                    {post.serviceCategoryName}
                  </span>
                </div>

                {/* Post Title & Content */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' }}>
                  {post.title}
                </h3>
                <p style={{ fontSize: '0.975rem', color: '#374151', lineHeight: '1.5', margin: '0 0 1rem 0', whiteSpace: 'pre-line' }}>
                  "{post.content}"
                </p>

                {/* Attached Images */}
                {post.images && post.images.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1rem' }}>
                    {post.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt="Attached" 
                        style={{ height: '140px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                    ))}
                  </div>
                )}

                {/* Action Buttons (Like / Comment / Report) */}
                {activeTab === 'feed' ? (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    <button
                      onClick={() => handleLike(post.postId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: post.isLiked ? '#2563eb' : '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Like ({post.likesCount})
                    </button>

                    <button
                      onClick={() => toggleComments(post.postId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6b7280',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Comments ({post.commentsCount})
                    </button>

                    <button
                      onClick={() => setReportingPostId(post.postId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9ca3af',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      Report
                    </button>
                  </div>
                ) : (
                  /* Admin Moderation Controls */
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    borderTop: '1px solid #fee2e2',
                    paddingTop: '0.75rem',
                    marginTop: '0.5rem',
                    backgroundColor: '#fff5f5',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#991b1b', fontWeight: '600' }}>
                      Reported {post.reportCount || 1} time(s)
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleModerateStatus(post.postId, 'Active')}
                        style={{
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Keep / Approve
                      </button>
                      <button
                        onClick={() => handleModerateStatus(post.postId, 'Removed')}
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#ffffff',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        Remove Post
                      </button>
                    </div>
                  </div>
                )}

                {/* Collapsible Comments Drawer */}
                {expandedComments[post.postId] && (
                  <div style={{ marginTop: '1rem', borderTop: '1px dashed #e5e7eb', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                      {(commentsMap[post.postId] || []).length === 0 ? (
                        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No comments yet. Be the first to reply!</p>
                      ) : (
                        (commentsMap[post.postId] || []).map(comment => (
                          <div key={comment.commentId} style={{ backgroundColor: '#f9fafb', padding: '10px 14px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#111827' }}>
                                {comment.userName}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                {formatTimeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
                              {comment.content}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Comment Form */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={commentInputs[post.postId] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.postId]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.postId)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem'
                        }}
                      />
                      <button
                        onClick={() => handleAddComment(post.postId)}
                        style={{
                          backgroundColor: '#FDC101',
                          color: '#000000',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '560px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Create Community Post</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>Title</label>
                <input
                  type="text"
                  placeholder="e.g. Need a reliable plumber in Colombo 05"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem'
                    }}
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo 05"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #d1d5db',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>Content</label>
                <textarea
                  placeholder="Describe your question, experience, or recommendation..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #d1d5db',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>Images (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px dashed #9ca3af',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}
                >
                  Attach Images ({newImages.length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: '#FDC101',
                    color: '#000000',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportingPostId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem'
          }}>
            <h3 style={{ marginTop: 0 }}>Report Post</h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Why are you reporting this post for moderation?
            </p>
            <textarea
              placeholder="e.g. Inappropriate content, spam, or misleading recommendation"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                marginBottom: '1rem'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setReportingPostId(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'none' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReportSubmit}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: '600' }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
