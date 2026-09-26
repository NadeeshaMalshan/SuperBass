import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UserMenu from './components/UserMenu.jsx';
import M3TopNavbar from './components/M3TopNavbar.jsx';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';
import ServiceCategories, { getCategoryIllustration } from './components/ServiceCategories.jsx';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

// Helper to generate a 9-sided Material 3 Scalloped Cookie Shape SVG path
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
    if (i === 0) {
      d += `M ${curr.xo} ${curr.yo} `;
    }
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

const POPULAR_SERVICES = [
  { name: 'Electrician', category: 'Electrical', icon: 'electrical_services', desc: 'Wiring, tripping, repairs & power switches' },
  { name: 'Plumber', category: 'Plumbing', icon: 'plumbing', desc: 'Pipe leaks, taps, bathroom & water lines' },
  { name: 'Carpenter', category: 'Carpentry', icon: 'carpenter', desc: 'Furniture, doors, locks & woodcraft' },
  { name: 'Mason', category: 'Masonry', icon: 'foundation', desc: 'Brickwork, tiling, plastering & foundations' },
  { name: 'Painter', category: 'Painting', icon: 'format_paint', desc: 'Interior & exterior painting, wall finishing' },
  { name: 'AC Repair', category: 'AC Repair', icon: 'ac_unit', desc: 'AC installation, servicing & cooling repair' },
  { name: 'Appliance Repair', category: 'Appliance Repair', icon: 'home_repair_service', desc: 'Washing machines, fridges & ovens' },
  { name: 'Roofing', category: 'Roofing', icon: 'roofing', desc: 'Tile replacement, roof leaks & gutter repair' },
  { name: 'Cleaning & Maid', category: 'Cleaning', icon: 'cleaning_services', desc: 'Deep house cleaning, dusting & sanitization' },
  { name: 'Gardener', category: 'Gardening', icon: 'yard', desc: 'Lawn mowing, landscaping & tree trimming' },
  { name: 'CCTV & Security', category: 'CCTV & Security', icon: 'videocam', desc: 'Camera setup, alarm systems & security wiring' },
  { name: 'Welder / Iron Works', category: 'Welding', icon: 'handyman', desc: 'Gates, metal grills, railings & welding' }
];

