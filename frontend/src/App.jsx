// App.jsx — Complete nested routing structure
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';

import PaywallModal   from './components/PaywallModal';
import LandingPage    from './pages/LandingPage';
import Login          from './pages/Login';
import Register       from './pages/Register';
import AcceptInvite   from './pages/AcceptInvite';
import Workspaces     from './pages/Workspaces';
import Profile        from './pages/Profile';

// Workspace-level
import WorkspaceLayout     from './pages/workspace/WorkspaceLayout';
import WorkspaceDashboard  from './pages/workspace/WorkspaceDashboard';
import WorkspaceProjects   from './pages/workspace/WorkspaceProjects';
import WorkspaceChat       from './pages/workspace/WorkspaceChat';
import WorkspaceMembers    from './pages/workspace/WorkspaceMembers';
import WorkspaceSettings   from './pages/workspace/WorkspaceSettings';
import Subscribe           from './pages/Subscribe';

// Project-level
import ProjectLayout      from './pages/workspace/project/ProjectLayout';
import ProjectOverview    from './pages/workspace/project/ProjectOverview';
import ProjectKanban      from './pages/workspace/project/ProjectKanban';
import ProjectChat        from './pages/workspace/project/ProjectChat';
import ProjectSnippets    from './pages/workspace/project/ProjectSnippets';
import ProjectWiki        from './pages/workspace/project/ProjectWiki';
import ProjectAssistant   from './pages/workspace/project/ProjectAssistant';
import ProjectActivity    from './pages/workspace/project/ProjectActivity';
import ProjectWhiteboards from './pages/workspace/project/ProjectWhiteboards';
import ProjectMembers     from './pages/workspace/project/ProjectMembers';
import ProjectSettings    from './pages/workspace/project/ProjectSettings';

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
      <PaywallModal />
      <Routes>
        {/* Public */}
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/invite/accept/:token" element={<AcceptInvite />} />

        {/* Protected — master dashboard */}
        <Route path="/workspaces" element={<Guard><Workspaces /></Guard>} />

        {/* Protected — global profile */}
        <Route path="/profile" element={<Guard><Profile /></Guard>} />

        {/* Protected — workspace level */}
        <Route path="/workspaces/:workspaceId" element={<Guard><WorkspaceLayout /></Guard>}>
          <Route index         element={<WorkspaceDashboard />} />
          <Route path="projects" element={<WorkspaceProjects />} />
          <Route path="chat"     element={<WorkspaceChat />} />
          <Route path="members"  element={<WorkspaceMembers />} />
          <Route path="settings" element={<WorkspaceSettings />} />
          <Route path="subscribe" element={<Subscribe />} />

          {/* Nested — project level */}
          <Route path="projects/:projectId" element={<ProjectLayout />}>
            <Route index           element={<ProjectOverview />} />
            <Route path="kanban"     element={<ProjectKanban />} />
            <Route path="chat"       element={<ProjectChat />} />
            <Route path="snippets"   element={<ProjectSnippets />} />
            <Route path="wiki"       element={<ProjectWiki />} />
            <Route path="wiki/:pageId" element={<ProjectWiki />} />
            <Route path="assistant"  element={<ProjectAssistant />} />
            <Route path="activity"   element={<ProjectActivity />} />
            <Route path="whiteboards" element={<ProjectWhiteboards />} />
            <Route path="whiteboards/:whiteboardId" element={<ProjectWhiteboards />} />
            <Route path="members"    element={<ProjectMembers />} />
            <Route path="settings"   element={<ProjectSettings />} />
          </Route>
        </Route>

        {/* Legacy route redirects */}
        <Route path="/dashboard" element={<Navigate to="/workspaces" replace />} />
        <Route path="/kanban"    element={<Navigate to="/workspaces" replace />} />
        <Route path="/snippets"  element={<Navigate to="/workspaces" replace />} />
        <Route path="/wiki"      element={<Navigate to="/workspaces" replace />} />
        <Route path="/activity"  element={<Navigate to="/workspaces" replace />} />
        <Route path="/collab"    element={<Navigate to="/workspaces" replace />} />
        <Route path="/ai"        element={<Navigate to="/workspaces" replace />} />
        <Route path="/members"   element={<Navigate to="/workspaces" replace />} />
        <Route path="/subscribe" element={<Navigate to="/workspaces" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
