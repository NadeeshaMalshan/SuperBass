import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import UserMenu from './components/UserMenu.jsx';
import M3TopNavbar from './components/M3TopNavbar.jsx';
import AiAssistantWidget from './components/AiAssistantWidget.jsx';
import ServiceCategories from './components/ServiceCategories.jsx';
import Footer from './components/Footer.jsx';
import categoriesData from './data/categories.json';
import sriLankaDistricts from './data/sriLankaDistricts.json';
import hero1Img from './assets/1.png';
import hero2Img from './assets/2.png';
import hero3Img from './assets/3.png';

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

const CATEGORY_DESCRIPTIONS = {
  'plumbing': 'Pipe leaks, taps, bathroom & water lines',
  'electrical': 'Wiring, tripping, repairs & power switches',
  'carpentry': 'Furniture, doors, locks & woodcraft',
  'painting': 'Interior & exterior painting, wall finishing',
  'masonry-construction': 'Brickwork, tiling, plastering & foundations',
  'ac-air-conditioning': 'AC installation, servicing & cooling repair',
  'welding': 'Gates, metal grills, railings & welding',
  'cleaning': 'Deep house cleaning, dusting & sanitization',
  'gardening-landscaping': 'Lawn mowing, landscaping & tree trimming',
  'handyman-services': 'General repairs, fixture installation & maintenance',
  'vehicle-repair-mechanic': 'Auto maintenance, engine tuning & breakdowns',
  'roofing': 'Tile replacement, roof leaks & gutter repair',
  'glass-window-services': 'Window glass fitting, aluminum & glass repairs',
  'locksmith': 'Lock picking, key duplication & lock changes',
  'appliance-repair': 'Washing machines, fridges, microwaves & ovens',
  'computer-it-services': 'Laptop repairs, PC setup, networking & OS',
  'phone-repair': 'Screen replacement, battery & mobile diagnostics',
  'moving-transport': 'Lorry transport, house moving & logistics',
  'furniture-repair-assembly': 'Sofa upholstery, table & chair repairs',
  'pest-control': 'Termite treatment, bed bug & pest extermination',
  'cctv-installation-repair': 'Camera setup, alarm systems & security wiring',
  'others': 'Specialized tasks & miscellaneous trade work'
};

const ALL_SERVICES = categoriesData.map(c => ({
  name: c.name,
  category: c.name,
  icon: c.materialIcon || 'handyman',
  desc: CATEGORY_DESCRIPTIONS[c.id] || `${c.name} services & repairs`
}));

