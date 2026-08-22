import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

export default function Find() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPicture, setUserPicture] = useState('');

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = [
    { id: 'All', label: 'All Services', icon: 'fa-solid fa-list-check' },
    { id: 'Plumbing', label: 'Plumbing', icon: 'fa-solid fa-faucet-drip' },
    { id: 'Electrical', label: 'Electrical', icon: 'fa-solid fa-bolt' },
    { id: 'Carpentry', label: 'Carpentry', icon: 'fa-solid fa-hammer' },
    { id: 'Masonry', label: 'Masonry', icon: 'fa-solid fa-trowel-bricks' },
    { id: 'Painting', label: 'Painting', icon: 'fa-solid fa-paint-roller' },
    { id: 'AC Repair', label: 'AC Repair', icon: 'fa-solid fa-snowflake' },
    { id: 'Appliance Repair', label: 'Appliance Repair', icon: 'fa-solid fa-screwdriver-wrench' },
    { id: 'Roofing', label: 'Roofing', icon: 'fa-solid fa-house-chimney' }
  ];

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserName(localStorage.getItem('userName') || '');
    setUserPicture(localStorage.getItem('userPicture') || '');

    // Fetch workers from backend API
    const fetchWorkers = async () => {
      try {
        const res = await axios.get('http://localhost:5237/api/workers');
        setWorkers(res.data || []);
      } catch (err) {
        console.error('Error fetching workers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkers();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPicture');
    localStorage.removeItem('email');
    localStorage.removeItem('activeRole');
    setIsLoggedIn(false);
    setShowLogoutPopup(false);
    navigate('/');
  };

  const getFirstName = (name) => {
    if (!name) return 'Account';
    return name.split(' ')[0];
  };

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Filter workers based on Category and Search Query
  const filteredWorkers = workers.filter(w => {
    // Category check
    let matchesCategory = selectedCategory === 'All';
    if (!matchesCategory && w.skills && w.skills.length > 0) {
      matchesCategory = w.skills.some(s => 
        s.skillName.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    } else if (!matchesCategory && w.description) {
      matchesCategory = w.description.toLowerCase().includes(selectedCategory.toLowerCase());
    }

    // Search query check
    let matchesSearch = true;
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const nameMatch = w.name && w.name.toLowerCase().includes(query);
      const locationMatch = w.primaryServiceArea && w.primaryServiceArea.toLowerCase().includes(query);
      const skillMatch = w.skills && w.skills.some(s => s.skillName.toLowerCase().includes(query));
      matchesSearch = nameMatch || locationMatch || skillMatch;
    }

    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Navbar */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#ffffff' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>

        {/* Dynamic Search Input */}
        <div style={{ flex: 1, maxWidth: '550px', margin: '0 2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '8px 20px',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#6b7280', marginRight: '12px' }}></i>
            <input 
              type="text"
              placeholder="Search by worker name, skill (e.g. Plumbing), or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#111827',
                outline: 'none',
                fontSize: '0.95rem'
              }}
            />
            {searchQuery && (
              <i 
                className="fa-solid fa-xmark" 
                onClick={() => setSearchQuery('')}
                style={{ color: '#6b7280', cursor: 'pointer' }}
              ></i>
            )}
          </div>
        </div>

        {/* Nav Actions */}
        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <md-filled-button
                onClick={() => navigate('/community')}
                style={{
                  '--md-sys-color-primary': '#FDC101',
                  '--md-sys-color-on-primary': '#000000',
                  padding: '0 20px',
                  minWidth: '100px',
                  margin: '0 8px'
                }}
              >
                Community
              </md-filled-button>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <md-filled-button
                  onClick={() => navigate('/account')}
                  style={{
                    '--md-sys-color-primary': '#111827',
                    '--md-sys-color-on-primary': '#ffffff',
                    padding: '0 16px',
                    margin: '0 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {userPicture && <img slot="icon" src={userPicture} alt="User" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />}
                  {getFirstName(userName)}
                </md-filled-button>
              </div>
            </>
          ) : (
            <md-filled-button
              onClick={() => navigate('/join')}
              style={{
                '--md-sys-color-primary': '#FDC101',
                '--md-sys-color-on-primary': '#000000',
                padding: '0 24px',
                margin: '0 8px'
              }}
            >
              Join
            </md-filled-button>
          )}
        </div>
      </header>

      {/* Main Header Title & Category Tabs */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 1.5rem 1rem 1.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 8px 0', color: '#111827' }}>
          Find Trusted Local Workers & Pros
        </h1>
        <p style={{ color: '#6b7280', fontSize: '1.05rem', margin: '0 0 24px 0' }}>
          Browse verified craftsmen by category, view trade skills, experience, rates, and book direct.
        </p>

        {/* Category Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          paddingBottom: '12px',
          scrollbarWidth: 'thin'
        }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '30px',
                border: selectedCategory === cat.id ? '1px solid #FDC101' : '1px solid #e5e7eb',
                backgroundColor: selectedCategory === cat.id ? '#FDC101' : '#ffffff',
                color: selectedCategory === cat.id ? '#000000' : '#4b5563',
                fontWeight: selectedCategory === cat.id ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selectedCategory === cat.id ? '0 2px 8px rgba(253,193,1,0.3)' : '0 1px 2px 0 rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              <i className={cat.icon}></i>
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Workers Cards Grid */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 1.5rem 4rem 1.5rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280', fontSize: '1.1rem' }}>
            Loading available workers...
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px dashed #d1d5db',
            marginTop: '20px'
          }}>
            <i className="fa-solid fa-user-slash" style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '16px' }}></i>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>No Workers Found</h3>
            <p style={{ color: '#6b7280', margin: 0 }}>
              No workers match the selected category "{selectedCategory}" or search query.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
          }}>
            {filteredWorkers.map((worker) => (
              <div 
                key={worker.id}
                onClick={() => navigate(`/worker-detail?id=${worker.id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  padding: '24px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.2s, boxShadow 0.2s, borderColor 0.2s',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#93c5fd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {/* Card Top: Avatar, Name & Location */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.5rem',
                        fontWeight: 800
                      }}>
                        {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                          {worker.name}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '3px' }}>
                          <i className="fa-solid fa-location-dot" style={{ color: '#d97706', marginRight: '4px' }}></i>
                          {worker.primaryServiceArea || 'Colombo'}
                        </div>
                      </div>
                    </div>

                    {/* Rating Pill */}
                    <div style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}>
                      ★ {worker.overallRating ? worker.overallRating.toFixed(1) : '5.0'}
                    </div>
                  </div>

                  {/* Trade Skills Badges ("What He Can Do") */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 600 }}>
                      Trade Skills
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {worker.skills && worker.skills.length > 0 ? (
                        worker.skills.map((s, idx) => (
                          <span key={idx} style={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #dbeafe',
                            color: '#1d4ed8',
                            fontSize: '0.8rem',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontWeight: 600
                          }}>
                            {s.skillName} ({s.experienceYears || 1} yrs)
                          </span>
                        ))
                      ) : (
                        <span style={{ backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '0.8rem', padding: '4px 10px', borderRadius: '8px' }}>
                          General Handyman
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bio snippet */}
                  {worker.description && (
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#4b5563',
                      margin: '0 0 16px 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {worker.description}
                    </p>
                  )}
                </div>

                {/* Card Bottom: Rates & View Profile Button */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Hourly Rate</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#d97706' }}>
                        {worker.hourlyRate ? `Rs. ${worker.hourlyRate.toLocaleString()}/hr` : 'Negotiable'}
                      </div>
                    </div>

                    {worker.dailyRate && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Daily Rate</div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>
                          Rs. {worker.dailyRate.toLocaleString()}/day
                        </div>
                      </div>
                    )}
                  </div>

                  <button style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#111827',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}>
                    View Full Profile & Rates →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
