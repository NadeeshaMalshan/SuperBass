import React, { useState } from 'react';
import './LoginPortal.css';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { GOOGLE_CLIENT_ID, API_BASE_URL } from '../config.js';
import M3TopNavbar from '../components/M3TopNavbar.jsx';
import loginBanner from '../assets/login.png';

function LoginPortalContent() {
  const [residentLoading, setResidentLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleGoogleSuccess = async (tokenResponse, intendedRole) => {
    setAuthError('');
    if (intendedRole === 'Worker') setWorkerLoading(true);
    else setResidentLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/google`, {
        accessToken: tokenResponse.access_token,
        idToken: tokenResponse.id_token,
        intendedRole: intendedRole
      });

      const data = res.data;
      const email = data.email;

      // When logging in as Worker (Sign In / Sign Up)
      if (intendedRole === 'Worker') {
        const workerId = data.workerId;
        const isNewWorker = data.isNewWorker;

        localStorage.setItem('token', data.token);
        localStorage.setItem('workerAuth', 'true');
        localStorage.setItem('workerEmail', email);
        localStorage.setItem('email', email);
        if (data.name) localStorage.setItem('userName', data.name);
        if (data.picture) localStorage.setItem('userPicture', data.picture);
        if (workerId) localStorage.setItem('workerId', workerId);
        localStorage.setItem('activeRole', 'Worker');

        if (isNewWorker) {
          navigate('/worker/profile');
        } else {
          navigate('/find');
        }
        return;
      }

      // Resident Login: Always activate Resident role, even if a worker profile exists for this email
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', email);
      if (data.name) localStorage.setItem('userName', data.name);
      if (data.picture) localStorage.setItem('userPicture', data.picture);
      localStorage.setItem('activeRole', 'Resident');

      if (data.isNewUser) {
        navigate('/onboarding');
      } else {
        navigate('/find');
      }
    } catch (err) {
      console.error(`${intendedRole} login error:`, err);
      const msg = err.response?.data?.message || 'Google sign in failed. Please try again.';
      setAuthError(msg);
    } finally {
      setResidentLoading(false);
      setWorkerLoading(false);
    }
  };

  const residentGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleSuccess(tokenResponse, 'Resident'),
    onError: (err) => {
      console.error('Resident Google OAuth error:', err);
      setAuthError('Google sign in was cancelled or failed.');
      setResidentLoading(false);
    }
  });

  const workerGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => handleGoogleSuccess(tokenResponse, 'Worker'),
    onError: (err) => {
      console.error('Worker Google OAuth error:', err);
      setAuthError('Google sign in was cancelled or failed.');
      setWorkerLoading(false);
    }
  });

  return (
    <div className="login-portal-wrapper">
      {/* Standard App Navigation Bar (Same as other pages) */}
      <M3TopNavbar theme="dark" showSearch={false} />

      {/* Hero Banner Section */}
      <section className="login-portal-hero-section">
        <div className="login-portal-hero-content">
          <h1 className="login-portal-hero-title">
            Log in to access your account
          </h1>
          <p className="login-portal-hero-subtitle">
            Sign in or sign up using Google. Choose whether you want to request craftsman services as a <strong>Resident</strong> or provide services as a verified <strong>Worker</strong>.
          </p>
        </div>

        <div className="login-portal-hero-banner-art">
          <div style={{
            position: 'relative',
            width: '100%',
            maxHeight: '260px',
            overflow: 'hidden',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff'
          }}>
            <img 
              src={loginBanner} 
              alt="Workio Portals" 
              style={{
                width: '100%',
                maxHeight: '260px',
                objectFit: 'contain',
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        </div>
      </section>

      {/* Role Selection Section (Resident & Worker) */}
      <section className="login-portal-cards-section">
        {authError && (
          <div style={{
            maxWidth: '1200px',
            width: '100%',
            backgroundColor: '#450a0a',
            border: '1px solid #dc2626',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#fecaca',
            fontSize: '0.95rem',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{authError}</span>
          </div>
        )}

        <div className="login-portal-cards-grid">
          {/* Card 1: Resident */}
          <div 
            className="login-portal-card"
            onClick={() => residentGoogleLogin()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') residentGoogleLogin(); }}
          >
            <div className="login-portal-card-header">
              <h2 className="login-portal-card-title">Resident</h2>
              <span className="login-portal-card-arrow">→</span>
            </div>
            <p className="login-portal-card-desc">
              Book skilled craftsmen, schedule home repairs, chat with technicians & manage service bookings.
            </p>

            <div className="login-portal-action-row">
              <button 
                type="button" 
                className="login-portal-resident-btn"
                disabled={residentLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  residentGoogleLogin();
                }}
              >
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{residentLoading ? 'Connecting...' : 'Sign In / Sign Up as Resident'}</span>
              </button>
            </div>

            <div className="login-portal-card-badges" style={{ marginTop: '20px' }}>
              <span className="login-portal-badge">Google Sign In / Sign Up</span>
              <span className="login-portal-badge">Household Services</span>
              <span className="login-portal-badge">Direct Messaging</span>
            </div>
          </div>

          {/* Card 2: Worker */}
          <div 
            className="login-portal-card"
            onClick={() => workerGoogleLogin()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') workerGoogleLogin(); }}
          >
            <div className="login-portal-card-header">
              <h2 className="login-portal-card-title">Worker</h2>
              <span className="login-portal-card-arrow">→</span>
            </div>
            <p className="login-portal-card-desc">
              Access your craftsman dashboard, view requested jobs, configure availability & grow your trade business.
            </p>

            <div className="login-portal-action-row">
              <button 
                type="button" 
                className="login-portal-worker-btn"
                disabled={workerLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  workerGoogleLogin();
                }}
              >
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                <span>{workerLoading ? 'Connecting...' : 'Sign In / Sign Up as Worker'}</span>
              </button>
            </div>

            <div className="login-portal-card-badges" style={{ marginTop: '20px' }}>
              <span className="login-portal-badge">Google Sign In / Sign Up</span>
              <span className="login-portal-badge">Job Management</span>
              <span className="login-portal-badge">Performance & Reviews</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function LoginPortal() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LoginPortalContent />
    </GoogleOAuthProvider>
  );
}
