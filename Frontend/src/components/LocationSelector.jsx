import React, { useState, useRef, useEffect } from 'react';
import sriLankaDistricts from '../data/sriLankaDistricts.json';
import '../App.css';

/**
 * Reusable Location Selector Component matching the Landing Page design.
 * Renders: [Pin Icon] [Location Name in Bold] [Change city (underlined)]
 * Clicking "Change city" opens the popover with 9 provinces & 25 districts, search, and GPS detection.
 */
export default function LocationSelector({
  location = 'Colombo',
  onChange,
  className = '',
}) {
  const [isChangingCity, setIsChangingCity] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [tempCity, setTempCity] = useState(location || 'Colombo');
  const [isLocating, setIsLocating] = useState(false);

  const cityModalRef = useRef(null);
  const triggerRef = useRef(null);

  // Sync temp city when prop changes
  useEffect(() => {
    if (location) {
      setTempCity(location);
    }
  }, [location]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        cityModalRef.current &&
        !cityModalRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setIsChangingCity(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsChangingCity(false);
      }
    };

    if (isChangingCity) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChangingCity]);

  // Filter provinces and districts based on search term
  const filteredProvinces = Object.entries(sriLankaDistricts).reduce((acc, [province, districts]) => {
    const searchLower = districtSearch.trim().toLowerCase();
    if (!searchLower) {
      acc[province] = districts;
    } else {
      const matchedDistricts = districts.filter(
        (d) => d.toLowerCase().includes(searchLower) || province.toLowerCase().includes(searchLower)
      );
      if (matchedDistricts.length > 0) {
        acc[province] = matchedDistricts;
      }
    }
    return acc;
  }, {});

  const handleSelect = (selected) => {
    const clean = selected.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
    if (onChange) {
      onChange(clean);
    }
    setIsChangingCity(false);
  };

  const handleApplyCustomCity = () => {
    if (tempCity && tempCity.trim()) {
      handleSelect(tempCity);
    } else {
      setIsChangingCity(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
          );
          const data = await res.json();
          let city =
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.village ||
            data.address?.county ||
            'Colombo';
          city = city.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
          handleSelect(city);
        } catch {
          handleSelect('Colombo');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        handleSelect('Colombo');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const displayLocation = location || 'Colombo';

  return (
    <div className={`landing-hero-location-row ${className}`} style={{ position: 'relative' }}>
      {/* Pin icon with fallback if web component not defined */}
      <md-icon className="landing-hero-location-pin">location_on</md-icon>
      <span className="landing-hero-location-name">{displayLocation}</span>
      <button
        type="button"
        ref={triggerRef}
        className="landing-hero-change-city-btn"
        onClick={() => {
          setTempCity(displayLocation);
          setDistrictSearch('');
          setIsChangingCity((prev) => !prev);
        }}
        aria-label="Change city"
      >
        Change city
      </button>

      {/* City Selection Popover matching Landing Page */}
      {isChangingCity && (
        <div className="landing-city-popover" ref={cityModalRef}>
          <div className="landing-city-popover-header">
            <span>Select District (Sri Lanka)</span>
            <button
              type="button"
              className="landing-city-close-btn"
              onClick={() => setIsChangingCity(false)}
              title="Close"
              aria-label="Close"
            >
              <md-icon style={{ fontSize: '18px' }}>close</md-icon>
            </button>
          </div>

          <div className="landing-city-input-wrap">
            <input
              type="text"
              className="landing-city-input"
              placeholder="Search district or province..."
              value={districtSearch}
              onChange={(e) => {
                setDistrictSearch(e.target.value);
                setTempCity(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApplyCustomCity();
                }
              }}
              autoFocus
            />
            {districtSearch && (
              <button
                type="button"
                className="landing-city-apply-btn"
                onClick={handleApplyCustomCity}
              >
                Set
              </button>
            )}
          </div>

          {/* 9 Provinces & 25 Districts Grouped List */}
          <div className="landing-city-provinces-list">
            {Object.keys(filteredProvinces).length > 0 ? (
              Object.entries(filteredProvinces).map(([province, districts]) => (
                <div key={province} className="landing-province-group">
                  <span className="landing-province-title">{province}</span>
                  <div className="landing-district-chips">
                    {districts.map((district) => {
                      const isSelected = displayLocation.toLowerCase().startsWith(district.toLowerCase());
                      return (
                        <button
                          key={district}
                          type="button"
                          className={`landing-district-chip ${isSelected ? 'active' : ''}`}
                          onClick={() => handleSelect(district)}
                        >
                          {district}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="landing-district-empty">
                <span>No district found matching "{districtSearch}"</span>
                <button
                  type="button"
                  className="landing-city-apply-btn"
                  style={{ marginTop: '8px' }}
                  onClick={handleApplyCustomCity}
                >
                  Use "{districtSearch}" anyway
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="landing-city-detect-btn"
            disabled={isLocating}
            onClick={handleDetectLocation}
          >
            <md-icon style={{ fontSize: '18px' }}>near_me</md-icon>
            <span>{isLocating ? 'Detecting your location...' : 'Detect my current location'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
