// pages/project/ProjectKanban.jsx
import { useOutletContext } from 'react-router-dom';
import Kanban from '../Kanban';
export default function ProjectKanban() {
  const ctx = useOutletContext();
  return (
    <Kanban
      canEdit={ctx?.canEdit}
      isContributor={ctx?.isContributor}
      workspaceRole={ctx?.workspaceRole}
    />
  );
}
