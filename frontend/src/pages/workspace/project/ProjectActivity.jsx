// pages/workspace/project/ProjectActivity.jsx
import { useOutletContext } from 'react-router-dom';
import ActivityFeedPanel from '../../../components/activity/ActivityFeedPanel';

export default function ProjectActivity() {
  const { workspaceId, projectId, project } = useOutletContext();

  return (
    <ActivityFeedPanel
      workspaceId={workspaceId}
      projectId={projectId}
      title="Project Activity"
      subtitle={project?.name}
    />
  );
}
