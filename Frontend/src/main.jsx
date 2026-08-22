import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Find from './Find.jsx'
import Join from './Join.jsx'
import Community from './Community.jsx'
import Onboarding from './Onboarding.jsx'
import Chats from './Chats.jsx'

// Worker Pages
import WorkerRegister from './pages/worker/WorkerRegister.jsx'
import WorkerLogin from './pages/worker/WorkerLogin.jsx'
import WorkerDashboard from './pages/worker/WorkerDashboard.jsx'
import WorkerJobs from './pages/worker/WorkerJobs.jsx'
import WorkerPerformance from './pages/worker/WorkerPerformance.jsx'
import WorkerProfile from './pages/worker/WorkerProfile.jsx'
import ResidentProfile from './ResidentProfile.jsx'

function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (path === '/account' || path === '/account.jsx') {
    return <ResidentProfile />;
  }

  if (path === '/find' || path === '/find.jsx') {
    return <Find />;
  }
  if (path === '/join' || path === '/join.jsx') {
    return <Join />;
  }
  if (path === '/community' || path === '/community.jsx') {
    return <Community />;
  }
  if (path === '/chats' || path === '/chats.jsx') {
    return <Chats />;
  }
  if (path === '/onboarding' || path === '/onboarding.jsx') {
    return <Onboarding />;
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
    <Router />
  </StrictMode>,
)