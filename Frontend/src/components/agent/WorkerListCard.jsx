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
            <i className="fa-solid fa-user-check"></i> {category ? `${category} Pros` : 'Available Pros'}
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {workers.map((worker) => {
          const isFav = !!favorites[worker.id];
          const initial = (worker.name || 'W')[0].toUpperCase();
          const rating = worker.overallRating ? Number(worker.overallRating).toFixed(1) : '5.0';
          const rateDisplay = worker.hourlyRate
            ? `Rs. ${worker.hourlyRate}`
            : (worker.dailyRate ? `Rs. ${worker.dailyRate}` : 'Negotiable');
          const rateUnit = worker.hourlyRate ? '/ hr' : (worker.dailyRate ? '/ day' : '');

          const primarySkill = (worker.skills && worker.skills.length > 0)
            ? (typeof worker.skills[0] === 'string' ? worker.skills[0] : worker.skills[0].skillName || 'General Handyman')
            : 'General Handyman';

          return (
            <div
              key={worker.id}
              className="agent-worker-card-item"
              onClick={() => onAction && onAction('navigate', `/worker-detail?id=${worker.id}`)}
            >
              {/* Top Horizontal Section */}
              <div className="agent-worker-top-row">
                {/* Avatar (Left) */}
                <div className="agent-worker-avatar-box">
                  {worker.profileImage ? (
                    <img
                      src={worker.profileImage}
                      alt={worker.name}
                      className="agent-worker-avatar-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
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

                {/* Info Column (Right) */}
                <div className="agent-worker-info-col">
                  {/* Title line: Name, Verified Badge & Heart */}
                  <div className="agent-worker-title-line">
                    <div className="agent-worker-name-group">
                      <h4 className="agent-worker-name" title={worker.name}>
                        {worker.name}
                      </h4>
                      <span className="agent-worker-verified-badge" title="Verified Professional">
                        <i className="fa-solid fa-circle-check"></i>
                      </span>
                    </div>

                    <button
                      type="button"
                      className={`agent-worker-fav-btn ${isFav ? 'active' : ''}`}
                      onClick={(e) => toggleFav(e, worker.id)}
                      title={isFav ? "Saved to favorites" : "Save to favorites"}
                    >
                      <i className={isFav ? "fa-solid fa-heart" : "fa-regular fa-heart"}></i>
                    </button>
                  </div>

                  {/* Role / Description */}
                  <p className="agent-worker-role">
                    {worker.primaryRole || 'Verified Community Service Professional'}
                  </p>

                  {/* Category / Skill Pill */}
                  <div className="agent-worker-skills-row">
                    <span className="agent-worker-skill-pill">
                      {primarySkill}
                    </span>
                  </div>

                  {/* Distance Pill */}
                  <div className="agent-worker-distance-pill">
                    <i className="fa-solid fa-person-walking"></i>
                    <span>{worker.primaryServiceArea || 'Distance unknown'}</span>
                  </div>

                  {/* Rating & Availability Chips */}
                  <div className="agent-worker-chips-row">
                    <span className="agent-worker-rating-chip">
                      <i className="fa-solid fa-star"></i>
                      <span>{rating}</span>
                    </span>
                    {worker.isAvailable !== false && (
                      <span className="agent-worker-avail-chip">
                        Available
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer: Estimated Rate & Action Button */}
              <div className="agent-worker-footer">
                <div className="agent-worker-rate-box">
                  <span className="agent-worker-rate-label">ESTIMATED RATE</span>
                  <div className="agent-worker-rate-value-wrap">
                    <span className="agent-worker-rate-val">{rateDisplay}</span>
                    {rateUnit && <span className="agent-worker-rate-unit">{rateUnit}</span>}
                  </div>
                </div>

                <div className="agent-worker-actions-wrap" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="agent-worker-select-btn"
                    onClick={() => onAction && onAction('send_prompt', `I would like to book ${worker.name} (Worker ID: ${worker.id})`)}
                    title="Select this worker to book"
                  >
                    <span>Book</span>
                    <i className="fa-solid fa-calendar-check" style={{ fontSize: '0.75rem' }}></i>
                  </button>

                  <button
                    type="button"
                    className="agent-worker-profile-btn"
                    onClick={() => onAction && onAction('navigate', `/worker-detail?id=${worker.id}`)}
                  >
                    <span>Profile</span>
                    <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.75rem' }}></i>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
