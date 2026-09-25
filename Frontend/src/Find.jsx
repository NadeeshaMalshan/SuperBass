import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/progress/circular-progress.js';
import Loader from './components/Loader.jsx';
import UserMenu from './components/UserMenu.jsx';
import './components/M3Navbar.css';
import { API_BASE_URL } from './config.js';

export default function Find() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPicture, setUserPicture] = useState('');

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  });

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
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [selectedMapWorker, setSelectedMapWorker] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const categories = [
    { id: 'Plumbing', label: 'Plumbing', icon: 'plumbing' },
    { id: 'Electrical', label: 'Electrical', icon: 'electrical_services' },
    { id: 'Carpentry', label: 'Carpentry', icon: 'carpenter' },
    { id: 'Masonry', label: 'Masonry', icon: 'foundation' },
    { id: 'Painting', label: 'Painting', icon: 'format_paint' },
    { id: 'AC Repair', label: 'AC Repair', icon: 'ac_unit' },
    { id: 'Appliance Repair', label: 'Appliance Repair', icon: 'home_repair_service' },
    { id: 'Roofing', label: 'Roofing', icon: 'roofing' },
    { id: 'Cleaning', label: 'Cleaning & Maid', icon: 'cleaning_services' },
    { id: 'Gardening', label: 'Lawn & Gardening', icon: 'yard' }
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
    getRealUserLocation();
  }, []);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const [lat, lng] = userLocation;
        const res = await axios.get(`${API_BASE_URL}/workers/search?residentLat=${lat}&residentLng=${lng}`);
        setWorkers(res.data || []);
      } catch (err) {
        console.error('Error fetching workers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkers();
  }, [userLocation]);

  const getFirstName = (name) => {
    if (!name) return 'Account';
    return name.split(' ')[0];
  };

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const hasActiveFilters = rateType !== 'Any' || availableNowOnly || favoritesOnly || minPrice !== '' || maxPrice !== '' || selectedCategories.length > 0 || minRating !== 'Any';

  const handleResetFilters = () => {
    setRateType('Any');
    setAvailableNowOnly(false);
    setFavoritesOnly(false);
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

    // 3.5 Favorites / Starred Only
    if (favoritesOnly && !favorites[w.id]) {
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
    const realDistance = worker.distance != null ? `${worker.distance.toFixed(1)} km away` : 'Distance unknown';

    const rateValue = getWorkerRate(worker, rateType);
    const rateText = rateValue != null ? `Rs. ${rateValue.toLocaleString()}` : 'Negotiable';
    const unitText = rateValue != null ? (rateType === 'Per day' ? '/ day' : '/ hour') : '';

    const primaryRole = worker.skills && worker.skills.length > 0
      ? `${worker.skills[0].skillName} (${worker.skills[0].experienceYears || 1} yrs exp)`
      : (worker.description || 'Verified Home Craftsman');

    return (
      <div
        key={worker.id}
        className={`m3-worker-card ${isSelectedOnMap ? 'selected-map' : ''}`}
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
              <i className="fa-solid fa-location-dot" style={{ color: '#64748b' }}></i>
              <span>{realDistance}</span>
            </div>

            <div className="card-rating-pill">
              <span>{displayRating != null ? `★ ${displayRating}` : 'No rating'}</span>
              {reviewCount > 0 && <span style={{ color: '#92400e', fontWeight: 500 }}>({reviewCount})</span>}
            </div>
          </div>

          {/* Photo Hero Container */}
          <div className="card-photo-container">
            {/* Main Content: Left Rounded Profile Avatar + Right Information */}
            <div className="m3-card-horizontal-wrap">
              {/* Left: Rounded Profile Photo / Avatar */}
              <div className="m3-card-avatar-wrap">
            {worker.profilePicture || worker.profileImage ? (
              <img
                src={worker.profilePicture || worker.profileImage}
                alt={worker.name}
                className="m3-card-avatar-img"
                loading="lazy"
              />
            ) : (
              <div className="m3-card-avatar-fallback">
                <span>{worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}</span>
              </div>
            )}
          </div>

          {/* Right: Worker Details & Chips */}
          <div className="m3-card-info-wrap">
            {/* Header Line: Name, Verified Badge & Favorite Button */}
            <div className="m3-card-header-line">
              <div className="m3-card-title-group">
                <h3 className="m3-card-worker-name">{worker.name}</h3>
                <md-icon className="m3-verified-badge" title="Verified Home Craftsman">verified</md-icon>
              </div>

              <button
                type="button"
                className={`m3-card-fav-btn ${isFavorited ? 'favorited' : ''}`}
                onClick={(e) => toggleFavorite(e, worker.id)}
                title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                aria-label="Save worker to favorites"
              >
                <md-icon>{isFavorited ? 'favorite' : 'favorite_border'}</md-icon>
              </button>
            </div>

            {/* Role / Description */}
            <p className="m3-card-worker-role">{primaryRole}</p>

            {/* Skill Tags */}
            <div className="m3-card-skills-row">
              {worker.skills && worker.skills.length > 0 ? (
                worker.skills.slice(0, 2).map((s, idx) => (
                  <span key={idx} className="m3-skill-pill">
                    {s.skillName}
                  </span>
                ))
              ) : (
                <span className="m3-skill-pill">General Handyman</span>
              )}
            </div>

            {/* Proximity, Rating & Availability Chips */}
            <div className="m3-card-chips-group">
              <span className="m3-card-chip m3-distance-chip" title="Proximity to your current location">
                <md-icon>directions_walk</md-icon>
                <span>{distanceMeters}m ({distanceMins} min)</span>
              </span>

              {displayRating ? (
                <span className="m3-card-chip m3-rating-chip">
                  <md-icon className="m3-star-icon">star</md-icon>
                  <span className="m3-rating-val">{displayRating}</span>
                  {reviewCount > 0 && <span className="m3-rating-count">({reviewCount})</span>}
                </span>
              ) : (
                <span className="m3-card-chip m3-new-chip">New</span>
              )}

              {worker.isAvailable !== false && (
                <span className="m3-card-chip m3-avail-chip">Available</span>
              )}
            </div>
          </div>
        </div>

        {/* Card Footer: Rate Display & Action Button */}
        <div className="m3-card-footer">
          <div className="m3-card-price-group">
            <span className="m3-card-price-label">ESTIMATED RATE</span>
            <div className="m3-card-price-val-wrap">
              <span className="m3-card-price-val">{rateText}</span>
              {unitText && <span className="m3-card-price-unit">{unitText}</span>}
            </div>
          </div>

          <button
            type="button"
            className="m3-card-profile-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/worker-detail?id=${worker.id}`);
            }}
          >
            <span>Profile</span>
            <md-icon>arrow_forward</md-icon>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="find-page-container">
      {/* Google Workspace / Gmail Style Material 3 Top Navbar */}
      <header className="m3-top-navbar">
        {/* Left: App Logo & Name with Hamburger Drawer Toggle */}
        <div className="m3-navbar-brand-group">
          <button
            type="button"
            className="m3-hamburger-btn"
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            title={isSidebarCollapsed ? "Expand panel" : "Collapse panel"}
            aria-label="Toggle navigation drawer"
          >
            <md-icon>menu</md-icon>
          </button>

          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
            className="m3-brand-link"
            title="superබාස් - Home"
          >
            <img src="/icon.png" alt="superබාස්" className="m3-brand-logo-img" />
            <span className="m3-brand-title">
              super<span className="m3-brand-accent">බාස්</span>
            </span>
          </a>
        </div>

        {/* Center: Search Pill ("Ask SuperBass" like "Ask Gmail") */}
        <div className="m3-navbar-center">
          <div className="m3-search-pill">
            <div className="m3-search-leading-icon" title="AI-Powered Discovery">
              <md-icon>search</md-icon>
            </div>

            <input
              type="text"
              className="m3-search-input"
              placeholder="Search workers, skills, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchQuery('');
              }}
            />

            {searchQuery && (
              <button
                type="button"
                className="m3-search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <md-icon>close</md-icon>
              </button>
            )}
          </div>
        </div>

        {/* Right: Navigation Buttons (Community, AI, Messages, Bookings) & User Avatar */}
        <div className="m3-navbar-right">
          {/* 1. Community Button */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/community')}
            title="Community Discussions"
          >
            <md-icon>groups</md-icon>
            <span>Community</span>
          </button>

          {/* 2. AI Assistant Button */}
          <button
            type="button"
            className="m3-nav-btn m3-nav-btn-ai"
            onClick={() => navigate('/ai-chat')}
            title="AI Home Assistant"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <defs>
                <linearGradient id="navGeminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4285F4" />
                  <stop offset="35%" stopColor="#9B72CB" />
                  <stop offset="70%" stopColor="#D96570" />
                  <stop offset="100%" stopColor="#F4B400" />
                </linearGradient>
              </defs>
              <path
                d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
                fill="url(#navGeminiGrad)"
              />
            </svg>
            <span>AI</span>
          </button>

          {/* 3. Messages Button */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/chats')}
            title="Direct Messages"
          >
            <md-icon>chat</md-icon>
            <span>Messages</span>
          </button>

          {/* 4. Bookings Button */}
          <button
            type="button"
            className="m3-nav-btn"
            onClick={() => navigate('/bookings')}
            title="My Bookings"
          >
            <md-icon>calendar_today</md-icon>
            <span>Bookings</span>
          </button>

          {/* 5. User Profile Avatar or Sign In */}
          {isLoggedIn ? (
            <UserMenu variant="m3-google" />
          ) : (
            <button
              type="button"
              className="m3-signin-btn"
              onClick={() => navigate('/join')}
              title="Sign in to superබාස්"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="find-layout">
        {/* Left Sidebar Filters - Google Material Design 3 Navigation Drawer (Gmail Style) */}
        <aside className={`find-sidebar m3-drawer ${isSidebarCollapsed ? 'minimized' : ''}`}>
          {/* Extended Action FAB (Gmail Compose style - Warm SuperBass Yellow) */}

          {/* Primary Navigation List (Inbox / Starred / Available / Top Rated) */}
          <nav className="m3-drawer-nav">
            {/* All Workers (Inbox style) */}
            <div
              className={`m3-drawer-item ${!availableNowOnly && !favoritesOnly && selectedCategories.length === 0 && minRating === 'Any' ? 'active' : ''}`}
              onClick={() => {
                setAvailableNowOnly(false);
                setFavoritesOnly(false);
                setSelectedCategories([]);
                setMinRating('Any');
              }}
              title="View all verified home service workers"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">handyman</md-icon>
                <span className="m3-drawer-label">All Baas</span>
              </div>
              <span className="m3-drawer-badge">{workers.length}</span>
            </div>

            {/* Starred / Saved Baas */}
            <div
              className={`m3-drawer-item ${favoritesOnly ? 'active' : ''}`}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              title="Filter by favorited workers"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">{favoritesOnly ? 'star' : 'star_outline'}</md-icon>
                <span className="m3-drawer-label">Starred</span>
              </div>
              {Object.values(favorites).filter(Boolean).length > 0 && (
                <span className="m3-drawer-badge">{Object.values(favorites).filter(Boolean).length}</span>
              )}
            </div>

            {/* Available Now */}
            <div
              className={`m3-drawer-item ${availableNowOnly ? 'active' : ''}`}
              onClick={() => setAvailableNowOnly(!availableNowOnly)}
              title="Filter by workers currently on call"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">{availableNowOnly ? 'bolt' : 'offline_bolt'}</md-icon>
                <span className="m3-drawer-label">Available Now</span>
              </div>
              <span className="m3-drawer-badge">
                {workers.filter(w => w.isAvailable).length}
              </span>
            </div>

            {/* Top Rated (4.5+ ★) */}
            <div
              className={`m3-drawer-item ${minRating === '4.5' ? 'active' : ''}`}
              onClick={() => setMinRating(minRating === '4.5' ? 'Any' : '4.5')}
              title="Filter workers with 4.5+ star rating"
            >
              <div className="m3-drawer-item-left">
                <md-icon className="m3-drawer-icon">{minRating === '4.5' ? 'workspace_premium' : 'hotel_class'}</md-icon>
                <span className="m3-drawer-label">Top Rated (4.5★)</span>
              </div>
              <span className="m3-drawer-badge">
                {workers.filter(w => (w.overallRating ?? 0) >= 4.5).length}
              </span>
            </div>
          </nav>

          <hr className="m3-drawer-divider" />

          {/* Categories Section ("Labels" in Gmail) */}
          <div className="m3-drawer-section">
            <div className="m3-drawer-section-header">
              <span className="m3-drawer-section-title">Trade Services</span>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  className="m3-drawer-section-action"
                  onClick={() => setSelectedCategories([])}
                  title="Clear category selection"
                >
                  Clear ({selectedCategories.length})
                </button>
              )}
            </div>

            <div className="m3-drawer-labels-list">
              {categories.map((cat) => {
                const count = getCategoryCount(cat.id);
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`m3-drawer-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    title={`Filter by ${cat.label}`}
                  >
                    <div className="m3-drawer-item-left">
                      <md-icon className="m3-drawer-icon">
                        {isSelected ? 'label' : (cat.icon || 'label_outline')}
                      </md-icon>
                      <span className="m3-drawer-label">{cat.label}</span>
                    </div>
                    <span className="m3-drawer-badge">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="m3-drawer-divider" />

          {/* Budget & Rate Filter Section */}
          <div className="m3-drawer-section m3-rates-section">
            <div className="m3-drawer-section-header">
              <span className="m3-drawer-section-title">Rate Type</span>
            </div>

            {/* M3 Segmented Control */}
            <div className="m3-segmented-control">
              {['Any', 'Per day', 'Per hour'].map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`m3-segmented-btn ${rateType === type ? 'active' : ''}`}
                  onClick={() => setRateType(type)}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Interactive Histogram Graph */}
            <div className="histogram-container">
              {[500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000, 6000, 7500, 9000, 12000, 15000, 20000, 25000].map((stepPrice, idx) => {
                const isActive = stepPrice >= minValNum && stepPrice <= maxValNum;
                const heights = [25, 45, 65, 85, 100, 80, 60, 90, 70, 50, 35, 75, 95, 45, 30, 20];
                return (
                  <div
                    key={idx}
                    className={`histogram-bar ${isActive ? 'active' : ''}`}
                    style={{ height: `${heights[idx]}%`, cursor: 'pointer' }}
                    title={`Rs. ${stepPrice.toLocaleString()}`}
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

            {/* Price Inputs Row */}
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
                  placeholder="Rs. 25,000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reset All Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="m3-drawer-reset-btn"
              onClick={handleResetFilters}
            >
              <md-icon>restart_alt</md-icon>
              <span>Reset All Filters</span>
            </button>
          )}
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