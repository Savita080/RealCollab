// pages/workspace/WorkspaceDashboard.jsx
import { useEffect, useState } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { projects as projApi, workspaces as wsApi } from '../../lib/api';
import s from '../../styles/modules/WorkspaceDashboard.module.css';

export default function WorkspaceDashboard() {
  const { workspaceId } = useParams();
  const ctx = useOutletContext();
  const [projectCount, setProjectCount] = useState(0);
  const [workspace, setWorkspace] = useState(null);
  const memberCount = ctx?.members?.length ?? 0;

  useEffect(() => {
    if (!workspaceId) return;
    projApi.list(workspaceId)
      .then(({ data }) => setProjectCount((data.projects ?? data).length))
      .catch(() => {});
    wsApi.get(workspaceId)
      .then(({ data }) => setWorkspace(data.workspace ?? data))
      .catch(() => {});
  }, [workspaceId]);

  return (
    <div className={s.page}>
      <h1 className={s.heading}>{workspace?.name || 'Workspace'} Dashboard</h1>

      <div className={s.stats}>
        <div className={s.statCard}>
          <div className={s.statValue}>{projectCount}</div>
          <div className={s.statLabel}>Projects</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue}>{memberCount}</div>
          <div className={s.statLabel}>Members</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statValue} style={{ fontSize: 20 }}>{ctx?.role || '—'}</div>
          <div className={s.statLabel}>Your Role</div>
        </div>
      </div>
    </div>
  );
}
