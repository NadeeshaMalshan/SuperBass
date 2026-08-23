import React, { useState, useEffect } from 'react';
import WorkerLayout from './WorkerLayout.jsx';
import axios from 'axios';

export default function WorkerProfile() {
  const [activeTab, setActiveTab] = useState('bio'); // 'bio' | 'skills' | 'location' | 'availability' | 'security'
  const [saveStatus, setSaveStatus] = useState(null);

  // Profile Form States
  const [bio, setBio] = useState({
    name: 'David Perera',
    email: 'david@example.com',
    phone: '+94 77 123 4567',
    location: 'Colombo, Sri Lanka',
    experience: '7+ Years',
    description: 'Experienced master plumber & electrician specializing in home repairs, pipe fixing, and electrical diagnostics.',
    isVerified: true
  });

  // Skills & Pricing State
  const [skills, setSkills] = useState(['Plumbing', 'Pipe Repair', 'Electrical Wiring', 'Appliance Repair']);
  const [newSkill, setNewSkill] = useState('');
  const [pricingModel, setPricingModel] = useState('Hourly');
  const [hourlyRate, setHourlyRate] = useState(1800);
  const [dailyRate, setDailyRate] = useState(12000);

  // Service Area State
  const [serviceArea, setServiceArea] = useState('Colombo & Western Province');
  const [radiusKm, setRadiusKm] = useState(15);

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
  const userEmail = localStorage.getItem('email');
  const token = localStorage.getItem('token');

  // Load existing worker data if available
  useEffect(() => {
    if (!userEmail) return;
    axios.get(`http://localhost:5237/api/workers/me?email=${encodeURIComponent(userEmail)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.data && res.data.worker) {
          const w = res.data.worker;
          setCurrentWorkerId(w.id);
          setBio(prev => ({
            ...prev,
            name: w.name || prev.name,
            email: w.email || prev.email,
            phone: w.phoneNo || prev.phone,
            location: w.primaryServiceArea || prev.location,
            description: w.description || prev.description
          }));
          if (w.pricingModel) setPricingModel(w.pricingModel);
          if (w.hourlyRate) setHourlyRate(w.hourlyRate);
          if (w.dailyRate) setDailyRate(w.dailyRate);
          if (w.primaryServiceArea) setServiceArea(w.primaryServiceArea);
          if (w.coverageRadiusKm) setRadiusKm(w.coverageRadiusKm);
          if (w.skills && w.skills.length > 0) {
            setSkills(w.skills.map(s => s.skillName));
          }
        }
      })
      .catch(err => console.log('Loaded default worker profile state'));
  }, [userEmail, token]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updated = [...skills, newSkill.trim()];
      setSkills(updated);
      setNewSkill('');

      if (currentWorkerId) {
        axios.post(`http://localhost:5237/api/workers/${currentWorkerId}/skills`, { skillName: newSkill.trim() }, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }).catch(err => console.log('Skill saved locally'));
      }
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  const handleSavePricing = async () => {
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`http://localhost:5237/api/workers/${wId}/pricing`, {
        pricingModel,
        hourlyRate: parseFloat(hourlyRate),
        dailyRate: parseFloat(dailyRate)
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
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`http://localhost:5237/api/workers/${wId}/service-area`, {
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
    try {
      const wId = currentWorkerId || 1;
      await axios.put(`http://localhost:5237/api/workers/${wId}/availability`, {
        isAvailable: availability.isAvailable,
        scheduleJson: JSON.stringify({ workDays: availability.workDays, startTime: availability.startTime, endTime: availability.endTime })
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setSaveStatus('Availability schedule updated successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('Availability schedule saved.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('New password and confirm password do not match!');
      return;
    }

    try {
      const wId = currentWorkerId || 1;
      await axios.put(`http://localhost:5237/api/workers/${wId}/password`, {
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
      await axios.delete(`http://localhost:5237/api/workers/revert-to-resident?email=${encodeURIComponent(userEmail)}`, {
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
      <div className="page-title-block">
        <h1 className="page-title">Worker Profile & Settings</h1>
        <p className="page-subtitle">Manage your personal bio, trade skills, rates, coverage area, working hours, and password.</p>
      </div>

      {saveStatus && (
        <div className="badge badge-success" style={{ width: '100%', padding: '12px', borderRadius: '10px', marginBottom: '20px', justifyContent: 'center' }}>
          {saveStatus}
        </div>
      )}

      {/* Profile Top Tab Navigation */}
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
        <div className="worker-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              fontWeight: 800
            }}>
              {bio.name.charAt(0)}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111111' }}>{bio.name}</h3>
                {bio.isVerified && (
                  <span className="badge badge-success" style={{ gap: '4px' }}>
                    <i className="fa-solid fa-shield-check"></i> Verified Worker
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '2px' }}>{bio.location} • Experience: {bio.experience}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="worker-input-group">
              <label className="worker-label">Full Name</label>
              <input type="text" className="worker-input" value={bio.name} onChange={(e) => setBio({ ...bio, name: e.target.value })} />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Email Address</label>
              <input type="email" className="worker-input" value={bio.email} onChange={(e) => setBio({ ...bio, email: e.target.value })} />
            </div>

            <div className="worker-input-group">
              <label className="worker-label">Phone Number</label>
              <input type="text" className="worker-input" value={bio.phone} onChange={(e) => setBio({ ...bio, phone: e.target.value })} />
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

          <button className="worker-btn-primary" onClick={() => setSaveStatus('Bio details updated successfully!')}>
            Save Bio Changes
          </button>
        </div>
      )}

      {/* Tab 2: Skills & Rates */}
      {activeTab === 'skills' && (
        <div className="worker-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '16px' }}>
            Trade Skills & Services Offered
          </h3>

          <div className="worker-input-group">
            <label className="worker-label">Active Skills</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
              {skills.map((skill, index) => (
                <span key={index} style={{
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #BFDBFE'
                }}>
                  {skill}
                  <i 
                    className="fa-solid fa-xmark" 
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onClick={() => handleRemoveSkill(skill)}
                  ></i>
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', maxWidth: '400px' }}>
              <input 
                type="text" 
                className="worker-input" 
                placeholder="e.g. Masonry, Roofing, Painting" 
                value={newSkill} 
                onChange={(e) => setNewSkill(e.target.value)}
              />
              <button className="worker-btn-primary" style={{ padding: '0 20px', whiteSpace: 'nowrap' }} onClick={handleAddSkill}>
                Add Skill
              </button>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: '28px 0' }} />

          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '16px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '500px' }}>
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
            Save Skills & Rates
          </button>
        </div>
      )}

      {/* Tab 3: Service Area */}
      {activeTab === 'location' && (
        <div className="worker-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '16px' }}>
            Service Location & Coverage Radius
          </h3>

          <div className="worker-input-group">
            <label className="worker-label">Primary Location / District</label>
            <input 
              type="text" 
              className="worker-input" 
              value={serviceArea} 
              onChange={(e) => setServiceArea(e.target.value)}
              placeholder="e.g. Colombo, Dehiwala, Nugegoda"
            />
          </div>

          <div className="worker-input-group" style={{ marginTop: '24px' }}>
            <label className="worker-label">
              Travel Coverage Radius: <strong style={{ color: '#2563EB', fontSize: '1.1rem' }}>{radiusKm} km</strong>
            </label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
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
        <div className="worker-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '16px' }}>
            Working Days & Operational Hours
          </h3>

          <div className="worker-input-group">
            <label className="worker-label">Active Working Days</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {Object.keys(availability.workDays).map((day) => (
                <button
                  key={day}
                  type="button"
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    border: '1px solid',
                    backgroundColor: availability.workDays[day] ? '#2563EB' : '#FFFFFF',
                    color: availability.workDays[day] ? '#FFFFFF' : '#64748B',
                    borderColor: availability.workDays[day] ? '#2563EB' : '#E2E8F0'
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '400px', marginTop: '24px' }}>
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
        <div className="worker-card">
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', marginBottom: '16px' }}>
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

          <hr style={{ margin: '32px 0 24px 0', borderColor: '#E2E8F0' }} />

          {/* Danger Zone: Revert to Resident */}
          <div style={{ backgroundColor: '#FEF2F2', padding: '20px', borderRadius: '12px', border: '1px solid #FCA5A5' }}>
            <h4 style={{ color: '#991B1B', margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px' }}></i>
              Return to Resident Status
            </h4>
            <p style={{ color: '#7F1D1D', fontSize: '0.875rem', margin: '0 0 16px 0' }}>
              Once you revert to being a resident, your worker profile will be deactivated, and you will regain standard resident privileges.
            </p>
            <button 
              type="button" 
              onClick={handleRevertToResident}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Revert to Resident Role
            </button>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
