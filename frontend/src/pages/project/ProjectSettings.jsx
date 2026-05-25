// pages/project/ProjectSettings.jsx — project-level settings (rename + delete)
import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Trash2, Edit3, AlertTriangle, Lock } from 'lucide-react';
import { projects as projApi } from '../../lib/api';
import { useUI } from '../../store/ui';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import s from '../../styles/modules/ProjectSettings.module.css';

export default function ProjectSettings() {
  const {
    workspaceId,
    projectId,
    project,
    canEdit,
    isContributor,
    workspaceRole,
  } = useOutletContext();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isWsAdmin = workspaceRole === 'OWNER' || workspaceRole === 'ADMIN';
  const canDelete = isWsAdmin || isContributor;

  useEffect(() => {
    setName(project?.name || '');
    setDescription(project?.description || '');
  }, [project?.name, project?.description]);

  if (!canEdit) {
    return (
      <div className={s.page}>
        <div className={s.empty}>
          <Lock size={28} />
          <h3>Read-only access</h3>
          <p>You need editor permissions to manage this project.</p>
        </div>
      </div>
    );
  }

  const handleRename = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmed) return;
    if (trimmed === project?.name && trimmedDesc === (project?.description || '')) return;
    setRenameLoading(true);
    try {
      await projApi.update(workspaceId, projectId, { name: trimmed, description: trimmedDesc });
      toast('Project updated', 'success');
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed', 'error');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== project?.name) {
      toast('Type the project name exactly to confirm.', 'error');
      return;
    }
    setDeleteLoading(true);
    try {
      await projApi.delete(workspaceId, projectId);
      toast('Project deleted', 'info');
      navigate(`/workspaces/${workspaceId}/projects`, { replace: true });
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to delete', 'error');
      setDeleteLoading(false);
    }
  };

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Project Settings</h1>
        <p className={s.subtitle}>Configure {project?.name || 'this project'}</p>
      </div>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <Edit3 size={16} />
          <h3>General</h3>
        </div>
        <p className={s.desc}>Update the project name and description.</p>
        <form onSubmit={handleRename} className={s.stack}>
          <Input
            label="Project name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={project?.name}
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this project about?"
          />
          <div className={s.actions}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={renameLoading}
              disabled={
                !name.trim() ||
                (name.trim() === project?.name && description.trim() === (project?.description || ''))
              }
            >
              Save changes
            </Button>
          </div>
        </form>
      </section>

      {canDelete && (
        <section className={`${s.section} ${s.danger}`}>
          <div className={s.sectionHead}>
            <AlertTriangle size={16} />
            <h3>Danger Zone</h3>
          </div>
          <p className={s.desc}>
            Deleting <strong>{project?.name}</strong> permanently removes its tasks, wiki pages, snippets, whiteboards, and chat history. This cannot be undone.
          </p>
          <div className={s.row}>
            <Input
              placeholder={`Type "${project?.name}" to confirm`}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <Button
              variant="danger"
              size="md"
              loading={deleteLoading}
              disabled={deleteConfirm !== project?.name}
              onClick={handleDelete}
            >
              <Trash2 size={14} /> Delete project
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
