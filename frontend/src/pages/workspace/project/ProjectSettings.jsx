// pages/workspace/project/ProjectSettings.jsx
import { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { projects as projApi } from '../../../lib/api';
import { useUI } from '../../../store/ui';
import Button from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import s from '../../../styles/modules/WorkspaceSettings.module.css';

export default function ProjectSettings() {
  const ctx = useOutletContext();
  const { workspaceId, projectId, project, canEdit, workspaceRole, isProjectViewer } = ctx;
  const { toast } = useUI();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';

  useEffect(() => {
    if (isProjectViewer) {
      navigate(`/workspaces/${workspaceId}/projects/${projectId}`, { replace: true });
    }
  }, [isProjectViewer]);

  useEffect(() => {
    if (project) {
      setName(project.name || '');
      setDesc(project.description || '');
    }
  }, [project]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await projApi.update(workspaceId, projectId, { name: name.trim(), description: desc.trim() });
      toast('Project updated ✓', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project?.name) {
      toast('Type the project name exactly to confirm', 'error');
      return;
    }
    setDeleting(true);
    try {
      await projApi.delete(workspaceId, projectId);
      toast('Project deleted', 'info');
      navigate(`/workspaces/${workspaceId}/projects`);
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    } finally { setDeleting(false); }
  };

  return (
    <div className={s.page}>
      <h1 className={s.heading}>Project Settings</h1>

      <div className={s.section}>
        <div className={s.sectionTitle}>Project Details</div>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
          <Textarea label="Description" value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
          <Button type="submit" variant="primary" size="sm" disabled={saving} style={{ alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </div>

      {canDelete && (
        <div className={`${s.section} ${s.dangerSection}`}>
          <div className={`${s.sectionTitle} ${s.dangerTitle}`}>Delete Project</div>
          <p className={s.dangerText}>
            Type <strong>"{project?.name}"</strong> to confirm. This permanently deletes the project and all its data.
          </p>
          <div className={s.row}>
            <Input
              placeholder={`Type "${project?.name}" to confirm`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting || deleteConfirm !== project?.name}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
