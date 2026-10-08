import React, { useState, useEffect } from 'react';
import sriLankaDistrictsData from '../../data/sriLankaDistricts.json';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AgentCards.css';

// Fix Leaflet default marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ALL_DISTRICTS = Object.values(sriLankaDistrictsData).flat();

const resolveDistrict = (loc) => {
  if (!loc) return 'Ratnapura';
  const clean = String(loc).trim().toLowerCase();
  const exact = ALL_DISTRICTS.find((d) => d.toLowerCase() === clean);
  if (exact) return exact;
  const partial = ALL_DISTRICTS.find(
    (d) => clean.includes(d.toLowerCase()) || d.toLowerCase().includes(clean)
  );
  if (partial) return partial;
  return 'Ratnapura';
};

const resolveAvatarUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5237';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function BookingFormCard({ data = {}, onAction }) {
  const workerId = data.workerId || data.id || '1';
  const workerName = data.workerName || data.name || 'Super Bass';
  const rawAvatar =
    data.workerAvatar || data.avatarUrl || data.profileImage || data.profilePicture || data.ProfileImage || '';

  const [workerAvatar, setWorkerAvatar] = useState(rawAvatar);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const category = data.category || 'Plumbing';
  const hourlyRate = Number(data.hourlyRate) > 0 ? Number(data.hourlyRate) : 2800;

  // Tomorrow as default date (YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(data.selectedDate || defaultDateStr);
  const [jobTitle, setJobTitle] = useState(data.jobTitle || `${category} Service Request`);
  const [notes, setNotes] = useState(data.notes || '');
  const [location, setLocation] = useState(resolveDistrict(data.location));
  const [specificAddress, setSpecificAddress] = useState(
    data.specificAddress || data.address || (data.location && data.location.includes(',') ? data.location : '')
  );
  const [contactPhone, setContactPhone] = useState(data.contactPhone || '0771756463');
  const [mapLat, setMapLat] = useState(null);
  const [mapLng, setMapLng] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // If worker avatar is not provided or empty in data, fetch from backend API
  useEffect(() => {
    let isCancelled = false;
    const initialPic =
      data.workerAvatar || data.avatarUrl || data.profileImage || data.profilePicture || data.ProfileImage;

    if (initialPic) {
      setWorkerAvatar(initialPic);
      setAvatarLoadError(false);
    } else if (workerId) {
      const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5237';
      fetch(`${backendBase}/api/workers/${workerId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((worker) => {
          if (!isCancelled && worker) {
            const pic = worker.profileImage || worker.profilePicture || worker.avatarUrl;
            if (pic) {
              setWorkerAvatar(pic);
              setAvatarLoadError(false);
            }
          }
        })
        .catch((err) => {
          console.warn('Could not fetch worker profile avatar:', err);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [workerId, data]);

  // Keep state updated if data changes from parent / AI
  useEffect(() => {
    if (data.selectedDate) setSelectedDate(data.selectedDate);
    if (data.jobTitle) setJobTitle(data.jobTitle);
    if (data.location) setLocation(resolveDistrict(data.location));
    if (data.contactPhone) setContactPhone(data.contactPhone);
    if (data.notes) setNotes(data.notes);
    if (data.specificAddress || data.address) {
      setSpecificAddress(data.specificAddress || data.address);
    }
  }, [data]);

  // Availability validation state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState({
    isAvailable: data.isAvailable !== false,
    status: data.availabilityStatus || 'Available',
    reason: data.availabilityReason || `${workerName} is available on this date.`,
  });

  // Check availability whenever date or workerId changes
  useEffect(() => {
    let isCancelled = false;

    async function checkAvailability() {
      setCheckingAvailability(true);
      try {
        const resp = await fetch(
          `http://localhost:8001/api/workers/${workerId}/availability?date=${selectedDate}`
        );
        if (resp.ok) {
          const resJson = await resp.json();
          if (!isCancelled) {
            const isAvail = resJson.isSlotAvailable !== false && resJson.isAvailable !== false;
            setAvailabilityResult({
              isAvailable: isAvail,
              status: isAvail ? 'Available' : 'Unavailable',
              reason:
                resJson.reason ||
                (isAvail ? `${workerName} is available on this date!` : 'Worker is busy or off duty.'),
            });
          }
        }
      } catch (err) {
        console.warn('Availability check failed, defaulting to available:', err);
      } finally {
        if (!isCancelled) {
          setCheckingAvailability(false);
        }
      }
    }

    checkAvailability();

    return () => {
      isCancelled = true;
    };
  }, [workerId, selectedDate, workerName]);

  // Helper to reverse geocode lat/lng to readable address
  const reverseGeocodeAndSet = async (lat, lng) => {
    setMapLat(lat);
    setMapLng(lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
      );
      if (res.ok) {
        const resData = await res.json();
        const addr = resData.address || {};
        const road = addr.road || addr.pedestrian || addr.street || '';
        const suburb = addr.suburb || addr.neighbourhood || addr.village || '';
        const city = addr.city || addr.town || addr.county || '';

        let formatted = '';
        if (road && (suburb || city)) {
          formatted = `${road}, ${suburb || city}`;
        } else if (suburb && city) {
          formatted = `${suburb}, ${city}`;
        } else if (resData.display_name) {
          const parts = resData.display_name.split(',');
          formatted = parts.slice(0, 3).join(',').trim();
        } else {
          formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }

        setSpecificAddress(formatted);

        const detectedDistrict = addr.state_district || addr.county || addr.city || city;
        if (detectedDistrict) {
          const matched = resolveDistrict(detectedDistrict);
          if (matched) setLocation(matched);
        }
      } else {
        setSpecificAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
      setSpecificAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsLocating(false);
    }
  };

  // Get current location via GPS
  const handleGetLocation = () => {
    setIsLocating(true);

    if (!navigator.geolocation) {
      // Fallback if browser doesn't have geolocation
      handleFallbackLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        reverseGeocodeAndSet(lat, lng);
      },
      (error) => {
        console.warn('Geolocation failed or permission denied, using network fallback:', error);
        handleFallbackLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleFallbackLocation = async () => {
    try {
      const ipRes = await fetch('https://ipapi.co/json/');
      if (ipRes.ok) {
        const ipData = await ipRes.json();
        if (ipData.latitude && ipData.longitude) {
          await reverseGeocodeAndSet(Number(ipData.latitude), Number(ipData.longitude));
          return;
        }
      }
    } catch (e) {
      console.warn('IP location fallback failed:', e);
    }
    // Final fallback to Sri Lanka (Colombo)
    await reverseGeocodeAndSet(6.9271, 79.8612);
  };

  const handleConfirmBooking = () => {
    let fullAddress;
    if (mapLat !== null && mapLng !== null) {
      fullAddress = `${specificAddress || `${mapLat.toFixed(6)}, ${mapLng.toFixed(6)}`}, ${location}`;
    } else if (specificAddress) {
      fullAddress = `${specificAddress}, ${location}`;
    } else {
      fullAddress = location;
    }

    const promptToExecute = `REVIEW_BOOKING: Please review booking details for worker ID ${workerId} (${workerName}) on ${selectedDate}. Service: ${jobTitle}. Location: ${fullAddress}. Phone: ${contactPhone}. Notes: ${notes || 'Standard booking'}`;

    const payloadObj = {
      prompt: promptToExecute,
      action: 'review_booking',
      workerId,
      bookingData: {
        workerId,
        workerName,
        workerAvatar,
        category,
        date: selectedDate,
        scheduledDate: `${selectedDate}T09:00:00`,
        jobTitle,
        locationAddress: fullAddress,
        contactPhone,
        notes,
        hourlyRate,
        estimatedPrice: hourlyRate,
      },
    };

    setIsSubmittingBooking(true);
    onAction && onAction('send_prompt', payloadObj);
  };

  // Map Picker component for GPS functionality
  function MapPicker({ lat, lng, onChange }) {
    function LocationMarker() {
      const map = useMapEvents({
        click(e) {
          onChange(e.latlng.lat, e.latlng.lng);
        },
      });

      useEffect(() => {
        if (lat && lng) {
          map.flyTo([lat, lng], 14);
        }
      }, [lat, lng, map]);

      return lat && lng ? <Marker position={[lat, lng]} /> : null;
    }

    const centerLat = lat || 6.9271;
    const centerLng = lng || 79.8612;

    return (
      <div className="booking-map-container">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={lat && lng ? 14 : 11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker />
        </MapContainer>

        <button
          type="button"
          className="booking-map-locate-fab"
          onClick={handleGetLocation}
          disabled={isLocating}
          title="Center map on my current GPS location"
        >
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '16px',
              animation: isLocating ? 'spin 1s linear infinite' : 'none',
            }}
          >
            {isLocating ? 'progress_activity' : 'my_location'}
          </span>
          <span>{isLocating ? 'Locating...' : 'Locate Me'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="agent-card-container">
      <div className="agent-base-card booking-form-card" style={{ borderLeft: '4px solid #10b981' }}>
        {/* Header / Worker Info */}
        <div className="booking-card-worker-header">
          <div className="booking-worker-avatar-wrap">
            {workerAvatar && !avatarLoadError ? (
              <img
                src={resolveAvatarUrl(workerAvatar)}
                alt={workerName}
                className="booking-worker-avatar-img"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <div className="booking-worker-avatar-fallback">
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#64748b' }}>
                  person
                </span>
              </div>
            )}
            <div className="booking-verified-badge" title="Verified Worker">
              <span className="material-symbols-outlined" style={{ fontSize: '13px', color: '#ffffff', fontWeight: 'bold' }}>
                check
              </span>
            </div>
          </div>
          <div className="booking-worker-meta">
            <div className="booking-worker-title-row">
              <h3 className="booking-worker-name">{workerName}</h3>
              <span className="booking-worker-id-pill">Worker #{workerId}</span>
            </div>
            <div className="booking-worker-sub-row">
              <span className="booking-worker-cat">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  label
                </span>{' '}
                {category}
              </span>
              <span className="booking-worker-rate">
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#0f172a' }}>
                  payments
                </span>{' '}
                Rs. {Number(hourlyRate).toLocaleString()}/hr
              </span>
            </div>
          </div>
        </div>

        {/* Live Availability Banner */}
        <div
          className={`booking-avail-banner ${
            checkingAvailability
              ? 'checking'
              : availabilityResult.isAvailable
              ? 'available'
              : 'unavailable'
          }`}
        >
          {checkingAvailability ? (
            <>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}
              >
                progress_activity
              </span>
              <span>Checking {workerName}&apos;s schedule for {selectedDate}...</span>
            </>
          ) : availabilityResult.isAvailable ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#059669' }}>
                check_circle
              </span>
              <span>{availabilityResult.reason || `${workerName} is available on ${selectedDate}!`}</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#dc2626' }}>
                cancel
              </span>
              <span>{availabilityResult.reason || 'Worker is unavailable on this date. Please pick another date.'}</span>
            </>
          )}
        </div>

        {/* Form Body */}
        <div className="booking-form-body">
          {/* 1. Date Selector */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                calendar_today
              </span>{' '}
              Appointment Date
            </label>
            <input
              type="date"
              className="booking-date-input"
              value={selectedDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* 2. Service Description */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                construction
              </span>{' '}
              Service Title
            </label>
            <input
              type="text"
              className="booking-text-input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Plumbing Pipe Repair"
            />
          </div>

          {/* 3. Notes & Specific Instructions */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                description
              </span>{' '}
              Notes for Technician (Optional)
            </label>
            <textarea
              className="booking-textarea-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide specific instructions, apartment number, or details of the issue..."
            />
          </div>

          {/* 4. Location & Contact Phone */}
          <div className="booking-form-row">
            <div className="booking-form-field" style={{ flex: 1 }}>
              <label className="booking-field-label">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  location_on
                </span>{' '}
                Service District
              </label>
              <select
                className="booking-select-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {Object.entries(sriLankaDistrictsData).map(([province, districts]) => (
                  <optgroup key={province} label={province}>
                    {districts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="booking-form-field" style={{ flex: 1 }}>
              <label className="booking-field-label">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                  call
                </span>{' '}
                Contact Phone
              </label>
              <input
                type="tel"
                className="booking-text-input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="07XXXXXXXX"
              />
            </div>
          </div>

          {/* 5. Specific Address Details */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                home
              </span>{' '}
              Specific Address / Street
            </label>
            <div className="booking-input-with-action">
              <input
                type="text"
                className="booking-text-input"
                value={specificAddress}
                onChange={(e) => setSpecificAddress(e.target.value)}
                placeholder="e.g. 5656, Batuhena, Ratnapura"
              />
              <button
                type="button"
                className="booking-inline-gps-btn"
                onClick={handleGetLocation}
                disabled={isLocating}
                title="Detect current GPS location"
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    animation: isLocating ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {isLocating ? 'progress_activity' : 'my_location'}
                </span>
                <span>{isLocating ? 'Detecting...' : 'Use GPS'}</span>
              </button>
            </div>
          </div>

          {/* 6. Map & GPS Location */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                map
              </span>{' '}
              Map Location
            </label>

            <MapPicker
              lat={mapLat}
              lng={mapLng}
              onChange={(lat, lng) => {
                reverseGeocodeAndSet(lat, lng);
              }}
            />

            {mapLat && mapLng && (
              <div className="booking-coords-preview">
                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#10b981' }}>
                  check_circle
                </span>
                <span>
                  Pinned: {mapLat.toFixed(6)}, {mapLng.toFixed(6)}
                </span>
              </div>
            )}
          </div>

          {/* 7. Pricing Information */}
          <div className="booking-price-summary-card">
            <div className="booking-price-row">
              <span className="booking-price-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: '#10b981', fontSize: '18px' }}>
                  sell
                </span>
                Technician Rate
              </span>
              <span className="booking-price-total">Rs. {Number(hourlyRate).toLocaleString()} / hr</span>
            </div>
            <p className="booking-price-note">
              <span className="material-symbols-outlined" style={{ fontSize: '15px', color: '#64748b' }}>
                verified_user
              </span>{' '}
              No advance payment required. Pay directly upon satisfactory job completion.
            </p>
          </div>

          {/* 8. Confirm Button */}
          <div className="booking-form-actions">
            <button
              type="button"
              className="booking-confirm-submit-btn"
              disabled={!availabilityResult.isAvailable || checkingAvailability || isSubmittingBooking}
              onClick={handleConfirmBooking}
            >
              {isSubmittingBooking ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}
                  >
                    progress_activity
                  </span>
                  <span>Scheduling Appointment...</span>
                </>
              ) : checkingAvailability ? (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}
                  >
                    progress_activity
                  </span>
                  <span>Checking Availability...</span>
                </>
              ) : (
                <>
                  <span>Review & Confirm Details</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
