import React from 'react';

export default function ServiceCategoriesCard({ data = {}, onAction }) {
  const categories = data.categories || [];

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      marginTop: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '1.25rem' }}>🏷️</span>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
          Official SuperBass Categories ({categories.length})
        </h4>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '8px',
        maxHeight: '340px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {categories.map((cat, idx) => (
          <button
            key={cat.id || idx}
            type="button"
            onClick={() => onAction && onAction(`Show community posts in ${cat.name}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.borderColor = '#93c5fd';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            <span style={{ fontSize: '1rem' }}>
              <i className={`fa-solid ${cat.icon || 'fa-tag'}`} style={{ color: '#2563eb' }}></i>
            </span>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
