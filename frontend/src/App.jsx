// App.jsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';

import AppShell from './components/layout/AppShell';
import LandingPage   from './pages/LandingPage';
import Login         from './pages/Login';
import Register      from './pages/Register';
import Dashboard     from './pages/Dashboard';
import Kanban        from './pages/Kanban';
import Snippets      from './pages/Snippets';
import Wiki          from './pages/Wiki';
import ActivityFeed  from './pages/ActivityFeed';
import Collab        from './pages/Collab';
import AIPanel       from './pages/AIPanel';
import Members       from './pages/Members';
import AcceptInvite  from './pages/AcceptInvite';

function Guard({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="app-loading"><span>RC</span></div>;
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { init } = useAuth();
  useEffect(() => { init(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        {/* Invite accept — public but uses auth token if available */}
        <Route path="/invite/accept/:token" element={<AcceptInvite />} />

        {/* Protected — inside AppShell */}
        <Route element={<Guard><AppShell /></Guard>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/kanban"    element={<Kanban />} />
          <Route path="/snippets"  element={<Snippets />} />
          <Route path="/wiki"      element={<Wiki />} />
          <Route path="/activity"  element={<ActivityFeed />} />
          <Route path="/collab"    element={<Collab />} />
          <Route path="/ai"        element={<AIPanel />} />
          <Route path="/members"   element={<Members />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
