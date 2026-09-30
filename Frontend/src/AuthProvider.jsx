import React, { createContext, useContext } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { API_BASE_URL } from './config.js';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("Google Token:", tokenResponse);
        const res = await axios.post(`${API_BASE_URL}/auth/google`, {
          accessToken: tokenResponse.access_token,
          idToken: tokenResponse.id_token
        });
        console.log("Backend response:", res.data);
        localStorage.setItem("token", res.data.token);
        if (res.data.name) localStorage.setItem("userName", res.data.name);
        if (res.data.picture) localStorage.setItem("userPicture", res.data.picture);
        if (res.data.email) localStorage.setItem("email", res.data.email);

        const activeRole = res.data.activeRole || (res.data.isWorker ? 'Worker' : 'Resident');
        localStorage.setItem("activeRole", activeRole);

        if (activeRole === 'Worker') {
          window.history.pushState({}, '', '/find');
        } else if (res.data.isNewUser) {
          window.history.pushState({}, '', '/onboarding');
        } else {
          window.history.pushState({}, '', window.location.pathname === '/' ? '/find' : window.location.pathname);
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err) {
        console.error("Login failed:", err);
      }
    },
    onError: error => console.error("Login error:", error)
  });

  return (
    <AuthContext.Provider value={{ login }}>
      {children}
    </AuthContext.Provider>
  );
};