export default function App() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const [heroLocation, setHeroLocation] = useState('');
  const [heroService, setHeroService] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState('now');
  const [isLocating, setIsLocating] = useState(false);
  const [aiUploadedImage, setAiUploadedImage] = useState(null);
  const aiFileInputRef = useRef(null);
  const serviceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
        setIsServiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAiImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAiUploadedImage(url);
    }
  };

  const handleHeroSearch = (serviceOverride) => {
    const serviceToUse = typeof serviceOverride === 'string' ? serviceOverride : heroService;
    const params = new URLSearchParams();
    if (serviceToUse.trim()) params.set('q', serviceToUse.trim());
    if (heroLocation.trim()) params.set('location', heroLocation.trim());
    const queryStr = params.toString();
    navigate(queryStr ? `/find?${queryStr}` : '/find');
  };

  const handleSelectService = (svcName) => {
    setHeroService(svcName);
    setIsServiceDropdownOpen(false);
  };

  const filteredServices = POPULAR_SERVICES.filter(s =>
    !heroService.trim() ||
    s.name.toLowerCase().includes(heroService.toLowerCase()) ||
    s.desc.toLowerCase().includes(heroService.toLowerCase()) ||
    s.category.toLowerCase().includes(heroService.toLowerCase())
  );

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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.village || data.address?.county || 'Current Location';
          setHeroLocation(city);
        } catch {
          setHeroLocation('Current Location');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setHeroLocation('Current Location');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="app-container">
      {/* Background ambient lighting */}
      <div className="hero-glow-bg" />

      {/* Material 3 Top Navigation Bar (Uniform with Chats / Find / Community) */}
      <M3TopNavbar showSearch={false} activePage="home" />



      {/* Main Hero Section — Uber Clone Layout */}
      <main className="uber-hero-section" id="home">
        <div className="uber-hero-container">

          {/* Left Column: Interactive Request & Worker Search Module */}
          <div className="uber-hero-form-col">
            <h1 className="uber-hero-title">
              Request a Worker
            </h1>



            {/* Connected Location & Service Inputs Box */}
            <div className="uber-connected-inputs-box">
              {/* Vertical Connector Line */}
              <div className="uber-inputs-connector-line" />

              {/* Location Input Row */}
              <div className="uber-input-row">
                <div className="uber-marker-circle" />
                <input
                  type="text"
                  className="uber-text-input"
                  placeholder="Your location (e.g. Colombo...)"
                  value={heroLocation}
                  onChange={(e) => setHeroLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleHeroSearch()}
                />
                <button
                  type="button"
                  className="uber-gps-btn"
                  title="Detect my current location"
                  onClick={handleDetectLocation}
                  disabled={isLocating}
                >
                  <md-icon style={{ fontSize: '20px', color: isLocating ? '#94a3b8' : '#000000' }}>
                    {isLocating ? 'sync' : 'near_me'}
                  </md-icon>
                </button>
              </div>

              {/* Service Needed Input Row with Search & Suggestions */}
              <div className="uber-input-row uber-service-input-row" ref={serviceDropdownRef}>
                <div className="uber-marker-square" />
                <input
                  type="text"
                  className="uber-text-input"
                  placeholder="What is your service?"
                  value={heroService}
                  onChange={(e) => {
                    setHeroService(e.target.value);
                    setIsServiceDropdownOpen(true);
                  }}
                  onFocus={() => setIsServiceDropdownOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsServiceDropdownOpen(false);
                      handleHeroSearch();
                    }
                  }}
                />
                {heroService ? (
                  <button
                    type="button"
                    className="uber-clear-btn"
                    title="Clear service"
                    onClick={() => {
                      setHeroService('');
                      setIsServiceDropdownOpen(true);
                    }}
                  >
                    <md-icon style={{ fontSize: '18px', color: '#6b7280' }}>close</md-icon>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="uber-dropdown-toggle-btn"
                    title="Browse services"
                    onClick={() => setIsServiceDropdownOpen(prev => !prev)}
                  >
                    <md-icon style={{ fontSize: '20px', color: '#6b7280' }}>
                      {isServiceDropdownOpen ? 'expand_less' : 'search'}
                    </md-icon>
                  </button>
                )}

                {/* Interactive Service Suggestions Dropdown */}
                {isServiceDropdownOpen && (
                  <div className="uber-service-dropdown-menu">
                    <div className="uber-dropdown-header">
                      <span>{heroService.trim() ? `Matching "${heroService}"` : 'Popular Services & Baas Categories'}</span>
                      <span className="uber-dropdown-count">{filteredServices.length} available</span>
                    </div>

                    <div className="uber-dropdown-list">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((svc) => {
                          const illustration = getCategoryIllustration(svc.category || svc.name);
                          return (
                            <div
                              key={svc.name}
                              className={`uber-service-item ${heroService.toLowerCase() === svc.name.toLowerCase() ? 'selected' : ''}`}
                              onClick={() => handleSelectService(svc.name)}
                            >
                              <div className="uber-service-item-icon">
                                {illustration ? (
                                  <img
                                    src={illustration}
                                    alt={svc.name}
                                    style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                                  />
                                ) : (
                                  <md-icon style={{ fontSize: '20px' }}>{svc.icon}</md-icon>
                                )}
                              </div>
                              <div className="uber-service-item-info">
                                <div className="uber-service-item-name">{svc.name}</div>
                                <div className="uber-service-item-desc">{svc.desc}</div>
                              </div>
                              <md-icon className="uber-service-item-arrow" style={{ fontSize: '18px' }}>
                                arrow_forward
                              </md-icon>
                            </div>
                          );
                        })
                      ) : (
                        <div className="uber-dropdown-empty">
                          <md-icon style={{ fontSize: '28px', color: '#9ca3af' }}>search_off</md-icon>
                          <p>No matching service found for "{heroService}"</p>
                          <button
                            type="button"
                            className="uber-search-custom-btn"
                            onClick={() => handleHeroSearch()}
                          >
                            Search anyway for "{heroService}"
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="uber-hero-actions-row">
              <button
                type="button"
                className="uber-primary-black-btn"
                onClick={handleHeroSearch}
              >
                See available workers
              </button>


            </div>
          </div>

          {/* Right Column: Hero Artwork Image (hero1.png) */}
          <div className="uber-hero-image-col">
            <div className="uber-hero-image-card">
              <img
                src="/hero/hero1.png"
                alt="SuperBass Craftsman at Sunset"
                className="uber-hero-artwork"
              />
            </div>
          </div>

        </div>
      </main>

      {/* Explore Our Services Directory Section */}
      <ServiceCategories
        onSelectCategory={(catName) => handleHeroSearch(catName)}
      />

      {/* Community Showcase Section (Hero Layout Style) */}
      <section className="landing-community-section" id="community-showcase">
        <div className="landing-community-container">

          {/* Left Column: Community Info & CTA */}
          <div className="landing-community-content-col">


            <h2 className="landing-community-title">
              Connect with your local community & find trusted help
            </h2>

            <p className="landing-community-desc">
              Share recommendations, ask neighborhood home repair questions, post free classified ads for tools & leftover materials, and discover trusted craftsmen recommended by local residents.
            </p>

            <div className="landing-community-features-list">
              <div className="landing-community-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Free classified ads & local home service requests</span>
              </div>
              <div className="landing-community-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Direct recommendations & reviews from neighbors</span>
              </div>
              <div className="landing-community-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Community discussions with verified home pros</span>
              </div>
            </div>

            <div className="landing-community-actions">
              <button
                type="button"
                className="uber-primary-black-btn landing-community-btn"
                onClick={() => navigate('/community')}
              >
                <span>Explore Community</span>
                <md-icon style={{ fontSize: '20px' }}>arrow_forward</md-icon>
              </button>
            </div>
          </div>

          {/* Right Column: Hero2 Artwork Card */}
          <div className="landing-community-image-col">
            <div className="landing-community-image-card">
              <img
                src="/hero/hero2.png"
                alt="SuperBass Neighborhood Community & Craftsmen"
                className="landing-community-artwork"
              />
            </div>
          </div>

        </div>
      </section>

      {/* AI Feature Introduction Section */}
      <section className="ai-intro-section" id="ai-diagnostic">
        <div className="ai-intro-container">
          <div className="ai-intro-content">
            <h2 className="ai-intro-title">
              Now, you can manage your work with SuperBass AI
            </h2>
            <md-filled-button
              className="ai-intro-btn"
              onClick={() => aiFileInputRef.current?.click()}
            >
              SuperBass AI
            </md-filled-button>
            <input
              type="file"
              ref={aiFileInputRef}
              onChange={handleAiImageUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div className="ai-intro-mockup-wrapper">
            {/* Dark M3 scalloped bun shapes behind mockup */}
            <div className="ai-blob-layer ai-blob-center">
              <svg viewBox="0 0 1 1" className="ai-blob-svg">
                <path d="M0.796 0.5C0.79965 0.50115 0.80329 0.5023 0.80694 0.50345C0.83737 0.51306 0.86572 0.52834 0.89048 0.54847C0.95417 0.60024 0.98884 0.67965 0.98351 0.76156C0.9835 0.76173 0.98349 0.76191 0.98347 0.76208C0.97477 0.89591 0.86369 1 0.72958 1C0.57653 1 0.42347 1 0.27042 1C0.13631 1 0.02523 0.89591 0.01653 0.76208C0.01651 0.76191 0.0165 0.76173 0.01649 0.76156C0.01116 0.67965 0.04583 0.60024 0.10952 0.54847C0.13428 0.52834 0.16263 0.51306 0.19306 0.50345C0.19671 0.5023 0.20035 0.50115 0.204 0.5C0.20035 0.49885 0.19671 0.4977 0.19306 0.49655C0.16263 0.48694 0.13428 0.47166 0.10952 0.45153C0.04583 0.39976 0.01116 0.32035 0.01649 0.23844C0.0165 0.23827 0.01651 0.23809 0.01653 0.23792C0.02523 0.10409 0.13631 0 0.27042 0C0.42347 0 0.57653 0 0.72958 0C0.86369 0 0.97477 0.10409 0.98347 0.23792C0.98349 0.23809 0.9835 0.23827 0.98351 0.23844C0.98884 0.32035 0.95417 0.39976 0.89048 0.45153C0.86572 0.47166 0.83737 0.48694 0.80694 0.49655C0.80329 0.4977 0.79965 0.49885 0.796 0.5Z" fill="#FDC101" />
              </svg>
            </div>

            {/* CSS Phone Mockup */}
            <div
              className="ai-phone-mockup"
              onClick={() => aiFileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && aiFileInputRef.current?.click()}
            >
              {aiUploadedImage ? (
                <img src={aiUploadedImage} alt="SuperBass AI Preview" className="ai-mockup-image" />
              ) : (
                <img src="/hero/mockup.png" alt="SuperBass AI Mockup" className="ai-mockup-image" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
