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

<<<<<<< Updated upstream
  // Filter workers based on Category and Search Query
=======
  const handleResetFilters = () => {
    setRateType('Any');
    setAvailableNowOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategories([]);
    setMinRating('Any');
    setSearchQuery('');
    setSortBy('recommended');
  };

  const toggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter(c => c !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const toggleFavorite = (e, workerId) => {
    e.stopPropagation();
    setFavorites(prev => ({
      ...prev,
      [workerId]: !prev[workerId]
    }));
  };

  // Helper to calculate effective worker price for filtering & display
  const getWorkerRate = (w, type) => {
    const hr = parseFloat(w.hourlyRate || w.HourlyRate || 0);
    const dr = parseFloat(w.dailyRate || w.DailyRate || 0);

    if (type === 'Per day') {
      if (dr > 0) return dr;
      if (hr > 0) return hr * 8;
      return null;
    } else {
      if (hr > 0) return hr;
      if (dr > 0) return Math.round(dr / 8);
      return null;
    }
  };

  // Helper to compute map position relative to real user location
  const getWorkerMapPos = (worker) => {
    if (worker.locationLat && worker.locationLng && worker.locationLat !== 0) {
      return [worker.locationLat, worker.locationLng];
    }
    const latOffset = (((worker.id * 7) % 17) - 8) * 0.005;
    const lngOffset = (((worker.id * 13) % 19) - 9) * 0.005;
    return [userLocation[0] + latOffset, userLocation[1] + lngOffset];
  };

  // Category counts calculation
  const getCategoryCount = (catId) => {
    return workers.filter(w => {
      if (w.skills && w.skills.length > 0) {
        return w.skills.some(s => s.skillName.toLowerCase().includes(catId.toLowerCase()));
      }
      return w.description && w.description.toLowerCase().includes(catId.toLowerCase());
    }).length;
  };

  // Filtering Logic
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
    return matchesCategory && matchesSearch;
  });

