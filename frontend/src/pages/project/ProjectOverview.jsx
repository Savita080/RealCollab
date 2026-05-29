// pages/project/ProjectOverview.jsx — wraps the existing Dashboard, scoped to project.
// Shows everyone currently online ANYWHERE in this project (project-wide room),
// unlike Chat/Whiteboard which show only who's on that specific page.
import { useOutletContext } from 'react-router-dom';
import { usePresence } from '../../lib/hooks';
import PresenceBar from '../../components/ui/PresenceBar';
import Dashboard from '../Dashboard';

export default function ProjectOverview() {
  const { project } = useOutletContext();
  const online = usePresence(project?._id);

  return (
    <>
      {online.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            In this project
          </span>
          <PresenceBar users={online} size={28} label="online" />
        </div>
      )}
      <Dashboard />
    </>
  );
}
