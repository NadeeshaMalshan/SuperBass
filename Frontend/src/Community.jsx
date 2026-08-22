import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './Community.css';
import categoriesData from './data/categories.json';
import ChatModal from './components/ChatModal.jsx';
import UserMenu from './components/UserMenu.jsx';

// Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';

const API_BASE_URL = "http://localhost:5237/api/community-posts";

export default function Community() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // State (DB Posts strictly)
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Active Tab: 'feed' or 'moderation'
  const [activeTab, setActiveTab] = useState('feed');
  const [moderationPosts, setModerationPosts] = useState([]);

  // Detail Modal State
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  // Edit Modal State
  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editLocation, setEditLocation] = useState('Colombo 05');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('plumbing');
  const [newCondition, setNewCondition] = useState('Brand New');
  const [newPrice, setNewPrice] = useState('');
  const [newLocation, setNewLocation] = useState('Colombo 05');
  const [newImages, setNewImages] = useState([]);
  const fileInputRef = useRef(null);

  // Comments State (postId -> array of comments)
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  // Report Modal State
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  // Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState({
    name: 'Jayashan Manodya',
    email: 'jayashan@superbass.lk',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jayashan'
  });
  const [chatPostContext, setChatPostContext] = useState(null);

  const handleOpenChat = (post) => {
    if (!post) return;
    setChatRecipient({
      name: post.userName || 'SuperBass Member',
      email: post.userId || post.userEmail || `${post.userName?.toLowerCase().replace(/\s+/g, '') || 'member'}@superbass.lk`,
      avatar: post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId || post.userName}`,
      workerId: null,
      userId: post.userId
    });
    setChatPostContext({
      id: post.postId,
      title: post.title
    });
    setIsChatOpen(true);
  };

  // Fetch Posts strictly from Backend Database
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedLocation !== 'all') params.location = selectedLocation;
      if (sortBy) params.sort = sortBy;

      const res = await axios.get(API_BASE_URL, { params });
      if (res.data && Array.isArray(res.data)) {
        const enriched = res.data.map((p, idx) => ({
          ...p,
          condition: p.condition || 'Brand New',
          price: p.price || (p.priceVal ? `Rs ${p.priceVal.toLocaleString()}` : 'Inquire / Quote'),
          badgeType: p.badgeType || (idx % 2 === 0 ? 'verified_member' : 'grey_member'),
          hasBump: p.hasBump || false
        }));
        setPosts(enriched);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Error fetching community posts from DB:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Moderation Queue from DB
  const fetchModerationQueue = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/moderation`);
      setModerationPosts(res.data || []);
    } catch (err) {
      console.error("Error fetching moderation queue:", err);
      setModerationPosts([]);
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
  const handleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE_URL}/${postId}/like`);
      if (res.data) {
        setPosts(prev => prev.map(p => {
          if (p.postId === postId) {
            return {
              ...p,
              isLiked: res.data.isLiked,
              likesCount: res.data.likesCount
            };
          }
          return p;
        }));

        if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
          setSelectedPostForDetail(prev => ({
            ...prev,
            isLiked: res.data.isLiked,
            likesCount: res.data.likesCount
          }));
        }
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Open Detail Modal & Fetch Comments from DB
  const handleCardClick = async (post) => {
    setSelectedPostForDetail(post);
    setSelectedGalleryImage(post.images && post.images.length > 0 ? post.images[0] : null);

    try {
      const res = await axios.get(`${API_BASE_URL}/${post.postId}/comments`);
      setCommentsMap(prev => ({ ...prev, [post.postId]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching comments:", err);
      setCommentsMap(prev => ({ ...prev, [post.postId]: [] }));
    }
  };

  // Submit Comment in Detail Modal to DB
  const handleAddComment = async (postId) => {
    if (!newCommentText || !newCommentText.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/${postId}/comments`, {
        content: newCommentText,
        userName: localStorage.getItem('userName') || "You (Resident)",
        userAvatar: localStorage.getItem('userPicture') || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser"
      });

      if (res.data) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.data]
        }));

        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
          setSelectedPostForDetail(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
        }
      }
    } catch (err) {
      console.error("Error adding comment to DB:", err);
    }

    setNewCommentText('');
  };

  // Delete Post from DB
  const handleDeletePost = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this community post?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/${postId}`);
      alert("Post deleted successfully.");
      setPosts(prev => prev.filter(p => p.postId !== postId));
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (post, e) => {
    if (e) e.stopPropagation();
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.serviceCategoryId || 'plumbing');
    setEditLocation(post.location || 'Colombo 05');
    setEditImages(post.images || []);
  };

  // Handle image upload for Edit
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

  // Submit Edit Post
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    try {
      await axios.put(`${API_BASE_URL}/${editingPost.postId}`, {
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: editLocation,
        images: editImages
      });

      alert("Post updated successfully!");
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      console.error("Error updating post:", err);
      alert("Failed to update post.");
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

  // Submit Create Post directly to Backend DB
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const userEmail = localStorage.getItem('email');
      const token = localStorage.getItem('token');
      await axios.post(API_BASE_URL, {
        title: newTitle,
        content: newContent,
        serviceCategoryId: newCategory,
        location: newLocation,
        images: newImages,
        userName: localStorage.getItem('userName') || "You (Resident)",
        userAvatar: localStorage.getItem('userPicture') || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Refresh listings strictly from DB
      await fetchPosts();
    } catch (err) {
      console.error("Error creating post in DB:", err);
      alert("Failed to save post to database. Please make sure backend database is connected.");
    }

    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setNewPrice('');
    setNewImages([]);
  };

  // Submit Report to DB
  const handleReportSubmit = async () => {
    if (!reportingPostId || !reportReason.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/${reportingPostId}/report`, { reason: reportReason });
      alert("Thank you. The post has been reported for moderation.");
    } catch (err) {
      console.error("Error reporting post:", err);
    }
    setReportingPostId(null);
    setReportReason('');
  };

  // Helper for formatting time
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'just now';
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="community-page-wrapper">
      {/* Navbar Header */}
      <header className="community-navbar">
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" className="brand-logo-img" style={{ height: '46px' }} />
        </a>

        <ul className="nav-links">
          <li className="nav-link" onClick={() => navigate('/')}>Home</li>
          <li className="nav-link" onClick={() => navigate('/find')}>Find Workers</li>
          <li className="nav-link active" style={{ color: '#009688', fontWeight: 700 }}>Community</li>
        </ul>

        <div className="nav-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: '#009688',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 3px 10px rgba(0, 150, 136, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            <i className="fa-solid fa-plus"></i> Post Ad / Request
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Main Content Container */}
      <main className="community-main">
        
        {/* Banner Section */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '800', margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {activeTab === 'feed' ? 'Community Listings & Service Board' : 'Moderation Queue'}
            </h1>
            <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              {activeTab === 'feed' 
                ? 'Browse classified ads, home service requests, and neighbor recommendations' 
                : 'Review flagged community listings'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('feed')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: activeTab === 'feed' ? '#0f172a' : '#ffffff',
                color: activeTab === 'feed' ? '#ffffff' : '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              All Listings
            </button>
            <button
              onClick={() => setActiveTab('moderation')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: activeTab === 'moderation' ? '#ef4444' : '#ffffff',
                color: activeTab === 'moderation' ? '#ffffff' : '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Moderation Queue
            </button>
          </div>
        </div>

        {activeTab === 'feed' && (
          <>
            {/* Filter Toolbar Bar */}
            <div className="filter-toolbar">
              {/* Search Bar */}
              <div className="search-input-wrapper">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input
                  type="text"
                  placeholder="What are you looking for? (e.g. Monitor, AC repair, Plumbing...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              {/* Location Filter */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Locations</option>
                <option value="Colombo">Colombo</option>
                <option value="Colombo 03">Colombo 03</option>
                <option value="Colombo 05">Colombo 05</option>
                <option value="Kandy">Kandy</option>
                <option value="Rajagiriya">Rajagiriya</option>
                <option value="Nugegoda">Nugegoda</option>
                <option value="Dehiwala">Dehiwala</option>
              </select>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>

            {/* Category Filter Chips */}
            <div className="category-chips-scroll">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`category-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                All Categories
              </button>
              {categoriesData.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`category-chip ${selectedCategory === cat.id ? 'active' : ''}`}
                >
                  <i className={`fa-solid ${cat.icon}`}></i>
                  {cat.name}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Listings Cards Container */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: '#009688', marginBottom: '1rem' }}></i>
            <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Loading database posts...</p>
          </div>
        ) : (activeTab === 'feed' ? posts : moderationPosts).length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '4rem 2rem',
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}></i>
            <h3 style={{ fontSize: '1.25rem', color: '#334155', fontWeight: '700', margin: '0 0 0.5rem 0' }}>
              {activeTab === 'feed' ? 'No posts found in database' : 'No posts currently in moderation queue'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {activeTab === 'feed' ? 'Create a post to publish it to the database.' : 'All reported posts have been resolved.'}
            </p>
            {activeTab === 'feed' && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  backgroundColor: '#009688',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '10px 24px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Post New Ad / Request
              </button>
            )}
          </div>
        ) : (
          <div className="ikman-listings-container">
            {(activeTab === 'feed' ? posts : moderationPosts).map(post => (
              <div 
                key={post.postId}
                className="ikman-card"
                onClick={() => handleCardClick(post)}
              >
                {/* Left Thumbnail Image Column */}
                <div className="ikman-image-col">
                  {post.images && post.images.length > 0 ? (
                    <>
                      <img 
                        src={post.images[0]} 
                        alt={post.title} 
                        className="ikman-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                        }}
                      />
                      {post.images.length > 1 && (
                        <div className="ikman-img-count">
                          <i className="fa-solid fa-camera"></i> {post.images.length}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="ikman-img-placeholder">
                      <i className="fa-solid fa-image"></i>
                    </div>
                  )}
                </div>

                {/* Right Details Content Column */}
                <div className="ikman-content-col">
                  <div>
                    {/* Item Title & Edit/Delete Action Controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 className="ikman-title">
                        {post.title}
                      </h3>

                      {/* Card Action Controls: Edit & Delete */}
                      <div style={{ display: 'flex', gap: '6px', shrink: 0 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleOpenEdit(post, e)}
                          title="Edit Post"
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.775rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>

                        <button
                          onClick={(e) => handleDeletePost(post.postId, e)}
                          title="Delete Post"
                          style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '0.775rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>

                    {/* Condition / Subtag */}
                    {post.condition && (
                      <div className="ikman-condition">
                        {post.condition}
                      </div>
                    )}

                    {/* Badges Row */}
                    <div className="ikman-badges">
                      {post.badgeType === 'grey_member' && (
                        <span className="badge-member-grey">MEMBER</span>
                      )}

                      {post.badgeType === 'verified_member' && (
                        <>
                          <span className="badge-member-yellow">
                            <i className="fa-solid fa-star" style={{ color: '#eab308' }}></i> MEMBER
                          </span>
                          <span className="badge-verified">
                            <i className="fa-solid fa-circle-check"></i> VERIFIED SELLER
                          </span>
                        </>
                      )}

                      <span className="badge-category-chip">
                        {post.serviceCategoryName}
                      </span>
                    </div>

                    {/* Location Line */}
                    <div className="ikman-location-cat">
                      <span>📍 {post.location}</span>
                    </div>

                    {/* Price Tag */}
                    <div className="ikman-price">
                      {post.price || (post.priceVal ? `Rs ${post.priceVal.toLocaleString()}` : 'Inquire / Quote')}
                    </div>
                  </div>

                  {/* Footer Meta (Timestamp & Yellow Bump Arrow Icon) */}
                  <div className="ikman-footer-meta">
                    <span>{formatTimeAgo(post.createdAt)}</span>
                    {post.hasBump && (
                      <span className="ikman-bump-icon" title="Bumped just now">
                        <i className="fa-solid fa-arrow-up"></i>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Listing Item Detail Modal View */}
      {selectedPostForDetail && (
        <div className="modal-overlay" onClick={() => setSelectedPostForDetail(null)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge-category-chip" style={{ marginBottom: '4px', display: 'inline-block' }}>
                  {selectedPostForDetail.serviceCategoryName}
                </span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                  {selectedPostForDetail.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedPostForDetail(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Main Image Gallery */}
              {selectedPostForDetail.images && selectedPostForDetail.images.length > 0 && (
                <div>
                  <img 
                    src={selectedGalleryImage || selectedPostForDetail.images[0]} 
                    alt={selectedPostForDetail.title}
                    className="detail-gallery-main" 
                  />
                  {selectedPostForDetail.images.length > 1 && (
                    <div className="detail-thumbnails" style={{ marginTop: '10px' }}>
                      {selectedPostForDetail.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Thumbnail"
                          className={`detail-thumb-img ${selectedGalleryImage === img ? 'active' : ''}`}
                          onClick={() => setSelectedGalleryImage(img)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Price & Location Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: '600' }}>Listing Price / Budget</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#009688' }}>
                    {selectedPostForDetail.price || 'Inquire / Quote'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Location</span>
                  <div style={{ fontWeight: '700', color: '#334155' }}>
                    {selectedPostForDetail.location}
                  </div>
                </div>
              </div>

              {/* Poster Info Card */}
              <div className="poster-info-card">
                <div className="poster-left">
                  <img 
                    src={selectedPostForDetail.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPostForDetail.postId}`} 
                    alt={selectedPostForDetail.userName}
                    className="poster-avatar"
                  />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>
                      {selectedPostForDetail.userName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Posted {formatTimeAgo(selectedPostForDetail.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenChat(selectedPostForDetail)}
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 18px',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}
                >
                  <i className="fa-solid fa-comment-dots"></i> Chat / Contact
                </button>
              </div>

              {/* Full Description Content */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '700', color: '#334155' }}>Description</h4>
                <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                  {selectedPostForDetail.content}
                </p>
              </div>

              {/* Like / Comment / Edit / Delete Actions Bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={(e) => handleLike(selectedPostForDetail.postId, e)}
                  style={{
                    background: selectedPostForDetail.isLiked ? '#e0f2fe' : '#f1f5f9',
                    border: 'none',
                    color: selectedPostForDetail.isLiked ? '#0284c7' : '#475569',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-thumbs-up"></i> Interested ({selectedPostForDetail.likesCount || 0})
                </button>

                <button
                  onClick={(e) => { setSelectedPostForDetail(null); handleOpenEdit(selectedPostForDetail, e); }}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Edit Post
                </button>

                <button
                  onClick={(e) => { handleDeletePost(selectedPostForDetail.postId, e); }}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontWeight: '700',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Delete Post
                </button>

                <button
                  onClick={() => setReportingPostId(selectedPostForDetail.postId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginLeft: 'auto'
                  }}
                >
                  <i className="fa-solid fa-flag"></i> Report
                </button>
              </div>

              {/* Comments Thread Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', fontWeight: '700', color: '#334155' }}>
                  Comments & Replies ({selectedPostForDetail.commentsCount || (commentsMap[selectedPostForDetail.postId] || []).length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                  {(commentsMap[selectedPostForDetail.postId] || []).length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>No comments yet. Ask a question or reply to this ad!</p>
                  ) : (
                    (commentsMap[selectedPostForDetail.postId] || []).map(comment => (
                      <div key={comment.commentId} style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#0f172a' }}>
                            {comment.userName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input Box */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Write a message or question..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedPostForDetail.postId)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(selectedPostForDetail.postId)}
                    style={{
                      backgroundColor: '#009688',
                      color: '#ffffff',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {editingPost && (
        <div className="modal-overlay" onClick={() => setEditingPost(null)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Edit Community Post</h2>
              <button onClick={() => setEditingPost(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Ad Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Description</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Photos ({editImages.length} attached)</label>
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
                  onClick={() => editFileInputRef.current?.click()}
                  style={{
                    padding: '10px 16px', borderRadius: '8px', border: '1px dashed #94a3b8',
                    backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', width: '100%'
                  }}
                >
                  <i className="fa-solid fa-camera"></i> Add / Change Photos
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  style={{ padding: '10px 20px', borderRadius: '20px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '20px', border: 'none', backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Ad / Post Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Post Classified Ad or Request</h2>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Ad Title</label>
                <input
                  type="text"
                  placeholder="e.g. Dell P2719H 27 inch Frameless IPS Monitor or Urgent AC Servicing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Condition / Type</label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="Brand New">Brand New</option>
                    <option value="Used">Used</option>
                    <option value="Service Request">Service Request</option>
                    <option value="Recommendation">Recommendation</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Price / Budget (Rs)</label>
                  <input
                    type="text"
                    placeholder="e.g. 30,000"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo 05"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Description</label>
                <textarea
                  placeholder="Describe your item, specification, warranty, or service request details..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem', color: '#334155' }}>Attach Multiple Photos</label>
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
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px dashed #94a3b8',
                    backgroundColor: '#f8fafc',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    width: '100%'
                  }}
                >
                  <i className="fa-solid fa-camera"></i> Choose Photos ({newImages.length} attached)
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '20px',
                    border: '1px solid #cbd5e1',
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
                    backgroundColor: '#009688',
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Publish Ad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Post Modal */}
      {reportingPostId && (
        <div className="modal-overlay" onClick={() => setReportingPostId(null)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a' }}>Report Listing</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
              Why are you reporting this ad or post for moderation?
            </p>
            <textarea
              placeholder="e.g. Inappropriate content, spam, incorrect price, or misleading seller info"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setReportingPostId(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'none', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReportSubmit}
                style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Interactive Realtime Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        recipient={chatRecipient}
        postContext={chatPostContext}
      />
    </div>
  );
}
