// pages/workspace/WorkspaceActivity.jsx
import { useParams } from 'react-router-dom';
import ActivityFeedPanel from '../../components/activity/ActivityFeedPanel';

export default function WorkspaceActivity() {
  const { workspaceId } = useParams();
  return (
    <ActivityFeedPanel
      workspaceId={workspaceId}
      title="Workspace Activity"
      subtitle="All workspace events"
    />
  );
}
