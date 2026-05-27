// pages/workspace/project/ProjectLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useParams, useOutletContext } from 'react-router-dom';
import { useProjectRole } from '../../../lib/useProjectRole';
import { projects as projApi } from '../../../lib/api';
import { joinProject, leaveProject } from '../../../lib/socket';
import { useTasks } from '../../../store/tasks';
import ProjectSidebar from '../../../components/common/ProjectSidebar';
import AccessRestricted from '../../../components/common/AccessRestricted';
import { Skeleton } from '../../../components/ui/Skeleton';
import s from '../../../styles/modules/WorkspaceLayout.module.css'; // reuse layout css

export default function ProjectLayout() {
  const { workspaceId, projectId } = useParams();
  const wsContext = useOutletContext(); // from WorkspaceLayout
  const workspaceRole = wsContext?.role;
  const { projectRole, projectMembers, loading, hasAccess, isContributor, isProjectViewer, canEdit } =
    useProjectRole(workspaceId, projectId, workspaceRole);
  const [project, setProject] = useState(null);
  const [projLoading, setProjLoading] = useState(true);
  const { bindSocket, unbindSocket } = useTasks();

  // Fetch project details
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setProjLoading(true);
    projApi.get(workspaceId, projectId)
      .then(({ data }) => setProject(data.project ?? data))
      .catch(() => setProject(null))
      .finally(() => setProjLoading(false));
  }, [workspaceId, projectId]);

  // Join project socket room. Backend rooms are keyed by canonical _id, not the
  // URL token (which may be a slug).
  useEffect(() => {
    const roomId = project?._id;
    if (!roomId) return;
    joinProject(roomId);
    bindSocket();
    return () => {
      leaveProject(roomId);
      unbindSocket();
    };
  }, [project?._id]);

  if (loading || projLoading) {
    return (
      <div className={s.layout}>
        <div style={{ width: 260, background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}>
          <Skeleton height={32} style={{ margin: '20px 16px' }} />
          <Skeleton height={28} count={8} style={{ margin: '4px 16px' }} />
        </div>
        <div className={s.main}>
          <Skeleton height={32} width="40%" style={{ marginBottom: 24 }} />
          <Skeleton height={200} style={{ marginBottom: 16 }} />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={s.layout}>
        <ProjectSidebar project={project} canEdit={false} />
        <main className={s.main}>
          <AccessRestricted />
        </main>
      </div>
    );
  }

  return (
    <div className={s.layout}>
      <ProjectSidebar project={project} canEdit={canEdit} />
      <main className={s.main}>
        <Outlet context={{
          workspaceId,
          projectId,
          project,
          workspaceRole,
          projectRole,
          projectMembers,
          isContributor,
          isProjectViewer,
          canEdit,
          wsMembers: wsContext?.members,
        }} />
      </main>
    </div>
  );
}
