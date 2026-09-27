import React from 'react';
import { SERVICE_CATEGORIES, getCategoryIllustration } from '../ServiceCategories.jsx';
import './AgentCards.css';

export default function ServiceCategoriesCard({ data = {}, onAction }) {
  const incomingCategories = data.categories || [];

  // Match with rich descriptions from SERVICE_CATEGORIES if available
  const displayList = incomingCategories.map(cat => {
    const rawName = typeof cat === 'string' ? cat : (cat.name || cat.id || '');
    const matched = SERVICE_CATEGORIES.find(
      sc => sc.name.toLowerCase() === rawName.toLowerCase() || sc.id.toLowerCase() === rawName.toLowerCase()
    );
    return {
      id: matched?.id || (typeof cat === 'object' ? cat.id : rawName.toLowerCase()),
      name: matched?.name || rawName,
      desc: matched?.desc || (typeof cat === 'object' && cat.description) || 'Professional service for your home and community.',
      illustration: matched?.illustration || getCategoryIllustration(rawName)
    };
  });

  return (
    <div className="agent-card-container">
      <div style={{
        background: '#f8fafc',
        borderRadius: '20px',
        border: '1px solid #e2e8f0',
        padding: '18px 20px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#64748b',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '2px'
            }}>
              EXPLORE OUR SERVICES
            </span>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Find the right professional for your needs
            </h4>
          </div>
          <span className="landing-card-category-badge">
            {displayList.length} Categories
          </span>
        </div>

        {/* Grid of landing-page styled mini cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '14px',
          maxHeight: '420px',
          overflowY: 'auto',
          padding: '4px 2px'
        }}>
          {displayList.map((cat, idx) => (
            <div
              key={cat.id || idx}
              className="landing-service-chat-card"
              style={{ padding: '16px 18px', minHeight: '130px' }}
            >
              <div className="landing-chat-card-body" style={{ gap: '12px' }}>
                <div className="landing-chat-card-content">
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {cat.name}
                  </h4>
                  <p style={{
                    margin: '0 0 12px 0',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {cat.desc}
                  </p>
                  <button
                    type="button"
                    className="landing-chat-btn-secondary"
                    style={{ padding: '5px 14px', fontSize: '0.78rem' }}
                    onClick={() => onAction && onAction(`Show community posts in ${cat.name}`)}
                  >
                    <span>Details</span>
                    <i className="fa-solid fa-chevron-right landing-chevron" style={{ fontSize: '0.65rem' }}></i>
                  </button>
                </div>

                {cat.illustration && (
                  <div style={{ width: '80px', height: '80px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img
                      src={cat.illustration}
                      alt={cat.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
