// Central configuration for Frontend API and third-party integrations
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '');
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
export const AGENT_BACKEND_URL = (import.meta.env.VITE_AGENT_BACKEND_URL || 'http://localhost:8001').replace(/\/+$/, '');

export default {
  BACKEND_URL,
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
  AGENT_BACKEND_URL,
};
