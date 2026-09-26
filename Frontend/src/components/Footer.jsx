import React, { useState } from 'react';
import './Footer.css';

export default function Footer() {
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [isLangOpen, setIsLangOpen] = useState(false);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="uber-footer-wrapper">
      <div className="uber-footer-container">

        {/* Top Brand & Help Header */}
        <div className="uber-footer-top">
          <div className="uber-footer-brand" onClick={() => navigate('/')}>
            <span className="uber-footer-logo-text">superබාස්</span>
            <span className="uber-footer-badge">SuperBass</span>
          </div>
          <a
            href="/community"
            className="uber-footer-help-link"
            onClick={(e) => {
              e.preventDefault();
              navigate('/community');
            }}
          >
            Visit Help & Community Center
          </a>
        </div>

        {/* 4 Multi-Column Directory */}
        <div className="uber-footer-columns">
          {/* Column 1: Company */}
          <div className="uber-footer-col">
            <h4 className="uber-footer-col-title">Company</h4>
            <ul className="uber-footer-links-list">
              <li><a href="#home" onClick={(e) => { e.preventDefault(); navigate('/'); }}>About us</a></li>
              <li><a href="#services" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>Our offerings</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Community Hub</a></li>
              <li><a href="#trust" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Trust & Safety</a></li>
              <li><a href="#blog" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Newsroom & Blog</a></li>
              <li><a href="/join" onClick={(e) => { e.preventDefault(); navigate('/join'); }}>Careers at SuperBass</a></li>
              <li><a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>SuperBass Baas Pro</a></li>
            </ul>
          </div>

          {/* Column 2: Products / Services */}
          <div className="uber-footer-col">
            <h4 className="uber-footer-col-title">Services</h4>
            <ul className="uber-footer-links-list">
              <li><a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>Hire a Baas</a></li>
              <li><a href="/join" onClick={(e) => { e.preventDefault(); navigate('/join'); }}>Become a Baas / Pro</a></li>
              <li><a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>Trade Categories</a></li>
              <li><a href="/ai/chat" onClick={(e) => { e.preventDefault(); navigate('/ai/chat'); }}>SuperBass AI Diagnostic</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Community Classifieds</a></li>
              <li><a href="/find?q=Emergency" onClick={(e) => { e.preventDefault(); navigate('/find?q=Emergency'); }}>Emergency Repairs</a></li>
              <li><a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>Price Guide</a></li>
            </ul>
          </div>

          {/* Column 3: Trust & Community */}
          <div className="uber-footer-col">
            <h4 className="uber-footer-col-title">Trust & Safety</h4>
            <ul className="uber-footer-links-list">
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Verified Background Checks</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Resident Protection</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Neighbor Reviews</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Fair Trade Guarantee</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Community Guidelines</a></li>
              <li><a href="/community" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Sustainability & Local Baas</a></li>
            </ul>
          </div>

          {/* Column 4: Coverage / Locations */}
          <div className="uber-footer-col">
            <h4 className="uber-footer-col-title">Locations</h4>
            <ul className="uber-footer-links-list">
              <li><a href="/find?location=Colombo" onClick={(e) => { e.preventDefault(); navigate('/find?location=Colombo'); }}>Colombo</a></li>
              <li><a href="/find?location=Kandy" onClick={(e) => { e.preventDefault(); navigate('/find?location=Kandy'); }}>Kandy</a></li>
              <li><a href="/find?location=Galle" onClick={(e) => { e.preventDefault(); navigate('/find?location=Galle'); }}>Galle</a></li>
              <li><a href="/find?location=Gampaha" onClick={(e) => { e.preventDefault(); navigate('/find?location=Gampaha'); }}>Gampaha</a></li>
              <li><a href="/find?location=Negombo" onClick={(e) => { e.preventDefault(); navigate('/find?location=Negombo'); }}>Negombo</a></li>
              <li><a href="/find?location=Kurunegala" onClick={(e) => { e.preventDefault(); navigate('/find?location=Kurunegala'); }}>Kurunegala</a></li>
              <li><a href="/find" onClick={(e) => { e.preventDefault(); navigate('/find'); }}>All Cities & Regions</a></li>
            </ul>
          </div>
        </div>

        {/* Middle Utility & Social Row */}
        <div className="uber-footer-middle">
          {/* Left: Social Icons & App Badges */}
          <div className="uber-footer-social-and-apps">
            <div className="uber-footer-social-icons">
              {/* LinkedIn */}
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="uber-social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>

              {/* YouTube */}
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="uber-social-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 22c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 2c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                </svg>
              </a>

              {/* Instagram */}
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="uber-social-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* X / Twitter */}
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="uber-social-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>

            {/* App Store Download Badges */}
            <div className="uber-footer-app-badges">
              {/* Google Play Store Badge */}
              <a
                href="#download"
                className="uber-app-badge-btn"
                onClick={(e) => e.preventDefault()}
                title="Download SuperBass on Google Play"
              >
                <svg className="uber-badge-icon" viewBox="0 0 24 24" width="22" height="22">
                  <path fill="#4285F4" d="M3.6 2.4l10.8 10.8L3.6 24c-.4-.5-.6-1.2-.6-2V4.4c0-.8.2-1.5.6-2z" />
                  <path fill="#FBBC05" d="M17.8 8.8l-3.4 3.4L3.6 2.4c.4-.4 1-.5 1.6-.2l12.6 6.6z" />
                  <path fill="#34A853" d="M17.8 15.2L5.2 21.8c-.6.3-1.2.2-1.6-.2l10.8-10.8 3.4 3.4z" />
                  <path fill="#EA4335" d="M21.6 10.8c.5.3.8.8.8 1.2s-.3.9-.8 1.2l-3.8 2-3.4-3.2 3.4-3.2 3.8 2z" />
                </svg>
                <div className="uber-badge-text-wrap">
                  <span className="uber-badge-sub">GET IT ON</span>
                  <span className="uber-badge-title">Google Play</span>
                </div>
              </a>

              {/* Apple App Store Badge */}
              <a
                href="#download"
                className="uber-app-badge-btn"
                onClick={(e) => e.preventDefault()}
                title="Download SuperBass on App Store"
              >
                <svg className="uber-badge-icon" viewBox="0 0 24 24" width="22" height="22" fill="#ffffff">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.09.64-2.74 1.4-.57.65-1.06 1.71-.93 2.74 1.07.08 2.05-.52 2.66-1.27z" />
                </svg>
                <div className="uber-badge-text-wrap">
                  <span className="uber-badge-sub">Download on the</span>
                  <span className="uber-badge-title">App Store</span>
                </div>
              </a>
            </div>
          </div>

          {/* Right: Language & Location Selector */}
          <div className="uber-footer-locales">
            {/* Language Selector */}
            <div className="uber-locale-pill-wrapper">
              <button
                type="button"
                className="uber-locale-pill"
                onClick={() => setIsLangOpen(prev => !prev)}
                aria-label="Select Language"
              >
                <span className="uber-locale-text">{selectedLanguage}</span>
              </button>

              {isLangOpen && (
                <div className="uber-locale-dropdown">
                  {['English', 'සිංහල (Sinhala)', 'தமிழ் (Tamil)'].map((lang) => (
                    <div
                      key={lang}
                      className={`uber-locale-option ${selectedLanguage === lang.split(' ')[0] ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedLanguage(lang.split(' ')[0]);
                        setIsLangOpen(false);
                      }}
                    >
                      {lang}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Pill */}
            <div className="uber-locale-pill-wrapper">
              <button
                type="button"
                className="uber-locale-pill"
                onClick={() => navigate('/find')}
                aria-label="Current Region"
              >
                <span className="uber-locale-text">LK</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Copyright Row */}
        <div className="uber-footer-bottom">
          <div className="uber-footer-copyright">
            © 2026 SuperBass Technologies Inc.
          </div>

          <div className="uber-footer-legal-links">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Privacy</a>
            <a href="#accessibility" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Accessibility</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); navigate('/community'); }}>Terms</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
