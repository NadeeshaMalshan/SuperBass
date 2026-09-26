import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import './Community.css';
import categoriesData from './data/categories.json';
import ChatModal from './components/ChatModal.jsx';
import UserMenu from './components/UserMenu.jsx';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';
import M3TopNavbar from './components/M3TopNavbar.jsx';
import hero2Img from './assets/community.png';
import sriLankaDistricts from './data/sriLankaDistricts.json';
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
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 9;

  // Community Card Grid View Mode: 'large' | 'small' | 'list'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('community_view_mode') || 'large';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('community_view_mode', mode);
  };

  // Reset page to 1 whenever filters, search, or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedProvince, selectedDistrict, sortBy]);

  // Detail Modal State
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);

  // Edit Modal State
  const [editingPost, setEditingPost] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editProvince, setEditProvince] = useState('Western Province');
  const [editDistrict, setEditDistrict] = useState('Colombo');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  // Create Post Modal State (Uber Modal)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('plumbing');
  const [newProvince, setNewProvince] = useState('Western Province');
  const [newDistrict, setNewDistrict] = useState('Colombo');
  const [newImages, setNewImages] = useState([]);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem('token');
  const isLoggedIn = !!token;
  const currentUserEmail = localStorage.getItem('email');
  const currentUserName = localStorage.getItem('userName');
  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  // Comments map per post
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  // Report Modal state
  const [reportingPostId, setReportingPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');

  // Realtime Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [chatPostContext, setChatPostContext] = useState(null);

  const handleOpenChat = (post) => {
    setChatRecipient({
      id: post.userEmail || post.userId || 'seller',
      name: post.userName || 'Community Seller',
      avatar: post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`,
      role: 'Worker'
    });
    setChatPostContext({
      postId: post.postId,
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
      if (selectedDistrict !== 'all') {
        params.location = selectedDistrict;
      } else if (selectedProvince !== 'all') {
        params.location = selectedProvince.replace(' Province', '');
      }
      if (sortBy) params.sort = sortBy;

      const res = await axios.get(API_BASE_URL, { params });
      if (res.data && Array.isArray(res.data)) {
        let results = res.data;
        if (selectedProvince !== 'all' && selectedDistrict === 'all') {
          const provinceDistricts = sriLankaDistricts[selectedProvince] || [];
          const provKey = selectedProvince.toLowerCase().replace(' province', '');
          results = results.filter(p => {
            const loc = (p.location || '').toLowerCase();
            return loc.includes(provKey) || provinceDistricts.some(d => loc.includes(d.toLowerCase()));
          });
        }
        // Apply sorting
        if (sortBy === 'popular') {
          results.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0) || new Date(b.createdAt) - new Date(a.createdAt));
        } else if (sortBy === 'oldest') {
          results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        } else {
          // default newest first
          results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        const enriched = results.map((p, idx) => ({
          ...p,
          condition: p.condition || null,
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

  useEffect(() => {
    fetchPosts();
  }, [searchTerm, selectedCategory, selectedProvince, selectedDistrict, sortBy]);

  // Handle Like
  const handleLike = async (postId, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await axios.post(`${API_BASE_URL}/${postId}/like`);
      const newLikes = res.data.likes;
      const isLiked = res.data.isLiked;

      setPosts(prev => prev.map(p => {
        if (p.postId === postId) {
          return { ...p, likesCount: newLikes, isLiked: isLiked };
        }
        return p;
      }));

      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(prev => ({
          ...prev,
          likesCount: newLikes,
          isLiked: isLiked
        }));
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  // Fetch comments for a specific post
  const fetchComments = async (postId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/${postId}/comments`);
      setCommentsMap(prev => ({ ...prev, [postId]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // Add Comment
  const handleAddComment = async (postId) => {
    if (!newCommentText.trim()) return;
    try {
      const userEmail = localStorage.getItem('email');
      const userName = localStorage.getItem('userName');
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_BASE_URL}/${postId}/comments`, {
        content: newCommentText,
        userName: userName || "Community Resident",
        userAvatar: localStorage.getItem('userPicture') || "https://api.dicebear.com/7.x/avataaars/svg?seed=User",
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), res.data]
      }));
      setNewCommentText('');
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to submit comment.");
    }
  };

  // Click card to open detail view
  const handleCardClick = (post) => {
    setSelectedPostForDetail(post);
    setSelectedGalleryImage(post.images && post.images.length > 0 ? post.images[0] : null);
    fetchComments(post.postId);
  };

  // Check if current user is owner of a post
  const isPostOwner = (post) => {
    if (!isLoggedIn) return false;
    if (currentUserEmail && post.userEmail && currentUserEmail.toLowerCase() === post.userEmail.toLowerCase()) {
      return true;
    }
    if (currentUserName && post.userName && currentUserName.toLowerCase() === post.userName.toLowerCase()) {
      return true;
    }
    return false;
  };

  // Delete Post strictly from DB
  const handleDeletePost = async (postId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;

    try {
      const userEmail = localStorage.getItem('email');
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: { userEmail }
      });
      alert("Post deleted successfully.");
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
      fetchPosts();
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

    let prov = 'Western Province';
    let dist = 'Colombo';
    if (post.location) {
      for (const [pName, dists] of Object.entries(sriLankaDistricts)) {
        for (const d of dists) {
          if (post.location.toLowerCase().includes(d.toLowerCase())) {
            prov = pName;
            dist = d;
            break;
          }
        }
      }
    }
    setEditProvince(prov);
    setEditDistrict(dist);
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
      setIsSubmittingEdit(true);
      const userEmail = localStorage.getItem('email');
      const userName = localStorage.getItem('userName');
      const token = localStorage.getItem('token');
      await axios.put(`${API_BASE_URL}/${editingPost.postId}`, {
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: `${editDistrict}, ${editProvince}`,
        images: editImages,
        userEmail: userEmail,
        userName: userName
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Automatically close modal after saving to DB
      setEditingPost(null);

      // Re-fetch community posts from DB
      await fetchPosts();

      // Redirect / scroll back to community feed
      navigate('/community');
      setTimeout(() => {
        const feedElement = document.getElementById('community-feed') || document.querySelector('.community-cards-grid');
        if (feedElement) {
          feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error("Error updating post:", err);
      alert("Failed to update post in database.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle image upload for Create Post
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

  // Open Create Modal with sign-in verification
  const handleOpenCreate = () => {
    if (!isLoggedIn) {
      alert("Please sign in with Google or your account to post in the community.");
      navigate('/join');
      return;
    }
    setIsCreateModalOpen(true);
  };

  // Create Post strictly to Backend Database
  const handleCreatePost = async () => {
    if (!isLoggedIn) {
      alert("Please sign in to post.");
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Please provide both an Ad title and description.");
      return;
    }

    try {
      setIsSubmittingPost(true);
      const userEmail = localStorage.getItem('email');
      const token = localStorage.getItem('token');
      await axios.post(API_BASE_URL, {
        title: newTitle,
        content: newContent,
        serviceCategoryId: newCategory,
        location: `${newDistrict}, ${newProvince}`,
        images: newImages,
        userName: localStorage.getItem('userName') || "You (Resident)",
        userAvatar: localStorage.getItem('userPicture') || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Refetch posts immediately so user sees newly published post
      await fetchPosts();

      // Close modal and reset fields
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewProvince('Western Province');
      setNewDistrict('Colombo');
      setNewImages([]);

      // Redirect / scroll to community feed
      navigate('/community');
      setTimeout(() => {
        const feedElement = document.getElementById('community-feed') || document.querySelector('.community-cards-grid');
        if (feedElement) {
          feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error("Error creating post in DB:", err);
      alert("Failed to save post to database. Please make sure backend database is connected.");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Submit Report to DB
  const handleReportSubmit = async () => {
    if (!reportingPostId || !reportReason.trim()) return;
    try {
      const userEmail = localStorage.getItem('email');
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/${reportingPostId}/report`, {
        reason: reportReason,
        reporterEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Thank you. This post has been flagged for community safety and moderation review.");
      setReportingPostId(null);
      setReportReason('');
      fetchPosts();
    } catch (err) {
      console.error("Error reporting post:", err);
      alert("Failed to submit report.");
    }
  };

  // Format timestamp helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Pagination calculations (9 cards per page)
  const allCurrentPosts = posts;
  const totalPosts = allCurrentPosts.length;
  const totalPages = Math.ceil(totalPosts / CARDS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * CARDS_PER_PAGE;
  const paginatedPosts = allCurrentPosts.slice(startIndex, startIndex + CARDS_PER_PAGE);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const feedElement = document.getElementById('community-feed') || document.querySelector('.community-cards-grid');
    if (feedElement) {
      feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="community-page-wrapper">
      {/* Sleek Dark Top Navbar */}
      <M3TopNavbar theme="dark" activePage="community" />

      {/* 1. Community Hero Showcase Banner (Uber Pitch Black Aesthetic) */}
      <section className="community-hero-banner">
        <div className="community-hero-container">
          <div className="community-hero-left">
            <span className="community-hero-overline">SuperBass Community Network</span>
            <h1 className="community-hero-title">
              Neighborhood Classifieds, Repair Advice & Services
            </h1>
            <p className="community-hero-desc">
              Share recommendations, ask neighborhood home repair questions, post free classified ads for tools & leftover materials, and discover trusted craftsmen recommended by local residents.
            </p>
            <div className="community-hero-actions">
              <button
                type="button"
                className="community-hero-primary-btn"
                onClick={handleOpenCreate}
              >
                <i className="fa-solid fa-plus"></i>
                <span>Post Free Ad / Request</span>
              </button>
              <button
                type="button"
                className="community-hero-secondary-btn"
                onClick={() => navigate('/community/chat')}
              >
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                <span>Ask SuperBass AI</span>
              </button>
            </div>
          </div>

          <div className="community-hero-right">
            <div className="community-hero-artwork-card">
              <img
                src={hero2Img}
                alt="SuperBass Neighborhood Community & Craftsmen"
                className="community-hero-artwork-img"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Content Layout (Sidebar + Feed) */}
      <div className="community-layout-container">
        {/* Left Sidebar Navigation (Uber Style) */}
        <aside className={`community-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Post Ad Button (Uber Solid Black Pill Button) */}
          <button
            type="button"
            className="uber-compose-btn"
            onClick={handleOpenCreate}
            title="Post a new ad or service request"
          >
            <i className="fa-solid fa-plus"></i>
            <span>Post an Ad</span>
          </button>

          {/* Primary Navigation List */}
          <div className="uber-sidebar-nav">
            <div
              className={`uber-sidebar-item ${selectedCategory === 'all' && selectedProvince === 'all' && selectedDistrict === 'all' ? 'active' : ''}`}
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedProvince('all');
                setSelectedDistrict('all');
                setSortBy('newest');
              }}
              title="View all community posts"
            >
              <div className="uber-sidebar-item-left">
                <i className="fa-solid fa-house"></i>
                <span>All Posts</span>
              </div>
              <span className="uber-sidebar-badge">{posts.length}</span>
            </div>
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Grid Layout Switcher Section in Sidebar */}
          <div className="uber-sidebar-section">
            <div className="uber-sidebar-section-title">
              <span>Card Layout</span>
            </div>
            <div className="uber-grid-switcher-list">
              <button
                type="button"
                className={`uber-grid-switch-btn ${viewMode === 'large' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('large')}
                title="Large Cards View"
              >
                <i className="fa-solid fa-table-cells-large"></i>
                <span>Large Cards</span>
              </button>
              <button
                type="button"
                className={`uber-grid-switch-btn ${viewMode === 'small' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('small')}
                title="Small Cards View"
              >
                <i className="fa-solid fa-grip"></i>
                <span>Small Cards</span>
              </button>
              <button
                type="button"
                className={`uber-grid-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                title="List View"
              >
                <i className="fa-solid fa-list-ul"></i>
                <span>List View</span>
              </button>
            </div>
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Location Filter Section: Two Separate Fields (Province and District) */}
          <div className="uber-sidebar-section">
            <div className="uber-sidebar-section-title">
              <span>Location</span>
              {(selectedProvince !== 'all' || selectedDistrict !== 'all') && (
                <button
                  type="button"
                  className="uber-sidebar-clear-btn"
                  onClick={() => {
                    setSelectedProvince('all');
                    setSelectedDistrict('all');
                  }}
                  title="Clear location filter"
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Province Select */}
              <select
                className="uber-sidebar-select"
                value={selectedProvince}
                onChange={(e) => {
                  setSelectedProvince(e.target.value);
                  setSelectedDistrict('all');
                }}
                aria-label="Filter by Province"
              >
                <option value="all">All Provinces</option>
                {Object.keys(sriLankaDistricts).map(prov => (
                  <option key={prov} value={prov}>{prov}</option>
                ))}
              </select>

              {/* District Select */}
              <select
                className="uber-sidebar-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                aria-label="Filter by District"
              >
                <option value="all">
                  {selectedProvince === 'all' ? 'All Districts' : `All in ${selectedProvince.replace(' Province', '')}`}
                </option>
                {(selectedProvince === 'all'
                  ? Object.values(sriLankaDistricts).flat()
                  : (sriLankaDistricts[selectedProvince] || [])
                ).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Categories Section */}
          <div className="uber-sidebar-section">
            <div className="uber-sidebar-section-title">
              <span>Category</span>
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  className="uber-sidebar-clear-btn"
                  onClick={() => setSelectedCategory('all')}
                  title="Clear category filter"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="uber-cat-list">
              {categoriesData.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`uber-cat-item ${isSelected ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    title={`Filter by ${cat.name}`}
                  >
                    <i className="fa-solid fa-tag" style={{ fontSize: '12px', opacity: isSelected ? 1 : 0.6 }}></i>
                    <span>{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="community-feed-column" id="community-feed">
          {/* Uber Styled Search & Sort Bar with Grid View Mode Switcher */}
          <div className="uber-search-card">
            <div className="uber-search-input-wrap">
              <i className="fa-solid fa-magnifying-glass uber-search-icon"></i>
              <input
                type="text"
                className="uber-search-input"
                placeholder="Search classifieds, tools, services, requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#757575', padding: '4px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="uber-toolbar-actions">
              <select
                className="uber-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">Sort: Newest First</option>
                <option value="popular">Sort: Most Popular</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>

              {/* Grid View Mode Switcher Button Group */}
              <div className="uber-view-mode-group" role="group" aria-label="Card grid view mode">
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'large' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('large')}
                  title="Large Cards"
                >
                  <i className="fa-solid fa-table-cells-large"></i>
                  <span>Large Cards</span>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'small' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('small')}
                  title="Small Cards"
                >
                  <i className="fa-solid fa-grip"></i>
                  <span>Small Cards</span>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('list')}
                  title="List View"
                >
                  <i className="fa-solid fa-list-ul"></i>
                  <span>List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Listings Cards Container */}
          {loading ? (
            <div className="uber-loading-box">
              <div className="uber-spinner-ring"></div>
              <p className="uber-loading-text">Loading community listings...</p>
            </div>
          ) : allCurrentPosts.length === 0 ? (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '4rem 2rem',
              textAlign: 'center',
              border: '1px solid #e5e5e5'
            }}>
              <i className="fa-solid fa-box-open" style={{ fontSize: '3rem', color: '#cccccc', marginBottom: '1rem' }}></i>
              <h3 style={{ fontSize: '1.25rem', color: '#000000', fontWeight: '800', margin: '0 0 0.5rem 0' }}>
                No community listings found
              </h3>
              <p style={{ color: '#666666', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                Try adjusting your search or filters, or post a new ad in the community.
              </p>
              {isLoggedIn && (
                <button
                  type="button"
                  className="uber-btn-primary"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <i className="fa-solid fa-plus"></i> Post New Ad / Request
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Pagination Info Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                fontSize: '0.85rem',
                color: '#757575',
                fontWeight: '600'
              }}>
                <span>
                  Showing {startIndex + 1}–{Math.min(startIndex + CARDS_PER_PAGE, totalPosts)} of {totalPosts} listings
                </span>
                <span>Page {safeCurrentPage} of {totalPages}</span>
              </div>

              <div className={`community-cards-grid view-${viewMode}`}>
                {paginatedPosts.map(post => {
                  const catObj = categoriesData.find(c => c.id === post.category);
                  const isOwner = isPostOwner(post);

                  if (viewMode === 'list') {
                    return (
                      <div
                        key={post.postId}
                        className="uber-post-card uber-card-list"
                        onClick={() => handleCardClick(post)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="uber-list-card-inner">
                          {/* Left: Thumbnail & Badges */}
                          <div className="uber-list-card-media">
                            {post.images && post.images.length > 0 ? (
                              <img
                                src={post.images[0]}
                                alt={post.title}
                                className="uber-list-img"
                                loading="lazy"
                                onError={(e) => {
                                  e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                                }}
                              />
                            ) : (
                              <div className="uber-card-img-placeholder">
                                <i className="fa-solid fa-image"></i>
                              </div>
                            )}

                            {post.images && post.images.length > 1 && (
                              <div className="uber-card-photos-badge">
                                <i className="fa-solid fa-camera"></i>
                                <span>{post.images.length}</span>
                              </div>
                            )}

                            <span className="uber-category-pill uber-list-cat-pill">
                              <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i>
                              <span>{catObj?.name || post.category}</span>
                            </span>
                          </div>

                          {/* Right: Content details */}
                          <div className="uber-list-card-content">
                            <div>
                              <div className="uber-list-header-row">
                                <div className="uber-card-author">
                                  <img
                                    src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`}
                                    alt={post.userName || 'Resident'}
                                    className="uber-card-avatar"
                                    onError={(e) => {
                                      e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`;
                                    }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span className="uber-card-author-name">{post.userName || 'Community Resident'}</span>
                                    <span className="uber-card-time">{formatTimeAgo(post.createdAt)}</span>
                                  </div>
                                </div>

                                <div className="uber-card-location-row" style={{ marginTop: 0 }}>
                                  <i className="fa-solid fa-location-dot" style={{ color: '#000000' }}></i>
                                  <span>{post.location || 'Sri Lanka'}</span>
                                </div>
                              </div>

                              <div className="uber-list-body">
                                <h3 className="uber-card-title">{post.title}</h3>
                                <p className="uber-card-desc">
                                  {post.content || 'Click to view full details, questions, or contact the poster...'}
                                </p>
                              </div>
                            </div>

                            {/* Footer: Stats & Actions */}
                            <div className="uber-card-footer" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                              <div className="uber-card-time-ago">
                                <i className="fa-regular fa-clock" style={{ marginRight: '5px', fontSize: '0.75rem' }}></i>
                                <span>{formatTimeAgo(post.createdAt)}</span>
                                {post.likesCount > 0 && (
                                  <span style={{ marginLeft: '12px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#000000', fontWeight: '700' }} title={`${post.likesCount} stars / likes`}>
                                    <i className="fa-solid fa-star" style={{ color: '#f59e0b', fontSize: '0.75rem' }}></i>
                                    <span>{post.likesCount}</span>
                                  </span>
                                )}
                                {post.commentsCount > 0 && (
                                  <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#555555', fontWeight: '600' }} title={`${post.commentsCount} reviews / questions`}>
                                    <i className="fa-regular fa-comment" style={{ fontSize: '0.75rem' }}></i>
                                    <span>{post.commentsCount}</span>
                                  </span>
                                )}
                              </div>

                              <div className="uber-card-actions" onClick={(e) => e.stopPropagation()}>
                                {isOwner ? (
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      className="uber-icon-btn-edit"
                                      onClick={(e) => handleOpenEdit(post, e)}
                                      title="Edit listing"
                                    >
                                      <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="uber-icon-btn-delete"
                                      onClick={(e) => handleDeletePost(post.postId, e)}
                                      title="Delete listing"
                                    >
                                      <i className="fa-solid fa-trash"></i>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="uber-card-details-btn"
                                    onClick={() => handleCardClick(post)}
                                  >
                                    <span>View Listing</span>
                                    <span style={{ fontSize: '13px' }}>›</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Default / Grid cards (Large or Small)
                  return (
                    <div
                      key={post.postId}
                      className={`uber-post-card ${viewMode === 'small' ? 'uber-card-small' : 'uber-card-large'}`}
                      onClick={() => handleCardClick(post)}
                      role="button"
                      tabIndex={0}
                    >
                      {/* Card Top: Author & Category Pill */}
                      <div className="uber-card-header">
                        <div className="uber-card-author">
                          <img
                            src={post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`}
                            alt={post.userName || 'Resident'}
                            className="uber-card-avatar"
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`;
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span className="uber-card-author-name">{post.userName || 'Community Resident'}</span>
                            <span className="uber-card-time">{formatTimeAgo(post.createdAt)}</span>
                          </div>
                        </div>

                        <span className="uber-category-pill">
                          <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i>
                          <span>{catObj?.name || post.category}</span>
                        </span>
                      </div>

                      {/* Card Image Preview with 16:10 Aspect Ratio */}
                      <div className="uber-card-img-wrap">
                        {post.images && post.images.length > 0 ? (
                          <img
                            src={post.images[0]}
                            alt={post.title}
                            className="uber-card-img"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                            }}
                          />
                        ) : (
                          <div className="uber-card-img-placeholder">
                            <i className="fa-solid fa-image"></i>
                          </div>
                        )}

                        {post.images && post.images.length > 1 && (
                          <div className="uber-card-photos-badge">
                            <i className="fa-solid fa-camera"></i>
                            <span>{post.images.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="uber-card-body">
                        <h3 className="uber-card-title">{post.title}</h3>
                        <p className="uber-card-desc">
                          {post.content || 'Click to view full details, questions, or contact the poster...'}
                        </p>

                        <div className="uber-card-location-row">
                          <i className="fa-solid fa-location-dot" style={{ color: '#000000' }}></i>
                          <span>{post.location || 'Sri Lanka'}</span>
                        </div>
                      </div>

                      {/* Card Footer: Timestamp & Actions */}
                      <div className="uber-card-footer">
                        <div className="uber-card-time-ago">
                          <i className="fa-regular fa-clock" style={{ marginRight: '5px', fontSize: '0.75rem' }}></i>
                          <span>{formatTimeAgo(post.createdAt)}</span>
                          {post.likesCount > 0 && (
                            <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#000000', fontWeight: '700' }} title={`${post.likesCount} stars / likes`}>
                              <i className="fa-solid fa-star" style={{ color: '#f59e0b', fontSize: '0.75rem' }}></i>
                              <span>{post.likesCount}</span>
                            </span>
                          )}
                          {post.commentsCount > 0 && (
                            <span style={{ marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#555555', fontWeight: '600' }} title={`${post.commentsCount} reviews / questions`}>
                              <i className="fa-regular fa-comment" style={{ fontSize: '0.75rem' }}></i>
                              <span>{post.commentsCount}</span>
                            </span>
                          )}
                        </div>

                        <div className="uber-card-actions" onClick={(e) => e.stopPropagation()}>
                          {isOwner ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="uber-icon-btn-edit"
                                onClick={(e) => handleOpenEdit(post, e)}
                                title="Edit listing"
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button
                                type="button"
                                className="uber-icon-btn-delete"
                                onClick={(e) => handleDeletePost(post.postId, e)}
                                title="Delete listing"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="uber-card-details-btn"
                              onClick={() => handleCardClick(post)}
                            >
                              <span>Details</span>
                              <span style={{ fontSize: '13px' }}>›</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Uber-Themed Pagination (9 cards per page) */}
              {totalPages > 1 && (
                <div className="uber-pagination-container">
                  <button
                    type="button"
                    className="uber-pagination-btn"
                    onClick={() => handlePageChange(safeCurrentPage - 1)}
                    disabled={safeCurrentPage === 1}
                    aria-label="Previous Page"
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                    <span>Prev</span>
                  </button>

                  <div className="uber-pagination-pages">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            className={`uber-pagination-num ${safeCurrentPage === pageNum ? 'active' : ''}`}
                            onClick={() => handlePageChange(pageNum)}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === safeCurrentPage - 2 ||
                        pageNum === safeCurrentPage + 2
                      ) {
                        return <span key={pageNum} className="uber-pagination-ellipsis">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    type="button"
                    className="uber-pagination-btn"
                    onClick={() => handlePageChange(safeCurrentPage + 1)}
                    disabled={safeCurrentPage === totalPages}
                    aria-label="Next Page"
                  >
                    <span>Next</span>
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. DETAIL POST MODAL (Uber Clean Minimalist Window) */}
      {selectedPostForDetail && (
        <div className="uber-modal-backdrop" onClick={() => setSelectedPostForDetail(null)}>
          <div className="uber-modal-window uber-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uber-modal-header">
              <div>
                <span className="uber-category-pill" style={{ marginBottom: '6px' }}>
                  {selectedPostForDetail.serviceCategoryName || selectedPostForDetail.category}
                </span>
                <h2 className="uber-modal-title">
                  {selectedPostForDetail.title}
                </h2>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setSelectedPostForDetail(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="uber-modal-body">
              {/* Main Image Gallery */}
              {selectedPostForDetail.images && selectedPostForDetail.images.length > 0 && (
                <div>
                  <img
                    src={selectedGalleryImage || selectedPostForDetail.images[0]}
                    alt={selectedPostForDetail.title}
                    className="uber-detail-gallery-main"
                  />
                  {selectedPostForDetail.images.length > 1 && (
                    <div className="uber-detail-thumbnails" style={{ marginTop: '10px' }}>
                      {selectedPostForDetail.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt="Thumbnail"
                          className={`uber-detail-thumb-img ${selectedGalleryImage === img ? 'active' : ''}`}
                          onClick={() => setSelectedGalleryImage(img)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Location & Posted Date Header (Uber Minimalist) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f6f6f6', padding: '14px 20px', borderRadius: '14px', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-location-dot" style={{ color: '#000000', fontSize: '1.1rem' }}></i>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#666666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Location</span>
                    <span style={{ fontWeight: '700', color: '#000000', fontSize: '0.95rem' }}>
                      {selectedPostForDetail.location || 'Sri Lanka'}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.75rem', color: '#666666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>Posted</span>
                  <span style={{ fontWeight: '600', color: '#555555', fontSize: '0.9rem' }}>
                    {formatTimeAgo(selectedPostForDetail.createdAt)}
                  </span>
                </div>
              </div>

              {/* Poster Info Card */}
              <div className="uber-poster-card">
                <div className="uber-poster-left">
                  <img
                    src={selectedPostForDetail.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPostForDetail.postId}`}
                    alt={selectedPostForDetail.userName}
                    className="uber-poster-avatar"
                  />
                  <div>
                    <div className="uber-poster-name">
                      {selectedPostForDetail.userName}
                    </div>
                    <div className="uber-poster-email">
                      Posted {formatTimeAgo(selectedPostForDetail.createdAt)}
                    </div>
                  </div>
                </div>

                {activeRole === 'Worker' && (
                  <button
                    type="button"
                    className="uber-btn-primary"
                    onClick={() => handleOpenChat(selectedPostForDetail)}
                  >
                    <i className="fa-solid fa-comment-dots"></i>
                    <span>Chat / Contact</span>
                  </button>
                )}
              </div>

              {/* Description */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</h4>
                <p style={{ fontSize: '0.95rem', color: '#262626', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                  {selectedPostForDetail.content}
                </p>
              </div>

              {/* Actions & Report Bar */}
              <div className="uber-detail-actions">
                {isLoggedIn ? (
                  <button
                    type="button"
                    className={selectedPostForDetail.isLiked ? "uber-btn-primary" : "uber-btn-secondary"}
                    onClick={(e) => handleLike(selectedPostForDetail.postId, e)}
                  >
                    <i className="fa-solid fa-thumbs-up"></i>
                    <span>Interested ({selectedPostForDetail.likesCount || 0})</span>
                  </button>
                ) : (
                  <div className="uber-btn-secondary" style={{ cursor: 'default' }}>
                    <i className="fa-solid fa-thumbs-up"></i>
                    <span>{selectedPostForDetail.likesCount || 0} Interested</span>
                  </div>
                )}

                {isPostOwner(selectedPostForDetail) && (
                  <>
                    <button
                      type="button"
                      className="uber-btn-outline"
                      onClick={(e) => { setSelectedPostForDetail(null); handleOpenEdit(selectedPostForDetail, e); }}
                    >
                      <i className="fa-solid fa-pen"></i> Edit Post
                    </button>
                    <button
                      type="button"
                      className="uber-btn-secondary"
                      onClick={(e) => handleDeletePost(selectedPostForDetail.postId, e)}
                      style={{ color: '#ef4444' }}
                    >
                      <i className="fa-solid fa-trash"></i> Delete Post
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setReportingPostId(selectedPostForDetail.postId)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#757575',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-flag"></i> Report
                </button>
              </div>

              {/* Comments Thread Section */}
              <div style={{ borderTop: '1px solid #eeeeee', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '800', color: '#000000' }}>
                  Comments & Inquiries ({selectedPostForDetail.commentsCount || (commentsMap[selectedPostForDetail.postId] || []).length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                  {(commentsMap[selectedPostForDetail.postId] || []).length === 0 ? (
                    <p style={{ color: '#757575', fontSize: '0.875rem' }}>No comments yet. Ask a question or express interest!</p>
                  ) : (
                    (commentsMap[selectedPostForDetail.postId] || []).map(comment => (
                      <div key={comment.commentId} style={{ backgroundColor: '#f6f6f6', padding: '12px 14px', borderRadius: '10px', border: '1px solid #eeeeee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.875rem', color: '#000000' }}>
                            {comment.userName}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#757575' }}>
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#262626' }}>
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                {isLoggedIn && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="uber-input"
                      placeholder="Write a message or question..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedPostForDetail.postId)}
                    />
                    <button
                      type="button"
                      className="uber-btn-primary"
                      onClick={() => handleAddComment(selectedPostForDetail.postId)}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. EDIT POST MODAL (Uber Theme) */}
      {editingPost && (
        <div className="uber-modal-backdrop" onClick={() => setEditingPost(null)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="uber-modal-header">
              <div>
                <h2 className="uber-modal-title">Edit Community Post</h2>
                <p className="uber-modal-subtitle">Update your listing details, location, and photos</p>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setEditingPost(null)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="uber-modal-body">
                <div className="uber-field-group">
                  <label className="uber-field-label">Ad Title *</label>
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
                    className="uber-btn-outline"
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    Change Photos
                  </button>
                </div>
              </div>

              <div className="uber-modal-footer">
                <button
                  type="button"
                  className="uber-btn-secondary"
                  onClick={() => setEditingPost(null)}
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="uber-btn-primary"
                  disabled={isSubmittingEdit}
                  style={{ minWidth: '130px', justifyContent: 'center' }}
                >
                  {isSubmittingEdit ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. CREATE POST MODAL (Uber Theme - Black, White & Gray, Corner Radius Buttons) */}
      {isCreateModalOpen && (
        <div className="uber-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="uber-modal-header">
              <div>
                <h2 className="uber-modal-title">Post Classified Ad or Request</h2>
                <p className="uber-modal-subtitle">Share your requirement or item with the neighborhood community</p>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="uber-modal-body">
              {/* Ad Title */}
              <div className="uber-field-group">
                <label className="uber-field-label">Ad Title *</label>
                <input
                  type="text"
                  className="uber-input"
                  placeholder="e.g. Dell P2719H 27-inch IPS Monitor or Urgent AC Servicing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              {/* Service Category */}
              <div className="uber-field-group">
                <label className="uber-field-label">Service Category *</label>
                <select
                  className="uber-select"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  {categoriesData.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Province and District Row (Two Dedicated Fields) */}
              <div className="uber-form-row">
                <div className="uber-field-group">
                  <label className="uber-field-label">Province *</label>
                  <select
                    className="uber-select"
                    value={newProvince}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setNewProvince(prov);
                      const firstDist = (sriLankaDistricts[prov] && sriLankaDistricts[prov][0]) || 'Colombo';
                      setNewDistrict(firstDist);
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
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                  >
                    {(sriLankaDistricts[newProvince] || Object.values(sriLankaDistricts)[0] || []).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description Textarea */}
              <div className="uber-field-group">
                <label className="uber-field-label">Description *</label>
                <textarea
                  className="uber-textarea"
                  rows={4}
                  placeholder="Describe your item, specification, warranty, or service request details..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
              </div>

              {/* Attach Photos Box */}
              <div className="uber-upload-box">
                <div className="uber-upload-info">
                  <i className="fa-solid fa-camera uber-upload-icon"></i>
                  <div>
                    <div className="uber-upload-title">
                      Attach Photos {newImages.length > 0 && <span className="uber-upload-count">({newImages.length} attached)</span>}
                    </div>
                    <div className="uber-upload-desc">Supports multiple photos (JPG, PNG, WEBP)</div>
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
                <button
                  type="button"
                  className="uber-btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  Choose Photos
                </button>
              </div>

              {/* Photo Previews */}
              {newImages.length > 0 && (
                <div className="uber-image-preview-row">
                  {newImages.map((img, idx) => (
                    <div key={idx} className="uber-image-preview-thumb">
                      <img src={img} alt={`Upload ${idx}`} />
                      <button
                        type="button"
                        className="uber-thumb-remove-btn"
                        onClick={() => setNewImages(prev => prev.filter((_, i) => i !== idx))}
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer (Corner Radius Buttons) */}
            <div className="uber-modal-footer">
              <button
                type="button"
                className="uber-btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={isSubmittingPost}
              >
                Cancel
              </button>
              <button
                type="button"
                className="uber-btn-primary"
                onClick={handleCreatePost}
                disabled={isSubmittingPost}
                style={{ minWidth: '130px', justifyContent: 'center' }}
              >
                {isSubmittingPost ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                    Publishing...
                  </>
                ) : (
                  'Publish Ad'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. REPORT POST MODAL (Uber Theme) */}
      {reportingPostId && (
        <div className="uber-modal-backdrop" onClick={() => setReportingPostId(null)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="uber-modal-header">
              <div>
                <h3 className="uber-modal-title">Report Listing</h3>
                <p className="uber-modal-subtitle">Why are you reporting this ad or post for moderation?</p>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setReportingPostId(null)}
              >
                ✕
              </button>
            </div>

            <div className="uber-modal-body">
              <textarea
                className="uber-textarea"
                placeholder="e.g. Inappropriate content, spam, incorrect price, or misleading seller info"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="uber-modal-footer">
              <button
                type="button"
                className="uber-btn-secondary"
                onClick={() => setReportingPostId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="uber-btn-primary"
                onClick={handleReportSubmit}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
              >
                Submit Report
              </button>
            </div>
          </div>
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


      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
