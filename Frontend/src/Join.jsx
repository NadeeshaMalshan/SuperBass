import React from 'react';
import './App.css';
import '@material/web/button/filled-button.js';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

// IMPORTANT: Replace with your actual Google Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = "918768879306-9tv31jo0ot00ogc496h13e6tccfv63qe.apps.googleusercontent.com";

function JoinContent() {
  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("Google Token:", tokenResponse);
        // Send to our backend
        const res = await axios.post("http://localhost:5237/api/auth/google", {
          accessToken: tokenResponse.access_token,
          idToken: tokenResponse.id_token
        });
        console.log("Backend response:", res.data);
        // Store the JWT and user info
        localStorage.setItem("token", res.data.token);
        if (res.data.name) localStorage.setItem("userName", res.data.name);
        if (res.data.picture) localStorage.setItem("userPicture", res.data.picture);

        if (res.data.email) localStorage.setItem("email", res.data.email);
        
        // Redirect based on user status
        if (res.data.isNewUser) {
          window.history.pushState({}, '', '/onboarding');
        } else {
          window.history.pushState({}, '', '/find');
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        console.error("Login failed:", err);
      }
    },
    onError: error => console.error("Login error:", error)
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ffffff', // Match wireframe's white background
      fontFamily: 'sans-serif'
    }}>
      {/* Centered Logo */}
      <a href="/" onClick={(e) => { e.preventDefault(); goHome(); }} style={{ cursor: 'pointer', marginBottom: '3rem' }}>
        <img src="/iconWithText-cropped.png" alt="Super බාස් Logo" style={{ height: '80px' }} />
      </a>

      {/* Login Button (Material 3) */}
      <md-filled-button
        onClick={() => login()}
        style={{
          '--md-filled-button-container-shape': '50px',
          '--md-sys-color-primary': '#FDC101',
          '--md-sys-color-on-primary': '#000000',
          width: '350px',
          height: '56px',
          fontSize: '18px',
        }}>
        <svg slot="icon" width="24" height="24" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
        Login as Google
      </md-filled-button>

      {/* Join as Worker Button */}
      <md-filled-button
        onClick={() => {
          window.history.pushState({}, '', '/worker/login');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }}
        style={{
          '--md-filled-button-container-shape': '50px',
          '--md-sys-color-primary': '#2563EB',
          '--md-sys-color-on-primary': '#ffffff',
          width: '350px',
          height: '56px',
          fontSize: '18px',
          marginTop: '16px',
          cursor: 'pointer'
        }}>
        Join as Worker
      </md-filled-button>
    </div>
  );
}

export default function Join() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <JoinContent />
    </GoogleOAuthProvider>
  );
}
