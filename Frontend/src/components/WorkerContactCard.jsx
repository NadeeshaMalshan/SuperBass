import React, { useState } from 'react';
import './WorkerContactCard.css';

export default function WorkerContactCard({
  workerName = 'Super Bass',
  location = 'Ratnapura',
  phoneNumber = '077 445 5125',
  avatarLetter = null,
  avatarUrl = null,
  isVerified = true,
  onCallNow = null,
  onCopy = null,
}) {
  const [copied, setCopied] = useState(false);

  const displayLetter = avatarLetter || (workerName ? workerName.charAt(0).toUpperCase() : 'S');

  const handleCopy = () => {
    const raw = phoneNumber.replace(/\s/g, '');
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    if (onCopy) onCopy(raw);
  };

  const handleCall = () => {
    const raw = phoneNumber.replace(/\s/g, '');
    window.location.href = `tel:${raw}`;
    if (onCallNow) onCallNow(raw);
  };

  return (
    <div className="wcc-root">
      {/* Header: avatar + name + location */}
      <div className="wcc-header">
        <div className="wcc-avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={workerName} className="wcc-avatar-img" />
          ) : (
            <span className="wcc-avatar-letter">{displayLetter}</span>
          )}
        </div>
        <div className="wcc-info">
          <div className="wcc-name-row">
            <span className="wcc-name">{workerName}</span>
            {isVerified && (
              <span className="wcc-verified-badge" title="Verified">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="#1877F2" />
                  <path
                    d="M7 12.5L10.5 16L17 9"
                    stroke="white"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>
          <span className="wcc-location">{location}</span>
        </div>
      </div>

      {/* Phone number card */}
      <div className="wcc-phone-card">
        <span className="wcc-phone-label">DIRECT PHONE NUMBER</span>
        <span className="wcc-phone-number">{phoneNumber}</span>
      </div>

      {/* Action buttons */}
      <div className="wcc-actions">
        <button className="wcc-btn-call" onClick={handleCall}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="wcc-call-icon">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
          </svg>
          Call now
        </button>
        <button className="wcc-btn-copy" onClick={handleCopy}>
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="wcc-copy-icon">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="wcc-copy-icon">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Footer note */}
      <div className="wcc-footer">
        <svg viewBox="0 0 24 24" fill="currentColor" className="wcc-lock-icon">
          <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
        </svg>
        <span>Verified number shared for this booking</span>
      </div>
    </div>
  );
}
