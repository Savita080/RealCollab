// pages/project/ProjectLayout.jsx
import { useEffect, useState } from 'react';
import { Outlet, useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { useProjectRole } from '../../lib/useProjectRole';
import { projects as projApi } from '../../lib/api';
import { joinProject, leaveProject } from '../../lib/socket';
import { useTasks } from '../../store/tasks';
import { useWorkspace } from '../../store/workspace';
import ProjectSidebar from '../../components/common/ProjectSidebar';
import WorkspaceTopBar from '../../components/common/WorkspaceTopBar';
import AccessRestricted from '../../components/common/AccessRestricted';
import { Skeleton } from '../../components/ui/Skeleton';
import s from '../../styles/modules/WorkspaceLayout.module.css';

export default function ProjectLayout() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const wsContext = useOutletContext();
  const workspaceRole = wsContext?.role;
  const { projectRole, projectMembers, loading, hasAccess, isContributor, isProjectViewer, canEdit } =
    useProjectRole(workspaceId, projectId, workspaceRole);
  const [project, setProject] = useState(null);
  const [projLoading, setProjLoading] = useState(true);
  const { bindSocket, unbindSocket } = useTasks();
  const { setProject: setStoreProject, projects: projList } = useWorkspace();

  // Fetch project details
  useEffect(() => {
    if (!workspaceId || !projectId) return;
    setProjLoading(true);
    projApi.get(workspaceId, projectId)
      .then(({ data }) => {
        const p = data.project ?? data;
        setProject(p);
        setStoreProject(p);
      })
      .catch(() => setProject(null))
      .finally(() => setProjLoading(false));
  }, [workspaceId, projectId]);

  // Keep store in sync if project list loads. projectId from the URL may be
  // either a Mongo _id or a slug, so match against both.
  useEffect(() => {
    const p = projList.find(p => p._id === projectId || p.slug === projectId);
    if (p && p !== project) setStoreProject(p);
  }, [projList, projectId]);

  // Join project socket room. Backend emits to room=canonical _id, so we must
  // join with _id (not the URL token, which may be a slug).
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
        <div className={s.sidebarSkeleton}>
          <Skeleton height={32} style={{ margin: '20px 16px' }} />
          <Skeleton height={28} count={8} style={{ margin: '4px 16px' }} />
        </div>
        <div className={s.right}>
          <div className={s.topbarSkeleton} />
          <div className={s.main}>
            <Skeleton height={32} width="40%" style={{ marginBottom: 24 }} />
            <Skeleton height={200} style={{ marginBottom: 16 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className={s.layout}>
        <ProjectSidebar project={project} canEdit={false} role={workspaceRole} />
        <div className={s.right}>
          <WorkspaceTopBar workspace={wsContext?.workspace} role={workspaceRole} />
          <main className={s.main}>
            <AccessRestricted
              title="Project Access Restricted"
              message="You're not a member of this project. Ask a workspace admin or project contributor to add you."
              onBack={() => navigate(`/workspaces/${workspaceId}/projects`)}
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className={s.layout}>
      <ProjectSidebar project={project} canEdit={canEdit} role={workspaceRole} />
      <div className={s.right}>
        <WorkspaceTopBar workspace={wsContext?.workspace} role={workspaceRole} />
        <main className={s.main}>
          <div className={s.content}>
            <Outlet context={{
              workspaceId,
              projectId,
              project,
              workspace: wsContext?.workspace,
              workspaceRole,
              projectRole,
              projectMembers,
              isContributor,
              isProjectViewer,
              canEdit,
              wsMembers: wsContext?.members,
            }} />
          </div>
        </main>
      </div>
    </div>
  );
}
