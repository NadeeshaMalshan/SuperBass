import React from 'react';

export default function UserMenu() {
  const userName = localStorage.getItem('userName') || 'User';
  const userPicture = localStorage.getItem('userPicture');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <img 
        src={userPicture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} 
        alt={userName}
        style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #cbd5e1' }}
      />
      <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#334155' }}>{userName}</span>
    </div>
  );
}
