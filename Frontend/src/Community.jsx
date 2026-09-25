import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import './App.css';
import './Community.css';
import categoriesData from './data/categories.json';
import ChatModal from './components/ChatModal.jsx';
import UserMenu from './components/UserMenu.jsx';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';

// Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/dialog/dialog.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/progress/circular-progress.js';
import Loader from './components/Loader.jsx';
import './components/M3Navbar.css';
import { BACKEND_URL } from './config.js';

const API_BASE_URL = `${BACKEND_URL}/api/community-posts`;

export default function Community() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // State (DB Posts strictly)
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
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
  const createDialogRef = useRef(null);

  useEffect(() => {
    if (isCreateModalOpen) {
      createDialogRef.current?.show();
    } else {
      createDialogRef.current?.close();
    }
  }, [isCreateModalOpen]);

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
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Please provide both an Ad title and description.");
      return;
    }

    try {
      const userEmail = localStorage.getItem('email');
      const token = localStorage.getItem('token');
      await axios.post(API_BASE_URL, {
        title: newTitle,
        content: newContent,
        condition: newCondition,
        priceVal: newPrice ? parseFloat(newPrice.replace(/[^0-9.]/g, '')) || null : null,
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
      {/* Google Workspace / Gmail Style Material 3 Top Navbar */}
      <header className="m3-top-navbar">
        {/* Left: App Logo & Name with Hamburger Drawer Toggle */}
        <div className="m3-navbar-brand-group">
          <button
            type="button"
            className="m3-hamburger-btn"
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            title={isSidebarCollapsed ? "Expand panel" : "Collapse panel"}
            aria-label="Toggle navigation drawer"
          >
            <md-icon>menu</md-icon>
          </button>

          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            className="m3-brand-link"
            title="superබාස් - Home"
          >
            <img src="/icon.png" alt="superබාස්" className="m3-brand-logo-img" />
            <span className="m3-brand-title">
              super<span className="m3-brand-accent">බාස්</span>
            </span>
          </a>
        </div>

        {/* Center: Search Pill */}
        <div className="m3-navbar-center">
          <div className="m3-search-pill">
            <div className="m3-search-leading-icon" title="Search Community">
              <md-icon>search</md-icon>
            </div>

            <input
              type="text"
              className="m3-search-input"
              placeholder="Search community posts, questions, and requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchTerm('');
              }}
            />

            {searchTerm && (
              <button
                type="button"
                className="m3-search-clear-btn"
                onClick={() => setSearchTerm('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <md-icon>close</md-icon>
              </button>
            )}
          </div>
        </div>

        {/* Right: Navigation Buttons (Find Workers, Community, AI, Messages, Bookings) & User Avatar */}
        <div className="m3-navbar-right">
          {/* 1. Find Workers */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/find')}
            title="Find Craftsmen & Workers"
          >
            <md-icon>search</md-icon>
            <span>Find Workers</span>
          </button>

          {/* 2. AI Assistant Button */}
          <button
            type="button"
            className="m3-nav-btn m3-nav-btn-ai"
            onClick={() => navigate('/ai-chat')}
            title="AI Home Assistant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="commGeminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="35%" stopColor="#9B72CB" />
                  <stop offset="70%" stopColor="#D96570" />
                  <stop offset="100%" stopColor="#F4B400" />
                </linearGradient>
              </defs>
              <path
                d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
                fill="url(#commGeminiGrad)"
              />
            </svg>
            <span>AI</span>
          </button>

          {/* 4. Messages Button */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/chats')}
            title="Direct Messages"
          >
            <md-icon>chat</md-icon>
            <span>Messages</span>
          </button>

          {/* 5. Bookings Button */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/bookings')}
            title="My Bookings"
          >
            <md-icon>calendar_today</md-icon>
            <span>Bookings</span>
          </button>

          {/* 6. User Profile Avatar or Sign In */}
          {localStorage.getItem('token') ? (
            <UserMenu variant="m3-google" />
          ) : (
            <button
              type="button"
              className="m3-signin-btn"
              onClick={() => navigate('/join')}
              title="Sign in to superබාස්"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      {/* Main Layout Container */}
      <div className="find-layout">
        {/* Left Sidebar Navigation (Google Workspace Style) */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
          {/* Post Ad / Compose Action Button (Material 3 Extended FAB) */}
          <button
            type="button"
            className="m3-compose-fab"
            onClick={() => setIsCreateModalOpen(true)}
            title="Post a new ad or service request"
            aria-label="Post Ad"
          >
            <md-icon>edit</md-icon>
            <span>Post Ad</span>
          </button>

          {/* Primary Navigation List */}
          <nav className="m3-drawer-nav">
            <div
              className={`m3-drawer-item ${selectedCategory === 'all' && selectedLocation === 'all' ? 'active' : ''}`}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedLocation('all');
                setSortBy('newest');
              }}
              title="View all community posts"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">dashboard</md-icon>
                <span className="m3-drawer-label">All Posts</span>
              </div>
              <span className="m3-drawer-badge">{posts.length}</span>
            </div>

            <div
              className={`m3-drawer-item ${activeTab === 'moderation' ? 'active' : ''}`}
              onClick={() => setActiveTab('moderation')}
              title="Review reported and flagged posts"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">gavel</md-icon>
                <span className="m3-drawer-label">Moderation Queue</span>
              </div>
              {moderationPosts.length > 0 && (
                <span className="m3-drawer-badge">{moderationPosts.length}</span>
              )}
            </div>
          </nav>

          <hr className="m3-drawer-divider" />

          {/* Location Section */}
          <div className="m3-drawer-section">
            {!isSidebarCollapsed ? (
              <>
                <div className="m3-drawer-section-header">
                  <span className="m3-drawer-section-title">Location</span>
                  {selectedLocation !== 'all' && (
                    <button
                      type="button"
                      className="m3-drawer-section-action"
                      onClick={() => setSelectedLocation('all')}
                      title="Clear location selection"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div style={{ padding: '0 12px 10px' }}>
                  <md-outlined-select
                    value={selectedLocation}
                    onInput={(e) => setSelectedLocation(e.target.value)}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{
                      width: '100%',
                      '--md-outlined-select-container-height': '40px',
                      '--md-outlined-select-container-shape': '10px',
                      '--md-outlined-select-leading-space': '10px',
                      '--md-outlined-select-trailing-space': '10px',
                      '--md-outlined-select-input-text-size': '0.85rem',
                      '--md-outlined-select-focus-outline-color': '#FDC101',
                      '--md-outlined-select-focus-icon-color': '#d97706',
                      '--md-menu-container-color': '#ffffff',
                      '--md-menu-container-shape': '14px',
                      '--md-sys-color-primary-container': '#fef3c7',
                      '--md-sys-color-on-primary-container': '#78350f',
                      '--md-sys-color-surface-container': '#ffffff',
                      '--md-sys-color-surface-container-high': '#ffffff'
                    }}
                  >
                    <md-icon slot="leading-icon" style={{ fontSize: '18px', '--md-icon-size': '18px', color: '#64748b' }}>location_on</md-icon>
                    <md-select-option value="all" selected={selectedLocation === 'all'}>
                      <div slot="headline">All Locations</div>
                    </md-select-option>
                    <md-select-option value="Colombo" selected={selectedLocation === 'Colombo'}>
                      <div slot="headline">Colombo</div>
                    </md-select-option>
                    <md-select-option value="Colombo 03" selected={selectedLocation === 'Colombo 03'}>
                      <div slot="headline">Colombo 03</div>
                    </md-select-option>
                    <md-select-option value="Colombo 05" selected={selectedLocation === 'Colombo 05'}>
                      <div slot="headline">Colombo 05</div>
                    </md-select-option>
                    <md-select-option value="Kandy" selected={selectedLocation === 'Kandy'}>
                      <div slot="headline">Kandy</div>
                    </md-select-option>
                    <md-select-option value="Rajagiriya" selected={selectedLocation === 'Rajagiriya'}>
                      <div slot="headline">Rajagiriya</div>
                    </md-select-option>
                    <md-select-option value="Nugegoda" selected={selectedLocation === 'Nugegoda'}>
                      <div slot="headline">Nugegoda</div>
                    </md-select-option>
                    <md-select-option value="Dehiwala" selected={selectedLocation === 'Dehiwala'}>
                      <div slot="headline">Dehiwala</div>
                    </md-select-option>
                  </md-outlined-select>
                </div>
              </>
            ) : (
              <div
                className={`m3-drawer-item ${selectedLocation !== 'all' ? 'active' : ''}`}
                onClick={() => setIsSidebarCollapsed(false)}
                title={`Location: ${selectedLocation === 'all' ? 'All Locations' : selectedLocation} (Click to expand)`}
              >
                <div className="m3-drawer-item-left">
                  <md-icon className="m3-drawer-icon">location_on</md-icon>
                </div>
              </div>
            )}
          </div>

          <hr className="m3-drawer-divider" />

          {/* Categories Section */}
          <div className="m3-drawer-section">
            <div className="m3-drawer-section-header">
              <span className="m3-drawer-section-title">Category</span>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  className="m3-drawer-section-action"
                  onClick={() => setSelectedCategory('all')}
                  title="Clear category selection"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="m3-drawer-labels-list">
              {categoriesData.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`m3-drawer-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    title={`Filter by ${cat.name}`}
                  >
                    <div className="m3-drawer-item-left">
                      <md-icon className="m3-drawer-icon">
                        {isSelected ? 'label' : (cat.materialIcon || 'label_outline')}
                      </md-icon>
                      <span className="m3-drawer-label">{cat.name}</span>
                    </div>
                  </div>
                );
              })}
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


                </>
              )}
            </div>
          </div>

          {/* Listings Cards Container */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '4rem', color: '#64748b' }}>
              <Loader />
              <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>Loading posts...</p>
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

      {/* Create Ad / Post Modal (Material 3 Dialog) */}
      {createPortal(
        <md-dialog
          ref={createDialogRef}
          onClose={() => setIsCreateModalOpen(false)}
          style={{
            '--md-dialog-container-color': '#ffffff',
            '--md-dialog-container-shape': '28px',
            '--md-outlined-text-field-container-shape': '14px',
            '--md-outlined-text-field-focus-outline-color': '#fdc101',
            '--md-outlined-text-field-focus-label-text-color': '#111827',
            '--md-outlined-select-container-shape': '14px',
            '--md-outlined-select-focus-outline-color': '#fdc101',
            '--md-outlined-select-focus-label-text-color': '#111827',
            '--md-outlined-select-focus-icon-color': '#d97706',
            '--md-menu-container-color': '#ffffff',
            '--md-menu-container-shape': '16px',
            '--md-sys-color-primary-container': '#fef3c7',
            '--md-sys-color-on-primary-container': '#78350f',
            '--md-sys-color-surface-container': '#ffffff',
            '--md-sys-color-surface-container-high': '#ffffff',
            '--md-sys-color-surface-container-highest': '#ffffff',
            fontFamily: "var(--font-body, 'DM Sans', sans-serif)",
            position: 'fixed',
            inset: 0,
            margin: 'auto',
            zIndex: 9999,
            minWidth: '320px',
            maxWidth: '680px',
            width: 'min(680px, calc(100vw - 32px))',
            maxHeight: 'min(90vh, 860px)'
          }}
        >
          <div slot="headline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '24px 28px 18px 28px', borderBottom: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '14px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', flexShrink: 0 }}>
                <md-icon style={{ fontSize: '24px' }}>campaign</md-icon>
              </div>
              <div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.2 }}>
                  Post Classified Ad or Request
                </div>
                <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '3px' }}>
                  Share your requirement or item with the neighborhood community
                </div>
              </div>
            </div>
            <md-icon-button type="button" onClick={() => setIsCreateModalOpen(false)} title="Close">
              <md-icon>close</md-icon>
            </md-icon-button>
          </div>

          <div slot="content" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px 28px', boxSizing: 'border-box' }}>
            {/* Ad Title */}
            <md-outlined-text-field
              label="Ad Title *"
              placeholder="e.g. Dell P2719H 27-inch IPS Monitor or Urgent AC Servicing"
              value={newTitle}
              onInput={(e) => setNewTitle(e.target.value)}
              style={{ width: '100%' }}
            >
              <md-icon slot="leading-icon">title</md-icon>
            </md-outlined-text-field>

            {/* Condition and Price Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <md-outlined-select
                label="Condition / Type"
                value={newCondition}
                onInput={(e) => setNewCondition(e.target.value)}
                onChange={(e) => setNewCondition(e.target.value)}
                style={{ width: '100%' }}
              >
                <md-icon slot="leading-icon">category</md-icon>
                <md-select-option value="Brand New" selected={newCondition === 'Brand New'}>
                  <div slot="headline">Brand New</div>
                </md-select-option>
                <md-select-option value="Used" selected={newCondition === 'Used'}>
                  <div slot="headline">Used</div>
                </md-select-option>
                <md-select-option value="Service Request" selected={newCondition === 'Service Request'}>
                  <div slot="headline">Service Request</div>
                </md-select-option>
                <md-select-option value="Recommendation" selected={newCondition === 'Recommendation'}>
                  <div slot="headline">Recommendation</div>
                </md-select-option>
              </md-outlined-select>

              <md-outlined-text-field
                label="Price / Budget (Rs)"
                placeholder="e.g. 30,000"
                value={newPrice}
                onInput={(e) => setNewPrice(e.target.value)}
                style={{ width: '100%' }}
              >
                <md-icon slot="leading-icon">payments</md-icon>
              </md-outlined-text-field>
            </div>

            {/* Category and Location Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <md-outlined-select
                label="Category"
                value={newCategory}
                onInput={(e) => setNewCategory(e.target.value)}
                onChange={(e) => setNewCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                <md-icon slot="leading-icon">home_repair_service</md-icon>
                {categoriesData.map(c => (
                  <md-select-option key={c.id} value={c.id} selected={newCategory === c.id}>
                    <div slot="headline">{c.name}</div>
                  </md-select-option>
                ))}
              </md-outlined-select>

              <md-outlined-text-field
                label="Location"
                placeholder="e.g. Colombo 05"
                value={newLocation}
                onInput={(e) => setNewLocation(e.target.value)}
                style={{ width: '100%' }}
              >
                <md-icon slot="leading-icon">location_on</md-icon>
              </md-outlined-text-field>
            </div>

            {/* Description Textarea */}
            <md-outlined-text-field
              type="textarea"
              rows="4"
              label="Description *"
              placeholder="Describe your item, specification, warranty, or service request details..."
              value={newContent}
              onInput={(e) => setNewContent(e.target.value)}
              style={{ width: '100%' }}
            />

            {/* Attach Photos M3 Card */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '18px 20px',
              borderRadius: '16px',
              border: '1.5px dashed #cbd5e1',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', flexShrink: 0 }}>
                    <md-icon>photo_library</md-icon>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.925rem', fontWeight: 700, color: '#1e293b' }}>
                      Attach Photos {newImages.length > 0 && <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 600 }}>({newImages.length} attached)</span>}
                    </div>
                    <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '2px' }}>
                      Supports multiple images (JPG, PNG, WEBP)
                    </div>
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <md-outlined-button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    '--md-outlined-button-outline-color': '#d97706',
                    '--md-outlined-button-label-text-color': '#111827',
                    '--md-outlined-button-leading-space': '20px',
                    '--md-outlined-button-trailing-space': '24px',
                    '--md-outlined-button-with-leading-icon-leading-space': '18px',
                    '--md-outlined-button-with-leading-icon-trailing-space': '24px',
                    '--md-outlined-button-icon-spacing': '10px',
                    '--md-outlined-button-container-height': '44px',
                    '--md-outlined-button-container-shape': '9999px',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: '700',
                    minWidth: '175px',
                    flexShrink: 0
                  }}
                >
                  <md-icon slot="icon" style={{ fontSize: '20px', width: '20px', height: '20px', color: '#d97706' }}>add_a_photo</md-icon>
                  Choose Photos
                </md-outlined-button>
              </div>

              {newImages.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  {newImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '12px', overflow: 'hidden', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                      <img src={img} alt={`Upload ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewImages(prev => prev.filter((_, i) => i !== idx));
                        }}
                        title="Remove photo"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: '#ffffff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div slot="actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 28px 24px 28px', borderTop: '1px solid #f1f5f9', boxSizing: 'border-box', width: '100%' }}>
            <md-text-button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                '--md-text-button-label-text-color': '#64748b',
                '--md-text-button-container-shape': '9999px',
                '--md-text-button-container-height': '44px',
                '--md-text-button-leading-space': '16px',
                '--md-text-button-trailing-space': '16px',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: '600'
              }}
            >
              Cancel
            </md-text-button>
            <md-filled-button
              type="button"
              onClick={handleCreatePost}
              style={{
                '--md-filled-button-container-color': '#fdc101',
                '--md-filled-button-label-text-color': '#111827',
                '--md-filled-button-leading-space': '18px',
                '--md-filled-button-trailing-space': '24px',
                '--md-filled-button-icon-spacing': '8px',
                '--md-filled-button-container-height': '44px',
                '--md-filled-button-container-shape': '9999px',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: '700',
                minWidth: '140px'
              }}
            >
              <md-icon slot="icon" style={{ fontSize: '18px', width: '18px', height: '18px', color: '#111827' }}>send</md-icon>
              Publish Ad
            </md-filled-button>
          </div>
        </md-dialog>,
        document.body
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

      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
