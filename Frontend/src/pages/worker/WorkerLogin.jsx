import React, { useState } from 'react';
import './worker.css';

export default function WorkerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login and redirect to Worker Dashboard
    localStorage.setItem('workerAuth', 'true');
    localStorage.setItem('workerEmail', email);
    navigate('/worker/dashboard');
  };

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
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/iconWithText-cropped.png" 
            alt="SuperBass Logo" 
            style={{ height: '60px', cursor: 'pointer', marginBottom: '16px' }} 
            onClick={() => navigate('/')}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111111' }}>Worker Sign In</h2>
          <p style={{ fontSize: '0.9rem', color: '#64748B', marginTop: '6px' }}>
            Access your dashboard, manage jobs & availability
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="worker-input-group">
            <label className="worker-label">Email or Phone Number</label>
            <input 
              type="text" 
              required
              className="worker-input"
              placeholder="david@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="worker-input-group">
            <label className="worker-label">Password</label>
            <input 
              type="password" 
              required
              className="worker-input"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="worker-btn-primary" 
            style={{ width: '100%', justifyContent: 'center', height: '50px', fontSize: '1rem', marginTop: '12px' }}
          >
            Sign In to Dashboard
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: '#64748B' }}>
          Don't have a worker account?{' '}
          <span 
            onClick={() => navigate('/worker/register')} 
            style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}
          >
            Join as Worker
          </span>
        </div>
      </div>
    </div>
  );
}
