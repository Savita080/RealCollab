// pages/project/ProjectAI.jsx
import { useOutletContext } from 'react-router-dom';
import AIPanel from '../AIPanel';
export default function ProjectAI() {
  const ctx = useOutletContext();
  return <AIPanel canEdit={ctx?.canEdit} isContributor={ctx?.isContributor} />;
}
