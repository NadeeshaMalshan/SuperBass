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
import '@material/web/progress/circular-progress.js';
import Loader from './components/Loader.jsx';

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

  const currentUserEmail = localStorage.getItem('email');
  const currentUserName = localStorage.getItem('userName');
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  const isPostOwner = (post) => {
    if (!post) return false;
    if (!currentUserEmail && !currentUserName) return false;

    const postUserId = post.userId ? post.userId.trim().toLowerCase() : '';
    const postUserName = post.userName ? post.userName.trim().toLowerCase() : '';
    const emailLower = currentUserEmail ? currentUserEmail.trim().toLowerCase() : '';
    const emailPrefix = emailLower.includes('@') ? emailLower.split('@')[0] : emailLower;
    const nameLower = currentUserName ? currentUserName.trim().toLowerCase() : '';

    return (
      (emailLower && postUserId === emailLower) ||
      (emailPrefix && postUserId === emailPrefix) ||
      (nameLower && postUserName === nameLower) ||
      (emailPrefix && postUserName === emailPrefix)
    );
  };

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
      const userEmail = localStorage.getItem('email');
      const userName = localStorage.getItem('userName');
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/${postId}?requesterEmail=${encodeURIComponent(userEmail || '')}&requesterName=${encodeURIComponent(userName || '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Post deleted successfully.");
      setPosts(prev => prev.filter(p => p.postId !== postId));
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      const msg = err.response?.data?.message || "Failed to delete post.";
      alert(msg);
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
      const userEmail = localStorage.getItem('email');
      const userName = localStorage.getItem('userName');
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/${editingPost.postId}`, {
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: editLocation,
        images: editImages,
        userEmail: userEmail,
        userName: userName
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert("Post updated successfully!");
      setEditingPost(null);
      fetchPosts();
    } catch (err) {
      console.error("Error updating post:", err);
      const msg = err.response?.data?.message || "Failed to update post.";
      alert(msg);
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
    <div className="find-page-container">
      {/* Top Navbar */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>

        {/* Search Input Bar */}
        <div style={{ flex: 1, maxWidth: '580px', margin: '0 2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '24px',
            padding: '8px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', marginRight: '12px' }}></i>
            <input 
              type="text"
              placeholder="Search community posts, ads, and requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                outline: 'none',
                fontSize: '0.925rem'
              }}
            />
            {searchTerm && (
              <i 
                className="fa-solid fa-xmark" 
                onClick={() => setSearchTerm('')}
                style={{ color: '#94a3b8', cursor: 'pointer' }}
              ></i>
            )}
          </div>
        </div>

        {/* Nav Actions */}
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center' }}>
          <md-filled-button
            onClick={() => navigate('/find')}
            style={{
              '--md-sys-color-primary': '#FDC101',
              '--md-sys-color-on-primary': '#000000',
              padding: '0 20px',
              minWidth: '100px',
              margin: '0 8px'
            }}
          >
            Find Workers
          </md-filled-button>
          
          <UserMenu />
        </div>
      </header>

      {/* Main Content Container */}
      {/* Main Layout Container */}
      <div className="find-layout">
        {/* Left Sidebar Filters */}
        <aside className="find-sidebar">
          <div className="find-sidebar-header">
            <h2 className="find-sidebar-title">Filter by</h2>
            <button className="find-sidebar-reset" onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedLocation('all');
              setSortBy('newest');
            }}>
              Reset all <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Filter Group: Location */}
          <div className="filter-group">
            <div className="filter-group-title">Location</div>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.9rem', color: '#334155', outline: 'none' }}
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
          </div>

          {/* Filter Group: Service Categories */}
          <div className="filter-group">
            <div className="filter-group-title">Category</div>
            <div className="checkbox-list">
              <label className="custom-checkbox-item">
                <div className="custom-checkbox-left">
                  <input 
                    type="radio" 
                    name="catRadio"
                    className="custom-checkbox-input"
                    checked={selectedCategory === 'all'}
                    onChange={() => setSelectedCategory('all')}
                  />
                  <span>All Categories</span>
                </div>
              </label>
              {categoriesData.map(cat => (
                <label key={cat.id} className="custom-checkbox-item">
                  <div className="custom-checkbox-left">
                    <input 
                      type="radio" 
                      name="catRadio"
                      className="custom-checkbox-input"
                      checked={selectedCategory === cat.id}
                      onChange={() => setSelectedCategory(cat.id)}
                    />
                    <span>{cat.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="find-main" style={{ flex: 1, minWidth: 0 }}>
          {/* Main Controls Header */}
          <div className="find-main-header">
            <div>
              <h1 className="find-results-title">
                {activeTab === 'feed' ? 'Community Listings' : 'Moderation Queue'}
              </h1>
              <p style={{ color: '#64748b', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
                {activeTab === 'feed' 
                  ? 'Browse classified ads, home service requests, and neighbor recommendations' 
                  : 'Review flagged community listings'}
              </p>
            </div>

            <div className="find-header-actions">
              {/* Tab Toggles */}
              <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
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

              {activeTab === 'feed' && (
                <>
                  <select 
                    className="find-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="newest">Sort by: Newest First</option>
                    <option value="popular">Most Popular</option>
                  </select>

                  <md-filled-button
                    onClick={() => setIsCreateModalOpen(true)}
                    style={{
                      '--md-sys-color-primary': '#FDC101',
                      '--md-sys-color-on-primary': '#000000',
                      padding: '0 24px',
                      marginLeft: '8px'
                    }}
                  >
                    <i slot="icon" className="fa-solid fa-plus"></i>
                    Post Ad
                  </md-filled-button>
                </>
              )}
            </div>
          </div>

        {/* Listings Cards Container */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '4rem', color: '#64748b' }}>
            <Loader />
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
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {(activeTab === 'feed' ? posts : moderationPosts).map(post => {
              const catObj = categoriesData.find(c => c.id === post.category);
              return (
                <div 
                  key={post.postId}
                  className="sleek-worker-card"
                  onClick={() => handleCardClick(post)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Top Meta */}
                  <div className="card-top-meta" style={{ justifyContent: 'space-between', padding: '0 16px 12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div className="card-distance-pill">
                      <i className={`fa-solid ${catObj?.icon || 'fa-tag'}`} style={{ color: '#64748b' }}></i>
                      <span>{post.category}</span>
                    </div>
                    <div className="card-rating-pill" style={{ background: 'transparent', padding: 0 }}>
                      <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500 }}>
                        <i className="fa-solid fa-clock"></i> {formatTimeAgo(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Photo Banner */}
                  <div className="card-photo-container" style={{ margin: '16px', height: '180px', borderRadius: '12px' }}>
                    {post.images && post.images.length > 0 ? (
                      <img 
                        src={post.images[0]} 
                        alt={post.title} 
                        className="card-photo-img"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="card-photo-avatar-placeholder" style={{ borderRadius: '12px', background: '#f1f5f9' }}>
                        <i className="fa-solid fa-image" style={{ color: '#cbd5e1', fontSize: '3rem' }}></i>
                      </div>
                    )}
                    {post.images && post.images.length > 1 && (
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.75)', color: '#ffffff', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                        <i className="fa-solid fa-camera"></i> {post.images.length}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0 16px' }}>
                    {/* Title and Edit/Delete Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 className="card-worker-name" style={{ margin: 0, fontSize: '1.1rem', WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {post.title}
                      </h3>
                    </div>
                    
                    <p className="card-worker-role" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0 0 0' }}>
                      <i className="fa-solid fa-location-dot" style={{ color: '#94a3b8' }}></i> {post.location}
                    </p>

                    <div className="card-skills-row" style={{ marginTop: '12px' }}>
                      {post.condition && <span className="card-skill-tag">{post.condition}</span>}
                      {post.badgeType === 'verified_member' && (
                        <span className="card-skill-tag" style={{ background: '#e0f2fe', color: '#0284c7', borderColor: '#bae6fd' }}>
                          <i className="fa-solid fa-circle-check"></i> Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="card-bottom-row" style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0 0 20px 20px' }}>
                    <div className="card-price-display">
                      <span className="card-price-amount" style={{ color: '#0f172a', fontSize: '1.1rem' }}>{post.price || (post.priceVal ? `Rs ${post.priceVal.toLocaleString()}` : 'Inquire / Quote')}</span>
                    </div>

                    {isPostOwner(post) ? (
                      <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleOpenEdit(post, e)}
                          style={{ padding: '6px 12px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          title="Edit"
                        >
                          <i className="fa-solid fa-pen"></i> Edit
                        </button>
                        <button
                          onClick={(e) => handleDeletePost(post.postId, e)}
                          style={{ padding: '6px 12px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                          title="Delete"
                        >
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View Ad <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }}></i>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      </div>

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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fffbeb', padding: '14px 18px', borderRadius: '12px', border: '1px solid #fef08a' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: '600' }}>Listing Price / Budget</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
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

                {activeRole === 'Worker' && (
                  <md-filled-button
                    onClick={() => handleOpenChat(selectedPostForDetail)}
                    style={{
                      '--md-sys-color-primary': '#0f172a',
                      '--md-sys-color-on-primary': '#ffffff',
                    }}
                  >
                    <i slot="icon" className="fa-solid fa-comment-dots"></i> Chat / Contact
                  </md-filled-button>
                )}
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
                <md-filled-button
                  onClick={(e) => handleLike(selectedPostForDetail.postId, e)}
                  style={{
                    '--md-sys-color-primary': selectedPostForDetail.isLiked ? '#FDC101' : '#f1f5f9',
                    '--md-sys-color-on-primary': selectedPostForDetail.isLiked ? '#000000' : '#475569',
                  }}
                >
                  <i slot="icon" className="fa-solid fa-thumbs-up"></i>
                  Interested ({selectedPostForDetail.likesCount || 0})
                </md-filled-button>

                {/* Author Controls in Detail Modal */}
                {isPostOwner(selectedPostForDetail) && (
                  <>
                    <md-outlined-button
                      onClick={(e) => { setSelectedPostForDetail(null); handleOpenEdit(selectedPostForDetail, e); }}
                      style={{
                        '--md-sys-color-primary': '#3b82f6',
                      }}
                    >
                      Edit Post
                    </md-outlined-button>

                    <md-outlined-button
                      onClick={(e) => { handleDeletePost(selectedPostForDetail.postId, e); }}
                      style={{
                        '--md-sys-color-primary': '#ef4444',
                      }}
                    >
                      Delete Post
                    </md-outlined-button>
                  </>
                )}

                <button
                  onClick={() => setReportingPostId(selectedPostForDetail.postId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
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
                  <md-filled-button
                    onClick={() => handleAddComment(selectedPostForDetail.postId)}
                    style={{
                      '--md-sys-color-primary': '#FDC101',
                      '--md-sys-color-on-primary': '#000000',
                      padding: '0 24px'
                    }}
                  >
                    Send
                  </md-filled-button>
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
