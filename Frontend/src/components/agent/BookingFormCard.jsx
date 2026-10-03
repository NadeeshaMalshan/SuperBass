import React, { useState, useEffect } from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import sriLankaDistrictsData from '../../data/sriLankaDistricts.json';
import './AgentCards.css';

const ALL_DISTRICTS = Object.values(sriLankaDistrictsData).flat();

const resolveDistrict = (loc) => {
  if (!loc) return 'Ratnapura';
  const clean = String(loc).trim().toLowerCase();
  const exact = ALL_DISTRICTS.find((d) => d.toLowerCase() === clean);
  if (exact) return exact;
  const partial = ALL_DISTRICTS.find((d) => clean.includes(d.toLowerCase()) || d.toLowerCase().includes(clean));
  if (partial) return partial;
  return 'Ratnapura';
};

export default function BookingFormCard({ data = {}, onAction }) {
  const workerId = data.workerId || data.id || '1';
  const workerName = data.workerName || data.name || 'Super Bass';
  const workerAvatar = data.workerAvatar || data.avatarUrl || data.profileImage || craftsmanAvatar;
  const category = data.category || 'Plumbing';
  const hourlyRate = Number(data.hourlyRate) > 0 ? Number(data.hourlyRate) : 5000;

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
              reason: resJson.reason || (isAvail ? `${workerName} is available on this date!` : 'Worker is busy or off duty.'),
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

  const handleConfirmBooking = () => {
    const fullAddress = specificAddress ? `${specificAddress}, ${location}` : location;
    const promptToExecute = `CONFIRM_BOOKING: Please book worker ID ${workerId} (${workerName}) for ${selectedDate}. Service: ${jobTitle}. Location: ${fullAddress}. Phone: ${contactPhone}. Notes: ${notes || 'Standard booking'}`;

    const payloadObj = {
      prompt: promptToExecute,
      action: 'create_booking',
      workerId,
      bookingData: {
        workerId,
        workerName,
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

    onAction && onAction('send_prompt', payloadObj);
  };

  return (
    <div className="agent-card-container">
      <div className="agent-base-card booking-form-card" style={{ borderLeft: '4px solid #10b981' }}>
        {/* Header / Worker Info */}
        <div className="booking-card-worker-header">
          <div className="booking-worker-avatar-wrap">
            <img src={workerAvatar} alt={workerName} className="booking-worker-avatar-img" />
            <div className="booking-verified-badge" title="Verified Worker">
              <i className="fa-solid fa-check"></i>
            </div>
          </div>
          <div className="booking-worker-meta">
            <div className="booking-worker-title-row">
              <h3 className="booking-worker-name">{workerName}</h3>
              <span className="booking-worker-id-pill">Worker #{workerId}</span>
            </div>
            <div className="booking-worker-sub-row">
              <span className="booking-worker-cat">
                <i className="fa-solid fa-tag"></i> {category}
              </span>
              <span className="booking-worker-rate">
                <i className="fa-solid fa-bolt"></i> Rs. {Number(hourlyRate).toLocaleString()}/hr
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
              <i className="fa-solid fa-circle-notch fa-spin"></i>
              <span>Checking {workerName}&apos;s schedule for {selectedDate}...</span>
            </>
          ) : availabilityResult.isAvailable ? (
            <>
              <i className="fa-solid fa-circle-check"></i>
              <span>{availabilityResult.reason || `${workerName} is available on ${selectedDate}!`}</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-circle-xmark"></i>
              <span>{availabilityResult.reason || 'Worker is unavailable on this date. Please pick another date.'}</span>
            </>
          )}
        </div>

        {/* Form Body */}
        <div className="booking-form-body">
          {/* 1. Date Selector */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <i className="fa-regular fa-calendar"></i> Appointment Date
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
              <i className="fa-solid fa-wrench"></i> Service Title
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
              <i className="fa-regular fa-clipboard"></i> Notes for Technician (Optional)
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
                <i className="fa-solid fa-location-dot"></i> Service District
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
                <i className="fa-solid fa-phone"></i> Contact Phone
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
              <i className="fa-solid fa-map-pin"></i> Specific Address / Street
            </label>
            <input
              type="text"
              className="booking-text-input"
              value={specificAddress}
              onChange={(e) => setSpecificAddress(e.target.value)}
              placeholder="e.g. 5656, Batuhena, Ratnapura"
            />
          </div>

          {/* 6. Pricing Information */}
          <div className="booking-price-summary-card">
            <div className="booking-price-row">
              <span className="booking-price-label">
                <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#10b981' }}></i>
                Technician Rate
              </span>
              <span className="booking-price-total">Rs. {Number(hourlyRate).toLocaleString()} / hr</span>
            </div>
            <p className="booking-price-note">
              <i className="fa-solid fa-shield-halved"></i> No advance payment required. Pay directly upon satisfactory job completion.
            </p>
          </div>

          {/* 7. Confirm Button */}
          <div className="booking-form-actions">
            <button
              type="button"
              className="booking-confirm-submit-btn"
              disabled={!availabilityResult.isAvailable || checkingAvailability}
              onClick={handleConfirmBooking}
            >
              <span>{checkingAvailability ? 'Checking Availability...' : 'Confirm & Book Appointment'}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
