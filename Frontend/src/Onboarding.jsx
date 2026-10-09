import React, { useState, useEffect } from 'react';
import './App.css';

const sriLankaGeoData = {
  "Western": ["Colombo", "Gampaha", "Kalutara"],
  "Central": ["Kandy", "Matale", "Nuwara Eliya"],
  "Southern": ["Galle", "Matara", "Hambantota"],
  "Northern": ["Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"],
  "Eastern": ["Trincomalee", "Batticaloa", "Ampara"],
  "North Western": ["Kurunegala", "Puttalam"],
  "North Central": ["Anuradhapura", "Polonnaruwa"],
  "Uva": ["Badulla", "Monaragala"],
  "Sabaragamuwa": ["Ratnapura", "Kegalle"]
};

import { StepProgress, StepHeading, TextField, SelectField, PrimaryButton, SecondaryLink } from './components/OnboardingUI.jsx';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import { API_BASE_URL } from './config.js';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});



export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  const [phoneNo, setPhoneNo] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  function LocationMarker() {
    const map = useMapEvents({
      click(e) {
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      },
    });

    useEffect(() => {
      if (lat && lng) {
        map.flyTo([lat, lng], 15);
      }
    }, [lat, lng, map]);

    return lat && lng ? <Marker position={[lat, lng]} /> : null;
  }

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please check browser permissions.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
      setStep(1);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (name.trim()) setStep(2);
      return;
    }
    if (step === 2) {
      if (/^0\d{9}$/.test(phoneNo.trim())) setStep(3);
      return;
    }
    if (step === 3) {
      if (houseNo.trim() && street.trim() && area.trim() && district.trim() && province.trim()) setStep(4);
      return;
    }
    
    // Final step submission
    const fullAddress = [houseNo, street, area, district, province].filter(Boolean).join(', ');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE_URL}/auth/onboarding`, {
        phoneNo,
        address: fullAddress,
        locationLat: lat,
        locationLng: lng
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Redirect to Find page after successful onboarding
      window.history.pushState({}, '', '/find');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (err) {
      console.error("Failed to save profile:", err.response || err);
      const backendMsg = err.response?.data?.message || err.message;
      alert(`Failed to save your details to the database.\nReason: ${backendMsg}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
      padding: '96px 20px 2rem 20px', // 96px top padding, 20px side padding for phone width
      boxSizing: 'border-box',
      width: '100%',
      overflowX: 'hidden'
    }}>
      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '32px', // 32px vertical gap between blocks
        width: '100%', 
        maxWidth: '480px', // max-width 480px
        opacity: showForm ? 1 : 0,
        transform: showForm ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: showForm ? 'auto' : 'none'
      }}>
        
        {step > 0 && <StepProgress currentStep={step} totalSteps={4} />}

        {step === 1 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <StepHeading 
              title="What should we call you?" 
              subtitle="This is the name neighbours and workers will see on your posts and bookings."
            />
            <TextField
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              <PrimaryButton 
                label="Continue" 
                onClick={() => setStep(2)}
                disabled={!name.trim()}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <StepHeading 
              title="What is your phone number?" 
              subtitle="We'll use this to coordinate bookings and send important updates."
            />
            <TextField
              label="Phone Number (10 digits)"
              type="tel"
              maxLength={10}
              value={phoneNo}
              errorText={phoneNo.length > 0 && !/^0\d{9}$/.test(phoneNo) ? "Phone number must be 10 digits starting with 0" : ""}
              onChange={(e) => setPhoneNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              <PrimaryButton 
                label="Continue" 
                onClick={() => setStep(3)}
                disabled={!/^0\d{9}$/.test(phoneNo.trim())}
              />
              <SecondaryLink label="Back" onClick={() => setStep(1)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <StepHeading 
              title="What is your home address?" 
              subtitle="This helps us show you nearby services and accurately map your requests."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField 
                label="House no/name" 
                value={houseNo} 
                onChange={(e) => setHouseNo(e.target.value)}
              />
              <TextField 
                label="Street" 
                value={street} 
                onChange={(e) => setStreet(e.target.value)}
              />
              <TextField 
                label="Area" 
                value={area} 
                onChange={(e) => setArea(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '16px' }}>
                <SelectField 
                  label="Province" 
                  value={province} 
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setDistrict(''); // Clear district when province changes
                  }} 
                  placeholder="Select Province"
                  options={Object.keys(sriLankaGeoData).map(p => ({ label: p, value: p }))}
                />
                <SelectField 
                  label="District" 
                  value={district} 
                  onChange={(e) => setDistrict(e.target.value)} 
                  disabled={!province}
                  placeholder="Select District"
                  options={province ? sriLankaGeoData[province].map(d => ({ label: d, value: d })) : []}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              <PrimaryButton 
                label="Continue" 
                onClick={() => setStep(4)}
                disabled={!houseNo.trim() || !street.trim() || !area.trim() || !district.trim() || !province.trim()}
              />
              <SecondaryLink label="Back" onClick={() => setStep(2)} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
            <StepHeading 
              title="Pin your location" 
              subtitle="Drop a pin so workers can easily find their way to you."
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '300px', width: '100%', borderRadius: '16px', overflow: 'hidden', border: '1.5px solid #D4D4D4', zIndex: 0, position: 'relative' }}>
                <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <LocationMarker />
                </MapContainer>
                <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
                  <button 
                    type="button" 
                    onClick={(e) => { e.preventDefault(); handleGetLocation(); }}
                    style={{ 
                      borderRadius: '999px',
                      backgroundColor: '#ffffff',
                      color: '#000000',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      padding: '12px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '700',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fa-solid fa-location-crosshairs"></i> My Location
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '14px', color: '#5C5C5C' }}>
                {lat && lng ? `Selected: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'Tap on the map to pin your location'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
              <PrimaryButton 
                type="submit" 
                label="Finish" 
                isLastStep={true}
                disabled={false} // Adjust according to requirements, seems previously it wasn't disabled strictly on missing pin
              />
              <SecondaryLink label="Back" onClick={() => setStep(3)} />
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
// This component implements a multi-step onboarding process for users, collecting their name, phone number, home address, and location. It uses React state to manage the current step and form data, and integrates with Leaflet for map functionality. The component also handles form submission to save user details to the backend API.