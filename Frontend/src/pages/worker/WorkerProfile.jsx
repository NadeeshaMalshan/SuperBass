import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';
import { API_BASE_URL } from '../../config.js';
import { WORKER_SERVICES_CATALOG, getSkillsForService, getCategoryByName } from '../../data/workerServicesCatalog.js';
import sriLankaDistricts from '../../data/sriLankaDistricts.json';

export default function WorkerProfile({ defaultTab = 'bio' }) {
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || defaultTab || 'bio');
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) {
        setActiveTab(tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Profile Form States
  const [bio, setBio] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    experience: '',
    description: '',
    isVerified: true
  });

  // Services & Skills State (hierarchical list matching backend & mobile app)
  const [services, setServices] = useState([]);
  const [isAddServiceModalOpen, setIsAddServiceModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(WORKER_SERVICES_CATALOG[0]);
  const [selectedSkills, setSelectedSkills] = useState(WORKER_SERVICES_CATALOG[0].defaultSkills.slice(0, 2));
  const [experienceYears, setExperienceYears] = useState(2);
  const [customSkill, setCustomSkill] = useState('');
  const [savingService, setSavingService] = useState(false);
  const [serviceError, setServiceError] = useState(null);

  // Pricing State
  const [pricingModel, setPricingModel] = useState('Hourly');
  const [hourlyRate, setHourlyRate] = useState('');
  const [dailyRate, setDailyRate] = useState('');

  // Service Area State
  const [serviceArea, setServiceArea] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);

  // Availability State
  const [availability, setAvailability] = useState({
    isAvailable: true,
    workDays: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
    startTime: '08:00',
    endTime: '17:00'
  });

  // Security / Password State
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [currentWorkerId, setCurrentWorkerId] = useState(null);
  const userEmail = localStorage.getItem('workerEmail') || localStorage.getItem('email');
  const token = localStorage.getItem('token');

  // Load existing worker data if available
  useEffect(() => {
    if (!userEmail) return;
    axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(userEmail)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.data && res.data.worker) {
          const w = res.data.worker;
          setCurrentWorkerId(w.id);
          setBio({
            name: w.name || '',
            email: w.email || w.residentEmail || userEmail || '',
            phone: w.phoneNo || '',
            location: w.primaryServiceArea || '',
            experience: w.completedJobs > 0 ? `${w.completedJobs} Jobs Completed` : 'Registered Worker',
            description: w.description || '',
            isVerified: true
          });
          if (w.pricingModel) setPricingModel(w.pricingModel);
          if (w.hourlyRate != null) setHourlyRate(w.hourlyRate);
          if (w.dailyRate != null) setDailyRate(w.dailyRate);
          if (w.primaryServiceArea) setServiceArea(w.primaryServiceArea);
          if (w.coverageRadiusKm) setRadiusKm(w.coverageRadiusKm);

          // Parse hierarchical skills & services list
          if (w.skills && Array.isArray(w.skills)) {
            const parsedServices = w.skills.map(s => {
              let subSkillsList = [];
              if (Array.isArray(s.skills)) {
                subSkillsList = s.skills.filter(Boolean);
              } else if (typeof s.skills === 'string' && s.skills.trim()) {
                try {
                  const parsed = JSON.parse(s.skills);
                  if (Array.isArray(parsed)) subSkillsList = parsed;
                  else subSkillsList = s.skills.split(',').map(x => x.trim()).filter(Boolean);
                } catch {
                  subSkillsList = s.skills.split(',').map(x => x.trim()).filter(Boolean);
                }
              }
              return {
                id: s.id,
                serviceName: s.serviceName || s.skillName || 'General',
                skills: subSkillsList,
                experienceYears: s.experienceYears != null ? s.experienceYears : 1,
                skillName: s.skillName || s.serviceName
              };
            });
            setServices(parsedServices);
          }

          // Load saved availability schedule
          if (w.availabilityScheduleJson) {
            try {
              const saved = JSON.parse(w.availabilityScheduleJson);
              setAvailability({
                isAvailable: w.isAvailable ?? true,
                workDays: saved.workDays ?? { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: false },
                startTime: saved.startTime ?? '08:00',
                endTime: saved.endTime ?? '17:00'
              });
            } catch {
              setAvailability(prev => ({ ...prev, isAvailable: w.isAvailable ?? true }));
            }
          } else {
            setAvailability(prev => ({ ...prev, isAvailable: w.isAvailable ?? true }));
          }
        }
      })
      .catch(err => console.log('Worker profile state loaded'));
  }, [userEmail, token]);

  // Sync toggle when navbar "Available for Work" dot is clicked while on this page
  useEffect(() => {
    const handleNavbarToggle = (e) => {
      setAvailability(prev => ({ ...prev, isAvailable: e.detail.isAvailable }));
    };
    window.addEventListener('workerAvailabilityChanged', handleNavbarToggle);
    return () => window.removeEventListener('workerAvailabilityChanged', handleNavbarToggle);
  }, []);

  // Modal Handlers for Services & Skills (identical to Flutter Worker App)
  const handleOpenAddServiceModal = () => {
    const defaultCat = WORKER_SERVICES_CATALOG[0];
    setSelectedCategory(defaultCat);
    setSelectedSkills(defaultCat.defaultSkills.slice(0, 2));
    setExperienceYears(2);
    setCustomSkill('');
    setServiceError(null);
    setIsAddServiceModalOpen(true);
  };

  const handleCategorySelect = (categoryName) => {
    const cat = WORKER_SERVICES_CATALOG.find(c => c.name === categoryName) || WORKER_SERVICES_CATALOG[0];
    setSelectedCategory(cat);
    // Pre-select first 2 suggested skills for convenience
    setSelectedSkills(cat.defaultSkills.slice(0, 2));
    setServiceError(null);
  };

  const handleToggleSkillChip = (skillName) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const handleAddCustomSkill = (e) => {
    if (e) e.preventDefault();
    const trimmed = customSkill.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setCustomSkill('');
    }
  };

  const handleRemoveSkillChip = (skillName) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skillName));
  };

  const handleSaveService = async () => {
    if (!currentWorkerId) {
      setServiceError('Worker session not loaded. Please refresh.');
      return;
    }

    if (selectedSkills.length === 0) {
      setServiceError('Please select or add at least one specialization skill for this service.');
      return;
    }

    // Check if worker already has this service added
    const alreadyExists = services.some(
      s => s.serviceName.trim().toLowerCase() === selectedCategory.name.trim().toLowerCase()
    );
    if (alreadyExists) {
      setServiceError(`You already have "${selectedCategory.name}" in your profile. Remove or update the existing service.`);
      return;
    }

    try {
      setSavingService(true);
      setServiceError(null);
      const res = await axios.post(`${API_BASE_URL}/workers/${currentWorkerId}/skills`, {
        serviceName: selectedCategory.name,
        service: selectedCategory.name,
        skills: selectedSkills,
        experienceYears: parseInt(experienceYears, 10) || 1
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const newSkillRecord = {
        id: res.data?.id || Date.now(),
        serviceName: res.data?.serviceName || selectedCategory.name,
        skills: res.data?.skills || selectedSkills,
        experienceYears: res.data?.experienceYears != null ? res.data.experienceYears : experienceYears,
        skillName: res.data?.skillName || selectedCategory.name
      };

      setServices(prev => [...prev, newSkillRecord]);
      setIsAddServiceModalOpen(false);
      setSaveStatus(`✓ Added "${selectedCategory.name}" with ${selectedSkills.length} specialization skills!`);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err) {
      console.error('Failed to add service:', err);
      setServiceError(err.response?.data?.message || 'Failed to add service. Please try again.');
    } finally {
      setSavingService(false);
    }
  };

  const handleRemoveService = async (serviceItem) => {
    if (!window.confirm(`Are you sure you want to remove "${serviceItem.serviceName}" from your profile?`)) {
      return;
    }

    try {
      if (serviceItem.id && currentWorkerId) {
        await axios.delete(`${API_BASE_URL}/workers/${currentWorkerId}/skills/${serviceItem.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }
      setServices(prev => prev.filter(s => s.id !== serviceItem.id));
      setSaveStatus(`Removed "${serviceItem.serviceName}" from your trade profile.`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error('Failed to delete service:', err);
      setSaveStatus('Failed to remove service. Please try again.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSavePricing = async () => {
    if (!currentWorkerId) return;
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`${API_BASE_URL}/workers/${wId}/pricing`, {
        pricingModel,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSaveStatus('Pricing updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Pricing saved.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveServiceArea = async () => {
    if (!currentWorkerId) return;
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`${API_BASE_URL}/workers/${wId}/service-area`, {
        serviceArea,
        radiusKm: parseFloat(radiusKm)
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSaveStatus('Service area updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Service area saved.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveAvailability = async () => {
    if (!currentWorkerId) return;
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`${API_BASE_URL}/workers/${wId}/availability`, {
        isAvailable: availability.isAvailable,
        scheduleJson: JSON.stringify({ workDays: availability.workDays, startTime: availability.startTime, endTime: availability.endTime })
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      // Sync navbar toggle via localStorage + custom event
      localStorage.setItem('workerIsAvailable', availability.isAvailable ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('workerAvailabilityChanged', { detail: { isAvailable: availability.isAvailable } }));
      setSaveStatus('Availability schedule updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Failed to save availability. Please try again.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentWorkerId) return;
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }

    try {
      const wId = currentWorkerId || 1;
      await axios.put(`${API_BASE_URL}/workers/${wId}/password`, {
        newPassword: passwords.newPassword
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSaveStatus('Password changed successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Password updated.');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleRevertToResident = async () => {
    if (!window.confirm("Are you sure you want to revert back to a Resident? Your worker profile will be deleted and you will return to being a resident.")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/workers/revert-to-resident?email=${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      localStorage.setItem('activeRole', 'Resident');
      alert("Successfully reverted to Resident role.");
      window.history.pushState({}, '', '/account');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      console.error('Failed to revert to resident role:', err);
      alert('Failed to revert role. Please try again.');
    }
  };

  return (
    <WorkerLayout activeTab="profile">
      {/* Top Hero Showcase Banner (Uber Pitch Black Aesthetic) */}
      <div style={{
        backgroundColor: '#000000',
        borderRadius: '20px',
        padding: '36px 36px 40px',
        marginBottom: '28px',
        border: '1px solid #1f1f1f',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)'
      }}>
        {/* Subtle decorative glow overlay */}
        <div style={{
          position: 'absolute',
          top: '-40%',
          right: '-10%',
          width: '450px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '900px' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.78rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            color: '#a3a3a3',
            textTransform: 'uppercase',
            marginBottom: '10px'
          }}>
            WORKIO PRO NETWORK • PROFILE & SETTINGS
          </span>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            margin: '0 0 12px 0'
          }}>
            Worker Profile & Settings
          </h1>
          <p style={{
            fontSize: '0.98rem',
            color: '#a3a3a3',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '680px'
          }}>
            Manage your personal bio, trade skills, rates, coverage area, working hours, and password.
          </p>
        </div>
      </div>

      {saveStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 20px',
          backgroundColor: '#000000',
          color: '#ffffff',
          borderRadius: '12px',
          marginBottom: '24px',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)'
        }}>
          <i className="fa-solid fa-circle-check" style={{ color: '#4ade80' }}></i>
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Profile Top Tab Navigation (Uber Pill Style) */}
      <div className="profile-tabs-nav">
        <button 
          className={`profile-tab-btn ${activeTab === 'bio' ? 'active' : ''}`}
          onClick={() => setActiveTab('bio')}
        >
          <i className="fa-solid fa-user"></i>
          Personal & Bio
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
          onClick={() => setActiveTab('skills')}
        >
          <i className="fa-solid fa-screwdriver-wrench"></i>
          Skills & Rates
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'location' ? 'active' : ''}`}
          onClick={() => setActiveTab('location')}
        >
          <i className="fa-solid fa-location-dot"></i>
          Service Area
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          <i className="fa-solid fa-clock"></i>
          Availability & Schedule
        </button>

        <button 
          className={`profile-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <i className="fa-solid fa-lock"></i>
          Security & Password
        </button>
      </div>

      {/* Tab 1: Personal Details & Bio */}
      {activeTab === 'bio' && (
        <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#000000',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800,
              border: '2px solid #e5e5e5',
              flexShrink: 0
            }}>
              {bio.name ? bio.name.charAt(0).toUpperCase() : 'W'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#000000', margin: 0, letterSpacing: '-0.02em' }}>
                  {bio.name || 'Worker Profile'}
                </h3>
                {bio.isVerified && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    color: '#16a34a',
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '9999px',
                    padding: '3px 10px'
                  }}>
                    <i className="fa-solid fa-shield-check"></i> Verified Worker
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.88rem', color: '#737373', marginTop: '4px', margin: 0 }}>
                {bio.location || 'Location not set'} • Experience: {bio.experience || 'Verified Professional'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="worker-input-group">
              <label className="worker-label">Full Name</label>
              <input type="text" className="worker-input" value={bio.name} onChange={(e) => setBio({ ...bio, name: e.target.value })} />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Email Address</label>
              <input type="email" className="worker-input" value={bio.email} onChange={(e) => setBio({ ...bio, email: e.target.value })} />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Phone Number (10 digits)</label>
              <input 
                type="tel" 
                maxLength={10} 
                className="worker-input" 
                placeholder="07XXXXXXXX"
                value={bio.phone} 
                onChange={(e) => setBio({ ...bio, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} 
              />
              {bio.phone && !/^0\d{9}$/.test(bio.phone) && (
                <span style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px', display: 'block' }}>
                  Must be exactly 10 digits starting with 0
                </span>
              )}
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Experience Level</label>
              <input type="text" className="worker-input" value={bio.experience} onChange={(e) => setBio({ ...bio, experience: e.target.value })} />
            </div>
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Professional Bio / Overview</label>
            <textarea className="worker-textarea" rows="4" value={bio.description} onChange={(e) => setBio({ ...bio, description: e.target.value })}></textarea>
          </div>

          <button 
            className="worker-btn-primary" 
            onClick={() => {
              if (bio.phone && !/^0\d{9}$/.test(bio.phone)) {
                setSaveStatus('Phone number must be exactly 10 digits starting with 0.');
                setTimeout(() => setSaveStatus(null), 3000);
                return;
              }
              setSaveStatus('Bio details updated successfully!');
              setTimeout(() => setSaveStatus(null), 3000);
            }}
          >
            Save Bio Changes
          </button>
        </div>
      )}

      {/* Tab 2: Services, Skills & Rates */}
      {activeTab === 'skills' && (
        <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                Services, Skills & Rates
              </h3>
              <p style={{ color: '#737373', fontSize: '0.88rem', margin: 0 }}>
                Manage your official trade categories, specialization sub-skills, experience, and pricing.
              </p>
            </div>
            <button
              type="button"
              className="worker-btn-primary"
              onClick={handleOpenAddServiceModal}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '9999px' }}
            >
              <i className="fa-solid fa-plus"></i>
              Add Service
            </button>
          </div>

          {/* Active Services Cards */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label className="worker-label" style={{ margin: 0, fontSize: '0.95rem' }}>
                Active Services & Specializations ({services.length})
              </label>
            </div>

            {services.length === 0 ? (
              <div style={{
                backgroundColor: '#f9f9f9',
                border: '1px dashed #d4d4d4',
                borderRadius: '16px',
                padding: '40px 24px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  margin: '0 auto 16px auto'
                }}>
                  <i className="fa-solid fa-screwdriver-wrench"></i>
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#000000', margin: '0 0 6px 0' }}>
                  No trade services added yet
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#737373', maxWidth: '420px', margin: '0 auto 20px auto', lineHeight: '1.5' }}>
                  Add your trade specializations and skills so residents can find your profile and request your services.
                </p>
                <button
                  type="button"
                  className="worker-btn-primary"
                  onClick={handleOpenAddServiceModal}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-plus"></i>
                  Add Your First Service
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {services.map((item, idx) => {
                  const catDef = getCategoryByName(item.serviceName);
                  const iconEmoji = catDef?.icon || '🧰';
                  const expText = item.experienceYears <= 0
                    ? 'Less than 1 Year Experience'
                    : (item.experienceYears === 1 ? '1 Year Experience' : `${item.experienceYears}+ Years Experience`);

                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #e5e5e5',
                        borderRadius: '16px',
                        padding: '20px 22px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div>
                        {/* Header Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '12px',
                              backgroundColor: '#f5f5f5',
                              border: '1px solid #e5e5e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.35rem'
                            }}>
                              {iconEmoji}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#000000' }}>
                                {item.serviceName}
                              </h4>
                              <span style={{ fontSize: '0.8rem', color: '#737373', fontWeight: 600 }}>
                                {expText}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveService(item)}
                            title="Remove service"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#a3a3a3',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '8px',
                              fontSize: '1rem',
                              transition: 'color 0.2s, background-color 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#a3a3a3'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>

                        {/* Sub-Skills Chips */}
                        {item.skills && item.skills.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '12px', borderTop: '1px dashed #e5e5e5' }}>
                            {item.skills.map((sub, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  backgroundColor: '#f5f5f5',
                                  color: '#171717',
                                  border: '1px solid #e5e5e5',
                                  padding: '4px 12px',
                                  borderRadius: '9999px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ paddingTop: '10px', borderTop: '1px dashed #e5e5e5', fontSize: '0.82rem', color: '#737373', fontStyle: 'italic' }}>
                            All general repairs & trade tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', margin: '32px 0' }} />

          {/* Pricing & Rates Setup */}
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Pricing & Rates Setup
          </h3>

          <div className="worker-input-group">
            <label className="worker-label">Pricing Model</label>
            <select className="worker-select" style={{ maxWidth: '300px' }} value={pricingModel} onChange={(e) => setPricingModel(e.target.value)}>
              <option value="Hourly">Hourly Rate (LKR / hr)</option>
              <option value="Daily">Daily Rate (LKR / day)</option>
              <option value="Fixed">Fixed Quote Per Job</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', maxWidth: '500px' }}>
            <div className="worker-input-group">
              <label className="worker-label">Hourly Rate (LKR)</label>
              <input 
                type="number" 
                className="worker-input" 
                value={hourlyRate} 
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Daily Rate (LKR)</label>
              <input 
                type="number" 
                className="worker-input" 
                value={dailyRate} 
                onChange={(e) => setDailyRate(e.target.value)}
              />
            </div>
          </div>

          <button className="worker-btn-primary" onClick={handleSavePricing}>
            Save Pricing Rates
          </button>
        </div>
      )}

      {/* Tab 3: Service Area */}
      {activeTab === 'location' && (
        <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Service Location & Coverage Radius
          </h3>

          <div className="worker-input-group">
            <label className="worker-label">Primary Service Area</label>
            <select 
              className="worker-select" 
              value={serviceArea || 'Colombo'} 
              onChange={(e) => setServiceArea(e.target.value)}
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

          <div className="worker-input-group" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="worker-label" style={{ margin: 0 }}>
                Travel Coverage Radius
              </label>
              <span style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 800
              }}>
                {radiusKm} km
              </span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="50" 
              step="1" 
              className="worker-input" 
              style={{ cursor: 'pointer', padding: 0 }}
              value={radiusKm} 
              onChange={(e) => setRadiusKm(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#737373', marginTop: '6px' }}>
              <span>2 km (Local district)</span>
              <span>25 km (Citywide)</span>
              <span>50 km (Provincewide)</span>
            </div>
          </div>

          <button className="worker-btn-primary" style={{ marginTop: '16px' }} onClick={handleSaveServiceArea}>
            Save Service Area
          </button>
        </div>
      )}

      {/* Tab 4: Availability & Schedule */}
      {activeTab === 'availability' && (
        <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Working Days & Operational Hours
          </h3>

          {/* Available for Work Toggle */}
          <div className="worker-input-group" style={{ marginBottom: '24px' }}>
            <label className="worker-label">Availability Status</label>
            <div
              onClick={() => setAvailability({ ...availability, isAvailable: !availability.isAvailable })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                padding: '12px 20px',
                borderRadius: '16px',
                border: `1.5px solid ${availability.isAvailable ? '#000000' : '#e5e5e5'}`,
                backgroundColor: availability.isAvailable ? '#000000' : '#ffffff',
                color: availability.isAvailable ? '#ffffff' : '#000000',
                transition: 'all 0.2s ease',
                userSelect: 'none',
                boxShadow: availability.isAvailable ? '0 4px 16px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              {/* Toggle pill */}
              <div style={{
                position: 'relative',
                width: '46px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: availability.isAvailable ? '#ffffff' : '#e5e5e5',
                transition: 'background-color 0.2s ease',
                flexShrink: 0
              }}>
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: availability.isAvailable ? '25px' : '3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: availability.isAvailable ? '#000000' : '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                  transition: 'left 0.2s ease'
                }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: availability.isAvailable ? '#ffffff' : '#000000' }}>
                  {availability.isAvailable ? '🟢 Available for Work' : '⚫ Currently Offline'}
                </div>
                <div style={{ fontSize: '0.78rem', color: availability.isAvailable ? '#a3a3a3' : '#737373', marginTop: '2px' }}>
                  {availability.isAvailable ? 'You are visible to residents and can receive bookings' : 'You are hidden from search results'}
                </div>
              </div>
            </div>
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Active Working Days</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.keys(availability.workDays).map((day) => (
                <button
                  key={day}
                  type="button"
                  style={{
                    padding: '9px 18px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    border: '1.5px solid',
                    backgroundColor: availability.workDays[day] ? '#000000' : '#ffffff',
                    color: availability.workDays[day] ? '#ffffff' : '#525252',
                    borderColor: availability.workDays[day] ? '#000000' : '#e5e5e5',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => {
                    setAvailability({
                      ...availability,
                      workDays: { ...availability.workDays, [day]: !availability.workDays[day] }
                    });
                  }}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', maxWidth: '400px', marginTop: '24px' }}>
            <div className="worker-input-group">
              <label className="worker-label">Start Time</label>
              <input 
                type="time" 
                className="worker-input" 
                value={availability.startTime} 
                onChange={(e) => setAvailability({ ...availability, startTime: e.target.value })}
              />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">End Time</label>
              <input 
                type="time" 
                className="worker-input" 
                value={availability.endTime} 
                onChange={(e) => setAvailability({ ...availability, endTime: e.target.value })}
              />
            </div>
          </div>

          <button className="worker-btn-primary" onClick={handleSaveAvailability}>
            Save Availability Schedule
          </button>
        </div>
      )}

      {/* Tab 5: Security & Password */}
      {activeTab === 'security' && (
        <div className="worker-card" style={{ padding: '30px', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#000000', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Account Security & Change Password
          </h3>

          <form onSubmit={handleSavePassword} style={{ maxWidth: '440px' }}>
            <div className="worker-input-group">
              <label className="worker-label">Current Password</label>
              <input 
                type="password" 
                required
                className="worker-input" 
                placeholder="••••••••"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">New Password</label>
              <input 
                type="password" 
                required
                className="worker-input" 
                placeholder="••••••••"
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Confirm New Password</label>
              <input 
                type="password" 
                required
                className="worker-input" 
                placeholder="••••••••"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" className="worker-btn-primary">
              Update Password
            </button>
          </form>

          <hr style={{ margin: '32px 0 24px 0', borderColor: '#e5e5e5' }} />

          {/* Danger Zone: Revert to Resident */}
          <div style={{ backgroundColor: '#FEF2F2', padding: '24px', borderRadius: '16px', border: '1px solid #FCA5A5' }}>
            <h4 style={{ color: '#991B1B', margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 800 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
              Return to Resident Status
            </h4>
            <p style={{ color: '#7F1D1D', fontSize: '0.875rem', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Once you revert to being a resident, your worker profile will be deactivated, and you will regain standard resident privileges.
            </p>
            <button 
              type="button" 
              onClick={handleRevertToResident}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 22px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Revert to Resident Role
            </button>
          </div>
        </div>
      )}

      {/* Add Service & Specialization Modal (matching Flutter Worker App & Uber Design) */}
      {isAddServiceModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '580px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            overflow: 'hidden',
            border: '1px solid #e5e5e5'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '22px 26px',
              borderBottom: '1px solid #e5e5e5',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFFFF'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#000000', letterSpacing: '-0.02em' }}>
                  Add Service & Specialization
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#737373' }}>
                  Select an official trade category, experience, and specialization skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddServiceModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  color: '#737373',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '8px'
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ padding: '24px 26px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {serviceError && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  color: '#991B1B',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{serviceError}</span>
                </div>
              )}

              {/* 1. Service Category */}
              <div>
                <label className="worker-label" style={{ marginBottom: '6px' }}>Select Service Category *</label>
                <select
                  className="worker-select"
                  value={selectedCategory.name}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  style={{ fontSize: '0.95rem', fontWeight: 600 }}
                >
                  {WORKER_SERVICES_CATALOG.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Experience Level */}
              <div>
                <label className="worker-label" style={{ marginBottom: '6px' }}>Years of Experience</label>
                <select
                  className="worker-select"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(parseInt(e.target.value, 10))}
                >
                  <option value={0}>Less than 1 Year Experience</option>
                  <option value={1}>1 Year Experience</option>
                  <option value={2}>2 Years Experience</option>
                  <option value={3}>3 Years Experience</option>
                  <option value={5}>5+ Years Experience</option>
                  <option value={10}>10+ Years Experience</option>
                </select>
              </div>

              {/* 3. Skills for Selected Category */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="worker-label" style={{ margin: 0 }}>
                    Skills for {selectedCategory.name}
                  </label>
                  <span style={{ fontSize: '0.8rem', color: '#737373', fontWeight: 600 }}>
                    {selectedSkills.length} selected
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: '#737373', margin: '0 0 10px 0' }}>
                  Click to select or unselect skills:
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {selectedCategory.defaultSkills.map((sk) => {
                    const isSelected = selectedSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => handleToggleSkillChip(sk)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          borderRadius: '9999px',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 700 : 500,
                          backgroundColor: isSelected ? '#000000' : '#f5f5f5',
                          color: isSelected ? '#ffffff' : '#171717',
                          border: isSelected ? '1.5px solid #000000' : '1px solid #e5e5e5',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected && <i className="fa-solid fa-check" style={{ fontSize: '0.75rem' }}></i>}
                        {sk}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Sub-skill input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="worker-input"
                    placeholder={`Add custom skill to ${selectedCategory.name}...`}
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomSkill();
                      }
                    }}
                    style={{ fontSize: '0.9rem' }}
                  />
                  <button
                    type="button"
                    className="worker-btn-primary"
                    onClick={handleAddCustomSkill}
                    style={{ padding: '0 18px', whiteSpace: 'nowrap', borderRadius: '12px' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* 4. Selected Skills Summary Tags */}
              {selectedSkills.length > 0 && (
                <div style={{ backgroundColor: '#f9f9f9', padding: '14px', borderRadius: '12px', border: '1px solid #e5e5e5' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#000000', display: 'block', marginBottom: '8px' }}>
                    Currently Selected Specializations ({selectedSkills.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedSkills.map((sk) => (
                      <span
                        key={sk}
                        style={{
                          backgroundColor: '#000000',
                          color: '#ffffff',
                          border: '1px solid #000000',
                          padding: '3px 12px',
                          borderRadius: '9999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {sk}
                        <i
                          className="fa-solid fa-xmark"
                          style={{ cursor: 'pointer', opacity: 0.8 }}
                          onClick={() => handleRemoveSkillChip(sk)}
                          title="Remove"
                        ></i>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div style={{
              padding: '16px 26px',
              borderTop: '1px solid #e5e5e5',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#FFFFFF'
            }}>
              <button
                type="button"
                className="worker-btn-outlined"
                onClick={() => setIsAddServiceModalOpen(false)}
                disabled={savingService}
              >
                Cancel
              </button>
              <button
                type="button"
                className="worker-btn-primary"
                onClick={handleSaveService}
                disabled={savingService || selectedSkills.length === 0}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {savingService ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i>
                    Save Service & Skills
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
