import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import categoriesData from './data/categories.json';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/textfield/filled-text-field.js';

export default function ResidentProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'overview');
  
  const [profile, setProfile] = useState({
    name: '',
    phoneNo: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Worker status state
  const [isWorker, setIsWorker] = useState(false);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [checkingWorker, setCheckingWorker] = useState(true);

  // Become worker form state
  const [workerForm, setWorkerForm] = useState({
    description: '',
    primaryServiceArea: '',
    coverageRadiusKm: 10,
    pricingModel: 'Hourly',
    hourlyRate: '',
    dailyRate: '',
    skills: [{ skillName: '', experienceYears: 1 }]
  });
  const [submittingWorker, setSubmittingWorker] = useState(false);
  const [workerError, setWorkerError] = useState(null);

  // Post management & modal states
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  const [editingPost, setEditingPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editLocation, setEditLocation] = useState('Colombo 05');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('plumbing');
  const [createLocation, setCreateLocation] = useState('Colombo 05');
  const [createImages, setCreateImages] = useState([]);
  const fileInputRef = useRef(null);

  let userEmail = localStorage.getItem('email');
  const token = localStorage.getItem('token');
  const userPicture = localStorage.getItem('userPicture');
  const userName = localStorage.getItem('userName');

  // Fallback: Extract email from JWT if it wasn't saved to local storage
  if (!userEmail && token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      userEmail = payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      if (userEmail) localStorage.setItem('email', userEmail);
    } catch (e) {
      console.error("Could not parse JWT to find email.", e);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
    localStorage.removeItem('activeRole');
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`http://localhost:5237/api/residents/${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        
        setProfile({
          name: response.data.name || '',
          phoneNo: response.data.phoneNo || '',
          address: response.data.address || ''
        });
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (userEmail) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [userEmail, token]);

  // Check if current user is already a worker
  useEffect(() => {
    const checkWorkerStatus = async () => {
      if (!userEmail) return;
      try {
        const res = await axios.get(`http://localhost:5237/api/workers/me?email=${encodeURIComponent(userEmail)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.worker) {
          setIsWorker(true);
          setWorkerProfile(res.data.worker);
        }
      } catch (err) {
        setIsWorker(false);
        setWorkerProfile(null);
      } finally {
        setCheckingWorker(false);
      }
    };
    checkWorkerStatus();
  }, [userEmail, token]);

  const fetchUserPosts = async () => {
    if (!userEmail) return;
    setLoadingPosts(true);
    try {
      const res = await axios.get(`http://localhost:5237/api/community-posts/user/${encodeURIComponent(userEmail)}`);
      setUserPosts(res.data || []);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchUserPosts();
    }
  }, [activeTab, userEmail]);

  // Skill management handlers
  const handleAddSkill = () => {
    setWorkerForm({
      ...workerForm,
      skills: [...workerForm.skills, { skillName: '', experienceYears: 1 }]
    });
  };

  const handleRemoveSkill = (index) => {
    const updated = workerForm.skills.filter((_, i) => i !== index);
    setWorkerForm({ ...workerForm, skills: updated });
  };

  const handleSkillChange = (index, field, value) => {
    const updated = [...workerForm.skills];
    updated[index][field] = value;
    setWorkerForm({ ...workerForm, skills: updated });
  };

  // Submit worker upgrade
  const handleBecomeWorkerSubmit = async (e) => {
    e.preventDefault();
    setSubmittingWorker(true);
    setWorkerError(null);

    try {
      const validSkills = workerForm.skills
        .filter(s => s.skillName.trim() !== '')
        .map(s => ({
          skillName: s.skillName.trim(),
          experienceYears: parseInt(s.experienceYears) || 1
        }));

      const payload = {
        email: userEmail,
        description: workerForm.description,
        primaryServiceArea: workerForm.primaryServiceArea || 'Default Area',
        coverageRadiusKm: parseFloat(workerForm.coverageRadiusKm) || 10,
        pricingModel: workerForm.pricingModel,
        hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : null,
        dailyRate: workerForm.dailyRate ? parseFloat(workerForm.dailyRate) : null,
        skills: validSkills
      };

      const res = await axios.post('http://localhost:5237/api/workers/become-worker', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Successfully upgraded your profile to a Worker profile!');
      setIsWorker(true);
      setWorkerProfile(res.data.worker);
      localStorage.setItem('activeRole', 'Worker');
      navigateTo('/worker/dashboard');
    } catch (err) {
      console.error('Failed to become worker:', err);
      const msg = err.response?.data?.message || 'Failed to complete worker profile creation.';
      setWorkerError(msg);
    } finally {
      setSubmittingWorker(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5237/api/residents/${encodeURIComponent(userEmail)}`, profile, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert('Profile updated successfully!');
      if (profile.name) {
        localStorage.setItem('userName', profile.name);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5237/api/residents/${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      handleLogout();
    } catch (err) {
      console.error(err);
      alert('Failed to delete account.');
    }
  };

  // --- COMMUNITY POST MANAGEMENT ACTIONS ---

  // 1. View Post Details
  const handleViewPost = async (post) => {
    setSelectedPostForDetail(post);
    setSelectedGalleryImage(post.images && post.images.length > 0 ? post.images[0] : null);

    try {
      const res = await axios.get(`http://localhost:5237/api/community-posts/${post.postId}/comments`);
      setCommentsMap(prev => ({ ...prev, [post.postId]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // 2. Add Comment in View Modal
  const handleAddComment = async (postId) => {
    if (!newCommentText || !newCommentText.trim()) return;

    try {
      const res = await axios.post(`http://localhost:5237/api/community-posts/${postId}/comments`, {
        content: newCommentText,
        userName: userName || "You (Resident)",
        userAvatar: userPicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser"
      });

      if (res.data) {
        setCommentsMap(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), res.data]
        }));
        setUserPosts(prev => prev.map(p => p.postId === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
        if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
          setSelectedPostForDetail(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
        }
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
    setNewCommentText('');
  };

  // 3. Open Edit Post Modal
  const handleOpenEdit = (post) => {
    setEditingPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.serviceCategoryId || 'plumbing');
    setEditLocation(post.location || 'Colombo 05');
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

  // Save Edit Post
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    try {
      await axios.put(`http://localhost:5237/api/community-posts/${editingPost.postId}`, {
        title: editTitle,
        content: editContent,
        serviceCategoryId: editCategory,
        location: editLocation,
        images: editImages
      });

      alert("Post updated successfully!");
      setEditingPost(null);
      fetchUserPosts();
    } catch (err) {
      console.error("Error updating post:", err);
      alert("Failed to update post.");
    }
  };

  // 4. Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this community post?")) return;

    try {
      await axios.delete(`http://localhost:5237/api/community-posts/${postId}`);
      alert("Post deleted successfully.");
      setUserPosts(prev => prev.filter(p => p.postId !== postId));
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post.");
    }
  };

  // 5. Image Upload for Create Post
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCreateImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 6. Create New Post from Dashboard
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!createTitle.trim() || !createContent.trim()) return;

    try {
      await axios.post('http://localhost:5237/api/community-posts', {
        title: createTitle,
        content: createContent,
        serviceCategoryId: createCategory,
        location: createLocation,
        images: createImages,
        userName: userName || "You (Resident)",
        userAvatar: userPicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert("Post published successfully!");
      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateImages([]);
      fetchUserPosts();
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Failed to publish post.");
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', fontSize: '1.2rem', color: '#6b7280' }}>Loading your dashboard...</div>;
  if (!userEmail) return <div style={{ padding: '4rem', textAlign: 'center', fontSize: '1.2rem', color: '#6b7280' }}>Please log in to view your dashboard.</div>;

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#111827' }}>
      
      {/* Top Navbar */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }} style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" style={{ height: '40px' }} />
        </a>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <md-outlined-button onClick={() => navigateTo('/find')}>Find Workers</md-outlined-button>
          <md-filled-button 
            onClick={() => navigateTo('/community')}
            style={{ '--md-sys-color-primary': '#009688', '--md-sys-color-on-primary': '#ffffff' }}
          >
            Community Board
          </md-filled-button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Sidebar Navigation */}
        <aside style={{ flex: '1 1 250px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e5e7eb', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
             {userPicture ? (
                <img src={userPicture} alt="Avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
             ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#009688', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
             )}
             <div style={{ overflow: 'hidden' }}>
               <h3 style={{ margin: '0 0 0.25rem 0', fontWeight: '700', fontSize: '1.1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                 {profile.name || 'User'}
               </h3>
               <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                 {userEmail}
               </p>
               {isWorker && (
                 <div style={{ marginTop: '0.25rem' }}>
                   <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                     Active Worker
                   </span>
                 </div>
               )}
             </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('overview')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'overview' ? '#e0f2fe' : 'transparent', color: activeTab === 'overview' ? '#0284c7' : '#4b5563', fontWeight: activeTab === 'overview' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('edit')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'edit' ? '#e0f2fe' : 'transparent', color: activeTab === 'edit' ? '#0284c7' : '#4b5563', fontWeight: activeTab === 'edit' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              Edit Profile
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'posts' ? '#e0f2fe' : 'transparent', color: activeTab === 'posts' ? '#0284c7' : '#4b5563', fontWeight: activeTab === 'posts' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              My Community Posts
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'settings' ? '#e0f2fe' : 'transparent', color: activeTab === 'settings' ? '#0284c7' : '#4b5563', fontWeight: activeTab === 'settings' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              Settings
            </button>

            {isWorker ? (
              <button 
                onClick={() => navigateTo('/worker/dashboard')}
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: '#2563eb', 
                  color: '#ffffff', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  marginTop: '0.5rem'
                }}
              >
                Worker Dashboard →
              </button>
            ) : (
              <button 
                onClick={() => setActiveTab('become-worker')}
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  borderRadius: '8px', 
                  border: 'none', 
                  background: activeTab === 'become-worker' ? '#dbeafe' : '#eff6ff', 
                  color: '#2563eb', 
                  fontWeight: '600', 
                  cursor: 'pointer', 
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  marginTop: '0.5rem'
                }}
              >
                Join as Worker
              </button>
            )}
          </nav>
        </aside>

        {/* Main Section Area */}
        <section style={{ flex: '3 1 600px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', border: '1px solid #e5e7eb' }}>
          
          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', color: '#111827' }}>Profile Overview</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display Name</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{profile.name || <span style={{color: '#9ca3af', fontStyle: 'italic'}}>Not provided</span>}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{profile.phoneNo || <span style={{color: '#9ca3af', fontStyle: 'italic'}}>Not provided</span>}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Address</h4>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>{profile.address || <span style={{color: '#9ca3af', fontStyle: 'italic'}}>Not provided</span>}</p>
                </div>
                
                <div style={{ marginTop: '1rem' }}>
                  <md-filled-button 
                    onClick={() => setActiveTab('edit')}
                    style={{ '--md-sys-color-primary': '#111827', '--md-sys-color-on-primary': '#ffffff', '--md-filled-button-container-shape': '8px' }}
                  >
                    Edit Profile Details
                  </md-filled-button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Edit Profile */}
          {activeTab === 'edit' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', color: '#111827' }}>Edit Profile</h2>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <md-filled-text-field
                  label="Display Name"
                  value={profile.name}
                  onInput={(e) => setProfile({ ...profile, name: e.target.value })}
                ></md-filled-text-field>
                
                <md-filled-text-field
                  label="Phone Number"
                  value={profile.phoneNo}
                  onInput={(e) => setProfile({ ...profile, phoneNo: e.target.value })}
                ></md-filled-text-field>
                
                <md-filled-text-field
                  label="Physical Address"
                  value={profile.address}
                  onInput={(e) => setProfile({ ...profile, address: e.target.value })}
                ></md-filled-text-field>

                <div style={{ marginTop: '1rem' }}>
                  <md-filled-button 
                    type="submit" 
                    style={{ '--md-sys-color-primary': '#009688', '--md-sys-color-on-primary': '#ffffff', height: '48px', fontSize: '16px', '--md-filled-button-container-shape': '50px', padding: '0 32px' }}
                  >
                    Save Changes
                  </md-filled-button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: My Community Posts (View, Edit, Delete, Create) */}
          {activeTab === 'posts' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#111827' }}>My Community Posts</h2>
                  <p style={{ color: '#6b7280', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
                    View, edit, or delete your active community posts and classified ads
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{
                    backgroundColor: '#009688',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '10px 20px',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0,150,136,0.3)'
                  }}
                >
                  + Make New Post
                </button>
              </div>
              
              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                  <p>Loading your community posts...</p>
                </div>
              ) : userPosts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '1.5rem' }}>You haven't authored any community posts yet.</p>
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
                    + Create Your First Post
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {userPosts.map(post => (
                    <div 
                      key={post.postId} 
                      style={{ 
                        padding: '1.25rem', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '12px', 
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Left Thumbnail Small Photo */}
                      <div style={{
                        width: '110px',
                        height: '90px',
                        minWidth: '110px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: '#f1f5f9',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0'
                      }}>
                        {post.images && post.images.length > 0 ? (
                          <>
                            <img 
                              src={post.images[0]} 
                              alt={post.title} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop';
                              }}
                            />
                            {post.images.length > 1 && (
                              <div style={{
                                position: 'absolute', bottom: '4px', right: '4px',
                                background: 'rgba(15,23,42,0.75)', color: '#fff',
                                fontSize: '0.65rem', padding: '2px 5px', borderRadius: '4px', fontWeight: 'bold'
                              }}>
                                📷 {post.images.length}
                              </div>
                            )}
                          </>
                        ) : (
                          <i className="fa-solid fa-image" style={{ fontSize: '1.5rem', color: '#94a3b8' }}></i>
                        )}
                      </div>

                      {/* Right Details Column */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: '#0f172a' }}>
                            {post.title}
                          </h3>
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '700' }}>
                            {post.serviceCategoryName || 'General'}
                          </span>
                        </div>

                        <p style={{ margin: 0, color: '#475569', fontSize: '0.925rem', lineHeight: '1.5' }}>
                          {post.content && post.content.length > 160 ? post.content.substring(0, 160) + '...' : post.content}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                            <span>❤️ {post.likesCount || 0} Likes</span>
                            <span>💬 {post.commentsCount || 0} Comments</span>
                            <span>📍 {post.location || 'Colombo'}</span>
                          </div>

                          {/* Action Buttons: View, Edit, Delete */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleViewPost(post)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.825rem',
                                cursor: 'pointer'
                              }}
                            >
                              View
                            </button>
                            
                            <button
                              onClick={() => handleOpenEdit(post)}
                              style={{
                                backgroundColor: '#3b82f6',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.825rem',
                                cursor: 'pointer'
                              }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeletePost(post.postId)}
                              style={{
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 14px',
                                borderRadius: '6px',
                                fontWeight: '600',
                                fontSize: '0.825rem',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', color: '#111827' }}>Account Settings</h2>
              
              <div style={{ marginBottom: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem' }}>Session Options</h3>
                <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Sign out of your current session on this device.</p>
                <md-outlined-button
                  type="button"
                  onClick={handleLogout}
                  style={{ height: '48px', fontSize: '16px', '--md-outlined-button-container-shape': '50px' }}
                >
                  Log Out
                </md-outlined-button>
              </div>

              <div style={{ padding: '1.5rem', border: '1px solid #ef4444', borderRadius: '12px', backgroundColor: '#fef2f2' }}>
                <h3 style={{ color: '#ef4444', marginTop: 0, fontWeight: '800', fontSize: '1.2rem' }}>Danger Zone</h3>
                <p style={{ color: '#7f1d1d', marginBottom: '1.5rem', fontSize: '0.95rem' }}>Once you delete your account, there is no going back. All of your profile data will be permanently removed.</p>
                <md-filled-button 
                  type="button"
                  onClick={handleDeleteAccount}
                  style={{ 
                    '--md-sys-color-primary': '#ef4444', 
                    '--md-sys-color-on-primary': '#ffffff',
                    '--md-filled-button-container-shape': '8px',
                  }}
                >
                  Delete Account
                </md-filled-button>
              </div>
            </div>
          )}

          {/* TAB: Become Worker */}
          {activeTab === 'become-worker' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#111827' }}>Upgrade to Worker Profile</h2>
                <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.95rem' }}>
                  Complete your trade profile details below to start listing your services on SuperBass.
                </p>
              </div>

              {isWorker ? (
                <div style={{ padding: '2.5rem', backgroundColor: '#EFF6FF', borderRadius: '16px', border: '1px solid #BFDBFE', textAlign: 'center' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#1E40AF', fontSize: '1.25rem', fontWeight: '700' }}>
                    You are already a registered Worker!
                  </h3>
                  <p style={{ color: '#1E3A8A', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                    Your worker profile is active. You can manage your jobs, skills, and availability in your Worker Dashboard.
                  </p>
                  <md-filled-button 
                    type="button"
                    onClick={() => navigateTo('/worker/dashboard')}
                    style={{ '--md-sys-color-primary': '#2563EB', '--md-sys-color-on-primary': '#ffffff', '--md-filled-button-container-shape': '50px' }}
                  >
                    Go to Worker Dashboard
                  </md-filled-button>
                </div>
              ) : (
                <form onSubmit={handleBecomeWorkerSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  
                  {workerError && (
                    <div style={{ padding: '1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', fontSize: '0.9rem' }}>
                      {workerError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Trade Experience / Short Bio *</label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Describe your skills, experience, and trade specialization..."
                      value={workerForm.description}
                      onChange={(e) => setWorkerForm({ ...workerForm, description: e.target.value })}
                      style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Primary Service Area / City *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Colombo, Kandy, Galle"
                        value={workerForm.primaryServiceArea}
                        onChange={(e) => setWorkerForm({ ...workerForm, primaryServiceArea: e.target.value })}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Coverage Radius (Km)</label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={workerForm.coverageRadiusKm}
                        onChange={(e) => setWorkerForm({ ...workerForm, coverageRadiusKm: e.target.value })}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Pricing Model</label>
                      <select
                        value={workerForm.pricingModel}
                        onChange={(e) => setWorkerForm({ ...workerForm, pricingModel: e.target.value })}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem', backgroundColor: '#fff' }}
                      >
                        <option value="Hourly">Hourly Rate</option>
                        <option value="Daily">Daily Rate</option>
                        <option value="Fixed">Fixed Quote</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Hourly Rate (LKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        value={workerForm.hourlyRate}
                        onChange={(e) => setWorkerForm({ ...workerForm, hourlyRate: e.target.value })}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontWeight: '600', fontSize: '0.9rem', color: '#374151' }}>Daily Rate (LKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 8000"
                        value={workerForm.dailyRate}
                        onChange={(e) => setWorkerForm({ ...workerForm, dailyRate: e.target.value })}
                        style={{ padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.95rem' }}
                      />
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#111827' }}>Skills & Trade Specialization</h4>
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #2563EB', backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        + Add Skill
                      </button>
                    </div>

                    {workerForm.skills.map((skill, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <input
                          type="text"
                          placeholder="Skill Name (e.g. Electrical Wiring, Plumbing)"
                          value={skill.skillName}
                          onChange={(e) => handleSkillChange(index, 'skillName', e.target.value)}
                          style={{ flex: 2, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
                        />
                        <input
                          type="number"
                          min="0"
                          max="50"
                          placeholder="Years Exp."
                          value={skill.experienceYears}
                          onChange={(e) => handleSkillChange(index, 'experienceYears', e.target.value)}
                          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.9rem' }}
                        />
                        {workerForm.skills.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(index)}
                            style={{ border: 'none', background: 'none', color: '#EF4444', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', padding: '0 8px' }}
                            title="Remove Skill"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <md-filled-button
                      type="submit"
                      disabled={submittingWorker}
                      style={{ '--md-sys-color-primary': '#2563EB', '--md-sys-color-on-primary': '#ffffff', height: '48px', fontSize: '16px', '--md-filled-button-container-shape': '50px', padding: '0 32px' }}
                    >
                      {submittingWorker ? 'Upgrading Account...' : 'Complete Worker Upgrade'}
                    </md-filled-button>
                  </div>

                </form>
              )}
            </div>
          )}

        </section>
      </main>

      {/* VIEW POST DETAIL MODAL */}
      {selectedPostForDetail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setSelectedPostForDetail(null)}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '640px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{selectedPostForDetail.title}</h3>
              <button onClick={() => setSelectedPostForDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            {selectedPostForDetail.images && selectedPostForDetail.images.length > 0 && (
              <div>
                <img 
                  src={selectedGalleryImage || selectedPostForDetail.images[0]} 
                  alt="Post" 
                  style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '10px', marginBottom: '1rem' }} 
                />
                {selectedPostForDetail.images.length > 1 && (
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '1rem' }}>
                    {selectedPostForDetail.images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt="Thumb" 
                        onClick={() => setSelectedGalleryImage(img)}
                        style={{
                          width: '65px', height: '50px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer',
                          border: selectedGalleryImage === img ? '2px solid #009688' : '2px solid transparent'
                        }} 
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-line', marginBottom: '1rem' }}>
              {selectedPostForDetail.content}
            </p>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', fontWeight: '700' }}>Comments</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                {(commentsMap[selectedPostForDetail.postId] || []).length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No comments on this post yet.</p>
                ) : (
                  (commentsMap[selectedPostForDetail.postId] || []).map(c => (
                    <div key={c.commentId} style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.825rem' }}>{c.userName}: </span>
                      <span style={{ fontSize: '0.875rem' }}>{c.content}</span>
                    </div>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedPostForDetail.postId)}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
                <button
                  onClick={() => handleAddComment(selectedPostForDetail.postId)}
                  style={{ backgroundColor: '#009688', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {editingPost && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setEditingPost(null)}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '1.5rem'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Edit Community Post</h3>
              <button onClick={() => setEditingPost(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Description</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Photos ({editImages.length} attached)</label>
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
                    padding: '8px 14px', borderRadius: '6px', border: '1px dashed #94a3b8',
                    backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', width: '100%'
                  }}
                >
                  📷 Add / Change Photos
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAKE NEW POST MODAL */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 1000, padding: '1rem'
        }} onClick={() => setIsCreateModalOpen(false)}>
          <div style={{
            backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '540px', width: '100%', padding: '1.5rem'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Create Community Post</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Post Title</label>
                <input
                  type="text"
                  placeholder="e.g. Need urgent electrician or selling unused gaming monitor"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Colombo 05"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Description</label>
                <textarea
                  placeholder="Provide details about your post..."
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  required
                  rows={4}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '4px', fontSize: '0.85rem' }}>Multiple Photos (Optional)</label>
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
                    padding: '8px 14px', borderRadius: '6px', border: '1px dashed #94a3b8',
                    backgroundColor: '#f8fafc', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', width: '100%'
                  }}
                >
                  📷 Attach Photos ({createImages.length} selected)
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#009688', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                >
                  Publish Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}