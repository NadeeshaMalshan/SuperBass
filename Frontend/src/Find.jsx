import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import UserMenu from './components/UserMenu.jsx';

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
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', color: '#111827', fontFamily: 'var(--font-body)' }}>
      {/* Global SVG Clip Path for 9-sided Cookie */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <clipPath id="cookieClip" clipPathUnits="objectBoundingBox" transform="scale(1.04) translate(0.02, 0.02) rotate(-90, 0.5, 0.5)">
          <path d="M0.99691 0.5C0.99691 0.51795 0.99072 0.53589 0.97834 0.55042C0.95303 0.58011 0.92773 0.6098 0.90242 0.6395C0.89181 0.65195 0.8854 0.66742 0.8841 0.68373C0.881 0.72262 0.8779 0.76151 0.87479 0.8004C0.87176 0.83845 0.84154 0.86866 0.80349 0.8717C0.7646 0.8748 0.72571 0.8779 0.68683 0.88101C0.67052 0.88231 0.65504 0.88872 0.64259 0.89933C0.6129 0.92463 0.58321 0.94994 0.55351 0.97524C0.52446 1 0.48173 1 0.45268 0.97524C0.42298 0.94994 0.39329 0.92463 0.3636 0.89933C0.35115 0.88872 0.33567 0.88231 0.31936 0.88101C0.28048 0.8779 0.24159 0.8748 0.2027 0.8717C0.16465 0.86866 0.13443 0.83845 0.1314 0.8004C0.12829 0.76151 0.12519 0.72262 0.12209 0.68373C0.12079 0.66742 0.11437 0.65195 0.10377 0.6395C0.07846 0.6098 0.05316 0.58011 0.02785 0.55042C0.00309 0.52137 0.00309 0.47863 0.02785 0.44958C0.05316 0.41989 0.07846 0.3902 0.10377 0.3605C0.11437 0.34805 0.12079 0.33258 0.12209 0.31627C0.12519 0.27738 0.12829 0.23849 0.1314 0.1996C0.13443 0.16155 0.16465 0.13134 0.2027 0.1283C0.24159 0.1252 0.28048 0.1221 0.31936 0.11899C0.33567 0.11769 0.35115 0.11128 0.3636 0.10067C0.39329 0.07537 0.42298 0.05006 0.45268 0.02476C0.48173 0 0.52446 0 0.55351 0.02476C0.58321 0.05006 0.6129 0.07537 0.64259 0.10067C0.65504 0.11128 0.67052 0.11769 0.68683 0.11899C0.72571 0.1221 0.7646 0.1252 0.80349 0.1283C0.84154 0.13134 0.87176 0.16155 0.87479 0.1996C0.8779 0.23849 0.881 0.27738 0.8841 0.31627C0.8854 0.33258 0.89181 0.34805 0.90242 0.3605C0.92773 0.3902 0.95303 0.41989 0.97834 0.44958C0.99072 0.46411 0.99691 0.48205 0.99691 0.5Z" />
        </clipPath>
      </svg>
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

        {/* Category Scroll Row */}
        <div 
          className="category-scroll-container"
          style={{
            display: 'flex',
            gap: '16px',
            paddingBottom: '24px',
            overflowX: 'auto',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none'  // IE and Edge
          }}
        >
          <style>{`
            .category-scroll-container::-webkit-scrollbar {
              display: none; /* Chrome, Safari and Opera */
            }
          `}</style>
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                flexShrink: 0,
                minWidth: '85px',
                opacity: selectedCategory === cat.id || selectedCategory === 'All' ? 1 : 0.6,
                transition: 'all 0.2s ease',
                transform: selectedCategory === cat.id ? 'translateY(-4px)' : 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = selectedCategory === cat.id ? 'translateY(-4px)' : 'none'; e.currentTarget.style.opacity = selectedCategory === cat.id || selectedCategory === 'All' ? '1' : '0.6'; }}
            >
               <div style={{
                  position: 'relative',
                  width: '68px',
                  height: '68px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: selectedCategory === cat.id ? '#b45309' : '#4b5563',
                  fontSize: '1.6rem',
                  transition: 'all 0.2s ease'
               }}>
                  <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 0,
                    transition: 'all 0.2s ease',
                    transform: selectedCategory === cat.id ? 'rotate(15deg) scale(1.05)' : 'none'
                  }} viewBox="0 0 1 1">
                    <path d="M0.99691 0.5C0.99691 0.51795 0.99072 0.53589 0.97834 0.55042C0.95303 0.58011 0.92773 0.6098 0.90242 0.6395C0.89181 0.65195 0.8854 0.66742 0.8841 0.68373C0.881 0.72262 0.8779 0.76151 0.87479 0.8004C0.87176 0.83845 0.84154 0.86866 0.80349 0.8717C0.7646 0.8748 0.72571 0.8779 0.68683 0.88101C0.67052 0.88231 0.65504 0.88872 0.64259 0.89933C0.6129 0.92463 0.58321 0.94994 0.55351 0.97524C0.52446 1 0.48173 1 0.45268 0.97524C0.42298 0.94994 0.39329 0.92463 0.3636 0.89933C0.35115 0.88872 0.33567 0.88231 0.31936 0.88101C0.28048 0.8779 0.24159 0.8748 0.2027 0.8717C0.16465 0.86866 0.13443 0.83845 0.1314 0.8004C0.12829 0.76151 0.12519 0.72262 0.12209 0.68373C0.12079 0.66742 0.11437 0.65195 0.10377 0.6395C0.07846 0.6098 0.05316 0.58011 0.02785 0.55042C0.00309 0.52137 0.00309 0.47863 0.02785 0.44958C0.05316 0.41989 0.07846 0.3902 0.10377 0.3605C0.11437 0.34805 0.12079 0.33258 0.12209 0.31627C0.12519 0.27738 0.12829 0.23849 0.1314 0.1996C0.13443 0.16155 0.16465 0.13134 0.2027 0.1283C0.24159 0.1252 0.28048 0.1221 0.31936 0.11899C0.33567 0.11769 0.35115 0.11128 0.3636 0.10067C0.39329 0.07537 0.42298 0.05006 0.45268 0.02476C0.48173 0 0.52446 0 0.55351 0.02476C0.58321 0.05006 0.6129 0.07537 0.64259 0.10067C0.65504 0.11128 0.67052 0.11769 0.68683 0.11899C0.72571 0.1221 0.7646 0.1252 0.80349 0.1283C0.84154 0.13134 0.87176 0.16155 0.87479 0.1996C0.8779 0.23849 0.881 0.27738 0.8841 0.31627C0.8854 0.33258 0.89181 0.34805 0.90242 0.3605C0.92773 0.3902 0.95303 0.41989 0.97834 0.44958C0.99072 0.46411 0.99691 0.48205 0.99691 0.5Z" 
                      fill={selectedCategory === cat.id ? '#fef3c7' : '#ffffff'} 
                      stroke={selectedCategory === cat.id ? '#fde68a' : '#e2e8f0'} 
                      strokeWidth="0.035" 
                      style={{ transition: 'all 0.2s ease' }}
                    />
                  </svg>
                  <i className={cat.icon} style={{ zIndex: 1 }}></i>
               </div>
               <span style={{
                 fontSize: '0.9rem',
                 fontWeight: selectedCategory === cat.id ? 700 : 500,
                 color: selectedCategory === cat.id ? '#111827' : '#4b5563',
                 textAlign: 'center'
               }}>{cat.label}</span>
            </div>
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
                        position: 'relative',
                        width: '56px',
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '1.5rem',
                        fontWeight: 800
                      }}>
                        {worker.profilePicture ? (
                          <img 
                            src={worker.profilePicture} 
                            alt={worker.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              clipPath: 'url(#cookieClip)',
                              WebkitClipPath: 'url(#cookieClip)',
                              transform: 'rotate(-90deg)' // If the image needs to follow the shape, but usually images shouldn't rotate. However, we rotate the clipPath via the SVG definition or keep it unrotated. Actually, let's keep the image straight.
                            }} 
                          />
                        ) : (
                          <>
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, transform: 'rotate(-90deg)' }} viewBox="-0.02 -0.02 1.04 1.04">
                              <path d="M0.99691 0.5C0.99691 0.51795 0.99072 0.53589 0.97834 0.55042C0.95303 0.58011 0.92773 0.6098 0.90242 0.6395C0.89181 0.65195 0.8854 0.66742 0.8841 0.68373C0.881 0.72262 0.8779 0.76151 0.87479 0.8004C0.87176 0.83845 0.84154 0.86866 0.80349 0.8717C0.7646 0.8748 0.72571 0.8779 0.68683 0.88101C0.67052 0.88231 0.65504 0.88872 0.64259 0.89933C0.6129 0.92463 0.58321 0.94994 0.55351 0.97524C0.52446 1 0.48173 1 0.45268 0.97524C0.42298 0.94994 0.39329 0.92463 0.3636 0.89933C0.35115 0.88872 0.33567 0.88231 0.31936 0.88101C0.28048 0.8779 0.24159 0.8748 0.2027 0.8717C0.16465 0.86866 0.13443 0.83845 0.1314 0.8004C0.12829 0.76151 0.12519 0.72262 0.12209 0.68373C0.12079 0.66742 0.11437 0.65195 0.10377 0.6395C0.07846 0.6098 0.05316 0.58011 0.02785 0.55042C0.00309 0.52137 0.00309 0.47863 0.02785 0.44958C0.05316 0.41989 0.07846 0.3902 0.10377 0.3605C0.11437 0.34805 0.12079 0.33258 0.12209 0.31627C0.12519 0.27738 0.12829 0.23849 0.1314 0.1996C0.13443 0.16155 0.16465 0.13134 0.2027 0.1283C0.24159 0.1252 0.28048 0.1221 0.31936 0.11899C0.33567 0.11769 0.35115 0.11128 0.3636 0.10067C0.39329 0.07537 0.42298 0.05006 0.45268 0.02476C0.48173 0 0.52446 0 0.55351 0.02476C0.58321 0.05006 0.6129 0.07537 0.64259 0.10067C0.65504 0.11128 0.67052 0.11769 0.68683 0.11899C0.72571 0.1221 0.7646 0.1252 0.80349 0.1283C0.84154 0.13134 0.87176 0.16155 0.87479 0.1996C0.8779 0.23849 0.881 0.27738 0.8841 0.31627C0.8854 0.33258 0.89181 0.34805 0.90242 0.3605C0.92773 0.3902 0.95303 0.41989 0.97834 0.44958C0.99072 0.46411 0.99691 0.48205 0.99691 0.5Z" fill="#2563eb" />
                            </svg>
                            <span style={{ zIndex: 1 }}>{worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}</span>
                          </>
                        )}
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

                  <md-filled-button 
                    style={{
                      '--md-sys-color-primary': '#111827',
                      '--md-sys-color-on-primary': '#ffffff',
                      width: '100%',
                      marginTop: '8px',
                      '--md-filled-button-container-shape': '10px'
                    }}
                  >
                    View Full Profile & Rates →
                  </md-filled-button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
