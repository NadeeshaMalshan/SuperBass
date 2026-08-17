import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Find from './Find.jsx'
import Join from './Join.jsx'
import Community from './Community.jsx'
import Onboarding from './Onboarding.jsx'
function Router() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  if (path === '/find' || path === '/find.jsx') {
    return <Find />;
  }
  if (path === '/join' || path === '/join.jsx') {
    return <Join />;
  }
  if (path === '/community' || path === '/community.jsx') {
    return <Community />;
  }
  if (path === '/onboarding' || path === '/onboarding.jsx') {
    return <Onboarding />;
  }

  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
