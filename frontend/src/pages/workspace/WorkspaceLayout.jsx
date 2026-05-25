// pages/workspace/WorkspaceLayout.jsx
import { useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import { useWorkspaceRole } from '../../lib/useWorkspaceRole';
import { useUI } from '../../store/ui';
import { joinWorkspace, leaveWorkspace } from '../../lib/socket';
import WorkspaceSidebar from '../../components/common/WorkspaceSidebar';
import { Skeleton } from '../../components/ui/Skeleton';
import s from '../../styles/modules/WorkspaceLayout.module.css';

export default function WorkspaceLayout() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { role, members, loading, isOwner, isAdmin, canManage, canCreate } = useWorkspaceRole(workspaceId);
  const { bindNotifications, unbindNotifications } = useUI();

  // Join workspace socket room for workspace chat
  useEffect(() => {
    if (!workspaceId) return;
    joinWorkspace(workspaceId);
    return () => leaveWorkspace(workspaceId);
  }, [workspaceId]);

  // Bind notifications
  useEffect(() => {
    bindNotifications();
    return () => unbindNotifications();
  }, []);

  if (loading) {
    return (
      <div className={s.layout}>
        <div style={{ width: 260, background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}>
          <Skeleton height={40} style={{ margin: '20px 16px' }} />
          <Skeleton height={32} count={5} style={{ margin: '4px 16px' }} />
        </div>
        <div className={s.main}>
          <Skeleton height={32} width="50%" style={{ marginBottom: 24 }} />
          <Skeleton height={120} count={3} style={{ marginBottom: 16 }} />
        </div>
      </div>
    );
  }

  // Find workspace info from members (the API returns members with populated user and role)
  const workspaceInfo = { _id: workspaceId, name: members[0]?.workspace?.name };
  // We need the workspace name — we'll get it from a lightweight fetch or pass through context
  // For now we'll use what's available

  return (
    <div className={s.layout}>
      <WorkspaceSidebar workspace={{ _id: workspaceId }} role={role} />
      <main className={s.main}>
        <Outlet context={{ workspaceId, role, members, isOwner, isAdmin, canManage, canCreate }} />
      </main>
    </div>
  );
}
