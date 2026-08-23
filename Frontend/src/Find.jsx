import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';

export default function Find() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPicture, setUserPicture] = useState('');

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Real User Geolocation State
  const [userLocation, setUserLocation] = useState([6.9271, 79.8612]); // Default Colombo [lat, lng]
  const [isLocating, setIsLocating] = useState(false);
  const [locationName, setLocationName] = useState('My Location');

  // Sidebar Filter States
  const [rateType, setRateType] = useState('Any'); // 'Any' | 'Per day' | 'Per hour'
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minRating, setMinRating] = useState('Any');
  const [sortBy, setSortBy] = useState('recommended');
  const [favorites, setFavorites] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [selectedMapWorker, setSelectedMapWorker] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const categories = [
    { id: 'Plumbing', label: 'Plumbing' },
    { id: 'Electrical', label: 'Electrical' },
    { id: 'Carpentry', label: 'Carpentry' },
    { id: 'Masonry', label: 'Masonry' },
    { id: 'Painting', label: 'Painting' },
    { id: 'AC Repair', label: 'AC Repair' },
    { id: 'Appliance Repair', label: 'Appliance Repair' },
    { id: 'Roofing', label: 'Roofing' },
    { id: 'Cleaning', label: 'Cleaning & Maid' },
    { id: 'Gardening', label: 'Lawn & Gardening' }
  ];

  // Get Real User Location via Geolocation API
  const getRealUserLocation = () => {
    if ('geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const coords = [lat, lng];
          setUserLocation(coords);
          setLocationName('Current Location');
          setIsLocating(false);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(coords, 14);
          }
        },
        (error) => {
          console.warn('Geolocation error or denied:', error);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserName(localStorage.getItem('userName') || '');
    setUserPicture(localStorage.getItem('userPicture') || '');

    // Request Real Location on mount
    getRealUserLocation();

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

  const getFirstName = (name) => {
    if (!name) return 'Account';
    return name.split(' ')[0];
  };

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

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
      return 12000;
    } else {
      if (hr > 0) return hr;
      if (dr > 0) return Math.round(dr / 8);
      return 1500;
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
  const filteredWorkers = workers.filter(w => {
    // 1. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const nameMatch = w.name && w.name.toLowerCase().includes(q);
      const locMatch = w.primaryServiceArea && w.primaryServiceArea.toLowerCase().includes(q);
      const skillMatch = w.skills && w.skills.some(s => s.skillName.toLowerCase().includes(q));
      if (!nameMatch && !locMatch && !skillMatch) return false;
    }

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
    
    if (minPrice !== '' && !isNaN(parseFloat(minPrice))) {
      if (effectivePrice < parseFloat(minPrice)) return false;
    }
    if (maxPrice !== '' && !isNaN(parseFloat(maxPrice))) {
      if (effectivePrice > parseFloat(maxPrice)) return false;
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
      if ((w.overallRating || 5.0) < requiredRating) return false;
    }

    return true;
  }).sort((a, b) => {
    if (sortBy === 'rating') {
      return (b.overallRating || 5.0) - (a.overallRating || 5.0);
    }
    if (sortBy === 'price_asc') {
      return getWorkerRate(a, rateType) - getWorkerRate(b, rateType);
    }
    if (sortBy === 'price_desc') {
      return getWorkerRate(b, rateType) - getWorkerRate(a, rateType);
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
    const displayRating = worker.overallRating ? worker.overallRating.toFixed(1) : '5.0';
    const reviewCount = Math.round((worker.id * 37 + 42) % 150 + 15);
    const distanceMeters = Math.round((worker.id * 85) % 400 + 90);
    const distanceMins = Math.round((worker.id * 2) % 8 + 3);

    const rateValue = getWorkerRate(worker, rateType);
    const rateText = `Rs. ${rateValue.toLocaleString()}`;
    const unitText = rateType === 'Per day' ? '/ day' : '/ hour';

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
              <span>★ {displayRating}</span>
              <span style={{ color: '#92400e', fontWeight: 500 }}>({reviewCount})</span>
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

  return (
    <div className="find-page-container">
      {/* Top Navbar */}
      <header className="navbar" style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }} className="brand-logo" style={{ cursor: 'pointer' }}>
          <img src="/iconWithText-cropped.png" alt="Super Bass Logo" className="brand-logo-img" style={{ height: '40px' }} />
        </a>

        {/* Search Input Bar */}
        <div style={{ flex: 1, maxWidth: '580px', margin: '0 2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            borderRadius: '24px',
            padding: '8px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8', marginRight: '12px' }}></i>
            <input 
              type="text"
              placeholder="Search by worker name, trade skill (e.g. Plumbing), or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#0f172a',
                outline: 'none',
                fontSize: '0.925rem'
              }}
            />
            {searchQuery && (
              <i 
                className="fa-solid fa-xmark" 
                onClick={() => setSearchQuery('')}
                style={{ color: '#94a3b8', cursor: 'pointer' }}
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
                    '--md-sys-color-primary': '#0f172a',
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

      {/* Main Layout Container */}
      <div className="find-layout" style={showMap ? { maxWidth: '100%', padding: '16px 24px' } : {}}>
        {/* Left Sidebar Filters */}
        <aside className="find-sidebar">
          <div className="find-sidebar-header">
            <h2 className="find-sidebar-title">Filter by</h2>
            <button className="find-sidebar-reset" onClick={handleResetFilters}>
              Reset all <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          {/* Filter Group: Rate / Rental Type */}
          <div className="filter-group">
            <div className="filter-group-title">Rate Type</div>
            <div className="rate-chips-container">
              {['Any', 'Per day', 'Per hour'].map((type) => (
                <div 
                  key={type}
                  className={`rate-chip ${rateType === type ? 'active' : ''}`}
                  onClick={() => setRateType(type)}
                >
                  {type}
                </div>
              ))}
            </div>
          </div>

          {/* Filter Group: Available Now Only */}
          <div className="filter-group">
            <div className="toggle-switch-row">
              <span className="toggle-switch-label">Available Now Only</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={availableNowOnly} 
                  onChange={(e) => setAvailableNowOnly(e.target.checked)} 
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Filter Group: Price Range & Histogram */}
          <div className="filter-group">
            <div className="filter-group-title">
              <span>{rateType === 'Per day' ? 'DAILY RATE RANGE' : 'HOURLY RATE RANGE'}</span>
            </div>

            {/* Interactive Histogram Bars */}
            <div className="histogram-container">
              {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7500, 9000, 12000, 15000, 20000, 25000].map((stepPrice, idx) => {
                const isActive = stepPrice >= minValNum && stepPrice <= maxValNum;
                const heights = [25, 45, 65, 85, 100, 80, 60, 90, 70, 50, 35, 75, 95, 45, 30, 20];
                return (
                  <div 
                    key={idx} 
                    className={`histogram-bar ${isActive ? 'active' : ''}`}
                    style={{ height: `${heights[idx]}%`, cursor: 'pointer' }}
                    title={`Rs. ${stepPrice}`}
                    onClick={() => {
                      if (!minPrice || stepPrice < minValNum) {
                        setMinPrice(stepPrice.toString());
                      } else {
                        setMaxPrice(stepPrice.toString());
                      }
                    }}
                  ></div>
                );
              })}
            </div>

            {/* Price Input Range */}
            <div className="price-inputs-row">
              <div className="price-input-box">
                <span className="price-input-label">FROM</span>
                <input 
                  type="number" 
                  className="price-input-val" 
                  placeholder="Rs. 500" 
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>–</span>
              <div className="price-input-box">
                <span className="price-input-label">TO</span>
                <input 
                  type="number" 
                  className="price-input-val" 
                  placeholder="Rs. 10,000" 
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter Group: Service Categories */}
          <div className="filter-group">
            <div className="filter-group-title">Service Trade</div>
            <div className="checkbox-list">
              {categories.map((cat) => {
                const count = getCategoryCount(cat.id);
                const isChecked = selectedCategories.includes(cat.id);
                return (
                  <label key={cat.id} className="custom-checkbox-item">
                    <div className="custom-checkbox-left">
                      <input 
                        type="checkbox" 
                        className="custom-checkbox-input"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat.id)}
                      />
                      <span>{cat.label}</span>
                    </div>
                    <span className="custom-checkbox-count">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Filter Group: Rating */}
          <div className="filter-group">
            <div className="filter-group-title">Minimum Rating</div>
            <div className="checkbox-list">
              {[
                { val: 'Any', label: 'Any Rating' },
                { val: '4.5', label: '★ 4.5 & Above' },
                { val: '4.0', label: '★ 4.0 & Above' },
                { val: '3.5', label: '★ 3.5 & Above' }
              ].map(item => (
                <label key={item.val} className="custom-checkbox-item">
                  <div className="custom-checkbox-left">
                    <input 
                      type="radio" 
                      name="minRatingRadio"
                      className="custom-checkbox-input"
                      checked={minRating === item.val}
                      onChange={() => setMinRating(item.val)}
                    />
                    <span>{item.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Content Area (Spans full width above cards/map) */}
        <main className="find-main" style={{ flex: 1, minWidth: 0 }}>
          {/* Main Controls Header - ALWAYS at top right spanning full width */}
          <div className="find-main-header">
            <h1 className="find-results-title">
              {loading ? 'Searching workers...' : `${filteredWorkers.length} workers available`}
            </h1>

            <div className="find-header-actions">
              <select 
                className="find-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Sort by: Recommended</option>
                <option value="rating">Highest Rated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>

              <button 
                className="find-map-toggle-btn"
                onClick={() => {
                  setShowMap(!showMap);
                  setSelectedMapWorker(null);
                }}
              >
                <span>{showMap ? 'Hide map' : 'Show map'}</span>
                <i className={`fa-solid ${showMap ? 'fa-map' : 'fa-map-location-dot'}`}></i>
              </button>
            </div>
          </div>

          {/* Loading or Empty States */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b', fontSize: '1.1rem' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', marginBottom: '12px', color: '#0f172a' }}></i>
              <p>Loading available verified workers...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px dashed #cbd5e1',
              marginTop: '10px'
            }}>
              <i className="fa-solid fa-user-slash" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '16px' }}></i>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>No Matching Workers Found</h3>
              <p style={{ color: '#64748b', margin: '0 0 20px 0', fontSize: '0.95rem' }}>
                Try adjusting your rate range, price filters, or category selections.
              </p>
              <button 
                onClick={handleResetFilters}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Reset All Filters
              </button>
            </div>
          ) : showMap ? (
            /* Split View Mode: Middle Cards Column + Right Map Pane */
            <div className="find-split-view-container">
              {/* Middle Cards Column */}
              <div className="find-middle-cards-col">
                <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr' }}>
                  {filteredWorkers.map(worker => renderWorkerCard(worker))}
                </div>
              </div>

              {/* Right Map Pane */}
              <aside className="find-map-pane">
                {/* Map Search Input */}
                <div className="map-search-overlay">
                  <i className="fa-solid fa-magnifying-glass" style={{ color: '#94a3b8' }}></i>
                  <input 
                    type="text"
                    placeholder="Search address or workers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.875rem', color: '#0f172a' }}
                  />
                  {isLocating && (
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: '#2563eb', fontSize: '0.9rem' }}></i>
                  )}
                </div>

                {/* Floating Map Worker Card Popup */}
                {selectedMapWorker && (
                  <div className="map-floating-worker-card">
                    <button 
                      className="map-floating-close-btn" 
                      onClick={() => setSelectedMapWorker(null)}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309', background: '#fffbeb', padding: '2px 8px', borderRadius: '12px' }}>
                        ★ {selectedMapWorker.overallRating ? selectedMapWorker.overallRating.toFixed(1) : '5.0'} ({Math.round((selectedMapWorker.id * 37) % 150 + 20)})
                      </div>
                      <button 
                        onClick={(e) => toggleFavorite(e, selectedMapWorker.id)}
                        style={{ background: 'none', border: 'none', color: favorites[selectedMapWorker.id] ? '#ef4444' : '#94a3b8', cursor: 'pointer' }}
                      >
                        <i className={`fa-${favorites[selectedMapWorker.id] ? 'solid' : 'regular'} fa-heart`}></i>
                      </button>
                    </div>

                    <div style={{ width: '100%', height: '110px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                      {selectedMapWorker.profilePicture || selectedMapWorker.profileImage ? (
                        <img 
                          src={selectedMapWorker.profilePicture || selectedMapWorker.profileImage} 
                          alt={selectedMapWorker.name}
                          style={{ maxHeight: '95px', objectFit: 'contain' }}
                        />
                      ) : (
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800 }}>
                          {selectedMapWorker.name ? selectedMapWorker.name.charAt(0).toUpperCase() : 'W'}
                        </div>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 2px 0', fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                      {selectedMapWorker.name}
                    </h4>
                    <p style={{ margin: '0 0 12px 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {selectedMapWorker.skills && selectedMapWorker.skills.length > 0 ? selectedMapWorker.skills[0].skillName : 'General Pro'}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <button 
                        onClick={() => navigate(`/worker-detail?id=${selectedMapWorker.id}`)}
                        style={{
                          flex: 1,
                          background: '#0f172a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Book
                      </button>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        Rs. {getWorkerRate(selectedMapWorker, rateType).toLocaleString()}/h
                      </span>
                    </div>
                  </div>
                )}

                {/* Leaflet Map Canvas Div */}
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                {/* Map Controls */}
                <div className="map-controls-group">
                  <button className="map-control-btn" onClick={handleZoomIn} title="Zoom In">+</button>
                  <button className="map-control-btn" onClick={handleZoomOut} title="Zoom Out">–</button>
                  <button className="map-control-btn" onClick={handleRecenter} title="Find My Real Location">
                    <i className="fa-solid fa-location-crosshairs" style={{ fontSize: '0.85rem', color: isLocating ? '#2563eb' : '#0f172a' }}></i>
                  </button>
                </div>
              </aside>
            </div>
          ) : (
            /* Full Width Grid Mode */
            <div className="worker-cards-grid">
              {filteredWorkers.map(worker => renderWorkerCard(worker))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