=======
    // 2. Rate Type
    if (rateType === 'Per hour') {
      if (w.pricingModel === 'Daily' && (!w.hourlyRate || w.hourlyRate === 0)) {
        // valid fallback
      }
    } else if (rateType === 'Per day') {
      if (w.pricingModel === 'Hourly' && (!w.dailyRate || w.dailyRate === 0)) {
        // valid fallback
      }
    }

    // 3. Available Now Only
    if (availableNowOnly && !w.isAvailable) {
      return false;
    }

    // 4. Rate Range Filter
    const effectivePrice = getWorkerRate(w, rateType);
    if (effectivePrice != null) {
      if (minPrice !== '' && !isNaN(parseFloat(minPrice))) {
        if (effectivePrice < parseFloat(minPrice)) return false;
      }
      if (maxPrice !== '' && !isNaN(parseFloat(maxPrice))) {
        if (effectivePrice > parseFloat(maxPrice)) return false;
      }
    }

    // 5. Selected Categories
    if (selectedCategories.length > 0) {
      const matchesAnyCategory = selectedCategories.some(catId => {
        if (w.skills && w.skills.length > 0) {
          return w.skills.some(s => s.skillName.toLowerCase().includes(catId.toLowerCase()));
        }
        return w.description && w.description.toLowerCase().includes(catId.toLowerCase());
      });
      if (!matchesAnyCategory) return false;
    }

    // 6. Rating Filter
    if (minRating !== 'Any') {
      const requiredRating = parseFloat(minRating);
      if ((w.overallRating ?? 0) < requiredRating) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.overallRating ?? 0) - (a.overallRating ?? 0);
    }
    if (sortBy === 'price_asc') {
      const rateA = getWorkerRate(a, rateType) ?? 999999;
      const rateB = getWorkerRate(b, rateType) ?? 999999;
      return rateA - rateB;
    }
    if (sortBy === 'price_desc') {
      const rateA = getWorkerRate(a, rateType) ?? 0;
      const rateB = getWorkerRate(b, rateType) ?? 0;
      return rateB - rateA;
    }
    return 0;
  });

  // Initialize & Update Leaflet Map when showMap is true
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    // Initialize Map if not created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(userLocation, 14);

      // CartoDB Positron sleek light map tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Add Real User Location Marker
    const userMarkerIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="background:#2563eb; color:white; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 14px rgba(37,99,235,0.45); border:3px solid white; position:relative;"><i class="fa-solid fa-location-dot" style="font-size:1.1rem;"></i></div>`,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });
    const userMarker = L.marker(userLocation, { icon: userMarkerIcon })
      .bindPopup(`<b>You (${locationName})</b>`)
      .addTo(map);
    markersRef.current.push(userMarker);

    // Add Worker markers
    filteredWorkers.forEach((worker, idx) => {
      const pos = getWorkerMapPos(worker);
      const isSelected = selectedMapWorker && selectedMapWorker.id === worker.id;
      
      const customIcon = L.divIcon({
        className: 'custom-worker-marker-wrap',
        html: `<div class="custom-worker-marker ${isSelected ? 'selected' : ''}" style="background:${isSelected ? '#2563eb' : '#0f172a'};">${idx + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(pos, { icon: customIcon }).addTo(map);
      marker.on('click', () => {
        setSelectedMapWorker(worker);
        map.panTo(pos);
      });

      markersRef.current.push(marker);
    });

    // Draw route line if a worker is selected
    if (selectedMapWorker) {
      const workerPos = getWorkerMapPos(selectedMapWorker);
      const routePolyline = L.polyline([userLocation, workerPos], {
        color: '#0f172a',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85
      }).addTo(map);

      polylineRef.current = routePolyline;
    }
  }, [showMap, filteredWorkers, selectedMapWorker, userLocation]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    getRealUserLocation();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(userLocation, 14);
      setSelectedMapWorker(null);
    }
  };

  // Histogram calculation values
  const minValNum = parseFloat(minPrice) || 0;
  const maxValNum = parseFloat(maxPrice) || 50000;

  // Render Card Sub-Component for Clean Reuse
  const renderWorkerCard = (worker) => {
    const isFavorited = !!favorites[worker.id];
    const isSelectedOnMap = selectedMapWorker && selectedMapWorker.id === worker.id;
    const displayRating = worker.overallRating != null ? worker.overallRating.toFixed(1) : null;
    const reviewCount = worker.completedJobs || 0;
    const distanceMeters = Math.round((worker.id * 85) % 400 + 90);
    const distanceMins = Math.round((worker.id * 2) % 8 + 3);

    const rateValue = getWorkerRate(worker, rateType);
    const rateText = rateValue != null ? `Rs. ${rateValue.toLocaleString()}` : 'Negotiable';
    const unitText = rateValue != null ? (rateType === 'Per day' ? '/ day' : '/ hour') : '';

    const primaryRole = worker.skills && worker.skills.length > 0 
      ? `${worker.skills[0].skillName} (${worker.skills[0].experienceYears || 1} yrs exp)`
      : (worker.description || 'Verified Home Craftsman');

    return (
      <div 
        key={worker.id}
        className="sleek-worker-card"
        style={{
          borderColor: isSelectedOnMap ? '#2563eb' : '#e2e8f0',
          boxShadow: isSelectedOnMap ? '0 8px 24px rgba(37,99,235,0.15)' : undefined
        }}
        onClick={() => {
          if (showMap) {
            setSelectedMapWorker(worker);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.panTo(getWorkerMapPos(worker));
            }
          } else {
            navigate(`/worker-detail?id=${worker.id}`);
          }
        }}
      >
        {/* Favorite Heart Button */}
        <button 
          className={`card-heart-btn ${isFavorited ? 'favorited' : ''}`}
          onClick={(e) => toggleFavorite(e, worker.id)}
          title="Save to favorites"
        >
          <i className={`fa-${isFavorited ? 'solid' : 'regular'} fa-heart`}></i>
        </button>

        <div>
          {/* Top Card Meta: Distance & Rating */}
          <div className="card-top-meta">
            <div className="card-distance-pill">
              <i className="fa-solid fa-person-walking" style={{ color: '#64748b' }}></i>
              <span>{distanceMeters}m ({distanceMins} min)</span>
            </div>

            <div className="card-rating-pill">
              <span>{displayRating != null ? `★ ${displayRating}` : 'No rating'}</span>
              {reviewCount > 0 && <span style={{ color: '#92400e', fontWeight: 500 }}>({reviewCount})</span>}
            </div>
          </div>

          {/* Photo Hero Banner Container */}
          <div className="card-photo-container">
            {worker.profilePicture || worker.profileImage ? (
              <img 
                src={worker.profilePicture || worker.profileImage} 
                alt={worker.name}
                className="card-photo-img"
              />
            ) : (
              <div className="card-photo-avatar-placeholder">
                {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
              </div>
            )}
          </div>

          {/* Worker Headline Details */}
          <h3 className="card-worker-name">{worker.name}</h3>
          <p className="card-worker-role">{primaryRole}</p>

          {/* Skill Tags */}
          <div className="card-skills-row">
            {worker.skills && worker.skills.length > 0 ? (
              worker.skills.slice(0, 3).map((s, idx) => (
                <span key={idx} className="card-skill-tag">
                  {s.skillName}
                </span>
              ))
            ) : (
              <span className="card-skill-tag">General Handyman</span>
            )}
          </div>
        </div>

        {/* Bottom Row: Price Rate & Action */}
        <div className="card-bottom-row">
          <div className="card-price-display">
            <span className="card-price-amount">{rateText}</span>
            {unitText && <span className="card-price-unit">{unitText}</span>}
          </div>

          <div 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/worker-detail?id=${worker.id}`);
            }}
            style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            Profile <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }}></i>
          </div>
        </div>
      </div>
    );
  };

>>>>>>> Stashed changes
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
