import React, { useState, useEffect } from 'react';
import './App.css';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/textfield/filled-text-field.js';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for missing marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const generateM3CookiePath9 = (cx = 250, cy = 250, rOuter = 230, rInner = 190) => {
  const numLobes = 9;
  const points = [];
  for (let i = 0; i < numLobes; i++) {
    const angleOuter = ((i * 360 / numLobes) - 90) * (Math.PI / 180);
    const angleInner = (((i + 0.5) * 360 / numLobes) - 90) * (Math.PI / 180);
    points.push({
      xo: cx + rOuter * Math.cos(angleOuter),
      yo: cy + rOuter * Math.sin(angleOuter),
      xi: cx + rInner * Math.cos(angleInner),
      yi: cy + rInner * Math.sin(angleInner),
      angleOuter,
      angleInner
    });
  }
  let d = '';
  for (let i = 0; i < numLobes; i++) {
    const curr = points[i];
    const next = points[(i + 1) % numLobes];
    if (i === 0) d += `M ${curr.xo} ${curr.yo} `;
    const cp1x = cx + rOuter * Math.cos(curr.angleOuter + 0.16);
    const cp1y = cy + rOuter * Math.sin(curr.angleOuter + 0.16);
    const cp2x = cx + rInner * Math.cos(curr.angleInner - 0.16);
    const cp2y = cy + rInner * Math.sin(curr.angleInner - 0.16);
    d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.xi} ${curr.yi} `;
    const cp3x = cx + rInner * Math.cos(curr.angleInner + 0.16);
    const cp3y = cy + rInner * Math.sin(curr.angleInner + 0.16);
    const cp4x = cx + rOuter * Math.cos(next.angleOuter - 0.16);
    const cp4y = cy + rOuter * Math.sin(next.angleOuter - 0.16);
    d += `C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${next.xo} ${next.yo} `;
  }
  d += 'Z';
  return d;
};

const Stepper = ({ currentStep }) => {
  const steps = [1, 2, 3, 4];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', width: '100%', marginBottom: '1rem' }}>
      {steps.map((stepNum, index) => {
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <React.Fragment key={stepNum}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                color: isCompleted || isActive ? '#ffffff' : '#94a3b8',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'color 0.5s ease',
              }}>
                <svg viewBox="0 0 500 500" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                  <path 
                    d={generateM3CookiePath9(250, 250, 235, 195)} 
                    fill="#ffffff" 
                    stroke={isCompleted || isActive ? '#000000' : '#e2e8f0'} 
                    strokeWidth="30"
                    style={{ transition: 'stroke 0.5s ease' }}
                  />
                </svg>
                <svg viewBox="0 0 500 500" style={{ 
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1,
                  transform: isCompleted || isActive ? 'scale(1)' : 'scale(0)',
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  transformOrigin: 'center'
                }}>
                  <path 
                    d={generateM3CookiePath9(250, 250, 235, 195)} 
                    fill="#000000" 
                  />
                </svg>
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isCompleted ? '✓' : stepNum}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                backgroundColor: '#f1f5f9',
                marginTop: '15px',
                marginLeft: '8px',
                marginRight: '8px',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  backgroundColor: '#000000',
                  width: isCompleted ? '100%' : '0%',
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

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
    const fullAddress = [houseNo, street, area, district, province].filter(Boolean).join(', ');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5237/api/auth/onboarding', {
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
      fontFamily: 'var(--font-body)',
      padding: '2rem',
      paddingTop: '15vh',
      boxSizing: 'border-box'
    }}>
      <h1 style={{ 
        fontFamily: 'var(--font-heading)',
        fontSize: '32px', 
        marginBottom: '2rem', 
        textAlign: 'center',
        transform: showForm ? 'translateY(0) scale(1)' : 'translateY(35vh) scale(1.5)',
        transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        transformOrigin: 'top center',
        margin: '0 0 2rem 0'
      }}>
        We want to know about YOU!
      </h1>

      <form onSubmit={handleSubmit} style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.5rem', 
        width: '100%', 
        maxWidth: '400px',
        opacity: showForm ? 1 : 0,
        transform: showForm ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: showForm ? 'auto' : 'none'
      }}>
        
        {step > 0 && <Stepper currentStep={step} />}
        {step === 1 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', margin: 0, fontSize: '24px', fontWeight: 'normal' }}>
              What is your name?
            </h2>
            <md-filled-text-field
              label="Name"
              type="text"
              value={name}
              onInput={(e) => setName(e.target.value)}
            ></md-filled-text-field>
            <md-filled-button 
              type="button" 
              onClick={() => setStep(2)}
              disabled={!name.trim()}
              style={{
                '--md-filled-button-container-shape': '50px',
                '--md-sys-color-primary': '#FDC101',
                '--md-sys-color-on-primary': '#000000',
                height: '56px',
                fontSize: '18px',
                marginTop: '1rem',
                opacity: !name.trim() ? 0.5 : 1
              }}
            >
              Next
            </md-filled-button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', margin: 0, fontSize: '24px', fontWeight: 'normal' }}>
              What is your phone number?
            </h2>
            <md-filled-text-field
              label="Phone Number"
              type="tel"
              value={phoneNo}
              onInput={(e) => setPhoneNo(e.target.value)}
            ></md-filled-text-field>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
               <md-outlined-button 
                 type="button" 
                 onClick={() => setStep(1)} 
                 style={{ flex: 1, height: '56px', fontSize: '18px', '--md-outlined-button-container-shape': '50px' }}
               >
                 Back
               </md-outlined-button>
               <md-filled-button 
                 type="button" 
                 onClick={() => setStep(3)} 
                 disabled={!phoneNo.trim()}
                 style={{
                   flex: 1,
                   '--md-filled-button-container-shape': '50px',
                   '--md-sys-color-primary': '#FDC101',
                   '--md-sys-color-on-primary': '#000000',
                   height: '56px',
                   fontSize: '18px',
                   opacity: !phoneNo.trim() ? 0.5 : 1
                 }}
               >
                 Next
               </md-filled-button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', margin: 0, fontSize: '24px', fontWeight: 'normal', marginBottom: '0.5rem' }}>
              What is your home address?
            </h2>
            <md-filled-text-field 
              label="House no/name" 
              value={houseNo} 
              onInput={(e) => setHouseNo(e.target.value)}
            ></md-filled-text-field>
            <md-filled-text-field 
              label="Street" 
              value={street} 
              onInput={(e) => setStreet(e.target.value)}
            ></md-filled-text-field>
            <md-filled-text-field 
              label="Area" 
              value={area} 
              onInput={(e) => setArea(e.target.value)}
            ></md-filled-text-field>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <md-filled-text-field 
                label="District" 
                value={district} 
                onInput={(e) => setDistrict(e.target.value)} 
                style={{ flex: 1 }}
              ></md-filled-text-field>
              <md-filled-text-field 
                label="Province" 
                value={province} 
                onInput={(e) => setProvince(e.target.value)} 
                style={{ flex: 1 }}
              ></md-filled-text-field>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
               <md-outlined-button 
                 type="button" 
                 onClick={() => setStep(2)} 
                 style={{ flex: 1, height: '56px', fontSize: '18px', '--md-outlined-button-container-shape': '50px' }}
               >
                 Back
               </md-outlined-button>
               <md-filled-button 
                 type="button" 
                 onClick={() => setStep(4)}
                 disabled={!houseNo.trim() || !street.trim() || !area.trim() || !district.trim() || !province.trim()}
                 style={{
                   flex: 1,
                   '--md-filled-button-container-shape': '50px',
                   '--md-sys-color-primary': '#FDC101',
                   '--md-sys-color-on-primary': '#000000',
                   height: '56px',
                   fontSize: '18px',
                   opacity: (!houseNo.trim() || !street.trim() || !area.trim() || !district.trim() || !province.trim()) ? 0.5 : 1
                 }}
               >
                 Next
               </md-filled-button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="fade-in-step" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', textAlign: 'center', margin: 0, fontSize: '24px', fontWeight: 'normal', marginBottom: '0.5rem' }}>
              Pin your location
            </h2>
            <div style={{ height: '300px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0, position: 'relative' }}>
              <MapContainer center={[6.9271, 79.8612]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <LocationMarker />
              </MapContainer>
              <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
                <md-filled-button 
                  type="button" 
                  onClick={(e) => { e.preventDefault(); handleGetLocation(); }}
                  style={{ 
                    '--md-filled-button-container-shape': '50px', 
                    '--md-sys-color-primary': '#ffffff', 
                    '--md-sys-color-on-primary': '#000000',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    padding: '8px 16px',
                    margin: '4px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    <i className="fa-solid fa-location-crosshairs"></i> My Location
                  </span>
                </md-filled-button>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
              {lat && lng ? `Selected: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}` : 'Tap on the map to pin your location'}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
               <md-outlined-button 
                 type="button" 
                 onClick={() => setStep(3)} 
                 style={{ flex: 1, height: '56px', fontSize: '18px', '--md-outlined-button-container-shape': '50px' }}
               >
                 Back
               </md-outlined-button>
               <md-filled-button 
                 type="submit" 
                 style={{
                   flex: 1,
                   '--md-filled-button-container-shape': '50px',
                   '--md-sys-color-primary': '#FDC101',
                   '--md-sys-color-on-primary': '#000000',
                   height: '56px',
                   fontSize: '18px',
                 }}
               >
                 Complete
               </md-filled-button>
            </div>
          </div>
        )}

      </form>
    </div>
  );
}