export default function App() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const [heroLocation, setHeroLocation] = useState('Colombo');
  const [isChangingCity, setIsChangingCity] = useState(false);
  const [tempCity, setTempCity] = useState('Colombo');
  const [districtSearch, setDistrictSearch] = useState('');
  const [heroService, setHeroService] = useState('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState('now');
  const [isLocating, setIsLocating] = useState(false);
  const [aiUploadedImage, setAiUploadedImage] = useState(null);
  const aiFileInputRef = useRef(null);
  const serviceDropdownRef = useRef(null);
  const cityModalRef = useRef(null);

  const filteredProvinces = Object.entries(sriLankaDistricts).reduce((acc, [province, districts]) => {
    const searchLower = districtSearch.trim().toLowerCase();
    if (!searchLower) {
      acc[province] = districts;
    } else {
      const matchedDistricts = districts.filter(d =>
        d.toLowerCase().includes(searchLower) ||
        province.toLowerCase().includes(searchLower)
      );
      if (matchedDistricts.length > 0) {
        acc[province] = matchedDistricts;
      }
    }
    return acc;
  }, {});

  const handleSelectDistrict = (district) => {
    // Pure district name only (e.g. 'Colombo', 'Ratnapura') - no ', LK' or '%2C'
    const locStr = district.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
    setHeroLocation(locStr);
    setTempCity(locStr);
    setIsChangingCity(false);
  };

  const handleApplyCustomCity = () => {
    if (tempCity.trim()) {
      const cleanCity = tempCity.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
      setHeroLocation(cleanCity);
    }
    setIsChangingCity(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
        setIsServiceDropdownOpen(false);
      }
      if (cityModalRef.current && !cityModalRef.current.contains(e.target) && !e.target.closest('.landing-hero-change-city-btn')) {
        setIsChangingCity(false);
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
    if (heroLocation.trim()) {
      const cleanLoc = heroLocation.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
      if (cleanLoc && cleanLoc.toLowerCase() !== 'current location') {
        params.set('location', cleanLoc);
      }
    }
    const queryStr = params.toString();
    navigate(queryStr ? `/find?${queryStr}` : '/find');
  };

  const handleSelectService = (svcName) => {
    setHeroService(svcName);
    setIsServiceDropdownOpen(false);
  };

  const filteredServices = ALL_SERVICES.filter(s =>
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
          let city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.village || data.address?.county || 'Colombo';
          city = city.replace(/%2c/gi, '').replace(/,?\s*\+?\s*lk\b/gi, '').replace(/,/g, '').trim();
          setHeroLocation(city);
        } catch {
          setHeroLocation('Colombo');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        setHeroLocation('Colombo');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="app-container">
      {/* Material 3 Top Navigation Bar (Dark Theme Matching Screenshot) */}
      <M3TopNavbar showSearch={false} activePage="home" theme="dark" alwaysShowLinks={true} />

      {/* Main Top Hero Section Matching Screenshot */}
      <main className="landing-top-hero-section" id="home">
        <div className="landing-top-hero-container">

          {/* Left Column: Location, Title, and Pill Service Selector */}
          <div className="landing-top-hero-left">
            {/* Location Line */}
            <div className="landing-hero-location-row">
              <md-icon className="landing-hero-location-pin">location_on</md-icon>
              <span className="landing-hero-location-name">{heroLocation || 'Colombo'}</span>
              <button
                type="button"
                className="landing-hero-change-city-btn"
                onClick={() => {
                  setTempCity(heroLocation || 'Colombo');
                  setDistrictSearch('');
                  setIsChangingCity(prev => !prev);
                }}
              >
                Change city
              </button>

              {/* City Selection Popover */}
              {isChangingCity && (
                <div className="landing-city-popover" ref={cityModalRef}>
                  <div className="landing-city-popover-header">
                    <span>Select District (Sri Lanka)</span>
                    <button
                      type="button"
                      className="landing-city-close-btn"
                      onClick={() => setIsChangingCity(false)}
                      title="Close"
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
                              const isSelected = heroLocation.toLowerCase().startsWith(district.toLowerCase());
                              return (
                                <button
                                  key={district}
                                  type="button"
                                  className={`landing-district-chip ${isSelected ? 'active' : ''}`}
                                  onClick={() => handleSelectDistrict(district)}
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
                    onClick={() => {
                      handleDetectLocation();
                      setIsChangingCity(false);
                    }}
                  >
                    <md-icon style={{ fontSize: '18px' }}>near_me</md-icon>
                    <span>Detect my current location</span>
                  </button>
                </div>
              )}
            </div>

            {/* Request a Worker Title */}
            <h1 className="landing-top-hero-title">
              Request a Worker
            </h1>

            {/* Single Rounded Pill Search / Service Selector */}
            <div className="landing-hero-service-pill-wrap" ref={serviceDropdownRef}>
              <div
                className="landing-hero-service-pill"
                onClick={() => setIsServiceDropdownOpen(prev => !prev)}
              >
                <md-icon className="landing-pill-list-icon">format_list_bulleted</md-icon>
                <input
                  type="text"
                  className="landing-pill-input"
                  placeholder="Which service do you need?"
                  value={heroService}
                  onChange={(e) => {
                    setHeroService(e.target.value);
                    setIsServiceDropdownOpen(true);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsServiceDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsServiceDropdownOpen(false);
                      handleHeroSearch();
                    }
                  }}
                />
                <md-icon className={`landing-pill-chevron-icon ${isServiceDropdownOpen ? 'open' : ''}`}>
                  keyboard_arrow_down
                </md-icon>
              </div>

              {/* Interactive Service Suggestions Dropdown */}
              {isServiceDropdownOpen && (
                <div className="landing-service-dropdown-menu">
                  <div className="uber-dropdown-header">
                    <span>{heroService.trim() ? `Matching "${heroService}"` : 'All Services & Baas Categories'}</span>
                    <span className="uber-dropdown-count">{filteredServices.length} available</span>
                  </div>

                  <div className="uber-dropdown-list">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((svc) => (
                        <div
                          key={svc.name}
                          className={`uber-service-item ${heroService.toLowerCase() === svc.name.toLowerCase() ? 'selected' : ''}`}
                          onClick={() => {
                            handleSelectService(svc.name);
                            handleHeroSearch(svc.name);
                          }}
                        >
                          <div className="uber-service-item-icon">
                            <md-icon style={{ fontSize: '20px' }}>{svc.icon}</md-icon>
                          </div>
                          <div className="uber-service-item-info">
                            <div className="uber-service-item-name">{svc.name}</div>
                            <div className="uber-service-item-desc">{svc.desc}</div>
                          </div>
                          <md-icon className="uber-service-item-arrow" style={{ fontSize: '18px' }}>
                            arrow_forward
                          </md-icon>
                        </div>
                      ))
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

          {/* Right Column: Hero Artwork Card (1.png) */}
          <div className="landing-top-hero-right">
            <div className="landing-top-hero-card">
              <img
                src={hero1Img}
                alt="SuperBass Craftsman at Sunset"
                className="landing-top-hero-img"
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

          {/* Right Column: Hero2 Artwork Card (2.png) */}
          <div className="landing-community-image-col">
            <div className="landing-community-image-card">
              <img
                src={hero2Img}
                alt="SuperBass Neighborhood Community & Craftsmen"
                className="landing-community-artwork"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Redesigned AI Section with hero3.png on Left */}
      <section className="landing-ai-section" id="ai-diagnostic">
        <div className="landing-ai-container">

          {/* Left Column: Hero3 Artwork Card (3.png) */}
          <div className="landing-ai-image-col">
            <div className="landing-ai-image-card">
              <img
                src={aiUploadedImage || hero3Img}
                alt="SuperBass AI Intelligent Home Repair Assistant"
                className="landing-ai-artwork"
              />
            </div>
          </div>

          {/* Right Column: AI Info & Features & CTAs */}
          <div className="landing-ai-content-col">


            <h2 className="landing-ai-title">
              Now, you can manage your work with SuperBass AI
            </h2>



            <div className="landing-ai-features-list">
              <div className="landing-ai-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Describe your repair or maintenance problem in simple words</span>
              </div>
              <div className="landing-ai-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Instantly find & match verified local workers tailored to your job</span>
              </div>
              <div className="landing-ai-feature-item">
                <div className="landing-feature-check">
                  <md-icon style={{ fontSize: '16px' }}>check</md-icon>
                </div>
                <span>Book trusted craftsmen directly, manage requests, and leave ratings & reviews</span>
              </div>
            </div>

            <div className="landing-ai-actions">
              <button
                type="button"
                className="uber-primary-black-btn landing-ai-btn"
                onClick={() => navigate('/community/chat')}
              >
                <span>Try SuperBass AI</span>

              </button>



              <input
                type="file"
                ref={aiFileInputRef}
                onChange={handleAiImageUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
          </div>

        </div>
      </section>

      {/* Whole Black Theme Uber-style Footer */}
      <Footer />

      {/* Floating AI Assistant Widget */}
      <AiAssistantWidget />
    </div>
  );
}
