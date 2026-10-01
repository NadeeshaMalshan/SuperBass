import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import categoriesData from './data/categories.json';
import sriLankaDistricts from './data/sriLankaDistricts.json';
import { WORKER_SERVICES_CATALOG, getSkillsForService, getCategoryByName } from './data/workerServicesCatalog.js';
import M3TopNavbar from './components/M3TopNavbar.jsx';
import UserMenu from './components/UserMenu.jsx';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/progress/circular-progress.js';
import '@material/web/textfield/filled-text-field.js';
import Loader from './components/Loader.jsx';
import MyCommunityPostsManager from './components/MyCommunityPostsManager.jsx';
import { API_BASE_URL } from './config.js';
import { showToast } from './utils/toast.js';
import VerificationForm from './components/VerificationForm.jsx';
import VerifiedBadge from './components/VerifiedBadge.jsx';
import { extractCityFromAddress } from './data/cityCoordinates.js';

export default function ResidentProfile({ defaultTab = 'overview' }) {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || defaultTab || 'overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [isVerified, setIsVerified] = useState(false);


  const [profile, setProfile] = useState({
    name: '',
    phoneNo: '',
    address: '',
    profileImage: ''
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
    primaryServiceArea: 'Colombo',
    coverageRadiusKm: 10,
    pricingModel: 'Hourly',
    hourlyRate: '',
    dailyRate: '',
    skills: [
      {
        serviceName: WORKER_SERVICES_CATALOG[0]?.name || 'Plumbing',
        skills: (WORKER_SERVICES_CATALOG[0]?.defaultSkills || []).slice(0, 2),
        experienceYears: 2,
        customSkillInput: ''
      }
    ]
  });
  const [submittingWorker, setSubmittingWorker] = useState(false);
  const [workerError, setWorkerError] = useState(null);

  // Post management & modal states
  const [selectedPostForDetail, setSelectedPostForDetail] = useState(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newCommentText, setNewCommentText] = useState('');

  const [editingPost, setEditingPost] = useState(null);
  const [isSavingPost, setIsSavingPost] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('plumbing');
  const [editProvince, setEditProvince] = useState('Western Province');
  const [editDistrict, setEditDistrict] = useState('Colombo');
  const [editImages, setEditImages] = useState([]);
  const editFileInputRef = useRef(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createCategory, setCreateCategory] = useState('plumbing');
  const [createProvince, setCreateProvince] = useState('Western Province');
  const [createDistrict, setCreateDistrict] = useState('Colombo');
  const [createImages, setCreateImages] = useState([]);
  const fileInputRef = useRef(null);

  // Resident Bookings & Reviews state
  const [residentBookings, setResidentBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    qualityRating: 5,
    punctualityRating: 5,
    communicationRating: 5,
    comment: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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
    localStorage.clear();
    sessionStorage.clear();
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
        const response = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        setProfile({
          name: response.data.name || (userEmail ? userEmail.split('@')[0] : ''),
          phoneNo: response.data.phoneNo || '',
          address: response.data.address || '',
          profileImage: response.data.profileImage || ''
        });

        if (response.data.address) {
          const detectedCity = extractCityFromAddress(response.data.address);
          if (detectedCity) {
            localStorage.setItem('userCity', detectedCity);
            localStorage.setItem('community_selected_district', detectedCity);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
        setProfile(prev => ({
          ...prev,
          name: prev.name || (userEmail ? userEmail.split('@')[0] : 'User')
        }));
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
        const res = await axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
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
      const res = await axios.get(`${API_BASE_URL}/community-posts/user/${encodeURIComponent(userEmail)}`);
      setUserPosts(res.data || []);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchResidentBookings = async () => {
    if (!userEmail) return;
    setLoadingBookings(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/bookings/resident?email=${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setResidentBookings(res.data || []);
    } catch (err) {
      console.error("Error fetching resident bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchUserPosts();
    }
    if (activeTab === 'bookings') {
      fetchResidentBookings();
    }
  }, [activeTab, userEmail]);

  // Initial bookings count fetch
  useEffect(() => {
    if (userEmail) {
      fetchResidentBookings();
    }
  }, [userEmail]);

  // Cancel Booking Handler
  const handleCancelBooking = async (id) => {
    const reason = window.prompt("Please provide a reason for cancelling this booking (optional):", "Changed plans / Schedule conflict");
    if (reason === null) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/bookings/${id}/cancel`, { reason }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Booking has been cancelled.");
      setResidentBookings(prev => prev.map(b => b.id === id ? res.data : b));
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert(err.response?.data?.message || "Failed to cancel booking.");
    }
  };

  // Open Review Modal
  const handleOpenReviewModal = (booking) => {
    setReviewingBooking(booking);
    setReviewForm({
      qualityRating: 5,
      punctualityRating: 5,
      communicationRating: 5,
      comment: ''
    });
  };

  // Submit Review Handler -> transitions to Reviewed
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewingBooking) return;

    setSubmittingReview(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/bookings/${reviewingBooking.id}/review`, {
        qualityRating: parseInt(reviewForm.qualityRating),
        punctualityRating: parseInt(reviewForm.punctualityRating),
        communicationRating: parseInt(reviewForm.communicationRating),
        comment: reviewForm.comment
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      alert("🎉 Thank you! Your review and rating have been submitted successfully.");
      setResidentBookings(prev => prev.map(b => b.id === reviewingBooking.id ? res.data : b));
      setReviewingBooking(null);
    } catch (err) {
      console.error("Error submitting review:", err);
      alert(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Skill & Service management handlers (matching Mobile App become_worker_sheet)
  const handleAddService = () => {
    const usedCategories = workerForm.skills.map(s => s.serviceName.toLowerCase());
    const nextCat = WORKER_SERVICES_CATALOG.find(c => !usedCategories.includes(c.name.toLowerCase())) || WORKER_SERVICES_CATALOG[0];

    setWorkerForm(prev => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          serviceName: nextCat.name,
          skills: nextCat.defaultSkills.slice(0, 2),
          experienceYears: 2,
          customSkillInput: ''
        }
      ]
    }));
  };

  const handleRemoveService = (index) => {
    if (workerForm.skills.length <= 1) {
      alert("You must keep at least one trade service.");
      return;
    }
    const updated = workerForm.skills.filter((_, i) => i !== index);
    setWorkerForm(prev => ({ ...prev, skills: updated }));
  };

  const handleServiceCategoryChange = (index, newServiceName) => {
    const catDef = getCategoryByName(newServiceName) || WORKER_SERVICES_CATALOG[0];
    const updated = [...workerForm.skills];
    updated[index] = {
      ...updated[index],
      serviceName: catDef.name,
      skills: catDef.defaultSkills.slice(0, 2),
      customSkillInput: ''
    };
    setWorkerForm(prev => ({ ...prev, skills: updated }));
  };

  const handleExperienceChange = (index, years) => {
    const updated = [...workerForm.skills];
    updated[index].experienceYears = parseInt(years, 10);
    setWorkerForm(prev => ({ ...prev, skills: updated }));
  };

  const handleToggleSubSkill = (serviceIndex, skillName) => {
    const updated = [...workerForm.skills];
    const currentSkills = updated[serviceIndex].skills;
    if (currentSkills.includes(skillName)) {
      if (currentSkills.length <= 1) {
        alert("Each service must have at least one specialization skill.");
        return;
      }
      updated[serviceIndex].skills = currentSkills.filter(s => s !== skillName);
    } else {
      updated[serviceIndex].skills = [...currentSkills, skillName];
    }
    setWorkerForm(prev => ({ ...prev, skills: updated }));
  };

  const handleAddCustomSubSkill = (serviceIndex) => {
    const updated = [...workerForm.skills];
    const targetService = updated[serviceIndex];
    const trimmed = (targetService.customSkillInput || '').trim();
    if (trimmed && !targetService.skills.includes(trimmed)) {
      targetService.skills = [...targetService.skills, trimmed];
      targetService.customSkillInput = '';
      setWorkerForm(prev => ({ ...prev, skills: updated }));
    }
  };

  const handleCustomSkillInputChange = (serviceIndex, val) => {
    const updated = [...workerForm.skills];
    updated[serviceIndex].customSkillInput = val;
    setWorkerForm(prev => ({ ...prev, skills: updated }));
  };

  // Submit worker upgrade
  const handleBecomeWorkerSubmit = async (e) => {
    e.preventDefault();
    setSubmittingWorker(true);
    setWorkerError(null);

    try {
      // Validate that every service has at least one skill
      for (const s of workerForm.skills) {
        if (!s.skills || s.skills.length === 0) {
          setWorkerError(`Please select at least one specialization skill for ${s.serviceName}.`);
          setSubmittingWorker(false);
          return;
        }
      }

      const validSkills = workerForm.skills
        .filter(s => s.serviceName && s.serviceName.trim() !== '')
        .map(s => ({
          serviceName: s.serviceName.trim(),
          service: s.serviceName.trim(),
          skills: s.skills,
          experienceYears: isNaN(parseInt(s.experienceYears, 10)) ? 1 : Math.max(0, parseInt(s.experienceYears, 10)),
          skillName: s.serviceName.trim()
        }));

      const activeEmail = userEmail || profile?.email || localStorage.getItem('email');
      if (!activeEmail) {
        setWorkerError('User email could not be determined. Please sign in again.');
        setSubmittingWorker(false);
        return;
      }

      const payload = {
        email: activeEmail,
        description: workerForm.description,
        primaryServiceArea: workerForm.primaryServiceArea || 'Colombo',
        coverageRadiusKm: parseFloat(workerForm.coverageRadiusKm) || 10,
        pricingModel: workerForm.pricingModel,
        hourlyRate: workerForm.hourlyRate ? parseFloat(workerForm.hourlyRate) : null,
        dailyRate: workerForm.dailyRate ? parseFloat(workerForm.dailyRate) : null,
        skills: validSkills
      };

      const res = await axios.post(`${API_BASE_URL}/workers/become-worker`, payload, {
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
    if (profile.phoneNo && profile.phoneNo.trim()) {
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(profile.phoneNo.trim())) {
        alert('Phone number must be exactly 10 digits starting with 0 (e.g., 0771234567).');
        return;
      }
    }
    try {
      await axios.put(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, profile, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      showToast('Profile updated successfully!');
      if (profile.name) {
        localStorage.setItem('userName', profile.name);
      }
      if (profile.profileImage) {
        localStorage.setItem('userPicture', profile.profileImage);
      }
      if (profile.address) {
        const detectedCity = extractCityFromAddress(profile.address);
        if (detectedCity) {
          localStorage.setItem('userCity', detectedCity);
          localStorage.setItem('community_selected_district', detectedCity);
        }
      }
      
      // Notify other components (like UserMenu) to re-read localStorage
      window.dispatchEvent(new Event('profileUpdated'));
    } catch (err) {
      console.error(err);
      alert('Failed to update profile.');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      alert("Please type DELETE in capital letters to confirm permanent account deletion.");
      return;
    }

    if (!window.confirm("FINAL WARNING: Are you absolutely certain you want to permanently delete your Resident account? All your bookings, community posts, and data will be permanently wiped. Your email will be freed up.")) {
      return;
    }

    try {
      setIsDeletingAccount(true);
      await axios.delete(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Your Resident account has been permanently deleted. Your email is now freed up to register as either Resident or Worker.");
      handleLogout();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // --- COMMUNITY POST MANAGEMENT ACTIONS ---

  // 1. View Post Details
  const handleViewPost = async (post) => {
    setSelectedPostForDetail(post);
    setSelectedGalleryImage(post.images && post.images.length > 0 ? post.images[0] : null);

    try {
      const res = await axios.get(`${API_BASE_URL}/community-posts/${post.postId}/comments`);
      setCommentsMap(prev => ({ ...prev, [post.postId]: res.data || [] }));
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  // 2. Add Comment in View Modal
  const handleAddComment = async (postId) => {
    if (!newCommentText || !newCommentText.trim()) return;

    try {
      const res = await axios.post(`${API_BASE_URL}/community-posts/${postId}/comments`, {
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

  // Save Edit Post
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPost || !editTitle.trim() || !editContent.trim()) return;

    try {
      setIsSavingPost(true);
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

      // Automatically close modal after saving
      setEditingPost(null);
      await fetchUserPosts();
    } catch (err) {
      console.error("Error updating post:", err);
      const msg = err.response?.data?.message || "Failed to update post.";
      alert(msg);
    } finally {
      setIsSavingPost(false);
    }
  };

  // 4. Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this community post?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/community-posts/${postId}?requesterEmail=${encodeURIComponent(userEmail || '')}&requesterName=${encodeURIComponent(userName || '')}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      alert("Post deleted successfully.");
      setUserPosts(prev => prev.filter(p => p.postId !== postId));
      if (selectedPostForDetail && selectedPostForDetail.postId === postId) {
        setSelectedPostForDetail(null);
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      const msg = err.response?.data?.message || "Failed to delete post.";
      alert(msg);
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
      setIsCreatingPost(true);
      await axios.post(`${API_BASE_URL}/community-posts`, {
        title: createTitle,
        content: createContent,
        serviceCategoryId: createCategory,
        location: `${createDistrict}, ${createProvince}`,
        images: createImages,
        userName: userName || "You (Resident)",
        userAvatar: userPicture || "https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser",
        userEmail: userEmail
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      // Automatically close modal after saving
      setIsCreateModalOpen(false);
      setCreateTitle('');
      setCreateContent('');
      setCreateProvince('Western Province');
      setCreateDistrict('Colombo');
      setCreateImages([]);
      await fetchUserPosts();
    } catch (err) {
      console.error("Error creating post:", err);
      alert("Failed to publish post.");
    } finally {
      setIsCreatingPost(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb', color: '#6b7280' }}>
      <Loader />
      <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Loading your dashboard...</div>
    </div>
  );
  if (!userEmail) return <div style={{ padding: '4rem', textAlign: 'center', fontSize: '1.2rem', color: '#6b7280' }}>Please log in to view your dashboard.</div>;

  return (
    <div className="find-page-container">

      {/* Google Workspace / Material 3 Top Navbar (Rendered Globally) */}

      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#F7F7F8] w-full font-inherit">
        {/* Left Sidebar Navigation Drawer */}
        <aside className={`flex flex-col h-full overflow-y-auto bg-white border-r border-[#E5E5EA] transition-all duration-300 shrink-0 ${isSidebarCollapsed ? 'w-20 items-center py-6 px-2' : 'w-[280px] py-6 px-4'}`}>
          {/* User Profile Info Mini Header */}
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''} mb-6`}>
            {(profile.profileImage || userPicture) ? (
              <img src={profile.profileImage || userPicture} alt="Avatar" className="w-14 h-14 rounded-full object-cover shrink-0 shadow-sm" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="overflow-hidden min-w-0">
                <div className="font-bold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1 text-[16px]">
                  {profile.name || 'User'}
                  {isVerified && <VerifiedBadge />}
                </div>
                <div className="text-[13px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                  {userEmail}
                </div>
                {isWorker && (
                  <span className="bg-gray-100 text-black px-2 py-0.5 rounded-md text-xs font-bold inline-block mt-1">
                    Active Worker
                  </span>
                )}
              </div>
            )}
          </div>
          
          <nav className="flex-1 flex flex-col gap-1 w-full relative">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-[#F0F0F2] text-black font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              {!isSidebarCollapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">Profile Overview</span>}
            </button>

            <button
              onClick={() => setActiveTab('verify')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors ${activeTab === 'verify' ? 'bg-[#F0F0F2] text-black font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              {!isSidebarCollapsed && (
                <>
                  <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">Verify Account</span>
                  {isVerified ? (
                    <span className="bg-green-100 text-green-700 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ml-auto shrink-0">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ml-auto shrink-0">!</span>
                  )}
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors ${activeTab === 'edit' ? 'bg-[#F0F0F2] text-black font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </div>
              {!isSidebarCollapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">Edit Profile</span>}
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors ${activeTab === 'bookings' ? 'bg-[#F0F0F2] text-black font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">event_note</span>
              </div>
              {!isSidebarCollapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">My Bookings</span>}
            </button>
            
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors ${activeTab === 'posts' ? 'bg-[#F0F0F2] text-black font-semibold shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">forum</span>
              </div>
              {!isSidebarCollapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">My Community Posts</span>}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 h-[44px] px-3 rounded-xl transition-colors mt-auto ${activeTab === 'settings' ? 'bg-red-50 text-red-600 font-semibold shadow-sm' : 'text-gray-600 hover:bg-red-50 hover:text-red-600 font-medium'}`}
            >
              <div className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </div>
              {!isSidebarCollapsed && <span className="text-[15px] whitespace-nowrap overflow-hidden text-ellipsis">Settings</span>}
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#F7F7F8]">
          <div className="max-w-[720px] mx-auto p-4 sm:p-6 lg:p-8">
            <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-[#E5E5EA] p-4 sm:p-8 space-y-8">

            {/* TAB: Verify Account */}
            {activeTab === 'verify' && (
              <div>
                <VerificationForm 
                  isVerified={isVerified}
                  onVerifySuccess={() => setIsVerified(true)}
                />
              </div>
            )}

          {/* TAB: Overview */}
          {activeTab === 'overview' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h2 className="text-[28px] font-semibold text-black m-0 leading-tight">Profile Overview</h2>
                <button 
                  className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors whitespace-nowrap cursor-pointer border-none outline-none shadow-sm text-[16px]"
                  onClick={() => setActiveTab('edit')}
                >
                  Edit Profile
                </button>
              </div>
              <dl className="divide-y divide-[#E5E5EA] m-0">
                <div className="py-5 flex flex-col gap-1">
                  <dt className="text-[14px] font-medium text-[#6B6B6B]">Display Name</dt>
                  <dd className="text-[16px] text-gray-900 m-0">{profile.name || <span className="text-gray-400 italic font-normal">Not provided</span>}</dd>
                </div>
                <div className="py-5 flex flex-col gap-1">
                  <dt className="text-[14px] font-medium text-[#6B6B6B]">Phone Number</dt>
                  <dd className="text-[16px] text-gray-900 m-0">{profile.phoneNo || <span className="text-gray-400 italic font-normal">Not provided</span>}</dd>
                </div>
                <div className="py-5 flex flex-col gap-1">
                  <dt className="text-[14px] font-medium text-[#6B6B6B]">Physical Address</dt>
                  <dd className="text-[16px] text-gray-900 m-0">{profile.address || <span className="text-gray-400 italic font-normal">Not provided</span>}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* TAB: My Bookings & Hires */}
          {activeTab === 'bookings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold text-black m-0 mb-2 leading-tight">My Bookings & Hires</h2>
                  <p className="text-[15px] text-[#6B6B6B] m-0">
                    Track your hired workers, follow job progress live, and review completed home services.
                  </p>
                </div>
                <button
                  onClick={fetchResidentBookings}
                  className="bg-white text-black border border-[#D9D9DE] h-12 px-6 rounded-xl text-[16px] font-medium hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer shadow-sm outline-none flex items-center gap-2"
                >
                  <md-icon className="text-[20px]">refresh</md-icon>
                  Refresh
                </button>
              </div>

              {loadingBookings ? (
                <div className="flex flex-col items-center justify-center p-12 gap-4">
                  <Loader />
                  <p className="text-[15px] text-[#6B6B6B] m-0">Loading your service bookings...</p>
                </div>
              ) : residentBookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#D9D9DE] rounded-2xl bg-[#F7F7F8]">
                  <md-icon className="text-[40px] text-gray-400 mb-4">calendar_month</md-icon>
                  <h3 className="text-[18px] font-semibold text-black m-0 mb-2">No bookings or hire requests yet</h3>
                  <p className="text-[15px] text-[#6B6B6B] m-0 mb-6 max-w-md">Need home repairs or maintenance? Browse our verified pros and hire one with one click!</p>
                  <button 
                    onClick={() => navigateTo('/find')} 
                    className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors shadow-sm cursor-pointer border-none outline-none text-[16px]"
                  >
                    Find Verified Workers
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {residentBookings.map((b) => (
                    <div key={b.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">

                      {/* Top Row: Worker info & Status Badge */}
                      <div >
                        <div >
                          <div >
                            {b.workerProfileImage ? (
                              <img src={b.workerProfileImage} alt={b.workerName}  />
                            ) : (
                              b.workerName ? b.workerName.charAt(0).toUpperCase() : 'W'
                            )}
                          </div>
                          <div>
                            <div >
                              <h3 >
                                {b.workerName}
                              </h3>
                              <span >
                                Pro
                              </span>
                            </div>
                            <p >
                              Booking #{b.id} • Scheduled for {new Date(b.scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span style={{
                            backgroundColor:
                              b.status === 'Requested' ? '#fefce8' :
                                b.status === 'Confirmed' ? '#f8fafc' :
                                  b.status === 'InProgress' ? '#f1f5f9' :
                                    b.status === 'Completed' ? '#f0fdf4' :
                                      b.status === 'Reviewed' ? '#fffbeb' :
                                        '#fef2f2',
                            color:
                              b.status === 'Requested' ? '#a16207' :
                                b.status === 'Confirmed' ? '#334155' :
                                  b.status === 'InProgress' ? '#0f172a' :
                                    b.status === 'Completed' ? '#166534' :
                                      b.status === 'Reviewed' ? '#b45309' :
                                        '#991b1b',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            border: `1px solid ${b.status === 'Requested' ? '#fef08a' : b.status === 'Confirmed' ? '#e2e8f0' : b.status === 'InProgress' ? '#cbd5e1' : b.status === 'Completed' ? '#bbf7d0' : b.status === 'Reviewed' ? '#fde68a' : '#fecaca'}`,
                            gap: '6px'
                          }}>
                            {b.status === 'Requested' && '⏳ Booking Requested'}
                            {b.status === 'Confirmed' && '✓ Worker Accepted (Confirmed)'}
                            {b.status === 'InProgress' && '🚀 In Progress'}
                            {b.status === 'Completed' && '🎉 Job Completed'}
                            {b.status === 'Reviewed' && '⭐ Reviewed'}
                            {b.status === 'Rejected' && '✕ Worker Declined'}
                            {b.status === 'Cancelled' && '○ Cancelled'}
                          </span>
                        </div>
                      </div>

                      {/* Job details */}
                      <div >
                        <h4 >
                          {b.jobTitle}
                        </h4>
                        {b.description && (
                          <p >
                            {b.description}
                          </p>
                        )}

                        <div >
                          <div> Address: <strong >{b.locationAddress}</strong></div>
                          <div> Urgency: <strong >{b.urgency}</strong></div>
                          <div> Worker Phone: <strong >{b.workerPhone || 'In chat'}</strong></div>
                          {b.estimatedPrice && (
                            <div> Estimate: <strong >Rs. {b.estimatedPrice.toLocaleString()}</strong></div>
                          )}
                        </div>
                      </div>

                      {/* Visual Booking Stepper Bar */}
                      <div >
                        <div >

                          {/* Step 1 */}
                          <div >
                            <div >✓</div>
                            <span >Requested</span>
                          </div>

                          {/* Step 2 */}
                          <div >
                            <div >
                              {['Confirmed', 'InProgress', 'Completed', 'Reviewed'].includes(b.status) ? '✓' : '2'}
                            </div>
                            <span >Accepted</span>
                          </div>

                          {/* Step 3 */}
                          <div >
                            <div >
                              {['Completed', 'Reviewed'].includes(b.status) ? '✓' : '3'}
                            </div>
                            <span >In Progress</span>
                          </div>

                          {/* Step 4 */}
                          <div >
                            <div >
                              {['Reviewed'].includes(b.status) ? '✓' : '4'}
                            </div>
                            <span >Completed</span>
                          </div>

                          {/* Step 5 */}
                          <div >
                            <div >
                              {b.status === 'Reviewed' ? '★' : '5'}
                            </div>
                            <span >Reviewed</span>
                          </div>

                        </div>
                      </div>

                      {/* Review details if already reviewed */}
                      {b.status === 'Reviewed' && (
                        <div >
                          <div >
                            <span >★ {b.reviewRating?.toFixed(1)}/5.0</span>
                            <span >(Quality: {b.qualityRating}★, Punctuality: {b.punctualityRating}★, Communication: {b.communicationRating}★)</span>
                          </div>
                          {b.reviewComment && (
                            <p >
                              "{b.reviewComment}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div >
                        <md-outlined-button
                          onClick={() => navigateTo('/chats')}
                          
                        >
                          <md-icon slot="icon">chat</md-icon>
                          Chat with {b.workerName}
                        </md-outlined-button>

                        {/* Leave Review CTA if Job is Completed */}
                        {b.status === 'Completed' && (
                          <md-filled-button
                            onClick={() => handleOpenReviewModal(b)}
                            
                          >
                            <md-icon slot="icon">star</md-icon>
                            Leave Rating & Review
                          </md-filled-button>
                        )}

                        {/* Cancel option for pending/confirmed */}
                        {['Requested', 'Confirmed'].includes(b.status) && (
                          <md-outlined-button
                            onClick={() => handleCancelBooking(b.id)}
                            
                          >
                            <md-icon slot="icon">cancel</md-icon>
                            Cancel Booking
                          </md-outlined-button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

                    {/* TAB: Edit Profile */}
          {activeTab === 'edit' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-[28px] font-semibold text-black m-0 mb-8 leading-tight">Edit Profile</h2>
              <form onSubmit={handleUpdateProfile} className="flex flex-col">
                <div className="flex flex-col gap-5">
                  
                  {/* Profile Photo Upload */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-[#E5E5EA]">
                        {profile.profileImage ? (
                          <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl text-gray-400 font-bold">
                            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        )}
                      </div>
                      <label className="h-10 px-4 bg-white border border-[#D9D9DE] text-[14px] font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center shadow-sm">
                        Upload New Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            try {
                              const res = await axios.post(`${API_BASE_URL}/upload/image`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setProfile({ ...profile, profileImage: res.data.url });
                            } catch (err) {
                              console.error('Image upload failed', err);
                              alert('Failed to upload image.');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Display Name</label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Phone Number (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={profile.phoneNo || ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setProfile({ ...profile, phoneNo: clean });
                      }}
                      className={`w-full h-12 px-4 bg-white border ${profile.phoneNo && !/^0\d{9}$/.test(profile.phoneNo) ? 'border-red-500 focus:ring-red-500' : 'border-[#D9D9DE] focus:ring-black'} rounded-xl text-[16px] text-black focus:ring-2 focus:outline-none hover:bg-gray-50 transition-colors`}
                    />
                    {profile.phoneNo && !/^0d{9}$/.test(profile.phoneNo) && (
                      <span className="text-[13px] text-red-500 mt-1">Must be 10 digits starting with 0</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Physical Address</label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <button type="submit" className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors border-none outline-none cursor-pointer text-[16px] whitespace-nowrap">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: My Community Posts (Full Search, Filters, Edit, Delete, Create) */}
          {activeTab === 'posts' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <MyCommunityPostsManager
                userEmail={userEmail}
                userName={userName || profile.name}
                userPicture={userPicture}
                role="Resident"
              />
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
              <div>
                <h2 className="text-[28px] font-semibold text-black m-0 mb-6 leading-tight">Account Settings</h2>

                <div className="bg-white border border-[#E5E5EA] rounded-2xl p-6">
                  <h3 className="text-[16px] font-semibold text-black mb-1 m-0">Session Options</h3>
                  <p className="text-[14px] text-gray-500 mb-6 m-0">Sign out of your current session on this device.</p>
                  <button className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors shadow-sm cursor-pointer border-none outline-none text-[16px]" 
                    type="button"
                    onClick={handleLogout}
                  >
                    Log Out
                  </button>
                </div>
              </div>

              {/* RESTRICTED DANGER ZONE */}
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <md-icon className="text-red-600 text-[28px]">warning</md-icon>
                  <div>
                    <h3 className="text-[18px] font-semibold text-red-900 m-0">
                      Danger Zone
                    </h3>
                    <p className="text-[14px] text-red-700 m-0 mt-1">
                      Permanent Resident Account Erasure & Role Liberation
                    </p>
                  </div>
                </div>

                <div className="text-[14px] text-red-800 space-y-3">
                  <p className="m-0">
                    <strong>Warning:</strong> Deleting your account will permanently wipe your profile, service bookings, community posts, comments, and messages. This action is irreversible.
                  </p>
                  <p className="m-0">
                    <strong>Role Exclusivity:</strong> An email can only be registered as either a Resident or a Worker. If you wish to switch roles and become a Worker, you must permanently delete this Resident account first. Once deleted, this email address is released to register as a Worker.
                  </p>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-[14px] font-medium text-red-900">
                    To confirm permanent deletion, please type <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-800 font-mono">DELETE</code> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full h-12 px-4 bg-white border border-red-200 rounded-xl text-[16px] text-black focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <button
                    type="button"
                    disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                    onClick={handleDeleteAccount}
                    className={`w-full sm:w-auto h-12 px-6 rounded-xl font-semibold text-white transition-all border-none outline-none text-[16px] ${deleteConfirmText === 'DELETE' ? 'bg-red-600 hover:bg-red-700 cursor-pointer shadow-sm' : 'bg-red-300 cursor-not-allowed opacity-60'}`}
                  >
                    {isDeletingAccount ? 'Deleting Account...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Become Worker (Disabled - account must be deleted to switch roles) */}
          {activeTab === 'become_worker' && (
            <div>
              <div >
                <h2 >Upgrade to Worker Profile</h2>
                <p >
                  Complete your trade profile details below to start listing your services on Workio.
                </p>
              </div>

              {isWorker ? (
                <div >
                  <h3 >
                    You are already a registered Worker!
                  </h3>
                  <p >
                    Your worker profile is active. You can manage your jobs, skills, and availability in your Worker Dashboard.
                  </p>
                  <md-filled-button
                    type="button"
                    onClick={() => navigateTo('/worker/dashboard')}
                    
                  >
                    Go to Worker Dashboard
                  </md-filled-button>
                </div>
              ) : (
                <form onSubmit={handleBecomeWorkerSubmit} >

                  {workerError && (
                    <div >
                      {workerError}
                    </div>
                  )}

                  <div >
                    <label >Trade Experience / Short Bio *</label>
                    <textarea className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                      rows="3"
                      required
                      placeholder="Describe your skills, experience, and trade specialization..."
                      value={workerForm.description}
                      onChange={(e) => setWorkerForm({ ...workerForm, description: e.target.value })}
                      
                    />
                  </div>

                  <div >
                    <div >
                      <label >Primary Service Area *</label>
                      <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                        required
                        value={workerForm.primaryServiceArea || 'Colombo'}
                        onChange={(e) => setWorkerForm({ ...workerForm, primaryServiceArea: e.target.value })}
                        
                      >
                        <option value="" disabled>Select Primary Service Area</option>
                        {Object.entries(sriLankaDistricts).map(([province, districts]) => (
                          <optgroup key={province} label={province}>
                            {districts.map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div >
                      <label >Coverage Radius (Km)</label>
                      <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                        type="number"
                        min="1"
                        max="200"
                        value={workerForm.coverageRadiusKm}
                        onChange={(e) => setWorkerForm({ ...workerForm, coverageRadiusKm: e.target.value })}
                        
                      />
                    </div>
                  </div>

                  <div >
                    <div >
                      <label >Pricing Model</label>
                      <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                        value={workerForm.pricingModel}
                        onChange={(e) => setWorkerForm({ ...workerForm, pricingModel: e.target.value })}
                        
                      >
                        <option value="Hourly">Hourly Rate</option>
                        <option value="Daily">Daily Rate</option>
                        <option value="Fixed">Fixed Quote</option>
                      </select>
                    </div>

                    <div >
                      <label >Hourly Rate (LKR)</label>
                      <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                        type="number"
                        placeholder="e.g. 1500"
                        value={workerForm.hourlyRate}
                        onChange={(e) => setWorkerForm({ ...workerForm, hourlyRate: e.target.value })}
                        
                      />
                    </div>

                    <div >
                      <label >Daily Rate (LKR)</label>
                      <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                        type="number"
                        placeholder="e.g. 8000"
                        value={workerForm.dailyRate}
                        onChange={(e) => setWorkerForm({ ...workerForm, dailyRate: e.target.value })}
                        
                      />
                    </div>
                  </div>

                  {/* Skills Section - Hierarchical Services & Specialization Sub-Skills (Matching Mobile App) */}
                  <div >
                    <div >
                      <div>
                        <h4 >
                          Skills & Trade Specialization
                        </h4>
                        <p >
                          Select your trade services, experience levels, and tap sub-skill chips to customize your specializations.
                        </p>
                      </div>
                      <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                        type="button"
                        onClick={handleAddService}
                        
                      >
                        <i  ></i>
                        Add Another Service
                      </button>
                    </div>

                    <div >
                      {workerForm.skills.map((serviceItem, sIdx) => {
                        const suggestedSkills = getSkillsForService(serviceItem.serviceName);

                        return (
                          <div
                            key={sIdx}
                            
                          >
                            {/* Card Top Row: Category Dropdown & Experience Dropdown */}
                            <div >
                              <div >
                                <label >
                                  Service Category
                                </label>
                                <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                                  value={serviceItem.serviceName}
                                  onChange={(e) => handleServiceCategoryChange(sIdx, e.target.value)}
                                  
                                >
                                  {WORKER_SERVICES_CATALOG.map((cat) => (
                                    <option key={cat.name} value={cat.name}>
                                      {cat.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div >
                                <div>
                                  <label >
                                    Experience
                                  </label>
                                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                                    value={serviceItem.experienceYears}
                                    onChange={(e) => handleExperienceChange(sIdx, e.target.value)}
                                    
                                  >
                                    <option value={0}>&lt; 1 Year Exp.</option>
                                    <option value={1}>1 Year Exp.</option>
                                    <option value={2}>2 Years Exp.</option>
                                    <option value={3}>3 Years Exp.</option>
                                    <option value={5}>5+ Years Exp.</option>
                                    <option value={10}>10+ Years Exp.</option>
                                  </select>
                                </div>

                                {workerForm.skills.length > 1 && (
                                  <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                                    type="button"
                                    onClick={() => handleRemoveService(sIdx)}
                                    title="Remove this service"
                                    
                                  >
                                    <i  ></i>
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Sub-skills Section */}
                            <div >
                              <div >
                                <label >
                                  Specialization Sub-Skills in <span >{serviceItem.serviceName}</span>:
                                </label>
                                <span >
                                  {serviceItem.skills.length} selected (tap chips to toggle)
                                </span>
                              </div>

                              {/* Suggested skill chips */}
                              <div >
                                {suggestedSkills.map((subSkill) => {
                                  const isSelected = serviceItem.skills.includes(subSkill);
                                  return (
                                    <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                                      key={subSkill}
                                      type="button"
                                      onClick={() => handleToggleSubSkill(sIdx, subSkill)}
                                      
                                    >
                                      {isSelected ? (
                                        <i  ></i>
                                      ) : (
                                        <i  ></i>
                                      )}
                                      {subSkill}
                                    </button>
                                  );
                                })}

                                {/* Custom added skills that aren't in suggestedSkills */}
                                {serviceItem.skills
                                  .filter(s => !suggestedSkills.includes(s))
                                  .map((customSkill) => (
                                    <span
                                      key={customSkill}
                                      
                                    >
                                      <i  ></i>
                                      {customSkill}
                                      <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                                        type="button"
                                        onClick={() => handleToggleSubSkill(sIdx, customSkill)}
                                        
                                        title={`Remove ${customSkill}`}
                                      >
                                        ✕
                                      </button>
                                    </span>
                                  ))}
                              </div>

                              {/* Custom sub-skill input */}
                              <div >
                                <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                                  type="text"
                                  placeholder={`Add specialized skill to ${serviceItem.serviceName}...`}
                                  value={serviceItem.customSkillInput || ''}
                                  onChange={(e) => handleCustomSkillInputChange(sIdx, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomSubSkill(sIdx);
                                    }
                                  }}
                                  
                                />
                                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                                  type="button"
                                  onClick={() => handleAddCustomSubSkill(sIdx)}
                                  
                                >
                                  + Add Skill
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div >
                    <md-filled-button
                      type="submit"
                      disabled={submittingWorker}
                      
                    >
                      {submittingWorker ? 'Upgrading Account...' : 'Complete Worker Upgrade'}
                    </md-filled-button>
                  </div>

                </form>
              )}
            </div>
          )}
            </div>
          </div>
        </main>
      </div>

      {/* VIEW POST DETAIL MODAL */}
      {selectedPostForDetail && (
        <div  onClick={() => setSelectedPostForDetail(null)}>
          <div  onClick={(e) => e.stopPropagation()}>
            <div >
              <h3 >{selectedPostForDetail.title}</h3>
              <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"  onClick={() => setSelectedPostForDetail(null)} >✕</button>
            </div>

            {selectedPostForDetail.images && selectedPostForDetail.images.length > 0 && (
              <div>
                <img
                  src={selectedGalleryImage || selectedPostForDetail.images[0]}
                  alt="Post"
                  
                />
                {selectedPostForDetail.images.length > 1 && (
                  <div >
                    {selectedPostForDetail.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt="Thumb"
                        onClick={() => setSelectedGalleryImage(img)}
                        
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <p >
              {selectedPostForDetail.content}
            </p>

            <div >
              <h4 >Comments</h4>
              <div >
                {(commentsMap[selectedPostForDetail.postId] || []).length === 0 ? (
                  <p >No comments on this post yet.</p>
                ) : (
                  (commentsMap[selectedPostForDetail.postId] || []).map(c => (
                    <div key={c.commentId} >
                      <span >{c.userName}: </span>
                      <span >{c.content}</span>
                    </div>
                  ))
                )}
              </div>

              <div >
                <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  type="text"
                  placeholder="Write a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedPostForDetail.postId)}
                  
                />
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                  onClick={() => handleAddComment(selectedPostForDetail.postId)}
                  
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
        <div  onClick={() => setEditingPost(null)}>
          <div  onClick={(e) => e.stopPropagation()}>
            <div >
              <h3 >Edit Community Post</h3>
              <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"  onClick={() => setEditingPost(null)} >✕</button>
            </div>

            <form onSubmit={handleSaveEdit} >
              <div>
                <label >Title</label>
                <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                  
                />
              </div>

              <div >
                <div >
                  <label >Category</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div >
                  <label >Province</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
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
                <div >
                  <label >District</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    
                  >
                    {(sriLankaDistricts[editProvince] || []).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label >Description</label>
                <textarea className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={4}
                  
                />
              </div>

              <div>
                <label >Photos ({editImages.length} attached)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={editFileInputRef}
                  onChange={handleEditImageUpload}
                  
                />
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                  type="button"
                  onClick={() => editFileInputRef.current?.click()}
                  
                >
                  📷 Add / Change Photos
                </button>
              </div>

              <div >
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                  type="button"
                  onClick={() => setEditingPost(null)}
                  disabled={isSavingPost}
                  
                >
                  Cancel
                </button>
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"  
                  type="submit"
                  disabled={isSavingPost}
                  
                >
                  {isSavingPost ? (
                    <>
                      <i ></i> Saving...
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

      {/* MAKE NEW POST MODAL */}
      {isCreateModalOpen && (
        <div  onClick={() => setIsCreateModalOpen(false)}>
          <div  onClick={(e) => e.stopPropagation()}>
            <div >
              <h3 >Create Community Post</h3>
              <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" onClick={() => setIsCreateModalOpen(false)} >✕</button>
            </div>

            <form onSubmit={handleCreatePost} >
              <div>
                <label >Post Title</label>
                <input className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  type="text"
                  placeholder="e.g. Need urgent electrician or selling unused gaming monitor"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                  
                />
              </div>

              <div >
                <div >
                  <label >Category</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    
                  >
                    {categoriesData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div >
                  <label >Province</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                    value={createProvince}
                    onChange={(e) => {
                      const prov = e.target.value;
                      setCreateProvince(prov);
                      const firstDist = (sriLankaDistricts[prov] && sriLankaDistricts[prov][0]) || 'Colombo';
                      setCreateDistrict(firstDist);
                    }}
                    
                  >
                    {Object.keys(sriLankaDistricts).map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>
                <div >
                  <label >District</label>
                  <select className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                    value={createDistrict}
                    onChange={(e) => setCreateDistrict(e.target.value)}
                    
                  >
                    {(sriLankaDistricts[createProvince] || []).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label >Description</label>
                <textarea className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  placeholder="Provide details about your post..."
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  required
                  rows={4}
                  
                />
              </div>

              <div>
                <label >Multiple Photos (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  
                />
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  
                >
                  📷 Attach Photos ({createImages.length} selected)
                </button>
              </div>

              <div >
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isCreatingPost}
                  
                >
                  Cancel
                </button>
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                  type="submit"
                  disabled={isCreatingPost}
                  
                >
                  {isCreatingPost ? (
                    <>
                      <i ></i> Publishing...
                    </>
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== RESIDENT REVIEW MODAL ===================== */}
      {reviewingBooking && (
        <div >
          <div >
            <div >
              <div>
                <span >
                  Verified Resident Review
                </span>
                <h3 >
                  Rate {reviewingBooking.workerName}
                </h3>
              </div>
              <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                onClick={() => setReviewingBooking(null)}
                
              >
                ✕
              </button>
            </div>

            <p >
              Your feedback helps keep our community safe and rewards reliable pros.
            </p>

            <form onSubmit={handleSubmitReview} >

              {/* Star Rating 1: Quality */}
              <div>
                <div >
                  <label >
                    Quality & Craftsmanship
                  </label>
                  <span >★ {reviewForm.qualityRating}/5</span>
                </div>
                <div >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, qualityRating: star })}
                      
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating 2: Punctuality */}
              <div>
                <div >
                  <label >
                    Punctuality & Timeliness
                  </label>
                  <span >★ {reviewForm.punctualityRating}/5</span>
                </div>
                <div >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, punctualityRating: star })}
                      
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating 3: Communication */}
              <div>
                <div >
                  <label >
                    Communication & Professionalism
                  </label>
                  <span >★ {reviewForm.communicationRating}/5</span>
                </div>
                <div >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, communicationRating: star })}
                      
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Review text */}
              <div>
                <label >
                  Your Review / Comments
                </label>
                <textarea className="w-full px-4 py-3.5 bg-gray-100 border-none rounded-xl text-black focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none" 
                  rows={3}
                  required
                  placeholder="Share details about the work done, punctuality, and overall experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  
                />
              </div>

              {/* Action Buttons */}
              <div >
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none"
                  type="button"
                  onClick={() => setReviewingBooking(null)}
                  
                >
                  Cancel
                </button>
                <button className="w-full px-6 py-3.5 font-semibold text-white bg-black rounded-full hover:bg-gray-800 transition-colors shadow-sm cursor-pointer border-none outline-none" 
                  type="submit"
                  disabled={submittingReview}
                  
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review ⭐'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
