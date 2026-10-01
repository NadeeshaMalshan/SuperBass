import React, { useState, useEffect } from 'react';

export default function GlobalToast() {
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    let timeout;
    const handleShowToast = (e) => {
      setToastMessage(e.detail);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setToastMessage(null), 3000);
    };

    window.addEventListener('showToast', handleShowToast);
    return () => window.removeEventListener('showToast', handleShowToast);
  }, []);

  if (!toastMessage) return null;

  return (
    <>
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#111827', color: '#ffffff',
        padding: '12px 20px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex', alignItems: 'center', gap: '12px', zIndex: 9999,
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)', fontSize: '0.95rem', fontWeight: 500
      }}>
        <i className="fa-solid fa-circle-check" style={{ color: '#ffffff', fontSize: '1.2rem' }}></i>
        {toastMessage}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
