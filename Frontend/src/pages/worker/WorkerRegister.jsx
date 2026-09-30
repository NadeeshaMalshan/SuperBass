import React, { useEffect } from 'react';
import './worker.css';

export default function WorkerRegister() {
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const userEmail = localStorage.getItem('email');
  const token = localStorage.getItem('token');

  useEffect(() => {
    // If user is already logged in as a resident, redirect them to account page with become-worker tab
    if (userEmail || token) {
      navigate('/account?tab=become-worker');
    }
  }, [userEmail, token]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{
        maxWidth: '520px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        textAlign: 'center'
      }}>
        {/* Brand Header */}
        <div style={{ marginBottom: '24px' }}>
          <img 
            src="/iconWithText-cropped.png" 
            alt="SuperBass Logo" 
            style={{ height: '60px', cursor: 'pointer', marginBottom: '16px' }} 
            onClick={() => navigate('/')}
          />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111111' }}>Join as a Worker</h2>
          <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
            Every user needs to be registered as a resident in order to upgrade to a worker profile.
          </p>
        </div>

        <div style={{
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
          textAlign: 'left'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1E40AF', fontSize: '1rem', fontWeight: 700 }}>
            How it works:
          </h4>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#1E3A8A', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <li>Sign in or register as a Resident using your Google Account.</li>
            <li>Go to your <strong>Resident Dashboard</strong>.</li>
            <li>Click <strong>"Join as Worker"</strong> and provide your trade skills and pricing.</li>
          </ol>
        </div>

        <button 
          onClick={() => navigate('/join')}
          className="worker-btn-primary" 
          style={{ width: '100%', justifyContent: 'center', height: '52px', fontSize: '1rem', marginBottom: '16px' }}
        >
          Sign In / Register as Resident
        </button>

        <div style={{ marginTop: '16px', fontSize: '0.9rem', color: '#64748B' }}>
          Already registered as a Worker?{' '}
          <span 
            onClick={() => navigate('/worker/login')} 
            style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}
          >
            Sign In to Worker Dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

