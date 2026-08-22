import React, { useState, useEffect } from 'react';
import axios from 'axios';
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

  let userEmail = localStorage.getItem('email');
  const token = localStorage.getItem('token');
  const userPicture = localStorage.getItem('userPicture');

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
          headers: { Authorization: `Bearer ${token}` }
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

  useEffect(() => {
    if (activeTab === 'posts' && userEmail) {
      const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
          const res = await axios.get(`http://localhost:5237/api/community-posts/user/${encodeURIComponent(userEmail)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUserPosts(res.data);
        } catch (err) {
          console.error("Failed to fetch user posts:", err);
        } finally {
          setLoadingPosts(false);
        }
      };
      fetchPosts();
    }
  }, [activeTab, userEmail, token]);

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

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:5237/api/residents/${encodeURIComponent(userEmail)}`, profile, {
        headers: { Authorization: `Bearer ${token}` }
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
    
    try {
      await axios.delete(`http://localhost:5237/api/residents/${encodeURIComponent(userEmail)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      handleLogout();
    } catch (err) {
      console.error(err);
      alert('Failed to delete account.');
    }
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', fontSize: '1.2rem', color: '#6b7280' }}>Loading your dashboard...</div>;
  if (!userEmail) return <div style={{ padding: '4rem', textAlign: 'center', fontSize: '1.2rem', color: '#6b7280' }}>Please log in to view this page.</div>;

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
            style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000' }}
          >
            Community
          </md-filled-button>
        </div>
      </header>

      {/* Main Layout */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        {/* Sidebar */}
        <aside style={{ flex: '1 1 250px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e5e7eb', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
             {userPicture ? (
                <img src={userPicture} alt="Avatar" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} />
             ) : (
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FDC101', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '24px' }}>
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
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'overview' ? '#fffbeb' : 'transparent', color: activeTab === 'overview' ? '#b45309' : '#4b5563', fontWeight: activeTab === 'overview' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('edit')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'edit' ? '#fffbeb' : 'transparent', color: activeTab === 'edit' ? '#b45309' : '#4b5563', fontWeight: activeTab === 'edit' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              Edit Profile
            </button>
            <button 
              onClick={() => setActiveTab('posts')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'posts' ? '#fffbeb' : 'transparent', color: activeTab === 'posts' ? '#b45309' : '#4b5563', fontWeight: activeTab === 'posts' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
            >
              My Posts
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              style={{ padding: '12px 16px', textAlign: 'left', borderRadius: '8px', border: 'none', background: activeTab === 'settings' ? '#fffbeb' : 'transparent', color: activeTab === 'settings' ? '#b45309' : '#4b5563', fontWeight: activeTab === 'settings' ? '700' : '500', cursor: 'pointer', fontSize: '1rem' }}
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

        {/* Main Content Area */}
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
              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
                    style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000', height: '48px', fontSize: '16px', '--md-filled-button-container-shape': '50px', padding: '0 32px' }}
                  >
                    Save Changes
                  </md-filled-button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: My Posts */}
          {activeTab === 'posts' && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: 0, marginBottom: '1.5rem', color: '#111827' }}>My Community Posts</h2>
              
              {loadingPosts ? (
                <p style={{ color: '#6b7280' }}>Loading your posts...</p>
              ) : userPosts.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px dashed #d1d5db' }}>
                  <p style={{ fontSize: '1.1rem', color: '#4b5563', marginBottom: '1.5rem' }}>You haven't authored any posts yet.</p>
                  <md-filled-button 
                    onClick={() => navigateTo('/community')}
                    style={{ '--md-sys-color-primary': '#FDC101', '--md-sys-color-on-primary': '#000000', '--md-filled-button-container-shape': '50px' }}
                  >
                    Visit Community
                  </md-filled-button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {userPosts.map(post => (
                    <div key={post.postId} style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>{post.title}</h3>
                        <span style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 10px', borderRadius: '16px', fontSize: '0.8rem', fontWeight: '600' }}>
                          {post.serviceCategoryName}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#4b5563', fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280' }}>
                        <span>❤️ {post.likesCount} Likes</span>
                        <span>💬 {post.commentsCount} Comments</span>
                        <span>📍 {post.location}</span>
                        <span style={{ marginLeft: 'auto' }}>
                          Status: <strong style={{ color: post.status === 'Active' ? '#10b981' : '#f59e0b' }}>{post.status}</strong>
                        </span>
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
                  onClick={handleDelete}
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
    </div>
  );
}