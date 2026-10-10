import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import './Community.css';
import './Find.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/progress/circular-progress.js';
import Loader from './components/Loader.jsx';
import UserMenu from './components/UserMenu.jsx';

import LocationSelector from './components/LocationSelector.jsx';
import './components/M3Navbar.css';
import { API_BASE_URL } from './config.js';
import categoriesData from './data/categories.json';
import sriLankaDistricts from './data/sriLankaDistricts.json';
import { getCoordinatesForCity, matchesWorkerLocation, extractCityFromAddress } from './data/cityCoordinates.js';
import workioLogoWhite from './assets/Workio_Logo/Workio_Logo_White_With_Text.png';
import craftsmanHeroImg from './assets/workersBackgrond.png';
import { useDebouncedValue } from './hooks/useDebouncedValue.js';

export default function Find() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPicture, setUserPicture] = useState('');

  const [workers, setWorkers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('q') || '';
    } catch {
      return '';
    }
  });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useDebouncedValue(searchQuery, 400);
  const [backendTotalWorkers, setBackendTotalWorkers] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentQ = params.get('q') || '';
    if (currentQ !== debouncedSearchQuery) {
      if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
      else params.delete('q');
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? '?' + qs : ''}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [debouncedSearchQuery]);

  const sanitizeLocationParam = (raw) => {
    if (!raw) return '';
    try {
      let cleaned = decodeURIComponent(raw);
      // Remove '%2C', ',', 'LK', '+LK', '+', etc.
      cleaned = cleaned.replace(/%2c/gi, ' ').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
      return cleaned;
    } catch {
      return String(raw).replace(/%2c/gi, ' ').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
    }
  };

  const [locationQuery, setLocationQuery] = useState(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('location');
      if (raw) {
        const sanitized = sanitizeLocationParam(raw);
        return (sanitized.toLowerCase().includes('all') || sanitized === '') ? '' : sanitized;
      }
      return '';
    } catch {
      return '';
    }
  });
  const [appliedLocationQuery, setAppliedLocationQuery] = useState(locationQuery);
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  // Real User Geolocation State (initialized to selected city or Colombo)
  const [userLocation, setUserLocation] = useState(() => {
    return getCoordinatesForCity(locationQuery || 'Colombo');
  });
  const [isLocating, setIsLocating] = useState(false);
  const [locationName, setLocationName] = useState(locationQuery || 'All Sri Lanka');

  // Sidebar Filter States
  const [rateType, setRateType] = useState('Any'); // 'Any' | 'Per day' | 'Per hour'
  const [availableNowOnly, setAvailableNowOnly] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [minRating, setMinRating] = useState('Any');
  const [selectedBadge, setSelectedBadge] = useState('all'); // 'all' | 'verified' | 'top_craftsman'
  const [sortBy, setSortBy] = useState('recommended');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [favorites, setFavorites] = useState({});
  const [showMap, setShowMap] = useState(true);
  const [selectedMapWorker, setSelectedMapWorker] = useState(null);
  const [isHeroBannerVisible, setIsHeroBannerVisible] = useState(true);

  // Worker Cards Grid View Mode: 'large' | 'small' | 'list'
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('find_view_mode') || 'large';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('find_view_mode', mode);
  };

  // Pagination State (9 cards per page)
  const [currentPage, setCurrentPage] = useState(1);
  const WORKERS_PER_PAGE = 9;

  const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);
  const [failedWorkerAvatars, setFailedWorkerAvatars] = useState({});
  const workerDropdownRef = useRef(null);

  const activeRole = localStorage.getItem('activeRole') || 'Resident';
  const isWorker = activeRole.toLowerCase() === 'worker' || localStorage.getItem('workerAuth') === 'true';
  const themePrimary = isWorker ? '#2563EB' : '#FDC101';

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  const categories = categoriesData.map(c => ({
    id: c.name,
    label: c.name,
    icon: c.materialIcon || 'handyman'
  }));

  // Sync state with URL params on popstate or URL changes
  useEffect(() => {
    // Sanitize any existing URL location parameter on initial mount
    try {
      const params = new URLSearchParams(window.location.search);
      const rawLoc = params.get('location');
      if (rawLoc && (rawLoc.includes('%2C') || rawLoc.includes('%2c') || /lk/i.test(rawLoc) || rawLoc.includes(','))) {
        const cleaned = sanitizeLocationParam(rawLoc);
        if (cleaned) {
          params.set('location', cleaned);
        } else {
          params.delete('location');
        }
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      console.warn('Error sanitizing location URL:', e);
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || '';
      const rawLoc = params.get('location') || '';
      const loc = sanitizeLocationParam(rawLoc);
      setSearchQuery(q);
      setDebouncedSearchQuery(q);
      setLocationQuery(loc);
      setAppliedLocationQuery(loc);
      if (loc) {
        const coords = getCoordinatesForCity(loc);
        if (coords) {
          setUserLocation(coords);
          setLocationName(loc);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    const initUserProfileLocation = async () => {
      const token = localStorage.getItem('token');
      const email = localStorage.getItem('email') || localStorage.getItem('workerEmail');
      const activeRole = localStorage.getItem('activeRole') || 'Resident';

      // Check if URL has an explicit location param: if so, user explicitly navigated to it
      const urlParams = new URLSearchParams(window.location.search);
      const urlLoc = urlParams.get('location');
      if (urlLoc) {
        return; // Don't override explicit URL query
      }

      // Check if user is logged in and fetch their account city
      if (email) {
        try {
          let userCity = null;
          let userCoords = null;

          // 1. If worker, check worker profile
          if (activeRole.toLowerCase() === 'worker') {
            const workerRes = await axios.get(`${API_BASE_URL}/workers/me?email=${encodeURIComponent(email)}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const workerData = workerRes.data?.worker;
            if (workerData?.primaryServiceArea) {
              userCity = extractCityFromAddress(workerData.primaryServiceArea) || workerData.primaryServiceArea;
            }
            if (workerData?.locationLat && workerData?.locationLng) {
              userCoords = [workerData.locationLat, workerData.locationLng];
            }
          }

          // 2. If not worker or worker has no primaryServiceArea, check resident profile
          if (!userCity) {
            const residentRes = await axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(email)}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const address = residentRes.data?.address;
            if (address && address.trim()) {
              userCity = extractCityFromAddress(address);
            }
            if (residentRes.data?.locationLat && residentRes.data?.locationLng) {
              userCoords = [residentRes.data.locationLat, residentRes.data.locationLng];
            }
          }

          // If a city is found in user account, auto-pick it!
          if (userCity) {
            setLocationQuery(userCity);
            setAppliedLocationQuery(userCity);
            localStorage.setItem('userCity', userCity);
            localStorage.setItem('community_selected_district', userCity);
            const coords = userCoords || getCoordinatesForCity(userCity);
            if (coords) {
              setUserLocation(coords);
              setLocationName(userCity);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView(coords, 12);
              }
            }
            return;
          }
        } catch (err) {
          console.warn('Could not auto-fetch user account city:', err);
        }
      }

      // Fallback: cached city or real device geolocation
      const cachedCity = localStorage.getItem('userCity') || localStorage.getItem('community_selected_district');
      if (!cachedCity) {
        getRealUserLocation();
      }
    };

    setIsLoggedIn(!!localStorage.getItem('token'));
    setUserName(localStorage.getItem('userName') || '');
    setUserPicture(localStorage.getItem('userPicture') || '');
    getRealUserLocation();

    // Auto-load logged-in resident's home Province/District only if no explicit location param
    const urlParams = new URLSearchParams(window.location.search);
    const hasExplicitLoc = urlParams.has('location') || urlParams.has('province') || urlParams.has('district');
    const userEmail = localStorage.getItem('email');
    const token = localStorage.getItem('token');
    if (userEmail && !hasExplicitLoc) {
      axios.get(`${API_BASE_URL}/residents/${encodeURIComponent(userEmail)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      }).then(res => {
        if (res.data) {
          if (res.data.province) setSelectedProvince(res.data.province);
          if (res.data.district) setSelectedDistrict(res.data.district);
          if (res.data.locationLat && res.data.locationLng) {
            setUserLocation([res.data.locationLat, res.data.locationLng]);
          }
        }
      }).catch(err => {
        console.warn('Could not load resident profile location', err);
      });
    }
  }, []);

  // When appliedLocationQuery changes (user chooses city or clears location)
  useEffect(() => {
    if (appliedLocationQuery && appliedLocationQuery.trim() !== '' && !appliedLocationQuery.toLowerCase().includes('all')) {
      const coords = getCoordinatesForCity(appliedLocationQuery);
      if (coords) {
        setUserLocation(coords);
        setLocationName(appliedLocationQuery);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(coords, 12);
        }
      }
    } else if (!appliedLocationQuery || appliedLocationQuery.toLowerCase().includes('all')) {
      setLocationName('All Sri Lanka');
    }
  }, [appliedLocationQuery]);

  // Close worker search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(e.target)) {
        setIsWorkerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchWorkers = async (abortSignal) => {
      try {
        setLoading(true);
        const [lat, lng] = userLocation;
        const params = {
          residentLat: lat,
          residentLng: lng,
          onlyVerified: false,
          page: currentPage,
          pageSize: WORKERS_PER_PAGE
        };
        if (selectedProvince && selectedProvince !== 'all') {
          params.province = selectedProvince;
        }
        if (selectedDistrict && selectedDistrict !== 'all') {
          params.district = selectedDistrict;
        }
        if (debouncedSearchQuery) {
          params.q = debouncedSearchQuery;
        }
        if (selectedCategories.length > 0) {
          params.skill = selectedCategories[0];
        }
        const res = await axios.get(`${API_BASE_URL}/workers/search`, { 
          params,
          signal: abortSignal 
        });
        setWorkers(res.data || []);
        
        const total = res.headers['x-total-count'];
        if (total) {
          setBackendTotalWorkers(parseInt(total, 10));
        } else {
          setBackendTotalWorkers(res.data?.length || 0);
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('Error fetching workers:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    
    const controller = new AbortController();
    fetchWorkers(controller.signal);

    return () => {
      controller.abort();
    };
  }, [userLocation, selectedProvince, selectedDistrict, debouncedSearchQuery, selectedCategories, currentPage]);

  // Fetch full worker catalog once to enable instantaneous, accurate filter counts across the whole database
  useEffect(() => {
    let isMounted = true;
    const fetchAllWorkers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/workers`);
        if (isMounted && res.data && Array.isArray(res.data)) {
          setAllWorkers(res.data);
        }
      } catch (err) {
        console.warn('Could not fetch all workers for filter counts:', err);
      }
    };
    fetchAllWorkers();
    return () => { isMounted = false; };
  }, []);

  const getInitial = (name) => {
    if (!name) return 'U';
    return name.trim().charAt(0).toUpperCase();
  };

  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const hasActiveFilters =
    rateType !== 'Any' ||
    availableNowOnly ||
    favoritesOnly ||
    minPrice !== '' ||
    maxPrice !== '' ||
    selectedCategories.length > 0 ||
    minRating !== 'Any' ||
    selectedBadge !== 'all' ||
    debouncedSearchQuery !== '' ||
    appliedLocationQuery !== '' ||
    selectedProvince !== 'all' ||
    selectedDistrict !== 'all';

  const handleResetFilters = () => {
    setRateType('Any');
    setAvailableNowOnly(false);
    setFavoritesOnly(false);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCategories([]);
    setMinRating('Any');
    setSelectedBadge('all');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setLocationQuery('');
    setAppliedLocationQuery('');
    setSelectedProvince('all');
    setSelectedDistrict('all');
    setSortBy('recommended');
    setCurrentPage(1);
    navigate('/find');
  };

  // Workers scoped to current geographic & search criteria for sidebar counts (never restricted to current page of 9 items)
  const regionScopedWorkers = useMemo(() => {
    const list = (allWorkers && allWorkers.length > 0) ? allWorkers : workers;
    return list.filter(w => {
      // 1.5 Province & District Filter
      if (selectedProvince && selectedProvince !== 'all') {
        const provDistricts = sriLankaDistricts[selectedProvince] || [];
        const provKey = selectedProvince.toLowerCase().replace(' province', '');
        const matchProv = (w.province && w.province.toLowerCase().includes(provKey)) ||
                          (w.district && provDistricts.some(d => d.toLowerCase() === w.district.toLowerCase())) ||
                          (w.primaryServiceArea && provDistricts.some(d => w.primaryServiceArea.toLowerCase().includes(d.toLowerCase()))) ||
                          (w.description && w.description.toLowerCase().includes(provKey));
        if (!matchProv) return false;
      }

      if (selectedDistrict && selectedDistrict !== 'all') {
        const distLower = selectedDistrict.toLowerCase();
        const matchDist = (w.district && w.district.toLowerCase() === distLower) ||
                          (w.primaryServiceArea && w.primaryServiceArea.toLowerCase().includes(distLower)) ||
                          (w.description && w.description.toLowerCase().includes(distLower));
        if (!matchDist) return false;
      }

      // 1.6 Location Query Filter (PrimaryServiceArea, address, name, city)
      if (appliedLocationQuery.trim() !== '' && !appliedLocationQuery.toLowerCase().includes('all')) {
        if (!matchesWorkerLocation(w, appliedLocationQuery)) {
          return false;
        }
      }

      // Search Query Filter
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        const qLower = debouncedSearchQuery.trim().toLowerCase();
        const matchName = w.name && w.name.toLowerCase().includes(qLower);
        const matchDesc = w.description && w.description.toLowerCase().includes(qLower);
        const matchSkill = w.skills && Array.isArray(w.skills) && w.skills.some(s => {
          const sName = (s.serviceName || s.ServiceName || s.skillName || s.SkillName || '').toLowerCase();
          if (sName.includes(qLower)) return true;
          const subSkills = s.skills || s.Skills;
          if (Array.isArray(subSkills)) {
            return subSkills.some(sub => typeof sub === 'string' && sub.toLowerCase().includes(qLower));
          }
          return false;
        });
        if (!matchName && !matchDesc && !matchSkill) return false;
      }

      return true;
    });
  }, [allWorkers, workers, selectedProvince, selectedDistrict, appliedLocationQuery, debouncedSearchQuery]);

  const verifiedWorkers = regionScopedWorkers.filter(w => w.isVerified || w.verified);
  const starredCount = Object.keys(favorites).filter(id => favorites[id] && regionScopedWorkers.some(w => w.id === Number(id))).length;
  const availableCount = verifiedWorkers.filter(w => w.isAvailable).length;
  const topRatedCount = verifiedWorkers.filter(w => (w.overallRating ?? 0) >= 4.5).length;
  const verifiedCount = verifiedWorkers.length;
  const topCraftsmanCount = verifiedWorkers.filter(w => (w.overallRating ?? 0) >= 4.8).length;

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

  // Category counts calculation across all region-scoped workers
  const getCategoryCount = (catId) => {
    const target = (catId || '').toLowerCase().trim();
    return regionScopedWorkers.filter(w => {
      if (!w.isVerified && !w.verified) return false;

      if (w.skills && Array.isArray(w.skills) && w.skills.length > 0) {
        const hasSkillMatch = w.skills.some(s => {
          const sName = (s.serviceName || s.ServiceName || s.skillName || s.SkillName || '').toLowerCase();
          if (sName === target || sName.includes(target) || target.includes(sName)) return true;

          // Common aliases
          if (target.includes('ac') && sName.includes('air conditioning')) return true;
          if (target.includes('vehicle') && (sName.includes('mechanic') || sName.includes('auto'))) return true;
          if (target.includes('plumb') && sName.includes('pipe')) return true;
          if (target.includes('electr') && sName.includes('wiring')) return true;

          const subSkills = s.skills || s.Skills;
          if (Array.isArray(subSkills)) {
            return subSkills.some(sub => typeof sub === 'string' && (sub.toLowerCase().includes(target) || target.includes(sub.toLowerCase())));
          }
          return false;
        });
        if (hasSkillMatch) return true;
      }

      if (w.description && typeof w.description === 'string') {
        const descLower = w.description.toLowerCase();
        if (descLower.includes(target)) return true;
        if (target.includes('ac') && descLower.includes('air conditioning')) return true;
        if (target.includes('vehicle') && (descLower.includes('mechanic') || descLower.includes('auto'))) return true;
      }

      return false;
    }).length;
  };

  // Filtering Logic
  const filteredWorkers = workers.filter(w => {
    // 0. Verified Badge Filter (when user specifically selects 'verified' from sidebar)
    if (selectedBadge === 'verified') {
      if (!w.isVerified && !w.verified) return false;
    } else if (selectedBadge === 'top_craftsman') {
      if ((w.overallRating ?? 0) < 4.8) return false;
    }

    // 1.5 Province & District Filter
    if (selectedProvince && selectedProvince !== 'all') {
      const provDistricts = sriLankaDistricts[selectedProvince] || [];
      const provKey = selectedProvince.toLowerCase().replace(' province', '');
      const matchProv = (w.province && w.province.toLowerCase().includes(provKey)) ||
                        (w.district && provDistricts.some(d => d.toLowerCase() === w.district.toLowerCase())) ||
                        (w.primaryServiceArea && provDistricts.some(d => w.primaryServiceArea.toLowerCase().includes(d.toLowerCase()))) ||
                        (w.description && w.description.toLowerCase().includes(provKey));
      if (!matchProv) return false;
    }

    if (selectedDistrict && selectedDistrict !== 'all') {
      const distLower = selectedDistrict.toLowerCase();
      const matchDist = (w.district && w.district.toLowerCase() === distLower) ||
                        (w.primaryServiceArea && w.primaryServiceArea.toLowerCase().includes(distLower)) ||
                        (w.description && w.description.toLowerCase().includes(distLower));
      if (!matchDist) return false;
    }

    // 1.6 Location Query Filter (PrimaryServiceArea, address, name, city)
    if (appliedLocationQuery.trim() !== '' && !appliedLocationQuery.toLowerCase().includes('all')) {
      if (!matchesWorkerLocation(w, appliedLocationQuery)) {
        return false;
      }
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

    // 3.6 Badges Filter
    if (selectedBadge === 'verified') {
      if (!w.isVerified && !w.verified) return false;
    } else if (selectedBadge === 'top_craftsman') {
      if ((w.overallRating ?? 0) < 4.8) return false;
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

  // Reset pagination to page 1 whenever any filter or sort option changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchQuery,
    appliedLocationQuery,
    rateType,
    availableNowOnly,
    favoritesOnly,
    minPrice,
    maxPrice,
    selectedCategories,
    minRating,
    selectedBadge,
    selectedProvince,
    selectedDistrict,
    sortBy
  ]);

  // Pagination calculations (9 cards per page)
  const totalWorkers = backendTotalWorkers;
  const totalPages = Math.ceil(totalWorkers / WORKERS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  // Since we fetch only WORKERS_PER_PAGE from backend, filteredWorkers is the current page.
  // Note: Client-side filters might further reduce this page's items, but we don't slice again.
  const startIndex = (safeCurrentPage - 1) * WORKERS_PER_PAGE;
  const paginatedWorkers = filteredWorkers;

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const feedElement = document.getElementById('find-search-main') || document.querySelector('.worker-cards-grid');
    if (feedElement) {
      feedElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="uber-pagination-container">
        <button
          type="button"
          className="uber-pagination-btn"
          onClick={() => handlePageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          aria-label="Previous Page"
        >
          <i className="fa-solid fa-chevron-left"></i>
          <span>Prev</span>
        </button>

        <div className="uber-pagination-pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
            if (
              pageNum === 1 ||
              pageNum === totalPages ||
              (pageNum >= safeCurrentPage - 1 && pageNum <= safeCurrentPage + 1)
            ) {
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`uber-pagination-num ${safeCurrentPage === pageNum ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            } else if (
              pageNum === safeCurrentPage - 2 ||
              pageNum === safeCurrentPage + 2
            ) {
              return <span key={pageNum} className="uber-pagination-ellipsis">...</span>;
            }
            return null;
          })}
        </div>

        <button
          type="button"
          className="uber-pagination-btn"
          onClick={() => handlePageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          aria-label="Next Page"
        >
          <span>Next</span>
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  // Initialize & Update Leaflet Map when showMap is true
  useEffect(() => {
    if (!showMap || !mapContainerRef.current) return;

    // Initialize Map if not created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(userLocation, 13);

      // Standard Leaflet OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 150);

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
      html: `<div style="background:#000000; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border:3px solid white; position:relative;"><span class="material-symbols-outlined" style="font-size:18px; color:white; font-family:'Material Symbols Outlined', 'Material Icons', sans-serif;">my_location</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
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
        html: `<div class="custom-worker-marker ${isSelected ? 'selected' : ''}" style="background:${isSelected ? '#2563eb' : '#000000'}; width:28px; height:28px; line-height:28px; font-size:0.75rem; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);">${idx + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
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
        color: '#000000',
        weight: 3,
        dashArray: '6, 8',
        opacity: 0.85
      }).addTo(map);

      polylineRef.current = routePolyline;
    }
  }, [showMap, filteredWorkers, selectedMapWorker, userLocation]);

  // Clean up map instance when showMap is toggled off
  useEffect(() => {
    if (!showMap && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, [showMap]);

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
        {/* Main Content: Left Rounded Profile Avatar + Right Information */}
        <div className="m3-card-horizontal-wrap">
          {/* Left: Rounded Profile Photo / Avatar */}
          <div className="m3-card-avatar-wrap">
            {(worker.profilePicture || worker.profileImage) && !failedWorkerAvatars[worker.id] ? (
              <img
                src={worker.profilePicture || worker.profileImage}
                alt={worker.name}
                className="m3-card-avatar-img"
                loading="lazy"
                onError={() => setFailedWorkerAvatars(prev => ({ ...prev, [worker.id]: true }))}
                referrerPolicy="no-referrer"
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
                {(worker.isVerified || worker.verified) && (
                  <md-icon className="m3-verified-badge" title="Verified Home Craftsman">verified</md-icon>
                )}
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
                <span>{realDistance}</span>
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

  const handleStartChatWithWorker = (w) => {
    setIsWorkerDropdownOpen(false);
    navigate(`/chats`);
  };

  // Render Worker Search Results Dropdown inside Top Navbar
  const renderWorkerSearchDropdown = () => {
    if (!isWorkerDropdownOpen || !searchQuery.trim()) return null;

    // The dropdown uses the live searchQuery, not the debouncedSearchQuery
    const dropdownWorkers = workers.filter(w => {
      if (!w.isVerified && !w.verified) return false;
      const q = searchQuery.toLowerCase();
      const nameMatch = w.name && w.name.toLowerCase().includes(q);
      const locMatch = w.primaryServiceArea && w.primaryServiceArea.toLowerCase().includes(q);
      const skillMatch = w.skills && w.skills.some(s => s.skillName.toLowerCase().includes(q));
      return nameMatch || locMatch || skillMatch;
    });

    const matchingWorkers = dropdownWorkers;

    return (
      <div className="m3-search-dropdown" ref={workerDropdownRef}>
        <div className="m3-search-dropdown-header">

          <span className="m3-dropdown-hint">Press ↵ Enter to view all</span>
        </div>

        <div className="m3-search-dropdown-list">
          {matchingWorkers.length === 0 ? (
            <div className="m3-search-dropdown-empty">
              <md-icon style={{ fontSize: '42px', color: '#94a3b8', marginBottom: '8px' }}>search_off</md-icon>
              <h4>No verified workers found</h4>
              <p>No craftsmen match "{searchQuery}". Try another skill or location.</p>
              <div style={{ marginTop: '12px' }}>
                <md-filled-button
                  onClick={() => {
                    setIsWorkerDropdownOpen(false);
                    setDebouncedSearchQuery(searchQuery);
                    navigate(`/find?q=${encodeURIComponent(searchQuery)}`);
                  }}
                  style={{
                    '--md-sys-color-primary': themePrimary,
                    '--md-filled-button-container-color': themePrimary,
                    '--md-filled-button-label-text-color': isWorker ? '#ffffff' : '#111827',
                    '--md-filled-button-container-shape': '9999px',
                    '--md-filled-button-container-height': '36px'
                  }}
                >
                  <md-icon slot="icon">explore</md-icon>
                  Browse Services Directory
                </md-filled-button>
              </div>
            </div>
          ) : (
            matchingWorkers.slice(0, 8).map(w => {
              const primarySkill = Array.isArray(w.skills) && w.skills.length > 0
                ? (typeof w.skills[0] === 'string' ? w.skills[0] : w.skills[0]?.skillName)
                : null;

              const avatarUrl = w.profileImage && w.profileImage !== 'null' && w.profileImage.trim() !== ''
                ? (w.profileImage.startsWith('http') ? w.profileImage : `${API_BASE_URL.replace('/api', '')}${w.profileImage.startsWith('/') ? '' : '/'}${w.profileImage}`)
                : null;

              const ratingVal = typeof w.overallRating === 'number' ? w.overallRating.toFixed(1) : '5.0';

              return (
                <div
                  key={w.id}
                  className="m3-navbar-worker-card"
                  onClick={() => handleStartChatWithWorker(w)}
                >
                  <div className="m3-navbar-worker-avatar-wrap">
                    {avatarUrl && !failedWorkerAvatars[w.id] ? (
                      <img
                        src={avatarUrl}
                        alt={w.name}
                        className="m3-navbar-worker-avatar-img"
                        onError={() => setFailedWorkerAvatars(prev => ({ ...prev, [w.id]: true }))}
                      />
                    ) : (
                      <div className="m3-navbar-worker-avatar-fallback">
                        {getInitial(w.name)}
                      </div>
                    )}
                  </div>

                  <div className="m3-navbar-worker-info">
                    <div className="m3-navbar-worker-header">
                      <span className="m3-navbar-worker-name">{w.name}</span>
                      {(w.isVerified || w.verified) && (
                        <md-icon className="m3-navbar-verified-icon">verified</md-icon>
                      )}
                      {primarySkill && (
                        <span className="m3-navbar-trade-tag">
                          <md-icon>handyman</md-icon>
                          <span>{primarySkill}</span>
                        </span>
                      )}
                    </div>

                    <div className="m3-navbar-worker-chips">
                      <span className="m3-navbar-chip rating">
                        <md-icon>star</md-icon>
                        <span>{ratingVal}</span>
                      </span>

                      {w.primaryServiceArea && (
                        <span className="m3-navbar-chip location">
                          <md-icon>location_on</md-icon>
                          <span>{w.primaryServiceArea}</span>
                        </span>
                      )}

                      <span className={`m3-navbar-chip status ${w.isAvailable ? 'available' : 'busy'}`}>
                        <span className="m3-navbar-status-pulse"></span>
                        <span>{w.isAvailable ? 'Available' : 'Busy'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="m3-navbar-worker-actions" onClick={(e) => e.stopPropagation()}>
                    <md-outlined-button
                      className="m3-navbar-btn-profile"
                      onClick={() => {
                        setIsWorkerDropdownOpen(false);
                        navigate(`/worker-detail?id=${w.id}`);
                      }}
                    >
                      <md-icon slot="icon">person</md-icon>
                      Profile
                    </md-outlined-button>

                    <md-filled-button
                      className="m3-navbar-btn-chat"
                      onClick={() => handleStartChatWithWorker(w)}
                    >
                      <md-icon slot="icon">chat</md-icon>
                      Chat
                    </md-filled-button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {matchingWorkers.length > 0 && (
          <div className="m3-search-dropdown-footer">
            <button
              type="button"
              className="m3-search-dropdown-footer-link"
              onClick={() => {
                setIsWorkerDropdownOpen(false);
                setDebouncedSearchQuery(searchQuery);
                navigate(`/find?q=${encodeURIComponent(searchQuery)}`);
              }}
            >
              <span>Explore all {matchingWorkers.length} matching workers in Directory</span>
              <md-icon>arrow_forward</md-icon>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="community-page-wrapper">
      {/* Sleek Dark Top Navbar (Uber Pitch Black Aesthetic) */}
      

      {/* 1. Craftsmen Hero Showcase Banner (Uber Pitch Black Aesthetic) */}
      {isHeroBannerVisible && (
        <section className="community-hero-banner">
          <button
            type="button"
            className="community-hero-close-btn"
            onClick={() => setIsHeroBannerVisible(false)}
            title="Close banner"
            aria-label="Close banner"
          >
            <md-icon>close</md-icon>
          </button>
          <div className="community-hero-container">
            <div className="community-hero-left">
              <span className="community-hero-overline">Workio Verified Craftsmen Directory</span>
              <h1 className="community-hero-title">
                Find Trusted Local Workers & Service Specialists
              </h1>
              <p className="community-hero-desc">
                Browse verified technicians, read neighborhood reviews, compare hourly & daily rates, check real-time availability, and hire top-rated craftsmen across Sri Lanka.
              </p>
              <div className="community-hero-actions">
                <button
                  type="button"
                  className="community-hero-primary-btn"
                  onClick={() => {
                    const el = document.getElementById('find-search-main');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                  <span>Explore All Workers</span>
                </button>
                <button
                  type="button"
                  className="community-hero-secondary-btn"
                  onClick={() => navigate(localStorage.getItem('token') ? '/ai/chat' : '/join')}
                >
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  <span>Ask Workio AI</span>
                </button>
              </div>
            </div>

            <div className="community-hero-right">
              <div className="community-hero-artwork-card">
                <img
                  src={craftsmanHeroImg}
                  alt="Workio Verified Craftsmen"
                  className="community-hero-artwork-img"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Main Content Layout Container */}
      <div className="community-layout-container find-layout-container">
        {/* Left Sidebar Navigation (Uber Style matching Community) */}
        <aside className={`community-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>

          {/* Location Filter Section: Landing Page Style with Sidebar Map */}
          <div className="uber-sidebar-section">
            <div className="uber-sidebar-section-title">
              <span>Location</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="uber-sidebar-clear-btn"
                  onClick={() => {
                    setShowMap(!showMap);
                    setSelectedMapWorker(null);
                  }}
                  title={showMap ? "Hide Map in Sidebar" : "Show Map in Sidebar"}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <md-icon style={{ fontSize: '14px' }}>{showMap ? 'visibility_off' : 'map'}</md-icon>
                  <span>{showMap ? 'Hide map' : 'Map'}</span>
                </button>

                {(appliedLocationQuery || selectedProvince !== 'all' || selectedDistrict !== 'all') && (
                  <button
                    type="button"
                    className="uber-sidebar-clear-btn"
                    onClick={() => {
                      setLocationQuery('');
                      setAppliedLocationQuery('');
                      setSelectedProvince('all');
                      setSelectedDistrict('all');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('location');
                      const qs = params.toString();
                      navigate(qs ? `/find?${qs}` : '/find');
                    }}
                    title="Clear location filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="location-selector-wrap" style={{ padding: '6px 8px 6px', position: 'relative', zIndex: 1200 }}>
              <LocationSelector
                location={appliedLocationQuery || (selectedDistrict !== 'all' ? selectedDistrict : (selectedProvince !== 'all' ? selectedProvince : 'All Sri Lanka'))}
                onChange={(newLoc) => {
                  const isAll = !newLoc || newLoc.toLowerCase().includes('all');
                  if (isAll) {
                    setLocationQuery('');
                    setAppliedLocationQuery('');
                    setSelectedProvince('all');
                    setSelectedDistrict('all');
                    localStorage.removeItem('community_selected_district');
                    const params = new URLSearchParams(window.location.search);
                    params.delete('location');
                    const newQs = params.toString();
                    navigate(newQs ? `/find?${newQs}` : '/find');
                    return;
                  }
                  setLocationQuery(newLoc);
                  setAppliedLocationQuery(newLoc);
                  localStorage.setItem('community_selected_district', newLoc);
                  const coords = getCoordinatesForCity(newLoc);
                  if (coords) {
                    setUserLocation(coords);
                    setLocationName(newLoc);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView(coords, 12);
                    }
                  }
                  const params = new URLSearchParams(window.location.search);
                  params.set('location', newLoc);
                  const newQs = params.toString();
                  navigate(newQs ? `/find?${newQs}` : '/find');
                }}
              />
            </div>

            {/* Province & District Dropdown Selectors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '6px 8px 12px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  Province
                </label>
                <select
                  className="uber-sidebar-select"
                  value={selectedProvince}
                  onChange={(e) => {
                    const newProv = e.target.value;
                    setSelectedProvince(newProv);
                    setSelectedDistrict('all');
                    if (newProv === 'all') {
                      setLocationQuery('');
                      setAppliedLocationQuery('');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('location');
                      const qs = params.toString();
                      navigate(qs ? `/find?${qs}` : '/find');
                    }
                  }}
                >
                  <option value="all">All Sri Lanka Provinces</option>
                  {Object.keys(sriLankaDistricts).map((prov) => (
                    <option key={prov} value={prov}>{prov}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#737373', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  District
                </label>
                <select
                  className="uber-sidebar-select"
                  value={selectedDistrict}
                  onChange={(e) => {
                    const newDist = e.target.value;
                    setSelectedDistrict(newDist);
                    if (newDist === 'all' && selectedProvince === 'all') {
                      setLocationQuery('');
                      setAppliedLocationQuery('');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('location');
                      const qs = params.toString();
                      navigate(qs ? `/find?${qs}` : '/find');
                    } else if (newDist !== 'all') {
                      setLocationQuery(newDist);
                      setAppliedLocationQuery(newDist);
                    }
                  }}
                >
                  <option value="all">
                    {selectedProvince !== 'all' ? `All ${selectedProvince} Districts` : 'All 25 Districts'}
                  </option>
                  {(selectedProvince !== 'all'
                    ? (sriLankaDistricts[selectedProvince] || [])
                    : Object.values(sriLankaDistricts).flat()
                  ).map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Map in Left Sidebar */}
            {showMap && (
              <div className="sidebar-map-wrapper">
                <div className="sidebar-map-container">
                  {/* Map Header Status Badge */}
                  <div className="sidebar-map-badge">
                    <span className="pulse-dot"></span>
                    <span>{totalWorkers} near {appliedLocationQuery || 'you'}</span>
                  </div>

                  {/* Leaflet Map Canvas */}
                  <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                  {/* Map Controls */}
                  <div className="sidebar-map-controls">
                    <button type="button" className="sidebar-map-btn" onClick={handleZoomIn} title="Zoom In">+</button>
                    <button type="button" className="sidebar-map-btn" onClick={handleZoomOut} title="Zoom Out">–</button>
                    <button type="button" className="sidebar-map-btn" onClick={handleRecenter} title="Find My Location">
                      <md-icon style={{ fontSize: '16px', color: isLocating ? '#2563eb' : '#000000' }}>my_location</md-icon>
                    </button>
                  </div>

                  {/* Floating Map Worker Card Popup when a pin is clicked */}
                  {selectedMapWorker && (
                    <div className="sidebar-map-popup-card">
                      <button
                        type="button"
                        className="popup-close"
                        onClick={() => setSelectedMapWorker(null)}
                        aria-label="Close"
                      >
                        <md-icon style={{ fontSize: '15px' }}>close</md-icon>
                      </button>

                      <div className="popup-worker-info">
                        {selectedMapWorker.profilePicture || selectedMapWorker.profileImage ? (
                          <img
                            src={selectedMapWorker.profilePicture || selectedMapWorker.profileImage}
                            alt={selectedMapWorker.name}
                            className="popup-avatar"
                          />
                        ) : (
                          <div className="popup-avatar">
                            {selectedMapWorker.name ? selectedMapWorker.name.charAt(0).toUpperCase() : 'W'}
                          </div>
                        )}
                        <div className="popup-details">
                          <h4 className="popup-name" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {selectedMapWorker.name}
                            {(selectedMapWorker.isVerified || selectedMapWorker.verified) && (
                              <md-icon style={{ fontSize: '16px', color: '#000000' }}>verified</md-icon>
                            )}
                          </h4>
                          <p className="popup-skill">
                            ★ {selectedMapWorker.overallRating ? selectedMapWorker.overallRating.toFixed(1) : '5.0'} • {selectedMapWorker.skills && selectedMapWorker.skills.length > 0 ? selectedMapWorker.skills[0].skillName : 'Worker'}
                          </p>
                        </div>
                      </div>

                      <div className="popup-actions">
                        <span className="popup-price">
                          Rs. {getWorkerRate(selectedMapWorker, rateType)?.toLocaleString() || '0'}/h
                        </span>
                        <button
                          type="button"
                          className="popup-view-btn"
                          onClick={() => navigate(`/worker-detail?id=${selectedMapWorker.id}`)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Worker Status Section */}
          <div className="uber-sidebar-section worker-status-section">
            <div className="uber-sidebar-section-title">
              <span>Worker Status</span>
            </div>

            <div className="uber-cat-list">
              {/* All Baas */}
              <div
                className={`uber-sidebar-item ${!availableNowOnly && !favoritesOnly && minRating === 'Any' && selectedBadge === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setAvailableNowOnly(false);
                  setFavoritesOnly(false);
                  setMinRating('Any');
                  setSelectedBadge('all');
                }}
                title="View all verified home service workers"
              >
                <div className="uber-sidebar-item-left">
                  <md-icon>engineering</md-icon>
                  <span>All Baas</span>
                </div>
                <span className="uber-sidebar-badge">{verifiedWorkers.length}</span>
              </div>

              {/* Verified Workers */}
              <div
                className={`uber-sidebar-item ${selectedBadge === 'verified' ? 'active' : ''}`}
                onClick={() => setSelectedBadge(selectedBadge === 'verified' ? 'all' : 'verified')}
                title="Filter by verified workers"
              >
                <div className="uber-sidebar-item-left">
                  <md-icon>verified</md-icon>
                  <span>Verified</span>
                </div>
                <span className="uber-sidebar-badge">{verifiedCount}</span>
              </div>

              {/* Starred / Saved Baas */}
              <div
                className={`uber-sidebar-item ${favoritesOnly ? 'active' : ''}`}
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                title="Filter by favorited workers"
              >
                <div className="uber-sidebar-item-left">
                  <md-icon>{favoritesOnly ? 'star' : 'star_outline'}</md-icon>
                  <span>Starred</span>
                </div>
                <span className="uber-sidebar-badge">{starredCount}</span>
              </div>

              {/* Available Now */}
              <div
                className={`uber-sidebar-item ${availableNowOnly ? 'active' : ''}`}
                onClick={() => setAvailableNowOnly(!availableNowOnly)}
                title="Filter by workers currently on call"
              >
                <div className="uber-sidebar-item-left">
                  <md-icon>bolt</md-icon>
                  <span>Available Now</span>
                </div>
                <span className="uber-sidebar-badge">{availableCount}</span>
              </div>

              {/* Top Rated (4.5+ ★) */}
              <div
                className={`uber-sidebar-item ${minRating === '4.5' ? 'active' : ''}`}
                onClick={() => setMinRating(minRating === '4.5' ? 'Any' : '4.5')}
                title="Filter workers with 4.5+ star rating"
              >
                <div className="uber-sidebar-item-left">
                  <md-icon>{minRating === '4.5' ? 'workspace_premium' : 'hotel_class'}</md-icon>
                  <span>Top Rated (4.5★)</span>
                </div>
                <span className="uber-sidebar-badge">{topRatedCount}</span>
              </div>
            </div>
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Categories Section */}
          <div className="uber-sidebar-section">
            <div className="uber-sidebar-section-title">
              <span>Categories</span>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  className="uber-sidebar-clear-btn"
                  onClick={() => setSelectedCategories([])}
                  title="Clear category selection"
                >
                  Clear ({selectedCategories.length})
                </button>
              )}
            </div>

            <div className="uber-cat-list">
              <div
                className={`uber-cat-item ${selectedCategories.length === 0 ? 'active' : ''}`}
                onClick={() => setSelectedCategories([])}
                title="All Categories"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <md-icon>grid_view</md-icon>
                  <span>All Categories</span>
                </div>
                <span className="uber-sidebar-badge">{verifiedWorkers.length}</span>
              </div>

              {categories.map((cat) => {
                const count = getCategoryCount(cat.id);
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <div
                    key={cat.id}
                    className={`uber-cat-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    title={`Filter by ${cat.label}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <md-icon>{cat.icon || 'handyman'}</md-icon>
                      <span>{cat.label}</span>
                    </div>
                    <span className="uber-sidebar-badge">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="uber-sidebar-divider" />

          {/* Budget & Rate Filter Section */}
          <div className="uber-sidebar-section m3-rates-section">
            <div className="uber-sidebar-section-title">
              <span>Rate Type</span>
            </div>

            {/* Segmented Control */}
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
              className="uber-btn-outline"
              onClick={handleResetFilters}
              style={{ width: '100%', marginTop: '4px' }}
            >
              <md-icon style={{ fontSize: '18px' }}>restart_alt</md-icon>
              <span>Reset All Filters</span>
            </button>
          )}
        </aside>

        {/* Right Main Content Area */}
        <main className="community-feed-column find-main" id="find-feed">
          {/* Main Controls Search & Filter Bar */}
          <div className="uber-search-card" id="find-search-main">
            <div className="uber-search-input-wrap">
              <i className="fa-solid fa-magnifying-glass uber-search-icon"></i>
              <input
                type="text"
                className="uber-search-input"
                placeholder="Search craftsmen by name, skill, service (e.g. Electrician)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setDebouncedSearchQuery(searchQuery);
                    const params = new URLSearchParams(window.location.search);
                    if (searchQuery) params.set('q', searchQuery);
                    else params.delete('q');
                    const qs = params.toString();
                    navigate(qs ? `/find?${qs}` : '/find');
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    const params = new URLSearchParams(window.location.search);
                    params.delete('q');
                    const qs = params.toString();
                    navigate(qs ? `/find?${qs}` : '/find');
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#757575', padding: '4px' }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="uber-toolbar-actions">
              <select
                className="uber-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="recommended">Sort: Recommended</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="price_asc">Sort: Price (Low to High)</option>
                <option value="price_desc">Sort: Price (High to Low)</option>
              </select>

              {/* Grid View Mode Switcher Button Group (Icon Only) */}
              <div className="uber-view-mode-group" role="group" aria-label="Card grid view mode">
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'large' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('large')}
                  title="Large Cards View"
                  aria-label="Large Cards View"
                >
                  <i className="fa-solid fa-table-cells-large"></i>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'small' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('small')}
                  title="Small Cards View"
                  aria-label="Small Cards View"
                >
                  <i className="fa-solid fa-grip"></i>
                </button>
                <button
                  type="button"
                  className={`uber-view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => handleViewModeChange('list')}
                  title="List View"
                  aria-label="List View"
                >
                  <i className="fa-solid fa-list-ul"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Results Count & Active Filter Chips Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', margin: '4px 0 4px 0' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#000000', margin: 0, letterSpacing: '-0.02em' }}>
              {loading ? 'Searching workers...' : `${totalWorkers} verified worker${totalWorkers === 1 ? '' : 's'} available`}
            </h2>
            {!loading && totalWorkers > 0 && (
              <div style={{ fontSize: '0.85rem', color: '#71717a', fontWeight: 600 }}>
                Showing {startIndex + 1}–{Math.min(startIndex + WORKERS_PER_PAGE, totalWorkers)} of {totalWorkers}
              </div>
            )}
          </div>

          {(debouncedSearchQuery || (appliedLocationQuery && appliedLocationQuery.trim() !== '') || selectedCategories.length > 0 || availableNowOnly || favoritesOnly || minRating !== 'Any' || selectedBadge !== 'all') && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              {debouncedSearchQuery && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#000000',
                  color: '#ffffff',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  <md-icon style={{ fontSize: '16px' }}>search</md-icon>
                  <span>"{debouncedSearchQuery}"</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => {
                      setSearchQuery('');
                      setDebouncedSearchQuery('');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('q');
                      const qs = params.toString();
                      navigate(qs ? `/find?${qs}` : '/find');
                    }}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {appliedLocationQuery && !appliedLocationQuery.toLowerCase().includes('all') && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f4f5',
                  border: '1px solid #000000',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#000000'
                }}>
                  <md-icon style={{ fontSize: '16px', color: '#000000' }}>location_on</md-icon>
                  <span>{appliedLocationQuery}</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => {
                      setLocationQuery('');
                      setAppliedLocationQuery('');
                      setSelectedProvince('all');
                      setSelectedDistrict('all');
                      const params = new URLSearchParams(window.location.search);
                      params.delete('location');
                      const qs = params.toString();
                      navigate(qs ? `/find?${qs}` : '/find');
                    }}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {favoritesOnly && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#92400e'
                }}>
                  <md-icon style={{ fontSize: '16px', color: '#d97706' }}>star</md-icon>
                  <span>Starred Only</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => setFavoritesOnly(false)}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {availableNowOnly && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ecfdf5',
                  border: '1px solid #10b981',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#065f46'
                }}>
                  <md-icon style={{ fontSize: '16px', color: '#059669' }}>bolt</md-icon>
                  <span>Available Now</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => setAvailableNowOnly(false)}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {minRating !== 'Any' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f4f5',
                  border: '1px solid #d4d4d8',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#000000'
                }}>
                  <md-icon style={{ fontSize: '16px' }}>hotel_class</md-icon>
                  <span>{minRating}+ Stars</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => setMinRating('Any')}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {selectedBadge !== 'all' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#000000',
                  color: '#ffffff',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}>
                  <md-icon style={{ fontSize: '16px' }}>verified</md-icon>
                  <span>Verified</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => setSelectedBadge('all')}
                  >
                    close
                  </md-icon>
                </div>
              )}

              {selectedCategories.map(cat => (
                <div key={cat} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f4f4f5',
                  border: '1px solid #e4e4e7',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#000000'
                }}>
                  <span>{cat}</span>
                  <md-icon
                    style={{ fontSize: '16px', cursor: 'pointer', marginLeft: '4px' }}
                    onClick={() => toggleCategory(cat)}
                  >
                    close
                  </md-icon>
                </div>
              ))}
            </div>
          )}

          {/* Loading or Empty States */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: '16px' }}>
              <Loader size={56} />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b' }}>Loading available verified workers...</span>
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
              <md-icon style={{ fontSize: '48px', '--md-icon-size': '48px', color: '#cbd5e1', marginBottom: '16px' }}>person_off</md-icon>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 8px 0', color: '#0f172a' }}>{debouncedSearchQuery ? "No workers found for '" + debouncedSearchQuery + "'" : 'No Matching Workers Found'}</h3>
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
          ) : (
            /* Full Width Grid Mode */
            <>
              <div className={`worker-cards-grid view-${viewMode}`}>
                {paginatedWorkers.map(worker => renderWorkerCard(worker))}
              </div>
              {renderPagination()}
            </>
          )}
        </main>
      </div>
    </div>
  );
}






