import { useParams, Navigate } from 'react-router-dom';
import { useWorkspace } from '../../store/workspace';
import ActivityFeedPanel from '../../components/activity/ActivityFeedPanel';

export default function ProjectActivity() {
  const { workspaceId: routeWsId, projectId: routeProjId } = useParams();
  const { current: ws, currentProject } = useWorkspace();

  const workspaceId = routeWsId || ws?._id;
  const projectId = routeProjId || currentProject?._id;

  if (!workspaceId) {
    return <Navigate to="/workspaces" replace />;
  }

  if (!projectId) {
    return (
      <ActivityFeedPanel
        workspaceId={workspaceId}
        title="Activity Feed"
        subtitle="Select a project from the sidebar for project-specific activity"
      />
    );
  }

  return (
    <ActivityFeedPanel
      workspaceId={workspaceId}
      projectId={projectId}
      title="Activity Feed"
      subtitle={currentProject?.name}
    />
  );
}