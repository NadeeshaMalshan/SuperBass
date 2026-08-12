import React, { useState, useRef } from 'react';
import './App.css';

// Google Material 3 Web Components
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';

export default function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
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
          <li className="nav-link">Services</li>
          <li className="nav-link">How it Works</li>
          <li className="nav-link">AI Diagnostic</li>
          <li className="nav-link">For Baas / Pros</li>
        </ul>

        <div className="nav-actions">
          {/* Material 3 Outlined Button for Secondary Action */}


          {/* Material 3 Filled Button for Primary Action */}
          <md-filled-button class="header-cta-btn">
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
          <md-filled-button class="hero-cta-button" onClick={() => alert('Welcome to SuperBass! Connecting you with certified local pros...')}>
            Get started
            <span className="material-symbols-outlined btn-icon" slot="trailing-icon">
              arrow_forward
            </span>
          </md-filled-button>



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
                  <span className="corner top-left"></span>
                  <span className="corner top-right"></span>
                  <span className="corner bottom-left"></span>
                  <span className="corner bottom-right"></span>
                  <i className={worker.icon}></i>
                </div>
                <span className="worker-name">{worker.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
