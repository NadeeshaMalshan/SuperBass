import React, { useState } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import './worker.css';
import { GOOGLE_CLIENT_ID, API_BASE_URL } from '../../config.js';

function WorkerLoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const workerGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/google`, {
          accessToken: tokenResponse.access_token,
          idToken: tokenResponse.id_token,
          intendedRole: 'Worker'
        });

        const data = res.data;
        const email = data.email;

        const workerId = data.workerId;
        const isNewWorker = data.isNewWorker;

        // Save Worker authentication credentials and active role
        localStorage.setItem('token', data.token);
        localStorage.setItem('workerAuth', 'true');
        localStorage.setItem('workerEmail', email);
        localStorage.setItem('email', email);
        if (data.name) localStorage.setItem('userName', data.name);
        if (data.picture) localStorage.setItem('userPicture', data.picture);
        if (workerId) localStorage.setItem('workerId', workerId);
        localStorage.setItem('activeRole', 'Worker');

        // Redirect to onboarding if new worker, else worker dashboard
        if (isNewWorker) {
          navigate('/worker/onboarding');
        } else {
          navigate('/worker/dashboard');
        }
      } catch (err) {
        console.error('Worker login error:', err);
        const msg = err.response?.data?.message || 'Worker sign in failed. Please verify your worker account.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    },
    onError: (err) => {
      console.error('Worker Google login cancelled:', err);
      setErrorMessage('Google sign in was cancelled or failed.');
      setIsLoading(false);
    }
  });

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
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img 
            src="/iconWithText-cropped.png" 
            alt="Workio Logo" 
            style={{ height: '60px', cursor: 'pointer', marginBottom: '16px' }} 
            onClick={() => navigate('/')}
          />
          <h2 style={{ fontSize: '1.55rem', fontWeight: 800, color: '#111111' }}>Worker Sign In</h2>
          <p style={{ fontSize: '0.92rem', color: '#64748B', marginTop: '8px', lineHeight: '1.5' }}>
            Sign in with your verified Google account to access your Craftsman Dashboard, jobs & client requests.
          </p>
        </div>

        {errorMessage && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            padding: '14px 16px',
            color: '#B91C1C',
            fontSize: '0.9rem',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            lineHeight: '1.4'
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Worker Sign In Button */}
        <button 
          type="button"
          onClick={() => workerGoogleLogin()}
          disabled={isLoading}
          style={{
            width: '100%',
            height: '54px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '50px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.75 : 1
          }}
        >
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span>{isLoading ? 'Connecting...' : 'Sign In / Sign Up with Google as Worker'}</span>
        </button>

        {/* Links section */}
        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.9rem', color: '#64748B' }}>
          <div>
            Don't have a worker account?{' '}
            <span 
              onClick={() => navigate('/worker/register')} 
              style={{ color: '#2563EB', fontWeight: 700, cursor: 'pointer' }}
            >
              Join as Worker
            </span>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F1F5F9' }}>
            Looking for home services?{' '}
            <span 
              onClick={() => navigate('/join')} 
              style={{ color: '#111827', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign in as Resident
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkerLogin() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <WorkerLoginContent />
    </GoogleOAuthProvider>
  );
}
