import { Component, StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Find from './Find.jsx'
import Join from './Join.jsx'
import Community from './Community.jsx'
import Onboarding from './Onboarding.jsx'
import Chats from './Chats.jsx'
import Bookings from './Bookings.jsx'
import AiCommunityChat from './pages/AiCommunityChat.jsx'

import WorkerDetail from './WorkerDetail.jsx'

// Worker Pages
import WorkerRegister from './pages/worker/WorkerRegister.jsx'
import WorkerLogin from './pages/worker/WorkerLogin.jsx'
import WorkerDashboard from './pages/worker/WorkerDashboard.jsx'
import WorkerJobs from './pages/worker/WorkerJobs.jsx'
import WorkerPerformance from './pages/worker/WorkerPerformance.jsx'
import WorkerProfile from './pages/worker/WorkerProfile.jsx'
import ResidentProfile from './ResidentProfile.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SuperBass Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          fontFamily: "'DM Sans', sans-serif",
          textAlign: 'center',
          background: '#f9fafb',
          color: '#111827'
        }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ color: '#6b7280', maxWidth: '460px', marginBottom: '20px' }}>
            An unexpected error occurred. Please reload the page or navigate back to the home screen.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '9999px',
              padding: '12px 24px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const activeRole = localStorage.getItem('activeRole') || 'Resident';

  // Role-based Theme: Switch yellow accents to Worker Blue except on landing and worker-detail
  useEffect(() => {
    const updateTheme = () => {
      const currentRole = (localStorage.getItem('activeRole') || '').toLowerCase();
      const currentPath = window.location.pathname;
      const isWorker = currentRole === 'worker' || localStorage.getItem('workerAuth') === 'true';
      const isLanding = currentPath === '/' || currentPath === '' || currentPath === '/index.html';
      const isWorkerDetail = currentPath === '/worker-detail' || currentPath.startsWith('/worker-detail');

      if (isWorker && !isLanding && !isWorkerDetail) {
        document.body.classList.add('worker-theme');
      } else {
        document.body.classList.remove('worker-theme');
      }
    };

    updateTheme();
    window.addEventListener('storage', updateTheme);
    return () => window.removeEventListener('storage', updateTheme);
  }, [path]);

  // Role Guard: Active Worker trying to access Resident account profile
  if (path === '/account' || path === '/account.jsx') {
    if (activeRole === 'Worker') {
      return <WorkerDashboard />;
    }
    return <ResidentProfile />;
  }

  if (path === '/find' || path === '/find.jsx') {
    return <Find />;
  }
  if (path === '/worker-detail' || path === '/worker-detail.jsx' || path.startsWith('/worker-detail')) {
    return <WorkerDetail />;
  }
  if (path === '/join' || path === '/join.jsx') {
    return <Join />;
  }
  if (path === '/community/chat' || path === '/community/chat.jsx' || path === '/ai-chat' || path === '/agent' || path === '/ai-chat.jsx') {
    return <AiCommunityChat />;
  }
  if (path === '/community' || path === '/community.jsx') {
    return <Community />;
  }
  if (path === '/chats' || path === '/chats.jsx') {
    return <Chats />;
  }
  if (path === '/bookings' || path === '/bookings.jsx') {
    return <Bookings />;
  }
  if (path === '/onboarding' || path === '/onboarding.jsx') {
    return <Onboarding />;
  }

  // Worker Routes Role Guard: Resident trying to access Worker pages
  if (path.startsWith('/worker/')) {
    if (activeRole !== 'Worker' && path !== '/worker/register' && path !== '/worker/login') {
      return <ResidentProfile defaultTab="become-worker" />;
    }
  }

  // Worker Routes
  if (path === '/worker/register' || path === '/worker/register.jsx') {
    return <WorkerRegister />;
  }
  if (path === '/worker/login' || path === '/worker/login.jsx') {
    return <WorkerLogin />;
  }
  if (path === '/worker/dashboard' || path === '/worker/dashboard.jsx') {
    return <WorkerDashboard />;
  }
  if (path === '/worker/jobs' || path === '/worker/jobs.jsx') {
    return <WorkerJobs />;
  }
  if (path === '/worker/performance' || path === '/worker/performance.jsx') {
    return <WorkerPerformance />;
  }
  if (path === '/worker/profile' || path === '/worker/profile.jsx') {
    return <WorkerProfile />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </StrictMode>,
)