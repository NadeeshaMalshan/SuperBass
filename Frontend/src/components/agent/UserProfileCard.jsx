import React from 'react';
import './AgentCards.css';

export default function UserProfileCard({ data, onAction }) {
  if (!data) return null;

  const { email, role, isWorker, displayName, phoneNo, address, workerRating, completedJobs, skills } = data;
  const initial = (displayName || email || 'U')[0].toUpperCase();

  return (
    <div className="agent-card-container">
      <div className="agent-base-card" style={{ borderLeft: '4px solid #000000' }}>
        <div className="agent-card-header">
          <span className="agent-card-badge role">
            <i className={`fa-solid ${isWorker ? 'fa-screwdriver-wrench' : 'fa-house-user'}`}></i>
            {' '}{role || (isWorker ? 'Worker' : 'Resident')}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#757575' }}>Account Info</span>
        </div>

        <div className="agent-profile-avatar-row">
          <div className="agent-profile-avatar">{initial}</div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#000000', fontWeight: 800 }}>
              {displayName || 'SuperBass User'}
            </h4>
            <span style={{ fontSize: '0.825rem', color: '#757575' }}>{email}</span>
          </div>
        </div>

        <div className="agent-card-meta" style={{ marginTop: '4px' }}>
          {phoneNo && <span><i className="fa-solid fa-phone"></i> {phoneNo}</span>}
          {address && <span><i className="fa-solid fa-location-dot"></i> {address}</span>}
          {workerRating && (
            <span><i className="fa-solid fa-star" style={{ color: '#000000' }}></i> {workerRating} / 5.0</span>
          )}
          {completedJobs !== undefined && completedJobs !== null && (
            <span><i className="fa-solid fa-briefcase"></i> {completedJobs} Jobs</span>
          )}
        </div>

        {skills && skills.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.785rem', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Skills & Expertise:
            </span>
            <div className="agent-skills-wrap">
              {skills.map((s, idx) => (
                <span key={idx} className="agent-skill-pill">
                  {typeof s === 'string' ? s : s.name || s.skillName || 'Skill'}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="agent-card-actions">
          <button
            className="agent-card-btn primary"
            onClick={() => onAction && onAction('navigate', '/account')}
          >
            <i className="fa-regular fa-user"></i> Open Full Profile
          </button>
          <button
            className="agent-card-btn secondary"
            onClick={() => onAction && onAction('send_prompt', 'Show my community posts')}
          >
            <i className="fa-solid fa-file-lines"></i> View My Posts
          </button>
        </div>
      </div>
    </div>
  );
}
