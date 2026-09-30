import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import '../Community.css';
import './MyCommunityPostsManager.css';
import categoriesData from '../data/categories.json';
import sriLankaDistricts from '../data/sriLankaDistricts.json';
import { API_BASE_URL } from '../config.js';
import Loader from './Loader.jsx';

export default function MyCommunityPostsManager({
  userEmail: propEmail,
  userName: propName,
  userPicture: propPicture,
  role = 'Resident'
}) {
  const userEmail = propEmail || localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const userName = propName || localStorage.getItem('userName') || (userEmail ? userEmail.split('@')[0] : 'User');
  const userPicture = propPicture || localStorage.getItem('userPicture');
  const token = localStorage.getItem('token');

  // Posts State
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter State (Identical to Community page)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('community_view_mode') || 'large';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('community_view_mode', mode);
  };

  // Modals State
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit Modal State
  const [editingPost, setEditingPost] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editProvince, setEditProvince] = useState('Western Province');
  const [editDistrict, setEditDistrict] = useState('Colombo');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('plumbing');
  const [createProvince, setCreateProvince] = useState('Western Province');
  const [createDistrict, setCreateDistrict] = useState('Colombo');
  const [createImages, setCreateImages] = useState([]);
  const fileInputRef = useRef(null);

  // Time formatter matching Community.jsx
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

  const getCategoryName = (post) => {
    if (!post) return 'General';
    const cat = categoriesData.find(c => c.id === post.serviceCategoryId || c.id === post.category);
    return cat ? cat.name : (post.serviceCategoryName || post.category || 'General');
  };

  // Fetch only this user's posts
  const fetchMyPosts = async () => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/community-posts/user/${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPosts(res.data || []);
    } catch (err) {
      console.error('Failed to load user community posts:', err);
      // Fallback: fetch all and filter by user identifier
      try {
        const fallbackRes = await axios.get(`${API_BASE_URL}/community-posts`);
        if (fallbackRes.data) {
          const lower = userEmail.toLowerCase();
          const prefix = lower.split('@')[0];
          const filtered = fallbackRes.data.filter(p => {
            const pUser = (p.userId || p.userEmail || '').toLowerCase();
            const pName = (p.userName || '').toLowerCase();
            return pUser === lower || pUser === prefix || pName.includes(prefix);
          });
          setPosts(filtered);
        }
      } catch (fallbackErr) {
        setError('Could not load community posts. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [userEmail]);

  // Fetch comments for detail view
  const fetchComments = async (postId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/community-posts/${postId}/comments`);
      setCommentsMap(prev => ({ ...prev, [postId]: res.data || [] }));
    } catch (e) {
      console.error('Failed to fetch comments', e);
    }
  };

  // Filtered & Sorted Posts Computation
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // 1. Search query (title, content, location, category)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = post.title?.toLowerCase().includes(query);
        const contentMatch = post.content?.toLowerCase().includes(query);
        const locMatch = post.location?.toLowerCase().includes(query);
        const catMatch = post.serviceCategoryName?.toLowerCase().includes(query) || post.serviceCategoryId?.toLowerCase().includes(query);
        if (!titleMatch && !contentMatch && !locMatch && !catMatch) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'all') {
        const catId = post.serviceCategoryId?.toLowerCase() || '';
        const catName = post.serviceCategoryName?.toLowerCase() || '';
        const target = selectedCategory.toLowerCase();
        if (catId !== target && !catName.includes(target)) return false;
      }

      // 3. Province Filter
      if (selectedProvince !== 'all') {
        const loc = post.location?.toLowerCase() || '';
        if (!loc.includes(selectedProvince.toLowerCase())) return false;
      }

      // 4. District Filter
      if (selectedDistrict !== 'all') {
        const loc = post.location?.toLowerCase() || '';
        if (!loc.includes(selectedDistrict.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'most_liked') return (b.likesCount || 0) - (a.likesCount || 0);
      if (sortBy === 'most_commented') return (b.commentsCount || 0) - (a.commentsCount || 0);
      return 0;
    });
  }, [posts, searchTerm, selectedCategory, selectedProvince, selectedDistrict, sortBy]);

  // Overall Stats
  const totalLikes = useMemo(() => posts.reduce((acc, p) => acc + (p.likesCount || 0), 0), [posts]);
  const totalComments = useMemo(() => posts.reduce((acc, p) => acc + (p.commentsCount || 0), 0), [posts]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedProvince('all');
    setSelectedDistrict('all');
    setSortBy('newest');
  };

  const isFilterActive = searchTerm || selectedCategory !== 'all' || selectedProvince !== 'all' || selectedDistrict !== 'all' || sortBy !== 'newest';

  // Available districts based on selected province
  const availableDistricts = useMemo(() => {
    if (selectedProvince !== 'all' && sriLankaDistricts[selectedProvince]) {
      return sriLankaDistricts[selectedProvince];
    }
    return Object.values(sriLankaDistricts).flat();
  }, [selectedProvince]);

  // Available districts for create/edit modals
  const createAvailableDistricts = useMemo(() => {
    return sriLankaDistricts[createProvince] || [];
  }, [createProvince]);

  const editAvailableDistricts = useMemo(() => {
    return sriLankaDistricts[editProvince] || [];
  }, [editProvince]);

  // --- ACTIONS: CREATE ---
  const handleCreateImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCreateImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!createTitle.trim() || !createContent.trim()) {
      alert('Title and content are required.');
      return;
    }

    try {
      setIsCreatingPost(true);
      await axios.post(`${API_BASE_URL}/community-posts`, {
        title: createTitle,
        content: createContent,
        serviceCategoryId: createCategory,
        location: `${createDistrict}, ${createProvince}`,
        images: createImages,
        userName: userName,
        userAvatar: userPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail || 'workio')}`,
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateProvince('Western Province');
      setCreateDistrict('Colombo');
      setCreateImages([]);
      await fetchMyPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      alert(err.response?.data?.message || 'Failed to publish post.');
    } finally {
      setIsCreatingPost(false);
    }
  };

  // --- ACTIONS: EDIT ---
  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditContent(post.content || '');
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

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    try {
      setIsSavingEdit(true);
      await axios.put(`${API_BASE_URL}/community-posts/${editingPost.postId}`, {
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

      setEditingPost(null);
      await fetchMyPosts();
    } catch (err) {
      console.error('Error updating post:', err);
      alert(err.response?.data?.message || 'Failed to update post.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- ACTIONS: DELETE ---
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to permanently delete this community post?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/community-posts/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: {
          requesterEmail: userEmail,
          requesterName: userName
        }
      });
      setPosts(prev => prev.filter(p => p.postId !== postId));
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      alert(err.response?.data?.message || 'Failed to delete post.');
    }
  };

  // --- ACTIONS: COMMENTS ---
  const handleOpenDetail = (post) => {
    setSelectedPostForDetail(post);
    setSelectedGalleryImage(post.images && post.images.length > 0 ? post.images[0] : null);
    fetchComments(post.postId);
  };

  const handleAddComment = async (postId) => {
    if (!newCommentText.trim()) return;
    try {
      setSubmittingComment(true);
      const res = await axios.post(`${API_BASE_URL}/community-posts/${postId}/comments`, {
        content: newCommentText,
        userName: userName,
        userAvatar: userPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userEmail || 'commenter')}`
      });
      if (res.data) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.data]
        }));
        setNewCommentText('');
        // Update local comment count
        setPosts(prev => prev.map(p => p.postId === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      }
    } catch (e) {
      console.error('Failed to submit comment:', e);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
        <Loader />
        <p style={{ color: '#757575', fontSize: '0.95rem', fontWeight: 600 }}>Loading your community posts...</p>
      </div>
    );
  }

  return (
    <div className="community-posts-theme-container">
      {/* 1. Community Hero Showcase Banner (Uber Pitch Black Aesthetic) */}
      <div className="community-hero-banner" style={{ borderRadius: '20px', padding: '36px 32px', marginBottom: '24px' }}>
        <div className="community-hero-container" style={{ maxWidth: '100%' }}>
          <div className="community-hero-left">
            <span className="community-hero-overline">Author Dashboard • Community Inquiries</span>
            <h1 className="community-hero-title" style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', marginBottom: '12px' }}>
              My Community Posts
            </h1>
            <p className="community-hero-desc" style={{ marginBottom: '22px', fontSize: '0.96rem', maxWidth: '640px' }}>
              Search, filter, view, edit, and manage all your community inquiries, service requests, and project discussions in real-time.
            </p>

            <div className="community-hero-actions">
              <button
                type="button"
                className="community-hero-primary-btn"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <i className="fa-solid fa-plus"></i>
                <span>Make New Post</span>
              </button>

              <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '8px 16px', borderRadius: '9999px', fontSize: '0.84rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span>Authored Posts:</span>
                  <strong style={{ color: '#ffffff' }}>{posts.length}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '8px 16px', borderRadius: '9999px', fontSize: '0.84rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span>❤️ Total Likes:</span>
                  <strong style={{ color: '#ffffff' }}>{totalLikes}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', padding: '8px 16px', borderRadius: '9999px', fontSize: '0.84rem', fontWeight: 600, border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span>💬 Discussions:</span>
                  <strong style={{ color: '#ffffff' }}>{totalComments}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Search & Filter Bar (Matching Community Page) */}
      <div className="uber-search-card" style={{ marginBottom: '24px' }}>
        {/* Search Input Box */}
        <div className="uber-search-input-wrap" style={{ flex: '1 1 300px' }}>
          <i className="fa-solid fa-magnifying-glass uber-search-icon"></i>
          <input
            type="text"
            className="uber-search-input"
            placeholder="Search your posts by title, description, trade, or district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{ background: 'none', border: 'none', color: '#757575', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Toolbar Filter Dropdowns & View Mode Switcher */}
        <div className="uber-toolbar-actions" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {/* Category Dropdown */}
          <select
            className="uber-sort-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by Service Category"
          >
            <option value="all">All Categories ({posts.length})</option>
            {categoriesData.map(cat => {
              const count = posts.filter(p => p.serviceCategoryId?.toLowerCase() === cat.id.toLowerCase() || p.serviceCategoryName?.toLowerCase().includes(cat.name.toLowerCase())).length;
              return (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {count > 0 ? `(${count})` : ''}
                </option>
              );
            })}
          </select>

          {/* Sri Lanka Province Dropdown */}
          <select
            className="uber-sort-select"
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

          {/* Sri Lanka District Dropdown */}
          <select
            className="uber-sort-select"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            aria-label="Filter by District"
          >
            <option value="all">All Districts</option>
            {availableDistricts.map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            className="uber-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort Posts"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_liked">Most Liked</option>
            <option value="most_commented">Most Comments</option>
          </select>

          {/* View Mode Switcher Pill Group (Icon Only) */}
          <div className="uber-view-mode-group">
            <button
              type="button"
              className={`uber-view-mode-btn ${viewMode === 'large' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('large')}
              title="Large Grid View"
            >
              <i className="fa-solid fa-table-cells-large"></i>
            </button>
            <button
              type="button"
              className={`uber-view-mode-btn ${viewMode === 'small' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('small')}
              title="Compact Grid View"
            >
              <i className="fa-solid fa-border-all"></i>
            </button>
            <button
              type="button"
              className={`uber-view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => handleViewModeChange('list')}
              title="List View"
            >
              <i className="fa-solid fa-list"></i>
            </button>
          </div>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              className="uber-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={handleResetFilters}
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Status Note */}
      {isFilterActive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e5e5e5', marginBottom: '20px', fontSize: '0.88rem' }}>
          <span style={{ color: '#555555' }}>
            Showing <strong>{filteredPosts.length}</strong> of <strong>{posts.length}</strong> posts matching active filters
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{ background: 'none', border: 'none', color: '#000000', fontWeight: '700', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            Clear All
          </button>
        </div>
      )}

      {/* 3. Posts Listing (Empty or Cards Grid) */}
      {filteredPosts.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '20px', padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f6f6f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: '#757575' }}>
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#000000', margin: 0 }}>
            {posts.length === 0 ? "You haven't posted in the community yet" : "No community posts match your criteria"}
          </h3>
          <p style={{ color: '#757575', fontSize: '0.925rem', maxWidth: '460px', margin: 0 }}>
            {posts.length === 0
              ? "Share a home repair problem, project question, or classified inquiry with residents and verified workers in your neighborhood."
              : "Try adjusting your search terms, changing the category, or resetting the location filters."}
          </p>
          <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
            {posts.length === 0 ? (
              <button
                type="button"
                className="uber-btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <i className="fa-solid fa-plus"></i>
                <span>Publish Your First Post</span>
              </button>
            ) : (
              <button
                type="button"
                className="uber-btn-secondary"
                onClick={handleResetFilters}
              >
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={`community-cards-grid view-${viewMode}`}>
          {filteredPosts.map(post => {
            // LIST VIEW CARD
            if (viewMode === 'list') {
              return (
                <div
                  key={post.postId}
                  className="uber-post-card uber-card-list"
                  onClick={() => handleOpenDetail(post)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="uber-list-card-inner">
                    {/* Media thumbnail */}
                    <div className="uber-list-card-media">
                      {post.images && post.images.length > 0 ? (
                        <img
                          src={post.images[0]}
                          alt={post.title}
                          className="uber-list-img"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                          }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f6f6' }}>
                          <i className="fa-solid fa-image" style={{ fontSize: '2rem', color: '#a3a3a3' }}></i>
                        </div>
                      )}
                      <span className="uber-category-pill uber-list-cat-pill">
                        <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i>
                        <span>{getCategoryName(post)}</span>
                      </span>
                    </div>

                    {/* Content */}
                    <div className="uber-list-card-content">
                      <div>
                        <div className="uber-list-header-row">
                          <div className="uber-card-author">
                            <img
                              src={userPicture || post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`}
                              alt={post.userName || userName}
                              className="uber-card-avatar"
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className="uber-card-author-name">{userName || post.userName || 'You'}</span>
                              <span className="uber-card-time">{formatTimeAgo(post.createdAt)}</span>
                            </div>
                          </div>

                          <div className="uber-card-location-row" style={{ margin: 0 }}>
                            <i className="fa-solid fa-location-dot" style={{ color: '#000000' }}></i>
                            <span>{post.location || 'Sri Lanka'}</span>
                          </div>
                        </div>

                        <div className="uber-list-body">
                          <h3 className="uber-card-title">{post.title}</h3>
                          <p className="uber-card-desc">{post.content}</p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="uber-card-footer" onClick={(e) => e.stopPropagation()}>
                        <div className="uber-card-stats-wrap">
                          <span className="uber-card-time-text">
                            <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>
                            {formatTimeAgo(post.createdAt)}
                          </span>

                          <div className="uber-card-counters">
                            <span className="uber-card-counter-item">
                              <i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i>
                              <span>{post.likesCount || 0}</span>
                            </span>
                            <span className="uber-card-counter-item">
                              <i className="fa-regular fa-comment"></i>
                              <span>{post.commentsCount || 0}</span>
                            </span>
                          </div>
                        </div>

                        <div className="uber-card-actions">
                          <button
                            type="button"
                            className="uber-icon-btn-edit"
                            onClick={() => handleOpenEdit(post)}
                            title="Edit listing"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button
                            type="button"
                            className="uber-icon-btn-delete"
                            onClick={() => handleDeletePost(post.postId)}
                            title="Delete listing"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                          <button
                            type="button"
                            className="uber-card-details-btn"
                            onClick={() => handleOpenDetail(post)}
                          >
                            <span>View Details</span>
                            <span style={{ fontSize: '13px' }}>›</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // GRID CARDS (Large or Small)
            return (
              <div
                key={post.postId}
                className={`uber-post-card ${viewMode === 'small' ? 'uber-card-small' : 'uber-card-large'}`}
                onClick={() => handleOpenDetail(post)}
                role="button"
                tabIndex={0}
              >
                {/* Card Top: Author & Category Pill */}
                <div className="uber-card-header">
                  <div className="uber-card-author">
                    <img
                      src={userPicture || post.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`}
                      alt={userName || post.userName || 'You'}
                      className="uber-card-avatar"
                      onError={(e) => {
                        e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.postId}`;
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span className="uber-card-author-name">{userName || post.userName || 'You'}</span>
                      <span className="uber-card-time">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                  </div>

                  <span className="uber-category-pill">
                    <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i>
                    <span>{getCategoryName(post)}</span>
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
                    {post.content || 'Click to view full details, questions, or manage your post...'}
                  </p>

                  <div className="uber-card-location-row">
                    <i className="fa-solid fa-location-dot" style={{ color: '#000000' }}></i>
                    <span>{post.location || 'Sri Lanka'}</span>
                  </div>
                </div>

                {/* Card Footer: Timestamp & Actions */}
                <div className="uber-card-footer" onClick={(e) => e.stopPropagation()}>
                  <div className="uber-card-stats-wrap">
                    <span className="uber-card-time-text">
                      <i className="fa-regular fa-clock" style={{ marginRight: '4px' }}></i>
                      {formatTimeAgo(post.createdAt)}
                    </span>

                    <div className="uber-card-counters">
                      <span className="uber-card-counter-item">
                        <i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i>
                        <span>{post.likesCount || 0}</span>
                      </span>
                      <span className="uber-card-counter-item">
                        <i className="fa-regular fa-comment"></i>
                        <span>{post.commentsCount || 0}</span>
                      </span>
                    </div>
                  </div>

                  <div className="uber-card-actions">
                    <button
                      type="button"
                      className="uber-icon-btn-edit"
                      onClick={() => handleOpenEdit(post)}
                      title="Edit listing"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      type="button"
                      className="uber-icon-btn-delete"
                      onClick={() => handleDeletePost(post.postId)}
                      title="Delete listing"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                    <button
                      type="button"
                      className="uber-card-details-btn"
                      onClick={() => handleOpenDetail(post)}
                    >
                      <span>View Details</span>
                      <span style={{ fontSize: '13px' }}>›</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. DETAIL MODAL (Uber Community Style) */}
      {selectedPostForDetail && (
        <div className="uber-modal-backdrop" onClick={() => setSelectedPostForDetail(null)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="uber-modal-header">
              <div>
                <h3 className="uber-modal-title">{selectedPostForDetail.title}</h3>
                <span className="uber-category-pill" style={{ marginTop: '6px' }}>
                  <i className="fa-solid fa-tag" style={{ fontSize: '11px' }}></i>
                  {getCategoryName(selectedPostForDetail)}
                </span>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setSelectedPostForDetail(null)}
              >
                ✕
              </button>
            </div>

            <div className="uber-modal-body">
              {/* Image Gallery */}
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

              {/* Location & Posted Date */}
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

              {/* Poster info */}
              <div className="uber-poster-card">
                <div className="uber-poster-left">
                  <img
                    src={userPicture || selectedPostForDetail.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedPostForDetail.postId}`}
                    alt={userName || selectedPostForDetail.userName || 'Author'}
                    className="uber-poster-avatar"
                  />
                  <div>
                    <div className="uber-poster-name">
                      {userName || selectedPostForDetail.userName || 'You'} (Author)
                    </div>
                    <div className="uber-poster-email">
                      {userEmail || selectedPostForDetail.userEmail}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</h4>
                <p style={{ fontSize: '0.95rem', color: '#262626', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-line' }}>
                  {selectedPostForDetail.content}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="uber-detail-actions">
                <div className="uber-btn-secondary" style={{ cursor: 'default' }}>
                  <i className="fa-solid fa-heart" style={{ color: '#ef4444' }}></i>
                  <span>{selectedPostForDetail.likesCount || 0} Likes</span>
                </div>

                <button
                  type="button"
                  className="uber-btn-outline"
                  onClick={() => {
                    const post = selectedPostForDetail;
                    setSelectedPostForDetail(null);
                    handleOpenEdit(post);
                  }}
                >
                  <i className="fa-solid fa-pen"></i>
                  <span>Edit Post</span>
                </button>

                <button
                  type="button"
                  className="uber-btn-secondary"
                  onClick={() => handleDeletePost(selectedPostForDetail.postId)}
                  style={{ color: '#ef4444' }}
                >
                  <i className="fa-solid fa-trash"></i>
                  <span>Delete Post</span>
                </button>
              </div>

              {/* Comments Thread Section */}
              <div style={{ borderTop: '1px solid #eeeeee', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: '800', color: '#000000' }}>
                  Comments & Inquiries ({selectedPostForDetail.commentsCount || (commentsMap[selectedPostForDetail.postId] || []).length})
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
                  {(commentsMap[selectedPostForDetail.postId] || []).length === 0 ? (
                    <p style={{ color: '#757575', fontSize: '0.875rem' }}>No comments or replies yet on this post.</p>
                  ) : (
                    (commentsMap[selectedPostForDetail.postId] || []).map(comment => (
                      <div key={comment.commentId} style={{ backgroundColor: '#f6f6f6', padding: '12px 14px', borderRadius: '10px', border: '1px solid #eeeeee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#000000' }}>
                            {comment.userName || 'Community Member'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#888888' }}>
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#333333', lineHeight: '1.4' }}>
                          {comment.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddComment(selectedPostForDetail.postId);
                  }}
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <input
                    type="text"
                    className="uber-input"
                    placeholder="Write a reply or answer an inquiry..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="uber-btn-primary"
                    disabled={submittingComment || !newCommentText.trim()}
                  >
                    <span>{submittingComment ? 'Sending...' : 'Reply'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. EDIT MODAL (Uber Community Style) */}
      {editingPost && (
        <div className="uber-modal-backdrop" onClick={() => setEditingPost(null)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="uber-modal-header">
              <div>
                <h3 className="uber-modal-title">Edit Community Post</h3>
                <p className="uber-modal-subtitle">Update your community listing details, categories, or photos.</p>
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
                  <label className="uber-field-label">Post Title *</label>
                  <input
                    type="text"
                    className="uber-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="E.g., Need emergency plumbing repair for kitchen pipe"
                    required
                  />
                </div>

                <div className="uber-form-row">
                  <div className="uber-field-group">
                    <label className="uber-field-label">Service Category *</label>
                    <select
                      className="uber-select"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                    >
                      {categoriesData.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="uber-field-group">
                    <label className="uber-field-label">Province *</label>
                    <select
                      className="uber-select"
                      value={editProvince}
                      onChange={(e) => {
                        const newP = e.target.value;
                        setEditProvince(newP);
                        setEditDistrict(sriLankaDistricts[newP]?.[0] || 'Colombo');
                      }}
                    >
                      {Object.keys(sriLankaDistricts).map(p => (
                        <option key={p} value={p}>{p}</option>
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
                      {editAvailableDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="uber-field-group">
                  <label className="uber-field-label">Description / Post Content *</label>
                  <textarea
                    className="uber-textarea"
                    rows={5}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Provide full details, required tools, urgency, or context..."
                    required
                  />
                </div>

                {/* Image Attachments */}
                <div className="uber-field-group">
                  <label className="uber-field-label">
                    <span>Attached Photos ({editImages.length})</span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {editImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
                        <img src={img} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))}
                          style={{
                            position: 'absolute', top: '2px', right: '2px',
                            background: 'rgba(0,0,0,0.7)', color: '#ffffff',
                            border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '11px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="uber-btn-secondary"
                      onClick={() => editFileInputRef.current?.click()}
                      style={{ height: '80px', width: '80px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', padding: 0 }}
                    >
                      <i className="fa-solid fa-camera"></i>
                      <span style={{ fontSize: '0.72rem' }}>Add Photo</span>
                    </button>

                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleEditImageUpload}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #eeeeee', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="uber-btn-secondary"
                    onClick={() => setEditingPost(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="uber-btn-primary"
                    disabled={isSavingEdit}
                  >
                    <span>{isSavingEdit ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. CREATE POST MODAL (Uber Community Style) */}
      {isCreateModalOpen && (
        <div className="uber-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="uber-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="uber-modal-header">
              <div>
                <h3 className="uber-modal-title">Create Community Post</h3>
                <p className="uber-modal-subtitle">Share an inquiry, job opportunity, or repair question with the community.</p>
              </div>
              <button
                type="button"
                className="uber-modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePost}>
              <div className="uber-modal-body">
                <div className="uber-field-group">
                  <label className="uber-field-label">Post Title *</label>
                  <input
                    type="text"
                    className="uber-input"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="E.g., Seeking certified electrician for distribution box upgrade"
                    required
                  />
                </div>

                <div className="uber-form-row">
                  <div className="uber-field-group">
                    <label className="uber-field-label">Service Category *</label>
                    <select
                      className="uber-select"
                      value={createCategory}
                      onChange={(e) => setCreateCategory(e.target.value)}
                    >
                      {categoriesData.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="uber-field-group">
                    <label className="uber-field-label">Province *</label>
                    <select
                      className="uber-select"
                      value={createProvince}
                      onChange={(e) => {
                        const newP = e.target.value;
                        setCreateProvince(newP);
                        setCreateDistrict(sriLankaDistricts[newP]?.[0] || 'Colombo');
                      }}
                    >
                      {Object.keys(sriLankaDistricts).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div className="uber-field-group">
                    <label className="uber-field-label">District *</label>
                    <select
                      className="uber-select"
                      value={createDistrict}
                      onChange={(e) => setCreateDistrict(e.target.value)}
                    >
                      {createAvailableDistricts.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="uber-field-group">
                  <label className="uber-field-label">Post Details & Description *</label>
                  <textarea
                    className="uber-textarea"
                    rows={5}
                    value={createContent}
                    onChange={(e) => setCreateContent(e.target.value)}
                    placeholder="Describe your inquiry, specific issues, location access, or questions..."
                    required
                  />
                </div>

                {/* Upload Photos */}
                <div className="uber-field-group">
                  <label className="uber-field-label">
                    <span>Photos ({createImages.length})</span>
                  </label>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {createImages.map((img, i) => (
                      <div key={i} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
                        <img src={img} alt="Upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => setCreateImages(prev => prev.filter((_, idx) => idx !== i))}
                          style={{
                            position: 'absolute', top: '2px', right: '2px',
                            background: 'rgba(0,0,0,0.7)', color: '#ffffff',
                            border: 'none', borderRadius: '50%', width: '20px', height: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', fontSize: '11px'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="uber-btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ height: '80px', width: '80px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px', padding: 0 }}
                    >
                      <i className="fa-solid fa-camera"></i>
                      <span style={{ fontSize: '0.72rem' }}>Add Photo</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleCreateImageUpload}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #eeeeee', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="uber-btn-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="uber-btn-primary"
                    disabled={isCreatingPost}
                  >
                    <span>{isCreatingPost ? 'Publishing...' : 'Publish Post'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
