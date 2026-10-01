import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config.js';
import { WORKER_SERVICES_CATALOG } from '../../data/workerServicesCatalog.js';
import sriLankaDistricts from '../../data/sriLankaDistricts.json';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icons (same fix as Resident Onboarding)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const navigate = (path) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const PRICING_MODELS = ['Hourly', 'Daily', 'Fixed'];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: '28px' }}>
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <React.Fragment key={step}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              backgroundColor: done || active ? '#000' : '#e5e7eb',
              color: done || active ? '#fff' : '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.85rem',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}>
              {done ? '✓' : step}
            </div>
            {step < total && (
              <div style={{
                height: 2, width: 40, flexShrink: 0,
                backgroundColor: done ? '#000' : '#e5e7eb',
                transition: 'background-color 0.3s ease',
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };

const labelStyle = {
  fontSize: '0.82rem', fontWeight: 600, color: '#374151',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: '10px',
  border: '1.5px solid #e5e7eb', fontSize: '0.95rem', outline: 'none',
  fontFamily: "'DM Sans', sans-serif", color: '#111', background: '#fff',
  transition: 'border-color 0.2s', boxSizing: 'border-box',
};

const selectStyle = {
  ...inputStyle, cursor: 'pointer', appearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23374151' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px',
};

const errStyle = { fontSize: '0.8rem', color: '#dc2626', marginTop: '2px' };

const btnPrimary = {
  width: '100%', padding: '14px', borderRadius: '12px',
  background: '#000', color: '#fff', border: 'none',
  fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif", transition: 'background 0.2s, opacity 0.2s',
};

const btnSecondary = {
  padding: '14px 20px', borderRadius: '12px',
  background: 'transparent', color: '#374151',
  border: '1.5px solid #e5e7eb', fontSize: '1rem', fontWeight: 600,
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  transition: 'border-color 0.2s, color 0.2s', whiteSpace: 'nowrap',
};

// ─── Map sub-component ────────────────────────────────────────────────────────

function MapPicker({ lat, lng, onChange }) {
  function LocationMarker() {
    const map = useMapEvents({
      click(e) { onChange(e.latlng.lat, e.latlng.lng); },
    });
    useEffect(() => {
      if (lat && lng) map.flyTo([lat, lng], 14);
    }, [lat, lng, map]);
    return lat && lng ? <Marker position={[lat, lng]} /> : null;
  }

  return (
    <div style={{ height: 280, borderRadius: 12, overflow: 'hidden', border: '1.5px solid #e5e7eb', position: 'relative' }}>
      <MapContainer center={[6.9271, 79.8612]} zoom={11} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}

// ─── STEP 1: Personal Information ─────────────────────────────────────────────

function Step1({ data, onChange, errors }) {
  const provinces = Object.keys(sriLankaDistricts);
  const districts = data.province ? (sriLankaDistricts[data.province] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Personal Information</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
          Let's start with the basics. Your name and email are pre-filled from Google.
        </p>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Full Name *</label>
        <input style={inputStyle} value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Your full name" />
        {errors.name && <span style={errStyle}>{errors.name}</span>}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Email</label>
        <input style={{ ...inputStyle, background: '#f9fafb', color: '#6b7280' }} value={data.email} readOnly />
        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>From your Google account — cannot be changed here.</span>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Phone Number *</label>
        <input
          style={inputStyle}
          value={data.phone}
          onChange={e => onChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="0771234567"
          maxLength={10}
          type="tel"
        />
        {errors.phone && <span style={errStyle}>{errors.phone}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>House No / Name *</label>
          <input style={inputStyle} value={data.houseNo} onChange={e => onChange('houseNo', e.target.value)} placeholder="123 / Saman Villa" />
          {errors.houseNo && <span style={errStyle}>{errors.houseNo}</span>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Street *</label>
          <input style={inputStyle} value={data.street} onChange={e => onChange('street', e.target.value)} placeholder="Main Street" />
          {errors.street && <span style={errStyle}>{errors.street}</span>}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Area / City *</label>
        <input style={inputStyle} value={data.area} onChange={e => onChange('area', e.target.value)} placeholder="Nugegoda" />
        {errors.area && <span style={errStyle}>{errors.area}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Province *</label>
          <select style={selectStyle} value={data.province} onChange={e => { onChange('province', e.target.value); onChange('district', ''); }}>
            <option value="">Select Province</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.province && <span style={errStyle}>{errors.province}</span>}
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>District *</label>
          <select style={selectStyle} value={data.district} onChange={e => onChange('district', e.target.value)} disabled={!data.province}>
            <option value="">Select District</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors.district && <span style={errStyle}>{errors.district}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── STEP 2: Services & Skills ────────────────────────────────────────────────

function Step2({ selectedServices, onChange, description, onDescriptionChange, errors }) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleService = (cat) => {
    const exists = selectedServices.find(s => s.id === cat.id);
    if (exists) {
      onChange(selectedServices.filter(s => s.id !== cat.id));
    } else {
      const updated = [...selectedServices, {
        id: cat.id,
        name: cat.name,
        skills: cat.defaultSkills.slice(0, 3),
        experienceYears: 1,
      }];
      onChange(updated);
      setExpandedId(cat.id);
    }
  };

  const updateService = (id, field, value) =>
    onChange(selectedServices.map(s => s.id === id ? { ...s, [field]: value } : s));

  const toggleSkill = (serviceId, skill) => {
    const svc = selectedServices.find(s => s.id === serviceId);
    if (!svc) return;
    const has = svc.skills.includes(skill);
    updateService(serviceId, 'skills', has ? svc.skills.filter(sk => sk !== skill) : [...svc.skills, skill]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Services & Skills</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
          Select at least one service you provide, then choose specific skills for each.
        </p>
      </div>

      {errors.services && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: '0.9rem' }}>
          {errors.services}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
        {WORKER_SERVICES_CATALOG.map(cat => {
          const selected = !!selectedServices.find(s => s.id === cat.id);
          return (
            <button key={cat.id} type="button" onClick={() => toggleService(cat)} style={{
              padding: '12px 10px', borderRadius: '12px',
              border: selected ? '2px solid #000' : '2px solid #e5e7eb',
              background: selected ? '#000' : '#fff',
              color: selected ? '#fff' : '#374151',
              cursor: 'pointer', textAlign: 'center',
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: '0.82rem',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>{cat.icon}</div>
              {cat.name}
            </button>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111' }}>Configure Selected Services</h3>
          {selectedServices.map(svc => {
            const cat = WORKER_SERVICES_CATALOG.find(c => c.id === svc.id);
            const isOpen = expandedId === svc.id;
            return (
              <div key={svc.id} style={{ border: '1.5px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                <button type="button" onClick={() => setExpandedId(isOpen ? null : svc.id)} style={{
                  width: '100%', padding: '12px 16px', background: '#f9fafb', border: 'none',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem',
                }}>
                  <span>{cat?.icon} {svc.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {svc.skills.length} skill{svc.skills.length !== 1 ? 's' : ''} · {svc.experienceYears} yr{svc.experienceYears !== 1 ? 's' : ''} {isOpen ? '▲' : '▼'}
                  </span>
                </button>
                {isOpen && cat && (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Experience Years</label>
                      <input type="number" min={0} max={50} style={{ ...inputStyle, width: '120px' }}
                        value={svc.experienceYears}
                        onChange={e => updateService(svc.id, 'experienceYears', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div style={fieldStyle}>
                      <label style={labelStyle}>Skills (select all that apply)</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {cat.defaultSkills.map(skill => {
                          const active = svc.skills.includes(skill);
                          return (
                            <button key={skill} type="button" onClick={() => toggleSkill(svc.id, skill)} style={{
                              padding: '6px 12px', borderRadius: '20px', fontSize: '0.82rem',
                              border: active ? '1.5px solid #000' : '1.5px solid #e5e7eb',
                              background: active ? '#000' : '#fff',
                              color: active ? '#fff' : '#374151',
                              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                              fontWeight: active ? 600 : 400, transition: 'all 0.15s',
                            }}>{skill}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Description — shown after services are selected */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>About Your Service (optional)</label>
          <textarea
            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: 1.6 }}
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="e.g. I am a certified plumber with 8 years of experience in residential plumbing and drain cleaning. I provide honest, reliable service at competitive rates."
            maxLength={500}
          />
          {errors.description && <span style={errStyle}>{errors.description}</span>}
          <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{description.length}/500 characters — you can also fill this in later from your dashboard.</span>
        </div>
      </div>
    </div>
  );
}

// Step 3 (Experience & Profile) removed — description moved into Step 2,
// primaryServiceArea and coverageRadiusKm left null until set from dashboard.

// ─── STEP 4: Pricing & Availability ──────────────────────────────────────────

function Step4({ data, onChange, errors }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Pricing & Availability</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
          Set your pricing model and rates. Residents will see this before booking.
        </p>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Pricing Model *</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {PRICING_MODELS.map(model => (
            <button key={model} type="button" onClick={() => onChange('pricingModel', model)} style={{
              flex: 1, padding: '12px 6px', borderRadius: '10px',
              border: data.pricingModel === model ? '2px solid #000' : '2px solid #e5e7eb',
              background: data.pricingModel === model ? '#000' : '#fff',
              color: data.pricingModel === model ? '#fff' : '#374151',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: '0.9rem',
              transition: 'all 0.2s',
            }}>{model}</button>
          ))}
        </div>
      </div>

      {(data.pricingModel === 'Hourly' || data.pricingModel === 'Fixed') && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Hourly Rate (LKR) {data.pricingModel === 'Hourly' ? '*' : ''}</label>
          <input type="number" min={0} style={inputStyle}
            value={data.hourlyRate}
            onChange={e => onChange('hourlyRate', e.target.value)}
            placeholder="e.g. 1500"
          />
          {errors.hourlyRate && <span style={errStyle}>{errors.hourlyRate}</span>}
        </div>
      )}

      {data.pricingModel === 'Daily' && (
        <div style={fieldStyle}>
          <label style={labelStyle}>Daily Rate (LKR) *</label>
          <input type="number" min={0} style={inputStyle}
            value={data.dailyRate}
            onChange={e => onChange('dailyRate', e.target.value)}
            placeholder="e.g. 8000"
          />
          {errors.dailyRate && <span style={errStyle}>{errors.dailyRate}</span>}
        </div>
      )}

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '18px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700 }}>Availability</h3>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', background: '#f9fafb', borderRadius: '12px', border: '1.5px solid #e5e7eb',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Currently accepting jobs</div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: '2px' }}>You can change this anytime from your profile.</div>
          </div>
          <button type="button" onClick={() => onChange('isAvailable', !data.isAvailable)} style={{
            width: 52, height: 28, borderRadius: 14, border: 'none',
            background: data.isAvailable ? '#000' : '#d1d5db',
            cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0,
          }}>
            <span style={{
              position: 'absolute', top: 3, left: data.isAvailable ? 26 : 3,
              width: 22, height: 22, borderRadius: '50%', background: '#fff',
              transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STEP 5: Location & Confirmation ─────────────────────────────────────────

function Step5({ personal, services, description, pricing, lat, lng, onLatLng, errors }) {
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => onLatLng(pos.coords.latitude, pos.coords.longitude),
        () => alert('Could not get your location. Please pin it manually on the map.')
      );
    }
  };

  const fullAddress = [personal.houseNo, personal.street, personal.area, personal.district, personal.province]
    .filter(Boolean).join(', ');

  const allSkills = services.flatMap(s => s.skills);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800 }}>Location & Confirmation</h2>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#6b7280' }}>
          Pin your location so residents near you can find you, then review your profile before submitting.
        </p>
      </div>

      <div>
        <label style={{ ...labelStyle, display: 'block', marginBottom: '8px' }}>Pin Your Location *</label>
        <MapPicker lat={lat} lng={lng} onChange={onLatLng} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>
            {lat && lng ? `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}` : 'Tap the map to place a pin'}
          </span>
          <button type="button" onClick={handleGetLocation} style={{
            padding: '7px 14px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
            background: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            📡 Use My Location
          </button>
        </div>
        {errors.location && <span style={{ ...errStyle, display: 'block', marginTop: '4px' }}>{errors.location}</span>}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function WorkerOnboarding() {
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});
  const topRef = useRef(null);

  const googleName = localStorage.getItem('userName') || '';
  const googleEmail = localStorage.getItem('email') || localStorage.getItem('workerEmail') || '';
  const token = localStorage.getItem('token');

  // Step 1 — Personal
  const [personal, setPersonal] = useState({
    name: googleName,
    email: googleEmail,
    phone: '',
    houseNo: '',
    street: '',
    area: '',
    province: '',
    district: '',
  });

  // Step 2 — Services + description
  const [selectedServices, setSelectedServices] = useState([]);
  const [description, setDescription] = useState('');

  // Step 3 — Pricing
  const [pricing, setPricing] = useState({
    pricingModel: 'Hourly',
    hourlyRate: '',
    dailyRate: '',
    isAvailable: true,
  });

  // Step 5 — Location
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // Guard: must be logged in
  useEffect(() => {
    if (!token) navigate('/join');
  }, []);

  const scrollToTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (targetStep) => {
    const errs = {};
    if (targetStep === 1) {
      if (!personal.name.trim()) errs.name = 'Full name is required.';
      if (!/^0\d{9}$/.test(personal.phone.trim())) errs.phone = 'Enter a valid 10-digit phone number starting with 0.';
      if (!personal.houseNo.trim()) errs.houseNo = 'House number / name is required.';
      if (!personal.street.trim()) errs.street = 'Street is required.';
      if (!personal.area.trim()) errs.area = 'Area / City is required.';
      if (!personal.province) errs.province = 'Select a province.';
      if (!personal.district) errs.district = 'Select a district.';
    }
    if (targetStep === 2) {
      if (selectedServices.length === 0) errs.services = 'Please select at least one service category.';
      // description is optional — no validation
    }
    if (targetStep === 3) {
      if (pricing.pricingModel === 'Hourly' && (!pricing.hourlyRate || Number(pricing.hourlyRate) <= 0))
        errs.hourlyRate = 'Please enter a valid hourly rate (LKR).';
      if (pricing.pricingModel === 'Daily' && (!pricing.dailyRate || Number(pricing.dailyRate) <= 0))
        errs.dailyRate = 'Please enter a valid daily rate (LKR).';
    }
    if (targetStep === 4) {
      if (!lat || !lng) errs.location = 'Please pin your location on the map before submitting.';
    }
    return errs;
  };

  const goNext = () => {
    const errs = validate(step);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep(s => s + 1);
    scrollToTop();
  };

  const goBack = () => {
    setErrors({});
    setStep(s => s - 1);
    scrollToTop();
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const errs = validate(4);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const fullAddress = [personal.houseNo, personal.street, personal.area, personal.district, personal.province]
        .filter(Boolean).join(', ');

      const skillsPayload = selectedServices.map(svc => ({
        serviceName: svc.name,
        skills: svc.skills,
        experienceYears: svc.experienceYears,
      }));

      // Single atomic call: The Worker profile is ONLY created in the DB right here,
      // after the user has completely filled and submitted all onboarding steps.
      const workerRes = await axios.post(`${API_BASE_URL}/workers/onboarding`, {
        name: personal.name || googleName,
        email: personal.email || googleEmail,
        phoneNo: personal.phone,
        address: fullAddress,
        profileImage: localStorage.getItem('userPicture') || null,
        locationLat: lat,
        locationLng: lng,
        description: description || null,
        primaryServiceArea: personal.area || personal.district || 'Colombo',
        province: personal.province || null,
        district: personal.district || null,
        coverageRadiusKm: 10.0,
        pricingModel: pricing.pricingModel,
        hourlyRate: pricing.hourlyRate ? Number(pricing.hourlyRate) : null,
        dailyRate: pricing.dailyRate ? Number(pricing.dailyRate) : null,
        isAvailable: pricing.isAvailable !== false,
        skills: skillsPayload,
      }, { headers: { Authorization: `Bearer ${token}` } });

      const wId = workerRes.data?.worker?.id;

      // Commit auth state + redirect
      if (wId) localStorage.setItem('workerId', String(wId));
      localStorage.setItem('activeRole', 'Worker');
      localStorage.setItem('workerAuth', 'true');
      localStorage.setItem('workerEmail', personal.email || googleEmail);

      navigate('/worker/dashboard');
    } catch (err) {
      console.error('Worker onboarding error:', err);
      console.error('Backend response:', err.response?.data);
      const msg = err.response?.data?.message || err.response?.data?.title || 'Registration failed. Please try again.';
      setSubmitError(msg);
      scrollToTop();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: '#f7f7f7',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px 60px', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        <div ref={topRef} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/iconWithText-cropped.png" alt="SuperBass"
            style={{ height: 48, cursor: 'pointer', marginBottom: '12px' }}
            onClick={() => navigate('/')}
          />
          <div style={{
            display: 'inline-block', background: '#000', color: '#fff',
            fontSize: '0.72rem', fontWeight: 800, padding: '3px 12px',
            borderRadius: '20px', letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: '8px', marginLeft: '8px',
          }}>
            Worker Registration
          </div>
          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>Step {step} of {TOTAL_STEPS}</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '20px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          padding: '32px 28px',
        }}>
          <StepIndicator current={step} total={TOTAL_STEPS} />

          {submitError && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
              padding: '12px 16px', color: '#dc2626', fontSize: '0.9rem', marginBottom: '20px',
            }}>
              ⚠️ {submitError}
            </div>
          )}

          {step === 1 && (
            <Step1
              data={personal}
              onChange={(f, v) => setPersonal(p => ({ ...p, [f]: v }))}
              errors={errors}
            />
          )}
          {step === 2 && (
            <Step2
              selectedServices={selectedServices}
              onChange={setSelectedServices}
              description={description}
              onDescriptionChange={setDescription}
              errors={errors}
            />
          )}
          {step === 3 && (
            <Step4
              data={pricing}
              onChange={(f, v) => setPricing(p => ({ ...p, [f]: v }))}
              errors={errors}
            />
          )}
          {step === 4 && (
            <Step5
              personal={personal}
              services={selectedServices}
              description={description}
              pricing={pricing}
              lat={lat}
              lng={lng}
              onLatLng={(la, ln) => { setLat(la); setLng(ln); }}
              errors={errors}
            />
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
            {step > 1 && (
              <button type="button" onClick={goBack} style={btnSecondary}>← Back</button>
            )}
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={goNext} style={{ ...btnPrimary, flex: 1 }}>
                Continue →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                style={{ ...btnPrimary, flex: 1, opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Creating Your Profile…' : '✓ Complete Worker Registration'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#9ca3af' }}>
          Already registered?{' '}
          <span onClick={() => navigate('/worker/dashboard')}
            style={{ color: '#111', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
            Go to Dashboard
          </span>
        </p>
      </div>
    </div>
  );
}
