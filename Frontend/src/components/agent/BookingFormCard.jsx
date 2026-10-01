import React, { useState, useEffect } from 'react';
import craftsmanAvatar from '../../assets/carftman.png';
import sriLankaDistrictsData from '../../data/sriLankaDistricts.json';
import './AgentCards.css';

const ALL_DISTRICTS = Object.values(sriLankaDistrictsData).flat();

const resolveDistrict = (loc) => {
  if (!loc) return 'Colombo';
  const clean = String(loc).trim().toLowerCase();
  const exact = ALL_DISTRICTS.find((d) => d.toLowerCase() === clean);
  if (exact) return exact;
  const partial = ALL_DISTRICTS.find((d) => clean.includes(d.toLowerCase()) || d.toLowerCase().includes(clean));
  if (partial) return partial;
  return 'Colombo';
};

const TIME_SLOTS = [
  { id: 'morning', label: '09:00 AM - 11:00 AM', startTime: '09:00', duration: 2 },
  { id: 'midday', label: '11:30 AM - 01:30 PM', startTime: '11:30', duration: 2 },
  { id: 'afternoon', label: '02:00 PM - 04:00 PM', startTime: '14:00', duration: 2 },
  { id: 'evening', label: '04:30 PM - 06:30 PM', startTime: '16:30', duration: 2 },
];

export default function BookingFormCard({ data = {}, onAction }) {
  const workerId = data.workerId || data.id || '44';
  const workerName = data.workerName || data.name || 'Verified Technician';
  const workerAvatar = data.workerAvatar || data.avatarUrl || craftsmanAvatar;
  const category = data.category || 'General Service';
  const hourlyRate = data.hourlyRate || 2800;

  // Tomorrow as default date (YYYY-MM-DD)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(data.selectedDate || defaultDateStr);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0]);
  const [durationHours, setDurationHours] = useState(data.durationHours || 2);
  const [jobTitle, setJobTitle] = useState(data.jobTitle || `${category} Service Request`);
  const [notes, setNotes] = useState(data.notes || '');
  const [location, setLocation] = useState(resolveDistrict(data.location));
  const [contactPhone, setContactPhone] = useState(data.contactPhone || '0771234567');

  // Availability validation state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState({
    isAvailable: data.isAvailable !== false,
    status: data.availabilityStatus || 'Available',
    reason: data.availabilityReason || `${workerName} is available for booking.`,
  });

  // Check availability whenever date, slot, or workerId changes
  useEffect(() => {
    let isCancelled = false;

    async function checkAvailability() {
      setCheckingAvailability(true);
      try {
        const resp = await fetch(
          `http://localhost:8001/api/workers/${workerId}/availability?date=${selectedDate}&start_time=${selectedSlot.startTime}&duration_hours=${durationHours}`
        );
        if (resp.ok) {
          const resJson = await resp.json();
          if (!isCancelled) {
            const isAvail = resJson.isSlotAvailable !== false && resJson.isAvailable !== false;
            setAvailabilityResult({
              isAvailable: isAvail,
              status: isAvail ? 'Available' : 'Unavailable',
              reason: resJson.reason || (isAvail ? `${workerName} is available!` : 'Worker is busy or off duty.'),
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
  }, [workerId, selectedDate, selectedSlot, durationHours, workerName]);

  const totalEstimate = (Number(hourlyRate) || 2800) * (Number(durationHours) || 2);

  const handleConfirmBooking = () => {
    // Calculate end time
    const [hh, mm] = selectedSlot.startTime.split(':').map(Number);
    const endH = hh + Number(durationHours);
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    const promptToExecute = `CONFIRM_BOOKING: Please book worker ID ${workerId} (${workerName}) for ${selectedDate} from ${selectedSlot.startTime} to ${endTimeStr}. Service: ${jobTitle}. Location: ${location}. Phone: ${contactPhone}. Notes: ${notes || 'Standard booking'}`;

    const payloadObj = {
      prompt: promptToExecute,
      action: 'create_booking',
      workerId,
      bookingData: {
        workerId,
        workerName,
        date: selectedDate,
        startTime: `${selectedDate}T${selectedSlot.startTime}:00`,
        endTime: `${selectedDate}T${endTimeStr}:00`,
        jobTitle,
        locationAddress: location,
        contactPhone,
        notes,
        totalEstimate,
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
                <i className="fa-solid fa-bolt"></i> Rs. {hourlyRate}/hr
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
              <span>Validating {workerName}&apos;s real-time schedule...</span>
            </>
          ) : availabilityResult.isAvailable ? (
            <>
              <i className="fa-solid fa-circle-check"></i>
              <span>{availabilityResult.reason || `${workerName} is FREE on this date & time slot!`}</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-circle-xmark"></i>
              <span>{availabilityResult.reason || 'Worker is unavailable on this slot. Please select another time.'}</span>
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

          {/* 2. Time Slot Selection */}
          <div className="booking-form-field">
            <label className="booking-field-label">
              <i className="fa-regular fa-clock"></i> Select Time Slot
            </label>
            <div className="booking-slots-grid">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot.id}
                  className={`booking-slot-pill ${selectedSlot.id === slot.id ? 'active' : ''}`}
                  onClick={() => setSelectedSlot(slot)}
                >
                  <i className="fa-regular fa-clock"></i>
                  <span>{slot.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Duration & Service Description */}
          <div className="booking-form-row">
            <div className="booking-form-field" style={{ flex: 1 }}>
              <label className="booking-field-label">Duration (Hours)</label>
              <select
                className="booking-select-input"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours (Recommended)</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours (Half Day)</option>
                <option value={8}>8 Hours (Full Day)</option>
              </select>
            </div>
            <div className="booking-form-field" style={{ flex: 2 }}>
              <label className="booking-field-label">Service Title</label>
              <input
                type="text"
                className="booking-text-input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Deep Cleaning / Pipe Repair"
              />
            </div>
          </div>

          {/* 4. Notes & Specific Requirements */}
          <div className="booking-form-field">
            <label className="booking-field-label">Notes for Technician (Optional)</label>
            <textarea
              className="booking-textarea-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide specific instructions, apartment number, or details of the issue..."
            />
          </div>

          {/* 5. Location & Contact Phone */}
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

          {/* Pricing Estimation Footer */}
          <div className="booking-price-summary-card">
            <div className="booking-price-row">
              <span className="booking-price-label">Estimated Service Fee ({durationHours} hrs × Rs. {hourlyRate})</span>
              <span className="booking-price-total">Rs. {totalEstimate.toLocaleString()}</span>
            </div>
            <p className="booking-price-note">
              No advance payment required. Pay directly upon satisfactory job completion.
            </p>
          </div>

          {/* Confirm Button */}
          <div className="booking-form-actions">
            <button
              type="button"
              className="booking-confirm-submit-btn"
              disabled={!availabilityResult.isAvailable || checkingAvailability}
              onClick={handleConfirmBooking}
            >
              <span>{checkingAvailability ? 'Checking Slot...' : 'Confirm & Book Appointment'}</span>
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
