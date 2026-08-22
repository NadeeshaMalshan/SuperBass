import React, { useState, useRef } from 'react';
import './App.css';

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

export default function App() {
  const navigate = (newPath) => {
    window.history.pushState({}, '', newPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  const [uploadedImage, setUploadedImage] = useState(null);
  const [aiUploadedImage, setAiUploadedImage] = useState(null);
  const fileInputRef = useRef(null);
  const aiFileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
    }
  };

  const handleAiImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAiUploadedImage(url);
    }
  };

  return (
    <div className="app-container">
      {/* Background ambient lighting */}
      <div className="hero-glow-bg" />

      {/* Modern Top Navigation Bar */}
      <header className="navbar">
        <a href="#home" className="brand-logo">
          <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" className="brand-logo-img" />
        </a>

        <ul className="nav-links">
          <li className="nav-link" onClick={() => navigate('/find')}>Services</li>
          <li className="nav-link" onClick={() => navigate('/community')}>Community</li>
          <li className="nav-link">How it Works</li>
          <li className="nav-link">AI Diagnostic</li>
          <li className="nav-link">For Baas / Pros</li>
        </ul>

        <div className="nav-actions">
          {/* Material 3 Filled Button for Primary Action */}
          <md-filled-button class="header-cta-btn" onClick={() => navigate('/find')}>
            Get Started
          </md-filled-button>
        </div>
      </header>

      {/* Main Hero Section cloned from UI Mockup */}
      <main className="hero-section" id="home">


        {/* Cloned Main Headline */}
        <div className="hero-title-container">
          <h1 className="hero-main-title">
            <span className="highlight-line">Your Home.</span>
            <span className="highlight-line">Our Trusted Hands.</span>
          </h1>
        </div>

        {/* Cloned Subtitle */}

        {/* Cloned Material 3 'Get started' Button */}
        <div className="hero-cta-container">


          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Phone Mockup Area */}
        <div className="hero-mockup-wrapper">
          <div className="mockup-ambient-glow" />

          {/* Material 3 9-Sided Yellow Cookie Shape (Below Phone Mockup Layer) */}
          <div className="m3-cookie-layer">
            <svg viewBox="0 0 500 500" className="m3-cookie-svg">
              <path d={generateM3CookiePath9(250, 250, 235, 195)} fill="#FDC101" />
            </svg>
          </div>

          {/* Floating Feature Badges */}


          {/* Central Phone Mockup */}
          <div className="phone-mockup-container">
            <div style={{ position: 'relative' }}>
              <img
                src="/hero/mockup.png"
                alt="SuperBass Mobile App Mockup"
                className="phone-mockup-image"
              />
              {uploadedImage && (
                <img
                  src={uploadedImage}
                  alt="Uploaded App Preview"
                  style={{
                    position: 'absolute',
                    top: '2.5%',
                    left: '4%',
                    width: '92%',
                    height: '95%',
                    objectFit: 'cover',
                    borderRadius: '0'
                  }}
                />
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Black Background Banner Section */}
      <section className="black-banner-section">
        <div className="black-banner-container">
          <p className="black-banner-text">
            Find reliable local workers for home repairs, maintenance, and everyday services - all in one simple platform.
          </p>

          {/* 3x3 Workers Minimalist Grid */}
          <div className="workers-grid-3x3">
            {[
              { id: 'electrician', icon: 'fa-solid fa-bolt', title: 'Electrician' },
              { id: 'plumber', icon: 'fa-solid fa-faucet-drip', title: 'Plumber' },
              { id: 'carpenter', icon: 'fa-solid fa-hammer', title: 'Carpenter' },
              { id: 'mason', icon: 'fa-solid fa-trowel-bricks', title: 'Mason' },
              { id: 'painter', icon: 'fa-solid fa-paint-roller', title: 'Painter' },
              { id: 'ac-tech', icon: 'fa-solid fa-snowflake', title: 'AC Repair' },
              { id: 'roofing', icon: 'fa-solid fa-house-chimney', title: 'Roofing' },
              { id: 'appliances', icon: 'fa-solid fa-screwdriver-wrench', title: 'Appliance Repair' },
              { id: 'cctv', icon: 'fa-solid fa-video', title: 'CCTV & Security' }
            ].map((worker) => (
              <div key={worker.id} className="worker-item">
                <div className="worker-icon-frame">
                  <svg className="sunny-shape" viewBox="0 0 1 1">
                    <path d="M0.99691 0.5C0.99691 0.51795 0.99072 0.53589 0.97834 0.55042C0.95303 0.58011 0.92773 0.6098 0.90242 0.6395C0.89181 0.65195 0.8854 0.66742 0.8841 0.68373C0.881 0.72262 0.8779 0.76151 0.87479 0.8004C0.87176 0.83845 0.84154 0.86866 0.80349 0.8717C0.7646 0.8748 0.72571 0.8779 0.68683 0.88101C0.67052 0.88231 0.65504 0.88872 0.64259 0.89933C0.6129 0.92463 0.58321 0.94994 0.55351 0.97524C0.52446 1 0.48173 1 0.45268 0.97524C0.42298 0.94994 0.39329 0.92463 0.3636 0.89933C0.35115 0.88872 0.33567 0.88231 0.31936 0.88101C0.28048 0.8779 0.24159 0.8748 0.2027 0.8717C0.16465 0.86866 0.13443 0.83845 0.1314 0.8004C0.12829 0.76151 0.12519 0.72262 0.12209 0.68373C0.12079 0.66742 0.11437 0.65195 0.10377 0.6395C0.07846 0.6098 0.05316 0.58011 0.02785 0.55042C0.00309 0.52137 0.00309 0.47863 0.02785 0.44958C0.05316 0.41989 0.07846 0.3902 0.10377 0.3605C0.11437 0.34805 0.12079 0.33258 0.12209 0.31627C0.12519 0.27738 0.12829 0.23849 0.1314 0.1996C0.13443 0.16155 0.16465 0.13134 0.2027 0.1283C0.24159 0.1252 0.28048 0.1221 0.31936 0.11899C0.33567 0.11769 0.35115 0.11128 0.3636 0.10067C0.39329 0.07537 0.42298 0.05006 0.45268 0.02476C0.48173 0 0.52446 0 0.55351 0.02476C0.58321 0.05006 0.6129 0.07537 0.64259 0.10067C0.65504 0.11128 0.67052 0.11769 0.68683 0.11899C0.72571 0.1221 0.7646 0.1252 0.80349 0.1283C0.84154 0.13134 0.87176 0.16155 0.87479 0.1996C0.8779 0.23849 0.881 0.27738 0.8841 0.31627C0.8854 0.33258 0.89181 0.34805 0.90242 0.3605C0.92773 0.3902 0.95303 0.41989 0.97834 0.44958C0.99072 0.46411 0.99691 0.48205 0.99691 0.5Z" />
                  </svg>
                  <i className={worker.icon}></i>
                </div>
                <span className="worker-name">{worker.title}</span>
              </div>
            ))}
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
              class="ai-intro-btn"
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
    </div>
  );
}
