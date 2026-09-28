import React, { useState } from 'react';
import './AgentCards.css';

export default function WorkerListCard({ data = {}, onAction }) {
  const { category, query, totalCount, workers = [] } = data;
  const [favorites, setFavorites] = useState({});

  if (!workers || workers.length === 0) {
    return (
      <div className="agent-card-container">
        <div className="agent-base-card" style={{ textAlign: 'center', padding: '24px' }}>
          <i className="fa-solid fa-user-slash" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '8px' }}></i>
          <h4 style={{ margin: 0, fontSize: '1rem', color: '#334155' }}>No Workers Found</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
            No verified professionals found matching {category || query || 'your criteria'}.
          </p>
        </div>
      </div>
    );
  }

  const toggleFav = (e, workerId) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [workerId]: !prev[workerId] }));
  };

  return (
    <div className="agent-card-container">
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="agent-card-badge category">
            <i className="fa-solid fa-location-dot"></i> {category ? `Closest ${category} Pros` : 'Closest Recommended Pros'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
            {totalCount || workers.length} available
          </span>
        </div>
        <button
          className="agent-card-btn secondary"
          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          onClick={() => onAction && onAction('navigate', `/find?query=${encodeURIComponent(category || query || '')}`)}
        >
          Explore All on Map
        </button>
      </div>

      {/* Grid of Worker Cards */}
      <div className="agent-worker-cards-grid">
        {workers.map((worker) => {
          const isFav = !!favorites[worker.id];
          const initial = (worker.name || 'W')[0].toUpperCase();
          const rating = worker.overallRating ? Number(worker.overallRating).toFixed(1) : '5.0';
          const reviewCount = worker.reviewCount || (worker.completedJobs ? worker.completedJobs * 2 : 24);
          const completedJobsCount = worker.completedJobs ? `${worker.completedJobs}+ jobs` : '10+ jobs';

          const rateNum = worker.hourlyRate || worker.dailyRate || 2800;
          const rateUnit = worker.hourlyRate ? '/ hour' : (worker.dailyRate ? '/ day' : '/ hour');

          const displayRole = (worker.primaryRole && worker.primaryRole !== 'Verified Community Service Professional')
            ? worker.primaryRole
            : (category || 'Plumber');

          let primarySkill = 'Minor Plumbing & Electrical Fixes';
          if (worker.skills && worker.skills.length > 0) {
            const first = worker.skills[0];
            primarySkill = typeof first === 'string' ? first : (first.skillName || first.name || 'General Maintenance & Repairs');
          } else if (category) {
            primarySkill = `General ${category} Services`;
          }

          const locationText = worker.primaryServiceArea || worker.location || worker.district || 'Ratnapura';

          return (
            <div
              key={worker.id}
              className="agent-worker-card-item"
              onClick={() => onAction && onAction('navigate', `/worker-detail?id=${worker.id}`)}
            >
              {/* Top Section: Avatar (left) + Info (right) with Heart at top right */}
              <div className="agent-worker-top-row">
                {/* Circular Profile Photo with green verified badge */}
                <div className="agent-worker-avatar-wrap">
                  <div className="agent-worker-avatar-inner">
                    {worker.profileImage ? (
                      <img
                        src={worker.profileImage}
                        alt={worker.name}
                        className="agent-worker-avatar-img"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className="agent-worker-avatar-fallback"
                      style={{ display: worker.profileImage ? 'none' : 'flex' }}
                    >
                      {initial}
                    </div>
                  </div>
                  <div className="agent-worker-verified-badge" title="Verified Professional">
                    <i className="fa-solid fa-check"></i>
                  </div>
                </div>

                {/* Info Column */}
                <div className="agent-worker-info-col">
                  {/* Name & Favorite Heart */}
                  <div className="agent-worker-name-row">
                    <h3 className="agent-worker-name" title={worker.name}>
                      {worker.name}
                    </h3>
                    <button
                      type="button"
                      className={`agent-worker-fav-btn ${isFav ? 'active' : ''}`}
                      onClick={(e) => toggleFav(e, worker.id)}
                      aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                    >
                      <i className={isFav ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                    </button>
                  </div>

                  {/* Primary Role (e.g. Plumber) */}
                  <div className="agent-worker-role-text">
                    {displayRole}
                  </div>

                  {/* Skill Pill */}
                  <div className="agent-worker-skill-pill-box">
                    <span className="agent-worker-skill-pill">
                      <i className="fa-solid fa-wrench"></i>
                      <span>{primarySkill}</span>
                    </span>
                  </div>

                  {/* Location Capsule */}
                  <div className="agent-worker-location-box">
                    <span className="agent-worker-location-pill">
                      <i className="fa-solid fa-location-dot"></i>
                      <span>{locationText}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Stats Row: Rating & Jobs */}
              <div className="agent-worker-stats-row">
                <div className="agent-worker-rating-group">
                  <i className="fa-solid fa-star worker-star-icon"></i>
                  <span className="worker-rating-val">{rating}</span>
                  <span className="worker-reviews-count">({reviewCount} reviews)</span>
                </div>
                <div className="worker-stats-v-divider"></div>
                <div className="agent-worker-jobs-group">
                  <i className="fa-solid fa-briefcase worker-briefcase-icon"></i>
                  <span className="worker-jobs-count">{completedJobsCount}</span>
                </div>
              </div>

              {/* Subtle Horizontal Divider */}
              <div className="agent-worker-hr-divider"></div>

              {/* Rate & Action Buttons */}
              <div className="agent-worker-rate-actions-row">
                <div className="agent-worker-rate-col">
                  <div className="worker-rate-label">ESTIMATED RATE</div>
                  <div className="worker-rate-main">Rs. {rateNum}</div>
                  <div className="worker-rate-sub">{rateUnit}</div>
                </div>

                <div className="agent-worker-actions-group" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="agent-worker-book-btn"
                    onClick={() => onAction && onAction('send_prompt', `I would like to book ${worker.name} (Worker ID: ${worker.id})`)}
                    title="Book this worker"
                  >
                    <svg className="worker-book-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <circle cx="8" cy="14" r="1" fill="#1d4ed8" />
                      <circle cx="12" cy="14" r="1" fill="#1d4ed8" />
                      <circle cx="16" cy="14" r="1" fill="#1d4ed8" />
                      <circle cx="8" cy="18" r="1" fill="#1d4ed8" />
                      <circle cx="12" cy="18" r="1" fill="#1d4ed8" />
                    </svg>
                    <div className="worker-stacked-text dark">
                      <span>Book</span>
                      <span>Now</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="agent-worker-profile-btn"
                    onClick={() => onAction && onAction('navigate', `/worker-detail?id=${worker.id}`)}
                    title="View full profile"
                  >
                    <div className="worker-stacked-text light">
                      <span>View</span>
                      <span>Profile</span>
                    </div>
                    <i className="fa-solid fa-arrow-right worker-arrow-icon"></i>
                  </button>
                </div>
              </div>

              {/* Bottom Status Row: Available status */}
              <div className="agent-worker-bottom-status-row">
                <div className="worker-avail-pill">
                  <span className="worker-status-dot"></span>
                  <span>{worker.isAvailable !== false ? 'Available' : 'Unavailable'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
